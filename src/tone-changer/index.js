/* eslint no-unused-vars: "off" */
import { ToneView } from "./toneview";
import { ModelIndexPage } from "../components/modelindex";
import { toneDb } from "./tonedb";
import { InfoHeader, P } from "../components/common";

export const ToneChangerIndex = () => {
  return (
    <ModelIndexPage title="Tone Changer" store={toneDb} viewer={ToneView}>
      <InfoHeader
        title="Tone Changer"
        logo="/assets/icons/tone-changer-logo.png"
      >
        <P>
          GPT isn't just able to translate languages, but can also translate{" "}
          <em>the tone</em> of language. So you can imagine taking speech and
          making it more formal, or translating to a dialect of another
          language.
        </P>
        <P>These experiences imagine just that!</P>
      </InfoHeader>
    </ModelIndexPage>
  );
};
