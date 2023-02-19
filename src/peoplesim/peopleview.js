/* eslint-disable no-unused-vars */
import { Header, HeaderButton } from "../components/header";
import {
  PageContainer,
  Button,
  TextInput,
  Field,
  TextArea,
  FieldSet,
  HR,
} from "../components/common";
import Sidebar from "../components/sidebar";
import { useState, useEffect, useRef } from "preact/hooks";
import { signal } from "@preact/signals";
import { QueryLog } from "../components/querylog";
import * as icons from "../components/icons";
import { ImportExportMenu } from "../components/modelmenu";
import { Markdown } from "../markdown";
import { Person } from "./peopledb";

const hashSignal = signal(window.location.hash);
window.addEventListener("hashchange", () => {
  hashSignal.value = window.location.hash;
});

export const PeopleView = ({ model }) => {
  const [version, setVersion] = useState(0);
  window.sim = model.domain;
  useEffect(() => {
    const func = () => {
      setVersion(version + 1);
    };
    model.addOnUpdate(func);
    return () => {
      model.removeOnUpdate(func);
    };
  }, [model, version, setVersion]);
  let child;
  let button;
  function onPlayToggle() {
    if (hashSignal.value === "#play") {
      window.location.hash = "";
    } else {
      window.location.hash = "#play";
    }
  }
  if (hashSignal.value === "#play") {
    child = <PeopleSimPlayer model={model} version={version} />;
    button = <HeaderButton onClick={onPlayToggle}>Edit</HeaderButton>;
  } else {
    child = <PeopleSimView model={model} version={version} />;
    button = <HeaderButton onClick={onPlayToggle}>Play</HeaderButton>;
  }
  return (
    <PageContainer>
      <Header
        title={model.title || "? People Sim ?"}
        section="People Sim"
        sectionLink="/peoplesim/"
        trackerPaths={["peoplesim", `peoplesim/${model.slug || "default"}`]}
        menu={<ImportExportMenu model={model} />}
        model={model}
        buttons={[button]}
      />
      <Sidebar>
        <QueryLog gptcache={model.domain.gpt} />
      </Sidebar>
      <div class="p-2">{child}</div>
    </PageContainer>
  );
};

function PeopleSimView({ model }) {
  const people = Array.from(Object.values(model.domain.people));
  people.reverse();
  return (
    <div>
      <div>
        <Field>
          Scenario description:
          <TextArea
            value={model.domain.scenarioDescription}
            onInput={(e) => (model.domain.scenarioDescription = e.target.value)}
            placeholder="Describe the general scene and situation."
          />
        </Field>
      </div>
      <div>
        <Field>
          Room description:
          <TextArea
            value={model.domain.roomDescription}
            onInput={(e) => (model.domain.roomDescription = e.target.value)}
            placeholder="Describe the room and its contents. Do so in detail."
          />
        </Field>
      </div>
      <div>
        <Field>
          Order of people:
          <TextInput
            value={model.domain.peopleOrderString}
            onInput={(e) => (model.domain.peopleOrderString = e.target.value)}
            placeholder="Person1 Person2"
          />
        </Field>
      </div>
      <PersonEditor model={model} />
      {people.map((person) => (
        <PersonView model={model} person={person} />
      ))}
    </div>
  );
}

function PersonView({ model, person }) {
  if (!person.collapsed) {
    return <PersonEditor model={model} person={person} />;
  }
  return (
    <FieldSet
      legend={person.name || "Unnamed"}
      onClickLegend={() => person.toggleCollapsed()}
    >
      <Markdown text={`**Description:** ${person.description}`} />
      <Markdown text={`**Mood:** ${person.mood}`} />
      <Markdown text={`**Goal:** ${person.goal}`} />
      {Array.from(person.relationships).map(([name, rel]) => (
        <div>
          <strong>{name}:</strong> {rel}
        </div>
      ))}
    </FieldSet>
  );
}

