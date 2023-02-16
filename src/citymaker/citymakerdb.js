import { ModelTypeStore } from "../db";
import { GptCache } from "../gptservice/gptcache";
import JSON5 from "json5";
import uuid from "../uuid";
import deepEqual from "../deepequal";

class CityMaker {
  constructor(props) {
    props = props || {};
    this.gpt = new GptCache({
      storageName: "citymaker",
      basePaths: [
        "citymaker",
        () => this.envelope && `citymaker/${this.envelope.slug}`,
      ],
      logResults: true,
      defaultPromptOptions: {
        temperature: 0.9,
        max_tokens: 700,
      },
    });
    this.properties = {};
    if (props.properties) {
      for (const [id, property] of Object.entries(props.properties)) {
        this.properties[id] = this._hydrateProperty(property);
      }
    }
    // Do this later so we know all properties are hydrated and ids can be resolved:
    Object.values(this.properties).forEach((p) => p.resolveIds());
    this.topLevelProperties = {};
    if (props.topLevelProperties) {
      for (const [typeName, id] of Object.entries(props.topLevelProperties)) {
        if (!this.properties[id]) {
          console.warn(
            `Top-level property ${typeName} with id ${id} not found`
          );
        } else {
          this.topLevelProperties[typeName] = this.properties[id];
        }
      }
    }
    this._fillTopLevelProperties();
  }

  select(selector) {
    return SelectArray.from(Object.values(this.topLevelProperties)).select(
      selector
    );
  }

  addProperty(property) {
    if (property.topLevel) {
      if (this.topLevelProperties[property.typeName]) {
        throw new Error(
          `Duplicate top-level property type: ${property.typeName}`
        );
      }
      this.topLevelProperties[property.typeName] = property;
    }
    this.properties[property.id] = property;
  }

  _fillTopLevelProperties() {
    for (const [name, cls] of Object.entries(propertyClasses)) {
      if (!cls.prototype.topLevel) {
        continue;
      }
      if (this.topLevelProperties[name]) {
        continue;
      }
      const property = new cls(this);
      this.addProperty(property);
    }
  }

  _hydrateProperty(propertyJson) {
    const cls = propertyClasses[propertyJson.typeName];
    if (!cls) {
      console.error("Unknown property type in", propertyJson);
      throw new Error(
        `Unknown property type: ${propertyJson.typeName} in JSON`
      );
    }
    return new cls(this, propertyJson);
  }

  toJSON() {
    const top = {};
    for (const [name, property] of Object.entries(this.topLevelProperties)) {
      top[name] = property.id;
    }
    return {
      topLevelProperties: top,
      properties: this.properties,
    };
  }

  updated() {
    if (
      this.topLevelProperties.cityName.name &&
      this.envelope.title !== this.topLevelProperties.cityName.name
    ) {
      this.envelope.title = this.topLevelProperties.cityName.name;
    }
    if (this.envelope) {
      this.envelope.updated();
    }
  }
}

const propertyClasses = {};
function registerPropertyClass(name, cls) {
  propertyClasses[name] = cls;
  cls.prototype.typeName = name;
}

class Property {
  constructor(city, props) {
    props = props || {};
    this.city = city;
    this._additionalChoicePrompt = props.additionalChoicePrompt || "";
    delete props.additionalChoicePrompt;
    Object.assign(this, props);
    if (!this.requires) {
      this._calculateRequires();
    }
    if (!this.id) {
      this.id = uuid();
    }
    this._updates = [];
    this._generatedChoices = [];
    this._createChildren(false);
  }

  select(selector) {
    let c;
    if (this.children) {
      c = SelectArray.from(this.children);
    } else {
      c = new SelectArray();
    }
    const results = c.select(selector);
    if (this.is(selector)) {
      results.unshift(this);
    }
    return results;
  }

  is(selector) {
    if (selector.includes(",")) {
      const selectors = selector.split(",");
      for (const s of selectors) {
        if (this.is(s)) {
          return true;
        }
      }
      return false;
    }
    return selector.trim() === this.typeName;
  }

  ancestor(selector) {
    let pos = this;
    while (pos.container) {
      if (pos.container.is(selector)) {
        return pos.container;
      }
      pos = pos.container;
    }
  }

  resolveIds() {
    if (this.children) {
      this.children = this.children.map((id) => this.city.properties[id]);
    }
    if (this.container && typeof this.container === "string") {
      this.container = this.city.properties[this.container];
    }
    this._createChildren(true);
  }

  get additionalChoicePrompt() {
    return this._additionalChoicePrompt;
  }

  set additionalChoicePrompt(prompt) {
    this._additionalChoicePrompt = prompt;
    this.updated();
  }

