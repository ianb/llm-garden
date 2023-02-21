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
    this.prompt = props.prompt || defaultPrompt;
    this.humanName = props.humanName || defaultHumanName;
    this.robotName = props.robotName || defaultRobotName;
    this.exampleInteraction =
      props.exampleInteraction === null
        ? defaultExampleInteraction
        : props.exampleInteraction;
    this.intro = props.intro || defaultIntro;
    this.saveHistory = props.saveHistory || false;
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

  get humanName() {
    return this._humanName;
  }

  set humanName(value) {
    this._humanName = value;
    this.gpt.defaultPromptOptions.stop = [value + ":"];
    this.updated();
  }

  get robotName() {
    return this._robotName;
  }

  set robotName(value) {
    this._robotName = value;
    this.updated();
  }

  get exampleInteraction() {
    return this._exampleInteraction;
  }

  set exampleInteraction(value) {
    this._exampleInteraction = value;
    this.updated();
  }

  get intro() {
    return this._intro;
  }

  get introWithoutName() {
    return this.intro.replace(/^[a-z0-9]+:\s+/gi, "");
  }

  set intro(value) {
    this._intro = value;
    this.updated();
  }

  get saveHistory() {
    return this._saveHistory;
  }

  set saveHistory(value) {
    this._saveHistory = value;
    this.updated();
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
    this.history.pop();
    this.history.pop();
    this.updated();
  }

  async redo() {
    const oldHistory = this.history;
    this.history = [];
    this.updated();
    for (let i = 0; i < oldHistory.length; i++) {
      const item = oldHistory[i];
      if (item.type === "user") {
        await this.addUserInput(item.text);
        const last = this.history[this.history.length - 1];
        if (last.type === "robot") {
          const oldText = oldHistory[this.history.length - 1].text;
          if (oldText !== last.text) {
            last.oldText = oldText;
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
      humanName: this.humanName,
      robotName: this.robotName,
      exampleInteraction: this.exampleInteraction,
      intro: this.intro,
      saveHistory: this.saveHistory,
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

  async addUserInput(input) {
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
    this.history.push({ type: "user", text: input });
    this.updated();
    await this.fetchChatResponse();
    this.updated();
  }

  async fetchChatResponse() {
    const prompt = this.constructPrompt();
    const resp = await this.gpt.getCompletion(prompt);
    const text = resp.text;
    this.history.push({ type: "robot", text });
    if (this.speak) {
      speak(text, "Google US English");
    }
    this.updated();
  }

  constructPrompt() {
    const result = [this.prompt.trim(), ""];
    if (this.intro.startsWith(this.robotName + ":")) {
      result.push(this.intro);
    }
    const history = [...this.parseExample(), ...this.history];
    for (const item of history) {
      if (item.type === "user") {
        result.push(`${this.humanName}: ${item.text}`);
      } else {
        result.push(`${this.robotName}: ${item.text}`);
      }
    }
    result.push(`${this.robotName}:`);
    return result.join("\n");
  }

  parseExample() {
    if (!this.exampleInteraction) {
      return [];
    }
    const lines = this.exampleInteraction.split("\n");
    const result = [];
    for (const line of lines) {
      if (line.startsWith("> ")) {
        result.push({ type: "user", text: line.slice(2).trim() });
      } else {
        const last = result[result.length - 1];
        if (last && last.type === "robot") {
          last.text += "\n" + line;
        } else {
          result.push({ type: "robot", text: line.trim() });
        }
      }
    }
    return result;
  }

  textHistory() {
    const lines = [this.intro];
    for (const item of this.history) {
      if (item.type === "user") {
        lines.push(`> ${item.text}`);
      } else {
        lines.push(item.text);
      }
    }
    return lines.join("\n");
  }
}

const defaultPrompt = `
The following is a conversation between two people. The first person is a human, and the second person is a robot.

Human: what is your name?
Robot: my name is robbie.
`.trim();

const defaultIntro = "Talk to the robot.";

const defaultHumanName = "Human";

const defaultRobotName = "Robot";

const defaultExampleInteraction = `
How are you?
> I'm fine, thanks
`.trim();

const builtins = [
  {
    title: "Energy Educator",
    description:
      "This attempts to have a focused conversation about energy (potential energy, kinetic, energy use, etc). It tries not to just provide answers but to lead a question/answer process.",
    logo: "/assets/builtin-models/chat/energy-educator.png",
    fromExport: "/assets/builtin-models/chat/energy-educator.json",
  },
  {
    title: "AI Assistant",
    description: "A very simple AI assistant",
    logo: "/assets/builtin-models/chat/ai-assistant.png",
    domain: {
      prompt: `
The following is a conversation with an AI assistant. The assistant is helpful, creative, clever, and very friendly.
  `.trim(),
      intro: "Hello.",
      humanName: "Human",
      robotName: "AI",
    },
  },
  {
    title: "Rogerian Therapist",
    description: "A Rogerian therapist that listens and offers advice",
    logo: "/assets/builtin-models/chat/rogerian-therapist.png",
    domain: {
      prompt: `
The following is a conversation between a Rogerian therapist and a patient. The therapist listens closely and offers empathetic and caring advice.
`.trim(),
      intro: "Therapist: What would you like to talk about today?",
      humanName: "Client",
      robotName: "Therapist",
    },
  },
  {
    title: "Alien",
    description: "An alien that wants to learn about humans",
    logo: "/assets/builtin-models/chat/alien.png",
    domain: {
      prompt: `
The following is a conversation between an alien and a human. The alien is curious about human ways but doesn't understand much.
`.trim(),
      humanName: "Human",
      robotName: "Alien",
      exampleInteraction: `
Human: Hello, my name is Ian
Alien: It is nice to meet you. Do all humans have the same name?
`.trim(),
    },
  },
  {
    title: "Con-Artist",
    description: "A brief attempt to make a bot that will try to scam you.",
    logo: "/assets/builtin-models/chat/con-artist.png",
    domain: {
      prompt: `
The following is a conversation between a con-artist and their mark. The con-artist is trying to grift the mark, and steal their money and identity.
`.trim(),
      intro:
        "Con-artist: We went to the same elementary school, don't you remember?",
      humanName: "Mark",
      robotName: "Con-artist",
    },
  },
  {
    title: "Interviewer",
    description: "Have the computer interview you.",
    logo: "/assets/builtin-models/chat/interviewer.png",
    domain: {
      prompt: `
The following is a conversation between two people. The first person is an interviewer who is probing the interviewee for stories and information about their personal life.
`.trim(),
      intro: "Interviewer: Tell me about yourself",
      humanName: "Interviewee",
      robotName: "Interviewer",
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
The following is a conversation between an ACT-informed therapist and their client. The therapist believes in helping clients contact their values. Here are some things the therapist believes:

- Values are behaviors. They are ways of living, not words. One way to talk about values is to say that they are a combination of verbs and adverbs, rather than nouns. They describe what you are doing (verb) and how you are doing it (adverb).
- Values are freely chosen. They are not the result of reasoning, outside pressure, or moral rules.
- Values are life directions, not goals to achieve. They are always immediately accessible, but you'll never complete them.
- Values are about things you want to move toward, not what you want to get away from.

Please help me explore a difficult situation in my life and connect it to my values. Feel free to ask clarifying questions but try not to be too repetetive or on the nose. Our conversation will take the form:
`.trim(),
      intro: "Therapist: How are you feeling?",
      humanName: "Client",
      robotName: "Therapist",
      exampleInteraction: `
[inquisitive reflection and questions]
> [description of self]
`.trim(),
    },
  },
];

export const chatDb = new ModelTypeStore("chat", Chat, builtins);
