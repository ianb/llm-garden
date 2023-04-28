import Dexie from "dexie";
import uuid from "./uuid";
import { getGeneralLogoPrompt } from "./generallogoprompt";
import { getDallECompletion } from "./imageapi/dalle";
import { signal } from "@preact/signals";


const db = new Dexie("llmGarden");
window.db = db;
db.version(1).stores({
  models: `
  id,
  type,
  typeSlug,
  archived
  `,
  oldSlugs: `
  ++id,
  oldTypeSlug,
  type,
  modelId
  `,
});

export class Model {
  constructor({
    id,
    type,
    slug,
    builtin,
    title,
    archived,
    description,
    logo,
    logoPrompt,
    dateCreated,
    dateUpdated,
    dateImported,
    domain,
    domainClass,
  }) {
    if (!id) {
      id = uuid();
    }
    this._id = id;
    this._type = type;
    this._slug = slug;
    this._builtin = builtin;
    this._title = title;
    this._archived = archived || false;
    this._description = description;
    this._logo = logo;
    this._logoPrompt = logoPrompt;
    this._dateCreated = dateCreated;
    this._dateUpdated = dateUpdated;
    this._dateImported = dateImported;
    if (domainClass) {
      // This is instantiated without domainClass during indexing/preview
      if (domain) {
        if (!(domain instanceof domainClass)) {
          domain = new domainClass(domain);
        }
        domain.envelope = this;
        this._domain = domain;
      } else {
        this._domain = new domainClass();
        this._domain.envelope = this;
      }
    }
    this._onUpdates = [];
    this._dirty = false;
    this.updateVersion = signal(0);
  }

  get id() {
    return this._id;
  }

  set id(v) {
    throw new Error("Cannot set id");
  }

  get type() {
    return this._type;
  }

  set type(v) {
    throw new Error("Cannot set type");
  }

  get slug() {
    return this._slug;
  }

  set slug(v) {
    this._updateOldSlug(this._slug, this.typeSlug);
    this._slug = v;
    this.updated();
  }

  _updateOldSlug(slug, oldTypeSlug) {
    if (!slug) {
      return;
    }
    db.oldSlugs.put({ oldTypeSlug, type: this.type, modelId: this.id }).then(
      () => {
        // console.log("old slug added", oldTypeSlug, this.id);
      },
      (error) => {
        console.error("Adding old slug failed:", oldTypeSlug, error);
      }
    );
  }

  get builtin() {
    return this._builtin;
  }

  set builtin(v) {
    throw new Error("Cannot set builtin");
  }

  get title() {
    return this._title;
  }

  set title(v) {
    this._title = v;
    this.updated();
  }

  get archived() {
    return this._archived;
  }

  set archived(v) {
    this._archived = v;
    this.updated();
  }

  get description() {
    return this._description;
  }

  set description(v) {
    this._description = v;
    this.updated();
  }

  get logo() {
    return this._logo;
  }

  set logo(v) {
    this._logo = v;
    this.updated();
  }

  get logoPrompt() {
    return this._logoPrompt;
  }

  set logoPrompt(v) {
    this._logoPrompt = v;
    this.updated();
  }

  async generateLogoPrompt() {
    if (this.domain && this.domain.generateLogoPrompt) {
      const prompt = await this.domain.generateLogoPrompt();
      if (prompt) {
        this.logoPrompt = prompt;
        return;
      }
    }
    if (this.description) {
      this.logoPrompt = `${this.title}: ${this.description}`;
    } else {
      this.logoPrompt = this.title;
    }
  }

  async generateLogo() {
    const prompt = getGeneralLogoPrompt() + "\n" + this.logoPrompt;
    const resp = await getDallECompletion({
      n: 1,
      response_format: "b64_json",
      prompt,
      size: "256x256",
    });
    const b64 = resp.data[0].b64_json;
    return `data:image/png;base64,${b64}`;
  }

  get dateCreated() {
    return this._dateCreated;
  }

  set dateCreated(v) {
    this._dateCreated = v;
    // this.updated();
  }

  get dateUpdated() {
    return this._dateUpdated;
  }

  set dateUpdated(v) {
    this._dateUpdated = v;
    // this.updated();
  }

  get dateImported() {
    return this._dateImported;
  }

  set dateImported(v) {
    this._dateImported = v;
    this.updated();
  }

  get domain() {
    return this._domain;
  }

  set domain(v) {
    if (this._domain) {
      throw new Error("Cannot set domain twice");
    }
    this._domain = v;
    v.envelope = this;
  }

  addOnUpdate(func) {
    this._onUpdates.push(func);
  }

  removeOnUpdate(func) {
    this._onUpdates = this._onUpdates.filter((f) => f !== func);
  }

  updated() {
    this._dirty = true;
    for (const func of this._onUpdates) {
      try {
        func();
      } catch (e) {
        console.error(`Error ${this}.updated for ${func}: ${e}`);
      }
    }
    this.updateVersion.value += 1;
    this._saveToDbSoon();
  }

  get typeSlug() {
    return `${this.type}_${this.slug}`;
  }

  _saveToDbSoon() {
    setTimeout(() => {
      if (this._dirty) {
        this.saveToDb();
      }
    });
  }

  async saveToDb() {
    if (this.builtin) {
      // FIXME: need some way to explicitly fork, but otherwise a builtin shouldn't be updated
      return;
    }
    this._dateUpdated = Date.now();
    if (!this._dateCreated) {
      this._dateCreated = this._dateUpdated;
    }
    if (this.builtin) {
      // Saving forks the builtin...
      this._id = uuid();
      this._builtin = false;
    }
    await this.generateSlug();
    const o = recursiveToJSON(this);
    this._dirty = false;
    console.log("saving", o);
    await db.models.put(o, this.id);
  }

