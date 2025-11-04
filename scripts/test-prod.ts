/**
 * Test script for production deployment
 * Makes a series of event requests to test the release tracker API
 */

const PROD_URL = "https://release-tracker.tscircuit.com"

interface MergeFeatureEvent {
  event_type: "feature_merged"
  repo: string
  feature_name: string
}

interface UpdateVersionsEvent {
  event_type: "versions_updated"
  repo: string
  version: string
  package_json: {
    name: string
    version: string
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
}

type ReleaseEvent = MergeFeatureEvent | UpdateVersionsEvent

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function createEvent(event: ReleaseEvent): Promise<boolean> {
  try {
    const response = await fetch(`${PROD_URL}/release_events/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event }),
    })

    const data = await response.json()
    if (response.ok && data.success) {
      console.log(`✅ Created ${event.event_type} for ${event.repo}`)
      return true
    } else {
      console.error(
        `❌ Failed to create ${event.event_type} for ${event.repo}:`,
        data.message || response.statusText,
      )
      return false
    }
  } catch (error) {
    console.error(
      `❌ Error creating ${event.event_type} for ${event.repo}:`,
      error,
    )
    return false
  }
}

async function getState() {
  try {
    const response = await fetch(`${PROD_URL}/state`)
    if (response.ok) {
      const state = await response.json()
      console.log("\n📊 Current State:")
      console.log(`   Repos tracked: ${Object.keys(state.repoStates).length}`)
      console.log(`   Repo graph nodes: ${Object.keys(state.repoGraph).length}`)
      return state
    } else {
      console.error(`❌ Failed to get state: ${response.statusText}`)
      return null
    }
  } catch (error) {
    console.error(`❌ Error getting state:`, error)
    return null
  }
}

async function clearState(): Promise<boolean> {
  try {
    const response = await fetch(`${PROD_URL}/state/clear`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()
    if (response.ok && data.success) {
      console.log("✅ State cleared successfully\n")
      return true
    } else {
      console.error(
        `❌ Failed to clear state: ${data.message || response.statusText}`,
      )
      return false
    }
  } catch (error) {
    console.error(`❌ Error clearing state:`, error)
    return false
  }
}

async function runTests() {
  console.log("🚀 Starting production tests...\n")

  // Clear state before running tests
  console.log("🧹 Clearing existing state...")
  await clearState()
  await sleep(500)

  // Test 1: Merge features to core
  console.log("📝 Test 1: Merging features to tscircuit/core")
  await createEvent({
    event_type: "feature_merged",
    repo: "tscircuit/core",
    feature_name: "Introduce Ground Pours",
  })
  await sleep(500)

  await createEvent({
    event_type: "feature_merged",
    repo: "tscircuit/core",
    feature_name: "Introduce Ground Nets",
  })
  await sleep(500)

  // Test 2: Update version in core
  console.log("\n📝 Test 2: Updating version in tscircuit/core")
  await createEvent({
    event_type: "versions_updated",
    repo: "tscircuit/core",
    version: "0.1.2",
    package_json: {
      name: "@tscircuit/core",
      version: "0.1.2",
      dependencies: {},
    },
  })
  await sleep(500)

  // Test 3: Merge feature to eval
  console.log("\n📝 Test 3: Merging feature to tscircuit/eval")
  await createEvent({
    event_type: "feature_merged",
    repo: "tscircuit/eval",
    feature_name: "Support Ground Pours",
  })
  await sleep(500)

  // Test 4: Update version in eval (depends on core)
  console.log("\n📝 Test 4: Updating version in tscircuit/eval")
  await createEvent({
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
  })
  await sleep(500)

  // Test 5: Merge feature to runframe
  console.log("\n📝 Test 5: Merging feature to tscircuit/runframe")
  await createEvent({
    event_type: "feature_merged",
    repo: "tscircuit/runframe",
    feature_name: "Add 3D Viewer Integration",
  })
  await sleep(500)

  // Test 6: Update version in runframe (depends on eval)
  console.log("\n📝 Test 6: Updating version in tscircuit/runframe")
  await createEvent({
    event_type: "versions_updated",
    repo: "tscircuit/runframe",
    version: "2.3.1",
    package_json: {
      name: "@tscircuit/runframe",
      version: "2.3.1",
      dependencies: {
        "@tscircuit/eval": "^5.7.2",
      },
    },
  })
  await sleep(500)

  // Test 7: Update version in cli (depends on runframe)
  console.log("\n📝 Test 7: Updating version in tscircuit/cli")
  await createEvent({
    event_type: "versions_updated",
    repo: "tscircuit/cli",
    version: "1.5.0",
    package_json: {
      name: "@tscircuit/cli",
      version: "1.5.0",
      dependencies: {
        "@tscircuit/runframe": "^2.3.1",
      },
    },
  })
  await sleep(500)

  // Test 8: Update version in tscircuit (depends on cli)
  console.log("\n📝 Test 8: Updating version in tscircuit/tscircuit")
  await createEvent({
    event_type: "versions_updated",
    repo: "tscircuit/tscircuit",
    version: "3.2.1",
    package_json: {
      name: "@tscircuit/tscircuit",
      version: "3.2.1",
      dependencies: {
        "@tscircuit/cli": "^1.5.0",
      },
    },
  })
  await sleep(500)

  // Test 9: Get final state
  console.log("\n📝 Test 9: Getting final state")
  const finalState = await getState()

  if (finalState) {
    console.log("\n✅ Tests completed! Final state summary:")
    console.log("\n📦 Repo States:")
    for (const [key, state] of Object.entries(finalState.repoStates)) {
      const repoState = state as {
        merged_features: string[]
        queued_features: string[]
        upstream_features: string[]
      }
      console.log(`   ${key}:`)
      console.log(`     Merged: ${repoState.merged_features.length} features`)
      console.log(`     Queued: ${repoState.queued_features.length} features`)
      console.log(
        `     Upstream: ${repoState.upstream_features.length} features`,
      )
    }
  }

  console.log("\n🎉 All tests completed!")
}

// Run the tests
runTests().catch((error) => {
  console.error("💥 Test suite failed:", error)
  process.exit(1)
})
