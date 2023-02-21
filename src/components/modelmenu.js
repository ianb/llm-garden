/* eslint-disable no-unused-vars */
import { Field, LogoImg, TextArea, Button } from "./common";
import * as icons from "./icons";
import { useEffect, useState } from "preact/hooks";
import {
  getGeneralLogoPrompt,
  setGeneralLogoPrompt,
} from "../generallogoprompt";

export function ImportExportMenu({ model }) {
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const func = async () => {
      if (!model.logoPrompt || !model.logoPrompt.trim()) {
        await model.generateLogoPrompt();
      }
    };
    func().then(null, (error) => {
      console.error("Error in generating logo prompt:", error);
    });
  });
  function onExport(event) {
    const jsonData = model.exportJSON();
    const stringData = JSON.stringify(jsonData, null, "  ");
    const blob = new Blob([stringData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    event.target.href = url;
  }
  function onImport(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target.result;
      const storyJson = JSON.parse(data);
      model.importJSON(storyJson);
    };
    reader.readAsText(file);
  }
  async function onGenerate(e) {
    e.preventDefault();
    e.stopPropagation();
    if (model.builtin) {
      alert("You cannot generate a logo for a built-in model; save it first!");
      return;
    }
    if (!model.logoPrompt || !model.logoPrompt.trim()) {
      console.warn("No prompt yet for logo generation");
      return;
    }
    setLoading(true);
    const logo = await model.generateLogo();
    model.logo = logo;
    setLoading(false);
  }
  let logoSrc = "/assets/icons/loading.gif";
  if (!loading) {
    logoSrc = model.logo || "/assets/icons/generic-app-icon.png";
  }
  return (
    <div>
      <div>
        <Field>
          Import / Export
          <input type="file" onChange={onImport} />
        </Field>
        <a
          class="bg-magenta hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
          href="#"
          onClick={onExport}
          download={model.title}
        >
          Export/download
          <icons.Download class="h-4 w-4 inline-block ml-1" />
        </a>
      </div>
      <hr class="m-4" />
      <div>
        <div onClick={onGenerate} class="flex justify-center">
          <a href={logoSrc} download={model.slug} target="_blank">
            <LogoImg src={logoSrc} />
          </a>
        </div>
        <div>
          <TextArea
            value={getGeneralLogoPrompt()}
            onInput={(e) => setGeneralLogoPrompt(e.target.value)}
          />
        </div>
        <div>
          <TextArea
            value={model.logoPrompt}
            onInput={(e) => (model.logoPrompt = e.target.value)}
          />
        </div>
        <Button onClick={onGenerate}>Generate</Button>
      </div>
    </div>
  );
}
