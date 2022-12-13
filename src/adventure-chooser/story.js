import { getCompletion } from "../gptservice/appgpt";
import LocalCache from "../localcache";
import uuid from "../uuid";

const queryCache = new LocalCache("adventure-chooser-queries");

export class ChooserStory {
  constructor() {
    this.genre = new Property(this, "genre", "Genre");
    this.title = new Property(this, "title", "Title");
    this.theme = new Property(this, "theme", "Theme");
    this.characterName = new Property(this, "characterName", "Character Name");
    this.mainCharacter = new Property(this, "mainCharacter", "Main Character");
    this.introPassage = new Property(this, "introPassage", "Introduction");
    this.passages = [];
    this.queryLog = [];
    this._updates = [];
  }

  toJSON() {
    return {
      genre: this.genre,
      title: this.title,
      theme: this.theme,
      characterName: this.characterName,
      mainCharacter: this.mainCharacter,
      introPassage: this.introPassage,
      passages: this.passages,
    };
  }

  updateFromJSON(data) {
    this.genre.updateFromJSON(data.genre);
    this.title.updateFromJSON(data.title);
    this.theme.updateFromJSON(data.theme);
    this.characterName.updateFromJSON(data.characterName);
    this.mainCharacter.updateFromJSON(data.mainCharacter);
    this.introPassage.updateFromJSON(data.introPassage);
    this.passages = data.passages.map((p) => {
      const prop = new Property(this);
      prop.updateFromJSON(p);
      return prop;
    });
  }

  storyContext() {
    const results = [];
    for (const prop of [
      this.genre,
      this.title,
      this.theme,
      this.characterName,
      this.mainCharacter,
    ]) {
      const v = prop.describeAsContext();
      if (v) {
        results.push(v.trim());
      }
    }
    return results.join(" ");
  }

  addOnUpdate(func) {
    this._updates.push(func);
  }

  removeOnUpdate(func) {
    this._updates = this._updates.filter((x) => x !== func);
  }

  getPassageById(id) {
    if (id === "introPassage") {
      return this.introPassage;
    }
    const v = this.passages.find((p) => p.id === id);
    if (!v) {
      throw new Error(`No passage with id ${id}`);
    }
    return v;
  }

  getPassageByChoice(sourceId, choice) {
    return this.passages.find(
      (p) => p.fromPassageId === sourceId && p.fromChoice === choice
    );
  }

  addPassage(parentId, choice) {
    const passage = new Property(this, "passage", choice);
    passage.fromPassageId = parentId;
    passage.fromChoice = choice;
    this.passages.push(passage);
    this.fireOnUpdate();
  }

  fireOnUpdate() {
    for (const func of this._updates) {
      func(this);
    }
  }

  async getCompletion(prompt) {
    let val;
    if (typeof prompt === "string") {
      val = queryCache.get(prompt);
    }
    if (val) {
      this.queryLog.push({
        prompt,
        fromCache: true,
        response: fixResponseText(val.choices[0].text),
      });
      return val;
    }
    if (typeof prompt === "string") {
      body = { prompt };
    } else {
      body = prompt;
    }
    body = Object.assign({ max_tokens: 240 }, body);
    const start = Date.now();
    const logItem = { prompt: body.prompt, start };
    this.queryLog.push(logItem);
    let body;
    const resp = await getCompletion(body, [
      "adventure-chooser",
      `adventure-chooser/${this.title.value || "default"}`,
    ]);
    console.log(
      "GPT response",
      body.prompt + "\n---------------\n" + resp.choices[0].text
    );
    const cached = Object.assign({}, resp);
    cached.fromCache = true;
    queryCache.set(body.prompt, cached);
    logItem.response = fixResponseText(resp.choices[0].text);
    logItem.time = Date.now() - start;
    return resp;
  }

  requiredUpdates() {
    return ["genre", "title", "theme", "mainCharacter"].filter((x) => !this[x]);
  }
}

class Property {
  constructor(story, type, title) {
    this.queries = [];
    this.story = story;
    this.type = type;
    this.title = title;
    this._value = null;
    this.single = !!prompts[type + "Single"];
    this.fixupPrompt = prompts[type + "Fixup"];
    if (this.type === "passage") {
      this.id = uuid();
    } else if (this.type === "introPassage") {
      this.id = "introPassage";
    }
    this.fromChoice = undefined;
    this.fromPassageId = undefined;
    if (this.hasChoices) {
      this.choices = [];
    }
  }

  toJSON() {
    return {
      type: this.type,
      title: this.title,
      value: this.value,
      choices: this.choices,
      id: this.id,
      fromPassageId: this.fromPassageId,
      fromChoice: this.fromChoice,
    };
  }

  delete() {
    if (this.type === "passage") {
      this.story.passages = this.story.passages.filter((x) => x !== this);
      this.story.fireOnUpdate();
    } else {
      this.value = undefined;
    }
  }

