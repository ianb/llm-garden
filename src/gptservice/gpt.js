export async function getGptCompletion(prompt, key) {
  const url = "https://api.openai.com/v1/completions";
  if (typeof prompt === "string") {
    prompt = { prompt };
  }
  if (prompt.system || prompt.messages) {
    throw new Error("Use getGptChat() for chat prompts");
  }
  const body = Object.assign({}, defaultBody, prompt);
  console.log("Sending GPT request:", body.prompt, body);
  const resp = await fetch(url, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const body = await resp.json();
    console.error("Error from GPT:", body);
    const exc = new Error(
      `GPT request failed: ${resp.status} ${resp.statusText}: ${body.error.message}`
    );
    exc.request = resp;
    exc.errorData = body;
    throw exc;
  }
  const data = await resp.json();
  console.log("Got GPT response:", data);
  addTokens(data.usage.total_tokens);
  return data;
}

export const defaultBody = {
  model: "text-davinci-003",
  temperature: 0.2,
  max_tokens: 40,
  n: 1,
};

export async function getGptEdit(body, key) {
  const url = "https://api.openai.com/v1/edits";
  if (!body.input || !body.instruction) {
    throw new Error(`Missing ${body.input ? "instruction" : "input"}`);
  }
  body = Object.assign({}, defaultEditBody, body);
  console.log(
    "Sending GPT edit request:\n",
    body.input,
    "\n",
    body.instruction,
    body
  );
  const resp = await fetch(url, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const body = await resp.json();
    console.error("Error from GPT:", body);
    const exc = new Error(
      `GPT edit request failed: ${resp.status} ${resp.statusText}: ${body.error.message}`
    );
    exc.request = resp;
    exc.errorData = body;
    throw exc;
  }
  const data = await resp.json();
  console.log("Got GPT edit response:", data);
  addTokens(data.usage.total_tokens);
  return data;
}

export const defaultEditBody = {
  model: "text-davinci-edit-001",
  temperature: 0.05,
  n: 1,
};

export async function getGptChat(prompt, key) {
  const url = "https://api.openai.com/v1/chat/completions";
  prompt = normalizeGptChatPrompt(prompt);
  console.log("Sending ChatGPT request:", prompt);
  const resp = await fetch(url, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(prompt),
  });
  if (!resp.ok) {
    const body = await resp.json();
    console.error("Error from ChatGPT:", body);
    const exc = new Error(
      `ChatGPT request failed: ${resp.status} ${resp.statusText}: ${body.error.message}`
    );
    exc.request = resp;
    exc.errorData = body;
    throw exc;
  }
  const data = await resp.json();
  console.log("Got ChatGPT response:", data);
  addTokens(data.usage.total_tokens);
  return data;
}

export function normalizeGptChatPrompt(prompt) {
  if (typeof prompt === "string") {
    prompt = { prompt };
  }
  if (prompt.prompt) {
    // Simulate a GPT completion using a text prompt
    if (prompt.messages) {
      throw new Error("Cannot specify both prompt and messages");
    }
    prompt.messages = [{ role: "user", content: prompt.prompt }];
    delete prompt.prompt;
  }
  if (prompt.system) {
    console.log("Bad prompt:", prompt);
    if (prompt.messages[0].role === "system") {
      throw new Error(
        "Cannot specify both system and messages[0].role==system"
      );
    }
    prompt.messages.unshift({ role: "system", content: prompt.system });
    delete prompt.system;
  }
  return Object.assign({}, defaultChatBody, prompt);
}

export const defaultChatBody = {
  model: "gpt-3.5-turbo",
};

let sessionTokens = 0;
let totalTokens = 0;
if (localStorage.getItem("totalTokens")) {
  totalTokens = parseInt(localStorage.getItem("totalTokens"), 10);
}

function addTokens(n) {
  sessionTokens += n;
  totalTokens += n;
  localStorage.setItem("totalTokens", totalTokens);
  console.log("Token track:", sessionTokens, "/", totalTokens);
}
