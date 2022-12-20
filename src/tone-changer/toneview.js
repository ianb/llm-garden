/* eslint-disable no-unused-vars */
import { Header } from "../components/header";
import {
  PageContainer,
  TextArea,
  TextInput,
  Field,
  Select,
  A,
} from "../components/common";
import Sidebar from "../components/sidebar";
import { signal } from "@preact/signals";
import { useState, useRef } from "preact/hooks";
import { QueryLog } from "../components/querylog";
import * as icons from "../components/icons";
import { SpeechButton } from "../components/speech";
import { ImportExportMenu } from "../components/modelmenu";

export const ToneView = ({ model }) => {
  const [version, setVersion] = useState(0);
  model.addOnUpdate(() => {
    setVersion(version + 1);
  });
  return (
    <PageContainer>
      <Header
        title={model.title || "? Tone ?"}
        section="Tone Changer"
        sectionLink="/tone-changer/"
        trackerPaths={["tone-changer"]}
        menu={<ImportExportMenu model={model} />}
      />
      <Sidebar>
        <PromptEditor model={model} />
        <QueryLog gptcache={model.domain.gpt} />
      </Sidebar>
      <div class="w-2/3 p-2">
        <ToneList model={model} />
      </div>
    </PageContainer>
  );
};

function ToneList({ model }) {
  function onSubmit(textarea) {
    model.domain.translate(textarea.value);
    textarea.value = "";
  }
  function onUtterance(text) {
    model.domain.translate(text);
    if (textRef.current) {
      textRef.current.value = "";
    }
  }
  const textRef = useRef();
  return (
    <>
      <UtteranceTable utterances={model.domain.utterances} />
      <Field>
        <span>You say:</span>
        <div>
          <TextArea onSubmit={onSubmit} textareaRef={textRef} class="w-3/4" />
          <SpeechButton syncToRef={textRef} onUtterance={onUtterance} />
        </div>
      </Field>
    </>
  );
}

function UtteranceTable({ utterances }) {
  return (
    <table class="w-full">
      <thead>
        <tr>
          <th>Input</th>
          <th>Output</th>
        </tr>
      </thead>
      <tbody>
        {utterances.map((u) => (
          <UtteranceRow utterance={u} />
        ))}
      </tbody>
    </table>
  );
}

function UtteranceRow({ utterance }) {
  return (
    <tr>
      <td class="border border-slate-300 w-1/2">{utterance.input}</td>
      <td class="border border-slate-300 w-1/2">{utterance.output}</td>
    </tr>
  );
}

const voices = signal([]);
voices.value = speechSynthesis.getVoices();
const voiceInitTimer = setInterval(() => {
  voices.value = speechSynthesis.getVoices();
  if (voices.value.length > 0) {
    clearInterval(voiceInitTimer);
  }
}, 100);

function PromptEditor({ model }) {
  function onVoiceChange(event) {
    model.domain.voice = event.target.value;
    const utt = new SpeechSynthesisUtterance(`This is ${model.domain.voice}`);
    utt.lang = "en-US";
    utt.voice = voices.value.find((v) => v.name === model.domain.voice);
    speechSynthesis.speak(utt);
  }
  // FIXME: this should be onUpdate or something, not onSubmit (i.e., no enter required):
  function onSubmit(textarea) {
    model.domain.prompt = textarea.value;
    console.log("updating prompt", textarea.value, model.domain.prompt);
  }
  function onTitle(event) {
    model.title = event.target.value;
  }
  function onChangeLanguage(event) {
    model.domain.outputLanguage = event.target.value;
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
        <span>Voice:</span>
        <Select
          onInput={onVoiceChange}
          value={model.domain.voice}
          options={voices.value.map((v) => v.name)}
        />
      </Field>
      <Field>
        <span>
          Output language:{" "}
          <A
            href="https://en.wikipedia.org/wiki/IETF_language_tag"
            target="_blank"
          >
            <icons.Info class="h-4 w-4 inline-block" />
          </A>
        </span>
        <TextInput
          onInput={onChangeLanguage}
          defaultValue={model.domain.outputLanguage}
          autocomplete="language"
        />
      </Field>
    </div>
  );
}
