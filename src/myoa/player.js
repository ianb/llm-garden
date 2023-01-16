/* eslint-disable no-unused-vars */
import { useState, useEffect } from "preact/hooks";
import { signal } from "@preact/signals";
import storyDb from "./storydb";
import { PageContainer, Button } from "../components/common";
import { Header, HeaderButton } from "../components/header";
import { PlayState } from "./playstate";
import { Markdown } from "../markdown";

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
  const params = new URLSearchParams(hashSignal.value.slice(1));
  const passageId = params.get("passage");
  const state = params.get("state");
  let initState = model.domain.gameState.value;
  let playState;
  if (initState) {
    initState = JSON.parse(initState);
    playState = new PlayState(initState);
    playState.deserialize(state);
  }
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
        <PassageScreen passage={passage} playState={playState} />
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

function PassageScreen({ passage, playState }) {
  const choices = passage.choices.filter(
    (c) => !playState || playState.check(c)
  );
  return (
    <div>
      <div class="mx-auto text-center text-2xl font-bold p-3">
        {passage.title}
      </div>
      {playState ? (
        <div class="float-right bg-white p-2">
          <pre class="text-xs">{JSON.stringify(playState, null, "  ")}</pre>
        </div>
      ) : null}
      <div
        class="mx-auto drop-shadow-lg mt-2 text-gray-500 max-w-2xl bg-white p-5"
        style="min-height: 50vh"
      >
        <Markdown text={passage.value} />
      </div>
      <div class="mx-auto max-w-2xl p-5">
        <ol class="ml-4 list-decimal">
          {choices.map((choice) =>
            passage.choiceHasPassage(choice) &&
            (!playState || playState.check(choice)) ? (
              <li class="p-2 hover:bg-white">
                <a
                  href={`#passage=${encodeURIComponent(
                    passage.choicePassage(choice).id
                  )}${addPlayState(playState, choice)}`}
                >
                  {playState ? playState.clean(choice) : choice}
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

function addPlayState(playState, choice) {
  if (playState) {
    const newState = playState.withExec(choice).serialize();
    if (!newState) {
      return "";
    }
    return `&state=${encodeURIComponent(newState)}`;
  }
  return "";
}
