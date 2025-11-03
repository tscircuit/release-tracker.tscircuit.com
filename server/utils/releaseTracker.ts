export type RepoName = string;
export type FeatureName = string;
export type SemverVersion = string;

export interface RepoGraphEntry {
  upstream_edge: RepoName | null;
  downstream_edges: RepoName[];
}

export interface RepoStateSnapshot {
  version: SemverVersion | null;
  merged_features: FeatureName[];
  queued_features: FeatureName[];
  upstream_features: FeatureName[];
}

export interface ReleaseTrackerState {
  repoGraph: Record<RepoName, RepoGraphEntry>;
  repoStates: Record<RepoName, RepoStateSnapshot>;
  trackedFeatureOrder: FeatureName[];
}

export type ReleasePipelineEvent = UpdateVersionsEvent | MergeFeatureEvent;

export interface UpdateVersionsEvent {
  event_type: "versions_updated";
  repo: RepoName;
  version: SemverVersion;
  package_json: Record<string, unknown>;
}

export interface MergeFeatureEvent {
  event_type: "feature_merged";
  repo: RepoName;
  feature_name: FeatureName;
}

export const DEFAULT_REPO_GRAPH: Record<RepoName, RepoGraphEntry> = {
  core: { upstream_edge: null, downstream_edges: ["eval"] },
  eval: {
    upstream_edge: "core",
    downstream_edges: ["runframe", "tscircuit.com"],
  },
  "tscircuit.com": { upstream_edge: "eval", downstream_edges: [] },
  runframe: { upstream_edge: "eval", downstream_edges: ["cli"] },
  cli: { upstream_edge: "runframe", downstream_edges: ["tscircuit"] },
  tscircuit: { upstream_edge: "cli", downstream_edges: ["svg", "usercode"] },
  svg: { upstream_edge: "tscircuit", downstream_edges: [] },
  usercode: { upstream_edge: "tscircuit", downstream_edges: [] },
};

export const DEFAULT_REPO_ORDER: RepoName[] = [
  "core",
  "eval",
  "runframe",
  "cli",
  "tscircuit",
  "svg",
  "usercode",
  "tscircuit.com",
];

export function createInitialReleaseTrackerState(): ReleaseTrackerState {
  const repoStates: Record<RepoName, RepoStateSnapshot> = {};
  for (const repo of Object.keys(DEFAULT_REPO_GRAPH)) {
    repoStates[repo] = {
      version: null,
      merged_features: [],
      queued_features: [],
      upstream_features: [],
    };
  }

  return {
    repoGraph: { ...DEFAULT_REPO_GRAPH },
    repoStates,
    trackedFeatureOrder: [],
  };
}

function ensureRepoState(state: ReleaseTrackerState, repo: RepoName) {
  if (!state.repoStates[repo]) {
    state.repoStates[repo] = {
      version: null,
      merged_features: [],
      queued_features: [],
      upstream_features: [],
    };
  }
  return state.repoStates[repo];
}

function addUnique(list: FeatureName[], feature: FeatureName) {
  if (!list.includes(feature)) {
    list.push(feature);
  }
}

function removeFeature(list: FeatureName[], feature: FeatureName) {
  const index = list.indexOf(feature);
  if (index >= 0) {
    list.splice(index, 1);
  }
}

function trackFeature(state: ReleaseTrackerState, feature: FeatureName) {
  if (!state.trackedFeatureOrder.includes(feature)) {
    state.trackedFeatureOrder.push(feature);
    if (state.trackedFeatureOrder.length > 100) {
      const removed = state.trackedFeatureOrder.shift();
      if (removed) {
        for (const repoState of Object.values(state.repoStates)) {
          removeFeature(repoState.merged_features, removed);
          removeFeature(repoState.queued_features, removed);
          removeFeature(repoState.upstream_features, removed);
        }
      }
    }
  }
}

