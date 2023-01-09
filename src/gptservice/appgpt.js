import { getGptCompletion, getGptEdit, defaultBody } from "./gpt";
import { holder } from "../key-management/key";
import { tokenCostTracker } from "./tokencost";

export async function getCompletion(prompt, usagePaths) {
  if (!holder.hasKey()) {
    if (window.confirm("No GPT API key is set. Set one now?")) {
      window.location = "/key-management";
    }
    throw new Error("No GPT API key is set");
  }
  if (typeof prompt === "string") {
    prompt = { prompt };
  }
  prompt = Object.assign({}, defaultBody, prompt);
  const resp = await getGptCompletion(prompt, holder.getKey());
  tokenCostTracker.trackUsage(usagePaths, resp.usage, prompt.model);
  return resp;
}

export async function getEdit(prompt, usagePaths) {
  if (!holder.hasKey()) {
    if (window.confirm("No GPT API key is set. Set one now?")) {
      window.location = "/key-management";
    }
    throw new Error("No GPT API key is set");
  }
  const resp = await getGptEdit(prompt, holder.getKey());
  tokenCostTracker.trackUsage(usagePaths, resp.usage, prompt.model);
  return resp;
}
