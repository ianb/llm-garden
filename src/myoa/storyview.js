/* eslint no-unused-vars: "off" */
import { Header, HeaderButton } from "../components/header";
import {
  PageContainer,
  Pre,
  Card,
  CardButton,
  Button,
  TextArea,
  mergeProps,
  Field,
  Select,
} from "../components/common";
import Sidebar from "../components/sidebar";
import { signal } from "@preact/signals";
import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import { markdownToElement, elementToPreact, Markdown } from "../markdown";
import * as icons from "../components/icons";
import { QueryLog } from "../components/querylog";
import { ImportExportMenu } from "../components/modelmenu";

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
  function onToggleMassEditing() {
    setMassEditing(!massEditing);
  }
  return (
    <PageContainer>
      <Header
        title={story.title.value || "? Story ?"}
        section="Make Your Own Adventure"
        sectionLink="/myoa/"
        trackerPaths={["myoa", `myoa/${model.slug || "default"}`]}
        buttons={[
          <HeaderButton onClick={onToggleMassEditing}>
            {massEditing ? "Regular" : "Mass Edit"}
          </HeaderButton>,
          <a href={`/myoa/play/?name=${encodeURIComponent(model.slug)}`}>
            <HeaderButton>Play</HeaderButton>
          </a>,
        ]}
        menu={<ImportExportMenu model={model} />}
        model={model}
      />
      <Sidebar>
        <QueryLog gptcache={model.domain.gpt} />
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
    <div class="flex flex-wrap">
      <PropertyView property={story.genre} prev={dummyProp} class="w-1/4" />
      <PropertyView property={story.theme} prev={story.genre} class="w-1/4" />
      <PropertyView property={story.title} prev={story.theme} class="w-1/4" />
      <PropertyView
        property={story.characterName}
        prev={story.title}
        class="w-1/4"
      />
      <PropertyView
        property={story.mainCharacter}
        prev={story.characterName}
        class="w-1/2"
      />
      <PropertyView property={story.gameState} class="w-1/2" />
      <PropertyView property={story.visualPrompt} class="w-1/2" />
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
  const [addingImage, setAddingImage] = useState(false);
  function onAddImage() {
    property.collapsed = false;
    setAddingImage(true);
  }
  if (property.collapsed) {
    return (
      <PropertyViewCollapsed
        class={_class}
        property={property}
        onAddImage={onAddImage}
      />
    );
  }
  let actualEditing = editing;
  if (editing === null && prev && prev.value && !property.value) {
    actualEditing = true;
  }
  const onEdit = () => setEditing(true);
  const onDone = () => {
    setEditing(false);
    setAddingChoice(false);
    setAddingImage(false);
  };
  const onDelete = () => {
    if (confirm("Are you sure?")) {
      property.delete();
    }
  };
  let onTitleEdit;
  if (property.type === "passage") {
    onTitleEdit = (v) => {
      property.title = v;
      property.story.updated();
    };
  }
  const editButton = (
    <CardButton onClick={onEdit}>
      <icons.Edit class="h-3 w-3" />
    </CardButton>
  );
  const doneButton = (
    <CardButton onClick={onDone}>
      <icons.Check class="h-3 w-3" />
    </CardButton>
  );
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
  if (property.hasChoices && !addingChoice && !actualEditing && !addingImage) {
    addChoiceButton = (
      <CardButton onClick={onAddChoice}>
        <icons.List class="h-3 w-3" />
      </CardButton>
    );
  }
  let choices = null;
  if (property.hasChoices && property.choices.length) {
    choices = (
      <Choices
        property={property}
        onCancelChoices={() => setAddingChoice(false)}
      />
    );
  }
  const addingImageButton = (
    <CardButton onClick={() => setAddingImage(!addingImage)}>
      {property.image ? (
        <icons.Photo class="h-3 w-3" />
      ) : (
        <icons.Camera class="h-3 m-3" />
      )}
    </CardButton>
  );
  const title = (
    <>
      <PropertyStatusIcon property={property} />
      {property.title}
    </>
  );
  return (
    <Card
      class={_class}
      title={title}
      onTitleEdit={onTitleEdit}
      buttons={[
        addChoiceButton,
        actualEditing ? deleteButton : null,
        actualEditing || addingChoice || addingImage
          ? doneButton
          : property.supportsEdit
          ? editButton
          : null,
        property.type === "passage" || property.type === "introPassage"
          ? addingImageButton
          : null,
        <CardButton onClick={() => (property.collapsed = true)}>
          <icons.ChevronUp class="h-3 w-3" />
        </CardButton>,
      ]}
    >
      {property.type === "passage" ? (
        <PropertySource property={property} />
      ) : null}
      {!addingImage && (property.value || !actualEditing) ? (
        <PropertyValue
          value={property.value}
          onEdit={(v) => (property.value = v)}
        />
      ) : null}
      {actualEditing ? (
        <PropertyEditor property={property} onDone={onDone} />
      ) : null}
      {!addingImage ? choices : null}
      {addingChoice ? (
        <PropertyEditor
          property={property}
          promptName="choices"
          onDone={() => setAddingChoice(false)}
        />
      ) : null}
      {addingImage ? (
        <ImageEditor property={property} onDone={() => setAddingImage(false)} />
      ) : null}
    </Card>
  );
}

