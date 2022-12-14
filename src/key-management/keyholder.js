import { decrypt } from "../vendor/encryption";

export default class KeyHolder {
  constructor(name, encrypted, validator) {
    this.name = name;
    this.encrypted = encrypted;
    this.validator = validator || ((v) => !!v);
    this._onUpdate = [];
  }

  addOnUpdate(func) {
    this._onUpdate.push(func);
  }

  removeOnUpdate(func) {
    this._onUpdate = this._onUpdate.filter((f) => f !== func);
  }

  fireOnUpdate() {
    this._onUpdate.forEach((f) => f());
  }

  get storageName() {
    return `key_${this.name}`;
  }

  hasKey() {
    return !!localStorage.getItem(this.storageName);
  }

  getKey() {
    if (!this.hasKey()) {
      throw new Error(`Key not found`);
    }
    return localStorage.getItem(this.storageName);
  }

  setKey(value) {
    localStorage.setItem(this.storageName, value);
    console.log(
      `To get an encrypted version of this key, run: testEncrypt(${JSON.stringify(
        value
      )}, "password")`
    );
    this.fireOnUpdate();
  }

  removeKey() {
    localStorage.removeItem(this.storageName);
    this.fireOnUpdate();
  }

  async setKeyFromText(textInput) {
    for (const e of this.encrypted) {
      let v;
      try {
        v = await decrypt(e, textInput);
      } catch (e) {
        continue;
      }
      if (!v) {
        continue;
      }
      if (this.validator(v)) {
        this.setKey(v);
        return true;
      }
    }
    if (this.validator(textInput)) {
      this.setKey(textInput);
      return true;
    }
    return false;
  }

  loadFromPassword(encrypted, password) {
    const v = decrypt(encrypted, password);
    if (v) {
      localStorage.setItem(this.storageName, v);
      return v;
    }
    return null;
  }
}
