/* eslint no-unused-vars: "off" */
import { LayerCraftView } from "./layerview";
import { ModelIndexPage } from "../components/modelindex";
import { layerDb } from "./layerdb";
import { YouTube, InfoHeader, InfoA, P } from "../components/common";

export const LayerCraftIndex = () => {
  return (
    <ModelIndexPage
      title="LayerCraft"
      store={layerDb}
      viewer={LayerCraftView}
    >
      <InfoHeader title="LayerCraft" logo="/assets/icons/layercraft-logo.png">
        <P>
          A general authoring tool for building up in layers, building context and structure. Based on specific schemas that guide the authoring process, such as world building.
        </P>
        <P>
          This is a generalization of <InfoA href="/citymaker">City Maker</InfoA>. That was an app built around a certain idea, but this separates the idea from the app; all the prompts and structure and dependencies are defined separately.
        </P>
      </InfoHeader>
    </ModelIndexPage>
  );
};
