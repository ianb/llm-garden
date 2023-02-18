import { ModelTypeStore } from "../db";
import { GptCache } from "../gptservice/gptcache";

class PeopleSim {
  constructor(props) {
    props = props || {};
    this.gpt = new GptCache({
      storageName: "peoplesim",
      basePaths: [
        "peoplesim",
        () => this.envelope && `chat/${this.envelope.slug}`,
      ],
      logResults: true,
      defaultPromptOptions: {
        temperature: 0.8,
        max_tokens: 240,
      },
    });
    this._scenarioDescription = props.scenarioDescription || "";
    this._roomDescription = props.roomDescription || "";
    this._peopleOrderString = props.peopleOrderString || "";
    if (props.people) {
      this._people = {};
      for (const person of props.people) {
        if (!person.name) {
          console.warn("Ignoring stored person with no name", person);
          continue;
        }
        this.people[person.name] = new Person(
          Object.assign({ sim: this }, person)
        );
      }
    } else {
      this._people = {};
    }
    if (props.frames) {
      this._frames = props.frames.map((frame) => new Frame(frame));
    } else {
      this._frames = [];
    }
  }

  reset() {
    this._frames = [];
    this.updated();
  }

  toJSON() {
    return {
      scenarioDescription: this.scenarioDescription,
      roomDescription: this.roomDescription,
      frames: this.frames,
      people: Object.values(this.people),
      peopleOrderString: this.peopleOrderString,
    };
  }

  updated() {
    this.envelope.updated();
  }

  get people() {
    return this._people;
  }

  addPerson(person) {
    person.sim = this;
    if (this.people[person.name]) {
      throw new Error(`Person ${person.name} already exists`);
    }
    this.people[person.name] = person;
    this.updated();
  }

  removePerson(person) {
    console.log("deleting", person);
    if (typeof person !== "string") {
      person = person.name;
    }
    delete this.people[person];
    this.updated();
  }

  get frames() {
    return this._frames;
  }

  get scenarioDescription() {
    return this._scenarioDescription;
  }

  set scenarioDescription(value) {
    this._scenarioDescription = value;
    this.updateTitleSoon();
    this.updated();
  }

  updateTitleSoon() {
    if (this._updateTitleTimeout) {
      clearTimeout(this._updateTitleTimeout);
    }
    this._updateTitleTimeout = setTimeout(() => {
      this.updateTitle();
      this._updateTitleTimeout = null;
    }, 10000);
  }

