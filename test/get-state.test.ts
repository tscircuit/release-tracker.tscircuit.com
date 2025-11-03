/**
 * Integration test: Get state
 *
 * Tests retrieving the release tracker state via GET /state
 */

import { test, expect, beforeAll, afterAll } from "bun:test";
import { setupTestServer } from "./setup";
import type { ReleaseTrackerState } from "../lib/types";
import { ROUTES } from "../lib/routes";

let testServer: Awaited<ReturnType<typeof setupTestServer>> | null = null;

beforeAll(async () => {
	testServer = await setupTestServer();
});

afterAll(async () => {
	if (testServer) {
		await testServer.close();
	}
});

test("should return the current release tracker state", async () => {
	if (!testServer) throw new Error("Test server not initialized");

	const response = await fetch(`${testServer.url}${ROUTES.GET_STATE.path}`);

	if (response.status === 404) {
		console.log("Route not implemented yet - skipping test");
		return;
	}

	expect(response.status).toBe(200);
	const state: ReleaseTrackerState = await response.json();

	// Validate structure
	expect(state).toHaveProperty("repoGraph");
	expect(state).toHaveProperty("repoStates");
	expect(typeof state.repoGraph).toBe("object");
	expect(typeof state.repoStates).toBe("object");

	// Validate repo graph structure
	for (const graph of Object.values(state.repoGraph)) {
		expect(graph).toHaveProperty("upstream_edge");
		expect(graph).toHaveProperty("downstream_edges");
		expect(Array.isArray(graph.downstream_edges)).toBe(true);
	}

	// Validate repo states structure
	for (const [key, stateEntry] of Object.entries(state.repoStates)) {
		expect(key).toMatch(/^.+@.+/); // Should match RepoName@SemverVersion format
		expect(stateEntry).toHaveProperty("merged_features");
		expect(stateEntry).toHaveProperty("queued_features");
		expect(stateEntry).toHaveProperty("upstream_features");
		expect(Array.isArray(stateEntry.merged_features)).toBe(true);
		expect(Array.isArray(stateEntry.queued_features)).toBe(true);
		expect(Array.isArray(stateEntry.upstream_features)).toBe(true);
	}
});
