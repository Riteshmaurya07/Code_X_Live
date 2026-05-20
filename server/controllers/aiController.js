const { GoogleGenerativeAI } = require("@google/generative-ai");
const aiCache = require("../utils/aiCache");
const logger = require("../utils/logger");
const { logActivity } = require("./activityController");

let genAI = null;

const getModel = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing in environment variables");
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  // gemini-pro is deprecated; use gemini-2.0-flash or gemini-2.5-pro
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  return genAI.getGenerativeModel({ model: modelName });
};

// AI Code Review
const reviewCode = async (req, res, next) => {
  try {
    const { code, language, projectId } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: "Code is required" });
    }

    const prompt = `review:${language}`;
    const cached = aiCache.get(code, prompt);
    if (cached) {
      logger.info("AI review served from cache");
      return res.json({ review: cached });
    }

    const model = getModel();
    const fullPrompt = `You are an expert code reviewer. Analyze the following ${language || "code"} and provide a structured review in JSON format with these categories:
    
1. "bugs": Array of detected bugs or potential issues
2. "performance": Array of performance improvement suggestions
3. "security": Array of security vulnerabilities or concerns
4. "refactoring": Array of refactoring suggestions for better code quality

For each item, provide:
- "line": approximate line number (if applicable)
- "severity": "low", "medium", or "high"
- "description": clear explanation of the issue
- "suggestion": how to fix or improve it

Return ONLY valid JSON, no markdown code fences.

Code to review:
\`\`\`${language || ""}
${code}
\`\`\``;

    const result = await model.generateContent(fullPrompt);
    const text = result.response.text();

    let review;
    try {
      review = JSON.parse(text);
    } catch {
      review = { raw: text };
    }

    aiCache.set(code, prompt, review);

    if (projectId) {
      logActivity(projectId, req.user?._id, req.user?.username, "ai_review", "AI code review requested");
    }

    logger.info("AI review completed");
    res.json({ review });
  } catch (err) {
    next(err);
  }
};

// AI Code Explanation
const explainCode = async (req, res, next) => {
  try {
    const { code, language, projectId } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: "Code is required" });
    }

    const prompt = `explain:${language}`;
    const cached = aiCache.get(code, prompt);
    if (cached) {
      return res.json({ explanation: cached });
    }

    const model = getModel();
    const fullPrompt = `You are a patient and thorough programming instructor. Explain the following ${language || "code"} in a clear, step-by-step manner. Break down what each section does, explain the logic flow, and highlight any important concepts used.

Use markdown formatting with headers and bullet points for readability.

Code to explain:
\`\`\`${language || ""}
${code}
\`\`\``;

    const result = await model.generateContent(fullPrompt);
    const explanation = result.response.text();

    aiCache.set(code, prompt, explanation);

    if (projectId) {
      logActivity(projectId, req.user?._id, req.user?.username, "ai_explain", "AI explanation requested");
    }

    res.json({ explanation });
  } catch (err) {
    next(err);
  }
};

// AI Bug Fix
const fixCode = async (req, res, next) => {
  try {
    const { code, language, errorMessage, projectId } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: "Code is required" });
    }

    const prompt = `fix:${language}:${errorMessage || ""}`;
    const cached = aiCache.get(code, prompt);
    if (cached) {
      return res.json({ fix: cached });
    }

    const model = getModel();
    const fullPrompt = `You are an expert debugger. The following ${language || "code"} has issues.${errorMessage ? ` The error message is: "${errorMessage}"` : ""}

Analyze the code, identify all bugs, and return the corrected version. Also explain what was wrong and what you fixed.

Return your response in JSON format:
{
  "fixedCode": "the corrected code as a string",
  "changes": [
    { "description": "what was wrong and what was fixed" }
  ]
}

Return ONLY valid JSON, no markdown code fences.

Buggy code:
\`\`\`${language || ""}
${code}
\`\`\``;

    const result = await model.generateContent(fullPrompt);
    const text = result.response.text();

    let fix;
    try {
      fix = JSON.parse(text);
    } catch {
      fix = { raw: text };
    }

    aiCache.set(code, prompt, fix);

    if (projectId) {
      logActivity(projectId, req.user?._id, req.user?.username, "ai_fix", "AI bug fix requested");
    }

    res.json({ fix });
  } catch (err) {
    next(err);
  }
};

