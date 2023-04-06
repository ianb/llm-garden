/* eslint no-unused-vars: "off" */
import { CityPlayerView } from "./cityplayerview";
import { ModelIndexPage, makeModelLink } from "../components/modelindex";
import { cityPlayerDb, getAllCities } from "./cityplayerdb";
import { YouTube, InfoHeader, InfoA, P } from "../components/common";

export const CityPlayerIndex = () => {
  function getProp(city, prop, defaultValue) {
    const options = city.domain.childrenByType(city.domain._document, prop);
    return options[0] ? options[0].name : defaultValue;
  }
  async function getExtraOptions() {
    const cities = await getAllCities();
    return cities.map((city) => ({
      title: `New Game: ${city.title}`,
      description: getProp(city, "cityType", "[generic city]"),
      onAdd: async () => {
        const model = await cityPlayerDb.create();
        model.domain.originalCityModel = city.toJSON();
        console.log("saving", model);
        await model.saveToDb();
        window.location = makeModelLink(model);
      },
    }));
  }
  return (
    <ModelIndexPage
      title="City Player"
      store={cityPlayerDb}
      viewer={CityPlayerView}
      extraOptions={getExtraOptions}
      noAdd={true}
    >
      <InfoHeader title="CityPlayer" logo="/assets/icons/layercraft-logo.png">
        <P>
          TBD
        </P>
      </InfoHeader>
    </ModelIndexPage >
  );
};
