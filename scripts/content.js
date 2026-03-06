// scripts/content.js

if (document.getElementById("lc-mentor-root")) {
  console.log("DSA Mentor: Already injected.");
} else {
  injectSidebar();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "OPEN_MENTOR_PANEL") {
    const result = ensureMentorPanelVisible();
    sendResponse({ success: result.success, message: result.message });
    return true;
  }

  if (request.type === "GET_PROBLEM" || request.type === "ANALYZE_PAGE") {
    const context = getPageContext();
    sendResponse({
      status: context.status,
      problemId: context.title,
      context,
    });
    return true;
  }
  return false;
});

function ensureMentorPanelVisible() {
  let host = document.getElementById("lc-mentor-root");
  if (!host) {
    injectSidebar();
    host = document.getElementById("lc-mentor-root");
  }

  if (!host || !host.shadowRoot) {
    return { success: false, message: "Panel root unavailable." };
  }

  const sidebar = host.shadowRoot.getElementById("sidebar");
  const toggleBtn = host.shadowRoot.getElementById("toggle-btn");

  if (sidebar) {
    sidebar.classList.remove("minimized");
  }
  if (toggleBtn) {
    toggleBtn.textContent = "X";
  }

  return { success: true, message: "Panel is visible." };
}

function injectSidebar() {
  const host = document.createElement("div");
  host.id = "lc-mentor-root";
  host.style.position = "fixed";
  host.style.top = "0";
  host.style.right = "0";
  host.style.zIndex = "2147483647";
  host.style.height = "100vh";
  host.style.width = "0";

  const shadow = host.attachShadow({ mode: "open" });

  const styleSheet = `
    <style>
      :host { font-family: "Segoe UI", system-ui, sans-serif; }

      .sidebar {
        position: fixed;
        right: 0;
        top: 0;
        width: min(400px, 92vw);
        height: 100vh;
        background: rgba(26, 26, 26, 0.95);
        backdrop-filter: blur(10px);
        color: #e0e0e0;
        box-shadow: -4px 0 20px rgba(0,0,0,0.6);
        border-left: 1px solid #333;
        display: flex;
        flex-direction: column;
        transition: transform 0.3s ease;
      }

      /* Keep a slim tab visible so the user can reopen the panel. */
      .sidebar.minimized { transform: translateX(calc(100% - 40px)); }

      .toggle-btn {
        position: absolute;
        left: -40px;
        top: 20px;
        width: 40px;
        height: 40px;
        background: #0078d4;
        border: none;
        border-radius: 8px 0 0 8px;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      }

      .header {
        padding: 16px;
        background: rgba(38, 38, 38, 0.9);
        border-bottom: 1px solid #333;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .header h2 { margin: 0; font-size: 16px; font-weight: 600; color: #fff; }

      .icon-btn {
        background: none;
        border: none;
        color: #aaa;
        cursor: pointer;
        font-size: 16px;
        padding: 4px;
      }
      .icon-btn:hover { color: #fff; }

      .content {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .chat-message {
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        line-height: 1.5;
        word-wrap: break-word;
        white-space: pre-wrap;
      }
      .message-bot { background: #333; align-self: flex-start; border-bottom-left-radius: 0; }
      .message-user { background: #0078d4; color: #fff; align-self: flex-end; border-bottom-right-radius: 0; }
      .message-system { background: #2d2d2d; color: #bcbcbc; font-size: 12px; align-self: center; border: 1px dashed #444; }

      .settings-pane {
        padding: 16px;
        background: #222;
        border-bottom: 1px solid #333;
        display: none;
        flex-direction: column;
        gap: 10px;
      }
      .settings-pane.visible { display: flex; }
      .settings-label { font-size: 12px; color: #aaa; }
      .api-input {
        width: 100%;
        padding: 8px;
        background: #111;
        border: 1px solid #444;
        color: #fff;
        border-radius: 4px;
        box-sizing: border-box;
      }

      .input-area {
        padding: 16px;
        background: rgba(38, 38, 38, 0.9);
        border-top: 1px solid #333;
      }

      .row {
        display: grid;
        grid-template-columns: 1fr;
        gap: 8px;
      }

      .mode-select {
        width: 100%;
        padding: 8px;
        background: #333;
        border: 1px solid #444;
        border-radius: 6px;
        color: #fff;
      }

      textarea {
        width: 100%;
        height: 70px;
        background: #333;
        border: 1px solid #444;
        border-radius: 6px;
        color: #fff;
        padding: 10px;
        font-family: inherit;
        resize: none;
        box-sizing: border-box;
      }
      textarea:focus { outline: none; border-color: #0078d4; }

      .main-btn {
        margin-top: 10px;
        width: 100%;
        padding: 10px;
        background: #0078d4;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
      }
      .main-btn:hover { background: #0063b1; }
      .main-btn:disabled { background: #444; cursor: not-allowed; opacity: 0.7; }
    </style>
  `;

  const htmlContent = `
    <div class="sidebar" id="sidebar">
      <button class="toggle-btn" id="toggle-btn" title="Toggle Sidebar">X</button>

      <div class="header">
        <h2>DSA Mentor</h2>
        <div style="display:flex; gap: 8px;">
          <button id="clear-chat" class="icon-btn" title="Clear Chat">CLR</button>
          <button id="settings-toggle" class="icon-btn" title="Settings">SET</button>
        </div>
      </div>

      <div id="settings-pane" class="settings-pane">
        <label class="settings-label">Gemini API Key</label>
        <input type="password" id="api-key-input" class="api-input" placeholder="Enter Google Gemini API Key" />
        <button id="save-key-btn" class="main-btn">Save Key</button>
      </div>

      <div class="content" id="chat-history">
        <div class="chat-message message-bot">I can detect the current DSA problem from this page. Ask for a hint to get started.</div>
      </div>

      <div class="input-area">
        <div class="row">
          <select id="mode-select" class="mode-select">
            <option value="hint">Hint (default)</option>
            <option value="approach">Approach</option>
            <option value="pseudocode">Pseudocode</option>
            <option value="full_solution">Full Solution</option>
          </select>
          <textarea id="user-input" placeholder="Type your question... (Ctrl+Enter to send)"></textarea>
        </div>
        <button id="ask-btn" class="main-btn">Ask Mentor</button>
      </div>
    </div>
  `;

  shadow.innerHTML = styleSheet + htmlContent;

  const sidebar = shadow.getElementById("sidebar");
  const toggleBtn = shadow.getElementById("toggle-btn");
  const settingsToggle = shadow.getElementById("settings-toggle");
  const clearChatBtn = shadow.getElementById("clear-chat");
  const settingsPane = shadow.getElementById("settings-pane");
  const apiKeyInput = shadow.getElementById("api-key-input");
  const saveKeyBtn = shadow.getElementById("save-key-btn");
  const askBtn = shadow.getElementById("ask-btn");
  const userInput = shadow.getElementById("user-input");
  const chatHistory = shadow.getElementById("chat-history");
  const modeSelect = shadow.getElementById("mode-select");

  let isMinimized = false;

  chrome.storage.local.get(["geminiApiKey"], (result) => {
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
    } else {
      settingsPane.classList.add("visible");
      appendMessage(
        chatHistory,
        "Set your Gemini API key in settings to start.",
        "system",
      );
    }
  });

  toggleBtn.addEventListener("click", () => {
    isMinimized = !isMinimized;
    sidebar.classList.toggle("minimized");
    toggleBtn.textContent = isMinimized ? "AI" : "X";
  });

  settingsToggle.addEventListener("click", () =>
    settingsPane.classList.toggle("visible"),
  );

  clearChatBtn.addEventListener("click", () => {
    chatHistory.innerHTML =
      '<div class="chat-message message-bot">Chat cleared. Ask for a hint when ready.</div>';
  });

  saveKeyBtn.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
      appendMessage(chatHistory, "API key cannot be empty.", "system");
      return;
    }
    chrome.storage.local.set({ geminiApiKey: key }, () => {
      appendMessage(chatHistory, "API key saved.", "system");
      settingsPane.classList.remove("visible");
    });
  });

  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.ctrlKey) {
      askBtn.click();
    }
  });

  askBtn.addEventListener("click", async () => {
    const question = userInput.value.trim();
    const mode = modeSelect.value;
    if (!question) {
      return;
    }

    appendMessage(chatHistory, question, "user");
    userInput.value = "";
    askBtn.disabled = true;
    askBtn.textContent = "Thinking...";

    try {
      const storage = await chrome.storage.local.get(["geminiApiKey"]);
      const apiKey = storage.geminiApiKey;
      if (!apiKey) {
        throw new Error("Please set Gemini API key in settings.");
      }

      const context = getPageContext();
      if (context.status !== "READY") {
        appendMessage(
          chatHistory,
          `Context quality is ${context.status}. I will still try with available text.`,
          "system",
        );
      }

      const response = await chrome.runtime.sendMessage({
        type: "CALL_GEMINI",
        payload: {
          apiKey,
          mode,
          context,
          query: question,
        },
      });

      if (response && response.success) {
        appendMessage(chatHistory, response.data, "bot");
      } else {
        throw new Error(
          response && response.error
            ? response.error
            : "Unknown error from AI service.",
        );
      }
    } catch (error) {
      appendMessage(chatHistory, `Error: ${error.message}`, "system");
    } finally {
      askBtn.disabled = false;
      askBtn.textContent = "Ask Mentor";
    }
  });

  document.body.appendChild(host);
}

