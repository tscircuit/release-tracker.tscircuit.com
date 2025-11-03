/**
 * Durable Object for storing Release Tracker state
 * This provides persistent storage for the application state
 * Note: repoGraph is not stored here, it's loaded from lib/repoGraph.ts
 */

import type { StoredState } from "../../lib/types";

export class StateStorage {
	private state: DurableObjectState;
	private env: Record<string, unknown>;

	constructor(state: DurableObjectState, env: Record<string, unknown>) {
		this.state = state;
		this.env = env;
	}

	/**
	 * Get the current stored state (without repoGraph)
	 */
	async getState(): Promise<StoredState> {
		const stored = await this.state.storage.get<StoredState>("state");

		if (stored) {
			return stored;
		}

		// Initialize with default state if not found
		const defaultState: StoredState = {
			repoStates: {},
		};

		// Save the default state
		await this.setState(defaultState);
		return defaultState;
	}

	/**
	 * Set the stored state (without repoGraph)
	 */
	async setState(newState: StoredState): Promise<void> {
		await this.state.storage.put("state", newState);
	}

	/**
	 * Initialize state (empty repoStates)
	 */
	async initState(): Promise<void> {
		const defaultState: StoredState = {
			repoStates: {},
		};
		await this.setState(defaultState);
	}

	/**
	 * Handle HTTP requests (if needed for direct access)
	 */
	async fetch(request: Request): Promise<Response> {
		if (request.method === "GET") {
			const state = await this.getState();
			return new Response(JSON.stringify(state), {
				headers: { "Content-Type": "application/json" },
			});
		}

		if (request.method === "POST") {
			const newState = (await request.json()) as StoredState;
			await this.setState(newState);
			return new Response(JSON.stringify({ success: true }), {
				headers: { "Content-Type": "application/json" },
			});
		}

		return new Response("Method not allowed", { status: 405 });
	}
}
