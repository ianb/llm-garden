import { ChooserStory } from "./story";
import { ModelTypeStore } from "../db";

const builtins = [];

const storyDb = new ModelTypeStore("myoa", ChooserStory, builtins);

export default storyDb;
