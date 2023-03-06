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
    this._scriptHistory = props.scriptHistory || [];
    this._lastError = props.lastError || null;
    this._script = props.script || defaultScript;
    this._logoScriptHash = props.logoScriptHash || null;
  }

  toJSON() {
    return {
      scriptHistory: this._scriptHistory,
      lastError: this._lastError,
      script: this._script,
      logoScriptHash: this._logoScriptHash,
    };
  }

  get script() {
    return this._script;
  }

  set script(value) {
    this._script = value;
    this._lastError = null;
    this.updated();
  }

  get scriptHash() {
    return sha1(this.script).toString("hex");
  }

  get scriptHistory() {
    return this._scriptHistory;
  }

  checkpointScript() {
    this._scriptHistory.push(this.script);
    this.updated();
  }

  undo() {
    for (let i = this._scriptHistory.length - 1; i >= 0; i--) {
      if (this._scriptHistory[i] === this.script) {
        if (i === 0) {
          this.checkpointScript();
          this.script = this._scriptHistory[this._scriptHistory.length - 2];
          return;
        }
        this.script = this._scriptHistory[i - 1];
        return;
      }
    }
    // We didn't find it anywhere, so it must not have been checkpointed yet
    this.checkpointScript();
    this.script = this._scriptHistory[this._scriptHistory.length - 2];
  }

  redo() {
    for (let i = this._scriptHistory.length - 1; i >= 0; i--) {
      if (this._scriptHistory[i] === this.script) {
        if (i === this._scriptHistory.length - 1) {
          console.warn("Nothing to redo");
          return;
        }
        this.script = this._scriptHistory[i + 1];
        return;
      }
    }
  }

  addError(errorDescription) {
    this._lastError = errorDescription;
    this.updated();
  }

  get lastError() {
    return this._lastError;
  }

  async fixError() {
    const prompt = `\
/* A p5.js script: */  ${this.script}

/* end */

/* Recreate the entire script, but fix the error:
${this.lastError.message} at line ${this.lastError.lineno} column ${this.lastError.colno} */
`;
    const response = await this.gpt.getCompletion({
      prompt,
      stop: ["/* end */"],
    });
    this.checkpointScript();
    this.script = response.text.trim();
  }

  async completeDescription() {
    const prompt = `\
/* A p5.js script: */
${this.script}

/* end */

/* This script does:`;
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
${this.script}

/* end */

/* This script is titled:`;
    const response = await this.gpt.getCompletion({
      prompt,
      stop: ["*/"],
    });
    const text = response.text.trim().slice(0, 50);
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

  ${this.script}

  /* end */

  /* Recreate the entire script with comments explaining the purpose of the code, but: ${request} */
  `;
    const response = await this.gpt.getCompletion({
      prompt,
      stop: ["/* end */"],
    });
    this.checkpointScript();
    this.script = response.text.trim();
  }

  updateLogo(url) {
    if (this._logoScriptHash === this.scriptHash) {
      return;
    }
    this._logoScriptHash = this.scriptHash;
    this.envelope.logo = url;
    this.updated();
  }
}

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
