import uuid from "../uuid";
import { GptCache } from "../gptservice/gptcache";

export class ChooserStory {
  constructor(props) {
    this.genre = new Property(this, "genre", "Genre");
    this.title = new Property(this, "title", "Title");
    this.theme = new Property(this, "theme", "Theme");
    this.characterName = new Property(this, "characterName", "Character Name");
    this.mainCharacter = new Property(this, "mainCharacter", "Main Character");
    this.introPassage = new Property(this, "introPassage", "Introduction");
    this.passages = [];
    this.passageSummaryVersion = 3;
    this.passageSummaries = {};
    this.queryLog = [];
    this._updates = [];
    if (props) {
      this.updateFromJSON(props);
    }
    this.gpt = new GptCache({
      storageName: "myoa",
      basePaths: ["myoa", () => this.envelope && `myoa/${this.envelope.slug}`],
      logResults: true,
      defaultPromptOptions: {
        temperature: 0.5,
        max_tokens: 240,
      },
    });
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
      passageSummaries: this.passageSummaries,
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
    // FIXME: undo to save these:
    this.passageSummaries = data.passageSummaries || {};
    for (const key in this.passageSummaries) {
      if (
        !this.passageSummaries[key].version ||
        this.passageSummaries[key].version < this.passageSummaryVersion
      ) {
        delete this.passageSummaries[key];
      }
    }
  }

  async getSummaries(passageIdList) {
    if (!passageIdList.length) {
      return "";
    }
    passageIdList = [...passageIdList];
    // We never try to summarize the last passage, it should be included in its entirety:
    const lastPassages = [this.getPassageById(passageIdList.pop())];
    if (!lastPassages[0].value) {
      lastPassages.unshift(this.getPassageById(passageIdList.pop()));
    }
    const summary = [];
    let literals = 0;
    while (passageIdList.length) {
      let found = false;
      for (let i = passageIdList.length; i > 0; i--) {
        const ids = passageIdList.slice(0, i);
        const passageSummary = this.getPassageSummary(ids);
        if (passageSummary) {
          passageIdList.splice(0, i);
          summary.push({
            type: "summary",
            text: `These things have happened:\n${passageSummary}`,
          });
          found = true;
          break;
        }
      }
      if (!found) {
        const first = this.getPassageById(passageIdList[0]);
        summary.push({
          type: "literal",
          id: passageIdList[0],
          text: this.createPassagePrompt(first),
        });
        literals++;
        passageIdList.splice(0, 1);
      }
    }
    if (literals > 3) {
      const stretches = [];
      for (let i = 0; i < summary.length; i++) {
        const item = summary[i];
        if (item.type !== "literal") {
          continue;
        }
        let last;
        if (stretches.length) {
          last = stretches[stretches.length - 1];
        }
        if (last && last.start + last.length === i) {
          last.length++;
          last.ids.push(item.id);
        } else {
          stretches.push({ start: i, length: 1, ids: [item.id] });
        }
      }
      sortByKey(stretches, (x) => -x.length);
      await this.summarizeIds(stretches[0].ids);
      summary.splice(stretches[0].start, stretches[0].length, {
        type: "summary",
        text: this.getPassageSummary(stretches[0].ids),
      });
    }
    for (const lastPassage of lastPassages) {
      summary.push({
        type: "literal",
        id: lastPassage.id,
        text: this.createPassagePrompt(lastPassage),
      });
    }
    return summary.map((x) => x.text).join("\n\n");
  }

  getPassageSummary(ids) {
    const key = ids.join(",");
    return this.passageSummaries[key] && this.passageSummaries[key].text;
  }

  purgePassageSummaries(id) {
    for (const key in this.passageSummaries) {
      if (key.includes(id)) {
        delete this.passageSummaries[key];
      }
    }
    this.updated();
  }

  createPassagePrompt(passage) {
    if (passage.id === "introPassage") {
      return passage.value;
    }
    if (!passage.value) {
      return `You choose: ${passage.fromChoice}`;
    }
    return `You choose: ${passage.fromChoice}\n\n# ${passage.title}\n\n${passage.value}`;
  }

  async summarizeIds(ids) {
    const key = ids.join(",");
    const texts = [];
    for (const id of ids) {
      const passage = this.getPassageById(id);
      texts.push(this.createPassagePrompt(passage));
    }
    const text = texts.join("\n\n");
    const prompt = `Create a list of facts and events from the following passages:\n\n${text}\n\nComprehensive list of facts, events, characters, and settings from the passages:\n*`;
    const summary = await this.gpt.getCompletion(prompt);
    this.passageSummaries[key] = {
      version: this.passageSummaryVersion,
      text: "* " + summary.text.trim(),
    };
    this.updated();
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
    this.updated();
  }

