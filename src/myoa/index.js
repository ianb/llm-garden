/* eslint no-unused-vars: "off" */
import { StoryView } from "./storyview";
import { ModelIndexPage } from "../components/modelindex";
import storyDb from "./storydb";

export const AdventureIndex = () => {
  return (
    <ModelIndexPage
      title="Make Your Own Adventure"
      store={storyDb}
      viewer={StoryView}
    />
  );
};
