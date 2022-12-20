/* eslint no-unused-vars: "off" */
import { ChatView } from "./chatview";
import { ModelIndexPage } from "../components/modelindex";
import { chatDb } from "./chatdb";

export const ChatIndex = () => {
  return <ModelIndexPage title="Chat" store={chatDb} viewer={ChatView} />;
};
