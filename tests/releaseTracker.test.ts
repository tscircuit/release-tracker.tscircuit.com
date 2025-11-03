import { beforeEach, describe, expect, it } from "bun:test";

import {
  applyReleasePipelineEvent,
  getReleaseTrackerSnapshot,
  resetReleaseTrackerState,
} from "../server/utils/release-tracker";

describe("release tracker state transitions", () => {
  beforeEach(async () => {
    await resetReleaseTrackerState();
  });

  it("records merged features as queued for the originating repo", async () => {
    await applyReleasePipelineEvent({
      event_type: "feature_merged",
      repo: "core",
      feature_name: "Introduce ground pours",
    });

    const state = await getReleaseTrackerSnapshot();
    expect(state.repos.core.queued_features).toEqual([
      "Introduce ground pours",
    ]);
    expect(state.repos.core.merged_features).toHaveLength(0);
  });

  it("promotes queued features to merged on version update and propagates downstream", async () => {
    await applyReleasePipelineEvent({
      event_type: "feature_merged",
      repo: "core",
      feature_name: "Introduce ground pours",
    });

    await applyReleasePipelineEvent({
      event_type: "versions_updated",
      repo: "core",
      version: "0.1.2",
      package_json: {},
    });

    const state = await getReleaseTrackerSnapshot();
    expect(state.repos.core.version).toBe("0.1.2");
    expect(state.repos.core.queued_features).toHaveLength(0);
    expect(state.repos.core.merged_features).toEqual([
      "Introduce ground pours",
    ]);
    expect(state.repos.eval.upstream_features).toContain(
      "Introduce ground pours",
    );
  });

  it("removes upstream features when downstream repo merges them", async () => {
    await applyReleasePipelineEvent({
      event_type: "feature_merged",
      repo: "core",
      feature_name: "Introduce ground pours",
    });

    await applyReleasePipelineEvent({
      event_type: "versions_updated",
      repo: "core",
      version: "0.1.2",
      package_json: {},
    });

    await applyReleasePipelineEvent({
      event_type: "feature_merged",
      repo: "eval",
      feature_name: "Introduce ground pours",
    });

    const state = await getReleaseTrackerSnapshot();
    expect(state.repos.eval.upstream_features).not.toContain(
      "Introduce ground pours",
    );
    expect(state.repos.eval.queued_features).toContain(
      "Introduce ground pours",
    );
  });

  it("tracks at most 100 queued and merged features", async () => {
    for (let index = 0; index < 110; index += 1) {
      await applyReleasePipelineEvent({
        event_type: "feature_merged",
        repo: "core",
        feature_name: `Feature ${index}`,
      });
    }

    let state = await getReleaseTrackerSnapshot();
    expect(state.repos.core.queued_features).toHaveLength(100);
    expect(state.repos.core.queued_features[0]).toBe("Feature 10");

    await applyReleasePipelineEvent({
      event_type: "versions_updated",
      repo: "core",
      version: "0.1.3",
      package_json: {},
    });

    state = await getReleaseTrackerSnapshot();
    expect(state.repos.core.queued_features).toHaveLength(0);
    expect(state.repos.core.merged_features).toHaveLength(100);
    expect(state.repos.core.merged_features[0]).toBe("Feature 10");
    expect(state.repos.core.merged_features.at(-1)).toBe("Feature 109");
  });
});