function appendMessage(container, text, type) {
  const div = document.createElement("div");
  div.classList.add("chat-message");
  if (type === "user") {
    div.classList.add("message-user");
  } else if (type === "bot") {
    div.classList.add("message-bot");
  } else {
    div.classList.add("message-system");
  }

  const formatted = text
    .replace(
      /```([\s\S]*?)```/g,
      '<pre style="background:#111; padding:8px; border-radius:4px; overflow-x:auto;"><code>$1</code></pre>',
    )
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  div.innerHTML = formatted;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function getPageContext() {
  const platform = detectPlatform(window.location.href);
  if (platform === "unknown") {
    return {
      status: "NOT_SUPPORTED_SITE",
      platform,
      title: "Unknown problem",
      description: "This site is not supported yet.",
      userCode: "",
      confidence: 0,
      url: window.location.href,
      detectedAt: new Date().toISOString(),
    };
  }

  const extractor = getExtractor(platform);
  const extracted = extractor();
  const userCode = extractUserCode();

  const context = {
    status: "READY",
    platform,
    slug: extracted.slug || slugFromUrl(),
    title: extracted.title || titleFromDocument(),
    difficulty: extracted.difficulty || "Unknown",
    description: extracted.description || "",
    constraints: extracted.constraints || "",
    examples: extracted.examples || "",
    starterCode: extracted.starterCode || "",
    userCode,
    confidence: 0,
    url: window.location.href,
    detectedAt: new Date().toISOString(),
  };

  context.confidence = calculateConfidence(context);
  context.status =
    context.confidence >= 0.7 ? "READY" : "CONTEXT_LOW_CONFIDENCE";

  if (!context.description && !context.title) {
    context.status = "EXTRACTION_FAILED";
  }

  return context;
}

function detectPlatform(url) {
  const lower = url.toLowerCase();
  if (lower.includes("leetcode.com/problems/")) {
    return "leetcode";
  }
  if (lower.includes("geeksforgeeks.org/problems/")) {
    return "geeksforgeeks";
  }
  if (lower.includes("hackerrank.com/challenges/")) {
    return "hackerrank";
  }
  if (lower.includes("codeforces.com/problemset/problem/")) {
    return "codeforces";
  }
  return "unknown";
}

function getExtractor(platform) {
  if (platform === "leetcode") {
    return extractLeetCode;
  }
  if (platform === "geeksforgeeks") {
    return extractGeeksForGeeks;
  }
  if (platform === "hackerrank") {
    return extractHackerRank;
  }
  if (platform === "codeforces") {
    return extractCodeforces;
  }
  return () => ({ title: titleFromDocument(), description: "" });
}

function extractLeetCode() {
  const titleEl = document.querySelector(
    '[data-cy="question-title"], div.text-title-large a, div.text-title-large',
  );
  const descEl =
    document.querySelector('[data-track-load="description_content"]') ||
    document.querySelector(".elfjS") ||
    document.querySelector('div[class*="description"]');
  const difficultyEl =
    document.querySelector(
      '[diff], [data-difficulty], div[class*="text-difficulty"]',
    ) ||
    Array.from(document.querySelectorAll("div,span")).find((el) => {
      const text = (el.textContent || "").trim();
      return text === "Easy" || text === "Medium" || text === "Hard";
    });

  return {
    title: normalizeText(titleEl ? titleEl.textContent : titleFromDocument()),
    description: normalizeText(descEl ? descEl.innerText : ""),
    difficulty: normalizeText(
      difficultyEl ? difficultyEl.textContent : "Unknown",
    ),
    slug: slugFromUrl(),
  };
}

function extractGeeksForGeeks() {
  const titleEl = document.querySelector("h1");
  const descEl =
    document.querySelector('div[class*="problem-statement"]') ||
    document.querySelector('div[class*="problems_problem_content"]') ||
    document.querySelector("article");
  const difficultyEl = Array.from(document.querySelectorAll("span,div")).find(
    (el) => {
      const text = (el.textContent || "").trim();
      return (
        text.includes("Difficulty") ||
        text === "Easy" ||
        text === "Medium" ||
        text === "Hard"
      );
    },
  );

  return {
    title: normalizeText(titleEl ? titleEl.textContent : titleFromDocument()),
    description: normalizeText(descEl ? descEl.innerText : ""),
    difficulty: normalizeText(
      difficultyEl ? difficultyEl.textContent : "Unknown",
    ),
    slug: slugFromUrl(),
  };
}

function extractHackerRank() {
  const titleEl = document.querySelector('h1[class*="challenge"], h1');
  const descEl =
    document.querySelector("div.challenge_problem_statement") ||
    document.querySelector('div[class*="challenge-body-html"]') ||
    document.querySelector("article");

  return {
    title: normalizeText(titleEl ? titleEl.textContent : titleFromDocument()),
    description: normalizeText(descEl ? descEl.innerText : ""),
    difficulty: "Unknown",
    slug: slugFromUrl(),
  };
}

function extractCodeforces() {
  const titleEl =
    document.querySelector(".problem-statement .title") ||
    document.querySelector(".title");
  const descEl =
    document.querySelector(".problem-statement") ||
    document.querySelector("article");

  return {
    title: normalizeText(titleEl ? titleEl.textContent : titleFromDocument()),
    description: normalizeText(descEl ? descEl.innerText : ""),
    difficulty: "Unknown",
    slug: slugFromUrl(),
  };
}

function extractUserCode() {
  const monacoLines = document.querySelectorAll(".view-lines div.view-line");
  if (monacoLines.length > 0) {
    return Array.from(monacoLines)
      .map((line) => line.textContent || "")
      .join("\n")
      .trim();
  }

  const textareaEditor = document.querySelector(
    'textarea[class*="code"], textarea[class*="editor"], textarea',
  );
  if (textareaEditor && textareaEditor.value) {
    return textareaEditor.value.trim();
  }

  const codeBlock = document.querySelector("pre code, pre");
  if (codeBlock && codeBlock.textContent) {
    return codeBlock.textContent.trim();
  }

  return "";
}

function calculateConfidence(context) {
  let score = 0;
  if (context.title && context.title.length > 2) {
    score += 0.35;
  }
  if (context.description && context.description.length > 100) {
    score += 0.45;
  }
  if (context.userCode && context.userCode.length > 5) {
    score += 0.2;
  }
  return score;
}

function normalizeText(text) {
  return (text || "").replace(/\s+/g, " ").trim().slice(0, 7000);
}

function titleFromDocument() {
  return (document.title || "Unknown problem").split("-")[0].trim();
}


function slugFromUrl() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const index = parts.indexOf("problems");
  if (index >= 0 && parts[index + 1]) {
    return parts[index + 1];
  }
  return parts[parts.length - 1] || "unknown";
}
