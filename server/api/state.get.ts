import { eventHandler } from "h3";

import { getReleaseTrackerSnapshot } from "../utils/release-tracker";

export default eventHandler(async () => {
  return getReleaseTrackerSnapshot();
});
