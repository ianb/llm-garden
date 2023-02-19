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
    return speak(text, this.voice, this.outputLanguage);
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
    title: "Posh English lady",
    description:
      "Change your tone to use fancy words and English colloquialisms.",
    domain: {
      prompt:
        "Change speech to sound like a posh and sophisticated English woman. Use fancy words and English colloquialisms.\n\nInput: bye\nOutput: Cheerio\n\nInput: $input\nOutput:",
      voice: "Google UK English Female",
      utterances: [],
      outputLanguage: "en-UK",
    },
  },
  {
    title: "Painfully academic",
    description: "Change your speech to use long words and complex syntax.",
    domain: {
      prompt:
        "Change speech to sound like an Academic, someone with a PhD that uses very long words and complicated language to explain things\n\nInput: that falls down because of gravity\nOutput: the acceleration towards earth will increase due to gravitational forces\n\nInput: $input\nOutput:",
      outputLanguage: "en-US",
    },
  },
  {
    title: "Preschool teacher",
    description:
      "Change your speech to sound like the sometimes saccharine phrasing of a preschool teacher",
    domain: {
      prompt:
        "Change speech to sound like a preschool teacher talking to a 3-year old boy. Use simple and saccharine language.\n\nInput: You did really well!\nOutput: Aren't you just the most adorable and hard working little boy?\n\nInput: $input\nOutput:",
      outputLanguage: "en-US",
    },
  },
  {
    title: "Formal Spanish",
    description: "Translate to Spanish, using a formal style of speech.",
    domain: {
      prompt:
        "Change speech to be Spanish, using a formal style\n\nInput: How are you?\nOutput: ¿Cómo está usted?\n\nInput: $input\nOutput:",
      voice: "Google español",
      outputLanguage: "es-ES",
    },
  },
  {
    title: "Malfunctioning Robot",
    description: "A robot that is malfunctioning in disturbing ways.",
    domain: {
      prompt:
        "Change speech to sound a creepy robot that is going insane. Keep the original intent of the input, but add strange or disturbing parts to the output.\n\nInput:\nOutput:\n\nInput: $input\nOutput:",
      voice: "Alex",
      outputLanguage: "en-US",
    },
  },
];

export const toneDb = new ModelTypeStore("tone", Tone, builtins);
