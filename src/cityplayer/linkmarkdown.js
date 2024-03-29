export function linkMarkdownObjects(text, objects, linkPrefix) {
  const leftover = [];
  let result = text;
  for (const object of objects) {
    let name = object.name;
    name = name.replace(/^the\s+/i, "");
    const re = new RegExp(`\\b${name}\\b`, "g");
    let found = false;
    result = result.replace(re, (match) => {
      found = true;
      return `[${match}](${linkPrefix}/${encodeURIComponent(object.name)})`;
    });
    if (!found) {
      leftover.push(object);
    }
  }
  if (leftover.length) {
    result += "\n\nOthers:\n";
    result += leftover.map(ob => `* [${ob.name}](${linkPrefix}/${encodeURIComponent(ob.name)})`).join("\n");
  }
  return result;
}
