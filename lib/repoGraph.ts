/**
 * Repository graph configuration
 * This defines the dependency relationships between repositories in the tscircuit pipeline.
 *
 * Flow: core -> eval -> (runframe, tscircuit.com)
 *       (3d-viewer, pcb-viewer, schematic-viewer) -> runframe
 *       runframe -> cli -> tscircuit -> (svg.tscircuit.com, usercode.tscircuit.com)
 *
 * This file can be updated by committing changes to this repository.
 */

import type { ReleaseTrackerState } from "./types";

/**
 * Initialize the repo graph from the mermaid diagram in the README
 */
export function getRepoGraph(): ReleaseTrackerState["repoGraph"] {
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
