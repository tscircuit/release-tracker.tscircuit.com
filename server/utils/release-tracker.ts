export type RepoName = string;
export type FeatureName = string;
export type SemverVersion = string;

export const MAX_FEATURES_TRACKED = 100;

export interface ReleaseTrackerRepoGraphNode {
  upstream_edge: RepoName | null;
  downstream_edges: RepoName[];
}

export interface RepoVersionState {
  repo: RepoName;
  version: SemverVersion;
  merged_features: FeatureName[];
  queued_features: FeatureName[];
  upstream_features: FeatureName[];
}

export interface ReleaseTrackerStorageState {
  repoGraph: Record<RepoName, ReleaseTrackerRepoGraphNode>;
  repoStates: Record<`${RepoName}@${SemverVersion}`, RepoVersionState>;
  repoVersions: Record<RepoName, SemverVersion | null>;
  mergedFeatures: Record<RepoName, FeatureName[]>;
}

export type PackageJson = Record<string, unknown>;

export interface UpdateVersionsEvent {
  event_type: "versions_updated";
  repo: RepoName;
  version: SemverVersion;
  package_json: PackageJson;
}

export interface MergeFeatureEvent {
  event_type: "feature_merged";
  repo: RepoName;
  feature_name: FeatureName;
}

export type ReleasePipelineEvent = UpdateVersionsEvent | MergeFeatureEvent;

export interface RepoViewRow {
  repo: RepoName;
  version: SemverVersion | null;
  merged_features: FeatureName[];
  queued_features: FeatureName[];
  upstream_features: FeatureName[];
}

export const PIPELINE_GRAPH: Record<RepoName, ReleaseTrackerRepoGraphNode> = {
  core: { upstream_edge: null, downstream_edges: ["eval"] },
  eval: { upstream_edge: "core", downstream_edges: ["runframe"] },
  runframe: { upstream_edge: "eval", downstream_edges: ["cli"] },
  cli: { upstream_edge: "runframe", downstream_edges: ["tscircuit"] },
  tscircuit: { upstream_edge: "cli", downstream_edges: ["svg", "usercode"] },
  svg: { upstream_edge: "tscircuit", downstream_edges: [] },
  usercode: { upstream_edge: "tscircuit", downstream_edges: [] },
};

export const DEFAULT_VERSION = "unknown" as const satisfies SemverVersion;

export function createInitialState(): ReleaseTrackerStorageState {
  const initialVersions: ReleaseTrackerStorageState["repoVersions"] = {};
  const mergedFeatures: ReleaseTrackerStorageState["mergedFeatures"] = {};
  for (const repo of Object.keys(PIPELINE_GRAPH)) {
    initialVersions[repo] = null;
    mergedFeatures[repo] = [];
  }
  return {
    repoGraph: structuredClone(PIPELINE_GRAPH),
    repoStates: {},
    repoVersions: initialVersions,
    mergedFeatures,
  };
}

export function cloneState(
  state: ReleaseTrackerStorageState,
): ReleaseTrackerStorageState {
  return structuredClone(state);
}

function ensureRepoInGraph(
  state: ReleaseTrackerStorageState,
  repo: RepoName,
): void {
  if (state.repoGraph[repo]) {
    return;
  }

  state.repoGraph[repo] = { upstream_edge: null, downstream_edges: [] };
  state.repoVersions[repo] = state.repoVersions[repo] ?? null;
  state.mergedFeatures[repo] = state.mergedFeatures[repo] ?? [];
}

export function applyReleaseEvent(
  state: ReleaseTrackerStorageState,
  event: ReleasePipelineEvent,
): ReleaseTrackerStorageState {
  const nextState = cloneState(state);
  ensureRepoInGraph(nextState, event.repo);

  if (event.event_type === "feature_merged") {
    const features = nextState.mergedFeatures[event.repo] ?? [];
    nextState.mergedFeatures[event.repo] = addFeature(
      features,
      event.feature_name,
    );
  } else if (event.event_type === "versions_updated") {
    nextState.repoVersions[event.repo] = event.version;
  }

  recomputeRepoStates(nextState);
  return nextState;
}

export function recomputeRepoStates(state: ReleaseTrackerStorageState): void {
  const nextRepoStates: ReleaseTrackerStorageState["repoStates"] = {};
  const repos = Object.keys(state.repoGraph);
  for (const repo of repos) {
    const version = state.repoVersions[repo] ?? null;
    const row = buildRepoViewForRepo(state, repo, version);
    const versionLabel = version ?? DEFAULT_VERSION;
    nextRepoStates[`${repo}@${versionLabel}`] = {
      repo,
      version: versionLabel,
      merged_features: row.merged_features,
      queued_features: row.queued_features,
      upstream_features: row.upstream_features,
    };
  }
  state.repoStates = nextRepoStates;
}

export function buildRepoViews(
  state: ReleaseTrackerStorageState,
): RepoViewRow[] {
  const repos = Object.keys(state.repoGraph).sort();
  return repos.map((repo) => {
    const version = state.repoVersions[repo] ?? null;
    return buildRepoViewForRepo(state, repo, version);
  });
}

function buildRepoViewForRepo(
  state: ReleaseTrackerStorageState,
  repo: RepoName,
  version: SemverVersion | null,
): RepoViewRow {
  ensureRepoInGraph(state, repo);
  const merged = [...(state.mergedFeatures[repo] ?? [])];
  const mergedSet = new Set(merged);
  const queued: FeatureName[] = [];
  const upstreamFeatures: FeatureName[] = [];

  const immediateUpstream = state.repoGraph[repo]?.upstream_edge ?? null;
  if (immediateUpstream) {
    ensureRepoInGraph(state, immediateUpstream);
    const upstreamMerged = state.mergedFeatures[immediateUpstream] ?? [];
    for (const feature of upstreamMerged) {
      if (!mergedSet.has(feature) && !queued.includes(feature)) {
        queued.push(feature);
      }
    }

    let ancestor = state.repoGraph[immediateUpstream]?.upstream_edge ?? null;
    while (ancestor) {
      ensureRepoInGraph(state, ancestor);
      const ancestorMerged = state.mergedFeatures[ancestor] ?? [];
      for (const feature of ancestorMerged) {
        if (
          !mergedSet.has(feature) &&
          !queued.includes(feature) &&
          !upstreamFeatures.includes(feature)
        ) {
          upstreamFeatures.push(feature);
        }
      }
      ancestor = state.repoGraph[ancestor]?.upstream_edge ?? null;
    }
  }

  return {
    repo,
    version,
    merged_features: limitFeatureList(merged),
    queued_features: limitFeatureList(queued),
    upstream_features: limitFeatureList(upstreamFeatures),
  };
}

function limitFeatureList(features: FeatureName[]): FeatureName[] {
  if (features.length <= MAX_FEATURES_TRACKED) {
    return features;
  }
  return features.slice(features.length - MAX_FEATURES_TRACKED);
}

function addFeature(
  existing: FeatureName[],
  feature: FeatureName,
): FeatureName[] {
  const filtered = existing.filter((item) => item !== feature);
  filtered.push(feature);
  if (filtered.length > MAX_FEATURES_TRACKED) {
    filtered.splice(0, filtered.length - MAX_FEATURES_TRACKED);
  }
  return filtered;
}
