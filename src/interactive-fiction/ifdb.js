import { ModelTypeStore } from "../db";
import { GptCache } from "../gptservice/gptcache";

class InteractiveFiction {
  constructor(props) {
    props = props || {};
    this.z5url = props.z5url;
    this.gpt = new GptCache({
      storageName: "interactive-fiction",
      basePaths: [
        "interactive-fiction",
        () => this.envelope && this.envelope.slug,
      ],
      logResults: true,
    });
  }

  toJSON() {
    return {
      z5url: this.z5url,
    };
  }

  updated() {
    if (this.envelope) {
      this.envelope.updated();
    }
  }
}

const builtins = Object.entries({
  "zork1.z5": { title: "Zork I" },
  "zork2.z5": { title: "Zork II" },
  "zork3.z5": { title: "Zork III" },
  "ztuu.z5": { title: "Zork: The Undiscovered Underground" },
  "Advent.z5": { title: "Colossal Cave Adventure" },
  "s5.z4": { title: "A Mind Forever Voyaging" },
}).map(([z5url, props]) => {
  return {
    title: props.title,
    domain: {
      z5url,
    },
  };
});

export const ifDb = new ModelTypeStore(
  "interactive-fiction",
  InteractiveFiction,
  builtins
);

window.ifDb = ifDb;
