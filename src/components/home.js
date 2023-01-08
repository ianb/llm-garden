/* eslint no-unused-vars: "off" */
import { PageContainer, Card, H1, P, InfoHeader } from "./common";
import { Header } from "./header";
import { Markdown } from "../markdown";

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
  "Voice Composer": {
    link: "/voice-composer/",
    description: `
Voice composer: a voice-centric text composition and editing tool
`.trim(),
  },
};

export const Home = () => {
  return (
    <PageContainer>
      <Header title="Large Language Model (GPT-3) Garden" />
      <div class="flex">
        <InfoHeader title="An LLM (GPT) Garden" class="w-1/2">
          <P>
            I have a little time on my hands but it's too hard to garden this
            time of year. So I'm building a garden of LLMs instead, GPT
            specifically. (GPT is a specific <em>Large Language Model</em>{" "}
            service.)
          </P>
          <P>
            Each of these is meant to be a way of exploring some idea or aspect
            of these technologies. I'm particularly interested in how each of
            these <em>feel</em>, not just how they perform.
          </P>
        </InfoHeader>
        <div class="w-1/2">
          {Object.entries(options).map(([title, { link, description }]) => (
            <LinkCard title={title} link={link} description={description} />
          ))}
        </div>
      </div>
    </PageContainer>
  );
};

function LinkCard({ title, description, link }) {
  return (
    <a href={link}>
      <Card title={title} class="hover:drop-shadow-xl w-full">
        <Markdown text={description} class="p-2" />
      </Card>
    </a>
  );
}

export const NotFound = () => {
  return (
    <PageContainer>
      <Header title="Not Found" />
      <InfoHeader title="Not Found">
        <H1>404 Not Found</H1>
        <P>Page not found</P>
      </InfoHeader>
    </PageContainer>
  );
};
