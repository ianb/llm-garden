/* eslint no-unused-vars: "off" */
import { PeopleView } from "./peopleview";
import { ModelIndexPage } from "../components/modelindex";
import { peopleDb } from "./peopleDb";

export const PeopleSimIndex = () => {
  return (
    <ModelIndexPage title="People Sim" store={peopleDb} viewer={PeopleView} />
  );
};
