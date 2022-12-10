export default class LocalCache {
  constructor(storageName) {
    this._storageName = storageName;
    this._cache = {};
    this._load();
    // should do: window.addEventListener("storage", ...)
  }

  _load() {
    const data = localStorage.getItem(this._storageName);
    if (data) {
      this._cache = JSON.parse(data);
    } else {
      this._cache = {};
    }
    if (!this._cache) {
      // Bad localStorage
      this._cache = {};
    }
  }

  _save() {
    localStorage.setItem(this._storageName, JSON.stringify(this._cache));
  }

  get(key) {
    return this._cache[key];
  }

  set(key, value) {
    this._cache[key] = value;
    this._save();
  }
}
