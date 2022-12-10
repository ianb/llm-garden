import { h } from "preact";
import { parse } from "marked";

export function parseHtml(html, wrap = true) {
  const p = new DOMParser();
  if (wrap) {
    html = `<div>${html}</div>`;
  }
  const doc = p.parseFromString(html, "text/html");
  const el = doc.body.childNodes[0];
  return el;
}

export function elementToPreact(element, callback) {
  const tag = element.tagName.toLowerCase();
  const attrs = {};
  for (const attr of element.attributes) {
    attrs[attr.name] = attr.value;
  }
  const children = [];
  for (const child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      children.push(child.textContent);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      children.push(elementToPreact(child, callback));
    }
  }
  let repl = null;
  if (callback) {
    repl = callback(element, tag, attrs, children);
  }
  if (!repl) {
    repl = h(tag, attrs, children);
  }
  return repl;
}

export function markdownToElement(markdown) {
  const rendered = parse(markdown);
  const el = parseHtml(rendered);
  return el;
}