  _createChildren(resolved) {
    if (!resolved && this.children) {
      return;
    }
    if (this.createChildren) {
      if (!this.children) {
        this.children = [];
      }
      for (const cls of this.createChildren) {
        let found = false;
        for (const child of this.children) {
          if (child instanceof cls) {
            found = true;
            break;
          }
        }
        if (found) {
          continue;
        }
        const child = new cls(this.city, { container: this });
        this.city.addProperty(child);
        this.children.push(child);
      }
    }
  }

  addOnUpdate(fn) {
    this._updates.push(fn);
  }

  removeOnUpdate(fn) {
    this._updates = this._updates.filter((f) => f !== fn);
  }

  updated() {
    this._updates.forEach((fn) => fn());
    this.city.updated();
  }

  get editable() {
    return true;
    // Updated so most things are editable...
    // return !!(this.prompt || this.choices);
  }

  async generateChoices(noCache = false) {
    const prompt = this.generatePrompt();
    const result = await this.city.gpt.getCompletion({
      prompt,
      noCache,
    });
    this.choices = this.parseResponse(result.text);
    this._updates.forEach((fn) => fn());
  }

  async retrieveMoreChoices() {
    let prompt = this.generatePrompt();
    if (this.unpack === "json") {
      const existing = JSON.stringify(this.choices, null, "  ");
      prompt = `${prompt}\n\n${existing}\n\nList of addition choices in JSON:\n`;
    } else {
      const existing = this.choices
        .map((c) => `* ${this.describeChoice(c)}\n`)
        .join("");
      prompt = `${prompt}\n\n${existing}\n\nList of addition choices:\n`;
    }
    const result = await this.city.gpt.getCompletion({
      prompt,
    });
    const moreChoices = this.parseResponse(result.text);
    this.choices = this.choices.concat(moreChoices);
    this._updates.forEach((fn) => fn());
  }

  async refreshChoices() {
    this.choices = null;
    this._updates.forEach((fn) => fn());
    await this.generateChoices(true);
  }

  async coerceChoice(text) {
    if (this.unpack === "plain") {
      return text;
    }
    if (this.unpack === "json") {
      if (!this.coercePrompt) {
        throw new Error(`No coercePrompt defined for ${this.typeName}`);
      }
      const prompt = this.fillPromptTemplate(this.coercePrompt, {
        prompt: text,
      });
      const result = await this.city.gpt.getCompletion({
        prompt,
      });
      const value = decodeJsonPermissive(result.text);
      return value;
    }
    if (this.unpack.startsWith(":")) {
      throw new Error(`Unimplemented coerceChoice for ${this.unpack}`);
    }
  }

  async autoFillChoice() {
    const prompt = this.generatePrompt();
    this._isAutoFilling = true;
    this.updated();
    const result = await this.city.gpt.getCompletion({
      prompt,
    });
    this.acceptChoices(this.parseResponse(result.text));
    delete this._isAutoFilling;
    this.updated();
  }

  get isAutoFilling() {
    return !!this._isAutoFilling;
  }

  generatePrompt() {
    if (!this.prompt) {
      throw new Error(`No prompt defined for ${this.typeName}`);
    }
    return this.addAdditionalChoicePrompt(
      this.fillPromptTemplate(this.prompt, {})
    );
  }

  fillPromptTemplate(prompt, extraVars) {
    const re = /\$([a-z][a-z0-9]*(?:\.[a-z0-9]+)?)/gi;
    extraVars = extraVars || {};
    let match;
    let template = prompt;
    while ((match = re.exec(prompt))) {
      const path = match[1].split(".");
      if (path.length > 2) {
        console.warn("path is:", path);
        throw new Error(`Invalid variable: ${match[1]}`);
      }
      const variable = path[0];
      const field = path[1];
      let value;
      if (variable in extraVars) {
        value = extraVars[variable];
        if (field) {
          if (!(field in value)) {
            throw new Error(`Field ${field} not found in ${variable}`);
          }
          value = value[field];
        }
      } else if (this.city.topLevelProperties[variable]) {
        value = this.city.topLevelProperties[variable].resolveVariable(field);
      } else {
        let pos = this;
        for (;;) {
          if (!pos.container) {
            throw new Error(`Could not find variable in parents: ${match[0]}`);
          }
          pos = pos.container;
          if (pos.typeName === variable) {
            value = pos.resolveVariable(field);
            break;
          }
        }
      }
      template = template.replace(match[0], value);
    }
    return template;
  }

