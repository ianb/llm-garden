/* eslint-disable no-unused-vars */
import { signal } from "@preact/signals";
import { useState } from "preact/hooks";
import {
  Button,
  CardButton,
  Card2,
  P,
  DateView,
  PageContainer,
} from "./common";
import { Header } from "./header";
import * as icons from "./icons";

export const ModelIndex = ({ store, onSelect, onAdd }) => {
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
    />
  );
};

const ConcreteIndex = ({
  onSelect,
  onAdd,
  includeArchive,
  setIncludeArchive,
  models,
}) => {
  if (!models.value) {
    return <div>Loading...</div>;
  }
  if (models.value.length === 0) {
    return (
      <div>
        <Card2 title="No models yet!">
          <P>Click the button below to add a new model.</P>
        </Card2>
        <Adder onAdd={onAdd} />
      </div>
    );
  }
  return (
    <div>
      {models.value.map((m) => (
        <Model model={m} onSelect={onSelect} />
      ))}
      <Adder onAdd={onAdd} />
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
      <Card2
        title={model.title || "?"}
        buttons={[model.builtin ? null : button]}
      >
        <P>{model.description}</P>
        {model.builtin ? (
          <P>Built-in</P>
        ) : (
          <P>
            Updated:{" "}
            <DateView timestamp={model.dateUpdated || model.dateCreated} />
          </P>
        )}
      </Card2>
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
      <Card2 title="Add new model">
        <Button>Click to add a new model.</Button>
      </Card2>
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

export const ModelIndexPage = ({ title, store, viewer }) => {
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
      <ModelIndex store={store} onAdd={onAdd} />
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
