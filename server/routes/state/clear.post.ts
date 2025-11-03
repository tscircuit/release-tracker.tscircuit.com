/**
 * POST /state/clear
 * Clears all state (resets repoStates to empty)
 */

import { eventHandler } from "h3";
import { getState, setState } from "../../utils/state";
import { getRepoGraph } from "../../../lib/repoGraph";

export default eventHandler(async (event) => {
	const env = event.context.cloudflare?.env;
	const currentState = await getState(env);

	// Clear all repoStates but keep the repoGraph
	const clearedState = {
		repoGraph: getRepoGraph(),
		repoStates: {},
	};

	await setState(clearedState, env);

	return {
		success: true,
		message: "State cleared successfully",
	};
});

