import { holder } from "../key-management/key";

export const availableSizes = ["256x256", "512x512", "1024x1024"];

export const costs = {
  "256x256": 0.02,
  "512x512": 0.018,
  "1024x1024": 0.016,
};

export async function getDallECompletion(input, key = null) {
  const url = "https://api.openai.com/v1/images/generations";
  input = Object.assign({ response_format: "b64_json" }, input);
  if (!key) {
    if (!holder.hasKey()) {
      if (window.confirm("No GPT API key is set. Set one now?")) {
        window.location = "/key-management";
      }
      throw new Error("No GPT API key is set");
    }
    key = holder.getKey();
  }
  if (!input.prompt) {
    throw new Error("No prompt");
  }
  console.log("Sending DallE request:", input);
  const resp = await fetch(url, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(input),
  });
  if (!resp.ok) {
    const error = await resp.text();
    console.error("Bad DallE response:", resp, error);
    throw new Error(
      `DallE request failed: ${resp.status} ${resp.statusText}: ${error}`
    );
  }
  const body = await resp.json();
  body.cost = costs[input.size] * input.n;
  return body;
}
