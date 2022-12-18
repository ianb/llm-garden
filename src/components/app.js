/* eslint no-unused-vars: "off" */
import { StoryIndex } from "../interactive-fiction/index";
import { ChatIndex } from "../chat/index";
import { AdventureChooserIndex } from "../adventure-chooser/index";
import { RequestKeyPage } from "../key-management/index";
import { Home, NotFound } from "./home";
import { ToneChangerIndex } from "../tone-changer/index";
import Router from "preact-router";

const App = () => {
  return (
    <Router>
      <Home path="/" />
      <RequestKeyPage path="/key-management" />
      <StoryIndex path="/interactive-fiction" />
      <ChatIndex path="/chat" />
      <AdventureChooserIndex path="/adventure-chooser" />
      <ToneChangerIndex path="/tone-changer" />
      <NotFound default />
    </Router>
  );
};

export default App;
