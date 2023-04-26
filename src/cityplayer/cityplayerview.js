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
import { Page, TextBox, SiteImage } from "./citycomponents";
import { linkMarkdownObjects } from "./linkmarkdown";

const hashSignal = signal(window.location.hash);
window.addEventListener("hashchange", () => {
  hashSignal.value = window.location.hash;
});

export const CityPlayerView = ({ model }) => {
  const [showSideBar, setShowSideBar] = useState(false);
  window.model = model;
  model.updateVersion.value;
  useEffect(() => {
    if (model.domain.player) {
      model.domain.ensurePlayerLocation();
    }
  }, [model.domain.player]);
  if (!model.domain.player) {
    return <CreatePlayer model={model} />;
  }
  if (model.domain.player && !model.domain.player.inventory.length) {
    return <CreateInventory model={model} />;
  }
  if (model.domain.player && !model.domain.player.locationName) {
    return <div>Placing...</div>;
  }
  return <PlayLoop model={model} />;
};

const CreatePlayer = ({ model }) => {
  if (model.domain.playerOptionsFilledOut) {
    return <CreateFullPlayer model={model} />
  }
  useEffect(() => {
    model.domain.ensurePlayerOptions();
  }, []);
  function onSubmit(el) {
    onChoose(el.value);
  }
  function onChoose(option) {
    model.domain.createPlayerOptionsFromPrompt(option);
  }
  function onReroll() {
    model.domain.ensurePlayerOptions(true);
  }
  return (
    <Page title="Create your player inspiration">
      <Sidebar>
        <QueryLog gptcache={model.domain.gpt} />
      </Sidebar>
      <div class="p-2">
        <h1 class="text-2xl font-semibold">Describe your player</h1>
        <TextArea onSubmit={onSubmit} placeholder="Describe your player" />
        <h2 class="text-xl font-semibold">Or choose an option...</h2>
        <ol class="ml-8 list-decimal">
          {model.domain.playerOptions && model.domain.playerOptions.map((option) => (
            <li class="cursor-default mb-2 pl-4 hover:bg-gray-300" onClick={() => onChoose(option)}>{option}</li>
          ))}
          {model.domain.playerOptions && model.domain.playerOptions.length === 0 && (
            <li class="cursor-default mb-2 pl-4">Loading...</li>
          )}
          <li class="cursor-default mb-2 pl-4 hover:bg-gray-300" onClick={onReroll}>Reroll</li>
        </ol>
      </div>
    </Page>
  );
};

