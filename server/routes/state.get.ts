/**
 * GET /state
 * Returns the current release tracker state
 */

import { eventHandler } from "h3";
import { getState } from "../utils/state";

export default eventHandler(async (event) => {
	const env = event.context.cloudflare?.env;
	const state = await getState(env);
	return state;
});
