/* eslint no-unused-vars: "off" */
import { VoiceComposerView } from "./voiceview";
import { ModelIndexPage } from "../components/modelindex";
import { voiceDb } from "./voicedb";

export const VoiceComposerIndex = () => {
  return (
    <ModelIndexPage
      title="Voice Composer"
      store={voiceDb}
      viewer={VoiceComposerView}
    />
  );
};
