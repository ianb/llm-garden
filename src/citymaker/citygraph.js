/* eslint-disable no-unused-vars */
import { Header, HeaderButton } from "../components/header";
import { PageContainer } from "../components/common";
import { Cytoscape } from "./preactcytoscape";

export function CityGraph({ model }) {
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
        <Graph model={model} />
      </div>
    </PageContainer>
  );
}

function Graph({ model }) {
  const elements = { nodes: [], edges: [] };
  for (const neighborhood of model.domain.topLevelProperties.cityNeighborhoods
    .children) {
    elements.nodes.push({
      classes: ["neighborhood"],
      data: {
        id: neighborhood.id,
        name: neighborhood.name,
        description: neighborhood.attributes.description,
      },
    });
    for (const buildings of neighborhood.children || []) {
      for (const building of buildings.children || []) {
        elements.nodes.push({
          classes: ["building"],
          data: {
            id: building.id,
            name: building.name,
            description: `${building.name}\n${building.attributes.description}`,
            floors: building.attributes.floors,
            widthInMeters: building.attributes.widthInMeters,
            depthInMeters: building.attributes.depthInMeters,
            parent: neighborhood.id,
          },
        });
        let peopleCount = 0;
        let roomCount = 0;
        for (const childGroup of building.children) {
          if (
            childGroup.typeName === "ownersOccupants" ||
            childGroup.typeName === "visitors"
          ) {
            for (const person of childGroup.children || []) {
              elements.nodes.push({
                classes: ["person", childGroup.typeName],
                data: {
                  id: person.id,
                  name: person.name,
                  description: person.attributes.description,
                  parent: `people-${building.id}`,
                },
              });
              peopleCount++;
            }
          } else if (childGroup.typeName === "rooms") {
            for (const room of childGroup.children || []) {
              elements.nodes.push({
                classes: ["room"],
                data: {
                  id: room.id,
                  name: room.name,
                  description: room.attributes.description,
                  parent: `rooms-${building.id}`,
                  widthInMeters: room.attributes.widthInMeters,
                  width: room.attributes.widthInMeters * 10,
                  depthInMeters: room.attributes.depthInMeters,
                  depth: room.attributes.depthInMeters * 10,
                },
              });
              roomCount++;
              for (const itemContainer of room.children || []) {
                for (const item of itemContainer.children || []) {
                  elements.nodes.push({
                    classes: ["item", item.typeName],
                    data: {
                      id: item.id,
                      name: item.name,
                      description: item.attributes.description,
                      parent: room.id,
                    },
                  });
                }
              }
            }
          }
        }
        if (peopleCount > 0) {
          elements.nodes.push({
            classes: ["people"],
            data: {
              id: `people-${building.id}`,
              name: `People (${peopleCount})`,
              parent: building.id,
            },
          });
        }
        if (roomCount > 0) {
          elements.nodes.push({
            classes: ["rooms"],
            data: {
              id: `rooms-${building.id}`,
              name: `Rooms (${roomCount})`,
              parent: building.id,
            },
          });
        }
      }
    }
  }
  const layout = {
    name: "cose-bilkent",
    // name: "dagre",
    nodeSep: 25,
    edgeSep: 25,
    rankSep: 25,
    padding: 100,
    spacingFactor: 2,
    // animate: false,
    // idealEdgeLength: 200,
    // nodeDimensionsIncludeLabels: true,
    // avoidOverlap: true,
    // padding: 100,
    // componentSpacing: 100,
    // nodeOverlap: 20,
    // nestingFactor: 2,
    // tilingPaddingVertical: 20,
    // tilingPaddingHorizontal: 20,
    // fit: true,
  };

  const style = `
  node {
    padding: 100;
  }

  .neighborhood {
    label: data(name);
  }

  .neighborhood:selected .building, .building:selected, $.building *:selected {
    label: data(name);
  }

  .building:selected .rooms, .rooms:selected, $.rooms *:selected,
  .building:selected .people, .people:selected, $.people *:selected {
    label: data(name);
  }

  .room {
    label: data(name);
    shape: rectangle;
    width: data(width);
    height: data(depth);
    visibility: hidden;
  }
  .building:selected .room, .room:selected, .rooms:selected .room {
    visibility: visible;
    label: data(name);
  }

  .person {
    label: data(name);
    background-image: /assets/icons/person.png;
    background-fit: cover;
    visibility: hidden;
  }
  .building:selected .person, .people:selected .person, .person:selected {
    visibility: visible;
    label: data(name);
  }

  .neighborhood:childless, .building:childless {
    background-color: #900;
    shape: rectangle;
  }
  `;
  console.log("cyto", elements);
  return <Cytoscape elements={elements} layout={layout} style={style} />;
}

function removeUndefined(obj) {
  const newObj = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      newObj[key] = obj[key];
    }
  }
  return newObj;
}

const personImage = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE svg>
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
</svg>
`;

const personImageUrl =
  "data:image/svg+xml;utf8," + encodeURIComponent(personImage);