function PropertyViewCollapsed({ property, onAddImage, class: _class }) {
  const buttons = [
    property.hasImage && !property.image ? (
      <CardButton onClick={onAddImage}>
        <icons.Camera class="h-3 w-3" />
      </CardButton>
    ) : null,
    <CardButton onClick={() => (property.collapsed = false)}>
      <icons.ChevronDown class="h-3 w-3" />
    </CardButton>,
  ];
  const title = (
    <span>
      <PropertyStatusIcon property={property} />
      {property.shortSummary}
    </span>
  );
  return <Card class={_class} title={title} buttons={buttons} />;
}

function PropertyStatusIcon({ property }) {
  const status = property.completionStatus;
  const IconComponent = {
    notStarted: icons.MinusCircle,
    ending: icons.StopCircle,
    through: icons.RightArrowCircle,
    complete: icons.CheckCircle,
    incomplete: icons.ExclamationCircle,
  }[status];
  const iconColor = {
    notStarted: "text-gray-300",
    ending: "text-black",
    through: "text-black",
    complete: "text-black",
    incomplete: "text-red",
  }[status];
  return <IconComponent class={`h-6 w-6 mr-1 inline-block ${iconColor}`} />;
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
        <Markdown class="gpt-response" text={value} />
      </div>
    );
  }
  return (
    <div class="p-1 m-3 text-gray-500" onClick={onClick}>
      (unset)
    </div>
  );
}

function Choices({ property, onCancelChoices }) {
  return (
    <ol class="list-decimal pl-4">
      {property.choices.map((c) => (
        <li>
          <Choice
            choice={c}
            property={property}
            onCancelChoices={onCancelChoices}
          />
        </li>
      ))}
    </ol>
  );
}

function Choice({ choice, property, onCancelChoices }) {
  const [editing, setEditing] = useState(false);
  const [linking, setLinking] = useState(false);
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
    onCancelChoices();
    property.story.addPassage(property.id, choice);
  }
  function onChoosePassage() {
    setLinking(true);
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
      {linking ? (
        <PassageChooser
          choice={choice}
          property={property}
          onDone={() => setLinking(false)}
        />
      ) : null}
      <span onClick={onClick}>{choice}</span>
      {property.choiceHasPassage(choice) || linking ? null : (
        <div class="float-right">
          <button onClick={() => onChoosePassage()}>
            <icons.Link class="h-3 w-3" />
          </button>
          <button onClick={onTrash}>
            <icons.Trash class="h-3 w-3" />
          </button>
        </div>
      )}
    </>
  );
}

