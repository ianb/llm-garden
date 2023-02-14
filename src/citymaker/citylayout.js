/* eslint-disable no-unused-vars */
import { Header, HeaderButton } from "../components/header";
import { PageContainer } from "../components/common";
import { useEffect, useRef } from "preact/hooks";

function sizeStyle(ob, baseClass) {
  if (
    !ob.attributes ||
    !ob.attributes.widthInMeters ||
    !ob.attributes.depthInMeters
  ) {
    return null;
  }
  return `height: ${ob.attributes.depthInMeters * 4}rem; width: ${
    ob.attributes.depthInMeters * 10
  }rem;`;
}

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
    // if (event.deltaX > 1) {
    //   inner.current.style.transform = "scale(0.5)";
    // } else if (event.deltaX < -1) {
    //   inner.current.style.transform = "scale(1)";
    // }
  };
  useEffect(() => {
    const el = outer.current;
    el.addEventListener("wheel", listener);
    return () => {
      el.removeEventListener("wheel", listener);
    };
  });
  return (
    <div class="h-screen w-screen border border-red-500 p-2" ref={outer}>
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
  return (
    <>
      {model.domain.select("cityNeighborhood").map((neighborhood) => (
        <Neighborhood neighborhood={neighborhood} />
      ))}
    </>
  );
}

function Neighborhood({ neighborhood }) {
  return (
    <div class="inline-block p-2 border-black border">
      <h2>{neighborhood.name}</h2>
      {neighborhood.select("building").map((building) => (
        <Building building={building} />
      ))}
    </div>
  );
}

function Building({ building }) {
  return (
    <div
      class="inline-block p-1 border-gray-500 border"
      style={sizeStyle(building)}
    >
      <h3>{building.name}</h3>
      <div class="m-1 bg-white p-1">
        <h4 class="font-bold">People</h4>
        {building.select("person").map((person) => (
          <Person person={person} />
        ))}
      </div>
      <div class="m-1 bg-white p-1">
        <h4 class="font-bold">Rooms</h4>
        {building.select("room").map((room) => (
          <Room room={room} />
        ))}
      </div>
    </div>
  );
}

function Person({ person }) {
  return (
    <div class="inline-block w-16 h-16 bg-blue-800 text-white text-xs m-1 p-3 rounded-full text-truncate">
      <h5>{person.name}</h5>
      <p>{person.description}</p>
    </div>
  );
}

function Room({ room }) {
  return (
    <div
      class="inline-block bg-gray-200 m-1 overflow-truncate"
      style={sizeStyle(room)}
    >
      <h5 class="font-bold">{room.name}</h5>
      <p>{room.description}</p>
      <ul>
        {room.select("furniture, item").map((thing) => (
          <li class="inline-block rounded h-16 w-16 bg-amber-800 text-white rounded-lg m-1 p-1 text-xs">
            {thing.name}
          </li>
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
