/* eslint-disable require-yield */
import JSZM from "../vendor/jszm";

export async function loadStoryData(filename) {
  const resp = await fetch(`/interactive-fiction/z5s/${filename}`);
  const data = await resp.arrayBuffer();
  return data;
}

let story;

export function createStory(data, model) {
  story = new JSZM(data);
  story.model = model;
  Object.assign(story, methods);
  return story;
}

const methods = {
  *print(line) {
    this.model.domain.print(line);
  },

  *read() {
    this.model.domain.enableRead();
    let result;
    this.model.domain.onReadOnce = (text) => {
      result = text;
    };
    while (!result) {
      yield "";
    }
    return result;
  },

  *updateStatusLine(text, scoreOrHour, movesOrMinutes) {
    let summary;
    if (this.statusType) {
      summary = `${scoreOrHour}h${movesOrMinutes}m`;
    } else {
      summary = `score: ${scoreOrHour} moves: ${movesOrMinutes}`;
    }
    this.model.domain.updateStatusLine(text, summary);
  },
};
