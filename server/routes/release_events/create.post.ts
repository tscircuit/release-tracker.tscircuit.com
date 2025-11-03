import { createError, eventHandler, readBody } from "h3";
import {
  applyReleasePipelineEvent,
  type MergeFeatureEvent,
  type ReleasePipelineEvent,
  type UpdateVersionsEvent,
} from "../../utils/releaseState";

function assertRepo(value: unknown): asserts value is string {
  if (typeof value !== "string" || !value.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid repo provided",
    });
  }
}

export default eventHandler(async (event) => {
  const payload = (await readBody(
    event,
  )) as Partial<ReleasePipelineEvent> | null;
  if (!payload || typeof payload !== "object") {
    throw createError({
      statusCode: 400,
      statusMessage: "Event body is required",
    });
  }

  if (payload.event_type === "feature_merged") {
    assertRepo(payload.repo);
    if (typeof (payload as MergeFeatureEvent).feature_name !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "feature_name must be provided",
      });
    }
    const sanitizedFeature = (payload as MergeFeatureEvent).feature_name.trim();
    if (!sanitizedFeature) {
      throw createError({
        statusCode: 400,
        statusMessage: "feature_name must not be empty",
      });
    }
    const result = await applyReleasePipelineEvent({
      event_type: "feature_merged",
      repo: payload.repo,
      feature_name: sanitizedFeature,
    });
    return result;
  }

  if (payload.event_type === "versions_updated") {
    assertRepo(payload.repo);
    if (typeof (payload as UpdateVersionsEvent).version !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "version must be provided",
      });
    }
    const sanitizedVersion = (payload as UpdateVersionsEvent).version.trim();
    if (!sanitizedVersion) {
      throw createError({
        statusCode: 400,
        statusMessage: "version must not be empty",
      });
    }
    const packageJson = (payload as UpdateVersionsEvent).package_json;
    if (packageJson && typeof packageJson !== "object") {
      throw createError({
        statusCode: 400,
        statusMessage: "package_json must be an object",
      });
    }
    const result = await applyReleasePipelineEvent({
      event_type: "versions_updated",
      repo: payload.repo,
      version: sanitizedVersion,
      package_json: packageJson ?? {},
    });
    return result;
  }

  throw createError({
    statusCode: 400,
    statusMessage: "Unsupported event type",
  });
});
