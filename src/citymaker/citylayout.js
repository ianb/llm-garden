/* eslint-disable no-unused-vars */
import { Header, HeaderButton } from "../components/header";
import { PageContainer } from "../components/common";
import { useEffect, useRef } from "preact/hooks";

export function CityLayout({ model }) {
  return (
    <PageContainer>
      <Header
        title={model.title || "? City ?"}
        section="City Maker"
        sectionLink="/citymaker/"
        trackerPaths={["citymaker", `citymaker/${model.slug || "default"}`]}
        model={model}
        buttons={[
          <a href={`/citymaker/?name=${encodeURIComponent(model.slug)}`}>
            <HeaderButton>Edit</HeaderButton>
          </a>,
        ]}
      />
      <div class="p-2">
        <Zoomy>
          <World model={model} />
        </Zoomy>
      </div>
    </PageContainer>
  );
}

function Zoomy({ children }) {
  const outer = useRef();
  const inner = useRef();
  const listener = (event) => {
    if (event.deltaY > 0) {
      inner.current.style.transform = "scale(0.5)";
    } else {
      inner.current.style.transform = "scale(1)";
    }
  };
  useEffect(() => {
    const el = outer.current;
    el.addEventListener("wheel", listener);
    return () => {
      el.removeEventListener("wheel", listener);
    };
  });
  return (
    <div class="h-screen w-screen border border-red-500" ref={outer}>
      <div
        style="transform: scale(1); transition: transform 0.3s ease;"
        ref={inner}
      >
        {children}
      </div>
    </div>
  );
}

function World({ model }) {
  console.log("ns", model.domain.select("cityNeighborhood"));
  return (
    <div>
      {model.domain.select("cityNeighborhood").map((neighborhood) => (
        <Neighborhood neighborhood={neighborhood} />
      ))}
    </div>
  );
}

function Neighborhood({ neighborhood }) {
  return (
    <div>
      <h2>{neighborhood.name}</h2>
      {neighborhood.select("building").map((building) => (
        <Building building={building} />
      ))}
    </div>
  );
}

function Building({ building }) {
  return (
    <div>
      <h3>{building.name}</h3>
      <div>
        <h4>People</h4>
        {building.select("person").map((person) => (
          <Person person={person} />
        ))}
      </div>
      <div>
        <h4>Rooms</h4>
        {building.select("room").map((room) => (
          <Room room={room} />
        ))}
      </div>
    </div>
  );
}

function Person({ person }) {
  return (
    <div>
      <h5>{person.name}</h5>
      <p>{person.description}</p>
    </div>
  );
}

function Room({ room }) {
  return (
    <div>
      <h5>{room.name}</h5>
      <p>{room.description}</p>
      <ul>
        {room.select("furniture, item").map((thing) => (
          <li>{thing.name}</li>
        ))}
      </ul>
    </div>
  );
}

const personImage = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE svg>
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
</svg>
`;

const personImageUrl =
  "data:image/svg+xml;utf8," + encodeURIComponent(personImage);
