import { ModelTypeStore } from "../db";
import { GptCache } from "../gptservice/gptcache";
import { markdownToElement } from "../markdown";
import { layerDb } from "../layercraft/layerdb";
import { fillTemplate, templateVariables, dedent, joinNaturalStrings } from "../layercraft/template";
import { parseJSON } from "../layercraft/laxjson";

class CityPlayer {
  constructor(props) {
    props = props || {};
    this.gpt = new GptCache({
      storageName: "cityplayer",
      basePaths: [
        "cityplayer",
        () => this.envelope && `cityplayer/${this.envelope.slug}`,
      ],
      logResults: true,
      defaultPromptOptions: {
        temperature: 0.9,
        max_tokens: 700,
      },
    });
    this.originalCityModel = props.originalCityModel || null;
    this.city = props.city;
    if (!this.city && this.originalCityModel) {
      this.city = this.originalCityModel.domain.document;
    }
    if (props.player) {
      this.player = new Player(this.envelope, props.player);
    } else {
      this.player = null;
    }
    this.playerOptionsInspiration = props.playerOptionsInspiration || null;
    this.playerOptions = props.playerOptions || null;
    this.playerOptionsFilledOut = props.playerOptionsFilledOut || null;
    this.playerInventoryOptions = props.playerInventoryOptions || null;
    setTimeout(() => this.ensureTitle(), 0);
  }

  ensureTitle() {
    if (this.city && this.envelope && !this.envelope.title) {
      const currentMonthYearDay = new Date().toLocaleString("en-us", { month: "long", year: "numeric", day: "numeric" });
      const name = this.repr(this.getVariable(this.city, "cityName"));
      this.envelope.title = `City of ${name} at ${currentMonthYearDay}`;
      this.updated();
    }
    if (this.player && !this.player.model) {
      this.player.model = this.envelope;
    }
  }

  async ensurePlayerOptions(reroll = false) {
    if (!reroll && (this.player || this.playerOptions)) {
      return;
    }
    this.playerOptions = [];
    this.updated();
    const request = this.fillTemplate(`
    Create a numbered list of possible characters for the player to play. 
    
    Follow the pattern:

    1. [Name]: [Description], [Details and history]
    `, this.city);
    const resp = await this.gpt.getChat({
      messages: [
        { role: "system", content: this.systemPrompt() },
        { role: "user", content: request },
      ],
      noCache: reroll
    });
    const el = markdownToElement(resp.text);
    this.playerOptions = [];
    for (const child of el.querySelectorAll("li")) {
      const text = child.innerText.trim();
      this.playerOptions.push(text);
    }
    this.updated();
  }

  async createPlayerOptionsFromPrompt(inspiration, reroll = false) {
    if (inspiration) {
      this.playerOptionsInspiration = inspiration;
    } else if (!this.playerOptionsInspiration) {
      throw new Error("No inspiration");
    }
    let suggestedName = "[Player Name]";
    if (this.playerOptionsInspiration.includes(":")) {
      suggestedName = this.playerOptionsInspiration.split(":")[0].trim();
    }
    const request = this.fillTemplate(`
    Create a list of specific characters that follow this character description:

    $inspiration

    Create a JSON response like:

    {
      name: "$suggestedName",
      socialStatus: "[Social status]",
      appearance: "[Physical description of appearance]",
      history: "[History of the character]",
      // Create at least 3 options here:
      missionOptions: [
        {
          callToAdventure: "[A challenge that brings the character into a life of adventure]",
          mission: "[The character's mission that begins the game]",
        },
      ],
      // Skills that would be appropriate and useful for the character:
      skillOptions: {
        "[Skill name]": "novice", // or "skilled", "expert", "master", "legendary"
      },
    }
    `, this.city, { inspiration: this.playerOptionsInspiration, suggestedName });
    this.playerOptionsFilledOut = {};
    this.updated();
    const resp = await this.gpt.getChat({
      messages: [
        { role: "system", content: this.systemPrompt() },
        { role: "user", content: request },
      ],
      noCache: reroll,
    });
    const json = parseJSON(resp.text);
    this.playerOptionsFilledOut = json;
    this.updated();
  }

  async createPlayerFromMission(mission, skills) {
    const base = Object.assign({}, this.playerOptionsFilledOut, mission);
    delete base.missionOptions;
    if (skills) {
      base.skills = skills;
    }
    console.log("creating player with", base, skills);
    this.player = new Player(this.envelope, base);
    this.updated();
  }

