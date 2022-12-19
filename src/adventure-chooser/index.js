/* eslint no-unused-vars: "off" */
import { StoryView } from "./storyview";
import { ModelIndexPage } from "../components/modelindex";
import storyDb from "./storydb";

export const AdventureChooserIndex = () => {
  return (
    <ModelIndexPage
      title="Adventure Chooser"
      store={storyDb}
      viewer={StoryView}
    />
  );
};
