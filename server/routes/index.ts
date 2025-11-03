import { eventHandler } from "h3";

export default eventHandler(() => {
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Release Tracker</title>
      <style>
        :root {
          color-scheme: light dark;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background-color: #0b1620;
        }
        body {
          margin: 0;
          padding: 0;
          background: radial-gradient(circle at top, rgba(56, 189, 248, 0.2), transparent 60%), #0b1620;
          color: #f1f5f9;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        header {
          padding: 1.5rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(15, 23, 42, 0.8);
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
          backdrop-filter: blur(12px);
        }
        header h1 {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 600;
        }
        main {
          flex: 1;
          padding: 2rem;
          display: grid;
          gap: 2rem;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        }
        section {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 25px 45px rgba(15, 23, 42, 0.25);
          backdrop-filter: blur(14px);
        }
        h2 {
          margin-top: 0;
          font-size: 1.2rem;
          font-weight: 600;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
        }
        th,
        td {
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
          padding: 0.65rem 0.75rem;
          text-align: left;
          vertical-align: top;
        }
        th {
          font-weight: 600;
          font-size: 0.85rem;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: rgba(226, 232, 240, 0.85);
        }
        td {
          font-size: 0.95rem;
          color: rgba(226, 232, 240, 0.92);
        }
        td span {
          display: inline-block;
          background: rgba(96, 165, 250, 0.15);
          border: 1px solid rgba(96, 165, 250, 0.35);
          border-radius: 999px;
          padding: 0.25rem 0.65rem;
          margin: 0.15rem;
          font-size: 0.8rem;
        }
        form {
          display: grid;
          gap: 1rem;
          margin-top: 1rem;
        }
        label {
          display: flex;
          flex-direction: column;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: rgba(226, 232, 240, 0.7);
        }
        input,
        select,
        textarea {
          margin-top: 0.35rem;
          background: rgba(15, 23, 42, 0.65);
          border-radius: 0.75rem;
          border: 1px solid rgba(148, 163, 184, 0.25);
          padding: 0.65rem 0.85rem;
          color: #f8fafc;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        input:focus,
        select:focus,
        textarea:focus {
          border-color: rgba(56, 189, 248, 0.8);
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.25);
        }
        textarea {
          min-height: 90px;
          resize: vertical;
        }
        button {
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          border: none;
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.9), rgba(59, 130, 246, 0.9));
          color: #0f172a;
          font-weight: 600;
          letter-spacing: 0.03em;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.2s ease;
        }
        button:hover {
          transform: translateY(-1px);
          box-shadow: 0 15px 25px rgba(37, 99, 235, 0.25);
        }
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        .status {
          margin-top: 0.5rem;
          min-height: 1.25rem;
          font-size: 0.85rem;
          color: rgba(148, 163, 184, 0.8);
        }
        .dependency-options {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .dependency-options label {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.25);
          border-radius: 999px;
          padding: 0.35rem 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          text-transform: none;
          letter-spacing: normal;
        }
        .dependency-options input[type="checkbox"] {
          margin: 0;
        }
        @media (max-width: 768px) {
          main {
            grid-template-columns: 1fr;
            padding: 1.5rem;
          }
        }
      </style>
    </head>
    <body>
      <header>
        <h1>Release Tracker</h1>
        <button id="refresh-button" type="button">Refresh</button>
      </header>
      <main>
        <section>
          <h2>Pipeline Status</h2>
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
            <tbody id="repo-table-body"></tbody>
          </table>
        </section>
        <section>
          <h2>Simulate Events</h2>
          <form id="feature-form">
            <label>
              Repo
              <select id="feature-repo"></select>
            </label>
            <label>
              Feature Name
              <input id="feature-name" name="feature_name" placeholder="Introduce Ground Pours" />
            </label>
            <button type="submit">Record Feature Merge</button>
            <div class="status" id="feature-status"></div>
          </form>
          <form id="version-form">
            <label>
              Repo
              <select id="version-repo"></select>
            </label>
            <label>
              New Version
              <input id="version-value" name="version" placeholder="1.2.3" />
            </label>
            <label>
              Upstream Dependencies
              <div class="dependency-options" id="dependency-options"></div>
            </label>
            <button type="submit">Record Version Update</button>
            <div class="status" id="version-status"></div>
          </form>
        </section>
      </main>
      <script>
        const repoTableBody = document.getElementById("repo-table-body")
        const refreshButton = document.getElementById("refresh-button")
        const featureRepoSelect = document.getElementById("feature-repo")
        const versionRepoSelect = document.getElementById("version-repo")
        const dependencyOptions = document.getElementById("dependency-options")
        const featureStatus = document.getElementById("feature-status")
        const versionStatus = document.getElementById("version-status")
        const featureForm = document.getElementById("feature-form")
        const versionForm = document.getElementById("version-form")
        const featureNameInput = document.getElementById("feature-name")
        const versionInput = document.getElementById("version-value")

        let latestSummary = null

        async function fetchSummary() {
          const response = await fetch("/api/release-state")
          if (!response.ok) {
            throw new Error("Failed to load release state")
          }
          const summary = await response.json()
          latestSummary = summary
          renderRepos(summary.repoSummaries)
          populateRepoSelections(summary.repoSummaries)
          updateDependencyOptions()
        }

        function renderRepos(repos) {
          repoTableBody.innerHTML = ""
          for (const repo of repos) {
            const row = document.createElement("tr")
            row.innerHTML =
              "<td>" +
              repo.repo +
              "</td>" +
              "<td>" +
              repo.version +
              "</td>" +
              "<td>" +
              renderFeatureBadges(repo.merged_features) +
              "</td>" +
              "<td>" +
              renderFeatureBadges(repo.queued_features) +
              "</td>" +
              "<td>" +
              renderFeatureBadges(repo.upstream_features) +
              "</td>"
            repoTableBody.appendChild(row)
          }
        }

        function renderFeatureBadges(features) {
          if (!features.length) {
            return '<span style="opacity:0.5">—</span>'
          }
          return features.map((feature) => "<span>" + feature + "</span>").join("")
        }

        function populateRepoSelections(repoSummaries) {
          const repoNames = repoSummaries.map((repo) => repo.repo)
          featureRepoSelect.innerHTML = repoNames
            .map((name) => '<option value="' + name + '">' + name + "</option>")
            .join("")
          const previousSelection = versionRepoSelect.value
          versionRepoSelect.innerHTML = featureRepoSelect.innerHTML
          if (previousSelection && repoNames.includes(previousSelection)) {
            versionRepoSelect.value = previousSelection
          }
        }

        function updateDependencyOptions() {
          if (!latestSummary) return
          const selectedRepo = versionRepoSelect.value
          const graphEntry = latestSummary.repoGraph[selectedRepo] || { upstream: [] }
          const upstreamRepos = graphEntry.upstream || []
          dependencyOptions.innerHTML = ""
          if (!upstreamRepos.length) {
            dependencyOptions.innerHTML = '<span style="opacity:0.6">No upstream dependencies</span>'
            return
          }
          for (const repo of upstreamRepos) {
            const option = document.createElement("label")
            option.innerHTML =
              '<input type="checkbox" value="' +
              repo +
              '" checked />' +
              '<span>' +
              repo +
              "</span>"
            dependencyOptions.appendChild(option)
          }
        }

        refreshButton.addEventListener("click", () => {
          fetchSummary().catch((error) => {
            console.error(error)
            alert("Unable to refresh release state. Check the server logs.")
          })
        })

        versionRepoSelect.addEventListener("change", updateDependencyOptions)

        featureForm.addEventListener("submit", async (event) => {
          event.preventDefault()
          featureStatus.textContent = "Recording event..."
          const repo = featureRepoSelect.value
          const featureName = featureNameInput.value.trim()
          if (!repo || !featureName) {
            featureStatus.textContent = "Please select a repo and enter a feature name."
            return
          }

          try {
            await sendEvent({
              event_type: "feature_merged",
              repo,
              feature_name: featureName,
            })
            featureStatus.textContent =
              'Feature "' + featureName + '" merged into ' + repo + "."
            featureNameInput.value = ""
            await fetchSummary()
          } catch (error) {
            console.error(error)
            featureStatus.textContent = "Failed to record feature merge."
          }
        })

        versionForm.addEventListener("submit", async (event) => {
          event.preventDefault()
          versionStatus.textContent = "Recording event..."
          const repo = versionRepoSelect.value
          const version = versionInput.value.trim()
          if (!repo || !version) {
            versionStatus.textContent = "Please select a repo and provide the new version."
            return
          }
          const selectedDeps = Array.from(
            dependencyOptions.querySelectorAll('input[type="checkbox"]:checked'),
          ).map((input) => input.value)

          const packageJson = selectedDeps.length
            ? {
                dependencies: Object.fromEntries(
                  selectedDeps.map((dep) => ['@tscircuit/' + dep, "workspace:*"])
                ),
              }
            : {}

          try {
            await sendEvent({
              event_type: "versions_updated",
              repo,
              version,
              package_json: packageJson,
            })
            versionStatus.textContent = repo + " updated to version " + version + "."
            versionInput.value = ""
            await fetchSummary()
          } catch (error) {
            console.error(error)
            versionStatus.textContent = "Failed to record version update."
          }
        })

        async function sendEvent(payload) {
          const response = await fetch("/release_events/create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          })
          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(errorText || "Failed to apply event")
          }
          return response.json()
        }

        fetchSummary().catch((error) => {
          console.error(error)
          featureStatus.textContent = "Unable to load release state."
          versionStatus.textContent = "Unable to load release state."
        })
      </script>
    </body>
  </html>`;
});
