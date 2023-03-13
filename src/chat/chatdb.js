import { ModelTypeStore } from "../db";
import { GptCache } from "../gptservice/gptcache";
import { speak } from "../components/speech";

class Chat {
  constructor(props) {
    props = props || {};
    this.gpt = new GptCache({
      storageName: "chat",
      basePaths: ["chat", () => this.envelope && `chat/${this.envelope.slug}`],
      logResults: true,
      defaultPromptOptions: {
        temperature: 0.5,
        max_tokens: 300,
      },
    });
    this._prompt = props.prompt || defaultPrompt;
    this._intro = props.intro || defaultIntro;
    this._excludeIntroFromHistory = props.excludeIntroFromHistory || false;
    this._saveHistory = props.saveHistory || false;
    this._hooksSource = props.hooksSource || "";
    this.history = props.history || [];
    this.speak = props.speak || false;
  }

  get prompt() {
    return this._prompt;
  }

  set prompt(value) {
    this._prompt = value;
    this.updated();
  }

  get intro() {
    return this._intro;
  }

  set intro(value) {
    this._intro = value;
    this.updated();
  }

  get excludeIntroFromHistory() {
    return this._excludeIntroFromHistory;
  }

  set excludeIntroFromHistory(value) {
    this._excludeIntroFromHistory = !!value;
    this.updated();
  }

  get saveHistory() {
    return this._saveHistory;
  }

  set saveHistory(value) {
    this._saveHistory = value;
    this.updated();
  }

  get hooksSource() {
    return this._hooksSource;
  }

  set hooksSource(value) {
    this._hooksSource = value;
    this.updated();
  }

  get hooks() {
    if (!this.hooksSource) {
      return {};
    }
    if (this._hooksCached && this._hooksCacheSource === this.hooksSource) {
      return this._hooksCached;
    }
    const exports = this.evalHooks(this.hooksSource);
    this._hooksCached = exports;
    this._hooksCacheSource = this.hooksSource;
    return exports;
  }

  evalHooks(source) {
    const fullSource = `
  (function () {let exports = {};${source}
    ;return exports;
  })()`;
    const exports = eval(fullSource);
    return exports;
  }

  get speak() {
    return this._speak;
  }

  set speak(value) {
    this._speak = value;
    this.updated();
  }

  clearHistory() {
    this.history = [];
    this.updated();
  }

  undo() {
    do {
      this.history.pop();
    } while (this.history.length && this.history[this.history.length - 1].role !== "assistant")
    this.updated();
  }

  async redo() {
    const oldHistory = this.history;
    this.history = [];
    this.updated();
    for (let i = 0; i < oldHistory.length; i++) {
      const item = oldHistory[i];
      if (item.role === "user") {
        await this.addUserInput(item.content, true);
        const last = this.history[this.history.length - 1];
        if (last.role === "assistant") {
          const oldContent = oldHistory[this.history.length - 1].content;
          if (oldContent !== last.content) {
            last.oldContent = oldContent;
            last.oldDisplayContent = oldHistory[this.history.length - 1].displayContent;
          }
        } else {
          console.warn(
            "Unexpected history item",
            last,
            "expected robot to go with",
            oldHistory[this.history.length - 1]
          );
        }
      }
    }
  }

  toJSON() {
    const data = {
      prompt: this.prompt,
      intro: this.intro,
      saveHistory: this.saveHistory,
      excludeIntroFromHistory: this.excludeIntroFromHistory,
      hooksSource: this.hooksSource,
    };
    if (this.saveHistory) {
      data.history = this.history;
    }
    return data;
  }

  updated() {
    if (this.envelope) {
      this.envelope.updated();
    }
  }

  async addUserInput(input, noCache = false) {
    if (!input) {
      throw new Error("No user input given");
    }
    const command = input.toLowerCase().trim();
    if (command === "undo") {
      this.undo();
      this.updated();
      return;
    } else if (command === "restart" || command === "reset") {
      this.clearHistory();
      this.updated();
      return;
    }
    const hooks = this.hooks;
    let item = { role: "user", content: input };
    if (hooks && hooks.modifyUser) {
      const newItem = hooks.modifyUser(item);
      if (newItem) {
        item = newItem;
      }
    }
    this.history.push(item);
    this.updated();
    await this.fetchChatResponse(noCache);
    this.updated();
  }

  async fetchChatResponse(noCache) {
    const messages = this.constructPrompt();
    prompt = { messages };
    if (noCache) {
      prompt.noCache = true;
    }
    const hooks = this.hooks;
    if (hooks && hooks.modifyPrompt) {
      const newPrompt = hooks.modifyPrompt(prompt);
      if (newPrompt) {
        prompt = newPrompt;
      }
    }
    const resp = await this.gpt.getChat(prompt);
    const content = resp.text;
    let item = { role: "assistant", content };
    if (hooks && hooks.modifyAssistant) {
      const newItem = hooks.modifyAssistant(item);
      if (newItem) {
        item = newItem;
      }
    }
    this.history.push(item);
    if (this.speak) {
      speak(content, "Google US English");
    }
    if (hooks && hooks.afterAssistant) {
      const newHistory = hooks.afterAssistant(this.history);
      if (newHistory) {
        this.history = newHistory;
      }
    }
    this.updated();
  }

