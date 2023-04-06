import { ModelTypeStore } from "../db";
import { GptCache } from "../gptservice/gptcache";
import { markdownToElement } from "../markdown";
import { layerDb } from "../layercraft/layerdb";

class CityPlayer {
  constructor(props) {
    props = props || {};
    this.gpt = new GptCache({
      storageName: "cityplayer",
      basePaths: [
        "cityplayer",
        () => this.envelope && `cityplayer/${this.envelope.slug}`,
      ],
      logResults: true,
      defaultPromptOptions: {
        temperature: 0.9,
        max_tokens: 700,
      },
    });
    this.originalCityModel = props.originalCityModel || null;
  }

  toJSON() {
    return {
      originalCityModel: this.originalCityModel,
    }
  }
}

export async function getAllCities() {
  const cities = await layerDb.getAll();
  return cities.filter((city) => city.domain.schemaName === "citymaker");
}

const builtins = [
];

export const cityPlayerDb = new ModelTypeStore("cityplayer", CityPlayer, builtins);
