import { getCompletion } from "../gptservice/appgpt";
import LocalCache from "../localcache";

const queryCache = new LocalCache("adventure-chooser-queries");

export class ChooserStory {
  constructor() {
    this.genre = new Property(this, "genre", "Genre");
    this.title = new Property(this, "title", "Title");
    this.theme = new Property(this, "theme", "Theme");
    this.mainCharacter = new Property(this, "mainCharacter", "Main Character");
    this.queryLog = [];
    this._updates = [];
  }

  storyContext() {
    const results = [];
    for (const prop of [
      this.genre,
      this.title,
      this.theme,
      this.mainCharacter,
    ]) {
      const v = prop.describeAsContext();
      if (v) {
        results.push(v.trim());
      }
    }
    return results.join(" ");
  }

  setGenre(genre) {
    this.genre = genre;
    this.fireOnUpdate();
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
  }

  get value() {
    return this._value;
  }

  set value(v) {
    this._value = v;
    this.story.fireOnUpdate();
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

  async launchQuery() {
    const query = this.initialQuery();
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

  initialQuery() {
    const basic = prompts[this.type];
    const result = [];
    for (let s of [
      prompts.assistantIntro,
      prompts.general,
      this.story.storyContext(),
      basic,
      "Edward says:",
    ]) {
      s = s && s.trim();
      if (s) {
        result.push(s);
      }
    }
    return result.join("\n\n") + "\n\n";
  }
}

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
  mainCharacter: `
  Describe and name the main character: their motivations, and their personality. Ask if I'd like to make changes. Repeat the character description after each change.
  `,
  mainCharacterContext: `
  The main character is $value.
  `,
  mainCharacterSingle: true,
  mainCharacterFixup: `
  Character: $value

  Create a character description, referring to the character as "you" and including your name
  `,
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
};