  async ensurePlayerInventoryOptions(reroll = false) {
    if (!reroll && this.playerInventoryOptions) {
      return;
    }
    this.playerInventoryOptions = [];
    this.updated();
    const request = this.fillTemplate(`
    The player is a $player.socialStatus named $player.name.

    $player.appearance. $player.history.

    They were called to adventure by: $player.callToAdventure.
    Their mission is: $player.mission.

    Create a numbered list of possible items for the player to have in their inventory, like:

    1. [Item name]: [Description and purpose]
    `, this.city, { player: this.player });
    const resp = await this.gpt.getChat({
      messages: [
        { role: "system", content: this.systemPrompt() },
        { role: "user", content: request },
      ],
      noCache: reroll,
    });
    const el = markdownToElement(resp.text);
    this.playerInventoryOptions = [];
    for (const child of el.querySelectorAll("li")) {
      const text = child.innerText.trim();
      this.playerInventoryOptions.push(text);
    }
    this.updated();
  }

  async ensurePlayerLocation() {
    if (this.player.locationName) {
      return;
    }
    const locations = this.findAll("building");
    const location = locations[Math.floor(Math.random() * locations.length)];
    this.player.locationName = location.name;
    this.player.locationType = location.type;
    this.updated();
  }

  async playerDoes(action) {
    if (!this.player.location.actions) {
      this.player.location.actions = [];
    }
    const newAction = { action, state: "pending" };
    this.player.location.actions.push(newAction);
    this.updated();
    const desc = model.domain.childrenByType(this.player.location, "buildingSceneDescription");
    const request = this.fillTemplate(`
    The environment is described as:

    $player.locationScene

    I (as $player.name) want to do: "$action".

    Respond in the form:

    {
      necessaryInventory: ["[Item name]"], // Which items fron my inventory do I need to do this?
      necessarySkills: ["[Skill name]"], // What skills do I need to do this?
      isPossible: true/false, // Am I (as $player.name) able to do this? Do I have the skills and items necessary?
      isSociallyAcceptable: true/false, // Is it socially acceptable for me to do this?
      effect: "[What happens when I do this?]", // If isPossible is true
      inventoryAdditions: ["[Item name]"], // Anything added to inventory
      inventoryRemovals: ["[Item name]"], // Anything removed from inventory
      attitudeChanges: {
        "[Character name]": "[Attitude change of the character towards $player.name]",
      },
    }
    `, this.player.location, { action });
    const resp = await this.gpt.getChat({
      messages: [
        { role: "system", content: this.systemPlayerPrompt() },
        { role: "user", content: request },
      ],
    });
    try {
      const json = parseJSON(resp.text, "gptNotes");
      delete newAction.state;
      newAction.result = json;
    } catch (e) {
      newAction.state = "failed";
      newAction.responseText = resp.text;
    }
    this.updated();
  }

  systemPrompt(additions) {
    let template = dedent(`
    You are playing the part of a gamemaster and the user is a player. As a gamemaster you allow the player to attempt whatever they want, but you don't shield the player from the consequences of their actions.

    The game is situated in the city $cityName that is $cityType, $cityPeriod.
    `.trim());
    if (additions) {
      template += "\n\n" + dedent(additions);
    }
    return this.fillTemplate(template, this.city);
  }

  systemPlayerPrompt() {
    return this.fillTemplate(`
    You are playing the part of a gamemaster and the user is a player. As a gamemaster you allow the player to attempt whatever they want, but you don't shield the player from the consequences of their actions.

    The game is situated in the city $cityName that is $cityType, $cityPeriod.

    The player is a $player.socialStatus named $player.name.

    $player.appearance. $player.history.

    I ($player.name) have these in my inventory:
    $player.shortInventory|markdownList

    I have the skills:
    $player.skillDescription

    The player is in the location $player.location.name ($player.location.description).
    `, this.city);
  }

  fillTemplate(template, parent, extraVariables) {
    template = dedent(template);
    return fillTemplate(
      template,
      (variable) => this.getVariable(parent, variable, extraVariables),
      this.getVariablePath.bind(this),
      this.repr.bind(this),
    );
  }

  getVariable(parent, variable, extraVariables) {
    if (variable === "player") {
      return this.player;
    }
    if (extraVariables && variable in extraVariables) {
      return extraVariables[variable];
    }
    if (!parent) {
      throw new Error("No parent");
    }
    if (parent.type === variable) {
      return [parent];
    }
    let anywhere = false;
    if (variable.endsWith(":anywhere")) {
      variable = variable.split(":")[0];
      anywhere = true;
    }
    if (anywhere) {
      return this.findAll(variable);
    }
    const result = [];
    for (const child of this.childrenByType(parent, variable)) {
      result.push(child);
    }
    if (!result.length) {
      const parentParent = this.getParent(parent);
      if (!parentParent) {
        return [];
      }
      return this.getVariable(parentParent, variable);
    }
    return result;
  }

