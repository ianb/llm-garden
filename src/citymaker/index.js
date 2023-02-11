/* eslint no-unused-vars: "off" */
import { CityMakerView } from "./citymakerview";
import { ModelIndexPage } from "../components/modelindex";
import { cityMakerDb } from "./citymakerdb";

export const CityMakerIndex = () => {
  return (
    <ModelIndexPage
      title="City Maker"
      store={cityMakerDb}
      viewer={CityMakerView}
    />
  );
};