const CreateFullPlayer = ({ model }) => {
  const [skills, setSkills] = useState({});
  const [mission, setMission] = useState(null);
  function onRestart() {
    model.domain.playerOptionsFilledOut = null;
    model.updated();
  }
  function onReroll() {
    model.domain.createPlayerOptionsFromPrompt(null, true);
  }
  function onSelect(mission) {
    setMission(mission);
  }
  function onRemoveMission() {
    setMission(null);
  }
  function onChooseSkill(skill, level) {
    setSkills(Object.assign({}, skills, { [skill]: level }));
  }
  function onDone() {
    model.domain.createPlayerFromMission(mission, skills);
  }
  function onDeleteSkill(skill) {
    const newSkills = Object.assign({}, skills);
    delete newSkills[skill];
    setSkills(newSkills);
  }
  function onChangeLevel(skill) {
    const level = skills[skill];
    const LEVELS = ["novice", "skilled", "expert", "master", "legendary"];
    const index = LEVELS.indexOf(level);
    const newLevel = LEVELS[(index + 1) % LEVELS.length];
    const newSkills = Object.assign({}, skills, { [skill]: newLevel });
    setSkills(newSkills);
  }
  return (
    <Page title="Create your player">
      <Sidebar>
        <QueryLog gptcache={model.domain.gpt} />
      </Sidebar>
      <div class="p-2">
        <h1 class="text-2xl font-semibold">Choose your player</h1>
        {model.domain.playerOptionsFilledOut.name ?
          <>
            <div>
              <strong>Name:</strong> {model.domain.playerOptionsFilledOut.name}
            </div>
            <div>
              <strong>Appearance:</strong> {model.domain.playerOptionsFilledOut.appearance}
            </div>
            <div>
              <Markdown text={`**History:** ${model.domain.playerOptionsFilledOut.history}`} />
            </div>
            <div>
              <strong>Social Status:</strong> {model.domain.playerOptionsFilledOut.socialStatus}
            </div>
            <div>
              {mission ? (
                <div class="hover:bg-gray-300 cursor-pointer" onClick={onRemoveMission}>
                  <div>
                    <strong>The Call to Adventure:</strong> {mission.callToAdventure}
                  </div>
                  <div>
                    <strong>Mission:</strong> {mission.mission}
                  </div>
                </div>
              ) :
                <ol class="ml-8 list-decimal">
                  {model.domain.playerOptionsFilledOut.missionOptions.map((option) => (
                    <li class="cursor-default mb-2 pl-4 hover:bg-gray-300" onClick={() => onSelect(option)}>
                      <div>
                        <strong>The Call to Adventure:</strong> {option.callToAdventure}
                      </div>
                      <div>
                        <strong>Mission:</strong> {option.mission}
                      </div>
                    </li>
                  ))}
                  <li class="cursor-default mb-2 pl-4 hover:bg-gray-300" onClick={onReroll}>Reroll</li>
                  <li class="cursor-default mb-2 pl-4 hover:bg-gray-300" onClick={onRestart}>Restart</li>
                </ol>
              }
            </div>
            <div>
              <strong>Skills:</strong>
              <ol class="ml-8 list-decimal">
                {Object.entries(model.domain.playerOptionsFilledOut.skillOptions).filter(([skill, level]) => !skills[skill]).map(([skill, level]) => (
                  <li class="cursor-default mb-2 pl-4 hover:bg-gray-300" onClick={() => onChooseSkill(skill, level)}>
                    {skill}: {level}
                  </li>))}
                {mission ?
                  <li class="cursor-default mb-2 pl-4 hover:bg-gray-300" onClick={onDone}>Done</li> : null}
              </ol>
              {Object.keys(skills).length > 0 ? (
                <dl class="">
                  {Object.entries(skills).map(([skill, level]) => (
                    <>
                      <dt class="font-bold pr-3 cursor-pointer hover:bg-gray-300" onClick={() => onDeleteSkill(skill)}>{skill}</dt>
                      <dd class="ml-4 mb-2 cursor-pointer hover:bg-gray-300" onClick={() => onChangeLevel(skill)}>{level}</dd>
                    </>))}
                </dl>
              ) : <div>No skills</div>}
            </div>
          </>
          : <div>Loading... {model.domain.playerOptionsInspiration}</div>}
      </div>
    </Page>
  );
};

const CreateInventory = ({ model }) => {
  const [stagingInventory, setStagingInventory] = useState([]);
  useEffect(() => {
    model.domain.ensurePlayerInventoryOptions();
  }, []);
  function onAddInventory(option) {
    setStagingInventory(stagingInventory.concat([option]));
  }
  function onRoll() {
    model.domain.ensurePlayerInventoryOptions(true);
  }
  function onDone() {
    model.domain.player.inventory = (model.domain.player.inventory || []).concat(stagingInventory);
    model.updated();
  }
  function onRemoveInventory(option) {
    setStagingInventory(stagingInventory.filter((o) => o !== option));
  }
  let options = [];
  if (model.domain.playerInventoryOptions) {
    options = model.domain.playerInventoryOptions.filter(
      (option) => !stagingInventory.includes(option)
    );
  }
  return (
    <Page title="Give inventory">
      <Sidebar>
        <QueryLog gptcache={model.domain.gpt} />
      </Sidebar>
      <div class="p-2">
        <h1 class="text-2xl font-semibold">Available inventory:</h1>
        <ol class="ml-8 list-decimal">
          {options.map((option) => (
            <li class="cursor-default mb-2 pl-4 hover:bg-gray-300" onClick={() => onAddInventory(option)}>{option}</li>
          ))}
          {!model.domain.playerInventoryOptions || model.domain.playerInventoryOptions.length === 0 && (
            <li class="cursor-default mb-2 pl-4">Loading...</li>
          )}
          <li class="cursor-default mb-2 pl-4 hover:bg-gray-300" onClick={onRoll}>Reroll...</li>
          <li class="cursor-default mb-2 pl-4 hover:bg-gray-300" onClick={onDone}>Done</li>
        </ol>
        <h2 class="text-xl font-semibold">Inventory:</h2>
        <ol class="ml-8 list-decimal">
          {stagingInventory.map((option) => (
            <li class="cursor-default mb-2 pl-4 hover:bg-gray-300" onClick={() => onRemoveInventory(option)}>{option}</li>
          ))}
          {model.domain.player.inventory.length === 0 && (
            <li class="cursor-default mb-2 pl-4">None</li>
          )}
        </ol>
      </div>
    </Page>
  );
}

