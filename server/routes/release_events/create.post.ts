/**
 * POST /release_events/create
 * Creates a new release pipeline event and updates the state
 */

import { eventHandler, readBody } from "h3";
import type {
	CreateReleaseEventRequest,
	CreateReleaseEventResponse,
	ReleasePipelineEvent,
	MergeFeatureEvent,
	UpdateVersionsEvent,
	ReleaseTrackerState,
} from "../../../lib/types";
import { getRepoGraph } from "../../../lib/repoGraph";
import { getState, setState } from "../../utils/state";

/**
 * Handle a feature merge event
 */
async function handleFeatureMerged(
	event: MergeFeatureEvent,
	currentState: ReleaseTrackerState,
): Promise<void> {
	const { repo, feature_name } = event;

	// Find the latest version for this repo
	type RepoState = {
		merged_features: string[];
		queued_features: string[];
		upstream_features: string[];
	};
	const repoStates = currentState.repoStates as Record<string, RepoState>;
	const repoVersions = Object.keys(repoStates)
		.filter((key) => key.startsWith(`${repo}@`))
		.map((key) => {
			const match = key.match(/^(.+)@(.+)$/);
			if (!match) return null;
			const [, , version] = match;
			return { key, version };
		})
		.filter((v): v is { key: string; version: string } => v !== null)
		.sort((a, b) => {
			// Simple semver sort
			const aParts = a.version.split(".").map(Number);
			const bParts = b.version.split(".").map(Number);
			for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
				const aPart = aParts[i] || 0;
				const bPart = bParts[i] || 0;
				if (aPart !== bPart) return bPart - aPart;
			}
			return 0;
		});

	if (repoVersions.length > 0) {
		// Add to queued features of the latest version
		const latestKey = repoVersions[0].key;
		const repoState = repoStates[latestKey];
		if (repoState && !repoState.queued_features.includes(feature_name)) {
			repoState.queued_features.push(feature_name);
		}
	} else {
		// No version exists yet, create a placeholder state
		// This will be properly initialized when a version is created
		console.warn(
			`Feature merged for ${repo} but no version exists yet. Feature will be tracked when version is created.`,
		);
	}
}

/**
 * Handle a versions updated event
 */
async function handleVersionsUpdated(
	event: UpdateVersionsEvent,
	currentState: ReleaseTrackerState,
): Promise<void> {
	const { repo, version, package_json } = event;
	const stateKey = `${repo}@${version}`;

	// Initialize repo state if it doesn't exist
	type RepoState = {
		merged_features: string[];
		queued_features: string[];
		upstream_features: string[];
	};
	const repoStates = currentState.repoStates as Record<string, RepoState>;
	if (!repoStates[stateKey]) {
		repoStates[stateKey] = {
			merged_features: [],
			queued_features: [],
			upstream_features: [],
		};

		// Move queued features from previous version to merged features
		// Find the previous version for this repo
		const previousVersions = Object.keys(repoStates)
			.filter((key) => key.startsWith(`${repo}@`))
			.map((key) => {
				const match = key.match(/^(.+)@(.+)$/);
				if (!match) return null;
				const [, , v] = match;
				return { key, version: v };
			})
			.filter((v): v is { key: string; version: string } => v !== null)
			.sort((a, b) => {
				const aParts = a.version.split(".").map(Number);
				const bParts = b.version.split(".").map(Number);
				for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
					const aPart = aParts[i] || 0;
					const bPart = bParts[i] || 0;
					if (aPart !== bPart) return bPart - aPart;
				}
				return 0;
			});

		if (previousVersions.length > 0) {
			const previousKey = previousVersions[0].key;
			const previousState = repoStates[previousKey];
			if (previousState) {
				// Move queued features to merged features
				repoStates[stateKey].merged_features = [
					...previousState.merged_features,
					...previousState.queued_features,
				];
			}
		}
	}

	// Get upstream repos from package.json dependencies
	const upstreamRepos: string[] = [];
	const dependencies = {
		...package_json.dependencies,
		...package_json.devDependencies,
	};

	const repoGraph = getRepoGraph();
	for (const depName of Object.keys(dependencies)) {
		// Try to match dependency to a repo in the graph
		// e.g., "@tscircuit/core" -> "tscircuit/core"
		const repoName = depName.replace(/^@tscircuit\//, "tscircuit/");
		if (repoGraph[repoName]) {
			upstreamRepos.push(repoName);
		}
	}

	// Collect upstream features from upstream repos
	const upstreamFeatures: string[] = [];
	for (const upstreamRepo of upstreamRepos) {
		const upstreamVersions = Object.keys(repoStates)
			.filter((key) => key.startsWith(`${upstreamRepo}@`))
			.map((key) => {
				const match = key.match(/^(.+)@(.+)$/);
				if (!match) return null;
				const [, , v] = match;
				return { key, version: v };
			})
			.filter((v): v is { key: string; version: string } => v !== null)
			.sort((a, b) => {
				const aParts = a.version.split(".").map(Number);
				const bParts = b.version.split(".").map(Number);
				for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
					const aPart = aParts[i] || 0;
					const bPart = bParts[i] || 0;
					if (aPart !== bPart) return bPart - aPart;
				}
				return 0;
			});

		if (upstreamVersions.length > 0) {
			const latestUpstreamKey = upstreamVersions[0].key;
			const upstreamState = repoStates[latestUpstreamKey];
			if (upstreamState) {
				// Features in upstream that haven't been merged here yet
				const repoState = repoStates[stateKey];
				for (const feature of upstreamState.merged_features) {
					if (
						!repoState.merged_features.includes(feature) &&
						!repoState.upstream_features.includes(feature)
					) {
						upstreamFeatures.push(feature);
					}
				}
			}
		}
	}

	repoStates[stateKey].upstream_features = upstreamFeatures;
}

export default eventHandler(
	async (event): Promise<CreateReleaseEventResponse> => {
		try {
			const body = await readBody<CreateReleaseEventRequest>(event);
			const releaseEvent: ReleasePipelineEvent = body.event;

			const env = event.context.cloudflare?.env;
			const currentState = await getState(env);

			// Handle the event based on its type
			if (releaseEvent.event_type === "feature_merged") {
				await handleFeatureMerged(releaseEvent, currentState);
			} else if (releaseEvent.event_type === "versions_updated") {
				await handleVersionsUpdated(releaseEvent, currentState);
			} else {
				// TypeScript exhaustiveness check
				const _exhaustive: never = releaseEvent;
				return {
					success: false,
					message: `Unknown event type: ${_exhaustive}`,
				};
			}

			// Save the updated state
			await setState(currentState, env);

			return {
				success: true,
				message: "Event created successfully",
			};
		} catch (error) {
			console.error("Error creating release event:", error);
			return {
				success: false,
				message: error instanceof Error ? error.message : "Unknown error",
			};
		}
	},
);
