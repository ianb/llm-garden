/* eslint no-unused-vars: "off" */
import { Header } from "../components/header";
import {
  PageContainer,
  Pre,
  Card2,
  CardButton,
  Button,
  TextArea,
  mergeProps,
} from "../components/common";
import Sidebar from "../components/sidebar";
import { signal } from "@preact/signals";
import { useState, useEffect, useRef } from "preact/hooks";
import { markdownToElement, elementToPreact } from "../converthtml";
import * as icons from "../components/icons";

export function StoryView({ story }) {
  const log = [...story.queryLog];
  log.reverse();
  const dummyProp = { value: true };
  return (
    <PageContainer>
      <Header
        title={story.title.value || "?"}
        trackerPaths={[
          "adventure-chooser",
          `adventure-chooser/${story.title.value || "default"}`,
        ]}
      />
      <Sidebar>
        {log.map((l, index) => (
          <LogItem log={l} defaultOpen={index === 0} />
        ))}
      </Sidebar>
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
      </div>
    </PageContainer>
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
  const editButton = <CardButton onClick={onEdit}>Edit</CardButton>;
  const doneButton = <CardButton onClick={onDone}>Done</CardButton>;
  let addChoiceButton = null;
  function onAddChoice() {
    property.queries = [];
    setAddingChoice(true);
  }
  if (property.hasChoices && !addingChoice && !actualEditing) {
    addChoiceButton = <CardButton onClick={onAddChoice}>Add Choice</CardButton>;
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
        actualEditing || addingChoice ? doneButton : editButton,
      ]}
    >
      {property.value || !actualEditing ? (
        <PropertyValue value={property.value} />
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

function PropertyValue({ value }) {
  if (value) {
    return <div class="p-1 m-3 bg-gray-200">{value}</div>;
  }
  return <div class="p-1 m-3 text-gray-500">(unset)</div>;
}

function Choices({ property }) {
  function onTrash(choice) {
    property.removeChoice(choice);
  }
  return (
    <ol class="list-decimal pl-4">
      {property.choices.map((c) => (
        <li>
          {c}
          <button class="float-right" onClick={onTrash.bind(null, c)}>
            <icons.Trash class="h-3 w-3" />
          </button>
        </li>
      ))}
    </ol>
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
      console.log("prop is", property, property.hasChoice);
      if (!property.hasChoice(val)) {
        property.addChoice(val);
      }
    } else {
      property.value = val;
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

function Title({ story }) {}

function Theme({ story }) {}

function MainCharacter({ story }) {}
