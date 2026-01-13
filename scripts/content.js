// scripts/content.js

// 1. Singleton Guard
if (document.getElementById("lc-mentor-root")) {
  console.log("LeetCode Mentor: Already injected.");
} else {
  injectSidebar();
}

// 2. Message Listener (Fixes "Receiving end does not exist")
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_PROBLEM") {
    const problemTitle = document.title.split("-")[0].trim();
    sendResponse({ problemId: problemTitle });
  }
  return true;
});

function injectSidebar() {
  console.log("LeetCode Mentor: Initializing...");

  const host = document.createElement("div");
  host.id = "lc-mentor-root";
  host.style.position = "fixed";
  host.style.top = "0";
  host.style.right = "0";
  host.style.zIndex = "2147483647";
  host.style.height = "100vh";
  host.style.width = "0"; // Initially just the shadow host, content handles width

  const shadow = host.attachShadow({ mode: "open" });

  // --- STYLES ---
  const styleSheet = `
    <style>
      :host { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      
      .sidebar {
        width: 400px; 
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
      
      .sidebar.minimized {
        transform: translateX(100%);
      }

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
        font-size: 20px;
        box-shadow: -2px 0 10px rgba(0,0,0,0.2);
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
        background: none; border: none; color: #aaa; cursor: pointer; font-size: 18px; padding: 4px;
        transition: color 0.2s;
      }
      .icon-btn:hover { color: #fff; }

      .content { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; scrollbar-width: thin; scrollbar-color: #444 #1a1a1a; }
      
      .chat-message { padding: 12px; border-radius: 8px; font-size: 14px; line-height: 1.5; word-wrap: break-word; white-space: pre-wrap; }
      .message-bot { background: #333; align-self: flex-start; border-bottom-left-radius: 0; }
      .message-user { background: #0078d4; color: white; align-self: flex-end; border-bottom-right-radius: 0; }
      .message-system { background: #2d2d2d; color: #888; font-size: 12px; align-self: center; border: 1px dashed #444; }

      .input-area { padding: 16px; background: rgba(38, 38, 38, 0.9); border-top: 1px solid #333; }
      textarea {
        width: 100%; height: 70px; background: #333; border: 1px solid #444; border-radius: 6px;
        color: #fff; padding: 10px; font-family: inherit; resize: none; box-sizing: border-box;
      }
      textarea:focus { outline: none; border-color: #0078d4; }
      
      .main-btn {
        margin-top: 10px; width: 100%; padding: 10px; background: #0078d4; color: white;
        border: none; border-radius: 6px; cursor: pointer; font-weight: 600;
        transition: background 0.2s;
      }
      .main-btn:hover { background: #0063b1; }
      .main-btn:disabled { background: #444; cursor: not-allowed; opacity: 0.7; }

      /* Settings Pane */
      .settings-pane {
        padding: 16px; background: #222; border-bottom: 1px solid #333;
        display: none; 
        flex-direction: column; gap: 10px;
        animation: slideDown 0.2s ease;
      }
      @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      .settings-pane.visible { display: flex; }
      .settings-label { font-size: 12px; color: #aaa; }
      .api-input {
        width: 100%; padding: 8px; background: #111; border: 1px solid #444; color: #fff;
        border-radius: 4px; box-sizing: border-box;
      }
    </style>
  `;

  // --- HTML STRUCTURE ---
  const htmlContent = `
    <div class="sidebar" id="sidebar">
      <button class="toggle-btn" id="toggle-btn" title="Toggle Sidebar">🧠</button>
      
      <div class="header">
        <h2>LeetCode Mentor</h2>
        <div style="display:flex; gap: 8px;">
          <button id="clear-chat" class="icon-btn" title="Clear Chat">🗑️</button>
          <button id="settings-toggle" class="icon-btn" title="Settings">⚙️</button>
        </div>
      </div>

      <!-- Settings Panel -->
      <div id="settings-pane" class="settings-pane">
        <label class="settings-label">Gemini API Key</label>
        <input type="password" id="api-key-input" class="api-input" placeholder="Enter Google Gemini API Key" />
        <button id="save-key-btn" class="main-btn">Save Key</button>
      </div>

      <div class="content" id="chat-history">
        <div class="chat-message message-bot">Hello! I'm your LeetCode Mentor. I can see the problem and your code. Ask me for a hint!</div>
      </div>
      
      <div class="input-area">
        <textarea id="user-input" placeholder="Type your question... (Ctrl+Enter to send)"></textarea>
        <button id="ask-btn" class="main-btn">Ask Mentor</button>
      </div>
    </div>
  `;

  shadow.innerHTML = styleSheet + htmlContent;

  // --- LOGIC ---
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

  let isMinimized = false;

  // 1. Load API Key
  chrome.storage.local.get(["geminiApiKey"], (result) => {
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
    } else {
      settingsPane.classList.add("visible");
      apiKeyInput.value = "AIzaSyDIOfwicbfS7c8b8ot5g0gllCyzTDQN61o"; // Pre-filled for convenience
      appendMessage(
        chatHistory,
        "API Key pre-filled. Please click 'Save Key' above to start!",
        "system"
      );
    }
  });

  // 2. Toggle Sidebar
  toggleBtn.addEventListener("click", () => {
    isMinimized = !isMinimized;
    sidebar.classList.toggle("minimized");
    toggleBtn.innerHTML = isMinimized ? "🧠" : "❌";
    toggleBtn.style.borderRadius = isMinimized ? "8px 0 0 8px" : "50%";
    if (isMinimized) toggleBtn.style.left = "-50px";
    else toggleBtn.style.left = "-40px";
  });

  // 3. Settings & Clear
  settingsToggle.addEventListener("click", () =>
    settingsPane.classList.toggle("visible")
  );
  clearChatBtn.addEventListener("click", () => {
    chatHistory.innerHTML =
      '<div class="chat-message message-bot">Chat cleared. Ready for new questions!</div>';
  });

  saveKeyBtn.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    if (key) {
      chrome.storage.local.set({ geminiApiKey: key }, () => {
        appendMessage(chatHistory, "API Key saved successfully!", "system");
        settingsPane.classList.remove("visible");
      });
    }
  });

  // 4. Handle Input
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.ctrlKey) {
      askBtn.click();
    }
  });

  askBtn.addEventListener("click", async () => {
    const question = userInput.value.trim();
    if (!question) return;

    appendMessage(chatHistory, question, "user");
    userInput.value = "";
    askBtn.disabled = true;
    askBtn.innerText = "Thinking...";

    try {
      // Get Storage
      const storage = await chrome.storage.local.get(["geminiApiKey"]);
      const apiKey = storage.geminiApiKey;
      if (!apiKey)
        throw new Error("Please set your Gemini API Key in settings ⚙️");

      // Gather Context
      const context = getPageContext();

      // Send to Background Script
      const response = await chrome.runtime.sendMessage({
        type: "CALL_GEMINI",
        payload: {
          apiKey,
          context: `Problem Title: ${context.title}\nDescription: ${context.description}\nUser Code:\n${context.code}`,
          query: question,
          systemPrompt:
            "You are an expert LeetCode mentor. Analyze the user's code and the problem description. Provide specific hints, find bugs, or explain concepts. Do NOT give the full solution code unless strictly asked. Be encouraging and concise.",
        },
      });

      if (response && response.success) {
        appendMessage(chatHistory, response.data, "bot");
      } else {
        throw new Error(response.error || "Unknown error from agent.");
      }
    } catch (error) {
      appendMessage(chatHistory, `Error: ${error.message}`, "system");
    } finally {
      askBtn.disabled = false;
      askBtn.innerText = "Ask Mentor";
    }
  });

  document.body.appendChild(host);
}

