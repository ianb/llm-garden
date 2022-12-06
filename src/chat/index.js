/* eslint no-unused-vars: "off" */
import prompts from "./prompts";
import { PageContainer, H1, Card } from "../components/common";
import { Header } from "../components/header";
import { Chat } from "./chat";

export const ChatIndex = () => {
  const u = new URL(location.href).searchParams;
  if (u.get("persona")) {
    return <Chat persona={u.get("persona")} />;
  }
  return (
    <PageContainer>
      <Header title="Chat" />
      <Intro />
    </PageContainer>
  );
};

const Intro = () => {
  return (
    <>
      <H1>Choose a chat persona:</H1>
      <ul>
        {Object.keys(prompts).map((key) => (
          <li key={key}>
            <a href={`./?persona=${encodeURIComponent(key)}`}>
              <Card>
                <H1>{key}</H1>
              </Card>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
};
