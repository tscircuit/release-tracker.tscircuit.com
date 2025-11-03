/**
 * State management for the release tracker
 */

import type { ReleaseTrackerState } from "../../lib/types";

/**
 * Initialize the repo graph from the mermaid diagram in the README
 * Flow: core -> eval -> (runframe, tscircuit.com)
 *       (3d-viewer, pcb-viewer, schematic-viewer) -> runframe
 *       runframe -> cli -> tscircuit -> (svg.tscircuit.com, usercode.tscircuit.com)
 */
function initializeRepoGraph(): ReleaseTrackerState["repoGraph"] {
	return {
		"tscircuit/core": {
			upstream_edge: null,
			downstream_edges: ["tscircuit/eval"],
		},
		"tscircuit/eval": {
			upstream_edge: "tscircuit/core",
			downstream_edges: ["tscircuit/runframe", "tscircuit.com"],
		},
		"tscircuit/runframe": {
			upstream_edge: "tscircuit/eval",
			downstream_edges: ["tscircuit/cli"],
		},
		"tscircuit.com": {
			upstream_edge: "tscircuit/eval",
			downstream_edges: [],
		},
		"tscircuit/3d-viewer": {
			upstream_edge: null,
			downstream_edges: ["tscircuit/runframe"],
		},
		"tscircuit/pcb-viewer": {
			upstream_edge: null,
			downstream_edges: ["tscircuit/runframe"],
		},
		"tscircuit/schematic-viewer": {
			upstream_edge: null,
			downstream_edges: ["tscircuit/runframe"],
		},
		"tscircuit/cli": {
			upstream_edge: "tscircuit/runframe",
			downstream_edges: ["tscircuit/tscircuit"],
		},
		"tscircuit/tscircuit": {
			upstream_edge: "tscircuit/cli",
			downstream_edges: [
				"tscircuit/svg.tscircuit.com",
				"tscircuit/usercode.tscircuit.com",
			],
		},
		"tscircuit/svg.tscircuit.com": {
			upstream_edge: "tscircuit/tscircuit",
			downstream_edges: [],
		},
		"tscircuit/usercode.tscircuit.com": {
			upstream_edge: "tscircuit/tscircuit",
			downstream_edges: [],
		},
	};
}

// In-memory state (could be moved to Nitro storage for persistence)
let state: ReleaseTrackerState = {
	repoGraph: initializeRepoGraph(),
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
 * Initialize state with default repo graph
 */
export function initState(): void {
	state = {
		repoGraph: initializeRepoGraph(),
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