  addAdditionalChoicePrompt(prompt) {
    console.log("check regen", prompt, this.additionalChoicePrompt);
    if (this.additionalChoicePrompt) {
      let paragraphs = prompt.split("\n\n");
      paragraphs = paragraphs
        .slice(0, -1)
        .concat([this.additionalChoicePrompt])
        .concat(paragraphs.slice(-1));
      return paragraphs.join("\n\n");
    }
    return prompt;
  }

  resolveVariable(field) {
    if (!field) {
      return this.name;
    }
    if (this.attributes && this.attributes[field]) {
      return this.attributes[field];
    }
    return this[field];
  }

  _calculateRequires() {
    let requires;
    if (!Object.prototype.hasOwnProperty.call(this, "prompt")) {
      requires = this.constructor.prototype.requires = [];
    } else {
      requires = this.requires = [];
    }
    if (!this.prompt) {
      return;
    }
    const re = /\$([a-z][a-z0-9]*)/gi;
    let match;
    while ((match = re.exec(this.prompt))) {
      requires.push(match[1]);
    }
  }

  parseResponse(text) {
    if (this.unpack === "plain") {
      const choices = [];
      const re = /(\d+|\*|-|1️⃣-🔟)\.?\s+(.*)/gi;
      let match;
      while ((match = re.exec(text))) {
        choices.push(match[2].trim());
      }
      return choices;
    }
    if (this.unpack.startsWith(":")) {
      const choices = [];
      const fields = this.unpack.slice(1).split(":");
      const re = /(\d+|\*|-)\.?\s+(.*)/gi;
      let match;
      while ((match = re.exec(text))) {
        const choice = {};
        let parts = match[2].split(":");
        if (parts.length === 1) {
          parts = match[2].split(" - ");
        }
        for (let i = 0; i < fields.length; i++) {
          choice[fields[i]] = parts[i].trim();
        }
        choices.push(choice);
      }
      return choices;
    }
    if (this.unpack === "json") {
      const value = decodeJsonPermissive(text);
      return value;
    }
    throw new Error(`Unknown unpack type: ${this.unpack}`);
  }

  describeChoice(choice) {
    if (typeof choice === "string") {
      return choice;
    }
    if (this.unpack === "plain") {
      return choice.name || this.title;
    }
    if (this.unpack.startsWith(":")) {
      const fields = this.unpack.slice(1).split(":");
      const result = fields
        .map((f) => choice[f])
        .filter((x) => x && x.trim())
        .join(": ");
      return result ? result : this.title;
    }
    if (this.unpack === "json") {
      const parts = [];
      parts.push(`${choice.name || choice.title}`);
      if (choice.description) {
        parts.push(`: ${choice.description}`);
      }
      if (choice.type) {
        parts.push(` (${choice.type})`);
      }
      parts.push(this.describeChoiceAttributes(choice));
    }
    throw new Error(`Unknown unpack type: ${this.unpack}`);
  }

  describeChoiceAttributes(choice) {
    const parts = [];
    for (const key of Object.keys(choice)) {
      if (key === "name" || key === "description" || key === "type") {
        continue;
      }
      parts.push(`; ${key}=${choice[key]}`);
    }
    return parts.join("");
  }

  describeChoiceMarkdown(choice) {
    if (this.unpack === "json") {
      const parts = [];
      parts.push(`**${choice.name || this.title}**`);
      if (choice.description) {
        parts.push(`: ${choice.description}`);
      }
      if (choice.type) {
        parts.push(` (${choice.type})`);
      }
      const attrs = this.describeChoiceAttributesMarkdown(choice).trim();
      if (attrs) {
        parts.push(`<br /> ${attrs}`);
      }
      return parts.join("");
    } else {
      return this.describeChoice(choice);
    }
  }

  describeChoiceAttributesMarkdown(choice) {
    if (!this.attributeDescribers) {
      return this.describeChoiceAttributes(choice);
    }
    const seen = ["name", "type", "description"];
    const parts = [];
    for (const [key, renderer] of Object.entries(this.attributeDescribers)) {
      const keys = key.split("&");
      if (
        !keys.every((k) =>
          k.startsWith("!") ? !(k.slice(1) in choice) : k in choice
        )
      ) {
        continue;
      }
      for (const k of keys) {
        seen.push(k);
      }
      let v;
      if (typeof renderer === "function") {
        v = renderer(choice).trim();
      } else {
        v = fillTemplate(renderer, choice).trim();
      }
      if (v) {
        parts.push(` ${v}`);
      }
    }
    for (const [key, value] of Object.entries(choice)) {
      if (seen.includes(key)) {
        continue;
      }
      parts.push(` **${key}**: ${JSON.stringify(value)}`);
    }
    return parts.join("");
  }