  async updateTitle() {
    const resp = await this.gpt.getCompletion(
      `Make a three-word title to describe a simulation of this scene: ${this.scenarioDescription}\n\nTitle:`
    );
    let title = resp.text.trim();
    title = title.replace(/^"*/, "");
    title = title.replace(/[.,!?"]*$/, "");
    this.envelope.title = title.trim();
  }

  get roomDescription() {
    return this._roomDescription;
  }

  set roomDescription(value) {
    this._roomDescription = value;
    this.updated();
  }

  get peopleOrderString() {
    return this._peopleOrderString;
  }

  set peopleOrderString(value) {
    this._peopleOrderString = value;
    this.updated();
  }

  get peopleOrder() {
    let names = this.peopleOrderString;
    names = names.replace(",", " ");
    names = names.split(/\s+/);
    const result = [];
    for (const name of names) {
      let found = false;
      for (const fullName of Object.keys(this.people)) {
        if (name.toLowerCase() === fullName.toLowerCase()) {
          result.push(fullName);
          found = true;
          break;
        }
      }
      if (!found) {
        console.warn("Unknown person in name list:", name);
      }
    }
    for (const fullName of Object.keys(this.people)) {
      if (!result.includes(fullName)) {
        console.info("Adding unlisted person to name list:", fullName);
        result.push(fullName);
      }
    }
    return result;
  }

  async step() {
    const status = this.statusUntilFrame(this.frames.length);
    const frame = await status.step();
    this.frames.push(frame);
    this.updated();
  }

  statusUntilFrame(frameIndex) {
    if (frameIndex > this.frames.length) {
      throw new Error(`Frame index ${frameIndex} out of range`);
    }
    const status = new Status(this);
    for (let i = 0; i < frameIndex; i++) {
      status.updateFromFrame(this.frames[i]);
    }
    return status;
  }
}

const actions = {};
function registerAction(actionClass) {
  actions[actionClass.name] = actionClass;
}

function instantiateAction(json) {
  const actionClass = actions[json.actionType];
  if (!actionClass) {
    throw new Error(`Unknown action type ${json.actionType}`);
  }
  return new actionClass(json);
}

class Action {
  constructor(props) {
    delete props.actionType;
    Object.assign(this, props);
  }
  toJSON() {
    return Object.assign(
      {
        actionType: this.constructor.name,
      },
      this
    );
  }
  async fill() {
    return this;
  }
}

class DoNothing extends Action {
  apply(status) {}
}

registerAction(DoNothing);

class SayAction extends Action {
  apply(status) {
    status.logs.push({ text: `${this.personName} says "${this.value}"` });
  }
}

registerAction(SayAction);

class MoodAction extends Action {
  apply(status) {
    status.people[this.personName].mood = this.value;
    status.logs.push({
      person: this.personName,
      text: `${this.personName} changes mood to ${this.value}`,
    });
  }
  async fill(status) {
    if (this.value.split().length < 3) {
      return this;
    }
    const mood = status.people[this.personName].mood;
    const resp = await status.sim.gpt.getCompletion(
      `
Change mood to: ${this.value}
${this.personName}'s mood used to be ${mood}, but now can be described in 1-3 words as:
`.trim()
    );
    this.moodSetter = this.value;
    this.value = resp.text.trim();
    return this;
  }
}

registerAction(MoodAction);

class DoAction extends Action {
  apply(status) {
    status.logs.push({ text: `${this.personName} does ${this.value}` });
    status.roomDescription = this.newRoomDescription;
  }
  async fill(status) {
    const resp = await status.sim.gpt.getCompletion(
      `
The scene is: ${status.roomDescription}

${this.personName} tries to ${this.value}

The scene can now be described as:
`.trim() + "\n"
    );
    this.newRoomDescription = resp.text.trim();
    return this;
  }
}

registerAction(DoAction);

class ChangeGoalAction extends Action {
  apply(status) {
    status.people[this.personName].goal = this.value;
    status.logs.push({
      person: this.personName,
      text: `${this.personName} changes their goal to ${this.value}`,
    });
  }
}

registerAction(ChangeGoalAction);

class ChangeRelationshipAction extends Action {
  apply(status) {
    status.people[this.personName].relationships.set(
      this.value.personName,
      this.value.relationship
    );
    status.logs.push({
      person: this.personName,
      text: `${this.personName} changes their relationship with ${this.value.personName} to ${this.value.relationship}`,
    });
  }
}

registerAction(ChangeRelationshipAction);

export class Person {
  constructor(props) {
    this.sim = props.sim;
    this.name = props.name;
    this.description = props.description;
    this.goal = props.goal;
    this.mood = props.mood;
    if (props.relationships) {
      this.relationships = props.relationships;
    } else {
      this.relationshipString = props.relationshipString || "";
    }
    this.collapsed = props.collapsed || false;
  }

  toJSON() {
    return {
      name: this.name,
      description: this.description,
      goal: this.goal,
      mood: this.mood,
      collapsed: this.collapsed,
      relationshipString: this.relationshipString,
    };
  }

  copy() {
    const p = new Person(this);
    p.relationships = new Map(this.relationships);
    return p;
  }

  get relationshipString() {
    return this._relationshipString;
  }

  set relationshipString(value) {
    this._relationshipString = value;
    this.relationships = this.relationshipMapFromString(value);
  }

  toggleCollapsed() {
    this.collapsed = !this.collapsed;
    if (this.sim) {
      this.sim.updated();
    }
  }

  relationshipMapFromString(v) {
    const relationships = new Map();
    for (const line of v.split("\n")) {
      if (
        !line.trim() ||
        line.trim().startsWith("#") ||
        line.trim().startsWith("//")
      ) {
        continue;
      }
      const [name, value] = line.split(":", 2);
      if (value && value.trim()) {
        relationships.set(name.trim(), value.trim());
      }
    }
    return relationships;
  }

  async step(status) {
    const generalPrompt = status.prompt(this.name);
    const names = [];
    for (const name of Object.keys(status.people)) {
      if (name !== this.name) {
        names.push(name);
      }
    }
    const nameList = names.join(", ");
    const prompt =
      `
Predicting what ${this.name} will do next. Here's what's happened:

${generalPrompt}

${this.name} can do any or multiple of these actions:

Say: something ${this.name} says
Do: something ${this.name} does
Change mood: change mood to happy/sad/angry/etc from ${this.mood}
Change goal: new goal
Change relationship with [name]: new relationship with [name] as one of ${nameList}

Mostly "Say:" and "Do:" things instead of changing. Long dialog is OK.

What will ${this.name} do? Start each line with "Say:", "Change mood:", "Do:", "Change goal:" or "Change relationship with [name]:", or do nothing
`.trim() + "\n";
    const resp = await status.sim.gpt.getCompletion(prompt);
    const lines = resp.text.split("\n");
    const actions = [];
    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      if (/^[^:]*nothing/i.test(line)) {
        actions.push(new DoNothing({ personName: this.name, value: line }));
        continue;
      }
      if (!line.includes(":")) {
        console.warn("Cannot understand line:", line);
        actions.push(new DoNothing({ personName: this.name, value: line }));
        continue;
      }
      let [actionType, value] = line.split(":", 2);
      actionType = actionType.trim();
      value = value.trim();
      if (/say/i.test(actionType)) {
        value = value.replace(/^"+/g, "");
        value = value.replace(/"+$/g, "");
        actions.push(new SayAction({ personName: this.name, value: value }));
        continue;
      }
      if (/mood/i.test(actionType)) {
        actions.push(new MoodAction({ personName: this.name, value: value }));
        continue;
      }
      if (/do/i.test(actionType)) {
        actions.push(new DoAction({ personName: this.name, value: value }));
        continue;
      }
      if (/goal/i.test(actionType)) {
        actions.push(
          new ChangeGoalAction({ personName: this.name, value: value })
        );
        continue;
      }
      if (/relationship/i.test(actionType)) {
        let found = false;
        for (const otherPersonName of Object.keys(status.people)) {
          if (
            actionType.toLowerCase().includes(otherPersonName.toLowerCase())
          ) {
            actions.push(
              new ChangeRelationshipAction({
                personName: this.name,
                value: { personName: otherPersonName, relationship: value },
              })
            );
            found = true;
            continue;
          }
        }
        if (!found) {
          console.warn(
            "Cannot find other person's name in relationship line:",
            line
          );
          actions.push(new DoNothing({ personName: this.name, value: line }));
        }
        continue;
      }
      console.warn("Cannot parse", [actionType, line]);
      actions.push(new DoNothing({ personName: this.name, value: line }));
    }
    return actions;
  }
}

class Status {
  constructor(sim) {
    this.sim = sim;
    this.roomDescription = sim.roomDescription;
    this.people = {};
    this.time = 0;
    for (const person of Object.values(sim.people)) {
      this.people[person.name] = person.copy();
    }
    this.logs = [];
  }

  updateFromFrame(frame) {
    for (const action of frame.actions) {
      action.apply(this);
    }
    this.time++;
  }

  async step() {
    const person = this.people[this.nextPersonName];
    const personActions = await person.step(this);
    const concreteActions = [];
    for (const action of personActions) {
      concreteActions.push(await action.fill(this));
    }
    return new Frame({ actions: concreteActions });
  }

  get nextPersonName() {
    const order = this.sim.peopleOrder;
    return order[this.time % order.length];
  }

  prompt(personName) {
    const logs = this.logs
      .filter((l) => personName === "*" || !l.person || l.person === personName)
      .map((l) => `* ${l.text}`)
      .join("\n");
    const people = [];
    for (const person of Object.values(this.people)) {
      people.push(this.formatPersonDescription(person.name));
      if (personName === "*" || personName === person.name) {
        people.push(`* ${person.name}'s mood: ${person.mood}`);
        people.push(`* ${person.name}'s goal: ${person.goal}`);
        for (const [name, value] of person.relationships) {
          people.push(`* ${person.name}'s relationship with ${name}: ${value}`);
        }
      }
      people.push("");
    }
    const peopleDescription = people.join("\n");
    return `
${this.sim.scenarioDescription}

${this.roomDescription}

${peopleDescription}
${logs}
`.trim();
  }

  promptDiff(prevStatus) {
    const people = [];
    for (const person of Object.values(this.people)) {
      const prevPerson = prevStatus.people[person.name];
      let added = false;
      const addLine = (line) => {
        if (!added) {
          people.push(`\n**${person.name}**`);
          added = true;
        }
        people.push(line);
      };
      if (person.mood !== prevPerson.mood) {
        addLine(`  * mood: ${prevPerson.mood} → ${person.mood}`);
      }
      if (person.goal !== prevPerson.goal) {
        addLine(`  * goal: ${prevPerson.goal} → ${person.goal}`);
      }
      for (const [name, value] of person.relationships) {
        const prevValue = prevPerson.relationships.get(name);
        if (value !== prevValue) {
          addLine(
            `  * relationship with ${name}: ${prevValue || "none"} → ${value}`
          );
        }
      }
    }
    const peopleDescription = people.join("\n");
    return `
  ${peopleDescription}
  `.trim();
  }

  formatPersonDescription(personName) {
    const person = this.people[personName];
    if (person.description.startsWith(personName)) {
      const rest = person.description.slice(personName.length).trim();
      return `**${personName}** ${rest}`;
    }
    return `**${personName}** is ${person.description}`;
  }
}

class Frame {
  constructor(props) {
    this.actions = [];
    for (const action of props.actions || []) {
      let a = action;
      if (!(a instanceof Action)) {
        a = instantiateAction(a);
      }
      this.actions.push(a);
    }
  }

  toJSON() {
    return {
      actions: this.actions,
    };
  }
}

export const peopleDb = new ModelTypeStore("peoplesim", PeopleSim, []);