  updateFromJSON(data) {
    if (this.type && this.type !== data.type) {
      throw new Error(`Type mismatch: ${this.type} vs ${data.type}`);
    }
    this.type = data.type;
    this.title = data.title;
    this.value = data.value;
    this.choices = data.choices;
    this.id = data.id;
    this.fromPassageId = data.fromPassageId;
    this.fromChoice = data.fromChoice;
  }

  get value() {
    return this._value;
  }

  set value(v) {
    this._value = v;
    this.story.fireOnUpdate();
  }

  setValueFromText(v) {
    if (this.type === "passage") {
      const [title, rest] = this.extractTitle(v);
      if (title) {
        this.title = title;
      }
      this.value = rest;
    } else {
      this.value = v;
    }
  }

  extractTitle(v) {
    const m = v.match(/^Title: (.*)\n/i);
    if (m) {
      const rest = v.replace(/^Title: (.*)\n/i, "");
      return [m[1], rest.trim()];
    }
    const lines = v.split("\n");
    if (lines.length > 3 && lines[1].trim() === "" && lines[0].length < 60) {
      return [lines[0], lines.slice(2).join("\n").trim()];
    }
    return [null, v];
  }

  get hasChoices() {
    return this.type === "introPassage" || this.type === "passage";
  }

  addChoice(choice) {
    this.choices.push(choice);
    this.story.fireOnUpdate();
  }

  removeChoice(choice) {
    this.choices = this.choices.filter((x) => x !== choice);
    this.story.fireOnUpdate();
  }

  hasChoice(choice) {
    return this.choices.includes(choice);
  }

  renameChoice(oldChoice, newChoice) {
    if (!this.hasChoice(oldChoice)) {
      throw new Error(`No such choice: ${oldChoice}`);
    }
    if (!newChoice) {
      throw new Error("New choice cannot be empty");
    }
    const passage = this.story.getPassageByChoice(this.id, oldChoice);
    if (passage) {
      passage.fromChoice = newChoice;
    }
    this.choices = this.choices.map((x) => (x === oldChoice ? newChoice : x));
    this.story.fireOnUpdate();
  }

  choiceHasPassage(choice) {
    for (const p of this.story.passages) {
      if (p.fromChoice === choice && p.fromPassageId === this.id) {
        return true;
      }
    }
    return false;
  }

  get fromPassage() {
    if (!this.fromPassageId) {
      throw new Error("This property does not come from a passage");
    }
    return this.story.getPassageById(this.fromPassageId);
  }

  async suggestChoices() {
    this.queries = [];
    this.story.fireOnUpdate();
    return this.launchQuery("choices");
  }

  async fixupValue(v) {
    if (!v) {
      throw new Error("Should have given a value to fixupValue()");
    }
    if (!this.fixupPrompt) {
      return v;
    }
    const prompt = this.fixupPrompt.replace("$value", v);
    const response = await this.story.getCompletion(prompt);
    return fixResponseText(response.choices[0].text);
  }

  describeAsContext() {
    if (!this.value) {
      return "";
    }
    let t = prompts[this.type + "Context"];
    if (!t) {
      return "";
    }
    t = t.replace("$value", this.value);
    return t;
  }

  async launchQuery(promptName = null) {
    const query = this.initialQuery(promptName);
    const ob = { text: query, type: "init" };
    this.queries = [ob];
    this.story.fireOnUpdate();
    const response = await this.story.getCompletion(query);
    ob.response = fixResponseText(response.choices[0].text);
    this.story.fireOnUpdate();
  }

  async addUserInput(input) {
    if (await this.executeSpecialInput(input)) {
      return;
    }
    this.queries.push({ text: input, type: "user" });
    this.story.fireOnUpdate();
    console.log("trying query", this.queries, this.constructQuery());
    const response = await this.story.getCompletion(this.constructQuery());
    const ob = {
      text: fixResponseText(response.choices[0].text),
      type: "response",
    };
    this.queries.push(ob);
    this.story.fireOnUpdate();
  }

  async executeSpecialInput(input) {
    const norm = input.trim().toLowerCase();
    if (norm === "reset") {
      this.queries = [];
      this.story.fireOnUpdate();
      return true;
    }
    if (norm === "undo") {
      this.queries.pop();
      this.queries.pop();
      this.story.fireOnUpdate();
      return true;
    }
    if (norm === "retry") {
      console.log("queries", JSON.stringify(this.queries));
      // FIXME: this doesn't change the log response...
      delete this.queries[this.queries.length - 1].response;
      const response = await this.story.getCompletion({
        prompt: this.constructQuery(),
        temperature: 1.0,
      });
      const ob = {
        text: fixResponseText(response.choices[0].text),
        type: "response",
      };
      this.queries.push(ob);
      this.story.fireOnUpdate();
      return true;
    }
    return false;
  }

