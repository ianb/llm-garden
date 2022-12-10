/* eslint no-unused-vars: "off" */
import { Header } from "../components/header";
import {
  PageContainer,
  Pre,
  Card,
  P,
  Button,
  H1,
  TextArea,
  mergeProps,
} from "../components/common";
import Sidebar from "../components/sidebar";
import { useState, useEffect, useRef } from "preact/hooks";
import { markdownToElement, elementToPreact } from "../converthtml";

export function StoryView({ story }) {
  const log = [...story.queryLog];
  log.reverse();
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
        <Pre>
          {log.map((l) => (
            <LogItem log={l} />
          ))}
        </Pre>
      </Sidebar>
      <PropertyView property={story.genre} />
      <PropertyView property={story.title} />
      <PropertyView property={story.theme} />
      <PropertyView property={story.mainCharacter} />
    </PageContainer>
  );
}

function PropertyView({ property }) {
  const [editing, setEditing] = useState(false);
  const onEdit = () => setEditing(true);
  const onDone = () => setEditing(false);
  return (
    <Card class="max-w-m">
      <H1>{property.title}</H1>
      {property.value || !editing ? (
        <PropertyValue value={property.value} />
      ) : null}
      {editing ? (
        <PropertyEditor property={property} onDone={onDone} />
      ) : (
        <div class="content-center">
          <Button onClick={onEdit}>Edit</Button>
        </div>
      )}
    </Card>
  );
}

function PropertyValue({ value }) {
  if (value) {
    return <div class="p-1 m-3 bg-gray-200">{value}</div>;
  }
  return <div class="p-1 m-3 text-gray-500">(unset)</div>;
}

function PropertyEditor({ property, onDone }) {
  useEffect(() => {
    if (!property.queries.length) {
      property.launchQuery();
    }
  });
  const onKeyDown = (event) => {
    console.log("the event", event);
    if (event.key === "a" && event.ctrlKey) {
      console.log("got onAccept");
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
    property.addUserInput(val);
  }
  function onSelect(val) {
    property.value = val;
    onDone();
  }
  async function onAccept() {
    console.log("checking queries", property.queries);
    let pos = property.queries.length - 1;
    while (pos >= 0) {
      const query = property.queries[pos];
      console.log("check query", query);
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
  return (
    <div>
      <hr />
      <QueryText property={property} onSubmit={onSubmit} onSelect={onSelect} />
      <Button onClick={onDone}>Done</Button>
      {property.single ? <Button onClick={onAccept}>Accept ^A</Button> : null}
    </div>
  );
}

function QueryText({ property, onSubmit, onSelect }) {
  const [selected, setSelected] = useState(-1);
  function onClick(event) {
    onSelect(event.target.innerText);
  }
  const text = getQueryText(property);
  let [liElements, markup] = [[], null];
  if (text) {
    [liElements, markup] = parseQuery(text, onClick, selected);
  }
  const onKeyPress = (event) => {
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
    <div class="unreset">
      {markup}
      <TextArea onSubmit={onSubmit} />
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

function LogItem({ log }) {
  return (
    <div class="border-gray-200 rounded">
      <div class="bg-gray-200 p-2 text-xs">
        {log.fromCache ? "cached " : null}
        {log && log.time ? (log.time / 1000).toFixed(1) + "s" : null}
      </div>
      <Pre class="text-xs">
        {log.prompt}
        {log.response ? (
          <span class="text-red-800">{log.response}</span>
        ) : (
          <span class="text-red-300">...</span>
        )}
      </Pre>
    </div>
  );
}

function Title({ story }) {}

function Theme({ story }) {}

function MainCharacter({ story }) {}
