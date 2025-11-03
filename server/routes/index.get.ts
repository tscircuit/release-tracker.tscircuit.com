import { defineEventHandler } from "h3";
import { DEFAULT_REPO_ORDER } from "../utils/releaseTracker";

export default defineEventHandler(() => {
  const orderedRepos = JSON.stringify(DEFAULT_REPO_ORDER);
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>tscircuit Release Tracker</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background-color: #0f172a;
        color: #e2e8f0;
      }

      body {
        margin: 0;
        padding: 0;
        background: linear-gradient(160deg, #020617, #0f172a 60%, #1e293b);
        min-height: 100vh;
        display: flex;
        align-items: stretch;
        justify-content: center;
      }

      main {
        width: min(1100px, 92vw);
        margin: 48px auto;
        padding: 32px;
        background: rgba(15, 23, 42, 0.85);
        border-radius: 18px;
        border: 1px solid rgba(148, 163, 184, 0.2);
        box-shadow: 0 30px 80px rgba(15, 23, 42, 0.45);
        backdrop-filter: blur(10px);
      }

      h1 {
        font-size: 2.5rem;
        margin-bottom: 0.75rem;
        color: #f8fafc;
        letter-spacing: -0.03em;
      }

      p.lead {
        margin-top: 0;
        margin-bottom: 1.75rem;
        color: #cbd5f5;
        max-width: 680px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        border-radius: 12px;
        overflow: hidden;
        margin-bottom: 2rem;
        background: rgba(15, 23, 42, 0.9);
      }

      thead {
        background: rgba(59, 130, 246, 0.12);
      }

      th,
      td {
        padding: 14px 16px;
        text-align: left;
        border-bottom: 1px solid rgba(148, 163, 184, 0.12);
      }

      th {
        text-transform: uppercase;
        font-size: 0.75rem;
        letter-spacing: 0.12em;
        color: #93c5fd;
      }

      tbody tr:last-child td {
        border-bottom: none;
      }

      tbody tr:hover {
        background: rgba(59, 130, 246, 0.08);
      }

      .feature-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .feature-pill {
        padding: 4px 8px;
        border-radius: 999px;
        background: rgba(96, 165, 250, 0.2);
        color: #bfdbfe;
        font-size: 0.75rem;
      }

      section.simulator {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 24px;
      }

      form {
        background: rgba(15, 23, 42, 0.9);
        border-radius: 14px;
        border: 1px solid rgba(148, 163, 184, 0.18);
        padding: 18px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      form h2 {
        margin: 0 0 4px;
        font-size: 1.2rem;
        color: #f1f5f9;
      }

      label {
        font-size: 0.85rem;
        color: #cbd5f5;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      input,
      select,
      textarea,
      button {
        border-radius: 10px;
        border: 1px solid rgba(148, 163, 184, 0.3);
        background: rgba(15, 23, 42, 0.95);
        color: #e2e8f0;
        padding: 10px 12px;
        font-size: 0.95rem;
        font-family: inherit;
      }

      textarea {
        min-height: 120px;
      }

      button {
        cursor: pointer;
        border: none;
        background: linear-gradient(120deg, #38bdf8, #6366f1);
        color: white;
        font-weight: 600;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }

      button:hover {
        transform: translateY(-1px);
        box-shadow: 0 12px 24px rgba(99, 102, 241, 0.35);
      }

      .status {
        font-size: 0.85rem;
        color: #67e8f9;
        min-height: 1.1rem;
      }

      .error {
        color: #fca5a5;
      }

      @media (max-width: 720px) {
        main {
          padding: 22px;
        }

        table {
          display: block;
          overflow-x: auto;
        }

        th,
        td {
          white-space: nowrap;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <h1>tscircuit Release Tracker</h1>
      <p class="lead">Keep track of feature propagation across the release pipeline and quickly simulate release events.</p>

      <section>
        <table>
          <thead>
            <tr>
              <th>Repo</th>
              <th>Version</th>
              <th>Merged Features</th>
              <th>Queued Features</th>
              <th>Upstream Features</th>
            </tr>
          </thead>
          <tbody id="state-table-body"></tbody>
        </table>
        <div class="status" id="status"></div>
      </section>

      <section class="simulator">
        <form id="merge-form">
          <h2>Feature merged</h2>
          <label>
            Repository
            <select name="repo" id="merge-repo"></select>
          </label>
          <label>
            Feature name
            <input type="text" name="feature" placeholder="Describe the feature" required />
          </label>
          <button type="submit">Add feature event</button>
        </form>

        <form id="version-form">
          <h2>Version updated</h2>
          <label>
            Repository
            <select name="repo" id="version-repo"></select>
          </label>
          <label>
            Version
            <input type="text" name="version" placeholder="e.g. 1.2.3" required />
          </label>
          <label>
            package.json snippet
            <textarea name="package_json" spellcheck="false">{\n  "dependencies": {}\n}</textarea>
          </label>
          <button type="submit">Record version update</button>
        </form>
      </section>
    </main>
    <script>
      const orderedRepos = ${orderedRepos};
      const stateTableBody = document.getElementById("state-table-body");
      const mergeRepoSelect = document.getElementById("merge-repo");
      const versionRepoSelect = document.getElementById("version-repo");
      const statusMessage = document.getElementById("status");

      function buildFeaturePills(features) {
        if (!features || features.length === 0) {
          return '<span style="color:#64748b">—</span>';
        }
        return \`<div class="feature-list">\${features
          .map((feature) => \`<span class="feature-pill">\${feature}</span>\`)
          .join("")}</div>\`;
      }

      function renderState(state) {
        const repoStates = state.repoStates || {};
        const rows = orderedRepos.map((repo) => {
          const repoState = repoStates[repo] || {
            version: null,
            merged_features: [],
            queued_features: [],
            upstream_features: [],
          };
          const versionText = repoState.version ?? "—";
          return \`<tr>
            <td>\${repo}</td>
            <td>\${versionText}</td>
            <td>\${buildFeaturePills(repoState.merged_features)}</td>
            <td>\${buildFeaturePills(repoState.queued_features)}</td>
            <td>\${buildFeaturePills(repoState.upstream_features)}</td>
          </tr>\`;
        });
        stateTableBody.innerHTML = rows.join("");
      }

      async function fetchState() {
        const response = await fetch("/api/state");
        if (!response.ok) {
          throw new Error("Unable to fetch state");
        }
        return response.json();
      }

      function setStatus(message, isError = false) {
        statusMessage.textContent = message;
        statusMessage.classList.toggle("error", isError);
        if (message) {
          setTimeout(() => {
            statusMessage.textContent = "";
            statusMessage.classList.remove("error");
          }, 2500);
        }
      }

      async function refreshState() {
        try {
          const state = await fetchState();
          renderState(state);
        } catch (error) {
          setStatus(error.message || "Failed to refresh state", true);
        }
      }

      function populateRepoSelect(select) {
        select.innerHTML = orderedRepos
          .map((repo) => "<option value=\"" + repo + "\">" + repo + "</option>")
          .join("");
      }

      async function postEvent(eventPayload) {
        const response = await fetch("/release_events/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventPayload),
        });
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to record event");
        }
        const json = await response.json();
        renderState(json.state);
        return json;
      }

      document.getElementById("merge-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.target;
        const repo = form.repo.value;
        const feature = form.feature.value.trim();
        if (!feature) {
          setStatus("Enter a feature name", true);
          return;
        }
        try {
          await postEvent({ event_type: "feature_merged", repo, feature_name: feature });
          form.feature.value = "";
          setStatus('Feature "' + feature + '" recorded for ' + repo);
        } catch (error) {
          setStatus(error.message || "Failed to submit event", true);
        }
      });

      document.getElementById("version-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.target;
        const repo = form.repo.value;
        const version = form.version.value.trim();
        let packageJson;
        try {
          packageJson = JSON.parse(form.package_json.value || "{}");
        } catch (error) {
          setStatus("package.json must be valid JSON", true);
          return;
        }
        if (!version) {
          setStatus("Enter a version", true);
          return;
        }
        try {
          await postEvent({
            event_type: "versions_updated",
            repo,
            version,
            package_json: packageJson,
          });
          setStatus(repo + ' updated to ' + version);
        } catch (error) {
          setStatus(error.message || "Failed to submit event", true);
        }
      });

      populateRepoSelect(mergeRepoSelect);
      populateRepoSelect(versionRepoSelect);
      refreshState();
    </script>
  </body>
</html>`;
});
