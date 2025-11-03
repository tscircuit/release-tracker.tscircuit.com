import { describe, expect, test } from "bun:test";
import {
  MAX_FEATURES_TRACKED,
  applyReleaseEvent,
  buildRepoViews,
  createInitialState,
  type ReleaseTrackerStorageState,
} from "../server/utils/release-tracker";

function apply(
  state: ReleaseTrackerStorageState,
  event: Parameters<typeof applyReleaseEvent>[1],
) {
  return applyReleaseEvent(state, event);
}

describe("release tracker state machine", () => {
  test("records merged features and propagates them downstream", () => {
    let state = createInitialState();
    state = apply(state, {
      event_type: "feature_merged",
      repo: "core",
      feature_name: "Introduce Ground Pours",
    });

    expect(state.mergedFeatures["core"]).toContain("Introduce Ground Pours");

    const view = buildRepoViews(state);
    const evalRow = view.find((row) => row.repo === "eval");
    expect(evalRow?.queued_features).toContain("Introduce Ground Pours");
    expect(evalRow?.upstream_features).toHaveLength(0);

    const runframeRow = view.find((row) => row.repo === "runframe");
    expect(runframeRow?.queued_features).toHaveLength(0);
    expect(runframeRow?.upstream_features).toContain("Introduce Ground Pours");
  });

  test("records version updates", () => {
    let state = createInitialState();
    state = apply(state, {
      event_type: "versions_updated",
      repo: "core",
      version: "0.1.2",
      package_json: {},
    });

    expect(state.repoVersions["core"]).toBe("0.1.2");
    expect(state.repoStates["core@0.1.2"]).toBeDefined();
  });

  test("limits tracked features to the latest 100 entries", () => {
    let state = createInitialState();
    for (let index = 0; index < MAX_FEATURES_TRACKED + 5; index++) {
      state = apply(state, {
        event_type: "feature_merged",
        repo: "core",
        feature_name: `feature-${index}`,
      });
    }

    const coreFeatures = state.mergedFeatures["core"];
    expect(coreFeatures).toHaveLength(MAX_FEATURES_TRACKED);
    expect(coreFeatures[0]).toBe("feature-5");
    expect(coreFeatures.at(-1)).toBe(`feature-${MAX_FEATURES_TRACKED + 4}`);
  });
});
