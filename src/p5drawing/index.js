/* eslint no-unused-vars: "off" */
import { P5View } from "./p5view";
import { ModelIndexPage } from "../components/modelindex";
import { p5Db } from "./p5db";
import { YouTube, InfoHeader, P, A } from "../components/common";

export const P5DrawingIndex = () => {
  return (
    <ModelIndexPage title="P5 Drawing" store={p5Db} viewer={P5View}>
      <InfoHeader title="P5 Drawing" logo="/assets/icons/p5drawing-logo.png">
        <P>
          This implements natural language programming with a specific
          programming environment, <A href="https://p5js.org/">p5.js</A>.
        </P>
      </InfoHeader>
    </ModelIndexPage>
  );
};
