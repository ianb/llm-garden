/* eslint no-unused-vars: "off" */
import { signal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { loadStoryData, createStory } from "./storyloader";
import { Header } from "../components/header";
import { PageContainer, Button, TextInput } from "../components/common";
import Sidebar from "../components/sidebar";
import { QueryLog } from "../components/querylog";

let runnerPromise = null;
let runnerPromiseFilename = null;

export const InteractiveFictionView = ({ model }) => {
  const [version, setVersion] = useState(0);
  model.addOnUpdate(() => {
    setVersion(version + 1);
  });
  useEffect(() => {
    if (
      runnerPromise === null ||
      runnerPromiseFilename !== model.domain.z5url
    ) {
      startRunner(model.domain.z5url, model);
      runnerPromiseFilename = model.domain.z5url;
    }
  });
  const status = [
    model.domain.statusTextSignal.value,
    model.domain.statusSummarySignal.value,
  ]
    .filter((x) => x)
    .join(" ");
  return (
    <PageContainer>
      <Header
        title={model.title}
        status={status}
        section="IF"
        sectionLink="/interactive-fiction/"
        model={model}
      />
      <Sidebar>
        <Completer model={model} />
        <QueryLog gptcache={model.domain.gpt} />
      </Sidebar>
      <div class="py-1 px-3">
        <StatusLine
          text={model.statusTextSignal}
          summary={model.statusSummarySignal}
        />
        <Console
          model={model}
          onSubmit={model.domain.onInput.bind(model.domain)}
          inputEnabled={model.domain.inputEnabledSignal}
        />
      </div>
    </PageContainer>
  );
};

function startRunner(filename, model) {
  runnerPromise = (async function () {
    const data = await loadStoryData(filename);
    const runner = createStory(data, model);
    const generator = runner.run();
    setInterval(() => {
      generator.next();
    }, 50);
  })();
}

const StatusLine = ({ text, summary }) => (
  <div>
    <span style="float: right">{summary}</span>
    {text}
  </div>
);

let inputElRef;

const Console = ({ model, inputEnabled, onSubmit }) => {
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
    const el = e.target.querySelector("input");
    onSubmit(el.value);
    el.value = "";
    return false;
  }
  function onKeyUp(e) {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const dir = e.key === "ArrowUp" ? -1 : 1;
      const el = inputEl.current;
      el.value = model.domain.retrieveHistory(dir, el.value);
      e.preventDefault();
      return false;
    }
    return undefined;
  }
  const completion = model.domain.completionSignal.value;
  useEffect(() => {
    if (inputEl.current && completion) {
      inputEl.current.value = completion;
    }
  }, [completion]);
  if (inputEnabled.value) {
    input = (
      <form style="display: inline-block;" onSubmit={overrideSubmit}>
        <input
          class="p-1"
          autoFocus="1"
          type="text"
          style="width: 25em"
          ref={inputEl}
          onKeyUp={onKeyUp}
        />
      </form>
    );
  }
  return (
    <pre style="white-space: pre-wrap">
      {model.domain.textOutputSignal}
      {input}
    </pre>
  );
};

const completionText = signal("");

const Completer = ({ model }) => {
  const number = useRef(null);
  function doMany() {
    const num = number.current ? number.current.value : 1;
    model.domain.fillInMany(num);
  }
  return (
    <div>
      <Button onClick={model.domain.fillIn.bind(model.domain)}>
        Fill in input
      </Button>
      <Button onClick={model.domain.fillInAndComplete.bind(model.domain)}>
        Fill & Submit input
      </Button>
      <div>
        <TextInput
          class="w-24"
          type="number"
          defaultValue="10"
          inputRef={number}
        />
        <Button onClick={doMany}>Do many steps</Button>
      </div>
      <pre>{completionText.value}</pre>
    </div>
  );
};