  updated() {
    for (const func of this._updates) {
      func(this);
    }
    if (
      this.title.value &&
      this.envelope &&
      this.title.value !== this.envelope.title
    ) {
      this.envelope.title = this.title.value;
    }
    if (this.envelope) {
      this.envelope.updated();
    }
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
    this._title = title;
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
      this.story.updated();
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
    if (
      typeof data.value !== "string" &&
      data.value !== undefined &&
      data.value !== null
    ) {
      console.warn(
        "Bad property data for prop",
        this.type,
        this.title,
        data.value
      );
    } else {
      this.value = data.value;
    }
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
    if (this.type === "passage" || this.type === "introPassage") {
      this.story.purgePassageSummaries(this.id);
    }
    this.story.updated();
  }

  get title() {
    return this._title;
  }

  set title(v) {
    this._title = v;
    if (this.type === "passage" || this.type === "introPassage") {
      this.story.purgePassageSummaries(this.id);
    }
    this.story.updated();
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
      let title = lines[0];
      title = title.replace(/^#+\s+/, "");
      return [title, lines.slice(2).join("\n").trim()];
    }
    return [null, v];
  }

  get hasChoices() {
    return this.type === "introPassage" || this.type === "passage";
  }

  addChoice(choice) {
    this.choices.push(choice);
    this.story.updated();
  }

  removeChoice(choice) {
    this.choices = this.choices.filter((x) => x !== choice);
    this.story.updated();
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
      this.story.purgePassageSummaries(passage.id);
    }
    this.choices = this.choices.map((x) => (x === oldChoice ? newChoice : x));
    this.story.updated();
  }

  choiceHasPassage(choice) {
    return !!this.choicePassage(choice);
  }

  choicePassage(choice) {
    for (const p of this.story.passages) {
      if (p.fromChoice === choice && p.fromPassageId === this.id) {
        return p;
      }
    }
    return null;
  }

  get fromPassage() {
    if (!this.fromPassageId) {
      throw new Error("This property does not come from a passage");
    }
    return this.story.getPassageById(this.fromPassageId);
  }

  async suggestChoices() {
    this.queries = [];
    this.story.updated();
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
    const response = await this.story.gpt.getCompletion(prompt);
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
    const query = await this.initialQuery(promptName);
    const ob = { text: query, type: "init" };
    this.queries = [ob];
    this.story.updated();
    const response = await this.story.gpt.getCompletion({
      prompt: query,
      stop: ["You choose:"],
    });
    ob.response = fixResponseText(response.choices[0].text);
    this.story.updated();
  }

  async addUserInput(input) {
    if (await this.executeSpecialInput(input)) {
      return;
    }
    this.queries.push({ text: input, type: "user" });
    this.story.updated();
    console.log("trying query", this.queries, this.constructQuery());
    const response = await this.story.gpt.getCompletion(this.constructQuery());
    const ob = {
      text: fixResponseText(response.choices[0].text),
      type: "response",
    };
    this.queries.push(ob);
    this.story.updated();
  }

  async executeSpecialInput(input) {
    const norm = input.trim().toLowerCase();
    if (norm === "reset") {
      this.queries = [];
      this.story.updated();
      return true;
    }
    if (norm === "undo") {
      this.queries.pop();
      this.queries.pop();
      this.story.updated();
      return true;
    }
    if (norm === "retry") {
      console.log("queries", JSON.stringify(this.queries));
      // FIXME: this doesn't change the log response...
      delete this.queries[this.queries.length - 1].response;
      const response = await this.story.gpt.getCompletion({
        prompt: this.constructQuery(),
        temperature: 1.0,
      });
      const ob = {
        text: fixResponseText(response.choices[0].text),
        type: "response",
      };
      this.queries.push(ob);
      this.story.updated();
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

  async initialQuery(promptName = null) {
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
    const passageContext = await this.passageContext();
    for (let s of [
      prompts.assistantIntro,
      prompts.general,
      this.story.storyContext(),
      passageContext,
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

  async passageContext() {
    if (this.type !== "passage") {
      return null;
    }
    const ids = [];
    let current = this;
    for (;;) {
      ids.push(current.id);
      if (!current.fromPassageId) {
        break;
      }
      current = current.fromPassage;
    }
    ids.reverse();
    return this.story.getSummaries(ids);
  }
}

function sortByKey(array, func) {
  /* Sort array by whatever value func(item) gives */
  return array.sort((a, b) => {
    const aKey = func(a);
    const bKey = func(b);
    if (aKey < bKey) {
      return -1;
    }
    if (aKey > bKey) {
      return 1;
    }
    return 0;
  });
}

// Every so often (not that often) it returns these emoji instead of 1./2. etc:
function fixResponseText(text) {
  let t = text.trim();
  t = t.replace("1??????", "1. ");
  t = t.replace("2??????", "2. ");
  t = t.replace("3??????", "3. ");
  t = t.replace("4??????", "4. ");
  t = t.replace("5??????", "5. ");
  t = t.replace("6??????", "6. ");
  t = t.replace("7??????", "7. ");
  t = t.replace("8??????", "8. ");
  t = t.replace("9??????", "9. ");
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
