import Dexie from "dexie";
import uuid from "./uuid";

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
    this._dateCreated = dateCreated;
    this._dateUpdated = dateUpdated;
    this._dateImported = dateImported;
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
    this._onUpdates = [];
    this._dirty = false;
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
    this._slug = v;
    // FIXME: should set oldSlugs somehow
    this.updated();
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
        console.error(`Error ${this}.fireOnUpdate for ${func}: ${e}`);
      }
    }
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
    this._dateUpdated = Date.now();
    if (!this._dateCreated) {
      this._dateCreated = this._dateUpdated;
    }
    if (this.builtin) {
      // Saving forks the builtin...
      this._id = uuid();
      this._builtin = false;
    }
    if (!this.slug && this.title) {
      this._slug = await this.generateSlug();
    }
    const o = recursiveToJSON(this);
    // if (o.domain.title) {
    //   let t = o.domain.title;
    //   if (t.value) {
    //     t = t.value;
    //   }
    //   if (typeof t === "string" && this._title !== t) {
    //     // FIXME: this causes an infinite loop for some reason
    //     // this._title = t;
    //   }
    // }
    this._dirty = false;
    await db.models.put(o, this.id);
  }

  toJSON() {
    const o = {};
    const keys =
      `id type slug title archived description dateCreated dateUpdated dateImported`.split(
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
    // FIXME: this doesn't ensure the slug is unique
    let index = 0;
    for (;;) {
      let slug = this.title.toLowerCase().replace(/[^a-z0-9]/g, "-");
      if (index) {
        slug += "-" + index;
      }
      const existing = db.models.get({ typeSlug: `${this.type}_${slug}` });
      if (!existing) {
        return slug;
      }
      index++;
    }
  }
}

export class ModelTypeStore {
  constructor(type, cls, builtins) {
    this.type = type;
    this.cls = cls;
    this.builtins = builtins;
    this.builtinsBySlug = new Map();
    for (const model of builtins) {
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
    models = models.concat(this.builtins);
    // FIXME: technically this doesn't just get the summaries, but the entire objects
    return models.map((m) => new Model(m));
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
      const data = this.builtinsBySlug.get(slug.slice("builtin_".length));
      data.builtin = true;
      return data;
    }
    const model = await db.models.get({ typeSlug: `${this.type}_${slug}` });
    if (!model) {
      const oldSlug = await db.oldSlugs.get({
        oldTypeSlug: `${this.builtinstype}_${slug}`,
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

  async getDataById(id) {
    const model = await db.models.get({ id });
    if (!model) {
      throw new Error(`No ${this.type} found with id ${id}`);
    }
    return model;
  }
}

function recursiveToJSON(o) {
  if (o && typeof o === "object" && o.toJSON) {
    const subobj = o.toJSON();
    if (subobj.toJSON) {
      console.warn("toJSON inside toJSON in", o);
      return {};
    }
    return recursiveToJSON(subobj);
  }
  if (Array.isArray(o)) {
    return o.map((v) => recursiveToJSON(v));
  }
  if (o && typeof o === "object") {
    const o2 = {};
    for (const k in o) {
      o2[k] = recursiveToJSON(o[k]);
    }
    return o2;
  }
  return o;
}
