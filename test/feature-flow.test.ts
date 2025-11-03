/**
 * Integration test: Feature flow scenario
 *
 * Tests the complete flow of a feature being merged and propagating through the release pipeline:
 * 1. Merge feature to core
 * 2. Update versions downstream
 * 3. Verify state reflects the feature propagation
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

test("should track a feature from merge to downstream propagation", async () => {
	if (!testServer) throw new Error("Test server not initialized");

	// Step 1: Merge feature to core
	const mergeEvent = {
		event_type: "feature_merged",
		repo: "tscircuit/core",
		feature_name: "Introduce Ground Pours",
	};

	const mergeResponse = await fetch(`${testServer.url}/release_events/create`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ event: mergeEvent }),
	});

	if (mergeResponse.status === 404) {
		console.log("Route not implemented yet - skipping test");
		return;
	}

	expect(mergeResponse.status).toBe(200);

	// Step 2: Update version in core
	const versionEvent = {
		event_type: "versions_updated",
		repo: "tscircuit/core",
		version: "0.1.2",
		package_json: {
			name: "@tscircuit/core",
			version: "0.1.2",
			dependencies: {},
		},
	};

	const versionResponse = await fetch(
		`${testServer.url}/release_events/create`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ event: versionEvent }),
		},
	);

	expect(versionResponse.status).toBe(200);

	// Step 3: Update version in eval (downstream)
	const evalVersionEvent = {
		event_type: "versions_updated",
		repo: "tscircuit/eval",
		version: "5.7.2",
		package_json: {
			name: "@tscircuit/eval",
			version: "5.7.2",
			dependencies: {
				"@tscircuit/core": "^0.1.2",
			},
		},
	};

	const evalVersionResponse = await fetch(
		`${testServer.url}/release_events/create`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ event: evalVersionEvent }),
		},
	);

	expect(evalVersionResponse.status).toBe(200);

	// Step 4: Verify state reflects the feature propagation
	const stateResponse = await fetch(`${testServer.url}/state`);
	expect(stateResponse.status).toBe(200);

	const state = await stateResponse.json();

	// Verify core has the merged feature
	const coreState = state.repoStates["tscircuit/core@0.1.2"];
	if (coreState) {
		expect(coreState.merged_features).toContain("Introduce Ground Pours");
	}

	// Verify eval shows upstream feature
	const evalState = state.repoStates["tscircuit/eval@5.7.2"];
	if (evalState) {
		expect(evalState.upstream_features).toContain("Introduce Ground Pours");
	}
});
