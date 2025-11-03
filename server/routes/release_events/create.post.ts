import { createError, defineEventHandler, readBody } from "h3";
import {
  updateStoredState,
  getRepoTableView,
} from "../../utils/release-tracker-storage";
import type { ReleasePipelineEvent } from "../../utils/release-tracker";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = validateEvent(body);
  const nextState = await updateStoredState(parsed);
  const view = await getRepoTableView();
  return {
    success: true,
    state: nextState,
    view,
  };
});

function validateEvent(input: unknown): ReleasePipelineEvent {
  if (!input || typeof input !== "object") {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid payload",
      message: "Payload must be an object",
    });
  }

  const event = input as Record<string, unknown>;
  const eventType = event["event_type"];
  const repo = event["repo"];
  if (typeof eventType !== "string") {
    throw createError({
      statusCode: 400,
      message: "event_type must be provided",
    });
  }
  if (typeof repo !== "string" || repo.trim().length === 0) {
    throw createError({
      statusCode: 400,
      message: "repo must be provided",
    });
  }

  if (eventType === "feature_merged") {
    const featureName = event["feature_name"];
    if (typeof featureName !== "string" || featureName.trim().length === 0) {
      throw createError({
        statusCode: 400,
        message: "feature_name must be provided",
      });
    }
    return {
      event_type: "feature_merged",
      repo,
      feature_name: featureName.trim(),
    };
  }

  if (eventType === "versions_updated") {
    const version = event["version"];
    if (typeof version !== "string" || version.trim().length === 0) {
      throw createError({
        statusCode: 400,
        message: "version must be provided",
      });
    }
    const packageJson = event["package_json"];
    if (packageJson !== undefined && typeof packageJson !== "object") {
      throw createError({
        statusCode: 400,
        message: "package_json must be an object if provided",
      });
    }
    return {
      event_type: "versions_updated",
      repo,
      version: version.trim(),
      package_json: (packageJson as Record<string, unknown>) ?? {},
    };
  }

  throw createError({
    statusCode: 400,
    message: `Unsupported event_type: ${eventType}`,
  });
}
