import { ModelTypeStore } from "../db";
import { GptCache } from "../gptservice/gptcache";

const defaultUndoSaveLimit = 5;

export class VoiceComposer {
  constructor(props) {
    props = props || {};
    this.gpt = new GptCache({
      storageName: "voice",
      basePaths: [
        "voice",
        () => this.envelope && `voice/${this.envelope.slug}`,
      ],
      logResults: true,
      defaultPromptOptions: {
        temperature: 0.5,
        max_tokens: 120,
      },
    });
    this._text = props.text || "";
    this._undoSaveLimit =
      props.undoSaveLimit === undefined
        ? defaultUndoSaveLimit
        : props.undoSaveLimit;
    this._undos = props.undo || [];
    this._redos = [];
    this._hypothesis = "";
  }

  get text() {
    return this._text;
  }

  set text(value) {
    if (value === this._text) {
      console.log("Tried to set text to the same value");
      return;
    }
    this._undos.push({
      text: this._text,
    });
    this._text = value;
    this.updated();
  }

  get hypothesis() {
    return this._hypothesis;
  }

  set hypothesis(value) {
    this._hypothesis = value;
    this.updated();
  }

  async addUtterance(utterance) {
    this.hypothesis = "";
    if (await this.specialUtterance(utterance)) {
      return;
    }
    this.text += " " + utterance.trim();
    this._redos = [];
  }

  async specialUtterance(utterance) {
    utterance = utterance.trim();
    if (/^undo$/i.test(utterance)) {
      this.undo();
      return true;
    }
    if (/^redo$/i.test(utterance)) {
      this.redo();
      return true;
    }
    if (/^(make|change|edit|fix)\b/i.test(utterance)) {
      const resp = await this.gpt.getEdit({
        input: this.text,
        instruction: utterance,
      });
      this.text = resp.text;
      return true;
    }
    return false;
  }

  undo() {
    if (this._undos.length === 0) {
      console.log("Nothing to undo");
      return;
    }
    const last = this._undos.pop();
    this._redos.push({ text: this._text });
    this._text = last.text;
    this.updated();
  }

  redo() {
    if (this._redos.length === 0) {
      console.log("Nothing to redo");
      return;
    }
    const last = this._redos.pop();
    this._undos.push({ text: this._text });
    this._text = last.text;
    this.updated();
  }

  toJSON() {
    const data = {
      text: this.text,
      undo: this._undos.slice(-this._undoSaveLimit),
      undoSaveLimit:
        this._undoSaveLimit === defaultUndoSaveLimit
          ? undefined
          : this._undoSaveLimit,
    };
    return data;
  }

  updated() {
    if (this.envelope) {
      this.envelope.updated();
    }
  }
}

const builtins = [
  {
    title: "Sample document",
    description: "...",
    domain: {},
  },
];

export const voiceDb = new ModelTypeStore("voice", VoiceComposer, builtins);
