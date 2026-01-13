// popup/popup.js

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

    if (!tab.url.includes("leetcode.com/problems")) {
      throw new Error("Not a LeetCode problem page.");
    }

    // Attempt to ping the content script
    // We send 'GET_PROBLEM' as defined in content.js listener
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "GET_PROBLEM",
    });

    if (response && response.problemId) {
      statusDiv.innerHTML = `Connected!<br><span style="font-size:11px; opacity:0.8">${response.problemId}</span>`;
      statusDiv.classList.add("success");
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
      msg = "Agent not ready. Please refresh the LeetCode page.";
    } else if (err.message.includes("Not a LeetCode")) {
      msg = "Please open a LeetCode problem.";
    }
    statusDiv.textContent = msg;
    statusDiv.classList.add("error");
  } finally {
    btn.disabled = false;
  }
});
