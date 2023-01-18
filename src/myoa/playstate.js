export class PlayState {
  constructor(initState) {
    this.initState = initState;
    this.state = Object.assign({}, initState);
  }

  toJSON() {
    const result = {};
    for (const key in this.state) {
      if (!deepEqual(this.state[key], this.initState[key])) {
        result[key] = this.state[key];
      }
    }
    return result;
  }

  deserialize(s) {
    if (!s) {
      return;
    }
    const data = deserialize(s);
    this.state = Object.assign({}, this.initState, data);
  }

  serialize() {
    if (!Object.keys(this.toJSON()).length) {
      return "";
    }
    return serialize(this.toJSON());
  }

  evaluate(s) {
    console.info(`evaluating (${s}) with:`, this.state);
    return window.withEval(this.state, s);
  }

  check(string) {
    const expr = /\(\((.*?)\)\)/.exec(string);
    if (expr) {
      return this.evaluate(expr[1]);
    }
    return true;
  }

  exec(string) {
    const expr = /\{\{(.*?)\}\}/.exec(string);
    if (expr) {
      return this.evaluate(expr[1]);
    }
    return null;
  }

  clean(string) {
    return string
      .replace(/\(\(.*?\)\)/g, "")
      .replace(/\{\{.*?\}\}/g, "")
      .trim();
  }

  clone() {
    const s = new PlayState(this.initState);
    s.state = Object.assign({}, this.state);
    return s;
  }

  withExec(s) {
    const state = this.clone();
    state.exec(s);
    return state;
  }

  debugRepr() {
    const lines = [];
    for (const key in this.state) {
      if (!deepEqual(this.state[key], this.initState[key])) {
        lines.push(`${key}: ${JSON.stringify(this.state[key], null, "  ")}`);
      }
    }
    return lines.join("\n");
  }
}

// Why did I make my own serialization format here? I don't know, it's totally silly, JSON would have been fine!
function serialize(data) {
  if (data === undefined) {
    throw new Error("Cannot serialize undefined");
  }
  if (data === null) {
    return "N";
  }
  if (typeof data === "boolean") {
    return data ? "T" : "F";
  }
  if (data === 0) {
    return "0";
  }
  if (data === 1) {
    return "1";
  }
  if (typeof data === "number") {
    const s = data.toString().slice(0, 35);
    return `n${serializeLength(s.length, 1)}${s}`;
  }
  if (typeof data === "string") {
    const val = cleanBtoa(data);
    return `s${serializeLength(val.length, 3)}${val}`;
  }
  if (Array.isArray(data)) {
    const s = data.map(serialize).join("");
    return `a${serializeLength(s.length, 2)}${s}`;
  }
  if (typeof data === "object") {
    const keys = Object.keys(data).filter((k) => data[k] !== undefined);
    keys.sort();
    const s = keys.map((k) => serializeKey(k) + serialize(data[k])).join("");
    return `o${serializeLength(keys.length, 2)}${s}`;
  }
  throw new Error(`Cannot serialize ${data}`);
}

function serializeLength(n, maxDigits) {
  let s = n.toString(36);
  if (s.length > maxDigits) {
    throw new Error(`Cannot serialize length ${n}`);
  }
  while (s.length < maxDigits) {
    s = "0" + s;
  }
  return s;
}

function serializeKey(key) {
  const val = cleanBtoa(key);
  return `${serializeLength(val.length, 1)}${val}`;
}

function deserializeLength(s, digits) {
  return [parseInt(s.slice(0, digits), 36), s.slice(digits)];
}

function deserializeKey(s) {
  const [length, s2] = deserializeLength(s, 1);
  const [key, s3] = [s2.slice(0, length), s2.slice(length)];
  return [cleanAtob(key), s3];
}

function deserializeOne(orig) {
  let s = orig;
  if (s.length === 0) {
    throw new Error("Cannot deserialize empty string");
  }
  const type = s[0];
  s = s.slice(1);
  if (type === "N") {
    return [null, s];
  }
  if (type === "T") {
    return [true, s];
  }
  if (type === "F") {
    return [false, s];
  }
  if (type === "0") {
    return [0, s];
  }
  if (type === "1") {
    return [1, s];
  }
  if (type === "n") {
    const [length, s2] = deserializeLength(s, 1);
    const [value, s3] = [s2.slice(0, length), s2.slice(length)];
    return [parseFloat(value), s3];
  }
  if (type === "s") {
    const [length, s2] = deserializeLength(s, 3);
    const [value, s3] = [s2.slice(0, length), s2.slice(length)];
    return [cleanAtob(value), s3];
  }
  if (type === "a") {
    const [length, s2] = deserializeLength(s, 2);
    const result = [];
    let remaining = s2;
    for (let i = 0; i < length; i++) {
      if (!remaining) {
        throw new Error(
          `Error deserializing array: ran out of data in "${orig}" at ${i}/${length}`
        );
      }
      const [value, s3] = deserializeOne(remaining);
      result.push(value);
      remaining = s3;
    }
    return [result, remaining];
  }
  if (type === "o") {
    const [length, s2] = deserializeLength(s, 2);
    const result = {};
    let remaining = s2;
    for (let i = 0; i < length; i++) {
      if (!remaining) {
        throw new Error(
          `Error deserializing object: ran out of data in "${orig}" at key ${i}/${length}`
        );
      }
      const [key, s3] = deserializeKey(remaining);
      const [value, s4] = deserializeOne(s3);
      result[key] = value;
      remaining = s4;
    }
    return [result, remaining];
  }
  throw new Error(`Cannot deserialize type ${type} from "${s}"`);
}

export function deserialize(s) {
  const [result, remaining] = deserializeOne(s);
  if (remaining) {
    throw new Error(`Error deserializing, has extra data: "${remaining}"`);
  }
  return result;
}

function deepEqual(a, b) {
  if (a === b) {
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
  if (typeof a === "object" && typeof b === "object" && a && b) {
    const keys = Object.keys(a);
    for (const key of keys) {
      if (!deepEqual(a[key], b[key])) {
        return false;
      }
    }
    return true;
  }
  return false;
}

function cleanAtob(s) {
  return atob(s.replace("-", "+").replace("_", "/"));
}

function cleanBtoa(s) {
  return btoa(s).replace(/=+$/g, "").replace("+", "-").replace("/", "_");
}
