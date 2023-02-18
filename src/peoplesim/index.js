/* eslint no-unused-vars: "off" */
import { PeopleView } from "./peopleview";
import { ModelIndexPage } from "../components/modelindex";
import { InfoHeader, P } from "../components/common";
import { peopleDb } from "./peopledb";

export const PeopleSimIndex = () => {
  return (
    <ModelIndexPage title="People Sim" store={peopleDb} viewer={PeopleView}>
      <InfoHeader title="Multi-person scene simulation">
        <P>
          This explores having multiple distinct entities (people) with their
          own moods and goals interacting in an environment.
        </P>
        <P>
          You, the user, setup each scene; the characters, their initial goals
          and moods, their relationships with each other, and the environment in
          which they are acting. Then you can step forward in time and GPT will
          generate the next action for each character.
        </P>
      </InfoHeader>
    </ModelIndexPage>
  );
};
