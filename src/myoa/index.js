/* eslint no-unused-vars: "off" */
import { StoryView } from "./storyview";
import { ModelIndexPage } from "../components/modelindex";
import { InfoHeader, P } from "../components/common";
import storyDb from "./storydb";

export const AdventureIndex = () => {
  return (
    <ModelIndexPage
      title="Make Your Own Adventure"
      store={storyDb}
      viewer={StoryView}
    >
      <InfoHeader
        title="Make your own Choose Your Own Adventure-style story"
        logo="/assets/icons/myoa-logo.png"
      >
        <P>
          This is a tool to build your own adventures using GPT. You'll setup
          the style of the story and GPT will create passages and possible
          choices. <em>You</em> select the specific choices, and control the
          generation through a mini chat-like interface built into the editing.
        </P>
        <P>
          There's also Dall-E integration to create illustrations for individual
          passages.
        </P>
      </InfoHeader>
    </ModelIndexPage>
  );
};
