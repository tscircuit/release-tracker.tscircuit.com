import { eventHandler } from "h3";

import { getReleaseTrackerSnapshot } from "../utils/release-tracker";

function renderRepoOptions(repoNames: string[]): string {
  return repoNames
    .map((repo) => `<option value="${repo}">${repo}</option>`)
    .join("");
}

export default eventHandler(async () => {
  const state = await getReleaseTrackerSnapshot();
  const repoNames = Object.keys(state.repos);
  const serializedState = JSON.stringify(state);
  const repoOptions = renderRepoOptions(repoNames);

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>tscircuit Release Tracker</title>
      <style>
        :root {
          color-scheme: dark light;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #0d1117;
          color: #e6edf3;
        }

        body {
          margin: 0;
          padding: 2rem;
          min-height: 100vh;
          box-sizing: border-box;
        }

        h1 {
          margin-top: 0;
        }

        .layout {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 2rem;
          margin-bottom: 2rem;
        }

        form {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        label {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          font-weight: 600;
          font-size: 0.95rem;
        }

        input, select, textarea, button {
          font: inherit;
        }

        input, select, textarea {
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(13, 17, 23, 0.9);
          color: inherit;
        }

        textarea {
          min-height: 120px;
          resize: vertical;
        }

        button {
          padding: 0.6rem 0.9rem;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          background: #238636;
          color: #ffffff;
          font-weight: 600;
          transition: background 0.2s ease-in-out;
        }

        button:hover {
          background: #2ea043;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          overflow: hidden;
        }

        thead {
          background: rgba(255, 255, 255, 0.08);
        }

        th, td {
          padding: 0.85rem 1rem;
          text-align: left;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          vertical-align: top;
        }

        tbody tr:last-child td {
          border-bottom: none;
        }

        .muted {
          opacity: 0.7;
        }

        .status {
          margin-bottom: 1rem;
          min-height: 1.5rem;
        }

        @media (max-width: 768px) {
          body {
            padding: 1.25rem;
          }

          table {
            font-size: 0.9rem;
          }
        }
      </style>
    </head>
    <body>
      <h1>tscircuit Release Tracker</h1>
      <p class="muted">Simulate release pipeline events and inspect the tracker state.</p>
      <div class="status" id="status"></div>
      <div class="layout">
        <form id="feature-form">
          <h2>Feature merged</h2>
          <label>
            Repository
            <select name="repo" class="repo-select" required>
              ${repoOptions}
            </select>
          </label>
          <label>
            Feature name
            <input name="feature_name" placeholder="Add descriptive feature" required />
          </label>
          <button type="submit">Add feature merged event</button>
        </form>

        <form id="versions-form">
          <h2>Versions updated</h2>
          <label>
            Repository
            <select name="repo" class="repo-select" required>
              ${repoOptions}
            </select>
          </label>
          <label>
            Version
            <input name="version" placeholder="e.g. 1.2.3" required />
          </label>
          <label>
            Package.json (optional)
            <textarea name="package_json" placeholder="{\n  &quot;dependencies&quot;: {}\n}"></textarea>
          </label>
          <button type="submit">Add versions updated event</button>
        </form>
      </div>

      <section>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 0.75rem;">
          <h2 style="margin: 0;">Current release tracker state</h2>
          <button type="button" id="refresh">Refresh state</button>
        </div>
        <div style="overflow-x: auto;">
          <table>
            <thead>
              <tr>
                <th>Repo</th>
                <th>Version</th>
                <th>Merged features</th>
                <th>Queued features</th>
                <th>Upstream features</th>
              </tr>
            </thead>
            <tbody id="state-body"></tbody>
          </table>
        </div>
      </section>

      <script>
        const stateBody = document.getElementById("state-body");
        const statusEl = document.getElementById("status");
        let currentState = ${serializedState};

        function renderState(state) {
          currentState = state;
          stateBody.innerHTML = "";
          const repos = Object.entries(state.repos);
          for (const [repo, repoState] of repos) {
            const row = document.createElement("tr");
            const versionContent = repoState.version
              ? escapeHtml(String(repoState.version))
              : '<span class="muted">n/a</span>';
            const rowHtml =
              '<td><strong>' +
              escapeHtml(String(repo)) +
              '</strong></td>' +
              '<td>' +
              versionContent +
              '</td>' +
              '<td>' +
              formatFeatureList(repoState.merged_features) +
              '</td>' +
              '<td>' +
              formatFeatureList(repoState.queued_features) +
              '</td>' +
              '<td>' +
              formatFeatureList(repoState.upstream_features) +
              '</td>';
            row.innerHTML = rowHtml;
            stateBody.appendChild(row);
          }
        }

        function formatFeatureList(list) {
          if (!Array.isArray(list) || list.length === 0) {
            return '<span class="muted">—</span>';
          }
          return (
            '<ul style="margin: 0; padding-left: 1.25rem;">' +
            list
              .map((item) => '<li>' + escapeHtml(String(item)) + '</li>')
              .join("") +
            '</ul>'
          );
        }

        function escapeHtml(value) {
          return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
        }

        async function refreshState() {
          const response = await fetch("/api/state");
          if (!response.ok) {
            throw new Error("Failed to fetch state");
          }
          const json = await response.json();
          renderState(json);
        }

        function showStatus(message, type = "info") {
          const colors = {
            info: "#7d8590",
            success: "#2ea043",
            error: "#f85149",
          };
          statusEl.textContent = message;
          statusEl.style.color = colors[type] ?? colors.info;
        }

        async function submitEvent(payload) {
          const response = await fetch("/release_events/create", {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || "Failed to submit event");
          }

          const json = await response.json();
          renderState(json);
        }

        document.getElementById("feature-form").addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const formData = new FormData(form);
          const repo = formData.get("repo");
          const featureName = formData.get("feature_name");

          if (!repo || !featureName) {
            showStatus("Repository and feature name are required", "error");
            return;
          }

          try {
            await submitEvent({
              event_type: "feature_merged",
              repo,
              feature_name: featureName,
            });
            showStatus(
              "Recorded feature merged event for " + repo,
              "success",
            );
            form.reset();
          } catch (error) {
            console.error(error);
            showStatus(error.message ?? "Failed to submit feature merged event", "error");
          }
        });

        document.getElementById("versions-form").addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const formData = new FormData(form);
          const repo = formData.get("repo");
          const version = formData.get("version");
          const packageJsonInput = formData.get("package_json");

          if (!repo || !version) {
            showStatus("Repository and version are required", "error");
            return;
          }

          let packageJson = {};
          if (typeof packageJsonInput === "string" && packageJsonInput.trim().length > 0) {
            try {
              packageJson = JSON.parse(packageJsonInput);
            } catch (error) {
              console.error(error);
              showStatus("package.json must be valid JSON", "error");
              return;
            }
          }

          try {
            await submitEvent({
              event_type: "versions_updated",
              repo,
              version,
              package_json: packageJson,
            });
            showStatus(
              "Recorded versions updated event for " + repo + " (" + version + ")",
              "success",
            );
            form.reset();
          } catch (error) {
            console.error(error);
            showStatus(error.message ?? "Failed to submit versions updated event", "error");
          }
        });

        document.getElementById("refresh").addEventListener("click", async () => {
          try {
            await refreshState();
            showStatus("State refreshed", "info");
          } catch (error) {
            console.error(error);
            showStatus("Failed to refresh state", "error");
          }
        });

        renderState(currentState);
      </script>
    </body>
  </html>`;
});
