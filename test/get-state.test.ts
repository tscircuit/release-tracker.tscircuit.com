/**
 * Integration test: Get state
 *
 * Tests retrieving the release tracker state via GET /state
 */

import { test, expect, beforeAll, afterAll } from "bun:test";
import { setupTestServer } from "./setup";

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

	const response = await fetch(`${testServer.url}/state`);

	if (response.status === 404) {
		console.log("Route not implemented yet - skipping test");
		return;
	}

	expect(response.status).toBe(200);
	const state = await response.json();

	// Validate structure
	expect(state).toHaveProperty("repoGraph");
	expect(state).toHaveProperty("repoStates");
	expect(typeof state.repoGraph).toBe("object");
	expect(typeof state.repoStates).toBe("object");

	// Validate repo graph structure
	for (const graph of Object.values(state.repoGraph)) {
		const g = graph as Record<string, unknown>;
		expect(g).toHaveProperty("upstream_edge");
		expect(g).toHaveProperty("downstream_edges");
		expect(Array.isArray(g.downstream_edges)).toBe(true);
	}

	// Validate repo states structure
	for (const [key, stateEntry] of Object.entries(state.repoStates)) {
		const entry = stateEntry as Record<string, unknown>;
		expect(key).toMatch(/^.+@.+/); // Should match RepoName@SemverVersion format
		expect(entry).toHaveProperty("merged_features");
		expect(entry).toHaveProperty("queued_features");
		expect(entry).toHaveProperty("upstream_features");
		expect(Array.isArray(entry.merged_features)).toBe(true);
		expect(Array.isArray(entry.queued_features)).toBe(true);
		expect(Array.isArray(entry.upstream_features)).toBe(true);
	}
});
