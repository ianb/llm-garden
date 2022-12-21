import { ModelTypeStore } from "../db";
import { GptCache } from "../gptservice/gptcache";
import { speak } from "../components/speech";

class Chat {
  constructor(props) {
    props = props || {};
    this.gpt = new GptCache({
      storageName: "chat",
      basePaths: ["chat", () => this.envelope && this.envelope.slug],
      logResults: true,
      defaultPromptOptions: {
        temperature: 0.5,
        max_tokens: 120,
      },
    });
    this.prompt = props.prompt || defaultPrompt;
    this.intro = props.intro || defaultIntro;
    this.humanFirst = props.humanFirst || false;
    this.saveHistory = props.saveHistory || false;
    this.history = props.history || [];
    this.speak = props.speak || false;
  }

  get prompt() {
    return this._prompt;
  }

  set prompt(value) {
    this._prompt = value;
    this.promptNames = this.getPromptNames();
    this.gpt.defaultPromptOptions.stop = [this.promptNames.user];
    this.updated();
  }

  get intro() {
    return this._intro;
  }

  set intro(value) {
    this._intro = value;
    this.updated();
  }

  get humanFirst() {
    return this._humanFirst;
  }

  set humanFirst(value) {
    this._humanFirst = value;
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

  toJSON() {
    const data = {
      prompt: this.prompt,
      intro: this.intro,
      humanFirst: this.humanFirst,
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

  addUserInput(input) {
    if (!input) {
      throw new Error("No user input given");
    }
    this.history.push({ type: "user", text: input });
    this.fetchChatResponse();
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
    for (const item of this.history) {
      if (item.type === "user") {
        if (this.humanFirst) {
          result.push("");
        }
        result.push(`${this.promptNames.user}: ${item.text}`);
      } else {
        if (!this.humanFirst) {
          result.push("");
        }
        result.push(`${this.promptNames.robot}: ${item.text}`);
      }
    }
    if (!this.humanFirst) {
      result.push("");
    }
    result.push(`${this.promptNames.robot}:`);
    return result.join("\n");
  }

  getPromptNames() {
    const names = [];
    const lines = this.prompt.split("\n");
    for (const line of lines) {
      const parts = line.split(":", 2);
      if (parts.length > 1) {
        names.push(parts[0].trim());
      }
    }
    if (names.length < 2) {
      return { user: "Human", robot: "AI" };
    } else if (this.humanFirst) {
      return { user: names[0], robot: names[1] };
    }
    return { user: names[1], robot: names[0] };
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

const builtins = [
  {
    title: "AI Assistant",
    domain: {
      prompt: `
The following is a conversation with an AI assistant. The assistant is helpful, creative, clever, and very friendly.

Human: Hello, how are you?
AI: I am doing well, thank you.
  `.trim(),
      intro: "Hello.",
      humanFirst: true,
    },
  },
  {
    title: "Rogerian Therapist",
    domain: {
      prompt: `
The following is a conversation between a Rogerian therapist and a patient. The therapist listens closely and offers empathetic and caring advice.

Therapist: I'm very glad you came in today.
Patient: Thank you, it's nice to see you today.

Therapist: What would you like to talk about today?
`.trim(),
      intro: "What would you like to talk about today?",
      humanFirst: false,
    },
  },
  {
    title: "Alien",
    domain: {
      prompt: `
The following is a conversation between an alien and a human. The alien is curious about human ways but doesn't understand much.

Human: Hello, my name is Ian
Alien: It is nice to meet you. Do all humans have the same name?
`.trim(),
      humanFirst: true,
    },
  },
  {
    title: "Con-Artist",
    domain: {
      prompt: `
The following is a conversation between a con-artist and their mark. The con-artist is trying to grift the mark, and steal their money and identity.

Mark: Do I know you?
Con-artist: Yeah, we went to the same elementary school, don't you remember?
`.trim(),
      intro: "We went to the same elementary school, don't you remember?",
      humanFirst: true,
    },
  },
  {
    title: "Interviewer",
    domain: {
      prompt: `
The following is a conversation between two people. The first person is an interviewer who is probing the interviewee for stories and information about their personal life.

Interviewer: How are you doing today?
Interviewee: Wonderful, thank you.
`.trim(),
      intro: "Tell me about yourself",
      humanFirst: false,
      saveHistory: true,
    },
  },
  {
    title: "ACT Therapist",
    description:
      "A conversation modeled on _Acceptance and Commitment Therapy_. Inspired and largely copied from [Dan Shipper's Tweet](https://twitter.com/danshipper/status/1604514003736178688).",
    domain: {
      prompt: `
The following is a conversation between an ACT-informed therapist and their client. The therapist believes in helping clients contact their values. Here are some things the therapist believes:

- Values are behaviors. They are ways of living, not words. One way to talk about values is to say that they are a combination of verbs and adverbs, rather than nouns. They describe what you are doing (verb) and how you are doing it (adverb).
- Values are freely chosen. They are not the result of reasoning, outside pressure, or moral rules.
- Values are life directions, not goals to achieve. They are always immediately accessible, but you'll never complete them.
- Values are about things you want to move toward, not what you want to get away from.

Please help me explore a difficult situation in my life and connect it to my values. Feel free to ask clarifying questions but try not to be too repetetive or on the nose. Our conversation will take the form:

Therapist: [inquisitive reflection and questions]
Client: [description of self]
`.trim(),
      intro: "How are you feeling?",
      humanFirst: false,
      saveHistory: true,
    },
  },
];

export const chatDb = new ModelTypeStore("chat", Chat, builtins);