function PassageChooser({ choice, property, onDone }) {
  function onInput(event) {
    const id = event.target.value;
    if (!id) {
      return;
    }
    if (id !== "cancel") {
      property.linkChoiceToPassage(choice, id);
    }
    onDone();
  }
  return (
    <Select onInput={onInput}>
      <option value="">(choose a passage)</option>
      {property.story.passages.map((p) => (
        <option value={p.id}>{p.title}</option>
      ))}
      <option value="cancel">Cancel</option>
    </Select>
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
    if (val.startsWith('"') && val.endsWith('"')) {
      const text = val.slice(1, -1);
      if (promptName === "choices") {
        property.addUserInput(text);
      } else {
        onSelect(text);
      }
    } else if (val) {
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
      <QueryText
        property={property}
        onSubmit={onSubmit}
        onSelect={onSelect}
        ignoreElement={ignoreElement}
      />
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
    [liElements, markup] = parseQuery(text, onClick, selected, ignoreElement);
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
      <div class="unreset gpt-response">{markup}</div>
      <TextArea onSubmit={onSubmit} autoFocus="1" textareaRef={textareaRef} />
    </div>
  );
}

function ImageEditor({ property, onDone }) {
  const [waitingOnResults, setWaitingOnResults] = useState(false);
  async function onGenerate(n) {
    if (!property.story.visualPrompt.value) {
      // FIXME: should have some way to pop you over to set the visual prompt
      alert("Please set the visual prompt first");
      return;
    }
    setWaitingOnResults(true);
    await property.generateImageFromPrompt(property.lastImagePrompt, n);
    setWaitingOnResults(false);
  }
  const onRefresh = useCallback(async () => {
    const suggested = await property.suggestImagePrompt();
    property.lastImagePrompt = suggested;
  }, [property]);
  useEffect(() => {
    if (property.lastImagePrompt) {
      return;
    }
    onRefresh();
  }, [property, onRefresh]);
  return (
    <div>
      {waitingOnResults ? (
        <div>
          Generating... <br />
          {property.story.visualPrompt.value} <br /> {property.lastImagePrompt}
        </div>
      ) : (
        <>
          <Field>
            Prompt:
            <TextArea
              placeholder="Generating suggestion..."
              value={property.lastImagePrompt}
              onInput={(e) => {
                property.lastImagePrompt = e.target.value;
              }}
            />
          </Field>
          <div>
            <Button onClick={onGenerate.bind(this, 1)}>Generate</Button>
            <Button onClick={onGenerate.bind(this, 2)}>x2</Button>
            <Button onClick={onRefresh}>Refresh</Button>
          </div>
        </>
      )}
      {property.imageTrials && property.imageTrials.length ? (
        <div>
          {property.imageTrials.map((image) => (
            <ImagePreview image={image} property={property} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ImagePreview({ image, property }) {
  const onSelect = () => {
    if (property.image && property.image.id === image.id) {
      property.image = null;
    } else {
      property.image = image;
    }
  };
  return (
    <div class="m-1">
      {property.image && property.image.id === image.id ? (
        <div class="absolute left-0 z-10 p-5">
          <icons.Star class="h-4 w-4 text-yellow-500" />
        </div>
      ) : null}
      <div class="group absolute right-0 z-10 h-20 w-20">
        <div class="invisible group-hover:visible">
          <Button onClick={onSelect}>
            {property.image && property.image.id === image.id ? (
              <icons.Check class="h-3 w-3" />
            ) : (
              <icons.Plus class="h-3 w-3" />
            )}
          </Button>
          <br />
          <Button onClick={() => property.removeImage(image)}>
            <icons.Trash class="h-3 w-3" />
          </Button>
        </div>
      </div>
      <img src={image.url} class="w-full" title={image.prompt} />
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
      const empty = property.takesExtraPrompt ? "" : "...";
      result.push(query.response || empty);
    } else {
      result.push(query.text);
    }
  }
  return result.join("\n");
}

function parseQuery(text, onClick, selected, ignoreElement) {
  const element = markdownToElement(text);
  const liElements = [];
  function makeElement(element, tag, attrs, children) {
    if (ignoreElement && ignoreElement(element)) {
      return "";
    }
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
