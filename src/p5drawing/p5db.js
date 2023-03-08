import { ModelTypeStore } from "../db";
import { GptCache } from "../gptservice/gptcache";
import sha1 from "sync-sha1";

class P5Drawing {
  constructor(props) {
    props = props || {};
    this.gpt = new GptCache({
      storageName: "p5drawing",
      basePaths: [
        "p5drawing",
        () => this.envelope && `p5drawing/${this.envelope.slug}`,
      ],
      logResults: true,
      defaultPromptOptions: {
        temperature: 0.9,
        max_tokens: 1000,
      },
    });
    this._scriptHistory = (props.scriptHistory || []).map((s) =>
      Script.fromJSON(this, s)
    );
    if (!this._scriptHistory.length) {
      this._scriptHistory.push(
        new Script({ drawing: this, source: defaultScript })
      );
    }
    this._scriptHistoryPosition = -1;
    if (props.scriptHistoryPosition || props.scriptHistoryPosition === 0) {
      this._scriptHistoryPosition = props.scriptHistoryPosition;
    }
    this._logoScriptHash = props.logoScriptHash || null;
  }

  toJSON() {
    return {
      scriptHistory: this._scriptHistory,
      scriptHistoryPosition: this._scriptHistoryPosition,
      lastError: this._lastError,
      script: this._script,
      logoScriptHash: this._logoScriptHash,
    };
  }

  get scriptHistory() {
    return this._scriptHistory;
  }

  get script() {
    if (this._scriptHistoryPosition === -1) {
      return this.scriptHistory[this.scriptHistory.length - 1];
    } else {
      return this.scriptHistory[this._scriptHistoryPosition];
    }
  }

  checkpointScript() {
    this._scriptHistory.push(this.script.clone());
    this._scriptHistoryPosition = -1;
    this.updated();
  }

  undo() {
    const pos =
      this._scriptHistoryPosition === -1
        ? this._scriptHistory.length - 1
        : this._scriptHistoryPosition;
    if (pos === 0) {
      console.warn("Nothing to undo");
      return;
    }
    this._scriptHistoryPosition = pos - 1;
    this.updated();
  }

  redo() {
    const pos =
      this._scriptHistoryPosition === -1
        ? this._scriptHistory.length - 1
        : this._scriptHistoryPosition;
    if (pos >= this._scriptHistory.length - 1) {
      console.warn("Nothing to redo");
      return;
    }
    this._scriptHistoryPosition = pos + 1;
    this.updated();
  }

  async fixError() {
    // Note we keep the comment on the same line here to avoid adding one to the line number
    const prompt = `\
/* A p5.js script: */ ${this.script.source}

/* end */

/* Recreate the entire script, but fix the error:
${this.script.error.message} at line ${this.script.error.lineno} column ${this.script.error.colno} */
`;
    const response = await this.gpt.getCompletion({
      prompt,
      stop: ["/* end */"],
    });
    this.checkpointScript();
    this.script.source = response.text.trim();
    this.script.humanEdited = false;
    this.script.requestPrompt = "fix";
  }

  async completeScriptDescription() {
    if (!this.script.description) {
      const prompt = `\
/* a p5.js script: */
${this.script.source}

/* end */

/* A detailed description, formatted in Markdown, of what this script does:
`;
      const response = await this.gpt.getCompletion({
        prompt,
        stop: ["*/"],
      });
      const text = response.text.trim();
      this.script.description = text;
    }
    return this.script.description;
  }

  async completeDescription() {
    const prompt = `\
/* A p5.js script: */
${this.script.source}

/* end */

/* This result of this script can be described as (without using technical jargon):`;
    const response = await this.gpt.getCompletion({
      prompt,
      stop: ["*/"],
    });
    const text = response.text.trim();
    return text;
  }

  async completeTitle() {
    const prompt = `\
/* A p5.js script: */
${this.script.source}

/* end */

/* This script is titled (2-5 words):`;
    const response = await this.gpt.getCompletion({
      prompt,
      stop: ["*/"],
    });
    const text = response.text.trim().split(/\n/)[0].slice(0, 50);
    return text;
  }

  updated() {
    if (this.envelope) {
      this.envelope.updated();
    }
  }

  async processCommand(command) {
    command = command.trim();
    const c = command.toLowerCase();
    if (c === "undo") {
      this.undo();
      return;
    }
    if (c === "redo") {
      this.redo();
      return;
    }
    if (c === "fix" || c === "fix error" || c === "fix it") {
      await this.fixError();
      return;
    }
    await this.requestChange(command);
  }

  async requestChange(request) {
    const prompt = `/* A p5.js script: */

  ${this.script.source}

  /* end */

  /* Recreate the entire script with comments explaining the purpose of the code, but: ${request}
  Creating or remove functions as appropriate */
  `;
    const response = await this.gpt.getCompletion({
      prompt,
      stop: ["/* end */"],
    });
    this.checkpointScript();
    this.script.source = response.text.trim();
    this.humanEdited = false;
    this.requestPrompt = request;
    this.updated();
  }

  updateLogo(url) {
    if (this._logoScriptHash === this.script.hash) {
      return;
    }
    this._logoScriptHash = this.script.hash;
    this.envelope.logo = url;
    this.updated();
  }
}

class Script {
  constructor(props) {
    this.drawing = props.drawing || null;
    this._source = props.source || "";
    this._requestPrompt = props.requestPrompt || "";
    this._description = props.description || "";
    this._screenshot = props.screenshot || null;
    this._humanEdited = props.humanEdited || false;
    this._error = props.error || null;
    // Note this derives from source so this is just a cache:
    this._hash = null;
    this._hashSource = null;
  }

  toJSON() {
    return {
      source: this.source,
      requestPrompt: this.requestPrompt,
      description: this.description,
      screenshot: this.screenshot,
      humanEdited: this.humanEdited,
      error: this.error,
    };
  }

  clone() {
    return new Script(Object.assign({ drawing: this.drawing }, this.toJSON()));
  }

  get hash() {
    if (this._hashSource !== this.source) {
      this._hash = sha1(this.source).toString("hex");
      this._hashSource = this.source;
    }
    return this._hash;
  }

  get source() {
    return this._source;
  }

  set source(value) {
    this._source = value;
    this._hash = null;
    this._hashSource = null;
    this._description = null;
    this._screenshot = null;
    this._error = null;
    this.drawing.updated();
  }

  get requestPrompt() {
    return this._requestPrompt;
  }

  set requestPrompt(value) {
    this._requestPrompt = value;
    this.drawing.updated();
  }

  get description() {
    return this._description;
  }

  set description(value) {
    this._description = value;
    this.drawing.updated();
  }

  get screenshot() {
    return this._screenshot;
  }

  set screenshot(value) {
    this._screenshot = value;
    this.drawing.updated();
  }

  get humanEdited() {
    return this._humanEdited;
  }

  set humanEdited(value) {
    this._humanEdited = value;
    this.drawing.updated();
  }

  get error() {
    return this._error;
  }

  set error(value) {
    this._error = value;
    this.drawing.updated();
  }
}

Script.fromJSON = function (drawing, json) {
  if (!(json instanceof Script)) {
    json = new Script(json);
  }
  json.drawing = drawing;
  return json;
};

const defaultScript = `\
function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(220);
  ellipse(200, 200, 100, 100);
}`;

const builtins = [];

export const p5Db = new ModelTypeStore("p5drawing", P5Drawing, builtins);
