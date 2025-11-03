import { defineEventHandler } from "h3";
import { readReleaseTrackerState } from "../../utils/releaseTrackerStorage";

export default defineEventHandler(async () => {
  const state = await readReleaseTrackerState();
  return state;
});
