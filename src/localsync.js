export default class LocalSync {
  constructor(keyName, obj) {
    this.keyName = keyName;
    this.obj = obj;
    this._load();
    this.obj.addOnUpdate(this._save.bind(this));
  }

  _load() {
    const json = localStorage.getItem(this.keyName);
    if (json && json !== "null") {
      const obj = JSON.parse(json);
      this.obj.updateFromJSON(obj);
    }
  }

  _save() {
    const json = JSON.stringify(this.obj);
    localStorage.setItem(this.keyName, json);
  }
}
