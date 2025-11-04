/**
 * State management for the release tracker
 * Uses Durable Objects for persistent storage on Cloudflare
 * Note: repoGraph is loaded from lib/repoGraph.ts, not stored in Durable Objects
 */

import type { ReleaseTrackerState, StoredState } from "../../lib/types";
import { getRepoGraph } from "../../lib/repoGraph";

interface CloudflareEnv {
	STATE_STORAGE?: DurableObjectNamespace;
}

/**
 * Get the Durable Object stub for state storage
 * Uses a singleton pattern - all requests use the same DO instance
 */
function getStateStorage(
	env: CloudflareEnv | undefined,
): DurableObjectStub | null {
	if (!env?.STATE_STORAGE) {
		return null;
	}
	const id = env.STATE_STORAGE.idFromName("singleton");
	return env.STATE_STORAGE.get(id);
}

/**
 * Get the current state from Durable Object
 * Merges stored state with repoGraph from lib/repoGraph.ts
 */
export async function getState(
	env?: CloudflareEnv,
): Promise<ReleaseTrackerState> {
	const stub = getStateStorage(env);
	let storedState: StoredState;

	if (!stub) {
		// Fallback for development/testing without Durable Objects
		console.warn("STATE_STORAGE not available, using in-memory fallback");
		storedState = getStateFallback();
	} else {
		// Use fetch to call the Durable Object's GET endpoint
		const response = await stub.fetch(new Request("http://localhost/"));
		storedState = (await response.json()) as StoredState;
	}

	// Merge stored state with repoGraph from file
	return {
		repoGraph: getRepoGraph(),
		repoStates: storedState.repoStates,
	};
}

/**
 * Set the state in Durable Object
 * Only stores repoStates, not repoGraph
 */
export async function setState(
	newState: ReleaseTrackerState,
	env?: CloudflareEnv,
): Promise<void> {
	// Extract only repoStates for storage (repoGraph is not stored)
	const storedState: StoredState = {
		repoStates: newState.repoStates,
	};

	const stub = getStateStorage(env);
	if (!stub) {
		// Fallback for development/testing without Durable Objects
		console.warn("STATE_STORAGE not available, using in-memory fallback");
		setStateFallback(storedState);
		return;
	}

	// Use fetch to call the Durable Object's POST endpoint
	await stub.fetch(
		new Request("http://localhost/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(storedState),
		}),
	);
}

/**
 * Initialize state with default repo graph
 */
export async function initState(env?: CloudflareEnv): Promise<void> {
	if (!env?.STATE_STORAGE) {
		// Fallback for development/testing without Durable Objects
		console.warn("STATE_STORAGE not available, using in-memory fallback");
		initStateFallback();
		return;
	}

	// Initialize by calling getState which will initialize if needed
	await getState(env);
}

// Fallback in-memory state for development/testing (only repoStates)
let fallbackState: StoredState | null = null;

function getStateFallback(): StoredState {
	if (!fallbackState) {
		fallbackState = {
			repoStates: {},
		};
	}
	return fallbackState;
}

function setStateFallback(newState: StoredState): void {
	fallbackState = newState;
}

function initStateFallback(): void {
	fallbackState = {
		repoStates: {},
	};
}

/**
 * Get state as JSON string for storage (legacy compatibility)
 */
export function getStateJson(): string {
	return JSON.stringify(fallbackState || getStateFallback());
}

/**
 * Load state from JSON string (legacy compatibility)
 */
export function loadStateFromJson(json: string): void {
	fallbackState = JSON.parse(json);
}
