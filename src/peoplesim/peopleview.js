/* eslint-disable no-unused-vars */
import { Header, HeaderButton } from "../components/header";
import {
  PageContainer,
  Button,
  TextInput,
  Field,
  TextArea,
} from "../components/common";
import Sidebar from "../components/sidebar";
import { useState, useEffect, useRef } from "preact/hooks";
import { signal } from "@preact/signals";
import { QueryLog } from "../components/querylog";
import * as icons from "../components/icons";
import { ImportExportMenu } from "../components/modelmenu";
import { Markdown } from "../markdown";

export const PeopleView = ({ model }) => {
  <PageContainer>
    <Header
      title={model.title || "? People Sim ?"}
      section="People Sim"
      sectionLink="/peoplesim/"
      trackerPaths={["peoplesim", `peoplesim/${model.slug || "default"}`]}
      menu={<ImportExportMenu model={model} />}
      model={model}
    />
    <Sidebar>
      <QueryLog gptcache={model.domain.gpt} />
    </Sidebar>
    <div class="p-2">
      <PeopleSimView model={model} />
    </div>
  </PageContainer>;
};

function PeopleSimView({ model }) {
  return "hey you";
}
