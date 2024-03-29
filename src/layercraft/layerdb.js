import { ModelTypeStore } from "../db";
import { GptCache } from "../gptservice/gptcache";
import { cityMakerSchema } from "./citymakerschema";
import { fillTemplate, templateVariables, dedent, joinNaturalStrings } from "./template";
import { parseJSON } from "./laxjson";
import { markdownToElement } from "../markdown";
import shuffle from "just-shuffle";
import deepMapValues from "just-deep-map-values";



class LayerCraft {
  constructor(props) {
    props = props || {};
    this.gpt = new GptCache({
      storageName: "layercraft",
      basePaths: [
        "layercraft",
        () => this.envelope && `layercraft/${this.envelope.slug}`,
      ],
      logResults: true,
      defaultPromptOptions: {
        temperature: 0.9,
        max_tokens: 700,
      },
    });
    this._document = props.document || { type: "document", children: [] };
    this._cleanDocument();
    this._schemaName = props.schemaName || null;
    this._pendingTypeChoices = new Map();
    this._images = props.images || [];
    this.overlappingNames = props.overlappingNames || undefined;
    this._ignoreOverlaps = props.ignoreOverlaps || undefined;
  }

  get document() {
    return this._document;
  }

  set document(value) {
    this._document = value;
    this.updated();
  }

  _cleanDocument() {
    function clean(ob) {
      if (ob.children) {
        ob.children = ob.children.filter((child) => child);
        if (!ob.children.length) {
          delete ob.children;
        } else {
          for (const child of ob.children) {
            clean(child);
          }
        }
      }
    }
    clean(this._document);
  }

  get schemaName() {
    return this._schemaName;
  }

  set schemaName(value) {
    this._schemaName = value;
    this.updated();
  }

  get schema() {
    return schemas[this.schemaName];
  }

  getField(name) {
    for (const field of this.schema.fields) {
      if (field.name === name) {
        return field;
      }
    }
    throw new Error(`No such field: ${name}`);
  }

  getInstructions(parent, type) {
    if (!parent.instructions || !parent.instructions[type]) {
      return null;
    }
    return parent.instructions[type];
  }

  setInstructions(parent, type, instructions) {
    if (!parent.instructions) {
      parent.instructions = {};
    }
    parent.instructions[type] = instructions;
    this.updated();
  }

  getAllObjects() {
    const result = [];
    function getObjects(ob) {
      for (const child of ob.children || []) {
        result.push(child);
        getObjects(child);
      }
      for (const child of ob.uncommittedChildren || []) {
        result.push(child);
        getObjects(child);
      }
    }
    getObjects(this._document);
    return result;
  }

  childrenByType(parent, type, uncommitted = false) {
    if (!parent) {
      throw new Error("No parent");
    }
    if (uncommitted) {
      if (!parent.uncommittedChildren) {
        return [];
      }
      return parent.uncommittedChildren.filter((child) => child.type === type);
    }
    if (!parent.children) {
      return [];
    }
    return parent.children.filter((child) => child && child.type === type);
  }

  hasAnyChildrenByType(parent, type) {
    if (parent.children) {
      for (const child of parent.children) {
        if (child && child.type === type) {
          return true;
        }
      }
    }
    if (parent.uncommittedChildren) {
      for (const child of parent.uncommittedChildren) {
        if (child.type === type) {
          return true;
        }
      }
    }
    return false;
  }

  canAddChild(parent, type) {
    const field = this.getField(type);
    if (field.choiceType === "single-choice" || field.choiceType === "auto") {
      return !this.hasAnyChildrenByType(parent, type);
    }
    return true;
  }

  hasRequirements(parent, type) {
    if (!parent) {
      throw new Error("No parent");
    }
    const field = this.getField(type);
    const template = field.prompt;
    const variables = templateVariables(template);
    for (const variable in variables) {
      const full = variables[variable];
      if (full.includes("|optional")) {
        continue;
      }
      if (field.variables && field.variables[variable]) {
        continue;
      }
      let value;
      if (full.includes(":anywhere")) {
        value = this.findAll(variable);
      } else {
        value = this.getVariable(parent, variable, type);
      }
      if (value === undefined || Array.isArray(value) && !value.length) {
        return false;
      }
    }
    return true;
  }

