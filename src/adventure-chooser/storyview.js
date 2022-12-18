/* eslint no-unused-vars: "off" */
import { Header, HeaderButton } from "../components/header";
import {
  PageContainer,
  Pre,
  Card2,
  CardButton,
  Button,
  TextArea,
  mergeProps,
  Field,
} from "../components/common";
import Sidebar from "../components/sidebar";
import { signal } from "@preact/signals";
import { useState, useEffect, useRef } from "preact/hooks";
import {
  markdownToElement,
  elementToPreact,
  markdownToPreact,
} from "../converthtml";
import * as icons from "../components/icons";

export function StoryView({ model }) {
  window.myModel = model;
  const story = model.domain;
  if (!story) {
    throw new Error("StoryView: no story");
  }
  const [storyVersion, setStoryVersion] = useState(0);
  model.addOnUpdate(() => {
    setStoryVersion(storyVersion + 1);
  });
  const [massEditing, setMassEditing] = useState(false);
  const log = [...story.queryLog];
  log.reverse();
  function onToggleMassEditing() {
    setMassEditing(!massEditing);
  }
  return (
    <PageContainer>
      <Header
        title={story.title.value || "?"}
        trackerPaths={[
          "adventure-chooser",
          `adventure-chooser/${model.slug || "default"}`,
        ]}
        buttons={[
          <HeaderButton onClick={onToggleMassEditing}>
            {massEditing ? "Regular" : "Mass Edit"}
          </HeaderButton>,
        ]}
        menu={<ImportExportMenu story={story} />}
      />
      <Sidebar>
        {log.map((l, index) => (
          <LogItem log={l} defaultOpen={index === 0} />
        ))}
      </Sidebar>
      {massEditing ? (
        <MassEditor story={story} />
      ) : (
        <RegularEditor story={story} />
      )}
    </PageContainer>
  );
}

function RegularEditor({ story }) {
  const dummyProp = { value: true };
  return (
    <div class="flex flex-wrap w-2/3">
      <PropertyView property={story.genre} prev={dummyProp} class="w-1/4" />
      <PropertyView property={story.title} prev={story.genre} class="w-1/4" />
      <PropertyView property={story.theme} prev={story.title} class="w-1/4" />
      <PropertyView
        property={story.characterName}
        prev={story.theme}
        class="w-1/4"
      />
      <PropertyView
        property={story.mainCharacter}
        prev={story.characterName}
        class="w-1/2"
      />
      <PropertyView
        property={story.introPassage}
        prev={story.mainCharacter}
        class="w-1/2"
      />
      {story.passages.map((p) => (
        <PropertyView property={p} prev={story.fromPassage} class="w-1/2" />
      ))}
    </div>
  );
}

function PropertyView({ class: _class, property, prev }) {
  const [editing, setEditing] = useState(null);
  const [addingChoice, setAddingChoice] = useState(false);
  let actualEditing = editing;
  if (editing === null && prev && prev.value && !property.value) {
    actualEditing = true;
  }
  const onEdit = () => setEditing(true);
  const onDone = () => {
    setEditing(false);
    setAddingChoice(false);
  };
  const onDelete = () => {
    if (confirm("Are you sure?")) {
      property.delete();
    }
  };
  const editButton = <CardButton onClick={onEdit}>Edit</CardButton>;
  const doneButton = <CardButton onClick={onDone}>Done</CardButton>;
  const deleteButton = (
    <CardButton onClick={onDelete}>
      <icons.Trash class="h-3 w-3" />
    </CardButton>
  );
  let addChoiceButton = null;
  function onAddChoice() {
    property.queries = [];
    setAddingChoice(true);
  }
  if (property.hasChoices && !addingChoice && !actualEditing) {
    addChoiceButton = <CardButton onClick={onAddChoice}>+choice</CardButton>;
  }
  let choices = null;
  if (property.hasChoices && property.choices.length) {
    choices = <Choices property={property} />;
  }
  return (
    <Card2
      class={_class}
      title={property.title}
      buttons={[
        addChoiceButton,
        actualEditing ? deleteButton : null,
        actualEditing || addingChoice ? doneButton : editButton,
      ]}
    >
      {property.type === "passage" ? (
        <PropertySource property={property} />
      ) : null}
      {property.value || !actualEditing ? (
        <PropertyValue
          value={property.value}
          onEdit={(v) => (property.value = v)}
        />
      ) : null}
      {actualEditing ? (
        <PropertyEditor property={property} onDone={onDone} />
      ) : null}
      {choices}
      {addingChoice ? (
        <PropertyEditor
          property={property}
          promptName="choices"
          onDone={() => setAddingChoice(false)}
        />
      ) : null}
    </Card2>
  );
}

function PropertySource({ property }) {
  return (
    <div>
      From <em>{property.fromPassage.title}</em>: {property.fromChoice}
    </div>
  );
}

