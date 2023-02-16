import { ModelTypeStore } from "../db";
import { GptCache } from "../gptservice/gptcache";

class PeopleSim {
  constructor(props) {
    props = props || {};
    this.gpt = new GptCache({
      storageName: "peoplesim",
      basePaths: [
        "peoplesim",
        () => this.envelope && `chat/${this.envelope.slug}`,
      ],
      logResults: true,
      defaultPromptOptions: {
        temperature: 0.8,
        max_tokens: 240,
      },
    });
  }
}

export const peopleDb = new ModelTypeStore("peoplesim", PeopleSim, []);