  findAll(type) {
    const result = [];
    function findIn(parent) {
      for (const child of parent.children || []) {
        if (child.type === type) {
          result.push(child);
        }
        if (child.children) {
          findIn(child);
        }
      }
    }
    findIn(this.city);
    return result
  }

  childrenByType(parent, type) {
    if (!parent) {
      throw new Error("No parent");
    }
    if (!parent.children) {
      return [];
    }
    return parent.children.filter((child) => child && child.type === type);
  }

  getParent(obj) {
    if (obj === this.city) {
      return null;
    }
    function findIn(parent) {
      for (const childSet of [parent.children, parent.uncommittedChildren]) {
        if (!childSet) {
          continue;
        }
        for (const child of childSet) {
          if (child === obj) {
            return parent;
          }
          if (child.children) {
            const result = findIn(child);
            if (result) {
              return result;
            }
          }
          if (child.uncommittedChildren) {
            const result = findIn(child);
            if (result) {
              return result;
            }
          }
        }
      }
      return null;
    }
    return findIn(this.city);
  }

  getVariablePath(obj, path) {
    if (!path || !path.length) {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.getVariablePath(item, path));
    }
    let val = obj;
    for (const p of path) {
      if (p === "name") {
        val = val.name;
        continue;
      }
      if (val.attributes && p in val.attributes) {
        val = val.attributes[p];
        continue;
      }
      val = val[p];
    }
    return val;
  }

  repr(value) {
    if (typeof value === "string") {
      return value;
    }
    if (value && value.name) {
      return value.name;
    }
    if (Array.isArray(value)) {
      // FIXME: maybe should special case 0 and 1 length
      return joinNaturalStrings(value.map((item) => this.repr(item)));
    }
    return JSON.stringify(value);
  }

  toJSON() {
    return {
      originalCityModel: this.originalCityModel,
      player: this.player,
      city: this.city,
      playerOptions: this.playerOptions,
      playerOptionsFilledOut: this.playerOptionsFilledOut,
      playerOptionsInspiration: this.playerOptionsInspiration,
      playerInventoryOptions: this.playerInventoryOptions,
    }
  }

  updated() {
    this.envelope.updated();
  }
}

class Player {
  constructor(model, props) {
    props = props || {};
    this.model = model;
    this.name = props.name || "";
    this.appearance = props.appearance || "";
    this.history = props.history || "";
    this.callToAdventure = props.callToAdventure || "";
    this.mission = props.mission || "";
    this.imageUrl = props.imageUrl || null;
    this.money = props.money || 0;
    this.inventory = props.inventory || [];
    this.skills = props.skills || {};
    this.locationType = props.locationType || null;
    this.locationName = props.locationName || null;
    this.chattingName = props.chattingName || null;
  }

  addInventory(item) {
    this.inventory.push(item);
    this.updated();
  }

  get location() {
    const possible = this.model.domain.findAll(this.locationType);
    const actual = possible.find((item) => item.name === this.locationName);
    if (!actual) {
      throw new Error(`No location type ${this.locationType} found with name ${JSON.stringify(this.locationName)}`);
    }
    return actual;
  }

  get locationScene() {
    const loc = this.location;
    // FIXME: factions don't have scene descriptions (yet)
    // Maybe you can only be in buildings
    const fieldName = loc.type === "building" ? "buildingSceneDescription" : "";
    const nodes = model.domain.childrenByType(loc, fieldName);
    const text = nodes.map((node) => node.name).join(". ");
    return text;
  }

  get shortInventory() {
    return this.inventory.map((item) => item.split(":")[0]);
  }

  get skillDescription() {
    console.log("skills", this.skills);
    return Object.entries(this.skills).map(([skill, level]) => `${level} at ${skill}`);
  }

  toJSON() {
    return {
      name: this.name,
      appearance: this.appearance,
      history: this.history,
      socialStatus: this.socialStatus,
      callToAdventure: this.callToAdventure,
      mission: this.mission,
      imageUrl: this.imageUrl,
      money: this.money,
      inventory: this.inventory,
      skills: this.skills,
      locationName: this.locationName,
      locationType: this.locationType,
      chattingName: this.chattingName,
    };
  }

  updated() {
    this.model.updated();
  }

}

export async function getAllCities() {
  const cities = await layerDb.getAll();
  return cities.filter((city) => city.domain.schemaName === "citymaker");
}

const builtins = [
];

export const cityPlayerDb = new ModelTypeStore("cityplayer", CityPlayer, builtins);
