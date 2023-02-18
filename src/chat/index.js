/* eslint no-unused-vars: "off" */
import { ChatView } from "./chatview";
import { ModelIndexPage } from "../components/modelindex";
import { chatDb } from "./chatdb";
import { InfoHeader, P } from "../components/common";

export const ChatIndex = () => {
  return (
    <ModelIndexPage title="Chat" store={chatDb} viewer={ChatView}>
      <InfoHeader
        title="Talking with different personalities"
        logo="/assets/icons/chat-logo.png"
      >
        <P>These are all examples of different chat personalities.</P>
        <P>Each chat has configurable prompts and persona names.</P>
      </InfoHeader>
    </ModelIndexPage>
  );
};
