/* eslint no-unused-vars: "off" */
import { InteractiveFictionView } from "./ifview";
import { ModelIndexPage } from "../components/modelindex";
import { ifDb } from "./ifdb";

export const StoryIndex = () => {
  return (
    <ModelIndexPage
      title="Interactive Fiction"
      store={ifDb}
      viewer={InteractiveFictionView}
      noAdd={true}
    />
  );
};
