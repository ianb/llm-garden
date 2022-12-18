/* eslint no-unused-vars: "off" */
import { ToneView } from "./toneview";
import { ModelIndexPage } from "../components/modelindex";
import { toneDb } from "./tonedb";

export const ToneChangerIndex = () => {
  return (
    <ModelIndexPage title="Tone Chooser" store={toneDb} viewer={ToneView} />
  );
};