const PlayLoop = ({ model }) => {
  const player = model.domain.player;
  const loc = model.domain.player.location;
  let imageUrl;
  let people;
  if (loc.type === "building") {
    const items = model.domain.childrenByType(loc, "buildingImagePrompt");
    if (items && items.length) {
      imageUrl = items[0].imageUrl;
    }
    people = model.domain.childrenByType(loc, "ownerOccupants");
  } else if (loc.type === "faction") {
    const items = model.domain.childrenByType(loc, "factionBackgroundImagePrompt");
    if (items && items.length) {
      imageUrl = items[0].imageUrl;
    }
    people = model.domain.childrenByType(loc, "factionMember");
  }
  let children = [];
  let title;
  let saturated = false;
  if (player.chattingName) {
    title = `Chatting with ${player.chattingName}`;
    saturated = true;
    const person = people.find((p) => p.name === player.chattingName);
    children.push(
      <ChattingWith model={model} person={person} />
    );
  } else {
    title = loc.name;
    children.push(
      <Location model={model} location={loc} people={people} />
    );
  }
  return (
    <Page title={title} background={imageUrl} saturated={saturated}>
      <Sidebar>
        <Inventory model={model} />
        <div>
          <Button onClick={() => model.domain.ensurePlayerLocation(true)}>Jump to another location</Button>
        </div>
        <QueryLog gptcache={model.domain.gpt} />
      </Sidebar>
      <div class="p-2">
        {children}
      </div>
    </Page>
  );
};

const ChattingWith = ({ model, person }) => {
  const chatRef = useRef();
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  });
  function onSubmit(el) {
    const text = el.value.trim();
    el.value = "";
    if (text.toLowerCase() === "undo") {
      model.domain.undoPlayerChat();
    } else if (text.toLowerCase() === "redo" || text.toLowerCase() === "reroll") {
      model.domain.rerollPlayerChat();
    } else if (text.toLowerCase() === "restart" || text.toLowerCase() === "clear") {
      model.domain.clearPlayerChat();
    } else if (text.toLowerCase() === "bye" || text.toLowerCase() === "goodbye") {
      model.domain.player.chattingName = null;
      model.domain.player.updated();
    } else {
      model.domain.playerChat(text);
    }
  }
  let imageUrl;
  const imagePrompt = model.domain.childrenByType(person, "ownerOccupantsImagePrompt");
  if (imagePrompt && imagePrompt.length) {
    imageUrl = imagePrompt[0].imageUrl;
  }
  return (
    <>
      <TextBox ref={chatRef} class="w-full lg:w-full max-h-64 overflow-y-scroll">
        <ChatLog model={model} person={person} />
      </TextBox>
      <TextBox class="w-full lg:w-full">
        <TextInput autoFocus="1" onSubmit={onSubmit} />
      </TextBox>
      {imageUrl ?
        <SiteImage src={imageUrl} class="float-right" /> : null}
      <TextBox>
        <Markdown text={person.attributes.description} />
      </TextBox>
    </>
  );
}

const ChatLog = ({ model, person }) => {
  const chat = person.chatHistory || [];
  const ref = useRef();
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({
        block: "end",
        inline: "nearest",
        behavior: "smooth"
      });
    }
  }, [ref.current]);
  if (!chat.length) {
    return <div class="bg-gray-100 px-4 py-2 rounded-lg mb-2 shadow-xl">...</div>;
  }
  return <>
    {chat.map((item, i) => {
      let c = (item.role === "user"
        ? "bg-blue-500 text-white px-4 py-2 rounded-lg mb-2 mr-10 shadow-xl"
        : "bg-gray-100 px-4 py-2 rounded-lg ml-10 mb-2 shadow-xl");
      let aRef = i === chat.length - 1 ? ref : null;
      return <div ref={aRef} class={c}>{item.content}</div>
    })}
  </>;
};

