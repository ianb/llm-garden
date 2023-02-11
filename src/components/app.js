/* eslint no-unused-vars: "off" */
import { useState, useEffect } from "preact/hooks";
import { NotFound } from "./home";
import Router from "preact-router";

const App = () => {
  return (
    <Router>
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
  return Component ? <Component /> : "Loading...";
}

function Waiting() {
  return <div class="p-3">Loading...</div>;
}

export default App;
