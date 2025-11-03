import { createStorage, type Storage } from "unstorage";
import memoryDriver from "unstorage/drivers/memory";

declare const useStorage: ((name?: string) => Storage) | undefined;

export type RepoName =
  | "core"
  | "eval"
  | "runframe"
  | "tscircuit.com"
  | "3d-viewer"
  | "pcb-viewer"
  | "schematic-viewer"
  | "cli"
  | "tscircuit"
  | "svg"
  | "usercode";

export interface RepoGraphNode {
  upstream_edge: RepoName | null;
  downstream_edges: RepoName[];
}

export type RepoGraph = Record<RepoName, RepoGraphNode>;

export interface RepoFeatureState {
  version: string | null;
  merged_features: string[];
  queued_features: string[];
  upstream_features: string[];
}

export interface ReleaseTrackerPublicState {
  repoGraph: RepoGraph;
  repos: Record<RepoName, RepoFeatureState>;
}

export interface UpdateVersionsEvent {
  event_type: "versions_updated";
  repo: RepoName;
  version: string;
  package_json: unknown;
}

export interface MergeFeatureEvent {
  event_type: "feature_merged";
  repo: RepoName;
  feature_name: string;
}

export type ReleasePipelineEvent = UpdateVersionsEvent | MergeFeatureEvent;

interface RepoHistoryState extends RepoFeatureState {
  recorded_at: string;
  package_json?: unknown;
}

interface ReleaseTrackerStorageState {
  repoGraph: RepoGraph;
  currentRepoState: Record<RepoName, RepoFeatureState>;
  repoHistory: Record<string, RepoHistoryState>;
}

const STORAGE_NAMESPACE = "release-tracker";
const STORAGE_KEY = "state";
const MAX_FEATURES = 100;

const DEFAULT_REPO_GRAPH: RepoGraph = {
  core: {
    upstream_edge: null,
    downstream_edges: ["eval"],
  },
  eval: {
    upstream_edge: "core",
    downstream_edges: ["runframe", "tscircuit.com"],
  },
  runframe: {
    upstream_edge: "eval",
    downstream_edges: ["cli"],
  },
  "tscircuit.com": {
    upstream_edge: "eval",
    downstream_edges: [],
  },
  "3d-viewer": {
    upstream_edge: null,
    downstream_edges: ["runframe"],
  },
  "pcb-viewer": {
    upstream_edge: null,
    downstream_edges: ["runframe"],
  },
  "schematic-viewer": {
    upstream_edge: null,
    downstream_edges: ["runframe"],
  },
  cli: {
    upstream_edge: "runframe",
    downstream_edges: ["tscircuit"],
  },
  tscircuit: {
    upstream_edge: "cli",
    downstream_edges: ["svg", "usercode"],
  },
  svg: {
    upstream_edge: "tscircuit",
    downstream_edges: [],
  },
  usercode: {
    upstream_edge: "tscircuit",
    downstream_edges: [],
  },
};

let fallbackStorage: Storage | null = null;

function createDefaultRepoFeatureState(): RepoFeatureState {
  return {
    version: null,
    merged_features: [],
    queued_features: [],
    upstream_features: [],
  };
}

function createDefaultState(): ReleaseTrackerStorageState {
  const currentRepoState = Object.keys(DEFAULT_REPO_GRAPH).reduce(
    (acc, repo) => {
      acc[repo as RepoName] = createDefaultRepoFeatureState();
      return acc;
    },
    {} as Record<RepoName, RepoFeatureState>,
  );

  return {
    repoGraph: DEFAULT_REPO_GRAPH,
    currentRepoState,
    repoHistory: {},
  };
}

async function getStorage(): Promise<Storage> {
  if (typeof useStorage === "function") {
    return useStorage(STORAGE_NAMESPACE);
  }

  if (!fallbackStorage) {
    fallbackStorage = createStorage({
      driver: memoryDriver(),
    });
  }

  return fallbackStorage;
}

async function loadState(storage?: Storage): Promise<{
  storage: Storage;
  state: ReleaseTrackerStorageState;
}> {
  const resolvedStorage = storage ?? (await getStorage());
  const existingState =
    await resolvedStorage.getItem<ReleaseTrackerStorageState>(STORAGE_KEY);

  if (existingState) {
    return { storage: resolvedStorage, state: existingState };
  }

  const defaultState = createDefaultState();
  await resolvedStorage.setItem(STORAGE_KEY, defaultState);
  return { storage: resolvedStorage, state: defaultState };
}

async function saveState(
  storage: Storage,
  state: ReleaseTrackerStorageState,
): Promise<void> {
  await storage.setItem(STORAGE_KEY, state);
}

function ensureRepoState(
  state: ReleaseTrackerStorageState,
  repo: RepoName,
): RepoFeatureState {
  const existing = state.currentRepoState[repo];
  if (existing) {
    return existing;
  }

  const fresh = createDefaultRepoFeatureState();
  state.currentRepoState[repo] = fresh;
  return fresh;
}

function removeFeature(list: string[], feature: string): void {
  const index = list.indexOf(feature);
  if (index >= 0) {
    list.splice(index, 1);
  }
}

function pushWithLimit(list: string[], feature: string): void {
  removeFeature(list, feature);
  list.push(feature);
  if (list.length > MAX_FEATURES) {
    list.splice(0, list.length - MAX_FEATURES);
  }
}

function mergeWithLimit(list: string[], features: string[]): void {
  for (const feature of features) {
    pushWithLimit(list, feature);
  }
}

