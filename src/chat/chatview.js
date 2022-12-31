/* eslint-disable no-unused-vars */
import { ImportExportMenu } from "../components/modelmenu";
import { Header } from "../components/header";
import Sidebar from "../components/sidebar";
import { QueryLog } from "../components/querylog";
import { useState, useRef, useEffect } from "preact/hooks";
import {
  PageContainer,
  Field,
  TextArea,
  TextInput,
  Button,
} from "../components/common";
import { SpeechButton, SpeechControlButton } from "../components/speech";
import * as icons from "../components/icons";
import { ModelTitleDescriptionEditor } from "../components/modelindex";

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
      <div class="p-2">
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
  function onInput(event) {
    model.domain.prompt = event.target.value;
  }
  function onUpdateHumanName(event) {
    model.domain.humanName = event.target.value;
  }
  function onUpdateRobotName(event) {
    model.domain.robotName = event.target.value;
  }
  function onUpdateExampleInteraction(event) {
    model.domain.exampleInteraction = event.target.value;
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
  function onInputIntro(event) {
    model.domain.intro = event.target.value;
  }
  return (
    <div>
      <ModelTitleDescriptionEditor model={model} />
      <Field>
        <span>Prompt:</span>
        <TextArea
          onSubmit={onSubmit}
          onInput={onInput}
          defaultValue={model.domain.prompt}
        />
      </Field>
      <Field>
        <span>Human name:</span>
        <TextInput
          onInput={onUpdateHumanName}
          defaultValue={model.domain.humanName}
        />
      </Field>
      <Field>
        <span>Robot name:</span>
        <TextInput
          onInput={onUpdateRobotName}
          defaultValue={model.domain.robotName}
        />
      </Field>
      <Field>
        <span>Example interaction:</span>
        <TextArea
          onInput={onUpdateExampleInteraction}
          defaultValue={model.domain.exampleInteraction}
        />
      </Field>
      <Field>
        <span>Intro:</span>
        <TextArea onInput={onInputIntro} defaultValue={model.domain.intro} />
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
      {model.domain.introWithoutName ? (
        <div>{model.domain.introWithoutName}</div>
      ) : null}
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
