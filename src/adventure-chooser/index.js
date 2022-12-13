/* eslint no-unused-vars: "off" */
import { ChooserStory } from "./story";
import { StoryView } from "./storyview";
import { signal } from "@preact/signals";
import LocalSync from "../localsync";

const story = new ChooserStory();
window.story = story;

const localSync = new LocalSync("adventure-chooser-story", story);

const storyVersion = signal(0);

story.addOnUpdate(() => {
  storyVersion.value += 1;
});

export const AdventureChooserIndex = () => {
  console.log("Rendering version", storyVersion.value);
  return StoryView({ story });
};
