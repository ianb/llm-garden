/* eslint-disable no-unused-vars */
import { Header, HeaderButton } from "../components/header";
import {
  PageContainer,
  Card,
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
import { schemas } from "./layerdb";

const hashSignal = signal(window.location.hash);
window.addEventListener("hashchange", () => {
  hashSignal.value = window.location.hash;
});

export const LayerCraftView = ({ model }) => {
  window.model = model;
  model.updateVersion.value;
  return (
    <PageContainer>
      <Header
        title={model.title || "? Doc ?"}
        section="LayerCraft"
        sectionLink="/layercraft/"
        trackerPaths={["layercraft", `layercraft/${model.slug || "default"}`]}
        menu={<ImportExportMenu model={model} />}
        model={model}
      />
      <Sidebar>
        <QueryLog gptcache={model.domain.gpt} />
      </Sidebar>
      <div class="p-2">
        <Layer model={model} />
      </div>
    </PageContainer>
  );
};

function Layer({ model }) {
  if (!model.domain.schemaName) {
    return <SchemaChooser model={model} />;
  }
  return <ol class="pl-2 border-l-2 nested-borders">
    <LayerEditor model={model} parent={model.domain.document} />
  </ol>;
}

function SchemaChooser({ model }) {
  function onClick(name, schema, event) {
    event.preventDefault();
    model.domain.schemaName = name;
    return false;
  }
  return <>
    {Object.entries(schemas).map(([name, schema]) =>
      <a href="#" onClick={onClick.bind(null, name, schema)}>
        <Card class="w-1/3" title={schema.title}>{schema.description || schema.name}</Card>
      </a>
    )}
  </>;
}

function LayerEditor({ model, parent }) {
  const parentType = parent && parent.type;
  function matchesType(field) {
    if (!parentType || parentType === "document") {
      return !field.parent || field.parent === "document";
    }
    return field.parent === parentType;
  }
  const types = model.domain.schema.fields.filter((field) => matchesType(field));
  if (!types.length) {
    return null;
  }
  return <>
    {types.map((field) => <LayerTypeEditor model={model} parent={parent} type={field.name} />)}
  </>;
}

function LayerTypeEditor({ model, parent, type }) {
  const children = [];
  if (model.domain.canAddChild(parent, type)) {
    children.push(<AddProperty model={model} parent={parent} type={type} />);
  }
  for (const ob of model.domain.childrenByType(parent, type, true)) {
    children.push(<Property model={model} object={ob} uncommitted={true} />);
  }
  for (const ob of model.domain.childrenByType(parent, type)) {
    children.push(<Property model={model} object={ob} />);
  }
  const field = model.domain.getField(type);
  if (field.choiceType === "multi-choice") {
    return <li class={field.style}>
      <h3>{field.title}</h3>
      <ol class="pl-2 border-l-2 nested-borders">
        {children.map((child) => <li>{child}</li>)}
      </ol>
    </li>;
  }
  return <>
    {children.map((child) => <li class={field.style}>{child}</li>)}
  </>;
}

function Property({ model, object, uncommitted }) {
  const [editValue, setEditValue] = useState(false);
  function onDelete() {
    model.domain.removeChild(object);
  }
  function onEdit() {
    setEditValue(true);
  }
  function onSubmitEdit() {
    setEditValue(false);
  }
  const field = model.domain.getField(object.type);
  return <div>
    <div class="group relative border-b border-gray-300 mb-1">
      <div class="hidden group-hover:block absolute z-50 right-0 top-0 opacity-40 hover:opacity-100">
        <Button class="m-0 block my-1" onClick={onDelete}><icons.Trash class="h-2 w-2" /></Button>
        <Button class="m-0 block my-1" onClick={onEdit}><icons.Edit class="h-2 w-2" /></Button>
      </div>
      {editValue ?
        <TextArea
          value={model.domain.textValue(object)}
          onSubmit={onSubmitEdit}
          onInput={(e) => model.domain.setTextValue(object, e.target.value)} />
        :
        <>
          {!editValue && field.showImage ? <PropertyImage model={model} object={object} /> : null}
          <Markdown text={model.domain.renderFieldDisplay(object)} />
        </>}
      {uncommitted && <span class="text-red-500"> (uncommitted)</span>}
    </div>
    {!uncommitted &&
      <ol class="pl-2 border-l-2 nested-borders"><LayerEditor model={model} parent={object} /></ol>}
    {field.attachImage && !uncommitted ? <ImageAttach model={model} object={object} /> : null}
    {field.chat && !uncommitted ? <Chat model={model} object={object} /> : null}
  </div>;
}

function AddProperty({ model, parent, type }) {
  const [editingInstructions, setEditingInstructions] = useState(false);
  if (parent.collapsedChoices && parent.collapsedChoices[type]) {
    return <ExpandProperty model={model} parent={parent} type={type} />;
  }
  const field = model.domain.getField(type);
  const instructions = model.domain.getInstructions(parent, type);
  if (!model.domain.hasRequirements(parent, type)) {
    const missing = model.domain.missingRequirements(parent, type);
    return <div>
      Missing dependencies for {model.domain.getField(type).title}: {
        missing.map((t) => model.domain.getField(t).title).join(", ")}
    </div>;
  }
  if (!parent.choices || !parent.choices[type]) {
    model.domain.fillChoices(parent, type);
    return <div class="bg-blue-800 text-white rounded-md mx-4 p-2">Loading...</div>;
  }
  let choices = parent.choices[type];
  choices = choices.filter((choice) => !model.domain.hasChildByName(parent, type, choice.name));
  function onChoice(choice) {
    model.domain.addChild(parent, type, choice, field.choiceType === "multi-choice");
  }
  function onDone() {
    if (field.choiceType === "multi-choice") {
      model.domain.commitChoices(parent, type);
    }
    if (!parent.collapsedChoices) {
      parent.collapsedChoices = {};
    }
    parent.collapsedChoices[type] = true;
    model.updated();
  }
  function onReroll() {
    model.domain.rerollChoices(parent, type);
  }
  function onEditInstructions(event) {
    event.preventDefault();
    event.stopPropagation();
    setEditingInstructions(true);
  }
  function onCloseEditing(event) {
    setEditingInstructions(false);
    onReroll();
  }
  return <div>
    {field.choiceType === "single-choice" && <h3>Choose {model.domain.getField(type).title}:</h3>}
    <ol class="ml-8 list-decimal">
      {choices.map((choice) => <li class="cursor-default hover:bg-gray-300" onClick={() => onChoice(choice)}>
        <Markdown text={model.domain.renderFieldDisplay(choice)} />
      </li>)}
      <li class="cursor-default hover:bg-gray-300">
        <span class="cursor-default hover:bg-gray-300" onClick={onReroll}>
          Reroll
          {instructions && <span> with instructions "{instructions}"</span>}</span>
        <Button class="m-0 px-3 py-1 ml-1" onClick={onEditInstructions}><icons.Edit class="h-2 w-2" /></Button>
        {editingInstructions && <InstructionEditor model={model} parent={parent} type={type} onClose={onCloseEditing} />}
      </li>
      {field.choiceType === "multi-choice" && <li class="cursor-default hover:bg-gray-300" onClick={onDone}>Done</li>}
    </ol>
  </div >;
}

function ExpandProperty({ model, parent, type }) {
  function onAddMore() {
    delete parent.collapsedChoices[type];
    if (!Object.keys(parent.collapsedChoices).length) {
      delete parent.collapsedChoices;
    }
    model.updated();
  }
  return <button class="hover:bg-gray-300 text-gray-400 hover:text-black" onClick={onAddMore}>Add more...</button>;
}

function InstructionEditor({ model, parent, type, onClose }) {
  const instructions = model.domain.getInstructions(parent, type);
  const [text, setText] = useState(instructions);
  function onSave(el) {
    model.domain.setInstructions(parent, type, el.value);
    onClose();
  }
  return <TextArea autoFocus="1" placeholder="Instructions on how to make the list" defaultValue={instructions} onSubmit={onSave} />;
}

function Chat({ model, object }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return <div>
      <Button onClick={() => setOpen(true)}>Start Chat</Button>
    </div>;
  }
  const messages = model.domain.getChatMessages(object);
  const classes = {
    user: "bg-blue-500 text-white px-4 py-2 rounded-lg mb-2 mr-10 shadow-xl",
    assistant: "bg-gray-100 px-4 py-2 rounded-lg ml-10 mb-2 shadow-xl",
  };
  function onSubmit(el) {
    model.domain.addChatMessage(object, el.value);
    el.value = "";
  }
  return (
    <div>
      <div>
        {messages.map((message) => <div class={classes[message.role]}><Markdown text={message.content} /></div>)}
      </div>
      <TextArea placeholder="Type your message here" onSubmit={onSubmit} />
      <Button onClick={() => setOpen(false)}>Close Chat</Button>
    </div>
  );
}

