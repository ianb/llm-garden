/* eslint-disable no-unused-vars */
import { Field } from "./common";
import * as icons from "./icons";

export function ImportExportMenu({ model }) {
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
  return (
    <div>
      <Field>
        Import
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
  );
}
