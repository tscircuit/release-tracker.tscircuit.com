import {
  createError,
  defineEventHandler,
  readBody,
  setResponseStatus,
} from "h3";

import {
  applyReleasePipelineEvent,
  type RepoName,
  type ReleasePipelineEvent,
} from "../../utils/release-tracker";

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function sanitizeEvent(payload: unknown): ReleasePipelineEvent {
  if (!isObject(payload) || typeof payload.event_type !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid event payload",
    });
  }

  if (payload.event_type === "feature_merged") {
    const { repo, feature_name } = payload;
    if (typeof repo !== "string" || typeof feature_name !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid feature_merged event payload",
      });
    }

    return {
      event_type: "feature_merged",
      repo: repo as RepoName,
      feature_name,
    } satisfies ReleasePipelineEvent;
  }

  if (payload.event_type === "versions_updated") {
    const { repo, version } = payload;
    if (typeof repo !== "string" || typeof version !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid versions_updated event payload",
      });
    }

    let package_json: unknown = {};
    if ("package_json" in payload) {
      package_json = (payload as { package_json: unknown }).package_json;
    }

    return {
      event_type: "versions_updated",
      repo: repo as RepoName,
      version,
      package_json,
    } satisfies ReleasePipelineEvent;
  }

  throw createError({
    statusCode: 400,
    statusMessage: `Unknown event type: ${payload.event_type}`,
  });
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const releaseEvent = sanitizeEvent(body);

  const state = await applyReleasePipelineEvent(releaseEvent);
  setResponseStatus(event, 201);
  return state;
});
