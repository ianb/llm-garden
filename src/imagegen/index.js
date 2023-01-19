/* eslint no-unused-vars: "off" */
import { ImageGenView } from "./imagegenview";
import { ModelIndexPage } from "../components/modelindex";
import { imageGenDb } from "./imagegendb";

export const ImageGenIndex = () => {
  return (
    <ModelIndexPage
      title="Image Generator"
      store={imageGenDb}
      viewer={ImageGenView}
    />
  );
};
