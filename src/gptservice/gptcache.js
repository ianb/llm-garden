import { getCompletion } from "./appgpt";
import LocalCache from "../localcache";

export class GptCache {
  constructor({
    storageName,
    basePaths,
    logResults,
    responseFixer,
    defaultPromptOptions,
  }) {
    this.storageName = storageName;
    this.basePaths = basePaths || [];
    this.responseFixer = responseFixer || ((v) => v);
    this.defaultPromptOptions = defaultPromptOptions || {};
    this.logResults = logResults || false;
    this.log = [];
    // FIXME: should change to IndexedDB/Dexie:
    this.queryCache = new LocalCache(`${storageName}-queries`);
  }

  async getCompletion(prompt, usagePaths) {
    usagePaths = usagePaths || [];
    usagePaths = [...this.basePaths, ...usagePaths];
    let val;
    if (typeof prompt === "string") {
      val = this.queryCache.get(prompt);
    }
    if (val) {
      this.log.push({
        prompt,
        fromCache: true,
        response: this.responseFixer(val.choices[0].text),
      });
      return val;
    }
    let requestBody;
    if (typeof prompt === "string") {
      requestBody = { prompt };
    } else {
      requestBody = prompt;
    }
    requestBody = Object.assign({}, this.defaultPromptOptions, requestBody);
    const start = Date.now();
    const logItem = { prompt: requestBody.prompt, start };
    this.log.push(logItem);
    const resp = await getCompletion(requestBody, usagePaths);
    console.log(
      "GPT response",
      requestBody.prompt +
        "\n---------------\n" +
        this.responseFixer(resp.choices[0].text)
    );
    const cached = Object.assign({}, resp);
    cached.fromCache = true;
    this.queryCache.set(requestBody.prompt, cached);
    logItem.response = this.responseFixer(resp.choices[0].text);
    logItem.time = Date.now() - start;
    resp.text = this.responseFixer(resp.choices[0].text);
    return resp;
  }
}