const Location = ({ model, location, people }) => {
  const descText = model.domain.player.locationScene;
  function onDo(element) {
    const text = element.value.trim();
    element.value = "";
    if (text.toLowerCase() === "undo") {
      model.domain.undoPlayerAction();
    } else if (text.toLowerCase() === "redo" || text.toLowerCase() === "reroll") {
      model.domain.rerollPlayerAction();
    } else if (text.toLowerCase() === "restart" || text.toLowerCase() === "clear") {
      model.domain.clearPlayerAction();
    } else {
      model.domain.playerDoes(text);
    }
  }
  const actions = (model.domain.player.location.actions || []).slice(-3);
  actions.reverse();
  const markdownText = linkMarkdownObjects(
    descText,
    people,
    "chat"
  );
  function onClickPerson(event) {
    if (event.target.tagName === "A") {
      event.preventDefault();
      event.stopPropagation();
      const u = new URL(event.target.href);
      const name = u.pathname.split("/").pop();
      model.domain.player.chattingName = decodeURIComponent(name);
      model.domain.player.updated();
    }
  }
  return (
    <div>
      <TextBox class="w-full lg:w-full">
        <TextInput onSubmit={onDo} placeholder="What do you do?"
          autoFocus="1" />
      </TextBox>
      {actions.length ?
        <TextBox class="w-full lg:w-full">
          {actions.map((action) => (
            <LocationAction model={model} action={action} />
          ))}
        </TextBox>
        : null}
      <TextBox class="w-2/3 lg:w-2/3">
        <Markdown text={markdownText} onClick={onClickPerson} />
      </TextBox>
    </div>
  )
}

const LocationAction = ({ model, action }) => {
  if (action.state === "pending") {
    return <div class="font-bold italic">{action.action} ...</div>;
  }
  if (action.state === "failed") {
    return <>
      <div class="font-bold text-red-800 italic">{action.action}</div>
      <div class="pl-8 border-l-2 border-red-400">
        <pre class="whitespace-pre-wrap text-xs">{action.responseText}</pre>
      </div>
    </>;
  }
  const notes = [];
  if (!action.result.isPossible) {
    notes.push(<div class="bg-magenta text-white rounded-sm px-1 text-sm mx-1 inline-block">Not possible</div>);
  }
  if (!action.result.isSociallyAcceptable) {
    notes.push(<div class="bg-magenta text-white rounded-sm px-1 text-sm mx-1 inline-block">Not socially acceptable</div>);
  }
  let inventory;
  if ((action.result.inventoryAdditions && action.result.inventoryAdditions.length) || (action.result.inventoryRemovals && action.result.inventoryRemovals.length)) {
    inventory = [<span>Inventory:</span>];
    for (const item of action.result.inventoryAdditions || []) {
      inventory.push(<strong class="bg-green-800 text-white rounded-sm px-1 m-2">{item}</strong>);
    }
    for (const item of action.result.inventoryRemovals || []) {
      inventory.push(<strong class="bg-red-800 text-white rounded-sm px-1 m-2">{item}</strong>);
    }
    inventory = <div>{inventory}</div>;
  }
  const attitudes = []
  for (const name in action.result.attitudeChanges) {
    const change = action.result.attitudeChanges[name];
    attitudes.push(<div>
      <strong>{name}:</strong> {change}
    </div>);
  }
  let gptNotes;
  if (action.result.gptNotes) {
    gptNotes = <div class="text-sm text-blue-900"><Markdown text={action.result.gptNotes} /></div>;
  }
  return (
    <>
      <div class="font-bold italic">{action.action}</div>
      <div class="pl-8 border-l-2 border-gray-400">
        {notes.length ? <div>{notes}</div> : null}
        <div>{action.result.effect}</div>
        <div class="text-sm">
          {inventory}
          {attitudes}
          {gptNotes}
        </div>
      </div>
    </>
  );
};

const Inventory = ({ model }) => {
  const [collapsed, setCollapsed] = useState(true);
  const inventory = model.domain.player.inventory;
  return (
    <div class="p-2 text-sm">
      <h3 class="font-semibold">
        Inventory ({inventory.length}):
        <button class="ml-2 text-xs" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <icons.PlusCircle class="h-2 w-2" /> : <icons.MinusCircle class="h-2 w-2" />}
        </button>
      </h3>
      {!collapsed &&
        <ol class="ml-8 list-decimal">
          {inventory.map((item) => (
            <li class="cursor-default pl-4">{item}</li>
          ))}
          {inventory.length === 0 && (
            <li class="cursor-default pl-4">None</li>
          )}
        </ol>
      }
    </div>
  );
}
