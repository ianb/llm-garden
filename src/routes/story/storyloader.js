import JSZM from "jszm";

export const stories = {
  "zork1.z5": {title: "Zork I"},
  "zork2.z5": {title: "Zork II"},
  "zork3.z5": {title: "Zork III"},
  "ztuu.z5": {title: "Zork: The Undiscovered Underground"},
  "Advent.z5": {title: "Colossal Cave Adventure"},
};

export async function loadStoryData(filename) {
  const resp = await fetch(`/z5s/${filename}`);
  const data = await resp.arrayBuffer();
  return data;
}


let story;

export function createStory(data, io) {
  data = data;
  story = new JSZM(data);
  story.io = io;
  Object.assign(story, methods);
  return story;
}

const methods = {
  print: function *(line) {
    this.io.print(line);
  },

  read: function *() {
    this.io.enableRead();
    let result;
    this.io.onReadOnce = (text) => {
      result = text;
    };
    while (!result) {
      yield "";
    }
    return result;
  },

  updateStatusLine: function *(text, scoreOrHour, movesOrMinutes) {
    let summary;
    if (this.statusType) {
      summary = `${scoreOrHour}h${movesOrMinutes}m`;
    } else {
      summary = `score: ${scoreOrHour} moves: ${movesOrMinutes}`;
    }
    this.io.updateStatusLine(text, summary);
  }
};