  asChoice() {
    return Object.assign({}, { name: this.name }, this.attributes);
  }

  setChoice(value) {
    if (this.choiceType === "multi-choice") {
      throw new Error("setChoice() not supported for multi-choice properties");
    }
    if (!value) {
      throw new Error("Expected setChoice() value to be non-null");
    }
    if (typeof value === "object") {
      Object.assign(this, value);
    } else {
      this.name = value;
    }
    this.updated();
  }

  addChoice(value) {
    if (this.choiceType !== "multi-choice") {
      throw new Error("addChoice() only supported for multi-choice properties");
    }
    if (!value) {
      throw new Error("Expected addChoice() value to be non-null");
    }
    const o = new this.creates(this.city, { container: this });
    if (typeof value === "object") {
      if (value.name) {
        o.name = value.name;
        value = Object.assign({}, value);
        delete value.name;
      }
      o.attributes = value;
    } else {
      o.name = value;
    }
    this.city.addProperty(o);
    if (!this.children) {
      this.children = [o];
    } else {
      this.children.push(o);
    }
    this.updated();
  }

  hasChoice(value) {
    if (!this.children) {
      return false;
    }
    for (const child of this.children) {
      if (typeof value === "string") {
        value = { name: value };
      }
      if (child instanceof this.creates && deepEqual(child.asChoice(), value)) {
        return true;
      }
    }
    return false;
  }

  toJSON() {
    const result = {};
    for (const key of Object.keys(this)) {
      if (key.startsWith("_") || key === "city" || key === "choices") {
        continue;
      }
      if (!Object.prototype.hasOwnProperty.call(this, key)) {
        continue;
      }
      if (this[key] instanceof Property) {
        result[key] = this[key].id;
      } else {
        result[key] = this[key];
      }
    }
    result.typeName = this.typeName;
    result.additionalChoicePrompt = this.additionalChoicePrompt || undefined;
    if (result.children) {
      result.children = result.children.filter((x) => x).map((c) => c.id);
    }
    return result;
  }

  get editableValue() {
    const getattr = (name) => {
      if (name === "name") {
        return this.name;
      }
      return this.attributes[name];
    };
    if (this.unpack === "json") {
      const o = Object.assign({ name: this.name }, this.attributes);
      return propertySerialize(o);
    } else if (this.unpack.startsWith(":")) {
      const keys = this.unpack.slice(1).split(":");
      console.log("packer", this.unpack, keys);
      return keys.map((k) => getattr(k)).join(": ");
    } else {
      return this.name;
    }
  }

  set editableValue(value) {
    const setattr = (name, value) => {
      if (name === "name") {
        this.name = value;
      } else {
        this.attributes[name] = value;
      }
    };
    if (this.unpack === "json") {
      const result = propertyDeserialize(value);
      this.name = result.name;
      delete result.name;
      this.attributes = result;
    } else if (this.unpack.startsWith(":")) {
      const keys = this.unpack.slice(1).split(":");
      const parts = value.split(":");
      for (let i = 0; i < keys.length; i++) {
        setattr(keys[i], parts[i]);
      }
    } else {
      this.name = value;
    }
    this.updated();
  }
}

Property.prototype.unpack = "plain";
Property.prototype.topLevel = false;

// TypeScript would probably have saved me a lot of trouble on the stuff below...

class CityType extends Property {}

CityType.prototype.title = "City Type";
registerPropertyClass("cityType", CityType);
CityType.prototype.prompt = `A numbered list of types of historical or fantastical cities, such as these examples:

* A medieval city during a time of plague
* A high fantasy city with a magical university
* An underwater city with a submarine port
* The ancient city of Troy

Include a wide variety of types. You may include emoji in the types:
`;
CityType.prototype.choiceType = "single-choice";
CityType.prototype.topLevel = true;

class CityName extends Property {}

CityName.prototype.title = "City Name";
registerPropertyClass("cityName", CityName);
CityName.prototype.prompt = `A numbered list of interesting and exotic names for a city of type $cityType:`;
CityName.prototype.choiceType = "single-choice";
CityName.prototype.topLevel = true;

class CityBackstories extends Property {
  resolveVariable(field) {
    if (!field) {
      return this.children.map((x) => x.name).join(" ");
    }
    return super.resolveVariable(field);
  }
}

