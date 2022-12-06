import { getGptCompletion, defaultBody } from "./gpt";
import { holder } from "../keymanagement/key";
import { tokenCostTracker } from "./tokencost";

export async function getCompletion(prompt, usagePaths) {
  if (typeof prompt === "string") {
    prompt = { prompt };
  }
  prompt = Object.assign({}, defaultBody, prompt);
  const resp = await getGptCompletion(prompt, holder.getKey());
  tokenCostTracker.trackUsage(usagePaths, resp.usage, prompt.model);
  return resp;
}
