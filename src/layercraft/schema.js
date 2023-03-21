class Property {
  constructor(editor, { name, title, parent, prompt, coercePrompt, choiceType, unpack }) {
    this.editor = editor;
    this.name = name;
    this.parent = parent;
    this.title = title;
    this.prompt = prompt;
    this.coercePrompt = coercePrompt;
    this.choiceType = choiceType;
    this.unpack = unpack;
  }
}

class PropertyValue {
  constructor(editor, { property, name, attributes, additionalPrompt, children }) {
    this.editor = editor;
    this.property = property;
    this.name = name;
    this.attributes = attributes;
    this.additionalPrompt = additionalPrompt;
    this.children = children;
  }

  toJSON() {
    return {
      property: this.property.name,
      name: this.name,
      attributes: this.attributes,
      additionalPrompt: this.additionalPrompt,
      children: this.children,
    }
  }
}
