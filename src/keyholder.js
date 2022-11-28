import { encrypt, decrypt } from "./encryption";

export default class KeyHolder {
  constructor(name, encrypted, validator) {
    this.name = name;
    this.encrypted = encrypted;
    this.validator = validator || ((v) => !!v);
  }

  get storageName() {
    return `key_${name}`;
  }

  hasKey() {
    return !!localStorage.getItem(this.storageName);
  }

  getKey() {
    if (!hasKey) {
      throw new Error(`Key not found`);
    }
    return localStorage.getItem(this.storageName);
  }

  setKey(value) {
    localStorage.setItem(this.storageName, value);
    console.log(`To get an encrypted version of this key, run: testEncrypt({JSON.stringify(value)}, "password")`);
  }

  setKeyFromText(textInput) {
    for (let e of this.encrypted) {
      let v = decrypt(e, textInput);
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
    let v = decrypt(encrypted, password);
    if (v) {
      localStorage.setItem(this.storageName, v);
      return v;
    }
    return null;
  }
}