CityBackstories.prototype.title = "City Backstory";
registerPropertyClass("cityBackstories", CityBackstories);
CityBackstories.prototype.prompt = `Brainstorm a numbered list of one-sentence descriptions of the city $cityName that is $cityType. Include one or more examples describing:

* Climate
* The year when the city was most prosperous or most dangerous
* The economy of the city
* The geography of the city
* Formative historical events
* The level of technology present in the city
* The cultural context of the city, including immigrants, refugees, and religious groups
* The architecture and building materials used
* If buildings should protect from rain, heat, cold, or other elements
* Family and economic structure

Use the present tense. Include exciting and surprising facts that describe an amazing city:
`;
CityBackstories.prototype.choiceType = "multi-choice";
CityBackstories.prototype.topLevel = true;

class CityBackstory extends Property {}

CityBackstory.prototype.title = "City Backstory";
registerPropertyClass("cityBackstory", CityBackstory);
CityBackstories.prototype.creates = CityBackstory;

class NeighborhoodAlias extends Property {
  describeChoice(choice) {
    if (!choice || !choice.name) {
      return "Neighborhood name";
    }
    return `Neighborhoods are called "${choice.name}"`;
  }
}

NeighborhoodAlias.prototype.title = "Neighborhoods are called";
registerPropertyClass("neighborhoodAlias", NeighborhoodAlias);
NeighborhoodAlias.prototype.prompt = null;
NeighborhoodAlias.prototype.choices = [
  { name: "neighborhood" },
  { name: "district" },
  { name: "quarter" },
  { name: "zone" },
  { name: "section" },
  { name: "tract" },
  { name: "precinct" },
];
NeighborhoodAlias.prototype.choiceType = "single-choice";
NeighborhoodAlias.prototype.topLevel = true;

class CityNeighborhoods extends Property {}

CityNeighborhoods.prototype.title = "City Neighborhoods";
registerPropertyClass("cityNeighborhoods", CityNeighborhoods);
CityNeighborhoods.prototype.prompt = `The city $cityName is a $cityType. $cityBackstories

A numbered list of city $neighborhoodAlias using "name:description"; use interesting and thematic names for each $neighborhoodAlias. Include economic, cultural, and social distinctions:`;
CityNeighborhoods.prototype.choiceType = "multi-choice";
CityNeighborhoods.prototype.unpack = ":name:description";
CityNeighborhoods.prototype.topLevel = true;

class CityNeighborhood extends Property {}

CityNeighborhood.prototype.title = "Neighborhood";
registerPropertyClass("cityNeighborhood", CityNeighborhood);
CityNeighborhood.prototype.unpack = ":name:description";

CityNeighborhoods.prototype.creates = CityNeighborhood;

class Buildings extends Property {}

Buildings.prototype.title = "Buildings";
registerPropertyClass("buildings", Buildings);
Buildings.prototype.prompt = `In the city $cityName that is a $cityType, $cityBackstories
Create a list of buildings in $cityNeighborhood: $cityNeighborhood.description
Including at least a few residences. Use colorful descriptions for the buildings, giving each building a distinct personality.

Example:

[
  {
    name: "public toilet",
    description: "a crude public pit toilet",
    frequencyPerBlock: 0.5, // 0.0-1.0
    floors: 1,
    widthInMeters: 1,
    depthInMeters: 1,
  }
]

JSON list:`;
Buildings.prototype.coercePrompt = `In the city $cityName that is $cityType. $cityBackstories
Describe a building in $cityNeighborhood: $cityNeighborhood.description

Example:

  {
    name: "public toilet",
    description: "a crude public pit toilet",
    frequencyPerBlock: 0.5, // 0.0-1.0
    floors: 1,
    widthInMeters: 1,
    depthInMeters: 1,
  }

A JSON description of another building described as "$prompt":

`;
Buildings.prototype.choiceType = "multi-choice";
Buildings.prototype.unpack = "json";

CityNeighborhood.prototype.createChildren = [Buildings];

class Building extends Property {
  get roomList() {
    let result = [];
    for (const child of this.children) {
      if (child instanceof Rooms) {
        result = result.concat(child.children.map((c) => c.name));
      }
    }
    return result;
  }
  get roomListQuoted() {
    return JSON.stringify(this.roomList).slice(1, -1);
  }
  get roomListRegular() {
    return this.roomList.join(", ");
  }
}

Building.prototype.attributeDescribers = {
  frequencyPerBlock: (c) =>
    `**freq**: ${Math.floor(c.frequencyPerBlock * 100)}%`,
  "widthInMeters&depthInMeters": "**${widthInMeters}m×${depthInMeters}m**",
  "widthInMeters&!depthInMeters": "**width**: ${widthInMeters}m",
  "depthInMeters&!depthInMeters": "**depth**: ${depthInMeters}m",
};
Building.prototype.title = "Building";
Building.prototype.unpack = "json";
registerPropertyClass("building", Building);

