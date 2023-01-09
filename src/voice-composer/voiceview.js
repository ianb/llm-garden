/* eslint-disable no-unused-vars */
import { ImportExportMenu } from "../components/modelmenu";
import { Header } from "../components/header";
import Sidebar from "../components/sidebar";
import { QueryLog } from "../components/querylog";
import { PageContainer, TextInput } from "../components/common";
import { SpeechButton } from "../components/speech";
import { useRef, useState } from "preact/hooks";
import { markdownToPreact } from "../markdown";

export function VoiceComposerView({ model }) {
  const [version, setVersion] = useState(0);
  model.addOnUpdate(() => {
    setVersion(version + 1);
  });
  return (
    <PageContainer>
      <Header
        title={model.title || "? Document ?"}
        section="Voice"
        sectionLink="/voice-composer/"
        trackerPaths={["voice", `voice/${model.slug || "default"}`]}
        menu={<ImportExportMenu model={model} />}
        model={model}
      />
      <Editor model={model} />
      <Sidebar>
        <QueryLog gptcache={model.domain.gpt} />
      </Sidebar>
    </PageContainer>
  );
}

const Editor = ({ model }) => {
  const inputRef = useRef(null);
  function onSpeech(text) {
    model.domain.hypothesis = text;
  }
  function onUtterance(text) {
    model.domain.addUtterance(text);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }
  function onSubmit(element) {
    const text = element.value;
    model.domain.addUtterance(text);
    element.value = "";
  }
  return (
    <div>
      <DisplayText model={model} />
      <div class="flex">
        <SpeechButton
          onSpeech={onSpeech}
          onUtterance={onUtterance}
          syncToRef={inputRef}
        />
        <TextInput
          onSubmit={onSubmit}
          class="flex-1 h-8 my-6"
          inputRef={inputRef}
        />
      </div>
    </div>
  );
};

const DisplayText = ({ model }) => {
  const markup = markdownToPreact(
    model.domain.text +
      (model.domain.hypothesis ? " _" + model.domain.hypothesis + "_" : "")
  );
  return (
    <div class="h-2/3 bg-white p-2 m-2 min-h-2 drop-shadow-lg">
      <div class="unreset">{markup}</div>
    </div>
  );
};
