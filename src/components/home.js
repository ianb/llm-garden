/* eslint no-unused-vars: "off" */
import { PageContainer, Card2, Card, H1, P, InfoHeader } from "./common";
import { Header } from "./header";
import { Markdown } from "../converthtml";

const options = {
  "Interactive Fiction": {
    link: "/interactive-fiction/",
    description:
      "Run GPT as a _player_ against one of the Zork text adventure games.",
  },
  Chat: {
    link: "/chat/",
    description: "Chat with one of several personalities run by GPT.",
  },
  "Make Your Own Adventure": {
    link: "/myoa/",
    description: `
A builder/authoring tool for creating a Choose Your Own
Adventure-style story. GPT will suggest topics, choices, and
passages; you can pick and choose, or revise and author.
`.trim(),
  },
  "Tone Changer": {
    link: "/tone-changer/",
    description: `
Act like you are someone else! Have your speech translated to a
different tone (or language).
`.trim(),
  },
};

export const Home = () => {
  return (
    <PageContainer>
      <Header title="Large Language Model (GPT-3) Garden" />
      <div class="flex flex-wrap justify-between">
        <InfoHeader title="A LLM (GPT) Garden">
          <P>Something.</P>
        </InfoHeader>
        {Object.entries(options).map(([title, { link, description }]) => (
          <LinkCard title={title} link={link} description={description} />
        ))}
      </div>
    </PageContainer>
  );
};

function LinkCard({ title, description, link }) {
  return (
    <a href={link}>
      <Card2 title={title}>
        <Markdown text={description} />
      </Card2>
    </a>
  );
}

export const NotFound = () => {
  return (
    <PageContainer>
      <Header title="Not Found" />
      <Card>
        <H1>404 Not Found</H1>
        <P>Page not found</P>
      </Card>
    </PageContainer>
  );
};