Buildings.prototype.creates = Building;

class OwnersOccupants extends Property {}

OwnersOccupants.prototype.title = "Owners, Occupants, and Caretakers";
registerPropertyClass("ownersOccupants", OwnersOccupants);
OwnersOccupants.prototype.prompt = `The city $cityName that is $cityType. $cityBackstories

A list of owners, caretakers, residents, tenants, and other inhabitants for $building ($building.description). Give each person an interesting and culturally appropriate name and a colorful background.

Example:
[
  {
    type: "owner", // or "occupant" or "caretaker"
    name: "FirstName LastName",
    description: "a wealthy merchant",
    arrives: "8am",
    leaves: "6pm",
  }
]

JSON list:`;
OwnersOccupants.prototype.coercePrompt = `In $cityName is a $cityType, an owner, caretaker, resident, tenant, and other inhabitant for $building ($building.description). Give the person an interesting and culturally appropriate name.

Example:

  {
    type: "owner", // or "occupant" or "caretaker"
    name: "FirstName LastName",
    description: "a wealthy merchant",
    arrives: "8am",
    leaves: "6pm",
  }

A JSON description of another person described as "$prompt":
`;
OwnersOccupants.prototype.choiceType = "multi-choice";
OwnersOccupants.prototype.unpack = "json";

class Person extends Property {}

Person.prototype.attributeDescribers = {
  "arrives&leaves": "$arrives-$leaves",
  "arrives&!leaves": "arrives $arrives",
  "leaves&!arrives": "leaves $leaves",
};
Person.prototype.title = "Person";
Person.prototype.unpack = "json";
registerPropertyClass("person", Person);

OwnersOccupants.prototype.creates = Person;

class Visitors extends Property {}

Visitors.prototype.title = "Visitors";
registerPropertyClass("visitors", Visitors);
Visitors.prototype.prompt = `The city $cityName is a $cityType. $cityBackstories

A list of visitors, guests, patrons, or clients who might visit $building ($building.description). Give each an interesting and culturally appropriate name and colorful background.

Example:
[
  {
    type: "customer",
    name: "FirstName LastName",
    description: "FirstName comes by to buy bread from the bakery every morning",
    arrives: "7am",
    leaves: "8am",
  }
]

JSON list:`;
Visitors.prototype.coercePrompt = `In city $cityName is a $cityType. $cityBackstories

A person is a visitor, guest, patron, or client visiting $building ($building.description). Give the person an interesting and culturally appropriate name.

Example:
  {
    type: "customer",
    name: "FirstName LastName",
    description: "FirstName comes by to buy bread from the bakery every morning",
    arrives: "7am",
    leaves: "8am",
  }

A JSON description of another visitor described as "$prompt":
`;
Visitors.prototype.choiceType = "multi-choice";
Visitors.prototype.unpack = "json";
Visitors.prototype.creates = Person;

class Rooms extends Property {}

Rooms.prototype.title = "Rooms";
registerPropertyClass("rooms", Rooms);
Rooms.prototype.prompt = `The city $cityName is a $cityType. $cityBackstories
A list of rooms in $building ($building.description) in the $cityNeighborhood.

Example:
[
  {
    name: "bedroom",
    description: "a small bedroom with a single bed",
    privacy: "public", // or "private", "secure", "secret"
    floor: 1, // from 1-$building.floors
    widthInMeters: 2,
    depthInMeters: 3,
  }
]

JSON list:`;
Rooms.prototype.coercePrompt = `The city $cityName is a $cityType.
Give a room in $building ($building.description) in the $cityNeighborhood.

Example:
  {
    name: "bedroom",
    description: "a small bedroom with a single bed",
    privacy: "public", // or "private", "secure", "secret"
    floor: 1, // from 1-$building.floors
    widthInMeters: 2,
    depthInMeters: 3,
  }

A JSON description of another room described as "$prompt":
`;
Rooms.prototype.choiceType = "multi-choice";
Rooms.prototype.unpack = "json";

class Room extends Property {
  get furniture() {
    const furnituresList = this.children.filter((x) => x instanceof Furnitures);
    if (!furnituresList.length) {
      return "no furniture";
    }
    const furnitures = furnituresList[0];
    return (furnitures.children || []).map((x) => x.name).join(", ");
  }
}

Room.prototype.attributeDescribers = {
  privacy: (c) => {
    if (["private", "public", "secure", "secret"].includes(c.privacy)) {
      return `**${c.privacy}**`;
    }
    return `**privacy**: ${c.privacy}`;
  },
  "widthInMeters&depthInMeters": "**${widthInMeters}m×${depthInMeters}m**",
  "widthInMeters&!depthInMeters": "**width**: ${widthInMeters}m",
  "depthInMeters&!depthInMeters": "**depth**: ${depthInMeters}m",
};
Room.prototype.title = "Room";
Room.prototype.unpack = "json";
registerPropertyClass("room", Room);
Rooms.prototype.creates = Room;

