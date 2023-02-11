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
import { CityGraph } from "./citygraph";
import { CityLayout } from "./citylayout";

const hashSignal = signal(window.location.hash);
window.addEventListener("hashchange", () => {
  hashSignal.value = window.location.hash;
});

export const CityMakerView = ({ model }) => {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const func = () => {
      setVersion(version + 1);
    };
    model.addOnUpdate(func);
    return () => {
      model.removeOnUpdate(func);
    };
  }, [model, version, setVersion]);
  if (hashSignal.value === "#graph") {
    return <CityGraph model={model} />;
  } else if (hashSignal.value === "#layout") {
    return <CityLayout model={model} />;
  }
  return (
    <PageContainer>
      <Header
        title={model.title || "? City ?"}
        section="City Maker"
        sectionLink="/citymaker/"
        trackerPaths={["citymaker", `citymaker/${model.slug || "default"}`]}
        menu={<ImportExportMenu model={model} />}
        model={model}
        buttons={[
          <a
            href={`/citymaker/?name=${encodeURIComponent(model.slug)}#graph`}
            target="_blank"
          >
            <HeaderButton>View Graph</HeaderButton>
          </a>,
          <a
            href={`/citymaker/?name=${encodeURIComponent(model.slug)}#layout`}
            target="_blank"
          >
            <HeaderButton>View Layout</HeaderButton>
          </a>,
        ]}
      />
      <Sidebar>
        <QueryLog gptcache={model.domain.gpt} />
      </Sidebar>
      <div class="p-2">
        <City model={model} />
      </div>
    </PageContainer>
  );
};

function City({ model }) {
  const items = [];
  for (const prop of Object.values(model.domain.topLevelProperties)) {
    items.push(<PropertyView model={model} property={prop} />);
  }
  return items;
}

function PropertyView({ model, property }) {
  if (!property) {
    throw new Error("No property given");
  }
  const [editing, setEditing] = useState(false);
  const desc = property.description;
  if (!property.title) {
    window.p = property;
  }
  function onClickDisplay(event) {
    if (!property.editable) {
      return;
    }
    if (property.choiceType === "accept") {
      property.autoFillChoice();
      return;
    }
    if (!property.name) {
      setEditing(true);
      event.preventDefault(true);
    } else if (event.detail >= 2) {
      // Double click always gives edit
      setEditing(true);
      event.preventDefault(true);
    }
  }
  let display;
  if (!editing) {
    display = (
      <>
        <div
          onClick={onClickDisplay}
          class={property.editable && !property.name ? "cursor-pointer" : ""}
        >
          <Markdown
            text={property.describeChoiceMarkdown(property.asChoice())}
            class="compact"
          />
        </div>
        {desc ? <div class="ml-2">{desc}</div> : null}
      </>
    );
  }
  return (
    <div class="px-2 py-0.5 bg-white my-2">
      {editing ? (
        <PropertyEditor
          model={model}
          property={property}
          onDone={() => setEditing(false)}
        />
      ) : (
        display
      )}
      {property.isAutoFilling ? <div>Filling...</div> : null}
      {property.children ? (
        <div class="pl-2 border-l-2 nested-borders">
          {property.children
            .filter((x) => x)
            .map((child) => (
              <div class="border-t border-gray-200">
                <PropertyView model={model} property={child} />
              </div>
            ))}
        </div>
      ) : null}
    </div>
  );
}

function PropertyEditor({ model, property, onDone }) {
  const [version, setVersion] = useState(0);
  const [gettingMore, setGettingMore] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  useEffect(() => {
    const func = () => {
      setVersion(version + 1);
      setGettingMore(false);
      setAdding(false);
    };
    property.addOnUpdate(func);
    return () => {
      property.removeOnUpdate(func);
    };
  }, [property, version, setVersion]);
  useEffect(() => {
    if (!property.choices) {
      property.generateChoices();
    }
  }, [property]);
  if (!property.choices) {
    return <div>Loading...</div>;
  }
  const onSelect = (choice) => {
    if (property.choiceType === "multi-choice") {
      property.addChoice(choice);
    } else {
      property.setChoice(choice);
      onDone();
    }
  };
  const onAdd = async (text) => {
    setAdding(true);
    const choice = await property.coerceChoice(text);
    property.choices.push(choice);
    property.updated();
  };
  const onMore = () => {
    if (gettingMore) {
      return;
    }
    setGettingMore(true);
    property.retrieveMoreChoices();
  };
  return (
    <div class="bg-white p-2">
      <div>
        {property.title}{" "}
        <Button onClick={onDone}>
          <icons.Check class="w-2 h-2" />
        </Button>
        <Button onClick={() => setEditingPrompt(!editingPrompt)}>
          {editingPrompt ? (
            <icons.Check class="w-2 h-2" />
          ) : (
            <icons.Edit class="w-2 h-2" />
          )}
        </Button>
      </div>
      {editingPrompt ? (
        <PromptEditor
          property={property}
          onDone={() => setEditingPrompt(false)}
        />
      ) : null}
      {!editingPrompt && property.additionalChoicePrompt ? (
        <div class="ml-4 mb-2">
          <em>{property.additionalChoicePrompt}</em>
        </div>
      ) : null}
      <ol class="ml-4 list-decimal">
        {property.choices
          .filter((c) => !property.hasChoice(c))
          .map((choice) => (
            <ChoiceItem
              choice={choice}
              property={property}
              onSelect={onSelect}
            />
          ))}
        {adding ? (
          <li class="hover:bg-gray-200 cursor-pointer">Adding...</li>
        ) : (
          <AddChoice onAdd={onAdd} />
        )}
        <li class="hover:bg-gray-200 cursor-pointer" onClick={onMore}>
          {gettingMore ? "Retrieving ..." : "More ..."}
        </li>
      </ol>
    </div>
  );
}

function ChoiceItem({ choice, property, onSelect }) {
  let d;
  if (property.choiceType === "multi-choice") {
    d = property.creates.prototype.describeChoiceMarkdown.call(
      property.creates.prototype,
      choice
    );
  } else {
    d = property.describeChoiceMarkdown(choice);
  }
  const dRendered = <Markdown text={d} class="compact" />;
  return (
    <li
      class="hover:bg-gray-200 cursor-pointer"
      onClick={() => onSelect(choice)}
    >
      {dRendered}
    </li>
  );
}

function AddChoice({ onAdd }) {
  const [editing, setEditing] = useState(false);
  const onSubmit = (el) => {
    onAdd(el.value);
    el.value = "";
    setEditing(false);
  };
  return (
    <li class="hover:bg-gray-200 cursor-pointer">
      {editing ? (
        <TextInput autoFocus onSubmit={onSubmit} />
      ) : (
        <div onClick={() => setEditing(true)}>Add ...</div>
      )}
    </li>
  );
}

function PromptEditor({ property, onDone }) {
  const onSubmit = (el) => {
    property.additionalChoicePrompt = el.value;
    property.choices = [];
    property.generateChoices();
    property.updated();
    onDone();
  };
  return (
    <Field>
      Add information to inform these choices:
      <TextArea
        onSubmit={onSubmit}
        defaultValue={property.additionalChoicePrompt}
      />
    </Field>
  );
}
