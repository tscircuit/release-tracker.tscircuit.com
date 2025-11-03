import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import memoryDriver from "unstorage/drivers/memory";

export type RepoName = string;

export type FeatureName = string;
export type SemverVersion = string;

export interface RepoGraphEntry {
  upstream: RepoName[];
  downstream: RepoName[];
}

export interface RepoVersionState {
  repo: RepoName;
  version: SemverVersion;
  merged_features: FeatureName[];
  queued_features: FeatureName[];
  upstream_features: FeatureName[];
}

export interface ReleaseTrackerState {
  repoGraph: Record<RepoName, RepoGraphEntry>;
  repoStates: Record<string, RepoVersionState>;
  latestRepoVersions: Record<RepoName, SemverVersion>;
}

export type ReleasePipelineEvent = UpdateVersionsEvent | MergeFeatureEvent;

export interface UpdateVersionsEvent {
  event_type: "versions_updated";
  repo: RepoName;
  version: SemverVersion;
  package_json?: Record<string, unknown>;
}

export interface MergeFeatureEvent {
  event_type: "feature_merged";
  repo: RepoName;
  feature_name: FeatureName;
}

const STORAGE_KEY = "release-tracker-state";
export const FEATURE_LIMIT = 100;
const DEFAULT_VERSION: SemverVersion = "0.0.0";

const DEFAULT_GRAPH: Record<RepoName, RepoGraphEntry> = {
  core: { upstream: [], downstream: ["eval"] },
  eval: { upstream: ["core"], downstream: ["runframe", "tscircuit.com"] },
  runframe: {
    upstream: ["eval", "viewer3d", "pcbviewer", "schemaviewer"],
    downstream: ["cli"],
  },
  cli: { upstream: ["runframe"], downstream: ["tscircuit"] },
  tscircuit: { upstream: ["cli"], downstream: ["svg", "usercode"] },
  svg: { upstream: ["tscircuit"], downstream: [] },
  usercode: { upstream: ["tscircuit"], downstream: [] },
  viewer3d: { upstream: [], downstream: ["runframe"] },
  pcbviewer: { upstream: [], downstream: ["runframe"] },
  schemaviewer: { upstream: [], downstream: ["runframe"] },
  "tscircuit.com": { upstream: ["eval"], downstream: [] },
};

function sanitizeGraph(): Record<RepoName, RepoGraphEntry> {
  const graph: Partial<Record<RepoName, RepoGraphEntry>> = {};
  const repos = Object.keys(DEFAULT_GRAPH) as RepoName[];
  for (const repo of repos) {
    const entry = DEFAULT_GRAPH[repo];
    graph[repo] = {
      upstream: [...new Set(entry.upstream)].filter(Boolean) as RepoName[],
      downstream: [...new Set(entry.downstream)].filter(Boolean) as RepoName[],
    };
  }

  // Ensure every downstream repo knows about upstream relationship
  for (const repo of repos) {
    const entry = graph[repo]!;
    for (const downstream of entry.downstream) {
      if (!graph[downstream]) {
        continue;
      }
      if (!graph[downstream]!.upstream.includes(repo)) {
        graph[downstream]!.upstream.push(repo);
      }
    }
  }

  // Ensure every upstream repo knows about downstream relationship
  for (const repo of repos) {
    const entry = graph[repo]!;
    for (const upstream of entry.upstream) {
      if (!graph[upstream]) {
        continue;
      }
      if (!graph[upstream]!.downstream.includes(repo)) {
        graph[upstream]!.downstream.push(repo);
      }
    }
  }

  return graph as Record<RepoName, RepoGraphEntry>;
}

const GRAPH = sanitizeGraph();

function isTestEnvironment() {
  return process.env.BUN_TESTING === "1" || process.env.NODE_ENV === "test";
}

let storageInstance = createStorage<ReleaseTrackerState>({
  driver: isTestEnvironment()
    ? memoryDriver()
    : fsDriver({ base: ".data/release-tracker" }),
});

function getStorage() {
  return storageInstance;
}

function featureKey(repo: RepoName, version: SemverVersion) {
  return `${repo}@${version}`;
}

function createEmptyRepoState(
  repo: RepoName,
  version: SemverVersion,
): RepoVersionState {
  return {
    repo,
    version,
    merged_features: [],
    queued_features: [],
    upstream_features: [],
  };
}

function limitFeatures(features: FeatureName[]): FeatureName[] {
  if (features.length <= FEATURE_LIMIT) {
    return features;
  }
  return features.slice(features.length - FEATURE_LIMIT);
}

