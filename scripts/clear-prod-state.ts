/**
 * Clear production state script
 * Clears all repoStates from the production deployment
 */

const PROD_URL = "https://release-tracker3.seve.workers.dev";

async function clearState(): Promise<boolean> {
	try {
		const response = await fetch(`${PROD_URL}/state/clear`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		});

		const data = await response.json();
		if (response.ok && data.success) {
			console.log("✅ State cleared successfully");
			return true;
		} else {
			console.error(
				`❌ Failed to clear state: ${data.message || response.statusText}`,
			);
			return false;
		}
	} catch (error) {
		console.error(`❌ Error clearing state:`, error);
		return false;
	}
}

async function main() {
	console.log("🧹 Clearing production state...\n");
	const success = await clearState();
	process.exit(success ? 0 : 1);
}

main();

