export async function getGptCompletion(prompt, key) {
  const url = "https://api.openai.com/v1/completions";
  if (typeof prompt === "string") {
    prompt = { prompt };
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
