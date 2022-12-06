/* eslint no-unused-vars: "off" */
import { signal } from "@preact/signals";
import { useRef } from "preact/hooks";
import prompts from "./prompts";
import { Header } from "../components/header";
import { ChatRunner } from "./chatrunner";
import { PageContainer, Pre, Field, TextArea } from "../components/common";
import Sidebar from "../components/sidebar";
import { SpeechButton } from "../components/speech";

for (const id in prompts) {
  prompts[id].editedPrompt = signal(prompts[id].prompt);
  prompts[id].output = signal(prompts[id].intro);
  prompts[id].chat = new ChatRunner(prompts[id]);
  prompts[id].chat.addOnUpdate(() => {
    console.log("got onupdate", id, prompts[id].chat.textHistory());
    prompts[id].output.value = prompts[id].chat.textHistory();
  });
}

export const Chat = ({ persona }) => {
  const syncToRef = useRef();
  const data = prompts[persona];
  window.chatsy = data;
  const prompt = data.editedPrompt;
  let v = data.output.value;
  if (!v.endsWith("\n")) {
    v += "\n";
  }
  function onSubmit(element) {
    const val = element.value;
    element.value = "";
    data.chat.addUserInput(val);
    // Could be awaited, but we just let it run...
    data.chat.fetchChatResponse();
  }
  function onUtterance(text) {
    if (syncToRef.current && syncToRef.current.value === text) {
      onSubmit(syncToRef.current);
    } else {
      onSubmit({ value: text });
      if (syncToRef.current) {
        syncToRef.current.value = "";
      }
    }
  }
  return (
    <PageContainer>
      <Header title={`Chat with ${persona}`} path="chat" />
      <Sidebar>
        <Field>
          Prompt:
          <TextArea>{prompt}</TextArea>
        </Field>
      </Sidebar>
      <div class="w-2/3">
        <Pre class="p-4">
          {v}
          <TextArea
            class="m-3 p-1 w-11/12"
            onSubmit={onSubmit}
            textareaRef={syncToRef}
          />
          <SpeechButton onUtterance={onUtterance} syncToRef={syncToRef} />
        </Pre>
      </div>
      <pre></pre>
    </PageContainer>
  );
};
