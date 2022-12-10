/* eslint no-unused-vars: "off" */
import { ChooserStory } from "./story";
import { StoryView } from "./storyview";
import { signal } from "@preact/signals";

const story = new ChooserStory();

const storyVersion = signal(0);

story.addOnUpdate(() => {
  storyVersion.value += 1;
});

export const AdventureChooserIndex = () => {
  console.log("Rendering version", storyVersion.value);
  return StoryView({ story });
};
