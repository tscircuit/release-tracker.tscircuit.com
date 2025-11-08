/**
 * Post-build script to fix __STATIC_CONTENT_MANIFEST import and export Durable Objects
 * Replaces the import with a virtual module that exports an empty object
 * Also exports StateStorage Durable Object from index.mjs
 */
const { readFileSync, writeFileSync } = require("fs");
const { globSync } = require("glob");

const files = globSync(".output/server/**/*.mjs");

for (const file of files) {
  let content = readFileSync(file, "utf-8");
  const original = content;

  // Replace the import statement with an empty object export
  // Handle both: import"__STATIC_CONTENT_MANIFEST"; and import e from"__STATIC_CONTENT_MANIFEST"
  content = content.replace(/import\s+(\w+)\s+from"__STATIC_CONTENT_MANIFEST"/g, 'const $1 = {}');
  content = content.replace(/import"__STATIC_CONTENT_MANIFEST";/g, 'const __STATIC_CONTENT_MANIFEST = {};');

  if (content !== original) {
    writeFileSync(file, content);
    console.log(`Fixed: ${file}`);
  }
}

// Export Durable Objects from index.mjs
const indexPath = ".output/server/index.mjs";
let indexContent = readFileSync(indexPath, "utf-8");

// Add StateStorage Durable Object export if not already present
if (!indexContent.includes("export { StateStorage }")) {
  // Read the StateStorage class from the source
  const durableObjectSource = readFileSync("server/durable-objects/StateStorage.ts", "utf-8");

  // Convert TypeScript to JavaScript (simple conversion for this case)
  let jsSource = durableObjectSource
    .replace(/import type .*?;/g, '') // Remove type imports
    .replace(/import .*? from .*?;/g, '') // Remove all imports
    .replace(/private /g, '') // Remove private keyword
    .replace(/\.get<\w+>/g, '.get') // Remove generic types from .get() calls
    .replace(/\.put<\w+>/g, '.put') // Remove generic types from .put() calls
    .replace(/: DurableObjectState/g, '') // Remove DurableObjectState type
    .replace(/: Record<string, unknown>/g, '') // Remove Record type
    .replace(/: StoredState/g, '') // Remove StoredState type
    .replace(/: Promise<\w+>/g, '') // Remove Promise types
    .replace(/: Promise<void>/g, '') // Remove Promise<void> type
    .replace(/: Request/g, '') // Remove Request type
    .replace(/: Response/g, '') // Remove Response type
    .replace(/: string/g, '') // Remove string type
    .replace(/: number/g, '') // Remove number type
    .replace(/\(await request\.json\(\)\) as StoredState/g, 'await request.json()') // Remove type cast
    .replace(/\{ success }/g, '{ success: true }') // Fix success object
    .replace(/\{ status }/g, '{ status: 405 }') // Fix status object
    .replace(/export class/g, 'class'); // Remove export temporarily

  const durableObjectCode = `

// Durable Object: StateStorage
${jsSource}

// Export Durable Objects for Cloudflare Workers
export { StateStorage };`;

  // Try to inject after __STATIC_CONTENT_MANIFEST (cloudflare-module-legacy)
  if (indexContent.includes('const __STATIC_CONTENT_MANIFEST = {};')) {
    indexContent = indexContent.replace(
      /const __STATIC_CONTENT_MANIFEST = \{\};/,
      `const __STATIC_CONTENT_MANIFEST = {};${durableObjectCode}`
    );
  } else {
    // For cloudflare-module preset, append to end of file before sourcemap comment
    indexContent = indexContent.replace(
      /(\/\/# sourceMappingURL=.*)/,
      `${durableObjectCode}\n$1`
    );
  }

  writeFileSync(indexPath, indexContent);
  console.log(`Added StateStorage Durable Object export to: ${indexPath}`);
}

