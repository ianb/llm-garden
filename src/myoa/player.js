/* eslint-disable no-unused-vars */
import { useState, useEffect } from "preact/hooks";
import { signal } from "@preact/signals";
import storyDb from "./storydb";
import { PageContainer, Button } from "../components/common";
import { Header, HeaderButton } from "../components/header";

const hashSignal = signal(window.location.hash);
window.addEventListener("hashchange", () => {
  hashSignal.value = window.location.hash;
});

export function StoryPlayerLoader() {
  const [modelName, setModelName] = useState(null);
  const [model, setModel] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get("name");
    if (modelName !== name) {
      setModelName(name);
    }
  }, [modelName, setModelName]);
  useEffect(() => {
    if (modelName && !model) {
      storyDb.getBySlug(modelName).then((loaded) => {
        setModel(loaded);
      });
    }
  }, [modelName, model, setModel]);
  return model ? <StoryPlayer model={model} /> : <div>Loading...</div>;
}

export function StoryPlayer({ model }) {
  const params = new URLSearchParams(hashSignal.value.substr(1));
  const passageId = params.get("passage");
  let passage = null;
  if (passageId === "introPassage") {
    passage = model.domain.introPassage;
  } else if (passageId) {
    passage = model.domain.passages.find((p) => p.id === passageId);
  }
  function onStart() {
    window.location.hash = `passage=introPassage`;
  }
  return (
    <PageContainer>
      <Header
        title={model.title}
        section="MYOA"
        sectionLink={`/myoa/?name=${encodeURIComponent(model.slug)}`}
        trackerPaths={[`myoa/${model.slug}`]}
        buttons={[
          <a href={`/myoa/?name=${encodeURIComponent(model.slug)}`}>
            <HeaderButton>Edit</HeaderButton>
          </a>,
        ]}
      />
      {passage ? (
        <PassageScreen passage={passage} />
      ) : (
        <IntroScreen model={model} onStart={onStart} />
      )}
    </PageContainer>
  );
}

function IntroScreen({ model, onStart }) {
  return (
    <div class="flex flex-col items-center justify-center h-full">
      <div class="text-2xl font-bold">{model.title}</div>
      <div class="text-sm text-gray-500">{model.description}</div>
      <div class="mt-4">
        <Button onClick={onStart}>Start</Button>
      </div>
    </div>
  );
}

function PassageScreen({ passage }) {
  return (
    <div>
      <div class="mx-auto text-center text-2xl font-bold p-3">
        {passage.title}
      </div>
      <div
        class="mx-auto drop-shadow-lg mt-2 text-gray-500 max-w-2xl bg-white p-5"
        style="min-height: 50vh"
      >
        {passage.value}
      </div>
      <div class="mx-auto max-w-2xl p-5">
        <ol class="ml-4 list-decimal">
          {passage.choices.map((choice) =>
            passage.choiceHasPassage(choice) ? (
              <li class="p-2 hover:bg-white">
                <a
                  href={`#passage=${encodeURIComponent(
                    passage.choicePassage(choice).id
                  )}`}
                >
                  {choice}
                </a>
              </li>
            ) : (
              <li class="opacity-70 p-2">{choice} (unfinished)</li>
            )
          )}
        </ol>
      </div>
    </div>
  );
}
