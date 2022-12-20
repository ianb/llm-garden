import { ModelTypeStore } from "../db";
import { GptCache } from "../gptservice/gptcache";
import { signal } from "@preact/signals";

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
      defaultPromptOptions: {
        temperature: 0.5,
        max_tokens: 40,
      },
    });
    this.io = [];
    this.history = [];
    this.historyIndex = -1;
    this.historyInProgress = "";
    this.textOutputSignal = signal("");
    this.statusTextSignal = signal("");
    this.statusSummarySignal = signal("");
    this.completionSignal = signal("");
    this.inputEnabledSignal = signal(false);
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

  /**** zcode integration ****/

  enableRead() {
    this.inputEnabledSignal.value = true;
  }

  /**** Filling in ****/

  fillIn() {
    this.doFill(false, 1);
  }

  fillInAndComplete() {
    this.doFill(true, 1);
  }

  fillInMany(num) {
    this.doFill(true, num);
  }

  async doFill(complete, num = 1) {
    if (num <= 0) {
      return undefined;
    }
    const text = this.constructPrompt();
    console.log("Doing request for", text);
    const resp = await this.gpt.getCompletion(text);
    const completion = resp.text.split("\n")[0];
    console.log("Got response:", resp, completion);
    this.completionSignal.value = completion;
    if (complete) {
      this.onInput(completion);
    }
    return this.doFill(complete, num - 1);
  }

  /**** Prompts ****/

  constructPrompt() {
    const history = 20;
    const result = this.filterChunks(this.io, history);
    return `Playing a text adventure:\n\n${result.trimEnd()}`;
  }

  filterChunks(io, count) {
    const originalCount = count;
    io = [...io];
    const result = [];
    while (count > 0) {
      if (io.length === 0) {
        break;
      }
      const last = io.length - 1;
      if (
        count !== originalCount &&
        io.length >= 2 &&
        io[last].type === "output" &&
        this.badResponse(io[last].value) &&
        io[last - 1].type === "input"
      ) {
        console.log("Ignoring:", io[last].value);
        io.pop();
        io.pop();
        continue;
      }
      let v = io[last].value;
      if (io[last].type === "input") {
        v += "\n";
      }
      result.unshift(v);
      io.pop();
      count--;
    }
    return result.join("");
  }

  badResponse(output) {
    return /I don't know the word|You can't go that way/i.test(output);
  }

  /**** IO ****/

  print(msg) {
    this.textOutputSignal.value = this.textOutputSignal.value + msg;
    if (this.io.length && this.io[this.io.length - 1].type === "output") {
      this.io[this.io.length - 1].value += msg;
    } else {
      this.io.push({ type: "output", value: msg });
    }
  }

  onInput(t) {
    if (!t) {
      console.warn("Got onInput(empty)");
      return;
    }
    if (this.onReadOnce) {
      this.onReadOnce(t);
      this.onReadOnce = null;
    } else {
      console.warn("Got text without onReadOnce:", t);
    }
    this.textOutputSignal.value = this.textOutputSignal.value + t + "\n";
    this.io.push({ type: "input", value: t });
    this.history.push(t);
    this.historyIndex = -1;
    this.historyInProgress = "";
    this.inputEnabledSignal.value = false;
  }

  updateStatusLine(text, summary) {
    this.statusTextSignal.value = text;
    this.statusSummarySignal.value = summary;
  }

  retrieveHistory(dir, existingInput) {
    if (this.historyIndex === -1) {
      if (dir === 1) {
        return existingInput;
      }
      this.historyInProgress = existingInput;
      this.historyIndex = this.history.length - 1;
      return this.history[this.historyIndex];
    }
    if (dir === 1) {
      this.historyIndex++;
      if (this.historyIndex >= this.history.length) {
        this.historyIndex = -1;
        return this.historyInProgress;
      }
      return this.history[this.historyIndex];
    }
    this.historyIndex--;
    if (this.historyIndex < 0) {
      this.historyIndex = -1;
      return this.historyInProgress;
    }
    return this.history[this.historyIndex];
  }
}

const builtins = Object.entries({
  "zork1.z5": { title: "Zork I" },
  "zork2.z5": { title: "Zork II" },
  "zork3.z5": { title: "Zork III" },
  // None of these are version 3 zcodes, so they aren't supported :(
  // "ztuu.z5": { title: "Zork: The Undiscovered Underground" },
  // "Advent.z5": { title: "Colossal Cave Adventure" },
  // "s5.z4": { title: "A Mind Forever Voyaging" },
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
