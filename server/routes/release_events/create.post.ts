import { defineEventHandler, readBody, sendError, createError } from "h3";
import {
  applyReleasePipelineEvent,
  sanitizeState,
  type MergeFeatureEvent,
  type ReleasePipelineEvent,
  type UpdateVersionsEvent,
} from "../../utils/releaseTracker";
import {
  readReleaseTrackerState,
  writeReleaseTrackerState,
} from "../../utils/releaseTrackerStorage";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (!body || typeof body !== "object") {
    return sendError(
      event,
      createError({ statusCode: 400, statusMessage: "Invalid body" }),
    );
  }

  if (
    body.event_type !== "feature_merged" &&
    body.event_type !== "versions_updated"
  ) {
    return sendError(
      event,
      createError({ statusCode: 400, statusMessage: "Unknown event type" }),
    );
  }

  let eventBody: ReleasePipelineEvent;
  if (body.event_type === "feature_merged") {
    const { repo, feature_name } = body as Partial<MergeFeatureEvent>;
    if (typeof repo !== "string" || typeof feature_name !== "string") {
      return sendError(
        event,
        createError({
          statusCode: 400,
          statusMessage: "Invalid feature_merged payload",
        }),
      );
    }
    eventBody = {
      event_type: "feature_merged",
      repo,
      feature_name,
    } satisfies MergeFeatureEvent;
  } else {
    const { repo, version, package_json } =
      body as Partial<UpdateVersionsEvent>;
    if (typeof repo !== "string" || typeof version !== "string") {
      return sendError(
        event,
        createError({
          statusCode: 400,
          statusMessage: "Invalid versions_updated payload",
        }),
      );
    }
    eventBody = {
      event_type: "versions_updated",
      repo,
      version,
      package_json: (package_json && typeof package_json === "object"
        ? package_json
        : {}) as Record<string, unknown>,
    } satisfies UpdateVersionsEvent;
  }

  const state = await readReleaseTrackerState();
  const nextState = applyReleasePipelineEvent(state, eventBody);
  sanitizeState(nextState);
  await writeReleaseTrackerState(nextState);

  return {
    success: true,
    state: nextState,
  };
});
