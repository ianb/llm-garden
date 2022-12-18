/* eslint-disable no-unused-vars */
import { signal } from "@preact/signals";
import { useState } from "preact/hooks";
import { Button, Card2, P, Date } from "./common";

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
  return (
    <Card2 title={model.title} onClick={() => onSelect(model)}>
      <P>{model.description}</P>
      {model.builtin ? (
        <P>Built-in</P>
      ) : (
        <P>
          Updated: <Date timestamp={model.dateUpdated} />
        </P>
      )}
    </Card2>
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