function ImageAttach({ model, object }) {
  function onDelete() {
    model.domain.setImage(object, null);
  }
  if (object.imageUrl) {
    return <div>
      Image attached
      <Button class="m-0 ml-2" onClick={onDelete}><icons.Trash class="h-2 w-2" /></Button>
    </div>;
  }
  function onSave(el) {
    model.domain.setImage(object, el.value);
  }
  return <div>
    <Field sideBySide={true}>
      Image:
      <TextInput placeholder="Image URL" onSubmit={onSave} />
    </Field>
  </div>;
}

function PropertyImage({ model, object }) {
  const [zoomed, setZoomed] = useState(false);
  const imageUrl = model.domain.getImageForObject(object);
  if (!imageUrl) {
    return null;
  }
  return <>
    <div class="float-right">
      <img class="w-36 rounded-xl pr-1" onClick={() => setZoomed(true)} src={imageUrl} />
    </div>
    {zoomed ? <ZoomedImage imageUrl={imageUrl} object={object} onClose={() => setZoomed(false)} /> : null}
  </>;
}

function ZoomedImage({ imageUrl, object, onClose }) {
  const imageRef = useRef();
  // useEffect(() => {
  //   if (!imageRef.current) {
  //     return;
  //   }
  //   const onClick = (event) => {
  //     let parent = event.target;
  //     while (parent) {
  //       if (parent === imageRef.current) {
  //         return;
  //       }
  //       parent = parent.parentElement;
  //     }
  //     onClose();
  //   };
  //   document.addEventListener("click", onClick);
  //   return () => document.removeEventListener("click", onClick);
  // }, [imageRef.current, onClose]);
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  return <div class="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose}>
    <img
      ref={imageRef}
      src={imageUrl}
      class="fixed max-h-full max-w-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
    />
  </div>;
}
