import { ChooserStory } from "./story";
import { ModelTypeStore } from "../db";

const builtins = [];

const storyDb = new ModelTypeStore("adventure-chooser", ChooserStory, builtins);

export default storyDb;
