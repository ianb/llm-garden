/* eslint-disable no-unused-vars */
import { ImportExportMenu } from "../components/modelmenu";
import { Header } from "../components/header";
import Sidebar from "../components/sidebar";
import { QueryLog } from "../components/querylog";
import { useState, useRef, useEffect } from "preact/hooks";
import {
  PageContainer,
  TextInput,
  Field,
  TextArea,
  Button,
} from "../components/common";
import { SpeechButton } from "../components/speech";

export const ChatView = ({ model }) => {
  const [version, setVersion] = useState(0);
  model.addOnUpdate(() => {
    setVersion(version + 1);
  });
  return (
    <PageContainer>
      <Header
        title={model.title || "? Chat ?"}
        section="Chat"
        sectionLink="/chat/"
        trackerPaths={["chat"]}
        menu={<ImportExportMenu model={model} />}
      />
      <Sidebar>
        <PromptEditor model={model} />
        <QueryLog gptcache={model.domain.gpt} />
      </Sidebar>
      <div class="w-2/3 p-2">
        <Chat model={model} />
      </div>
    </PageContainer>
  );
};

function PromptEditor({ model }) {
  // FIXME: this should be onUpdate or something, not onSubmit (i.e., no enter required):
  function onSubmit(textarea) {
    model.domain.prompt = textarea.value;
    console.log("updating prompt", textarea.value, model.domain.prompt);
  }
  function onTitle(event) {
    model.title = event.target.value;
  }
  function onChangeHumanFirst(event) {
    model.domain.humanFirst = event.target.value;
  }
  function onClearHistory() {
    model.domain.clearHistory();
  }
  return (
    <div>
      <Field>
        <span>Title:</span>
        <TextInput onInput={onTitle} defaultValue={model.title} />
      </Field>
      <Field>
        <span>Prompt:</span>
        <TextArea onSubmit={onSubmit} defaultValue={model.domain.prompt} />
      </Field>
      <Field sideBySide={true}>
        <span>Human goes first?</span>
        <input
          type="checkbox"
          onChange={onChangeHumanFirst}
          value={model.domain.humanFirst}
        />
      </Field>
      <Button onClick={onClearHistory}>Clear Chat</Button>
    </div>
  );
}

function Chat({ model }) {
  const inputRef = useRef();
  function onSubmit(event) {
    event.preventDefault();
    const text = inputRef.current.value;
    console.log("ref is", inputRef.current, [text]);
    model.domain.addUserInput(text);
    inputRef.current.value = "";
    return false;
  }
  function onUtterance(text) {
    model.domain.addUserInput(text);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }
  return (
    <>
      <ChatHistory model={model} />
      <div class="flex">
        <code>{">"}</code>
        <form onSubmit={onSubmit} class="inline grow">
          <TextInput inputRef={inputRef} />
        </form>
        <SpeechButton
          class="ml-2"
          syncToRef={inputRef}
          onUtterance={onUtterance}
        />
      </div>
    </>
  );
}

function ChatHistory({ model }) {
  const history = model.domain.history;
  const divRef = useRef();
  useEffect(() => {
    if (divRef.current) {
      divRef.current.scrollTop = divRef.current.scrollHeight;
    }
  });
  console.log("history is", history.length, history);
  return (
    <div class="overflow-y-auto h-5/6" ref={divRef}>
      {history.map((item, i) => {
        if (item.type === "user") {
          return (
            <div class="text-blue-600">
              {"> "}
              {item.text}
            </div>
          );
        } else {
          return <div>{item.text}</div>;
        }
      })}
    </div>
  );
}