  missingRequirements(parent, type) {
    if (!parent) {
      throw new Error("No parent");
    }
    const field = this.getField(type);
    const template = field.prompt;
    const variables = templateVariables(template);
    const missing = [];
    for (let variable in variables) {
      let value;
      if (field.variables && field.variables[variable]) {
        continue;
      }
      if (variables[variable].includes(":anywhere")) {
        value = this.findAll(variable);
      } else {
        value = this.getVariable(parent, variable, type);
      }
      if (value === undefined || Array.isArray(value) && !value.length) {
        missing.push(variable);
      }
    }
    return missing;
  }

  async fillChoices(parent, type, noCache = false, modelType = null) {
    const field = this.getField(type);
    if (field.defaultValue) {
      if (this.canAddChild(parent, type)) {
        return this.fillDefaultValue(parent, type);
      }
      return;
    }
    if (parent.choices && parent.choices[type]) {
      return;
    }
    let t = this._pendingTypeChoices.get(type);
    if (t && t.has(parent)) {
      return;
    }
    if (!t) {
      t = new Set();
      this._pendingTypeChoices.set(type, t);
    }
    t.add(parent);
    try {
      let template = dedent(field.prompt);
      const instructions = this.getInstructions(parent, type);
      if (instructions && !("instructions" in templateVariables(template))) {
        const instructionIntroduction = field.instructionIntroduction || (
          !["auto", "plain"].includes(field.choiceType) ? "Apply these instructions to each item:"
            : "Make note of these instructions:");
        template += `\n\n${instructionIntroduction} \"${instructions}\"`;
      }
      const prompt = fillTemplate(
        template,
        (variable) => this.getVariable(parent, variable, type, { instructions }),
        this.getVariablePath.bind(this),
        (value) => this.repr(value)
      );
      const messages = [
        { role: "system", content: this.schema.systemPrompt },
        { role: "user", content: prompt },
      ];
      const query = {
        messages,
        noCache,
      };
      if (modelType === 4) {
        query.model = "gpt-4";
      }
      if (JSON.stringify(query).length > 500) {
        query.max_tokens = 1100;
      }
      if (field.max_tokens) {
        query.max_tokens = field.max_tokens;
      }
      const result = await this.gpt.getChat(query);
      let choices = this.parseResponse(result.text, this.getField(type).unpack);
      choices = choices.map((choice) => {
        const ob = { type, name: choice.name };
        delete choice.name;
        if (field.createName) {
          ob.name = fillTemplate(
            field.createName,
            (variable) => choice[variable],
            this.getVariablePath.bind(this),
            (value) => this.repr(value)
          );
        }
        if (instructions) {
          ob.creationInstructions = instructions;
        }
        if (Object.keys(choice).length) {
          ob.attributes = choice;
        }
        return ob;
      });
      if (!parent.choices) {
        parent.choices = {};
      }
      if (field.choiceType === "auto") {
        parent.choices[type] = [];
        if (this.canAddChild(parent, type)) {
          this.addChild(parent, type, choices[0]);
        }
        return;
      }
      parent.choices[type] = choices;
      this.updated();
    } finally {
      t.delete(parent);
    }
  }

  async fillDefaultValue(parent, type) {
    const template = this.getField(type).defaultValue;
    const name = fillTemplate(
      template,
      (variable) => this.getVariable(parent, variable, type),
      this.getVariablePath.bind(this),
      this.repr.bind(this)
    );
    const ob = { type, name };
    if (this.canAddChild(parent, type)) {
      this.addChild(parent, type, ob);
    }
    if (!parent.choices) {
      parent.choices = {};
    }
    parent.choices[type] = [];
  }

  async rerollChoices(parent, type, modelType) {
    if (parent.choices) {
      delete parent.choices[type];
    }
    this.updated();
    await this.fillChoices(parent, type, true, modelType);
    this.updated();
  }

