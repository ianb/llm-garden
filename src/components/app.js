/* eslint no-unused-vars: "off" */
import { StoryIndex } from "../interactive-fiction/index";
import { ChatIndex } from "../chat/index";
import { AdventureIndex } from "../myoa/index";
import { StoryPlayerLoader } from "../myoa/player";
import { RequestKeyPage } from "../key-management/index";
import { Home, NotFound } from "./home";
import { ToneChangerIndex } from "../tone-changer/index";
import { VoiceComposerIndex } from "../voice-composer/index";
import { ImageGenIndex } from "../imagegen/index";
import Router from "preact-router";

const App = () => {
  return (
    <Router>
      <Home path="/" />
      <RequestKeyPage path="/key-management" />
      <StoryIndex path="/interactive-fiction" />
      <ChatIndex path="/chat" />
      <AdventureIndex path="/myoa" />
      <StoryPlayerLoader path="/myoa/play" />
      <ToneChangerIndex path="/tone-changer" />
      <VoiceComposerIndex path="/voice-composer" />
      <ImageGenIndex path="/imagegen" />
      <NotFound default />
    </Router>
  );
};

export default App;
