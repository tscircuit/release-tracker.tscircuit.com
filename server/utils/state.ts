/**
 * State management for the release tracker
 */

import type { ReleaseTrackerState } from "../../lib/types";

// In-memory state (could be moved to Nitro storage for persistence)
let state: ReleaseTrackerState = {
	repoGraph: {},
	repoStates: {},
};

/**
 * Get the current state
 */
export function getState(): ReleaseTrackerState {
	return state;
}

/**
 * Set the state
 */
export function setState(newState: ReleaseTrackerState): void {
	state = newState;
}

/**
 * Initialize state with empty structure
 */
export function initState(): void {
	state = {
		repoGraph: {},
		repoStates: {},
	};
}

/**
 * Get state as JSON string for storage
 */
export function getStateJson(): string {
	return JSON.stringify(state);
}

/**
 * Load state from JSON string
 */
export function loadStateFromJson(json: string): void {
	state = JSON.parse(json);
}
