import { ModelTypeStore } from "../db";
import { GptCache } from "../gptservice/gptcache";

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
  }

  toJSON() {
    const data = {};
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
