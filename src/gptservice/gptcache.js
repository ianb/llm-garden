import { getCompletion, getEdit } from "./appgpt";
import { defaultBody, defaultEditBody } from "./gpt";
import LocalCache from "../localcache";

export class GptCache {
  constructor({
    storageName,
    basePaths,
    logResults,
    responseFixer,
    defaultPromptOptions,
    defaultEditOptions,
  }) {
    this.storageName = storageName;
    this.basePaths = basePaths || [];
    this.responseFixer = responseFixer || ((v) => v);
    this.defaultPromptOptions = Object.assign(
      {},
      defaultBody,
      defaultPromptOptions || {}
    );
    this.defaultEditOptions = Object.assign(
      {},
      defaultEditBody,
      defaultEditOptions || {}
    );
    this.logResults = logResults || false;
    this.log = [];
    // FIXME: should change to IndexedDB/Dexie:
    this.queryCache = new LocalCache(`${storageName}-queries`);
    this._onLogUpdates = [];
  }

  async getCompletion(prompt, usagePaths) {
    usagePaths = usagePaths || [];
    usagePaths = [...this.basePaths, ...usagePaths];
    usagePaths = this.resolvePaths(usagePaths);
    let requestBody = typeof prompt === "string" ? { prompt } : prompt;
    requestBody = Object.assign({}, this.defaultPromptOptions, requestBody);
    const key = `completion
${requestBody.prompt}
${requestBody.model}
${requestBody.max_tokens}
${floatKey(requestBody.temperature)}
${stopRepr(requestBody.stop)}
${floatKey(requestBody.presence_penalty)}
${floatKey(requestBody.frequency_penalty)}`;
    let val = this.queryCache.get(key);
    if (val) {
      this.log.push({
        prompt,
        type: "completion",
        fromCache: true,
        response: this.responseFixer(val.choices[0].text),
      });
      val = Object.assign({}, val);
      val.text = this.responseFixer(val.choices[0].text);
      this.updated();
      return val;
    }
    const start = Date.now();
    const logItem = { prompt: requestBody.prompt, start, type: "completion" };
    this.log.push(logItem);
    this.updated();
    const resp = await getCompletion(requestBody, usagePaths);
    console.log(
      "GPT response",
      requestBody.prompt +
        "\n---------------\n" +
        this.responseFixer(resp.choices[0].text)
    );
    const cached = Object.assign({}, resp);
    cached.fromCache = true;
    this.queryCache.set(key, cached);
    logItem.response = this.responseFixer(resp.choices[0].text);
    logItem.time = Date.now() - start;
    resp.text = this.responseFixer(resp.choices[0].text);
    this.updated();
    return resp;
  }

  async getEdit(body, usagePaths) {
    usagePaths = usagePaths || [];
    usagePaths = [...this.basePaths, ...usagePaths];
    usagePaths = this.resolvePaths(usagePaths);
    const requestBody = Object.assign({}, this.defaultEditOptions, body);
    // Not applicable to edit:
    delete requestBody.max_tokens;
    delete requestBody.stop;
    delete requestBody.presence_penalty;
    delete requestBody.frequency_penalty;
    const key = `edit
${requestBody.input}
${requestBody.instruction}
${requestBody.model}
${floatKey(requestBody.temperature)}`;
    let val = this.queryCache.get(key);
    if (val) {
      this.log.push({
        prompt: requestBody,
        type: "edit",
        fromCache: true,
        response: val.choices[0].text,
      });
      val = Object.assign({}, val);
      val.text = val.choices[0].text;
      this.updated();
      return val;
    }
    const start = Date.now();
    const logItem = { prompt: requestBody, start, type: "edit" };
    this.log.push(logItem);
    this.updated();
    const resp = await getEdit(requestBody, usagePaths);
    console.log(
      "GPT edit response",
      requestBody.input +
        "\n=>" +
        requestBody.instruction +
        "\n---------------\n" +
        resp.choices[0].text
    );
    const cached = Object.assign({}, resp);
    cached.fromCache = true;
    this.queryCache.set(key, cached);
    logItem.response = resp.choices[0].text;
    logItem.time = Date.now() - start;
    resp.text = resp.choices[0].text;
    this.updated();
    return resp;
  }

  resolvePaths(paths) {
    return paths
      .map((p) => {
        if (typeof p === "function") {
          return p();
        }
        return p;
      })
      .filter((x) => x);
  }

  addOnLogUpdate(func) {
    this._onLogUpdates.push(func);
  }

  removeOnLogUpdate(func) {
    this._onLogUpdates = this._onLogUpdates.filter((f) => f !== func);
  }

  updated() {
    this._onLogUpdates.forEach((f) => f());
  }
}

function floatKey(f) {
  if (!f) {
    return "";
  }
  return f.toFixed(1);
}

function stopRepr(s) {
  if (!s) {
    return "";
  }
  if (typeof s === "string") {
    return s;
  }
  return s.join("|");
}
