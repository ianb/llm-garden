/* eslint no-unused-vars: "off" */
import { InteractiveFictionView } from "./ifview";
import { ModelIndexPage } from "../components/modelindex";
import { ifDb } from "./ifdb";
import { InfoHeader, P, A } from "../components/common";

export const StoryIndex = () => {
  return (
    <ModelIndexPage
      title="Interactive Fiction"
      store={ifDb}
      viewer={InteractiveFictionView}
      noAdd={true}
    >
      <InfoHeader
        title="Interactive Fiction: Freedom with Constraints"
        logo="/assets/icons/interactive-fiction-logo.png"
      >
        <P>
          In some games like{" "}
          <A
            class="text-blue-100 hover:text-blue-200"
            href="https://aidungeon.io/"
          >
            AI Dungeon
          </A>{" "}
          GPT will do the job of playing "the world" and enforcing the rules of
          that world. This is perhaps the biggest difficulty is using GPT: it's
          built to be agreeable and accept hallucinations just as it produces
          them.
        </P>
        <P>
          It occurred to me: what if we use GPT as a source of autonomy and
          copresence in the world, but still use a game engine to enforce the
          rules of the world?
        </P>
        <P>
          Game engines commanded by text already exist: text adventures. This
          attempts to let GPT play in a text adventure.
        </P>
        <P>
          (The JavaScript player used in this project supports up to zcode v3,
          many games are v4 or v5. But there must be more v3 games.)
        </P>
      </InfoHeader>
    </ModelIndexPage>
  );
};
