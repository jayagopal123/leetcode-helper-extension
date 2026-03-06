// popup/popup.js

const SUPPORTED_PATTERNS = [
  "leetcode.com/problems",
  "geeksforgeeks.org/problems",
  "hackerrank.com/challenges",
  "codeforces.com/problemset/problem",
];

function isSupportedUrl(url) {
  return SUPPORTED_PATTERNS.some((pattern) => url.includes(pattern));
}

function mapStatus(status) {
  if (status === "READY") {
    return { className: "success", text: "Detected successfully" };
  }
  if (status === "CONTEXT_LOW_CONFIDENCE") {
    return { className: "error", text: "Detected with low confidence" };
  }
  if (status === "NOT_SUPPORTED_SITE") {
    return { className: "error", text: "Unsupported site" };
  }
  return { className: "error", text: "Detection failed" };
}

document.getElementById("openPanelBtn").addEventListener("click", async () => {
  const statusDiv = document.getElementById("status");
  const btn = document.getElementById("openPanelBtn");

  statusDiv.textContent = "Opening mentor panel...";
  statusDiv.className = "";
  btn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab || !tab.url || !isSupportedUrl(tab.url)) {
      throw new Error("Unsupported DSA problem page.");
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "OPEN_MENTOR_PANEL",
    });

    if (response && response.success) {
      statusDiv.textContent = "Mentor panel opened on the page.";
      statusDiv.classList.add("success");
    } else {
      throw new Error("Could not open mentor panel.");
    }
  } catch (err) {
    console.error(err);
    let msg = "Failed to open panel.";
    if (
      err.message.includes("does not exist") ||
      err.message.includes("Connection failed")
    ) {
      msg = "Panel agent not ready. Refresh the problem page and retry.";
    } else if (err.message.includes("Unsupported DSA")) {
      msg =
        "Open a supported problem page (LeetCode, GFG, HackerRank, Codeforces).";
    }
    statusDiv.textContent = msg;
    statusDiv.classList.add("error");
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("checkBtn").addEventListener("click", async () => {
  const statusDiv = document.getElementById("status");
  const btn = document.getElementById("checkBtn");

  statusDiv.textContent = "Connecting...";
  statusDiv.className = ""; // Reset classes
  btn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab || !tab.url || !isSupportedUrl(tab.url)) {
      throw new Error("Unsupported DSA problem page.");
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "ANALYZE_PAGE",
    });

    if (response && response.context) {
      const summary = mapStatus(response.status);
      const title = response.context.title || "Unknown";
      const platform = response.context.platform || "unknown";
      const confidence =
        typeof response.context.confidence === "number"
          ? `${Math.round(response.context.confidence * 100)}%`
          : "n/a";

      statusDiv.innerHTML = `${summary.text}<br><span style="font-size:11px; opacity:0.8">${platform}: ${title} (${confidence})</span>`;
      statusDiv.classList.add(summary.className);
    } else {
      throw new Error("No response from agent.");
    }
  } catch (err) {
    console.error(err);
    let msg = "Connection Failed.";
    if (
      err.message.includes("does not exist") ||
      err.message.includes("Connection failed")
    ) {
      msg = "Agent not ready. Refresh the problem page and retry.";
    } else if (err.message.includes("Unsupported DSA")) {
      msg =
        "Open a supported problem page (LeetCode, GFG, HackerRank, Codeforces).";
    }
    statusDiv.textContent = msg;
    statusDiv.classList.add("error");
  } finally {
    btn.disabled = false;
  }
});
