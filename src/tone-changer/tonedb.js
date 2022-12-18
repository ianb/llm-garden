import { ModelTypeStore } from "../db";
import { GptCache } from "../gptservice/gptcache";

class Tone {
  constructor(props) {
    props = props || {};
    this.prompt = props.prompt;
    this.voice = props.voice;
    this.outputLanguage = props.outputLanguage || "en-US";
    this.gpt = new GptCache({
      storageName: "tone-changer",
      basePaths: ["tone-changer"],
      logResults: true,
    });
    this.utterances = [];
  }

  async translate(input) {
    let prompt = this.prompt;
    prompt = prompt.replace("$input", input);
    const item = { input: input };
    item.prompt = prompt;
    this.utterances.push(item);
    this.updated();
    const resp = await this.gpt.getCompletion(prompt);
    item.output = resp.text;
    this.speak(resp.text);
    this.updated();
  }

  speak(text) {
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = this.outputLanguage;
    utt.voice = speechSynthesis.getVoices().find((v) => v.name === this.voice);
    speechSynthesis.speak(utt);
  }

  toJSON() {
    return {
      prompt: this.prompt,
      voice: this.voice,
      utterances: this.utterances,
      outputLanguage: this.outputLanguage,
    };
  }

  updated() {
    if (this.envelope) {
      this.envelope.updated();
    }
  }

  get prompt() {
    return this._prompt;
  }

  set prompt(value) {
    this._prompt = value;
    this.updated();
  }

  get voice() {
    return this._voice;
  }

  set voice(value) {
    this._voice = value;
    this.updated();
  }

  get outputLanguage() {
    return this._outputLanguage;
  }

  set outputLanguage(value) {
    this._outputLanguage = value;
    this.updated();
  }
}

const builtins = [
  {
    title: "Fancy",
    domain: {
      prompt: "Make this fancy",
      voice: "Alex",
    },
  },
];

export const toneDb = new ModelTypeStore("tone", Tone, builtins);
