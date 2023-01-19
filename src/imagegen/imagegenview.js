/* eslint-disable no-unused-vars */
import { Header } from "../components/header";
import { ImportExportMenu } from "../components/modelmenu";
import { useState, useRef, useEffect } from "preact/hooks";
import {
  PageContainer,
  Field,
  TextArea,
  Select,
  TextInput,
  Button,
  Alert,
} from "../components/common";
import * as icons from "../components/icons";
import { signal } from "@preact/signals";
import { availableSizes } from "../imageapi/dalle";

const overlayItem = signal(null);
const overlayIndex = signal(1);

export const ImageGenView = ({ model }) => {
  const [version, setVersion] = useState(0);
  model.addOnUpdate(() => {
    setVersion(version + 1);
  });
  return (
    <>
      <PageContainer>
        <Header
          title={model.title || "? Image Gen ?"}
          section="Image Gen"
          sectionLink="/imagegen/"
          trackerPaths={["imagegen"]}
          model={model}
          menu={<ImportExportMenu model={model} />}
        />
        <Generator model={model} />
      </PageContainer>
      {overlayItem.value ? (
        <ImageOverlay
          item={overlayItem.value}
          index={overlayIndex.value}
          onPrev={() =>
            (overlayIndex.value =
              (overlayIndex.value - 1 + overlayItem.value.urls.length) %
              overlayItem.value.urls.length)
          }
          onNext={() =>
            (overlayIndex.value =
              (overlayIndex.value + 1) % overlayItem.value.urls.length)
          }
          onClose={() => (overlayItem.value = null)}
        />
      ) : null}
    </>
  );
};

function Generator({ model }) {
  const [version, setVersion] = useState(0);
  model.domain.addOnUpdate(() => {
    setVersion(version + 1);
  });
  async function onSubmit(textInput) {
    const prompt = textInput.value;
    await model.domain.generateImage({
      prompt,
    });
  }
  function onInputParam(param, e) {
    model.domain[param] = e.target.value;
  }
  // FIXME: add prompt_strength, num_inference_steps, and guidance_scale to form
  // FIXME: add negative_prompt
  return (
    <div class="p-3">
      {model.domain.request ? (
        <div>
          <div>Prompt: {model.domain.request.input.prompt}</div>
          <div>
            Generator: <b>{model.domain.imageGenType}</b>
            {" Count: "}
            <b>{model.domain.num_outputs}</b> {" Size: "}
            <b>
              {model.domain.width}x{model.domain.height}
            </b>
          </div>
        </div>
      ) : (
        <>
          <div>
            <TextArea onSubmit={onSubmit} placeholder="Enter prompt" />
          </div>
          <Field sideBySide={true} class="inline-block">
            {"Generator: "}
            <Select
              value={model.domain.imageGenType}
              options={{ sd: "Stable Diffusion", dalle: "Dall-E" }}
              onInput={onInputParam.bind(null, "imageGenType")}
            />
          </Field>
          <Field sideBySide={true} class="inline-block ml-2">
            {"Count: "}
            <Select
              value={model.domain.num_outputs}
              options={["1", "2", "3", "4"]}
              onInput={onInputParam.bind(null, "num_outputs")}
            />
          </Field>
          {model.domain.imageGenType === "sd" ? (
            <>
              <Field sideBySide={true} class="inline-block ml-2">
                {"Width: "}
                <Select
                  value={model.domain.width}
                  options={model.domain.sizeOptions}
                  onInput={onInputParam.bind(null, "width")}
                />
              </Field>
              <Field sideBySide={true} class="inline-block ml-2">
                {"Height: "}
                <Select
                  value={model.domain.height}
                  options={model.domain.sizeOptions}
                  onInput={onInputParam.bind(null, "height")}
                />
              </Field>
            </>
          ) : null}
          {model.domain.imageGenType === "dalle" ? (
            <>
              <Field sideBySide={true} class="inline-block ml-2">
                {"Size: "}
                <Select
                  options={availableSizes}
                  value={model.domain.size}
                  onInput={onInputParam.bind(null, "size")}
                />
              </Field>
            </>
          ) : null}
        </>
      )}
      {model.domain.request && model.domain.logs ? (
        <pre class="m-3 p-2 bg-white text-xs whitespace-pre-wrap">
          {compressLogs(model.domain.logs)}
        </pre>
      ) : null}
      <div>
        {model.domain.history.map((item) => (
          <HistoryItem item={item} model={model} />
        ))}
      </div>
    </div>
  );
}

// See https://replicate.com/stability-ai/stable-diffusion for pricing:
const COST_PER_SECOND = 0.0023;

function HistoryItem({ model, item }) {
  function onDelete() {
    model.domain.deleteHistoryItem(item);
  }
  function onZoom(url) {
    overlayItem.value = item;
    overlayIndex.value = item.urls.indexOf(url);
  }
  return (
    <div class="m-3 p-2 bg-white drop-shadow-lg">
      <div class="text-s">Prompt: {item.input.prompt}</div>
      <div class="text-xs">
        Cost: ${item.cost.toFixed(2)} time: {item.time.toFixed(1)}s
        <Button onClick={onDelete}>
          <icons.Trash class="w-2 h-2" />
        </Button>
      </div>
      {item.urls
        ? item.urls.map((url) => (
            <img
              onClick={onZoom.bind(null, url)}
              src={url}
              class="w-1/4 inline-block m-2"
            />
          ))
        : null}
      {item.response.error ? <Alert>{item.response.error}</Alert> : null}
    </div>
  );
}

function ImageOverlay({
  item,
  index,
  onPrev,
  onNext,
  onClose,
  showPrompt = false,
}) {
  const src = item.urls[index];
  function onKeyDown(e) {
    if (e.key === "ArrowLeft") {
      onPrev();
    } else if (e.key === "ArrowRight") {
      onNext();
    } else if (e.key === "Escape") {
      onClose();
    }
  }
  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  });
  return (
    <>
      <div class="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
        <div class="flex items-center justify-center h-screen">
          <img src={src} class="h-5/6" />
        </div>
        {showPrompt ? (
          <div class="absolute inset-x-0 bottom-0">
            <div class="px-4 py-2 text-white text-center">
              {item.input.prompt}
            </div>
          </div>
        ) : null}
      </div>
      <div
        onClick={onClose}
        class="fixed inset-0 bg-black bg-opacity-75 z-20"
      ></div>
    </>
  );
}

const percentRe = /^\s*(\d+)%\|/;

function compressLogs(s) {
  const lines = s.split(/\n/g);
  const result = [];
  for (const line of lines) {
    if (
      percentRe.test(line) &&
      result.length &&
      percentRe.test(result[result.length - 1])
    ) {
      result.pop();
    }
    result.push(line);
  }
  return result.join("\n");
}
