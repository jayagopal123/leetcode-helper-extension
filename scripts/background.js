// scripts/background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "CALL_GEMINI") {
    handleGeminiRequest(request, sendResponse);
    return true; // Keep the channel open for async response
  }
});

const PREFERRED_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro-latest",
  "gemini-1.5-flash",
  "gemini-pro",
];
const API_VERSIONS = ["v1beta", "v1"];

async function handleGeminiRequest(request, sendResponse) {
  try {
    const { apiKey, context, query, mode } = request.payload;

    const finalSystemPrompt = buildSystemPrompt(mode);
    const contextText = buildContextText(context);

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `${finalSystemPrompt}\n\nContext:\n${contextText}\n\nUser Question: ${query}`,
            },
          ],
        },
      ],
    };

    const modelCandidates = await resolveModelCandidates(apiKey);
    let lastError = "No compatible model found for generateContent.";

    for (const candidate of modelCandidates) {
      const { model, apiVersion } = candidate;
      const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errData = null;
        try {
          errData = await response.json();
        } catch {
          errData = null;
        }
        lastError =
          errData?.error?.message ||
          `API request failed for ${model} (${apiVersion})`;
        continue;
      }

      const data = await response.json();
      const text = extractTextFromGeminiResponse(data);
      if (!text) {
        lastError = `Empty response from ${model} (${apiVersion})`;
        continue;
      }

      sendResponse({
        success: true,
        data: text,
        modelUsed: model,
        apiVersionUsed: apiVersion,
      });
      return;
    }

    throw new Error(
      `${lastError} Tried candidates: ${modelCandidates
        .map((item) => `${item.model} (${item.apiVersion})`)
        .join(", ")}`,
    );
  } catch (error) {
    console.error("Gemini API Error:", error);
    sendResponse({ success: false, error: error.message });
  }
}

async function resolveModelCandidates(apiKey) {
  const discoveredByVersion = await Promise.all(
    API_VERSIONS.map(async (apiVersion) => ({
      apiVersion,
      models: await listGenerateContentModels(apiKey, apiVersion),
    })),
  );

  const discoveredCandidates = discoveredByVersion.flatMap((entry) =>
    entry.models.map((model) => ({ model, apiVersion: entry.apiVersion })),
  );

  const discoveredNames = discoveredCandidates.map((item) => item.model);
  const discoveredNameSet = new Set(discoveredNames);

  const preferredNames = PREFERRED_MODELS.filter((name) =>
    discoveredNameSet.has(name),
  );

  const preferredCandidates = preferredNames.flatMap((name) =>
    discoveredCandidates.filter((item) => item.model === name),
  );

  const discoveredRemainder = discoveredCandidates.filter(
    (item) => !preferredNames.includes(item.model),
  );

  const fallbackCandidates = PREFERRED_MODELS.flatMap((name) =>
    API_VERSIONS.map((apiVersion) => ({ model: name, apiVersion })),
  );

  const ordered = [
    ...preferredCandidates,
    ...discoveredRemainder,
    ...fallbackCandidates,
  ];

  const unique = [];
  const seen = new Set();
  for (const item of ordered) {
    const key = `${item.model}|${item.apiVersion}`;
    if (!seen.has(key)) {
      unique.push(item);
      seen.add(key);
    }
  }

  return unique;
}

async function listGenerateContentModels(apiKey, apiVersion) {
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models?key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  if (!data || !Array.isArray(data.models)) {
    return [];
  }

  return data.models
    .filter(
      (model) =>
        Array.isArray(model.supportedGenerationMethods) &&
        model.supportedGenerationMethods.includes("generateContent"),
    )
    .map((model) => String(model.name || ""))
    .map((fullName) =>
      fullName.startsWith("models/") ? fullName.slice(7) : fullName,
    )
    .filter((name) => Boolean(name));
}

function extractTextFromGeminiResponse(data) {
  if (!data || !Array.isArray(data.candidates)) {
    return "";
  }

  const firstCandidate = data.candidates[0];
  const parts = firstCandidate?.content?.parts;
  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("\n")
    .trim();
}

function buildSystemPrompt(mode) {
  const basePrompt =
    "You are an expert DSA mentor. Be concise, correct, and educational. Use the detected platform and problem context.";

  if (mode === "full_solution") {
    return `${basePrompt} The user explicitly asked for full solution mode. Provide a complete solution with explanation and complexity.`;
  }

  if (mode === "pseudocode") {
    return `${basePrompt} Provide pseudocode and reasoning. Do not provide full runnable code.`;
  }

  if (mode === "approach") {
    return `${basePrompt} Provide high-level approach and key insights. Avoid final code.`;
  }

  return `${basePrompt} Default mode is hints only. Provide progressive hints and avoid full solution code.`;
}

function buildContextText(context) {
  if (!context || typeof context !== "object") {
    return "Context unavailable.";
  }

  return [
    `Platform: ${context.platform || "unknown"}`,
    `Status: ${context.status || "unknown"}`,
    `Confidence: ${context.confidence ?? "n/a"}`,
    `Title: ${context.title || "Unknown"}`,
    `Difficulty: ${context.difficulty || "Unknown"}`,
    `URL: ${context.url || ""}`,
    `Description: ${context.description || ""}`,
    `Constraints: ${context.constraints || ""}`,
    `Examples: ${context.examples || ""}`,
    `Starter Code: ${context.starterCode || ""}`,
    `User Code:\n${context.userCode || ""}`,
  ].join("\n");
}