class RoomConnections extends Property {
  acceptChoices(choices) {
    this.connections = choices;
    this.updated();
  }
  describeChoice(choice) {
    if (choice.connections) {
      return choice.connections
        .map((c) => this.describeChoice(c))
        .join("<br />   \n");
    }
    if (!choice.roomsConnected) {
      return this.title;
    }
    const rooms = choice.roomsConnected.join("↔");
    return (
      `${rooms} via ${choice.connector}` +
      (choice.canBeLocked ? " (lockable)" : "")
    );
  }
  describeChoiceMarkdown(choice) {
    return this.describeChoice(choice);
  }
  asChoice() {
    return { connections: this.connections };
  }
}

RoomConnections.prototype.title = "Room Connections";
registerPropertyClass("roomConnections", RoomConnections);
RoomConnections.prototype.prompt = `A list of connections between rooms in $building.roomListRegular.

Example:

[
  {
    "roomsConnected": ["kitchen", "bedroom"],
    "connector": "door", // or "passageway", "stairway", "hallway",
    "canBeLocked": false,
  }
]

JSON with the room names $building.roomListQuoted:`;
RoomConnections.prototype.choiceType = "accept";
RoomConnections.prototype.unpack = "json";

Building.prototype.createChildren = [
  OwnersOccupants,
  Visitors,
  Rooms,
  RoomConnections,
];

class Furnitures extends Property {}

Furnitures.prototype.title = "Furniture";
registerPropertyClass("furnitures", Furnitures);
Furnitures.prototype.prompt = `The city $cityName is a $cityType. $cityBackstories
A list of furniture in the room $room.name in the building $building.name ($building.description).

The room is described as $room.description.

Example:
[
  {
    name: "bed",
    description: "a small bed with a single mattress",
    widthInMeters: 1,
    depthInMeters: 2,
    onSideOfRoom: true,
  }
]

JSON list:`;
Furnitures.prototype.coercePrompt = `The city $cityName is a $cityType. $cityBackstories
Give furniture in the room $room.name in the building $building.name ($building.description).

The room is described as $room.description.

Example:
  {
    name: "bed",
    description: "a small bed with a single mattress",
    widthInMeters: 1,
    depthInMeters: 2,
    onSideOfRoom: true,
  }

A JSON description of another piece of furniture described as "$prompt":
`;
Furnitures.prototype.choiceType = "multi-choice";
Furnitures.prototype.unpack = "json";

class Furniture extends Property {}

Furniture.prototype.attributeDescribers = {
  onSideOfRoom: (c) => (c.onSideOfRoom ? "side of room" : "center of room"),
  "widthInMeters&depthInMeters": "**${widthInMeters}m×${depthInMeters}m**",
  "widthInMeters&!depthInMeters": "**width**: ${widthInMeters}m",
  "depthInMeters&!depthInMeters": "**depth**: ${depthInMeters}m",
};
Furniture.prototype.title = "Furniture";
Furniture.prototype.unpack = "json";
registerPropertyClass("furniture", Furniture);
Furnitures.prototype.creates = Furniture;

class Items extends Property {}

Items.prototype.title = "Items";
registerPropertyClass("items", Items);
Items.prototype.prompt = `The city $cityName is a $cityType. $cityBackstories
A list of items in the room $room in the building $building.name ($building.description).

The room is described as $room.description. It contains the furniture $room.furniture.

Include only movable items and not furniture in the list.

Example:
[
  {
    name: "book",
    description: "a book about the history of the city",
    weightInKg: 0.5,
    size: "small", // or "medium" or "large"
    containedInFurniture: "room", // or $room.furniture
  }
]

JSON list:`;
Items.prototype.coercePrompt = `The city $cityName is a $cityType. $cityBackstories
An item in the room $room in the building $building.name ($building.description).

The room is described as $room.description. It contains the furniture $room.furniture.

Example:
  {
    name: "book",
    description: "a book about the history of the city",
    weightInKg: 0.5,
    size: "small", // or "medium" or "large"
    containedInFurniture: "room", // or $room.furniture
  }

A JSON description of another item described as "$prompt":
`;
Items.prototype.choiceType = "multi-choice";
Items.prototype.unpack = "json";

class Item extends Property {}

