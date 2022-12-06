/* eslint no-unused-vars: "off" */
import { stories } from "./storyloader";
import { PageContainer, H1, Card } from "../components/common";
import { Header } from "../components/header";
import { Story } from "./runner";

export const StoryIndex = () => {
  const u = new URL(location.href).searchParams;
  if (u.get("story")) {
    return <Story filename={u.get("story")} />;
  }
  return (
    <PageContainer>
      <Header title="Interactive Fiction" />
      <Intro />
    </PageContainer>
  );
};

const Intro = () => {
  return (
    <div class="home">
      <h1>Choose a game to play:</h1>
      <ul>
        {Object.keys(stories).map((key) => (
          <li key={key}>
            <a href={`./?story=${key}`}>
              <Card>
                <H1>{stories[key].title}</H1>
              </Card>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};
