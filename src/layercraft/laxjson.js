import JSON5 from "json5";

export function parseJSON(text, putTrailingInKey = null) {
  // Remove trailing semicolons
  text = text.trim().replace(/;+$/, "").trim();
  // Sometimes the JSON will start with "this is a blah:\n\n[json]"; catch that here:
  const match = text.match(/^[a-zA-Z][^\n]+:\n/);
  if (match) {
    text = text.slice(match[0].length).trim();
  }
  const extraTail = [
    "",
    "]",
    "}]",
    "}}]",
    "}}}]",
    '"}]',
    '"}}]',
    '"}}}]',
    "'}]",
    "'}}]",
    "'}}}]",
    "null}]",
    "null}}]",
    "null}}}]",
    ":null}]",
    ":null}}]",
    ":null}}}]",
    '":null}]',
    '":null}}]',
    '":null}}}]',
    "':null}]",
    "':null}}]",
    "':null}}}]",
  ];
  let printedOnce = false;
  let firstError;
  const textwithFixedNewlines = text.replace(
    /(\"[^"]*\":\s+\"[^\"]*)\n/g,
    "$1"
  );
  const baseTexts = [text];
  if (textwithFixedNewlines !== text) {
    console.info("Also parsing newline fixed JSON");
    baseTexts.push(textwithFixedNewlines);
  }
  let extra;
  if (putTrailingInKey) {
    const leading = baseTexts[0][0];
    let end;
    if (leading === "[") {
      end = "]";
    } else if (leading === "{") {
      end = "}";
    } else {
      console.info(`JSON starts with unexpected character "${JSON.stringify(leading)}"`);
    }
    if (end) {
      const parts = baseTexts[0].split(end);
      const last = parts.pop();
      if (last.trim()) {
        extra = last.trim();
        baseTexts.push(baseTexts[0].slice(0, -last.length));
      }
    }
  }
  for (const baseText of baseTexts) {
    for (const option of extraTail) {
      try {
        const result = JSON5.parse(baseText + option);
        if (printedOnce) {
          console.info(
            "Parsed successfully with ending",
            JSON.stringify(option),
            result
          );
        }
        if (extra) {
          result[putTrailingInKey] = extra;
        }
        return result;
      } catch (e) {
        if (!firstError) {
          firstError = e;
        }
        if (!printedOnce) {
          console.info("Failing to parse JSON:", text);
          printedOnce = true;
        } else {
          console.warn(
            "Still could not parse with ending",
            JSON.stringify(option)
          );
        }
      }
    }
  }
  console.warn("Could not fix JSON");
  throw firstError;
}
