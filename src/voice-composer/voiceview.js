/* eslint-disable no-unused-vars */
import { ImportExportMenu } from "../components/modelmenu";
import { Header } from "../components/header";
import Sidebar from "../components/sidebar";
import { QueryLog } from "../components/querylog";
import { PageContainer, TextInput, Button } from "../components/common";
import { SpeechButton } from "../components/speech";
import { useRef, useState } from "preact/hooks";
import { markdownToPreact } from "../markdown";
import { AudioRecorder, Whisper, getResponseText } from "./whisperrecord";

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
        <WhisperButton onText={(text) => model.domain.addUtterance(text)} />
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

const recorder = new AudioRecorder();
const whisper = new Whisper();

const brailleProgress = ["⠟", "⠯", "⠷", "⠾", "⠽", "⠻"];

const WhisperButton = ({ onText }) => {
  const [version, setVersion] = useState(0);
  whisper.addOnUpdate(() => {
    setVersion(version + 1);
  });
  recorder.addOnUpdate(() => {
    setVersion(version + 1);
  });
  async function OnRecord() {
    if (recorder.isRecording) {
      // A little crude, but we know that whisper will transcribe soon so we'll
      // pre-set this flag so it doesn't show a moment where recording has stopped and
      // transcribing has yet to begin:
      whisper.isTranscribing = true;
      await recorder.stop();
      const resp = await whisper.transcribe(recorder.audioBlob);
      onText(getResponseText(resp));
    } else if (recorder.isStarting) {
      console.warn("Ignoring start while still starting...");
    } else {
      recorder.start();
    }
  }
  let label;
  if (recorder.isStarting) {
    label = "...";
  } else if (recorder.isRecording) {
    label = "Stop";
  } else if (whisper.isTranscribing) {
    label = "Transcribing " + brailleProgress[version % brailleProgress.length];
  } else {
    label = "Whisper record";
  }
  return (
    <div>
      <Button onClick={OnRecord}>{label}</Button>
      {recorder.error ? (
        <Alert>{`Error recording: ${recorder.error}`}</Alert>
      ) : null}
    </div>
  );
};
