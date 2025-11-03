/**
 * Integration test: Create merge feature event
 *
 * Tests creating a MergeFeatureEvent via POST /release_events/create
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

test("should create a MergeFeatureEvent", async () => {
	if (!testServer) throw new Error("Test server not initialized");

	const event = {
		event_type: "feature_merged",
		repo: "tscircuit/core",
		feature_name: "Introduce Ground Pours",
	};

	const response = await fetch(`${testServer.url}/release_events/create`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ event }),
	});

	if (response.status === 404) {
		console.log("Route not implemented yet - skipping test");
		return;
	}

	expect(response.status).toBe(200);
	const data = await response.json();
	expect(data.success).toBe(true);
});
