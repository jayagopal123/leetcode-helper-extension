# LeetCode Mentor Extension

An AI-powered Chrome Extension that acts as a Socratic tutor for LeetCode problems. It runs directly in the endpoint, reads your code and the problem description, and provides hints without giving away the answer.

## Features

- **In-Page Sidebar**: Floating UI explicitly designed for LeetCode.
- **Context Aware**: Reads the current problem description and your code from the Monaco editor.
- **Socratic Hints**: Uses Google Gemini to guide you rather than solving the problem for you.
- **Dark Mode**: Sleek UI that matches LeetCode's dark theme.

## Installation

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer Mode** (top right).
3. Click **Load unpacked**.
4. Select the `leetcode-extension` folder (where this file is located).

## Setup

1. Go to a LeetCode problem page (e.g., Two Sum).
2. You will see a small "Brain" icon 🧠 on the right or the sidebar will open.
3. Click the **Settings (⚙️)** gear in the sidebar.
4. Enter your **Google Gemini API Key**. (You can get one for free at [Google AI Studio](https://aistudio.google.com/)).
5. Save the key.

## Usage

- Type your question in the chat box (e.g., "I'm stuck on how to optimize this loop").
- Press **Ask Mentor** or `Ctrl + Enter`.
- The AI will analyze your current code and give you a specific hint.

## Troubleshooting

- **"Agent not ready"**: Refresh the page. The extension needs to re-inject into the page context.
- **Sidebar not showing**: Check if you are on a `/problems/` URL. Refresh the page.
- **API Errors**: Ensure your API key is valid and has credits (free tier is sufficient).
