import { eventHandler, setHeader } from "h3";
import { getRepoTableView } from "../utils/release-tracker-storage";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default eventHandler(async (event) => {
  const view = await getRepoTableView();

  const repos = view
    .map(
      (row) =>
        `<option value="${escapeHtml(row.repo)}">${escapeHtml(row.repo)}</option>`,
    )
    .join("");

  const tableRows = view
    .map((row) => {
      const merged =
        row.merged_features.map((f) => `<li>${escapeHtml(f)}</li>`).join("") ||
        "<li><em>None</em></li>";
      const queued =
        row.queued_features.map((f) => `<li>${escapeHtml(f)}</li>`).join("") ||
        "<li><em>None</em></li>";
      const upstream =
        row.upstream_features
          .map((f) => `<li>${escapeHtml(f)}</li>`)
          .join("") || "<li><em>None</em></li>";
      return `<tr>
        <td>${escapeHtml(row.repo)}</td>
        <td>${escapeHtml(row.version ?? "-")}</td>
        <td><ul>${merged}</ul></td>
        <td><ul>${queued}</ul></td>
        <td><ul>${upstream}</ul></td>
      </tr>`;
    })
    .join("");

  const html = `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Release Tracker</title>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            margin: 2rem;
            background: #f4f7fb;
            color: #1f2933;
          }
          h1 {
            margin-bottom: 0.5rem;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
          }
          th, td {
            border-bottom: 1px solid #e2e8f0;
            padding: 1rem;
            vertical-align: top;
            text-align: left;
          }
          th {
            background: #0f172a;
            color: white;
            font-weight: 600;
            letter-spacing: 0.03em;
          }
          tr:last-child td {
            border-bottom: none;
          }
          ul {
            margin: 0;
            padding-left: 1.25rem;
          }
          section {
            margin-top: 2rem;
            display: grid;
            gap: 1.5rem;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          }
          form {
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
          }
          form h2 {
            margin-top: 0;
            font-size: 1.25rem;
          }
          label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
          }
          input[type="text"], textarea, select {
            width: 100%;
            padding: 0.5rem 0.75rem;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            font-size: 1rem;
            box-sizing: border-box;
          }
          textarea {
            min-height: 140px;
            font-family: ui-monospace, SFMono-Regular, SFMono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          }
          button {
            margin-top: 1rem;
            padding: 0.6rem 1.2rem;
            font-size: 1rem;
            border-radius: 8px;
            border: none;
            background: #2563eb;
            color: white;
            cursor: pointer;
            font-weight: 600;
            transition: background 0.2s ease;
          }
          button:hover {
            background: #1d4ed8;
          }
          .status {
            margin-top: 1rem;
            min-height: 1.5rem;
            font-weight: 600;
          }
          .status.error {
            color: #b91c1c;
          }
          .status.success {
            color: #047857;
          }
        </style>
      </head>
      <body>
        <header>
          <h1>Release Tracker</h1>
          <p>Track features as they move through the tscircuit release pipeline. All state is stored in a durable key-value cache.</p>
        </header>
        <table aria-label="Release tracker">
          <thead>
            <tr>
              <th>Repo</th>
              <th>Version</th>
              <th>Merged Features</th>
              <th>Queued Features</th>
              <th>Upstream Features</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <section>
          <form id="merge-feature-form" data-event-type="feature_merged">
            <h2>Simulate Feature Merge</h2>
            <label for="feature-merge-repo">Repository</label>
            <select id="feature-merge-repo" name="repo" required>${repos}</select>
            <label for="feature-name">Feature name</label>
            <input id="feature-name" name="feature_name" type="text" placeholder="Introduce Ground Pours" required />
            <button type="submit">Record Feature Merge</button>
            <div class="status" aria-live="polite"></div>
          </form>
          <form id="version-update-form" data-event-type="versions_updated">
            <h2>Simulate Version Update</h2>
            <label for="version-update-repo">Repository</label>
            <select id="version-update-repo" name="repo" required>${repos}</select>
            <label for="repo-version">Version</label>
            <input id="repo-version" name="version" type="text" placeholder="0.1.2" required />
            <label for="package-json">package.json (optional)</label>
            <textarea id="package-json" name="package_json" placeholder='{"dependencies": {"@tscircuit/core": "^0.1.2"}}'></textarea>
            <button type="submit">Record Version Update</button>
            <div class="status" aria-live="polite"></div>
          </form>
        </section>
        <script type="module">
          async function submitEvent(form) {
            const status = form.querySelector('.status');
            if (!status) return;
            status.textContent = '';
            status.classList.remove('error', 'success');
            const formData = new FormData(form);
            const eventType = form.dataset.eventType;
            const payload = { event_type: eventType };
            for (const [key, value] of formData.entries()) {
              if (key === 'package_json') {
                if (!value) {
                  continue;
                }
                try {
                  payload[key] = JSON.parse(value);
                } catch (error) {
                  status.textContent = 'package.json must be valid JSON';
                  status.classList.add('error');
                  return;
                }
              } else {
                payload[key] = value;
              }
            }

            try {
              const response = await fetch('/release_events/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                status.textContent = error?.message ?? 'Unable to record event';
                status.classList.add('error');
                return;
              }
              status.textContent = 'Event recorded';
              status.classList.add('success');
              setTimeout(() => {
                window.location.reload();
              }, 500);
            } catch (error) {
              status.textContent = 'Network error';
              status.classList.add('error');
            }
          }

          document.querySelectorAll('form[data-event-type]').forEach((form) => {
            form.addEventListener('submit', (event) => {
              event.preventDefault();
              void submitEvent(form);
            });
          });
        </script>
      </body>
    </html>`;

  setHeader(event, "Content-Type", "text/html; charset=utf-8");
  return html;
});
