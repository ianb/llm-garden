import { getCompletion, getEdit, getChat } from "./appgpt";
import { defaultBody, defaultEditBody, normalizeGptChatPrompt } from "./gpt";
import LocalCache from "../localcache";

export class GptCache {
  constructor({
    storageName,
    basePaths,
    logResults,
    responseFixer,
    defaultPromptOptions,
    defaultEditOptions,
    defaultChatOptions,
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
    this.defaultChatOptions = Object.assign(
      {},
      defaultChatOptions || defaultPromptOptions
    );
    this.logResults = logResults || false;
    this.log = [];
    // FIXME: should change to IndexedDB/Dexie:
    this.queryCache = new LocalCache(`${storageName}-queries`);
    this._onLogUpdates = [];
  }

  makeCacheKey(body) {
    return `completion
${body.prompt}
${body.model}
${body.max_tokens}
${floatKey(body.temperature)}
${stopRepr(body.stop)}
${floatKey(body.presence_penalty)}
${floatKey(body.frequency_penalty)}`;
  }

  async getCompletion(prompt, usagePaths) {
    usagePaths = usagePaths || [];
    usagePaths = [...this.basePaths, ...usagePaths];
    usagePaths = this.resolvePaths(usagePaths);
    let requestBody = typeof prompt === "string" ? { prompt } : prompt;
    const noCache = requestBody.noCache;
    delete requestBody.noCache;
    requestBody = Object.assign({}, this.defaultPromptOptions, requestBody);
    const key = this.makeCacheKey(requestBody);
    if (!noCache) {
      let val = this.queryCache.get(key);
      if (val) {
        this.log.push({
          body: requestBody,
          type: "completion",
          fromCache: true,
          response: this.responseFixer(val.choices[0].text),
        });
        val = Object.assign({}, val);
        val.text = this.responseFixer(val.choices[0].text);
        this.updated();
        return val;
      }
    }
    const start = Date.now();
    const logItem = { body: requestBody, start, type: "completion" };
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

  deleteCache(body) {
    if (!body) {
      throw new Error("body not given");
    }
    const key = this.makeCacheKey(body);
    this.queryCache.delete(key);
    this.log = this.log.filter((l) => this.makeCacheKey(l.body) !== key);
  }

  async getChat(prompt, usagePaths) {
    usagePaths = usagePaths || [];
    usagePaths = [...this.basePaths, ...usagePaths];
    usagePaths = this.resolvePaths(usagePaths);
    prompt = normalizeGptChatPrompt(prompt);
    prompt = Object.assign({}, this.defaultChatOptions, prompt);
    const noCache = prompt.noCache;
    delete prompt.noCache;
    const key = `chat
${messageRepr(prompt.messages)}
${prompt.model}
${prompt.max_tokens}
${floatKey(prompt.temperature)}
${stopRepr(prompt.stop)}
${floatKey(prompt.presence_penalty)}
${floatKey(prompt.frequency_penalty)}`;
    if (!noCache) {
      let val = this.queryCache.get(key);
      if (val) {
        this.log.push({
          body: prompt,
          type: "chat",
          fromCache: true,
          response: this.responseFixer(val.choices[0].message.content),
        });
        val = Object.assign({}, val);
        val.text = this.responseFixer(val.choices[0].message.content);
        this.updated();
        return val;
      }
    }
    const start = Date.now();
    const logItem = { body: prompt, start, type: "chat" };
    this.log.push(logItem);
    this.updated();
    const resp = await getChat(prompt, usagePaths);
    console.log(
      "ChatGPT response",
      prompt.messages.map((m) => `${m.role}: ${m.content}`).join("\n") +
        "\n---------------\n" +
        this.responseFixer(resp.choices[0].message.content)
    );
    const cached = Object.assign({}, resp);
    cached.fromCache = true;
    this.queryCache.set(key, cached);
    logItem.response = this.responseFixer(resp.choices[0].message.content);
    logItem.time = Date.now() - start;
    resp.text = this.responseFixer(resp.choices[0].message.content);
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
        body: requestBody,
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
    const logItem = { body: requestBody, start, type: "edit" };
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

function messageRepr(messages) {
  if (!messages) {
    return "";
  }
  return messages.map((m) => `${m.role}: ${m.content}`).join("\n  ");
}
