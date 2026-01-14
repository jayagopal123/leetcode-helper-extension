# LeetCode Mentor (Chrome Extension)

One-line description: Injects a floating sidebar on LeetCode problem pages that can collect the current problem title, description and visible editor code, and forwards a user question to a background service which calls the Google Generative Language (Gemini) API.

---

## Problem statement

LeetCode users often want contextual hints about the problem they are solving without leaving the problem page. This extension provides an in-page assistant that can (when configured with an API key) send the current problem context and user question to the Gemini endpoint and show the returned text in a chat-like sidebar.

---

## Key features (implemented)

- Page detection: content script matches `https://leetcode.com/problems/*` and runs on those pages.
- Injected UI: a shadow-root based floating sidebar (`#lc-mentor-root`) is injected into the page; it contains a chat history, input textarea, settings pane and toggle button.
- Auto-inject on load: the content script runs at `document_idle` and injects the sidebar automatically when the page is loaded.
- Context extraction: the content script attempts to read the problem title, a problem description selector, and the Monaco editor code (by querying `.view-lines div.view-line`).
- Background API call: the sidebar sends a message to the background service worker (`CALL_GEMINI`) which issues an HTTP request to the Google Generative Language endpoint and returns the text candidate.
- Storage usage: the extension stores an API key via `chrome.storage.local` under `geminiApiKey`.
- Popup connectivity check: a popup (`popup.html`) is provided with a "Check Connection" button that pings the content script (`GET_PROBLEM`) to verify the agent is injected and reachable.

---

## How it works (implementation details)

- Detection & injection:

  - `manifest.json` registers `scripts/content.js` to run on `https://leetcode.com/problems/*` with `run_at: document_idle`.
  - The content script prevents double-injection using an element id guard (`lc-mentor-root`) and attaches a shadow DOM host to avoid CSS collisions.

- Content script responsibilities:

  - Render the sidebar UI (styles + markup are injected into the shadow root).
  - Extract page context via `getPageContext()` which reads: `document.title` (title), a best-effort problem description element, and editor code by selecting `.view-lines div.view-line` nodes.
  - Save/load an API key using `chrome.storage.local` and provide UI to persist the key.
  - Send messages to the background service worker using `chrome.runtime.sendMessage` to trigger the Gemini call.

- Background service worker responsibilities:

  - Listens for `CALL_GEMINI` messages and performs a `fetch` to `https://generativelanguage.googleapis.com/...` using the provided API key (the key is forwarded in the request URL).
  - Returns the first candidate text back to the content script which displays it in the sidebar.

- Popup behavior:
  - `popup.js` queries the active tab and sends a `GET_PROBLEM` message to the content script to verify the agent is injected and to display the problem id/title in the popup.

---

## Tech stack

- Chrome Manifest V3 extension (service worker background)
- Plain JavaScript (no framework)
- Uses `chrome.storage.local` for persistent data
- Uses `fetch` to call remote HTTP APIs

---

## Permissions & host access

- Declared permission: `storage` (used for saving the Gemini API key).
- Host permissions (in `manifest.json`):
  - `https://leetcode.com/*` — content script runs on problem pages and background may fetch resources.
  - `https://generativelanguage.googleapis.com/*` — background calls the Gemini endpoint.

---

## Security & privacy notes (conservative)

- The extension forwards problem text and visible editor code to the Gemini API endpoint when the user submits a query — this means code and problem context may leave the user's browser to an external API depending on configuration.
- The content script contains a pre-filled API key value in the settings UI for convenience; remove any hard-coded keys before publishing and store secrets securely.

---

## Installation (developer)

1. Open `chrome://extensions/` in Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `leetcode-extension` folder.

After installation, open a LeetCode problem page (`https://leetcode.com/problems/<slug>`) and the sidebar will be injected automatically. Use the Settings pane to provide a valid Gemini API key if you want to enable live hints.

---

## Troubleshooting

- If the popup reports "Agent not ready": refresh the LeetCode tab to allow the content script to re-inject.
- If you see `Could not read code lines` in the assistant, LeetCode's editor may be rendered in a canvas or the DOM selectors changed; the extension uses a best-effort selector `.view-lines div.view-line`.

---



