/* eslint no-unused-vars: "off" */
import { ImageGenView } from "./imagegenview";
import { ModelIndexPage } from "../components/modelindex";
import { imageGenDb } from "./imagegendb";
import { InfoHeader, P, A } from "../components/common";

export const ImageGenIndex = () => {
  return (
    <ModelIndexPage
      title="Image Generator"
      store={imageGenDb}
      viewer={ImageGenView}
    >
      <InfoHeader title="Image Generator">
        <P>
          This is just a testbed for doing image generation, such as what is
          used in{" "}
          <A class="text-blue-200 hover:text-blue-300" href="/myoa">
            Make Your Own Adventure
          </A>
          .
        </P>
        <P>
          There are no particularly interesting featuers in this, it just
          exercises the API integrations.
        </P>
      </InfoHeader>
    </ModelIndexPage>
  );
};
