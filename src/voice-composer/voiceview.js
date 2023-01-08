/* eslint-disable no-unused-vars */
import { ImportExportMenu } from "../components/modelmenu";
import { Header } from "../components/header";
import Sidebar from "../components/sidebar";
import { QueryLog } from "../components/querylog";
import {
  PageContainer,
  Field,
  TextArea,
  TextInput,
  Button,
} from "../components/common";

export function VoiceComposerView({ model }) {
  return (
    <PageContainer>
      <Header
        title={model.title || "? Document ?"}
        section="Voice"
        sectionLink="/voice-composer/"
        trackerPaths={["voice", `voice/${model.slug || "default"}`]}
        menu={<ImportExportMenu model={model} />}
        model={model}
      />
      <Editor model={model} />
      <Sidebar>
        <QueryLog gptcache={model.domain.gpt} />
      </Sidebar>
    </PageContainer>
  );
}

const Editor = ({ model }) => {
  return "an editor";
};