function PropertyValue({ value, onEdit }) {
  const [editing, setEditing] = useState(false);
  function onSubmit(el) {
    setEditing(false);
    onEdit(el.value);
  }
  function onClick(event) {
    if (event.detail >= 2) {
      setEditing(true);
    }
  }
  function onKeyDown(event) {
    if (event.key === "Escape") {
      setEditing(false);
      event.preventDefault();
      return false;
    }
    return undefined;
  }
  useEffect(() => {
    if (editing) {
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }
    return undefined;
  }, [editing]);
  if (editing) {
    return (
      <div class="p-1 m-3">
        <TextArea
          defaultValue={value}
          onSubmit={onSubmit}
          autoFocus="1"
          onBlur={() => setEditing(false)}
        />
      </div>
    );
  }
  if (value) {
    return (
      <div class="p-1 m-3 bg-gray-200" onClick={onClick}>
        <Markdown text={value} />
      </div>
    );
  }
  return (
    <div class="p-1 m-3 text-gray-500" onClick={onClick}>
      (unset)
    </div>
  );
}

function Choices({ property }) {
  return (
    <ol class="list-decimal pl-4">
      {property.choices.map((c) => (
        <li>
          <Choice choice={c} property={property} />
        </li>
      ))}
    </ol>
  );
}

function Choice({ choice, property }) {
  const [editing, setEditing] = useState(false);
  const textRef = useRef(null);
  function onSubmit(el) {
    el = el || textRef.current;
    if (!el) {
      console.warn("No element to submit");
      return;
    }
    if (el.value === choice) {
      setEditing(false);
      return;
    }
    property.renameChoice(choice, el.value);
    setEditing(false);
  }
  function onKeyDown(event) {
    if (editing && event.key === "Escape") {
      setEditing(false);
      event.preventDefault();
      return false;
    }
    return undefined;
  }
  function onBindPassage() {
    property.story.addPassage(property.id, choice);
  }
  function onTrash() {
    property.removeChoice(choice);
  }
  function onClick(event) {
    if (event.detail >= 2) {
      setEditing(true);
    }
  }
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
  if (editing) {
    // FIXME; would be nice to have onBlur here but the double-edit is causing problems:
    return (
      <div class="p-1 m-3">
        <TextArea
          textareaRef={textRef}
          defaultValue={choice}
          onSubmit={onSubmit}
          autoFocus="1"
        />
      </div>
    );
  }
  return (
    <>
      {property.choiceHasPassage(choice) ? null : (
        <button
          class="w-8 bg-magenta-light hover:bg-magenta text-white inline-block rounded m-1"
          onClick={onBindPassage}
        >
          +
        </button>
      )}
      <span onClick={onClick}>{choice}</span>
      {property.choiceHasPassage(choice) ? null : (
        <button class="float-right" onClick={onTrash}>
          <icons.Trash class="h-3 w-3" />
        </button>
      )}
    </>
  );
}

function PropertyEditor({ property, promptName, onDone }) {
  useEffect(() => {
    if (!property.queries.length) {
      property.launchQuery(promptName);
    }
  }, [property, promptName]);
  const onKeyDown = (event) => {
    if (event.key === "a" && event.ctrlKey) {
      onAccept();
      event.preventDefault();
      return false;
    }
    return undefined;
  };
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  });
  function onSubmit(element) {
    const val = element.value;
    element.value = "";
    if (val) {
      property.addUserInput(val);
    } else if (promptName === "choices") {
      onDone();
    } else {
      onAccept();
    }
  }
  function onSelect(val) {
    if (promptName === "choices") {
      if (!property.hasChoice(val)) {
        property.addChoice(val);
      }
    } else {
      property.setValueFromText(val);
      onDone();
    }
  }
  async function onAccept() {
    let pos = property.queries.length - 1;
    while (pos >= 0) {
      const query = property.queries[pos];
      if (query.type === "init") {
        const val = await property.fixupValue(query.response);
        onSelect(val);
        return;
      } else if (query.type === "response") {
        // FIXME: this is silly to have two paths
        const val = await property.fixupValue(query.text);
        onSelect(val);
        return;
      }
      pos -= 1;
    }
  }
  let ignoreElement = null;
  if (promptName === "choices") {
    ignoreElement = (el) => property.hasChoice(el.innerText);
  }
  return (
    <div>
      {property.value || promptName ? <hr /> : null}
      <QueryText property={property} onSubmit={onSubmit} onSelect={onSelect} />
      {!promptName && property.single ? (
        <Button onClick={onAccept}>Accept ^A</Button>
      ) : null}
    </div>
  );
}

