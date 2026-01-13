// scripts/background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "CALL_GEMINI") {
    handleGeminiRequest(request, sendResponse);
    return true; // Keep the channel open for async response
  }
});

async function handleGeminiRequest(request, sendResponse) {
  try {
    const { apiKey, context, query, systemPrompt } = request.payload;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const finalSystemPrompt =
      systemPrompt || "You are a helpful coding assistant.";

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `${finalSystemPrompt}\n\nContext:\n${context}\n\nUser Question: ${query}`,
            },
          ],
        },
      ],
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || "API Request Failed");
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;

    sendResponse({ success: true, data: text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    sendResponse({ success: false, error: error.message });
  }
}