Item.prototype.attributeDescribers = {
  containedInFurniture: (c) =>
    c.containedInFurniture !== "room" ? `in ${c.containedInFurniture}` : "",
  weightInKg: "${weightInKg}kg",
  size: "$size",
};
Item.prototype.title = "Item";
Item.prototype.unpack = "json";
registerPropertyClass("item", Item);
Items.prototype.creates = Item;

Room.prototype.createChildren = [Furnitures, Items];

function decodeJsonPermissive(text) {
  // Remove trailing semicolons
  text = text.trim().replace(/;+$/, "");
  const extraTail = [
    "",
    "]",
    "}]",
    "}}]",
    "}}}]",
    '"}]',
    '"}}]',
    '"}}}]',
    "'}]",
    "'}}]",
    "'}}}]",
    "null}]",
    "null}}]",
    "null}}}]",
    ":null}]",
    ":null}}]",
    ":null}}}]",
    '":null}]',
    '":null}}]',
    '":null}}}]',
    "':null}]",
    "':null}}]",
    "':null}}}]",
  ];
  let printedOnce = false;
  let firstError;
  const textwithFixedNewlines = text.replace(
    /(\"[^"]*\":\s+\"[^\"]*)\n/g,
    "$1"
  );
  const baseTexts = [text];
  if (textwithFixedNewlines !== text) {
    console.info("Also parsing newline fixed JSON");
    baseTexts.push(textwithFixedNewlines);
  }
  for (const baseText of baseTexts) {
    for (const option of extraTail) {
      try {
        const result = JSON5.parse(baseText + option);
        if (printedOnce) {
          console.info(
            "Parsed successfully with ending",
            JSON.stringify(option),
            result
          );
        }
        return result;
      } catch (e) {
        if (!firstError) {
          firstError = e;
        }
        if (!printedOnce) {
          console.info("Failing to parse JSON:", text);
          printedOnce = true;
        } else {
          console.warn(
            "Still could not parse with ending",
            JSON.stringify(option)
          );
        }
      }
    }
  }
  console.warn("Could not fix JSON");
  throw firstError;
}

function fillTemplate(template, vars) {
  let match;
  while ((match = template.match(/\$(?:\{[a-zA-Z0-9_]+\}|[a-z0-9_]+)/gi))) {
    let variable = match[0];
    if (variable.startsWith("$")) {
      variable = variable.slice(1);
    }
    if (variable.startsWith("{")) {
      variable = variable.slice(1, -1);
    }
    const val = vars[variable];
    if (val === undefined) {
      console.warn("Oddly undefined variable", match[0]);
    }
    template = template.replace(match[0], val);
  }
  return template;
}

class SelectArray extends Array {
  select(selector) {
    const result = new SelectArray();
    for (const item of this) {
      for (const x of item.select(selector)) {
        result.push(x);
      }
    }
    return result;
  }
}

function propertySerialize(o) {
  if (!o || typeof o !== "object") {
    console.warn("Serializing non-object:", o);
    return JSON.stringify(o);
  }
  const lines = [];
  for (const key of Object.keys(o)) {
    const val = o[key];
    if (val === "" || val === undefined || val === null) {
      lines.push(`${key}: `);
      continue;
    }
    if (typeof val === "string") {
      lines.push(`${key}: ${val}`);
      continue;
    }
    lines.push(`${key}: ${JSON.stringify(val)}`);
  }
  return lines.join("\n");
}

function propertyDeserialize(text) {
  if (
    text.startsWith('"') ||
    text.startsWith("[") ||
    text === "null" ||
    text === "true" ||
    text === "false"
  ) {
    return JSON.parse(text);
  }
  const result = {};
  for (const line of text.split("\n")) {
    if (
      !line.trim() ||
      line.trim().startsWith("#") ||
      line.trim().startsWith("//")
    ) {
      continue;
    }
    const parts = line.split(/:/);
    if (parts.length === 1) {
      console.warn("Line with no :", JSON.stringify(line));
      continue;
    }
    const key = parts[0].trim();
    let val = parts[1].trim();
    if (val === "null") {
      val = null;
    } else if (val === "true") {
      val = true;
    } else if (val === "false") {
      val = false;
    } else if (/^\s*\d+\s*$/.test(val)) {
      val = parseInt(val, 10);
    } else if (/^\s*\d+\.\d+\s*$/.test(val)) {
      val = parseFloat(val, 10);
    } else if (val.startsWith("{") || val.startsWith("[")) {
      val = JSON.parse(val);
    }
    result[key] = val;
  }
  return result;
}

// FIXME: "tone" isn't the right type!
export const cityMakerDb = new ModelTypeStore("citymaker", CityMaker, []);
