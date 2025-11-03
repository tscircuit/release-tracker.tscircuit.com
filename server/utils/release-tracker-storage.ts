import { createStorage } from "unstorage";
import {
  applyReleaseEvent,
  buildRepoViews,
  createInitialState,
  type ReleasePipelineEvent,
  type ReleaseTrackerStorageState,
  type RepoViewRow,
  recomputeRepoStates,
} from "./release-tracker";

const storage = createStorage();
const STORAGE_KEY = "release-tracker/state";

async function ensureInitialized(): Promise<ReleaseTrackerStorageState> {
  const existing =
    await storage.getItem<ReleaseTrackerStorageState>(STORAGE_KEY);
  if (existing) {
    return existing;
  }
  const initial = createInitialState();
  recomputeRepoStates(initial);
  await storage.setItem(STORAGE_KEY, initial);
  return initial;
}

export async function getStoredState(): Promise<ReleaseTrackerStorageState> {
  const state = await ensureInitialized();
  return structuredClone(state);
}

export async function setStoredState(
  state: ReleaseTrackerStorageState,
): Promise<void> {
  await storage.setItem(STORAGE_KEY, state);
}

export async function updateStoredState(
  event: ReleasePipelineEvent,
): Promise<ReleaseTrackerStorageState> {
  const current = await ensureInitialized();
  const next = applyReleaseEvent(current, event);
  await storage.setItem(STORAGE_KEY, next);
  return structuredClone(next);
}

export async function getRepoTableView(): Promise<RepoViewRow[]> {
  const state = await ensureInitialized();
  return buildRepoViews(state);
}
