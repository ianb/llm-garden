/* eslint-disable no-unused-vars */
import { signal } from "@preact/signals";
import { useState } from "preact/hooks";
import {
  Button,
  CardButton,
  Card,
  CardFooter,
  P,
  DateView,
  PageContainer,
  Field,
  TextInput,
  TextArea,
} from "./common";
import { Header } from "./header";
import * as icons from "./icons";
import { Markdown } from "../markdown";

export const ModelIndex = ({ store, onSelect, onAdd, children }) => {
  const [includeArchive, setIncludeArchive] = useState(false);
  const models = signal(null);
  store.getSummaries(includeArchive).then((m) => {
    models.value = m;
  });
  async function onSetIncludeArchive(v) {
    models.value = null;
    setIncludeArchive(v);
    models.value = await store.getSummaries(v);
  }
  return (
    <ConcreteIndex
      onSelect={onSelect}
      onAdd={onAdd}
      includeArchive={includeArchive}
      setIncludeArchive={onSetIncludeArchive}
      models={models}
    >
      {children}
    </ConcreteIndex>
  );
};

const ConcreteIndex = ({
  onSelect,
  onAdd,
  includeArchive,
  setIncludeArchive,
  models,
  children,
}) => {
  if (!models.value) {
    return <div>Loading...</div>;
  }
  if (models.value.length === 0) {
    return (
      <div>
        <Card title="No models yet!">
          <P>Click the button below to add a new model.</P>
        </Card>
        {onAdd ? <Adder onAdd={onAdd} /> : null}
      </div>
    );
  }
  return (
    <div class="flex flex-wrap justify-between">
      {children}
      {models.value.map((m) => (
        <Model model={m} onSelect={onSelect} />
      ))}
      {onAdd ? <Adder onAdd={onAdd} /> : null}
    </div>
  );
};

const Model = ({ model, onSelect }) => {
  function onClick(event) {
    event.preventDefault();
    if (onSelect) {
      onSelect(model);
    }
    return false;
  }
  function onClickDelete(event) {
    event.preventDefault();
    event.stopPropagation();
    if (confirm("Really delete this model?")) {
      model.delete().then(() => {
        window.location.reload();
      });
    }
    return false;
  }
  const button = (
    <CardButton onClick={onClickDelete}>
      <icons.Trash class="h-4 w-4" />
    </CardButton>
  );
  return (
    <a href={makeLink(model)} onClick={onClick}>
      <Card
        title={model.title || "?"}
        buttons={[model.builtin ? null : button]}
        class="hover:drop-shadow-xl"
      >
        <Markdown class="p-2" text={model.description} />
        <CardFooter>
          {model.builtin ? (
            <P>Built-in</P>
          ) : (
            <P>
              Updated:{" "}
              <DateView timestamp={model.dateUpdated || model.dateCreated} />
            </P>
          )}
        </CardFooter>
      </Card>
    </a>
  );
};

const Adder = ({ onAdd }) => {
  function onAddRaw(event) {
    event.preventDefault();
    onAdd();
    return false;
  }
  return (
    <a href="#" onClick={onAddRaw}>
      <Card title="Add new model">
        <Button>Click to add a new model.</Button>
      </Card>
    </a>
  );
};

export const ModelLoader = ({ model, viewer, children }) => {
  const [loadedModel, setLoadedModel] = useState(null);
  model.then((m) => {
    setLoadedModel(m);
  });
  if (loadedModel === null) {
    return <>{children}</>;
  }
  // FIXME: not sure why this is different than the other one.
  // return <viewer model={loadedModel} />;
  return viewer({ model: loadedModel });
};

export const ModelIndexPage = ({ title, store, viewer, noAdd, children }) => {
  const u = new URL(location.href).searchParams;
  if (u.get("name") || u.get("id")) {
    let model;
    if (u.get("id")) {
      model = store.getById(u.get("id"));
    } else {
      model = store.getBySlug(u.get("name"));
    }
    return (
      <ModelLoader model={model} viewer={viewer}>
        Loading...
      </ModelLoader>
    );
  }
  async function onAdd() {
    const model = await store.create();
    await model.saveToDb();
    window.location = makeLink(model);
  }
  return (
    <PageContainer>
      <Header title={title} />
      <ModelIndex store={store} onAdd={noAdd ? null : onAdd}>
        {children}
      </ModelIndex>
    </PageContainer>
  );
};

function makeLink(model) {
  const u = new URL(location.href);
  let base = u.pathname;
  if (!base.endsWith("/")) {
    base = base + "/";
  }
  if (model.slug) {
    return `${base}?name=${encodeURIComponent(model.slug)}`;
  } else {
    return `${base}?id=${encodeURIComponent(model.id)}`;
  }
}

export function ModelTitleDescriptionEditor({ model }) {
  const [collapsed, setCollapsed] = useState(true);
  function onTitle(event) {
    model.title = event.target.value;
  }
  function onDescription(event) {
    model.description = event.target.value;
  }
  function onCollapseToggle(event) {
    setCollapsed(!collapsed);
  }
  return (
    <>
      <Field>
        <span>Title:</span>
        <TextInput onInput={onTitle} defaultValue={model.title} />
      </Field>
      <Field>
        <span onClick={onCollapseToggle}>
          Description:{" "}
          {collapsed ? (
            <icons.PlusCircle class="h-3 w-3 inline-block" />
          ) : (
            <icons.MinusCircle class="h-3 w-3 inline-block" />
          )}
        </span>
        {collapsed ? null : (
          <TextArea onInput={onDescription} defaultValue={model.description} />
        )}
      </Field>
    </>
  );
}