function PersonEditor({ model, person }) {
  const [editingPerson, setEditingPerson] = useState(person);
  const [version, setVersion] = useState(0);
  const nameRef = useRef();
  if (!editingPerson) {
    setEditingPerson(new Person({ collapsed: true }));
    return;
  }
  function onCreate() {
    if (!editingPerson.name) {
      nameRef.current.focus();
      return;
    }
    model.domain.addPerson(editingPerson);
    setEditingPerson(new Person({ collapsed: true }));
  }
  function onInput(fieldName, e) {
    editingPerson[fieldName] = e.target.value;
    if (editingPerson.sim) {
      editingPerson.sim.updated();
    } else {
      setVersion(version + 1);
    }
  }
  function onDelete() {
    if (window.confirm("Are you sure you want to delete this person?")) {
      model.domain.removePerson(editingPerson);
    }
  }
  return (
    <FieldSet
      legend={editingPerson.name || "New person"}
      onClickLegend={
        editingPerson.sim && (() => editingPerson.toggleCollapsed())
      }
    >
      <Field>
        <span>
          Name:
          {editingPerson.sim ? (
            <span>
              {" "}
              <button onClick={onDelete}>
                <icons.Trash class="h-2 w-2" />
              </button>
            </span>
          ) : null}
        </span>
        <TextInput
          inputRef={nameRef}
          value={editingPerson.name || ""}
          placeholder="Unique name"
          onInput={onInput.bind(null, "name")}
        />
      </Field>
      {editingPerson.sim || editingPerson.name ? (
        <>
          <Field>
            Description:
            <TextArea
              value={editingPerson.description || ""}
              placeholder="Describe the person in detail."
              onInput={onInput.bind(null, "description")}
            />
          </Field>
          <Field>
            Mood:
            <TextInput
              value={editingPerson.mood || ""}
              placeholder="How does the person feel?"
              onInput={onInput.bind(null, "mood")}
            />
          </Field>
          <Field>
            Goal:
            <TextInput
              value={editingPerson.goal || ""}
              placeholder="What does the person want to accomplish?"
              onInput={onInput.bind(null, "goal")}
            />
          </Field>
          <Field>
            <span>
              Relationships: (<code>Name: Relationship</code>)
            </span>
            <TextArea
              value={editingPerson.relationshipString || ""}
              placeholder="Person's name: relationship"
              onInput={onInput.bind(null, "relationshipString")}
            />
          </Field>
          {!editingPerson.sim ? (
            <Button onClick={onCreate}>Create Person</Button>
          ) : null}
        </>
      ) : null}
    </FieldSet>
  );
}

function PeopleSimPlayer({ model }) {
  const [isStepping, setIsStepping] = useState(false);
  const [copying, setCopying] = useState(false);
  function onReset() {
    model.domain.reset();
  }
  async function onStep() {
    setIsStepping(true);
    await model.domain.step();
    setIsStepping(false);
  }
  function copyText() {
    const status = model.domain.statusUntilFrame(model.domain.frames.length);
    const text = status.fullMarkdown();
    navigator.clipboard.writeText(text);
    setCopying(true);
    setTimeout(() => setCopying(false), 1000);
  }
  const children = [];
  for (let i = 0; i < model.domain.frames.length + 1; i++) {
    children.push(
      <div class="float-right">
        <Button onClick={copyText}>
          {copying ? "Copied!" : <icons.Copy class="w-6 h-6" />}
        </Button>
      </div>
    );
    children.push(<SimulationStatus model={model} index={i} />);
    if (i < model.domain.frames.length) {
      children.push(<HR />);
      children.push(<FrameStatus model={model} index={i} />);
      children.push(<HR />);
    }
  }
  const order = model.domain.peopleOrder;
  const nextPerson = order[model.domain.frames.length % order.length];
  return (
    <div>
      {children}
      <div>
        {isStepping ? (
          <span>Running with {nextPerson}...</span>
        ) : (
          <Button onClick={onStep}>Continue action with {nextPerson}</Button>
        )}
        {!isStepping ? <Button onClick={onReset}>Reset</Button> : null}
      </div>
    </div>
  );
}

function SimulationStatus({ model, index }) {
  const status = model.domain.statusUntilFrame(index);
  if (index === 0) {
    return (
      <div>
        <Markdown text={status.prompt("*")} />
      </div>
    );
  }
  const prev = model.domain.statusUntilFrame(index - 1);
  return (
    <div>
      <Markdown text={status.promptDiff(prev)} />
    </div>
  );
}

function FrameStatus({ model, index }) {
  const frame = model.domain.frames[index];
  return (
    <div class="border-l-2 border-magenta-light pl-4">
      {frame.actions.map((action) => actionDisplays[action.actionType](action))}
    </div>
  );
}

const actionDisplays = {
  DoNothing(action) {
    return <div>Do nothing ({action.value})</div>;
  },

  SayAction(action) {
    return (
      <div>
        <strong>{action.personName}</strong> says: "{action.value}"
      </div>
    );
  },

  MoodAction(action) {
    const same =
      !action.moodSetter ||
      action.value.trim().toLowerCase() ===
        action.moodSetter.trim().toLowerCase();
    return (
      <div>
        <div>
          <strong>{action.personName}</strong> begins to feel: {action.value}
        </div>
        {!same ? <div class="pl-2">Set by: {action.moodSetter}</div> : null}
      </div>
    );
  },

  DoAction(action) {
    return (
      <div>
        <div>
          <strong>{action.personName}</strong> does: {action.value}
        </div>
        <div class="pl-2">Results in: {action.newRoomDescription}</div>
      </div>
    );
  },

  ChangeGoalAction(action) {
    return (
      <div>
        <strong>{action.personName}</strong> changes goal to: {action.value}
      </div>
    );
  },

  ChangeRelationshipAction(action) {
    return (
      <div>
        <strong>{action.personName}</strong> changes relationship with{" "}
        <strong>{action.value.personName}</strong> to:{" "}
        {action.value.relationship}
      </div>
    );
  },
};