  async saveBuiltin() {
    // FIXME: it's not great this is being done in-place by updating and not copying the object
    this._builtin = false;
    await this.saveToDb();
    return this;
  }

  async delete() {
    await db.models.delete(this.id);
  }

  toJSON() {
    const o = {};
    const keys =
      `id type slug title archived description logo logoPrompt dateCreated dateUpdated dateImported`.split(
        " "
      );
    for (const key of keys) {
      o[key] = this[key];
    }
    if (this.domain) {
      o.domain = recursiveToJSON(this.domain);
    } else {
      console.warn("No .domain for model");
    }
    o.typeSlug = this.typeSlug;
    return o;
  }

  exportJSON() {
    return {
      exportType: this.type,
      exportDate: Date.now(),
      model: this.toJSON(),
    };
  }

  async generateSlug() {
    if (!this.title) {
      return;
    }
    if (this.title === this._slugTitle) {
      return;
    }
    let index = 0;
    for (; ;) {
      let slug = makeSlug(this.title);
      if (this.builtin) {
        // No duplicate test for builtins
        return slug;
      }
      if (index) {
        slug += "-" + index;
      }
      const existing = await db.models.get({
        typeSlug: `${this.type}_${slug}`,
      });
      if (!existing || existing.id === this.id) {
        if (this._slug === slug) {
          return;
        }
        this._updateOldSlug(this._slug, this.typeSlug);
        console.log(
          `Changing slug to ${slug} from ${this._slug} for ${this.title}`
        );
        this._slug = slug;
        this._slugTitle = this.title;
        return;
      }
      index++;
    }
  }
}

function makeSlug(text) {
  if (!text) {
    return "";
  }
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export class ModelTypeStore {
  constructor(type, cls, builtins) {
    this.type = type;
    this.cls = cls;
    this.builtins = builtins;
    this.builtinsBySlug = new Map();
    for (const model of builtins) {
      model.builtin = true;
      if (!model.slug) {
        model.slug = `builtin_${makeSlug(model.title)}`;
      }
      this.builtinsBySlug.set(model.slug, model);
    }
  }

  async create(defaultProps) {
    const props = Object.assign(
      {
        type: this.type,
        domainClass: this.cls,
      },
      defaultProps
    );
    const model = new Model(props);
    return model;
  }

  async getSummaries(includeArchived = false) {
    let models = db.models.where({ type: this.type });
    if (!includeArchived) {
      models = models.and((m) => !m.archive);
    }
    models = await models.sortBy("dateUpdated");
    console.log("models", models);
    console.log("got models with type", this.type, models.length, models.map(x => x.title));
    models = models.concat(this.builtins);
    // FIXME: technically this doesn't just get the summaries, but the entire objects
    return models.map((m) => new Model(Object.assign(
      { type: this.type, domainClass: this.cls }, m
    )));
  }

  async getAll(includeArchived = false) {
    return this.getSummaries(includeArchived);
  }

  async getBySlug(slug) {
    const modelData = await this.getDataBySlug(slug);
    const props = Object.assign(
      {
        type: this.type,
        domainClass: this.cls,
      },
      modelData
    );
    return new Model(props);
  }

  async getById(id) {
    const modelData = await this.getDataById(id);
    const props = Object.assign(
      {
        type: this.type,
        domainClass: this.cls,
      },
      modelData
    );
    return new Model(props);
  }

  async getDataBySlug(slug) {
    if (slug.startsWith("builtin_")) {
      const data = this.builtinsBySlug.get(slug);
      if (!data) {
        throw new Error(`No builtin ${this.type} found with slug ${slug}`);
      }
      return await this.loadBuiltinData(data);
    }
    const model = await db.models.get({ typeSlug: `${this.type}_${slug}` });
    if (!model) {
      const oldSlug = await db.oldSlugs.get({
        oldTypeSlug: `${this.type}_${slug}`,
      });
      if (oldSlug) {
        return this.getDataById(oldSlug.modelId);
      }
    }
    if (!model) {
      throw new Error(`No ${this.type} found with slug ${slug}`);
    }
    return model;
  }

  async loadBuiltinData(data) {
    if (data.fromExport) {
      const exportData = await fetch(data.fromExport);
      const exportJSON = await exportData.json();
      delete data.fromExport;
      data.domain = exportJSON.model.domain;
    }
    return data;
  }

  async getDataById(id) {
    const model = await db.models.get({ id });
    if (!model) {
      throw new Error(`No ${this.type} found with id ${id}`);
    }
    return model;
  }
}

function recursiveToJSON(o, limit = 20) {
  if (limit <= 0) {
    console.warn("Depth too far trying to deserialize object", o);
    throw new Error("toJSON recursion limit exceeded");
  }
  if (o && typeof o === "object" && o.toJSON) {
    const subobj = o.toJSON();
    if (subobj.toJSON) {
      console.warn("toJSON inside toJSON in", o);
      return {};
    }
    return recursiveToJSON(subobj, limit - 1);
  }
  if (Array.isArray(o)) {
    return o.map((v) => recursiveToJSON(v, limit - 1));
  }
  if (o && typeof o === "object") {
    const o2 = {};
    for (const k in o) {
      o2[k] = recursiveToJSON(o[k], limit - 1);
    }
    return o2;
  }
  return o;
}
