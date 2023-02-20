export default class LocalCache {
  constructor(storageName) {
    this._storageName = `cache-${storageName}`;
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

  delete(key) {
    delete this._cache[key];
    this._save();
  }
}

window.purgeAllCaches = function () {
  console.info("Deleting cache...");
  let total = 0;
  let number = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith("cache-")) {
      const value = localStorage.getItem(key);
      total += value.length;
      number++;
      localStorage.removeItem(key);
      console.info(`  Deleting ${key} for ${value.length} bytes`);
    }
  }
  console.info(`Deleted ${number} items for ${total} bytes`);
};
