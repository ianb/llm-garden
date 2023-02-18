/* eslint no-unused-vars: "off" */
import { VoiceComposerView } from "./voiceview";
import { ModelIndexPage } from "../components/modelindex";
import { voiceDb } from "./voicedb";
import { InfoHeader, P } from "../components/common";

export const VoiceComposerIndex = () => {
  return (
    <ModelIndexPage
      title="Voice Composer"
      store={voiceDb}
      viewer={VoiceComposerView}
    >
      <InfoHeader
        title="Voice Composer"
        logo="/assets/icons/voice-composer-logo.png"
      >
        <P>
          This is an experiment of how voice transcription can be augmented with
          GPT-based editing: both applying formatting to the generally
          unformatted transcripts, and allowing you as the author to ask for
          specific edits with GPT interpreting those edits.
        </P>
        <P>
          <strong>This doesn't work now!</strong> I've been trying to apply the
          Whisper speech recognition and use a multi-stage recognition process,
          but I got ahead of myself and broken everything.
        </P>
      </InfoHeader>
    </ModelIndexPage>
  );
};
