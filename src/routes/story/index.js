import { h } from 'preact';
import style from './style.css';
import { signal } from "@preact/signals";
import { useEffect, useRef } from 'preact/hooks';
import { loadStoryData, createStory, stories } from "./storyloader";
import Header from "../../components/header";

let runnerPromise = null;

const text = signal("Welcome!\n");
const inputEnabled = signal(false);
const statusText = signal("");
const statusSummary = signal("");

const Story = ({filename}) => {
  if (runnerPromise === null) {
    startRunner(filename);
  }
  let status = [statusText.value, statusSummary.value].filter(x=>x).join(" ");
  return <>
    <Header title={stories[filename].title} status={status} />
    <div class={style.home}>
      <StatusLine text={statusText} summary={statusSummary} />
      <Console text={text} onSubmit={io.onInput.bind(io)} inputEnabled={inputEnabled} />
    </div>;
  </>;
};

function startRunner(filename) {
  runnerPromise = (async function () {
    const data = await loadStoryData(filename);
    const runner = createStory(data, io);
    console.log("got runner", runner);
    let generator = runner.run();
    setInterval(() => {
      generator.next();
    }, 50);
  })();
}

const StatusLine = ({text, summary}) => (
  <div>
    <span style="float: right">{summary.value}</span>
    {text}
  </div>
);

const Console = ({text, inputEnabled, onSubmit}) => {
  let inputEl = useRef(null);
  useEffect(() => {
    if (inputEl.current) {
      inputEl.current.focus();
    }
  });
  let input = null;
  function overrideSubmit(e) {
    e.preventDefault();
    let el = e.target.querySelector("input");
    onSubmit(el.value);
    el.value = "";
    return false;
  }
  function onKeyUp(e) {
    if (e.key == "ArrowUp" || e.key == "ArrowDown") {
      let dir = e.key == "ArrowUp"? -1 : 1;
      let el = inputEl.current;
      el.value = io.retrieveHistory(dir, el.value);
      e.preventDefault();
      return false;
    } 
  }
  if (inputEnabled.value) {
    input = <form style="display: inline-block;" onSubmit={overrideSubmit}><input autoFocus="1" type="text" style="width: 30em" ref={inputEl} onKeyUp={onKeyUp} /></form>;
  }
	return <pre style="white-space: pre-wrap">{text.value}{input}</pre>
};

export default Story;


class IO {
  constructor() {
    this.history = [];
    this.historyIndex = -1;
    this.historyInProgress = "";
  }
  
  print(msg) {
    text.value = text.value + msg;
  }

  enableRead() {
    inputEnabled.value = true;
  }

  onInput(t) {
    if (this.onReadOnce) {
      this.onReadOnce(t);
      this.onReadOnce = null;
    } else {
      console.warn("Got text without onReadOnce:", t);
    }
    text.value = text.value + t + "\n";
    this.history.push(t);
    this.historyIndex = -1;
    this.historyInProgress = "";
    inputEnabled.value = false;
  }

  updateStatusLine(text, summary) {
    statusText.value = text;
    statusSummary.value = summary;
  }

  retrieveHistory(dir, existingInput) {
    if (this.historyIndex == -1) {
      if (dir == 1) {
        return existingInput;
      }
      this.historyInProgress = existingInput;
      this.historyIndex = this.history.length - 1;
      return this.history[this.historyIndex];
    }
    if (dir == 1) {
      this.historyIndex++;
      if (this.historyIndex >= this.history.length) {
        this.historyIndex = -1;
        return this.historyInProgress;
      }
      return this.history[this.historyIndex];
    } else {
      this.historyIndex--;
      if (this.historyIndex < 0) {
        this.historyIndex = -1;
        return this.historyInProgress;
      }
      return this.history[this.historyIndex];
    }
  }
}

const io = new IO();