function QueryText({ property, onSubmit, onSelect, ignoreElement }) {
  const [selected, setSelected] = useState(-1);
  function onClick(event) {
    onSelect(event.target.innerText);
  }
  const textareaRef = useRef(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);
  const text = getQueryText(property);
  let [liElements, markup] = [[], null];
  if (text) {
    [liElements, markup] = parseQuery(text, onClick, selected);
    if (ignoreElement) {
      liElements = liElements.filter((e) => !ignoreElement(e));
    }
  }
  const onKeyPress = (event) => {
    if (!liElements.length) {
      return undefined;
    }
    if (event.key === "ArrowUp") {
      if (selected === -1) {
        setSelected(liElements.length - 1);
      } else if (selected === 0) {
        setSelected(-1);
      } else {
        setSelected(selected - 1);
      }
    } else if (event.key === "ArrowDown") {
      if (selected === -1) {
        setSelected(0);
      } else if (selected >= liElements.length - 1) {
        setSelected(-1);
      } else {
        setSelected(selected + 1);
      }
    } else if (event.key === "Enter") {
      if (selected !== -1) {
        onSelect(liElements[selected]);
        event.preventDefault();
        return false;
      }
    }
    return undefined;
  };
  useEffect(() => {
    window.addEventListener("keyup", onKeyPress);
    return () => {
      window.removeEventListener("keyup", onKeyPress);
    };
  });
  return (
    <div>
      <div class="unreset">{markup}</div>
      <TextArea onSubmit={onSubmit} autoFocus="1" textareaRef={textareaRef} />
    </div>
  );
}

function getQueryText(property) {
  const queries = property.queries;
  if (!queries.length) {
    return null;
  }
  const result = [];
  for (const query of queries) {
    if (query.type === "user") {
      result.push(`\n> *${query.text}*\n`);
    } else if (query.type === "init") {
      result.push(query.response || "...");
    } else {
      result.push(query.text);
    }
  }
  return result.join("\n");
}

function parseQuery(text, onClick, selected) {
  const element = markdownToElement(text);
  const liElements = [];
  function makeElement(element, tag, attrs, children) {
    if (tag === "li") {
      const index = liElements.length;
      const li = (
        <QueryResponseListItem
          origAttrs={attrs}
          origChildren={children}
          onClick={onClick}
          active={index === selected}
        />
      );
      liElements.push(element.innerText);
      return li;
    }
    return null;
  }
  const markup = elementToPreact(element, makeElement);
  return [liElements, markup];
}

function QueryResponseListItem({ origAttrs, origChildren, onClick, active }) {
  let props = mergeProps(origAttrs, {
    class: "hover:bg-gray-200 cursor-pointer",
  });
  if (active) {
    props = mergeProps(props, { class: "bg-blue-200" });
  }
  props.onClick = onClick;
  return <li {...props}>{origChildren}</li>;
}

function LogItem({ log, defaultOpen }) {
  if (!log.expanded) {
    log.expanded = signal(null);
  }
  const open =
    (log.expanded.value === null && defaultOpen) || log.expanded.value;
  function onClickHeader() {
    log.expanded.value = !open;
  }
  return (
    <div>
      <div
        class="bg-gray-200 p-1 pl-2 mb-2 -mr-3 rounded-l text-xs"
        onClick={onClickHeader}
      >
        {open ? (
          <icons.MinusCircle class="h-3 w-3 inline-block mr-2" />
        ) : (
          <icons.PlusCircle class="h-3 w-3 inline-block mr-2" />
        )}
        {log.fromCache ? "cached " : null}
        {log && log.time ? (log.time / 1000).toFixed(1) + "s" : null}
      </div>
      {open ? (
        <Pre class="text-xs">
          {log.prompt}
          {log.response ? (
            <span class="text-red-800">{log.response}</span>
          ) : (
            <span class="text-red-300">...</span>
          )}
        </Pre>
      ) : null}
    </div>
  );
}

function Markdown({ text }) {
  const c = markdownToPreact(text);
  return <div class="unreset">{c}</div>;
}

function ImportExportMenu({ story }) {
  function onExport(event) {
    const data = JSON.stringify(story, null, "  ");
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    event.target.href = url;
  }
  function onImport(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target.result;
      const storyJson = JSON.parse(data);
      story.updateFromJSON(storyJson);
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
        download={story.title.value}
      >
        Export/download
        <icons.Download class="h-4 w-4 inline-block ml-1" />
      </a>
    </div>
  );
}

function MassEditor({ story }) {
  <div class="flex flex-wrap w-2/3">
    <ul>
      <MassProperty property={story.genre} />
      <MassProperty property={story.title} />
      <MassProperty property={story.theme} />
      <MassProperty property={story.characterName} />
      <MassProperty property={story.mainCharacter} />
      <MassProperty property={story.introPassage} />
      {story.passages.map((p) => (
        <MassProperty property={p} />
      ))}
    </ul>
  </div>;
}

function MassProperty({ property }) {
  return (
    <li>
      <input type="checkbox" value={editing} onChange={onChange} />
      <div class="block text-gray-700 text-sm font-bold mb-2">
        {property.title}
      </div>
      <div>{property.value}</div>
    </li>
  );
}
