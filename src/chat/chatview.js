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
import { SpeechButton, SpeechControlButton } from "../components/speech";
import * as icons from "../components/icons";

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
        model={model}
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
  function onChangeSaveHistory(event) {
    model.domain.saveHistory = event.target.value;
  }
  function onClearHistory() {
    model.domain.clearHistory();
  }
  function onUndo() {
    model.domain.undo();
  }
  function onSubmitIntro(textarea) {
    model.domain.intro = textarea.value;
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
      <Field>
        <span>Intro:</span>
        <TextArea onSubmit={onSubmitIntro} defaultValue={model.domain.intro} />
      </Field>
      <Field sideBySide={true}>
        <span>Human goes first?</span>
        <input
          type="checkbox"
          onChange={onChangeHumanFirst}
          value={model.domain.humanFirst}
        />
      </Field>
      <Field sideBySide={true}>
        <span>Save chat history in model?</span>
        <input
          type="checkbox"
          onChange={onChangeSaveHistory}
          value={model.domain.saveHistory}
        />
      </Field>
      <Button onClick={onClearHistory}>Clear Chat</Button>
      <Button onClick={onUndo}>Undo last chat</Button>
    </div>
  );
}

let recentHistoryLength = -1;

function Chat({ model }) {
  const textareaRef = useRef();
  function onSubmit(element) {
    model.domain.addUserInput(element.value);
    element.value = "";
  }
  function onUtterance(text) {
    model.domain.addUserInput(text);
    if (textareaRef.current) {
      textareaRef.current.value = "";
    }
  }
  useEffect(() => {
    if (
      textareaRef.current &&
      model.domain.history.length !== recentHistoryLength
    ) {
      recentHistoryLength = model.domain.history.length;
      textareaRef.current.scrollIntoView(false);
    }
  });
  return (
    <>
      <ChatHistory model={model} />
      <div class="flex">
        <icons.ChevronRight class="w-8 h-8 pt-1" />
        <TextArea textareaRef={textareaRef} onSubmit={onSubmit} />
        <SpeechButton
          class="ml-2"
          syncToRef={textareaRef}
          onUtterance={onUtterance}
        />
        <SpeechControlButton
          value={model.domain.speak}
          onChange={(value) => (model.domain.speak = value)}
        />
      </div>
    </>
  );
}

function ChatHistory({ model }) {
  const history = model.domain.history;
  return (
    <div class="overflow-y-auto h-5/6">
      {model.domain.intro ? <div>{model.domain.intro}</div> : null}
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
