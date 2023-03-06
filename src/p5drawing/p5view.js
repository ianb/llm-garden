/* eslint-disable no-unused-vars */
import { Header, HeaderButton } from "../components/header";
import {
  PageContainer,
  Button,
  TextInput,
  Field,
  TextArea,
} from "../components/common";
import Sidebar from "../components/sidebar";
import { useState, useEffect, useRef } from "preact/hooks";
import { QueryLog } from "../components/querylog";
import * as icons from "../components/icons";
import { ImportExportMenu } from "../components/modelmenu";
import { ModelTitleDescriptionEditor } from "../components/modelindex";

const start = Date.now();

export const P5View = ({ model }) => {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const func = () => {
      setVersion(version + 1);
    };
    model.addOnUpdate(func);
    return () => {
      model.removeOnUpdate(func);
    };
  }, [model, version, setVersion]);
  const onFillDescription = async () => {
    model.description = await model.domain.completeDescription();
    if (!model.title) {
      model.title = await model.domain.completeTitle();
    }
  };
  return (
    <PageContainer>
      <Header
        title={model.title || "? Drawing ?"}
        section="P5 Drawing"
        sectionLink="/p5drawing/"
        trackerPaths={["p5drawing", `p5drawing/${model.slug || "default"}`]}
        menu={<ImportExportMenu model={model} />}
        model={model}
      />
      <Sidebar>
        <ModelTitleDescriptionEditor model={model}>
          <Button onClick={onFillDescription}>Fill description</Button>
        </ModelTitleDescriptionEditor>
        <QueryLog gptcache={model.domain.gpt} />
      </Sidebar>
      <div class="p-2">
        <P5DrawingView model={model} scriptHash={model.domain.scriptHash} />
      </div>
    </PageContainer>
  );
};

const P5DrawingView = ({ model, scriptHash }) => {
  const iframeRef = useRef(null);
  const onSubmit = (element) => {
    console.log("onSubmit", element);
    model.domain.script = element.value;
  };
  const onRequest = async (element) => {
    const request = element.value;
    element.value = `Processing: "${request}"...`;
    await model.domain.processCommand(request);
    element.value = "";
  };
  useEffect(() => {
    if (!iframeRef.current) {
      return;
    }
    const iframe = iframeRef.current;
    const onMessage = (event) => {
      console.log("onMessage", event.data);
      if (event.data === "hello-back") {
        return;
      }
      if (event.origin !== location.origin) {
        console.warn("postMessage from unexpected origin:", event.origin);
        return;
      }
      if (event.data && event.data.type === "error") {
        model.domain.addError(event.data);
      } else if (event.data && event.data.type === "screenshot") {
        model.domain.updateLogo(event.data.url);
      } else {
        console.warn("Unexpected message:", event.data);
      }
    };
    pingIframe(iframe);
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [model, iframeRef]);
  return (
    <div>
      <div>
        <Field>
          <div>
            Request:{" "}
            <span class="text-s font-medium text-gray-400 pl-4">
              also "undo", "redo", "fix"
            </span>
          </div>
          <TextInput onSubmit={onRequest} placeholder="Enter a request" />
        </Field>
      </div>
      <P5Error model={model} />
      <div>
        <iframe
          class="w-full"
          style="height: 75vh"
          src={`/p5drawing/iframe?id=${encodeURIComponent(
            model.id
          )}&hash=${encodeURIComponent(scriptHash)}`}
          ref={iframeRef}
        />
      </div>
      <div>
        <TextArea
          class="mt-2"
          defaultValue={model.domain.script}
          onSubmit={onSubmit}
          allowEnter={true}
          noAutoShrink={true}
        />
        <div class="text-xs text-gray-500 pl-2">Shift+Enter to run</div>
      </div>
    </div>
  );
};

const P5Error = ({ model }) => {
  if (!model.domain.lastError) {
    return null;
  }
  return (
    <div>
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
        {model.domain.lastError.message}
      </div>
      <Button onClick={() => model.domain.fixError()}>Fix it!</Button>
    </div>
  );
};

const pingIframe = (iframe) => {
  const timer = setInterval(() => {
    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage("hello", location.origin);
    }
  }, 100);

  const onMessage = (event) => {
    if (event.data === "hello-back") {
      clearInterval(timer);
      window.removeEventListener("message", onMessage);
    }
  };
  window.addEventListener("message", onMessage);
};
