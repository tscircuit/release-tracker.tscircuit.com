import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  FEATURE_LIMIT,
  applyReleasePipelineEvent,
  getReleaseTrackerSummary,
  resetReleaseTrackerState,
} from "../server/utils/releaseState";

beforeEach(async () => {
  await resetReleaseTrackerState();
});

afterEach(async () => {
  await resetReleaseTrackerState();
});

describe("release tracker state", () => {
  test("records merged features and propagates upstream awareness", async () => {
    await applyReleasePipelineEvent({
      event_type: "feature_merged",
      repo: "core",
      feature_name: "Introduce Ground Pours",
    });

    const summary = await getReleaseTrackerSummary();
    const core = summary.repoSummaries.find((repo) => repo.repo === "core");
    const evalRepo = summary.repoSummaries.find((repo) => repo.repo === "eval");

    expect(core?.merged_features).toContain("Introduce Ground Pours");
    expect(core?.queued_features).not.toContain("Introduce Ground Pours");
    expect(evalRepo?.upstream_features).toContain("Introduce Ground Pours");
  });

  test("moves queued features into merged on version update and updates downstream", async () => {
    await applyReleasePipelineEvent({
      event_type: "feature_merged",
      repo: "core",
      feature_name: "Introduce Ground Pours",
    });

    await applyReleasePipelineEvent({
      event_type: "versions_updated",
      repo: "core",
      version: "0.1.1",
      package_json: {},
    });

    let summary = await getReleaseTrackerSummary();
    const core = summary.repoSummaries.find((repo) => repo.repo === "core");
    expect(core?.version).toBe("0.1.1");
    expect(core?.merged_features).toContain("Introduce Ground Pours");

    const evalRepoBefore = summary.repoSummaries.find(
      (repo) => repo.repo === "eval",
    );
    expect(evalRepoBefore?.upstream_features).toContain(
      "Introduce Ground Pours",
    );

    await applyReleasePipelineEvent({
      event_type: "versions_updated",
      repo: "eval",
      version: "5.7.3",
      package_json: { dependencies: { "@tscircuit/core": "0.1.1" } },
    });

    summary = await getReleaseTrackerSummary();
    const evalRepo = summary.repoSummaries.find((repo) => repo.repo === "eval");
    expect(evalRepo?.queued_features).toContain("Introduce Ground Pours");
    expect(evalRepo?.upstream_features).not.toContain("Introduce Ground Pours");

    await applyReleasePipelineEvent({
      event_type: "feature_merged",
      repo: "eval",
      feature_name: "Introduce Ground Pours",
    });

    summary = await getReleaseTrackerSummary();
    const evalAfterMerge = summary.repoSummaries.find(
      (repo) => repo.repo === "eval",
    );
    const runframe = summary.repoSummaries.find(
      (repo) => repo.repo === "runframe",
    );

    expect(evalAfterMerge?.merged_features).toContain("Introduce Ground Pours");
    expect(evalAfterMerge?.queued_features).not.toContain(
      "Introduce Ground Pours",
    );
    expect(runframe?.upstream_features).toContain("Introduce Ground Pours");
  });

  test("limits tracked features to the configured maximum", async () => {
    const features = Array.from(
      { length: FEATURE_LIMIT + 5 },
      (_, index) => `Feature ${index}`,
    );
    for (const feature of features) {
      await applyReleasePipelineEvent({
        event_type: "feature_merged",
        repo: "core",
        feature_name: feature,
      });
    }

    const summary = await getReleaseTrackerSummary();
    const core = summary.repoSummaries.find((repo) => repo.repo === "core");
    expect(core?.merged_features.length).toBeLessThanOrEqual(FEATURE_LIMIT);
    expect(core?.merged_features).toContain(`Feature ${FEATURE_LIMIT + 4}`);
    expect(core?.merged_features).not.toContain("Feature 0");
  });
});
