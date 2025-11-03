/**
 * Post-build script to fix __STATIC_CONTENT_MANIFEST import
 * Replaces the import with a virtual module that exports an empty object
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