  constructQuery() {
    const result = [];
    for (const item of this.queries) {
      if (item.type === "user") {
        result.push(`Request: ${item.text}\nResponse:`);
      } else if (item.type === "response") {
        result.push(item.text + "\n");
      } else if (item.type === "init") {
        result.push(item.text);
        result.push(item.response);
      } else {
        console.warn("Unknown item type:", item.type, item);
      }
    }
    console.log("result of query:", result);
    return result.join("\n");
  }

  initialQuery(promptName = null) {
    promptName = promptName || this.type;
    const basic = prompts[promptName];
    let existingChoices = null;
    if (promptName === "choices" && this.choices && this.choices.length) {
      existingChoices = ["These choices already exist:"];
      for (const choice of this.choices) {
        existingChoices.push(`* ${choice}`);
      }
      existingChoices = existingChoices.join("\n");
    }
    const result = [];
    for (let s of [
      prompts.assistantIntro,
      prompts.general,
      this.story.storyContext(),
      this.passageContext(),
      basic,
      existingChoices,
      "Edward says:",
    ]) {
      s = s && s.trim();
      if (s) {
        result.push(s);
      }
    }
    return result.join("\n\n") + "\n\n";
  }

  passageContext() {
    if (this.type !== "passage") {
      return null;
    }
    const p = [];
    let current = this;
    while (current.fromPassageId) {
      current = current.fromPassage;
      p.push(current.value);
    }
    p.reverse();
    p.push(this.fromChoice);
    if (this.value) {
      // FIXME: this is right for choices, but seems wrong for editing the passage
      p.push(this.value);
    }
    return p.join("\n\n");
  }
}

// Every so often (not that often) it returns these emoji instead of 1./2. etc:
function fixResponseText(text) {
  let t = text.trim();
  t = t.replace("1️⃣", "1. ");
  t = t.replace("2️⃣", "2. ");
  t = t.replace("3️⃣", "3. ");
  t = t.replace("4️⃣", "4. ");
  t = t.replace("5️⃣", "5. ");
  t = t.replace("6️⃣", "6. ");
  t = t.replace("7️⃣", "7. ");
  t = t.replace("8️⃣", "8. ");
  t = t.replace("9️⃣", "9. ");
  return t;
}

export const prompts = {
  genre: `
  Introduce yourself. Ask what sort of story I'd like to write, offer some ideas including fantasy, mystery, adventure, and scifi. Present the ideas as a numbered list with emojis. Also offer at least 2 other story types.`,
  genreContext: `
  The genre of the story is $value.
  `,
  title: `
  Choose a name for the story. Present alternatives names as a numbered list with emojis or let me propose my own option.
  `,
  titleContext: `
  The story is titled $value.
  `,
  theme: `
  Choose a secondary theme for the story or let me propose my own options. Present alternative themes with a numbered list with emojis.
  `,
  themeContext: `
  The theme of the story is $value.
  `,
  characterName: `
  Choose a name for the main character or let me propose my own options. Present alternative names with a numbered list with emojis. Include interesting and unusual names.
  `,
  characterNameContext: `
  You are the main character. Your name is $value.
  `,
  mainCharacter: `
  Describe the main character: their age, their motivations, and their personality. Ask if I'd like to make changes. Repeat the character description after each change.
  `,
  mainCharacterContext: `
  $value.
  `,
  mainCharacterSingle: true,
  mainCharacterFixup: `
  Character: $value

  Create a character description, referring to the character as "you"
  `,
  introPassage: `
  Compose the first passage of the story. Describe the setting and the main character. Repeat the passage after each change.
  `,
  introPassageSingle: true,
  passage: `
  Compose a passage of the story. Give the passage a title. Repeat the passage after each change. The passage should end just before a critical choice.
  `,
  passageSingle: true,
  general: `
* Keep responses short, concise, and easy to understand.
* Do not get ahead of yourself.
* Stop frequently to ask for confirmation or clarification.
* Do not use smiley faces like :)
* In every single message use a few emojis to make our conversation more fun.
* Absolutely do not use more than 10 emojis in a row.
* Avoid cliche writing and ideas.
* Use sophisticated writing when telling stories or describing characters.
* Avoid writing that sounds like an essay. This is not an essay!
* Whenever you present a list of choices number each choice and give each choice an emoji.
* Do not propose existing, copyrighted, or trademarked character names or locations unless I explicitly ask you to.
* Use bold and italics text for emphasis, organization, and style. Format with Markdown.
  `,
  assistantIntro: `
  You are Edward, a Choose Your Own Adventure creation assistant. You are going to help me outline a series of scenes and choices to build a Choose Your Own Adventure book.
  `,
  choices: `
  Offer at least 5 new choices for what to do next. Present alternatives as a numbered list. Use a variety of emoji for the choices.
  `,
};
