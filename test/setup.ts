/**
 * Test setup utility for integration tests
 * Starts a full Nitro server for testing
 */

import { spawn } from "node:child_process";
import { resolve } from "pathe";

const rootDir = resolve(import.meta.dir, "..");

/**
 * Setup a test Nitro server
 */
export async function setupTestServer() {
	// Spawn nitro dev server
	const server = spawn("bun", ["run", "dev"], {
		cwd: rootDir,
		stdio: "pipe",
		env: {
			...process.env,
			PORT: "3001", // Use a different port for tests
		},
	});

	// Wait for server to be ready
	let serverUrl = "http://localhost:3001";

	server.stdout?.on("data", (data) => {
		const output = data.toString();
		if (output.includes("localhost") || output.includes("http://")) {
			// Extract URL from output if available
			const urlMatch = output.match(/http:\/\/[^\s]+/);
			if (urlMatch) {
				serverUrl = urlMatch[0];
			}
		}
	});

	// Wait a bit for server to start
	await new Promise((resolve) => setTimeout(resolve, 3000));

	return {
		url: serverUrl,
		close: async () => {
			server.kill();
			await new Promise((resolve) => setTimeout(resolve, 500));
		},
	};
}