// --- HELPER FUNCTIONS ---

function appendMessage(container, text, type) {
  const div = document.createElement("div");
  div.classList.add("chat-message");
  if (type === "user") div.classList.add("message-user");
  else if (type === "bot") div.classList.add("message-bot");
  else div.classList.add("message-system");

  // Simple formatting
  let formatted = text
    .replace(
      /```([\s\S]*?)```/g,
      '<pre style="background:#111; padding:8px; border-radius:4px; overflow-x:auto;"><code>$1</code></pre>'
    )
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  div.innerHTML = formatted;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function getPageContext() {
  // Title
  const title = document.title.split("-")[0].trim();

  // Description (Try multiple selectors)
  let description = "";
  const descElement =
    document.querySelector('[data-track-load="description_content"]') ||
    document.querySelector(".elfjS") ||
    document.querySelector('div[class*="description"]');
  if (descElement) {
    description = descElement.innerText.substring(0, 3000); // Limit length
  } else {
    description = "Could not find description. Please rely on title.";
  }

  // Code (Monaco Editor)
  let code = "";
  const codeLines = document.querySelectorAll(".view-lines div.view-line");
  if (codeLines.length > 0) {
    code = Array.from(codeLines)
      .map((line) => line.innerText)
      .join("\\n");
  } else {
    // Fallback for non-Monaco or if restricted
    code = "Could not read code lines. (Editor might be canvas or hidden)";
  }

  return { title, description, code };
}