function cloneRepoState(source: RepoFeatureState): RepoFeatureState {
  return {
    version: source.version,
    merged_features: [...source.merged_features],
    queued_features: [...source.queued_features],
    upstream_features: [...source.upstream_features],
  };
}

function recordHistorySnapshot(
  state: ReleaseTrackerStorageState,
  repo: RepoName,
  repoState: RepoFeatureState,
  version: string,
) {
  const snapshot: RepoHistoryState = {
    ...cloneRepoState(repoState),
    recorded_at: new Date().toISOString(),
  };

  state.repoHistory[`${repo}@${version}`] = snapshot;
}

function createPublicState(
  state: ReleaseTrackerStorageState,
): ReleaseTrackerPublicState {
  const repos = Object.entries(state.currentRepoState).reduce(
    (acc, [repo, repoState]) => {
      acc[repo as RepoName] = cloneRepoState(repoState);
      return acc;
    },
    {} as Record<RepoName, RepoFeatureState>,
  );

  return {
    repoGraph: state.repoGraph,
    repos,
  };
}

function assertRepoName(value: string): asserts value is RepoName {
  if (!(value in DEFAULT_REPO_GRAPH)) {
    throw new Error(`Unknown repo: ${value}`);
  }
}

function assertVersionsUpdatedEvent(
  payload: ReleasePipelineEvent,
): asserts payload is UpdateVersionsEvent {
  if (payload.event_type !== "versions_updated") {
    throw new Error("Expected versions_updated event");
  }

  if (typeof payload.repo !== "string" || typeof payload.version !== "string") {
    throw new Error("Invalid versions_updated event payload");
  }

  assertRepoName(payload.repo);
}

function assertFeatureMergedEvent(
  payload: ReleasePipelineEvent,
): asserts payload is MergeFeatureEvent {
  if (payload.event_type !== "feature_merged") {
    throw new Error("Expected feature_merged event");
  }

  if (
    typeof payload.repo !== "string" ||
    typeof payload.feature_name !== "string"
  ) {
    throw new Error("Invalid feature_merged event payload");
  }

  assertRepoName(payload.repo);
}

function normalizePackageJson(packageJson: unknown): unknown {
  if (typeof packageJson === "string") {
    try {
      return JSON.parse(packageJson);
    } catch {
      return {};
    }
  }

  if (packageJson && typeof packageJson === "object") {
    return packageJson;
  }

  return {};
}

function propagateMergedFeatures(
  state: ReleaseTrackerStorageState,
  repo: RepoName,
  mergedFeatures: string[],
) {
  const downstreamRepos = state.repoGraph[repo]?.downstream_edges ?? [];
  for (const downstreamRepo of downstreamRepos) {
    const downstreamState = ensureRepoState(state, downstreamRepo);
    for (const feature of mergedFeatures) {
      removeFeature(downstreamState.queued_features, feature);
      pushWithLimit(downstreamState.upstream_features, feature);
    }
  }
}

function handleFeatureMerged(
  state: ReleaseTrackerStorageState,
  event: MergeFeatureEvent,
) {
  const repoState = ensureRepoState(state, event.repo);
  removeFeature(repoState.upstream_features, event.feature_name);
  pushWithLimit(repoState.queued_features, event.feature_name);
}

function handleVersionsUpdated(
  state: ReleaseTrackerStorageState,
  event: UpdateVersionsEvent,
) {
  const repoState = ensureRepoState(state, event.repo);
  repoState.version = event.version;

  const newlyMerged = [...repoState.queued_features];
  repoState.queued_features = [];
  mergeWithLimit(repoState.merged_features, newlyMerged);

  recordHistorySnapshot(state, event.repo, repoState, event.version);

  propagateMergedFeatures(state, event.repo, newlyMerged);

  // package_json is currently normalized for future use and stored in history when provided
  // but is otherwise unused in state transitions.
  const normalizedPackageJson = normalizePackageJson(event.package_json);
  if (typeof normalizedPackageJson === "object") {
    state.repoHistory[`${event.repo}@${event.version}`].package_json =
      normalizedPackageJson;
  }
}

export async function applyReleasePipelineEvent(
  event: ReleasePipelineEvent,
  storageOverride?: Storage,
): Promise<ReleaseTrackerPublicState> {
  const { storage, state } = await loadState(storageOverride);

  if (event.event_type === "feature_merged") {
    assertFeatureMergedEvent(event);
    handleFeatureMerged(state, event);
  } else if (event.event_type === "versions_updated") {
    assertVersionsUpdatedEvent(event);
    event.package_json = normalizePackageJson(event.package_json);
    handleVersionsUpdated(state, event);
  } else {
    throw new Error(
      `Unknown event type: ${(event as ReleasePipelineEvent).event_type}`,
    );
  }

  await saveState(storage, state);
  return createPublicState(state);
}

export async function getReleaseTrackerSnapshot(
  storageOverride?: Storage,
): Promise<ReleaseTrackerPublicState> {
  const { state } = await loadState(storageOverride);
  return createPublicState(state);
}

export async function resetReleaseTrackerState(
  storageOverride?: Storage,
): Promise<void> {
  const storage = storageOverride ?? (await getStorage());
  await storage.removeItem(STORAGE_KEY);
}

export const DEFAULT_STATE = createDefaultState();
export const DEFAULT_GRAPH = DEFAULT_REPO_GRAPH;
