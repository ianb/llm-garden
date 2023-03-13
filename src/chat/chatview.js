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
  Alert,
  Select,
} from "../components/common";
import { SpeechButton, SpeechControlButton } from "../components/speech";
import * as icons from "../components/icons";
import { ModelTitleDescriptionEditor } from "../components/modelindex";
import { Markdown } from "../markdown";

export const ChatView = ({ model }) => {
  const [version, setVersion] = useState(0);
  const [chatView, setChatView] = useState("Normal view");
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
        <PromptEditor model={model} onChangeView={setChatView} />
        <QueryLog gptcache={model.domain.gpt} />
      </Sidebar>
      <div class="p-2">
        <Chat model={model} chatView={chatView} />
      </div>
    </PageContainer>
  );
};

function PromptEditor({ model, onChangeView }) {
  const [collapsed, setCollapsed] = useState(false);
  const [hooksError, setHooksError] = useState(null);
  const [hooks, setHooks] = useState(null);
  function onInput(event) {
    model.domain.prompt = event.target.value;
  }
  function onChangeSaveHistory(event) {
    model.domain.saveHistory = event.target.checked;
  }
  function onClearHistory() {
    model.domain.clearHistory();
  }
  function onUndo() {
    model.domain.undo();
  }
  function onRedo() {
    model.domain.redo();
  }
  function onInputIntro(event) {
    model.domain.intro = event.target.value;
  }
  function onChangeExcludeIntro(event) {
    model.domain.excludeIntroFromHistory = event.target.checked;
  }
  function toggleCollapsed() {
    setCollapsed(!collapsed);
  }
  function onInputHooksSource(event) {
    let exports = {};
    try {
      exports = model.domain.evalHooks(event.target.value);
      setHooksError(null);
      setHooks(exports);
      model.domain.hooksSource = event.target.value;
    } catch (e) {
      setHooksError(e);
      setHooks(null);
    }
  }
  return (
    <div>
      <div class="float-right">
        {collapsed ? (
          <icons.PlusCircle class="h-4 w-4" onClick={toggleCollapsed} />
        ) : (
          <icons.MinusCircle class="h-4 w-4" onClick={toggleCollapsed} />
        )}
      </div>
      {!collapsed && (
        <>
          <ModelTitleDescriptionEditor model={model} />
          <Field sideBySide={true}>
            View:
            <Select options={["Normal view", "GPT values", "Raw values"]} onChange={(event) => onChangeView(event.target.value)} />
          </Field>
          <Field>
            <span>Prompt:</span>
            <TextArea
              onInput={onInput}
              defaultValue={model.domain.prompt}
            />
          </Field>
          <Field>
            <span>Intro:</span>
            <TextArea
              onInput={onInputIntro}
              defaultValue={model.domain.intro}
            />
          </Field>
          <Field sideBySide={true}>
            <span>Exclude intro from messages?</span>
            <input
              type="checkbox"
              onChange={onChangeExcludeIntro}
              checked={model.domain.excludeIntroFromHistory}
            />
          </Field>
          <Field sideBySide={true}>
            <span>Save chat history in model?</span>
            <input
              type="checkbox"
              onChange={onChangeSaveHistory}
              checked={model.domain.saveHistory}
            />
          </Field>
          <Field>
            <span>Hooks (<span class="text-xs"><code title="modifyUser({content: ...})">exports.modifyUser</code>, <code title="modifyAssistant({content: ...})">exports.modifyAssistant</code>, <code title="modifyPrompt([{role: &quote;system&quote;, content: &quote;prompt&quot;}, {role: &quot;assistant&quot;, ...}, ...])">exports.modifyPrompt</code>, <code title="afterAssistant([history])">exports.afterAssistant</code></span>):</span>
            <TextArea defaultValue={model.domain.hooksSource} onInput={onInputHooksSource} />
          </Field>
          {hooksError && (<Alert title="Error in hooks"><pre class="max-w-full whitespace-pre-wrap text-xs">{hooksError.toString()}{"\n"}{hooksError.stack}</pre></Alert>)}
          {hooks && (<div>
            Defines: <code>{Object.keys(hooks).join(", ")}</code>
          </div>)}
        </>
      )}
      <Button onClick={onClearHistory}>Clear Chat</Button>
      <Button onClick={onUndo}>Undo last chat</Button>
      <Button onCLick={onRedo}>Redo chat</Button>
    </div>
  );
}

let recentHistoryLength = -1;

function Chat({ model, chatView }) {
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
      <ChatHistory model={model} chatView={chatView} />
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

function ChatHistory({ model, chatView }) {
  const history = model.domain.history;
  console.log("history", history);
  let intro;
  if (model.domain.intro) {
    const hooks = model.domain.hooks;
    let item = { role: "assistant", content: model.domain.intro };
    if (hooks && hooks.modifyAssistant) {
      const newIntro = hooks.modifyAssistant(item);
      if (newIntro) {
        item = newIntro;
      }
    }
    intro = <Markdown text={item.displayContent || item.content} />;
  }
  function getContent(item) {
    if (chatView === "Normal view") {
      return item.displayContent || item.content;
    } else if (chatView === "GPT values") {
      return item.gptContent || item.content;
    } else {
      return item.content;
    }
  }
  function getOldContent(item) {
    if (chatView === "Normal view") {
      return item.oldDisplayContent || item.oldContent;
    } else if (chatView === "GPT values") {
      return item.oldGptContent || item.oldContent;
    } else {
      return item.oldContent;
    }
  }
  return (
    <div class="overflow-y-auto h-5/6">
      {intro}
      {history.map((item, i) => {
        if (item.role === "user") {
          return (
            <div class="bg-blue-500 text-white px-4 py-2 rounded-lg mb-2 mr-10 shadow-xl">
              {getContent(item)}
            </div>
          );
        } else if (item.role === "alert") {
          return (
            <div class="bg-red-500 text-white px-4 py-2 rounded-lg mb-2 mx-16 shadow-xl">
              {getContent(item)}
            </div>
          );
        } else if (item.oldContent && item.oldContent !== item.content) {
          return (
            <div class="bg-gray-100 px-4 py-2 rounded-lg ml-10 mb-2 shadow-xl">
              <table>
                <tr>
                  <td class="align-top text-orange-800 border-r pr-1 border-black w-1/2">
                    <Markdown text={getOldContent(item)} />
                  </td>
                  <td class="align-top w-1/2 pl-1">
                    <Markdown text={getContent(item)} />
                  </td>
                </tr>
              </table>
            </div>
          );
        } else {
          return (
            <div class="bg-white px-4 py-2 rounded-lg ml-10 mb-2 shadow-xl">
              <Markdown text={getContent(item)} />
            </div>
          );
        }
      })}
    </div>
  );
}

/*

const happiness = /happiness change:\s*([^\n]+)/i;

exports.modifyAssistant = (item) => {
  if (happiness.test(item.content)) {
    item.gptContent = item.content + "\nHappiness change: 0";
  }
  const text = item.content.replace(happiness, "");
  item.displayContent = text;
};

exports.modifyUser = (item) => {
  item.gptContent = item.content + "\nFinish your response with:\nHappiness change: [number]";
};

exports.afterAssistant = (history) => {
  history = history.filter((i) => i.role !== "alert");
  const h = 0;
  for (const item of history) {
    if (item.role !== "assistant") {
      continue;
    }
    const match = happiness.test(item.content);
    if (match) {
      const val = parseFloat(match[1]);
      h += val;
    }
  }
  history.push({ role: "alert", content: `Happiness: ${h}` });
  return history;
};*/