import { useStorage } from "nitropack";
import {
  createInitialReleaseTrackerState,
  type ReleaseTrackerState,
} from "./releaseTracker";

const STORAGE_NAMESPACE = "release-tracker";
const STORAGE_KEY = "state";

export async function readReleaseTrackerState(): Promise<ReleaseTrackerState> {
  const storage = useStorage(STORAGE_NAMESPACE);
  const storedState = await storage.getItem<ReleaseTrackerState>(STORAGE_KEY);
  if (storedState) {
    return storedState;
  }
  const initial = createInitialReleaseTrackerState();
  await storage.setItem(STORAGE_KEY, initial);
  return initial;
}

export async function writeReleaseTrackerState(state: ReleaseTrackerState) {
  const storage = useStorage(STORAGE_NAMESPACE);
  await storage.setItem(STORAGE_KEY, state);
}