  getVariable(parent, variable, evalType, extraVariables) {
    if (!parent) {
      throw new Error("No parent");
    }
    if (parent.type === variable) {
      return [parent];
    }
    if (extraVariables && variable in extraVariables) {
      return extraVariables[variable];
    }
    if (evalType) {
      const evalField = this.getField(evalType);
      if (evalField.variables && variable in evalField.variables) {
        return evalField.variables[variable](this.envelope, parent);
      }
    }
    let anywhere = false;
    if (variable.endsWith(":anywhere")) {
      variable = variable.split(":")[0];
      anywhere = true;
    }
    let field;
    try {
      field = this.getField(variable);
    } catch (e) {
      console.info("Could not resolve", variable, e);
      return "N/A";
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
      return this.getVariable(parentParent, variable, evalType, extraVariables);
    }
    return result;
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
      val = val[path];
    }
    return val;
  }

  selectByNames(objs, names) {
    if (!names || !names.length) {
      return [];
    }
    names = names.map(n => n.toLowerCase());
    const result = [];
    for (const obj of objs) {
      for (const name of names) {
        if (name.includes(obj.name.toLowerCase())) {
          result.push(obj);
          break;
        }
      }
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
    findIn(this.document);
    return result;
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

  getParent(obj) {
    if (obj === this.document) {
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
    return findIn(this.document);
  }

  getObjectPath(obj) {
    function findIn(parent, path) {
      for (const child of parent.children || []) {
        if (child === obj) {
          return path.concat([obj.name]);
        }
        if (child.children) {
          const subPath = path.concat([child.name]);
          const result = findIn(child, subPath);
          if (result) {
            return result;
          }
        }
      }
      return null;
    }
    return findIn(this.document, []);
  }

  findObjectByPath(path) {
    const searchPath = [...path];
    let parent = this.document;
    while (searchPath.length) {
      const name = searchPath.shift();
      let found = false;
      for (const child of parent.children || []) {
        if (child.name === name) {
          parent = child;
          found = true;
          break;
        }
      }
      if (!found) {
        console.warn("Could not find path", path, "in", parent, searchPath);
        return null;
      }
    }
    return parent;
  }

  parseResponse(text, unpack) {
    if (unpack === "json") {
      try {
        const result = parseJSON(text);
        return result;
      } catch (e) {
        console.warn("Failed to parse JSON", text);
        return [{ name: `Error: ${e}` }];
      }
    }
    if (unpack === "plain") {
      return [{ name: text.trim() }];
    }
    const el = markdownToElement(text);
    const result = [];
    for (const child of el.querySelectorAll("li")) {
      const text = child.innerText.trim();
      if (unpack === "$name:$description") {
        const [name, description] = text.split(":");
        result.push({ name, description });
      } else if (unpack === "plain" || !unpack) {
        result.push({ name: text });
      } else {
        throw new Error(`Unknown unpack: ${unpack}`);
      }
    }
    return result;
  }

  addChild(parent, type, ob, uncommitted = false) {
    if (uncommitted) {
      if (!parent.uncommittedChildren) {
        parent.uncommittedChildren = [];
      }
      parent.uncommittedChildren.push(ob);
    } else {
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(ob);
    }
    if (this.schema.titleField === ob.type && ob.name) {
      this.envelope.title = ob.name;
    }
    this.updated();
  }

  removeChild(obj) {
    const parent = this.getParent(obj);
    if (!parent) {
      throw new Error("No parent");
    }
    if (parent.children && parent.children.includes(obj)) {
      parent.children = parent.children.filter((child) => child !== obj);
    } else if (parent.uncommittedChildren && parent.uncommittedChildren.includes(obj)) {
      parent.uncommittedChildren = parent.uncommittedChildren.filter((child) => child !== obj);
    } else {
      throw new Error("No such child");
    }
    this.updated();
  }

  hasChildByName(parent, type, name) {
    if (parent.children) {
      for (const child of parent.children) {
        if (child.type === type && child.name === name) {
          return true;
        }
      }
    }
    if (parent.uncommittedChildren) {
      for (const child of parent.uncommittedChildren) {
        if (child.type === type && child.name === name) {
          return true;
        }
      }
    }
    return false;
  }

  async commitChoices(parent, type) {
    if (!parent.uncommittedChildren) {
      return;
    }
    const childrenNotUnique = parent.uncommittedChildren.filter((child) => child.type === type);
    console.log("xxx fixing");
    const children = await this.fixUniqueNames(type, childrenNotUnique);
    console.log("xxx fixed", children);
    if (!children.length) {
      return;
    }
    if (!parent.children) {
      parent.children = [];
    }
    parent.children.push(...children);
    parent.uncommittedChildren = parent.uncommittedChildren.filter((child) => child.type !== type);
    this.updated();
  }

  async fixUniqueNames(type, children) {
    const field = this.getField(type);
    if (!field.uniqueName) {
      return children;
    }
    const goodChildren = [];
    const fixingPromises = [];
    for (const child of children) {
      const overlapName = this.nameOverlaps(type, child)
      if (overlapName) {
        console.log("name problem", child.name);
        fixingPromises.push((async () => {
          const newChild = await this.fixUniqueName(type, child, overlapName);
          goodChildren.push(newChild);
        })());
      } else {
        goodChildren.push(child);
      }
    }
    await Promise.all(fixingPromises);
    return goodChildren;
  }

  nameOverlaps(type, object) {
    const field = this.getField(type);
    let thisNames = [object.name];
    if (field.uniqueName.split) {
      thisNames = splitName(thisNames[0]);
    }
    thisNames = thisNames.map(x => normalizeName(x));
    console.log("check", thisNames, "against", field.uniqueName.fields);
    for (const otherChild of this.getAllObjects()) {
      if (!field.uniqueName.fields.includes(otherChild.type)) {
        continue;
      }
      if (otherChild === object) {
        continue;
      }
      let names = [otherChild.name];
      if (field.uniqueName.split) {
        names = splitName(otherChild.name);
      }
      names = names.map(x => normalizeName(x));
      console.log("check", thisNames, "against", names);
      for (const thisExactName of thisNames) {
        if (names.includes(thisExactName)) {
          return thisExactName;
        }
      }
    }
    return false;
  }

  async fixUniqueName(type, object, overlapName) {
    const oldName = object.name;
    const newName = await this.findUniqueName(type, object, overlapName);
    const newObject = Object.assign({}, object, { name: newName });
    const repls = [
      [oldName, newName],
    ];
    const oldParts = oldName.split(/\s+/g);
    const newParts = newName.split(/\s+/g);
    for (let i = 0; i < oldParts.length; i++) {
      if (newParts[i]) {
        repls.push([oldParts[i], newParts[i]]);
      }
    }
    const deepNewObject = deepMapValues(newObject, (value) => {
      if (typeof value === "string") {
        for (const [oldValue, newValue] of repls) {
          value = value.replace(oldValue, () => newValue);
        }
      }
      return value;
    });
    return deepNewObject;
  }

  async findUniqueName(type, object, overlapName) {
    for (let i = 0; i < 3; i++) {
      // Try this up to three times
      let description = object.name;
      if (object.attributes.description) {
        description = `${description}: ${object.attributes.description}`;
      }
      if (i === 1) {
        overlapName = `all parts of the name ${object.name}`;
      }
      const resp = await this.gpt.getChat({
        messages: [
          { role: "system", content: "You are a naming helper." },
          { role: "user", content: `Create a numbered list of 10 alternative first/last name combinations for this person, specifically replacing ${overlapName}:\n${description}` },
        ],
        noCache: i > 0,
      });
      const el = markdownToElement(resp.text);
      const names = shuffle(Array.from(el.querySelectorAll("li")).map(li => li.innerText.trim()));
      for (const name of names) {
        if (!this.nameOverlaps(type, { name })) {
          return name;
        }
      }
    }
    throw new Error(`Could not find a unique name for ${object.name}`);
  }

  renderFieldDisplay(ob) {
    function reprFunction(ob) {
      if (typeof ob === "string") {
        return ob;
      }
      if (Array.isArray(ob)) {
        return ob.map(reprFunction).join(", ");
      }
      return JSON.stringify(ob);
    }
    const field = this.getField(ob.type);
    if (typeof ob.name === "string" && ob.name.startsWith("Error: ")) {
      return ob.name;
    }
    const props = Object.assign({ name: ob.name }, ob.attributes);
    const unused = new Set(Object.keys(props));
    const template = field.display ? dedent(field.display) : "$name";
    for (const variable in templateVariables(template)) {
      unused.delete(variable);
    }
    // Since this is required, if it's left out of the template then that's intentional:
    unused.delete("name");
    // Also this is auxiliary:
    unused.delete("shortDescription");
    let extra = "";
    if (unused.size) {
      const vars = Array.from(unused);
      vars.sort();
      const attrs = [];
      for (const variable of vars) {
        const val = props[variable];
        if (!val) {
          console.warn("Empty attribute", variable, ob);
          continue;
        }
        attrs.push(`${variable}: ${reprFunction(val)}`);
      }
      extra = ` – (${attrs.join("; ")})`;
    }
    try {
      const result = fillTemplate(
        template,
        (variable) => this.getVariable(ob, variable, ob.type, props),
        this.getVariablePath.bind(this),
        reprFunction
      ) + extra;
      return result;
    } catch (e) {
      console.warn("Failed to render template", template, ob);
      throw e;
    }
  }

  getChatMessages(object) {
    return object.chatMessages || [];
  }

  async addChatMessage(object, message) {
    if (!object.chatMessages) {
      object.chatMessages = [];
    }
    if (/^clear|restart|redo$/i.test(message)) {
      this.clearChatMessages(object);
      return;
    }
    if (/^undo|back/i.test(message)) {
      this.undoChatMessage(object);
      return;
    }
    object.chatMessages.push({ role: "user", content: message });
    this.updated();
    await this.updateChatMessage(object);
  }

  async updateChatMessage(object) {
    const systemPrompt = this.renderChatSystemPrompt(object);
    const botName = this.renderChatName(object);
    const prompt = [{
      role: "system",
      content: systemPrompt,
    }];
    const messages = this.getChatMessages(object);
    for (let i = 0; i < messages.length - 1; i++) {
      prompt.push(messages[i]);
    }
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "user") {
      console.warn("Expected last message to be role:user", messages);
    }
    prompt.push({
      role: "user",
      content: lastMessage.content + `\n\nRespond as the character ${botName}:`,
    });
    const response = await this.gpt.getChat({ messages: prompt });
    object.chatMessages.push({
      role: "assistant",
      content: response.text,
    });
    this.updated();
  }

  renderChatSystemPrompt(object) {
    const field = this.getField(object.type);
    if (!field.chatSystemPrompt) {
      throw new Error(`No chatSystemPrompt for ${object.type}`);
    }
    const extraFields = Object.assign({ name: object.name }, object.attributes);
    const result = fillTemplate(
      field.chatSystemPrompt,
      (variable) => this.getVariable(object, variable, object.type, extraFields),
      this.getVariablePath.bind(this),
      this.repr.bind(this),
    );
    return result;
  }

  renderChatName(object) {
    const field = this.getField(object.type);
    if (!field.chatName) {
      throw new Error(`No chatName for ${object.type}`);
    }
    const extraFields = Object.assign({ name: object.name }, object.attributes);
    const result = fillTemplate(
      field.chatName,
      (variable) => this.getVariable(object, variable, object.type, extraFields),
      this.getVariablePath.bind(this),
      this.repr.bind(this),
    );
    return result;
  }

  clearChatMessages(object) {
    object.chatMessages = [];
    this.updated();
  }

  undoChatMessage(object) {
    do {
      object.chatMessages.pop();
    } while (object.chatMessages.length && object.chatMessages[object.chatMessages.length - 1].role !== "assistant")
    this.updated();
  }

  textValue(object) {
    if (!object.attributes || !Object.keys(object.attributes).length) {
      return object.name.trim();
    }
    if (Object.keys(object.attributes).length === 1 && object.attributes.description) {
      return `${object.name}: ${object.attributes.description}`;
    }
    const lines = [`name: ${object.name}`];
    for (const key in object.attributes) {
      let value = object.attributes[key];
      if (Array.isArray(value)) {
        value = `[${value.join(", ")}]`;
      }
      lines.push(`${key}: ${value}`);
    }
    return lines.join("\n");
  }

  setTextValue(object, value) {
    const field = this.getField(object.type);
    if (field.unpack === "$name:$description" || (object.attibutes && Object.keys(object.attributes).length === 1 && object.attributes.description)) {
      const parts = value.split(/:/);
      if (!parts[1]) {
        object.name = value.trim();
        delete object.attributes.description;
      } else {
        object.name = parts[0].trim();
        object.attributes.description = parts[1].trim();
      }
    } else if (!object.attributes || !Object.keys(object.attributes).length) {
      object.name = value;
    } else {
      const lines = value.split("\n");
      for (const line of lines) {
        if (!line || !line.trim()) {
          continue;
        }
        const parts = line.split(/:/);
        const n = parts[0].trim();
        let v = parts[1].trim();
        if (v.startsWith("[") && v.endsWith("]")) {
          v = v.slice(1, -1).split(",").map((s) => s.trim());
        }
        if (n === "name") {
          object.name = v;
        } else {
          if (!object.attributes) {
            object.attributes = {};
          }
          object.attributes[n] = v;
        }
      }
    }
    this.updated();
  }

  applyNaturalEdit(object, edit) {
    const prompt = `Make this change to the text below, "${edit}":\n\n${this.textValue(object)}`;
    const messages = [
      { role: "system", content: this.schema.systemPrompt },
      { role: "user", content: prompt },
    ];
    const response = this.gpt.getChat({ messages });
    return response.text.trim();
  }

  toJSON() {
    return {
      schemaName: this.schemaName,
      document: this.document,
      images: this.images,
      overlappingNames: this.overlappingNames,
      ignoreOverlaps: this._ignoreOverlaps,
    };
  }

  updated() {
    if (this.envelope) {
      this.envelope.updated();
    }
  }

  setImage(object, imageUrl) {
    if (!imageUrl) {
      if (object.imageUrl) {
        let found = false;
        for (const image of this._images) {
          if (image.url === object.imageUrl) {
            image.deleted = Date.now();
            found = true;
            break;
          }
        }
        if (!found) {
          console.warn("Didn't find image to delete", object.imageUrl);
        }
      }
      delete object.imageUrl;
      this.updated();
      return;
    }
    object.imageUrl = imageUrl;
    const imageMetadata = {
      url: imageUrl,
      added: Date.now(),
      object: { type: object.type, name: object.name, attributes: object.attributes },
    };
    this._images.push(imageMetadata);
    this.updated();
  }

  getImageForObject(object) {
    if (object.imageUrl) {
      return object.imageUrl;
    }
    let fallback = null;
    for (const child of object.children || []) {
      if (child.imageUrl) {
        if (!this.getField(child.type).showImage) {
          return child.imageUrl;
        } else {
          fallback = child.imageUrl;
        }
      }
    }
    return fallback;
  }

  regenerateDuplicateNames() {
    this.overlappingNames = null;
    this.updated();
    const objs = this.getAllObjects();
    const overlaps = {};
    for (const ob of objs) {
      const name = ob.name;
      const parts = name.split(/\s+/g);
      if (parts.length > 3) {
        continue;
      }
      for (let subname of parts) {
        subname = normalizeName(subname);
        if (!(subname in overlaps)) {
          overlaps[subname] = [];
        }
        overlaps[subname].push(ob);
      }
    }
    const allNames = Array.from(Object.keys(overlaps));
    allNames.sort();
    for (const subname of allNames) {
      if (/^(the|a|an|or)$/i.test(subname)) {
        delete overlaps[subname];
        continue;
      }
      if (overlaps[subname].length < 2) {
        delete overlaps[subname];
        continue;
      }
      const objectNames = overlaps[subname].map((ob) => ob.name).join(",");
      const key = `${subname}:${objectNames}`;
      if (this._ignoreOverlaps && this._ignoreOverlaps.includes(key)) {
        delete overlaps[subname];
      }
    }
    const overlapsWithPaths = {};
    for (const subname in overlaps) {
      const objects = overlaps[subname];
      const paths = objects.map((ob) => this.getObjectPath(ob));
      overlapsWithPaths[subname] = paths;
    }
    this.overlappingNames = overlapsWithPaths;
    this.updated();
  }

  async generateAlternateNames(obj, problemName, noCache = false) {
    let desc = obj.name;
    if (obj.attributes && obj.attributes.description) {
      desc += `: ${obj.attributes.description}`;
    }
    const messages = [
      { role: "system", content: this.schema.systemPrompt },
      {
        role: "user", content: dedent(`
      ${desc}

      Create a numbered list of alternate names for "${obj.name}". Include 3 imaginative or exotic names, 3 normal names, 3 weird names, and 3 names that only replace "${problemName}".
      `)
      },
    ];
    const response = await this.gpt.getChat({ messages, noCache });
    const names = this.parseResponse(response.text, "");
    return names;
  }

  async renameObject(obj, newName) {
    const oldName = obj.name;
    const input = Object.assign({ name: obj.name }, obj.attributes);
    const messages = [
      { role: "system", content: this.schema.systemPrompt },
      {
        role: "user", content: dedent(`\
        Rename "${oldName}" to "${newName}" in this JSON:

        ${JSON.stringify(input, null, 2)}

        Respond with the new JSON
        `),
      },
    ];
    const response = await this.gpt.getChat({ messages });
    const newAttributes = this.parseResponse(response.text, "json");
    obj.name = newName;
    delete newAttributes.name;
    console.log("rename", obj.attributes, newAttributes);
    // Object.assign(obj.attributes, newAttributes);
    this.updated();
  }

  ignoreNameOverlap(overlapName, overlapObjects) {
    console.log("ignoring", overlapName, overlapObjects);
    const objectNames = overlapObjects.map((ob) => ob.name).join(",");
    const key = `${overlapName}:${objectNames}`;
    if (!this._ignoreOverlaps) {
      this._ignoreOverlaps = [];
    }
    this._ignoreOverlaps.push(key);
    delete this.overlappingNames[overlapName];
    this.updated();
  }
}

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

const titleRegex = /^(Mr\.?|Mrs\.?|Miss|Ms\.?|Dr\.?|Doctor|Prof\.?|Professor|Rev\.?|Reverend|Sgt\.?|Sergeant|Captain|Col\.?|Colonel|Mayor|Judge|Sir|Dame|Lady|(?:High )?Priest(?:ess)?)\b/i;

function splitName(name) {
  const match = titleRegex.exec(name);
  let prefix = "";
  if (match) {
    prefix = match[0] + " ";
    name = name.slice(match[0].length).trim();
  }
  const parts = name.split(/\s+/);
  const first = parts[0];
  return [prefix + first, ...parts.slice(1)];
}

export const schemas = {
  "citymaker": cityMakerSchema,
}

const builtins = [
  {
    title: "Veilvale",
    description: "A fantastical city powered by esoteric magic and a populace where everyone wears a mask as their identity",
    logo: "/assets/builtin-models/layercraft/veilvale.png",
    fromExport: "/assets/builtin-models/layercraft/veilvale.json",
  },
  {
    title: "Pearl Cove",
    description: "An underwater city populated by merfolk and their sea life companions.\n\nBy Lucia",
    logo: "/assets/builtin-models/layercraft/pearl-cove.png",
    fromExport: "/assets/builtin-models/layercraft/pearl-cove.json",
  },
];

export const layerDb = new ModelTypeStore("layercraft", LayerCraft, builtins);
