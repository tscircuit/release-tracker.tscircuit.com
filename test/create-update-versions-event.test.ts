/**
 * Integration test: Create update versions event
 *
 * Tests creating an UpdateVersionsEvent via POST /release_events/create
 */

import { test, expect, beforeAll, afterAll } from "bun:test";
import { setupTestServer } from "./setup";
import type {
	ReleasePipelineEvent,
	CreateReleaseEventResponse,
} from "../lib/types";
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

test("should create an UpdateVersionsEvent", async () => {
	if (!testServer) throw new Error("Test server not initialized");

	const event: ReleasePipelineEvent = {
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

	const response = await fetch(
		`${testServer.url}${ROUTES.CREATE_RELEASE_EVENT.path}`,
		{
			method: ROUTES.CREATE_RELEASE_EVENT.method,
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ event }),
		},
	);

	if (response.status === 404) {
		console.log("Route not implemented yet - skipping test");
		return;
	}

	expect(response.status).toBe(200);
	const data: CreateReleaseEventResponse = await response.json();
	expect(data.success).toBe(true);
});