function limitListToTracked(state: ReleaseTrackerState, list: FeatureName[]) {
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (!state.trackedFeatureOrder.includes(list[i])) {
      list.splice(i, 1);
    }
  }
}

export function applyMergeFeatureEvent(
  state: ReleaseTrackerState,
  event: MergeFeatureEvent,
): ReleaseTrackerState {
  const featureName = event.feature_name.trim();
  if (!featureName) {
    return state;
  }

  const repoState = ensureRepoState(state, event.repo);
  trackFeature(state, featureName);
  addUnique(repoState.merged_features, featureName);
  removeFeature(repoState.queued_features, featureName);
  removeFeature(repoState.upstream_features, featureName);

  const downstream = state.repoGraph[event.repo]?.downstream_edges ?? [];
  for (const downstreamRepo of downstream) {
    const downstreamState = ensureRepoState(state, downstreamRepo);
    trackFeature(state, featureName);
    addUnique(downstreamState.upstream_features, featureName);
    removeFeature(downstreamState.merged_features, featureName);
  }

  for (const repo of Object.keys(state.repoStates)) {
    const repoStateEntry = state.repoStates[repo];
    limitListToTracked(state, repoStateEntry.merged_features);
    limitListToTracked(state, repoStateEntry.queued_features);
    limitListToTracked(state, repoStateEntry.upstream_features);
  }

  return state;
}

export function applyUpdateVersionsEvent(
  state: ReleaseTrackerState,
  event: UpdateVersionsEvent,
): ReleaseTrackerState {
  const repoState = ensureRepoState(state, event.repo);
  repoState.version = event.version;

  const promotedFeatures = new Set<FeatureName>();
  for (const feature of [...repoState.queued_features]) {
    addUnique(repoState.merged_features, feature);
    removeFeature(repoState.queued_features, feature);
    promotedFeatures.add(feature);
  }

  const upstreamRepo = state.repoGraph[event.repo]?.upstream_edge;
  if (upstreamRepo) {
    const upstreamState = ensureRepoState(state, upstreamRepo);
    for (const feature of upstreamState.merged_features) {
      trackFeature(state, feature);
      if (!repoState.merged_features.includes(feature)) {
        addUnique(repoState.queued_features, feature);
      }
      removeFeature(repoState.upstream_features, feature);
    }
  }

  const downstreamRepos = state.repoGraph[event.repo]?.downstream_edges ?? [];
  for (const downstreamRepo of downstreamRepos) {
    const downstreamState = ensureRepoState(state, downstreamRepo);
    for (const feature of repoState.merged_features) {
      trackFeature(state, feature);
      addUnique(downstreamState.queued_features, feature);
    }
    for (const feature of promotedFeatures) {
      trackFeature(state, feature);
      addUnique(downstreamState.upstream_features, feature);
    }
  }

  for (const repo of Object.keys(state.repoStates)) {
    const repoStateEntry = state.repoStates[repo];
    limitListToTracked(state, repoStateEntry.merged_features);
    limitListToTracked(state, repoStateEntry.queued_features);
    limitListToTracked(state, repoStateEntry.upstream_features);
  }

  return state;
}

export function applyReleasePipelineEvent(
  state: ReleaseTrackerState,
  event: ReleasePipelineEvent,
): ReleaseTrackerState {
  if (event.event_type === "feature_merged") {
    return applyMergeFeatureEvent(state, event);
  }
  if (event.event_type === "versions_updated") {
    return applyUpdateVersionsEvent(state, event);
  }
  return state;
}

export function sanitizeState(state: ReleaseTrackerState): ReleaseTrackerState {
  for (const repoState of Object.values(state.repoStates)) {
    repoState.merged_features = [...new Set(repoState.merged_features)];
    repoState.queued_features = [...new Set(repoState.queued_features)];
    repoState.upstream_features = [...new Set(repoState.upstream_features)];
  }
  state.trackedFeatureOrder = [...new Set(state.trackedFeatureOrder)].slice(
    0,
    100,
  );
  return state;
}
