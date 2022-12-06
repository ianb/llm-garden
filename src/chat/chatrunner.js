import { getCompletion } from "../gptservice/appgpt";

export class ChatRunner {
  constructor({ prompt, humanFirst, intro }) {
    this.prompt = prompt;
    this.humanFirst = humanFirst;
    this.intro = intro;
    this.history = [];
    this.promptNames = this.getPromptNames();
    this._updates = [];
  }

  addOnUpdate(func) {
    this._updates.push(func);
  }

  removeOnUpdate(func) {
    this._updates = this._updates.filter((x) => x !== func);
  }

  fireOnUpdate() {
    for (const func of this._updates) {
      func(this);
    }
  }

  addUserInput(input) {
    this.history.push({ type: "user", text: input });
    this.fireOnUpdate();
  }

  async fetchChatResponse() {
    const prompt = this.constructPrompt();
    const resp = await getCompletion(
      {
        model: "text-davinci-003",
        temperature: 0.2,
        max_tokens: 40,
        prompt,
        frequency_penalty: 0,
      },
      ["chat"]
    );
    const text = resp.choices[0].text.trim();
    this.history.push({ type: "robot", text });
    this.fireOnUpdate();
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
    console.log("prompts", names);
    if (names.length < 2) {
      return { user: "Human", robot: "AI" };
    } else if (this.humanFirst) {
      return { user: names[names.length - 2], robot: names[names.length - 1] };
    }
    return { user: names[names.length - 1], robot: names[names.length - 2] };
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