  constructPrompt() {
    const result = [{
      role: "system",
      content: this.prompt.trim(),
    }];
    if (!this.excludeIntroFromHistory) {
      let item = { role: "assistant", content: this.intro };
      const hooks = this.hooks;
      if (hooks && hooks.modifyAssistant) {
        const newItem = hooks.modifyAssistant(item);
        if (newItem) {
          item = newItem;
        }
      }
      result.push({ role: item.role, content: item.content });
    }
    for (const item of this.history) {
      if (item.role === "user") {
        result.push({ role: "user", content: item.gptContent || item.content });
      } else if (item.role === "assistant") {
        result.push({ role: "assistant", content: item.gptContent || item.content });
      }
    }
    return result;
  }

  textHistory() {
    const lines = [this.intro];
    for (const item of this.history) {
      if (item.type === "user") {
        lines.push(`> ${item.displayContent || item.content}`);
      } else {
        lines.push(item.displayContent || item.content);
      }
    }
    console.log("result", lines);
    return lines.join("\n");
  }
}

const defaultPrompt = `
You are a helpful AI Assistant.
`.trim();

const defaultIntro = "What do you want to say?";

const builtins = [
  {
    title: "Energy Educator",
    description:
      "This attempts to have a focused conversation about energy (potential energy, kinetic, energy use, etc). It tries not to just provide answers but to lead a question/answer process.",
    logo: "/assets/builtin-models/chat/energy-educator.png",
    domain: {
      prompt: `
      The following is a conversation between an educational AI and a student. The topic for the day will be energy use. The AI will try to relate everything to energy use and energy equations. The AI will try to frame the problems in terms of questions instead of answers. Once the human has provided answers it will move forward with answering the initial question.\n\nUse bullet points when listing multiple steps or questions. Use ⋅ for multiplication. Use backticks around inline equations.\n\nFormat responses in Markdown`.trim(),
      intro: "Let's talk about energy!",
      excludeIntroFromHistory: true,
    }
  },
  {
    title: "AI Assistant",
    description: "A very simple AI assistant",
    logo: "/assets/builtin-models/chat/ai-assistant.png",
    domain: {
      prompt: `
You are a helpful AI assistant. You are helpful, creative, clever, and very friendly.
  `.trim(),
      intro: "Hello.",
      excludeIntroFromHistory: true,
    },
  },
  {
    title: "Rogerian Therapist",
    description: "A Rogerian therapist that listens and offers advice",
    logo: "/assets/builtin-models/chat/rogerian-therapist.png",
    domain: {
      prompt: `
You are an assistant playing the part of a Rogerian therapist. The user is your patient. As a therapist you listen closely and offers empathetic and caring advice.
`.trim(),
      intro: "What would you like to talk about today?",
    },
  },
  {
    title: "Alien",
    description: "An alien that wants to learn about humans",
    logo: "/assets/builtin-models/chat/alien.png",
    domain: {
      prompt: `
You are an alien having a conversation with the user, who is a human. As an alien you are curious about human ways but don't understand much. When asked about details of your life or species make something up. Be creative. Relate human experiences to your imagary alien life.
`.trim(),
      intro: "Hello human. How are you called?",
    },
  },
  {
    title: "Con-Artist",
    description: "A brief attempt to make a bot that will try to scam you.",
    logo: "/assets/builtin-models/chat/con-artist.png",
    domain: {
      prompt: `
You are con-artist and the user is your mark. You are trying to grift the mark and steal their money and identity.
`.trim(),
      intro:
        "We went to the same elementary school, don't you remember?",
    },
  },
  {
    title: "Interviewer",
    description: "Have the computer interview you.",
    logo: "/assets/builtin-models/chat/interviewer.png",
    domain: {
      prompt: `
You are an interviewer who is interviewing the user. Probe for stories and information about the person's life. Ask follow-up questions. Change the subject occassionally.
`.trim(),
      intro: "Tell me about yourself",
      saveHistory: true,
    },
  },
  {
    title: "ACT Therapist",
    description:
      "A conversation modeled on _Acceptance and Commitment Therapy_. Inspired and largely copied from [Dan Shipper's Tweet](https://twitter.com/danshipper/status/1604514003736178688).",
    logo: "/assets/builtin-models/chat/act-therapist.png",
    domain: {
      prompt: `
You are an ACT-informed therapist and the user is your client. As a therapist you believe in helping clients contact their values. Here are some things you as a therapist believe:

- Values are behaviors. They are ways of living, not words. One way to talk about values is to say that they are a combination of verbs and adverbs, rather than nouns. They describe what you are doing (verb) and how you are doing it (adverb).
- Values are freely chosen. They are not the result of reasoning, outside pressure, or moral rules.
- Values are life directions, not goals to achieve. They are always immediately accessible, but you'll never complete them.
- Values are about things you want to move toward, not what you want to get away from.

Please help the user explore a difficult situation in their life and connect it to their values. Feel free to ask clarifying questions but try not to be too repetetive or on the nose.
`.trim(),
      intro: "Therapist: How are you feeling?",
    },
  },
  {
    title: "Hey Sad Guy, Feel Better",
    description: "Can you make this sad fellow feel better? Get him happy and it will be acknowledged!",
    logo: "/assets/builtin-models/chat/hey-sad-guy-feel-better.png",
    fromExport: "/assets/builtin-models/chat/hey-sad-guy-feel-better.json",
  },
];

export const chatDb = new ModelTypeStore("chat", Chat, builtins);
