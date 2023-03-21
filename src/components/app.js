/* eslint no-unused-vars: "off" */
import { useState, useEffect } from "preact/hooks";
import { NotFound } from "./home";
import Router from "preact-router";
import hashSignal from "../hashsignal";

function onChangeUrl() {
  hashSignal.value = window.location.hash;
}

const App = () => {
  return (
    <Router onChange={onChangeUrl}>
      <LazyLoader path="/" module={() => import("./home")} component="Home" />
      <LazyLoader
        path="/key-management"
        module={() => import("../key-management/index")}
        component="RequestKeyPage"
      />
      <LazyLoader
        path="/interactive-fiction"
        module={() => import("../interactive-fiction/index")}
        component="StoryIndex"
      />
      <LazyLoader
        path="/chat"
        module={() => import("../chat/index")}
        component="ChatIndex"
      />
      <LazyLoader
        path="/myoa"
        module={() => import("../myoa/index")}
        component="AdventureIndex"
      />
      <LazyLoader
        path="/myoa/play"
        module={() => import("../myoa/player")}
        component="StoryPlayerLoader"
      />
      <LazyLoader
        path="/tone-changer"
        module={() => import("../tone-changer/index")}
        component="ToneChangerIndex"
      />
      <LazyLoader
        path="/p5drawing"
        module={() => import("../p5drawing/index")}
        component="P5DrawingIndex"
      />
      <LazyLoader
        path="/p5drawing/iframe"
        module={() => import("../p5drawing/iframeview")}
        component="P5DrawingIframeView"
      />
      <LazyLoader
        path="/voice-composer"
        module={() => import("../voice-composer/index")}
        component="VoiceComposerIndex"
      />
      <LazyLoader
        path="/imagegen"
        module={() => import("../imagegen/index")}
        component="ImageGenIndex"
      />
      <LazyLoader
        path="/citymaker"
        module={() => import("../citymaker/index")}
        component="CityMakerIndex"
      />
      <LazyLoader
        path="/peoplesim"
        module={() => import("../peoplesim/index")}
        component="PeopleSimIndex"
      />
      <LazyLoader
        path="/layercraft"
        module={() => import("../layercraft/index")}
        component="LayerCraftIndex"
      />
      <NotFound default />
    </Router>
  );
};

function LazyLoader({ path, module, component }) {
  const [componentClass, setComponentClass] = useState(null);
  // Note we put the component class in a list because preact instantiates it
  // otherwise, and we want to instantiate it ourselves.
  useEffect(() => {
    module()
      .then((module) => {
        setComponentClass([module[component]]);
      })
      .catch((err) => {
        console.error(
          `Error loading module for ${component} at path ${path}:`,
          err
        );
        setComponentClass([NotFound]);
      });
  }, [module, component, path]);
  let Component = Waiting;
  if (componentClass) {
    Component = componentClass[0];
  }
  return Component ? (
    <Component />
  ) : (
    <div class="font-bold flex justify-center p-10">Loading...</div>
  );
}

function Waiting() {
  return <div class="font-bold flex justify-center p-10">Loading...</div>;
}

export default App;
