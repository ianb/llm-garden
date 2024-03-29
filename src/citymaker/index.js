/* eslint no-unused-vars: "off" */
import { CityMakerView } from "./citymakerview";
import { ModelIndexPage } from "../components/modelindex";
import { cityMakerDb } from "./citymakerdb";
import { YouTube, InfoHeader, InfoA, P } from "../components/common";

export const CityMakerIndex = () => {
  return (
    <ModelIndexPage
      title="City Maker"
      store={cityMakerDb}
      viewer={CityMakerView}
    >
      <InfoHeader title="City Maker" logo="/assets/icons/citymaker-logo.png">
        <P>
          This is a GPT-assistant city builder: you are given choices the city
          and its history (or you choose for yourself) and it will suggest
          neighborhoods, buildings, and residents for those buildings.
        </P>
        <YouTube videoId="YUEXo3wrf70" />
        <P>
          The techniques are described in{" "}
          <InfoA href="https://ianbicking.org/blog/2023/02/world-building-with-gpt.html">
            World Building With GPT
          </InfoA>
          .
        </P>
      </InfoHeader>
    </ModelIndexPage>
  );
};
