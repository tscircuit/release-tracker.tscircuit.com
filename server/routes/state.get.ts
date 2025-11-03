/**
 * GET /state
 * Returns the current release tracker state
 */

import { eventHandler } from "h3";
import { getState } from "../utils/state";

export default eventHandler(() => {
	const state = getState();
	return state;
});
