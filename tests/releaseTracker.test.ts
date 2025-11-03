import { describe, expect, it } from "bun:test";
import {
  applyMergeFeatureEvent,
  applyUpdateVersionsEvent,
  createInitialReleaseTrackerState,
  type MergeFeatureEvent,
  type UpdateVersionsEvent,
} from "../server/utils/releaseTracker";

describe("release tracker state", () => {
  it("adds merged features and propagates them downstream", () => {
    const state = createInitialReleaseTrackerState();
    const event: MergeFeatureEvent = {
      event_type: "feature_merged",
      repo: "core",
      feature_name: "Ground pours",
    };

    const nextState = applyMergeFeatureEvent(state, event);
    expect(nextState.repoStates.core.merged_features).toContain("Ground pours");
    expect(nextState.repoStates.eval.upstream_features).toContain(
      "Ground pours",
    );
  });

  it("moves queued features into merged on version update", () => {
    const state = createInitialReleaseTrackerState();

    applyMergeFeatureEvent(state, {
      event_type: "feature_merged",
      repo: "core",
      feature_name: "New nets",
    });

    applyUpdateVersionsEvent(state, {
      event_type: "versions_updated",
      repo: "eval",
      version: "1.0.1",
      package_json: {},
    });

    const event: UpdateVersionsEvent = {
      event_type: "versions_updated",
      repo: "core",
      version: "0.1.2",
      package_json: {},
    };

    const nextState = applyUpdateVersionsEvent(state, event);
    expect(nextState.repoStates.core.version).toBe("0.1.2");
    expect(nextState.repoStates.core.merged_features).toContain("New nets");
    expect(nextState.repoStates.eval.queued_features).toContain("New nets");
  });

  it("propagates promoted features downstream on version updates", () => {
    const state = createInitialReleaseTrackerState();

    applyMergeFeatureEvent(state, {
      event_type: "feature_merged",
      repo: "core",
      feature_name: "Queued downstream feature",
    });

    applyUpdateVersionsEvent(state, {
      event_type: "versions_updated",
      repo: "core",
      version: "0.1.3",
      package_json: {},
    });

    const nextState = applyUpdateVersionsEvent(state, {
      event_type: "versions_updated",
      repo: "eval",
      version: "5.7.3",
      package_json: {},
    });

    expect(nextState.repoStates.eval.merged_features).toContain(
      "Queued downstream feature",
    );
    expect(nextState.repoStates.runframe.upstream_features).toContain(
      "Queued downstream feature",
    );
    expect(nextState.repoStates.runframe.queued_features).toContain(
      "Queued downstream feature",
    );
  });

  it("limits tracked features to 100 unique names", () => {
    const state = createInitialReleaseTrackerState();

    for (let i = 0; i < 110; i += 1) {
      applyMergeFeatureEvent(state, {
        event_type: "feature_merged",
        repo: "core",
        feature_name: `Feature ${i}`,
      });
    }

    expect(state.trackedFeatureOrder.length).toBeLessThanOrEqual(100);
    expect(state.repoStates.core.merged_features.length).toBeLessThanOrEqual(
      100,
    );
    expect(state.repoStates.eval.upstream_features.length).toBeLessThanOrEqual(
      100,
    );
    expect(state.repoStates.core.merged_features).not.toContain("Feature 0");
  });
});
