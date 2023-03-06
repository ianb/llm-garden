/* eslint no-unused-vars: "off" */
import { P5View } from "./p5view";
import { ModelIndexPage } from "../components/modelindex";
import { p5Db } from "./p5db";
import { YouTube, InfoHeader, InfoA, P, A } from "../components/common";

export const P5DrawingIndex = () => {
  return (
    <ModelIndexPage title="P5 Drawing" store={p5Db} viewer={P5View}>
      <InfoHeader title="P5 Drawing" logo="/assets/icons/p5drawing-logo.png">
        <P>
          This implements natural language programming with a specific
          programming environment, <InfoA href="https://p5js.org/">p5.js</InfoA>
          .
        </P>
        <P>
          This shows some of GPT's ability to understand and apply changes to
          programs. It also shows off GPT's lack of awareness of visual
          descriptions, and you will often see it produces results that are not
          what you asked for.
        </P>
      </InfoHeader>
    </ModelIndexPage>
  );
};
