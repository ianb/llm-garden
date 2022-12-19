import { ModelTypeStore } from "../db";
import { GptCache } from "../gptservice/gptcache";
import { speak } from "../components/speech";

class Tone {
  constructor(props) {
    props = props || {};
    this.prompt = props.prompt || defaultPrompt;
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
    if (!text) {
      throw new Error("No text to speak");
    }
    return speak(text, this.outputLanguage, this.voice);
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

const defaultPrompt = `
Change speech to sound like [description]

Input:
Output:

Input: $input
Output:`.trim();

const builtins = [
  {
    slug: "posh-english-lady",
    title: "Posh English lady",
    domain: {
      prompt:
        "Change speech to sound like a posh and sophisticated English woman. Use fancy words and English colloquialisms.\n\nInput: bye\nOutput: Cheerio\n\nInput: $input\nOutput:",
      voice: "Google UK English Female",
      utterances: [],
      outputLanguage: "en-UK",
    },
  },
];

export const toneDb = new ModelTypeStore("tone", Tone, builtins);
