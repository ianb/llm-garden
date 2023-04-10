export function fillTemplate(template, getVariable, getVariablePath, reprFunction) {
  const re = /(?:\$([a-z][a-z0-9]*(?:\.[a-z0-9]+)*(?:[|a-z0-9]+)*)|\$\{([^}]+)\})([.,;]?)/gi;
  let match;
  let result = template;
  while ((match = re.exec(template))) {
    const expr = match[1] || match[2];
    const parts = expr.split("|");
    const path = parts[0].split(".");
    const filters = parts.slice(1);
    let punctuation = match[3];
    const variable = path[0];
    const field = path[1];
    let value = getVariable(variable);
    value = getVariablePath(value, path.slice(1));
    for (const filter of filters) {
      let filterName = filter;
      let args = [];
      if (filterName.includes(":")) {
        args = filterName.split(":").slice(1);
        filterName = filterName.split(":")[0];
      }
      if (!FILTERS[filterName]) {
        console.warn("Unknown filter", filterName, "from", filter);
        throw new Error(`Unknown filter: ${filter}`);
      }
      try {
        value = FILTERS[filterName](value, reprFunction, ...args);
      } catch (e) {
        console.warn("Error rendering filter", filter, "in", match[0], ":", e);
      }
    }
    const str = reprFunction(value);
    if (/[.,;?!]$/.test(str)) {
      punctuation = "";
    }
    result = result.replace(match[0], str + punctuation);
  }
  return result;
}

export function templateVariables(template) {
  const re = /\$([a-z][a-z0-9]*(?:\.[a-z0-9]+)*(?:[|a-z0-9]+)*)|\$\{([^}]+)\}/gi;
  const result = {};
  let match;
  while ((match = re.exec(template))) {
    const expr = match[1] || match[2];
    const parts = expr.split("|");
    const path = parts[0].split(".");
    let variable = path[0];
    variable = variable.split(":")[0];
    if (!(variable in result)) {
      result[variable] = match[0];
    }
  }
  return result;
}

const FILTERS = {
  first(v, repr) {
    return v[0] || "";
  },

  rest(v, repr) {
    return v.slice(1);
  },

  repr(v, repr) {
    return repr(v);
  },

  json(v, repr) {
    return JSON.stringify(v);
  },

  jsonExamples(v, repr) {
    if (!Array.isArray(v)) {
      return JSON.stringify(v);
    }
    const items = v.map((item) => JSON.stringify(repr(item)));
    return items.join(", ");
  },

  markdownList(v, repr) {
    if (!v) {
      return "";
    }
    if (!Array.isArray(v)) {
      console.warn("markdownList got a value that is not an array: ", v);
      throw new Error(`markdownList: not an array`);
    }
    return v.map((item) => `* ${repr(item)}`).join("\n");
  },

  optional(v, repr) {
    if (!v) {
      return "";
    }
    return repr(v);
  },

  nameDescription(v, repr) {
    if (!v) {
      return "";
    }
    if (Array.isArray(v)) {
      return v.map((item) => FILTERS.nameDescription(item, repr));
    }
    if (!v.attributes || !v.attributes.description) {
      return v;
    }
    return `${v.name}: ${v.attributes.description}`;
  },

  pack(v, repr, ...attrs) {
    if (!v) {
      return "";
    }
    if (Array.isArray(v)) {
      return v.map((item) => FILTERS.pack(item, repr, ...attrs));
    }
    if (attrs.length === 0) {
      return v.name;
    }
    return `${v.name} (${attrs.map((attr) => attr === "name" ? v.name : v.attributes[attr]).join(": ")})`;
  },

  get(v, repr, ...attrs) {
    if (!v) {
      return "";
    }
    const result = [];
    for (const ob of v) {
      let value = ob;
      for (const attr of attrs) {
        value = value.attributes[attr] || value[attr];
      }
      if (Array.isArray(value)) {
        result.push(...value);
      } else {
        result.push(value);
      }
    }
    return result;
  }
};

export function dedent(template) {
  if (template === null || template === undefined) {
    throw new Error("Template is null or undefined");
  }
  template = template.trim();
  let lines = template.split("\n");
  const firstLine = lines[0];
  lines = lines.slice(1);
  let indent = -1;
  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed) {
      const newIndent = line.length - trimmed.length;
      if (indent === -1 || newIndent < indent) {
        indent = newIndent;
      }
    }
  }
  const result = lines
    .map((line) => line.slice(indent))
    .join("\n")
    .trim();
  return firstLine + "\n" + result;
}

export function joinNaturalStrings(strings) {
  if (strings.length === 0) {
    return "";
  }
  if (strings.length === 1) {
    return strings[0];
  }
  let result = "";
  for (let i = 0; i < strings.length; i++) {
    const s = strings[i].trim();
    if (!s) {
      continue;
    }
    if (!result) {
      result = s;
    } else {
      if (/[,;.]$/.test(result)) {
        result += " " + s;
      } else {
        result += ", " + s;
      }
    }
  }
  return result;
}
