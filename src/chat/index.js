/* eslint no-unused-vars: "off" */
import { ChatView } from "./chatview";
import { ModelIndexPage } from "../components/modelindex";
import { chatDb } from "./chatdb";
import { InfoHeader, P } from "../components/common";

export const ChatIndex = () => {
  return (
    <ModelIndexPage title="Chat" store={chatDb} viewer={ChatView}>
      <InfoHeader title="Talking with different personalities">
        <P>These are all examples of more-or-less simple chat interfaces.</P>
        <P></P>
      </InfoHeader>
    </ModelIndexPage>
  );
};
