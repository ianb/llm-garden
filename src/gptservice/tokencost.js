export class TokenCostTracker {
  constructor(keyName) {
    this.keyName = keyName;
    this.tracked = {};
    this.sessionTracked = {};
    this._onUpdates = [];
    this.refreshFromLocalStorage();
    window.addEventListener("storage", this.onStorage.bind(this));
  }

  summarizePaths(paths) {
    if (typeof paths === "string") {
      paths = [paths];
    }
    const result = [];
    for (const path of paths) {
      let usage = this.tracked[path];
      usage = (usage || {}).total_tokens || 0;
      let today = this.sessionTracked[path];
      today = (today || {}).total_tokens || 0;
      result.push(`${path}: ${today}/${usage}`);
    }
    return result.join(" ");
  }

  trackUsage(paths, usage, model) {
    if (typeof paths === "string") {
      paths = [paths];
    }
    const date = new Date();
    const dateString = `${date.getFullYear()}-${
      date.getMonth() + 1
    }-${date.getDate()}`;
    const fullPaths = [];
    for (let path of paths) {
      path = path.trim().replace(/^\/+/, "").replace(/\/+$/, "");
      fullPaths.push(path);
      fullPaths.push(`${dateString}/${path}`);
    }
    fullPaths.push("all");
    const seen = new Set();
    for (const path of fullPaths) {
      if (seen.has(path)) {
        console.error(
          `The usage path "${path}" is in the list twice:`,
          fullPaths
        );
        continue;
      }
      seen.add(path);
      this.mergePaths(this.tracked, path, usage, model);
      this.mergePaths(this.sessionTracked, path, usage, model);
    }
    this.saveToLocalStorage();
    this.fireOnUpdate();
  }

  mergePaths(tracked, path, usage, model) {
    while (path) {
      tracked[path] = this.mergeUsage(tracked[path], usage);
      tracked[path][model] = this.mergeUsage(tracked[path][model], usage);
      if (!path.includes("/")) {
        break;
      }
      path = path.replace(/\/[^\/]+$/, "");
    }
  }

  mergeUsage(existingUsage, usage) {
    if (!existingUsage) {
      existingUsage = {};
    }
    existingUsage.prompt_tokens =
      (existingUsage.prompt_tokens || 0) + (usage.prompt_tokens || 0);
    existingUsage.completion_tokens =
      (existingUsage.completion_tokens || 0) + (usage.completion_tokens || 0);
    existingUsage.total_tokens =
      (existingUsage.total_tokens || 0) + (usage.total_tokens || 0);
    return existingUsage;
  }

  addOnUpdate(func) {
    this._onUpdates.push(func);
  }

  removeOnUpdate(func) {
    this._onUpdates = this._onUpdates.filter((x) => x !== func);
  }

  fireOnUpdate(func) {
    for (const func of this._onUpdates) {
      func(this);
    }
  }

  onStorage(event) {
    if (event.key && event.key === this.keyName) {
      this.refreshFromLocalStorage();
    }
  }

  refreshFromLocalStorage() {
    let val = localStorage.getItem(this.keyName);
    if (val && val !== "undefined") {
      val = JSON.parse(val);
      this.tracked = val;
    }
  }

  saveToLocalStorage() {
    localStorage.setItem(this.keyName, JSON.stringify(this.tracked));
  }
}

export const tokenCostTracker = new TokenCostTracker("tokenCosts");