function addFeatureUnique(
  features: FeatureName[],
  feature: FeatureName,
): FeatureName[] {
  const filtered = features.filter((item) => item !== feature);
  filtered.push(feature);
  return limitFeatures(filtered);
}

function removeFeature(
  features: FeatureName[],
  feature: FeatureName,
): FeatureName[] {
  return features.filter((item) => item !== feature);
}

function extractDependencyNames(
  packageJson: Record<string, unknown> | undefined,
): string[] {
  if (!packageJson || typeof packageJson !== "object") {
    return [];
  }

  const sections = [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ] as const;

  const names = new Set<string>();

  for (const section of sections) {
    const value = (packageJson as Record<string, unknown>)[section];
    if (!value || typeof value !== "object") {
      continue;
    }

    for (const name of Object.keys(value as Record<string, unknown>)) {
      names.add(name);
    }
  }

  return Array.from(names);
}

function mapPackageNameToRepo(name: string): RepoName | null {
  const normalized = name.replace(/^@tscircuit\//, "");
  const sanitized = normalized.replace(/[^a-z0-9]/gi, "").toLowerCase();
  for (const repo of Object.keys(GRAPH)) {
    const repoSanitized = repo.replace(/[^a-z0-9]/gi, "").toLowerCase();
    if (repoSanitized === sanitized) {
      return repo;
    }
  }
  return null;
}

async function ensureState(): Promise<ReleaseTrackerState> {
  let state = await getStorage().getItem(STORAGE_KEY);
  if (!state) {
    const repoStates: Record<string, RepoVersionState> = {};
    const latestRepoVersions: Record<RepoName, SemverVersion> = {} as Record<
      RepoName,
      SemverVersion
    >;
    for (const repo of Object.keys(GRAPH) as RepoName[]) {
      repoStates[featureKey(repo, DEFAULT_VERSION)] = createEmptyRepoState(
        repo,
        DEFAULT_VERSION,
      );
      latestRepoVersions[repo] = DEFAULT_VERSION;
    }
    state = {
      repoGraph: GRAPH,
      repoStates,
      latestRepoVersions,
    };
    await getStorage().setItem(STORAGE_KEY, state);
  }
  return state;
}

function getLatestVersion(
  state: ReleaseTrackerState,
  repo: RepoName,
): SemverVersion {
  return state.latestRepoVersions[repo] ?? DEFAULT_VERSION;
}

function ensureRepoVersionState(
  state: ReleaseTrackerState,
  repo: RepoName,
  version: SemverVersion,
): RepoVersionState {
  const key = featureKey(repo, version);
  if (!state.repoStates[key]) {
    state.repoStates[key] = createEmptyRepoState(repo, version);
  }
  return state.repoStates[key];
}

function findLatestRepoState(
  state: ReleaseTrackerState,
  repo: RepoName,
): RepoVersionState {
  const version = getLatestVersion(state, repo);
  return ensureRepoVersionState(state, repo, version);
}

function recomputeUpstreamFeatures(
  state: ReleaseTrackerState,
  targetRepos?: Set<RepoName>,
) {
  const reposToUpdate =
    targetRepos ?? new Set(Object.keys(GRAPH) as RepoName[]);
  for (const repo of reposToUpdate) {
    const repoState = findLatestRepoState(state, repo);
    const upstreamRepos = GRAPH[repo]?.upstream ?? [];
    if (!upstreamRepos.length) {
      repoState.upstream_features = [];
      continue;
    }

    const upstreamFeatures: FeatureName[] = [];
    for (const upstream of upstreamRepos) {
      const upstreamState = findLatestRepoState(state, upstream);
      for (const feature of upstreamState.merged_features) {
        if (
          repoState.merged_features.includes(feature) ||
          repoState.queued_features.includes(feature) ||
          upstreamFeatures.includes(feature)
        ) {
          continue;
        }
        upstreamFeatures.push(feature);
      }
    }

    repoState.upstream_features = limitFeatures(upstreamFeatures);
  }
}

function collectDownstreamRepos(repo: RepoName): Set<RepoName> {
  const visited = new Set<RepoName>();
  const queue: RepoName[] = [repo];
  while (queue.length) {
    const current = queue.shift()!;
    for (const downstream of GRAPH[current]?.downstream ?? []) {
      if (!visited.has(downstream)) {
        visited.add(downstream);
        queue.push(downstream);
      }
    }
  }
  return visited;
}

function handleFeatureMerged(
  state: ReleaseTrackerState,
  event: MergeFeatureEvent,
) {
  const repoState = findLatestRepoState(state, event.repo);
  repoState.merged_features = addFeatureUnique(
    repoState.merged_features,
    event.feature_name,
  );
  repoState.queued_features = removeFeature(
    repoState.queued_features,
    event.feature_name,
  );
  repoState.upstream_features = removeFeature(
    repoState.upstream_features,
    event.feature_name,
  );

  const affectedRepos = collectDownstreamRepos(event.repo);
  affectedRepos.add(event.repo);
  recomputeUpstreamFeatures(state, affectedRepos);
}

function selectReferencedUpstreams(
  repo: RepoName,
  packageJson?: Record<string, unknown>,
): RepoName[] {
  const upstreamRepos = GRAPH[repo]?.upstream ?? [];
  if (!upstreamRepos.length) {
    return [];
  }
  const dependencyNames = extractDependencyNames(packageJson);
  if (!dependencyNames.length) {
    return upstreamRepos;
  }
  const referenced = new Set<RepoName>();
  for (const depName of dependencyNames) {
    const repoName = mapPackageNameToRepo(depName);
    if (repoName && upstreamRepos.includes(repoName)) {
      referenced.add(repoName);
    }
  }
  return referenced.size ? Array.from(referenced) : upstreamRepos;
}

function handleVersionsUpdated(
  state: ReleaseTrackerState,
  event: UpdateVersionsEvent,
) {
  const previousVersion = getLatestVersion(state, event.repo);
  const previousState = ensureRepoVersionState(
    state,
    event.repo,
    previousVersion,
  );
  const newVersion = event.version;
  const newState = createEmptyRepoState(event.repo, newVersion);

  const mergedSet = new Set(previousState.merged_features);
  for (const feature of previousState.queued_features) {
    mergedSet.add(feature);
  }
  newState.merged_features = limitFeatures(Array.from(mergedSet));

  const referencedUpstreams = selectReferencedUpstreams(
    event.repo,
    event.package_json,
  );
  const queued: FeatureName[] = [];
  for (const upstream of referencedUpstreams) {
    const upstreamState = findLatestRepoState(state, upstream);
    for (const feature of upstreamState.merged_features) {
      if (mergedSet.has(feature) || queued.includes(feature)) {
        continue;
      }
      queued.push(feature);
    }
  }
  newState.queued_features = limitFeatures(queued);

  state.latestRepoVersions[event.repo] = newVersion;
  state.repoStates[featureKey(event.repo, newVersion)] = newState;

  const affectedRepos = collectDownstreamRepos(event.repo);
  affectedRepos.add(event.repo);
  recomputeUpstreamFeatures(state, affectedRepos);
}

export async function applyReleasePipelineEvent(event: ReleasePipelineEvent) {
  const state = await ensureState();
  if (event.event_type === "feature_merged") {
    handleFeatureMerged(state, event);
  } else if (event.event_type === "versions_updated") {
    handleVersionsUpdated(state, event);
  } else {
    throw new Error(
      `Unsupported event type: ${(event as ReleasePipelineEvent).event_type}`,
    );
  }
  await getStorage().setItem(STORAGE_KEY, state);
  return buildSummary(state);
}

export interface RepoSummary {
  repo: RepoName;
  version: SemverVersion;
  merged_features: FeatureName[];
  queued_features: FeatureName[];
  upstream_features: FeatureName[];
}

export interface ReleaseTrackerSummary {
  repoGraph: Record<RepoName, RepoGraphEntry>;
  latestRepoVersions: Record<RepoName, SemverVersion>;
  repoSummaries: RepoSummary[];
}

export async function getReleaseTrackerSummary(): Promise<ReleaseTrackerSummary> {
  const state = await ensureState();
  return buildSummary(state);
}

function buildSummary(state: ReleaseTrackerState): ReleaseTrackerSummary {
  const repoSummaries: RepoSummary[] = [];
  for (const repo of Object.keys(state.repoGraph) as RepoName[]) {
    const version = getLatestVersion(state, repo);
    const repoState = ensureRepoVersionState(state, repo, version);
    repoSummaries.push({
      repo,
      version,
      merged_features: [...repoState.merged_features],
      queued_features: [...repoState.queued_features],
      upstream_features: [...repoState.upstream_features],
    });
  }
  return {
    repoGraph: state.repoGraph,
    latestRepoVersions: state.latestRepoVersions,
    repoSummaries,
  };
}

export async function resetReleaseTrackerState() {
  if (!isTestEnvironment()) {
    await getStorage().removeItem(STORAGE_KEY);
  }
  storageInstance = createStorage<ReleaseTrackerState>({
    driver: isTestEnvironment()
      ? memoryDriver()
      : fsDriver({ base: ".data/release-tracker" }),
  });
  await storageInstance.removeItem(STORAGE_KEY);
  await ensureState();
}
