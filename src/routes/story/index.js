import { h } from 'preact';
import style from './style.css';
import { signal } from "@preact/signals";
import { useEffect, useRef } from 'preact/hooks';
import { loadStoryData, createStory, stories } from "./storyloader";
import Header from "../../components/header";
import { getGptCompletion } from "../../gpt";
import { holder } from "../../key";

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
    <Sidebar>
      <Completer />
    </Sidebar>
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

let inputElRef;

const Console = ({text, inputEnabled, onSubmit}) => {
  const inputEl = useRef(null);
  inputElRef = inputEl;
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

const Sidebar = ({children}) => (
  <div class="sidebar">{children}</div>
);

const completionText = signal("");

const Completer = () => {
  const number = useRef(null);
  function doMany() {
    let num = number.current ? number.current.value : 1;
    fillInMany(num);
  }
  return <div>
    <button onClick={fillIn}>Fill in input</button> <br />
    <button onClick={fillInAndComplete}>Fill & Submit input</button> <br />
    <input type="number" defaultValue="10" ref={number} /> <button onClick={doMany}>Do many steps</button>
    <br />
    <pre>{completionText.value}</pre>
  </div>;
};

function fillIn() {
  doFill(false, 1);
}

function fillInAndComplete() {
  doFill(true, 1);
}

function fillInMany(num) {
  doFill(true, num);
}

async function doFill(complete, num=1) {
  if (num <= 0) {
    return;
  }
  let text = constructPrompt();
  completionText.value = text;
  console.log("Doing request for", text);
  let resp = await getGptCompletion({
    model: "text-davinci-002",
    temperature: 0.2,
    max_tokens: 40,
    prompt: text,
    frequency_penalty: 0,
    temperature: 1.0,
  }, holder.getKey());
  let completion = resp.choices[0].text.trim().split("\n")[0];
  console.log("Got response:", resp, completion);
  completionText.value = text + "//=> " + completion;
  if (inputElRef.current) {
    inputElRef.current.value = completion;
  }
  if (complete) {
    io.onInput(completion);
  }
  return doFill(complete, num - 1);
}

function constructPrompt() {
  let history = 20;
  let result = filterChunks(io.chunks, history);
  return `Playing a text adventure:\n\n${result.trimEnd()}`;
}

function filterChunks(chunks, count) {
  let originalCount = count;
  chunks = [...chunks];
  let result = [];
  while (count > 0) {
    if (chunks.length == 0) {
      break;
    }
    let last = chunks.length - 1;
    if (count != originalCount && 
        chunks.length >= 2 && 
        chunks[last].type == "output" && 
        badResponse(chunks[last].value) && 
        chunks[last-1].type == "input") {
      console.log("Ignoring:", chunks[last].value)
      chunks.pop();
      chunks.pop();
      continue;
    }
    let v = chunks[last].value;
    if (chunks[last].type == "input") {
      v += "\n";
    }
    result.unshift(v);
    chunks.pop();
    count--;
  }
  return result.join("");
}

function badResponse(output) {
  return /I don't know the word|You can't go that way/i.test(output);
}

class IO {
  constructor() {
    this.history = [];
    this.chunks = [];
    this.historyIndex = -1;
    this.historyInProgress = "";
  }
  
  print(msg) {
    text.value = text.value + msg;
    if (this.chunks.length > 0 && this.chunks[this.chunks.length-1].type == "output") {
      this.chunks[this.chunks.length-1].value += msg;
    } else {
      this.chunks.push({type: "output", value: msg});
    }
  }

  enableRead() {
    inputEnabled.value = true;
  }

  onInput(t) {
    if (!t) {
      console.warn("Got onInput(empty)");
      return;
    }
    if (this.onReadOnce) {
      this.onReadOnce(t);
      this.onReadOnce = null;
    } else {
      console.warn("Got text without onReadOnce:", t);
    }
    text.value = text.value + t + "\n";
    this.chunks.push({type: "input", value: t});
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