// AI Test Case Generator
const generateTests = async (req, res, next) => {
  try {
    const { code, language, projectId } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: "Code is required" });
    }

    const prompt = `tests:${language}`;
    const cached = aiCache.get(code, prompt);
    if (cached) {
      return res.json({ tests: cached });
    }

    const model = getModel();
    const fullPrompt = `You are an expert in software testing. Generate comprehensive unit tests for the following ${language || "code"}.

Include:
- Edge cases
- Normal cases
- Error handling cases

Use a popular testing framework appropriate for the language (Jest for JavaScript, pytest for Python, JUnit for Java, etc.).

Return the test code with clear comments explaining each test case.

Code to test:
\`\`\`${language || ""}
${code}
\`\`\``;

    const result = await model.generateContent(fullPrompt);
    const tests = result.response.text();

    aiCache.set(code, prompt, tests);

    if (projectId) {
      logActivity(projectId, req.user?._id, req.user?.username, "ai_tests", "AI test generation requested");
    }

    res.json({ tests });
  } catch (err) {
    next(err);
  }
};

// AI Chat Assistant
const chat = async (req, res, next) => {
  try {
    const { message, code, language, history, projectId } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const model = getModel();

    let contextPrompt = `You are CodeXLive AI Assistant, a helpful coding assistant. Answer the user's question clearly and concisely. Use markdown formatting.`;

    if (code) {
      contextPrompt += `\n\nThe user is currently working on the following ${language || "code"}:\n\`\`\`${language || ""}\n${code}\n\`\`\``;
    }

    if (history && history.length > 0) {
      contextPrompt += `\n\nConversation history:\n`;
      history.forEach((msg) => {
        contextPrompt += `${msg.role}: ${msg.content}\n`;
      });
    }

    contextPrompt += `\n\nUser: ${message}\n\nAssistant:`;

    const result = await model.generateContent(contextPrompt);
    const reply = result.response.text();

    if (projectId) {
      logActivity(projectId, req.user?._id, req.user?.username, "ai_chat", `Chat: "${message.slice(0, 60)}..."`);
    }

    res.json({ reply });
  } catch (err) {
    next(err);
  }
};

// AI Autocomplete
const autocomplete = async (req, res, next) => {
  try {
    const { prefix, suffix, language, maxTokens = 150 } = req.body;

    if (!prefix) {
      return res.status(400).json({ success: false, message: "Prefix is required" });
    }

    const cacheKey = `${language}:${prefix}`;
    const cached = aiCache.get(cacheKey, "autocomplete");
    if (cached) {
      return res.json({ completion: cached });
    }

    const model = getModel();
    const prompt = `You are a highly advanced AI code completion engine.
Your task is to provide ONLY the code that should be inserted exactly at the cursor position.
Do NOT include any markdown formatting, do NOT include explanations, and do NOT repeat the prefix or suffix unless necessary for the completion.
The completion should flow naturally from the prefix and connect smoothly to the suffix if possible.

Language: ${language || "plaintext"}

Code before cursor:
${prefix}

Code after cursor:
${suffix}

Provide the code completion:`;

    // Timeout the request after 5 seconds to prevent hanging the editor
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("AI Autocomplete timeout")), 5000)
    );

    const resultPromise = model.generateContent(prompt);
    const result = await Promise.race([resultPromise, timeoutPromise]);
    
    let completion = result.response.text();
    
    // Clean up any markdown blocks that Gemini might try to add despite instructions
    completion = completion.replace(/^```[a-zA-Z]*\n/g, "").replace(/\n```$/g, "");
    
    aiCache.set(cacheKey, "autocomplete", completion);

    res.json({ completion });
  } catch (err) {
    // We don't want to throw an error 500 for autocomplete timeouts, just return empty
    logger.warn(`AI Autocomplete failed: ${err.message}`);
    res.json({ completion: "" });
  }
};

module.exports = { reviewCode, explainCode, fixCode, generateTests, chat, autocomplete };
