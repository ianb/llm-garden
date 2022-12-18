/* eslint no-unused-vars: "off" */
import { StoryView } from "./storyview";
import { PageContainer } from "../components/common";
import { Header } from "../components/header";
import { ModelIndex, ModelLoader } from "../components/modelindex";
import storyDb from "./storydb";

window.story = storyDb;

export const AdventureChooserIndex = () => {
  const u = new URL(location.href).searchParams;
  if (u.get("story") || u.get("id")) {
    let story;
    if (u.get("id")) {
      story = storyDb.getById(u.get("id"));
    } else {
      story = storyDb.getBySlug(u.get("story"));
    }
    return (
      <ModelLoader model={story} viewer={StoryView}>
        Loading...
      </ModelLoader>
    );
  }
  async function onAdd() {
    const story = await storyDb.create();
    await story.saveToDb();
    window.location = makeLink(story);
  }
  function onSelect(story) {
    window.location = makeLink(story);
  }
  return (
    <PageContainer>
      <Header title="Adventure Chooser" />
      <ModelIndex store={storyDb} onSelect={onSelect} onAdd={onAdd} />
    </PageContainer>
  );
};

function makeLink(story) {
  if (story.slug) {
    return "/adventure-chooser/?story=" + encodeURIComponent(story.slug);
  } else {
    return "/adventure-chooser/?id=" + encodeURIComponent(story.id);
  }
}
