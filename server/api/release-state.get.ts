import { eventHandler } from "h3";
import { getReleaseTrackerSummary } from "../utils/releaseState";

export default eventHandler(async () => {
  const summary = await getReleaseTrackerSummary();
  return summary;
});
