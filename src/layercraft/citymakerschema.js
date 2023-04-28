import { P } from "../components/common";

function relatedFaction(model, parent) {
  const allFactions = model.domain.getVariable(parent, "faction");
  const factions = model.domain.selectByNames(allFactions, parent.attributes.factions);
  if (!factions.length) {
    return [{ name: "Anyone in the city", attributes: { description: "Any citizen" } }];
  }
  return factions;
}

function relatedFactionCharacter(model, parent) {
  const allFactions = model.domain.getVariable(parent, "faction");
  const factions = model.domain.selectByNames(allFactions, parent.attributes.factions);
  if (!factions.length) {
    return [{ name: "Anyone in the city", attributes: { description: "Any citizen" } }];
  }
  const people = [];
  for (const faction of factions) {
    people.push(...model.domain.getVariable(faction, "factionMember"));
  }
  if (!people.length) {
    return [{ name: "Anyone in the city", attributes: { description: "Any citizen" } }];
  }
  return people;
}

function allPeople(model, parent) {
  const everything = model.domain.getAllObjects();
  const people = everything.filter(
    (item) => ["factionMember", "ownerOccupants", "visitors"].includes(item.type));
  return people;
}

function joiner(type, attr, model, parent) {
  let everything;
  if (type === "allPeople") {
    everything = allPeople(model, parent);
  } else {
    everything = model.domain.getAllObjects().filter(
      (item) => item.type === type
    );
  }
  let joinNames = parent.attributes[attr] || parent[attr];
  if (!Array.isArray(joinNames)) {
    joinNames = [joinNames];
  }
  const result = [];
  for (const item of everything) {
    if (joinNames.includes(item.name)) {
      result.push(item);
    }
  }
  return result;
}

export const cityMakerSchema = {
  name: "cityMaker",
  title: "City Maker",
  description: "Build a fantasy or imaginative city",
  systemPrompt: `You are an assistant helping to create an imaginary city. Give imaginative answers. Do not assume modernity.`,
  titleField: "cityName",
  fields: [
    {
      name: "cityType",
      title: "City Type",
      prompt: `A numbered list of types of historical or fantastical cities, such as these examples:

      * A medieval city during a time of plague
      * A high fantasy city with a magical university
      * An underwater city with a submarine port
      * The ancient city of Troy

      Include a wide variety of types. You may include emoji in the types:
      `,
      display: "Theme: $name",
      style: "bg-gray-100",
      choiceType: "single-choice",
    },
    {
      name: "cityPeriod",
      title: "City Period",
      prompt: `A numbered list of eras and tech levels, such as "ancient: primitive", "medieval: magical", "future: primitive post-apocalyptic", including appropriate recombinations.

      Numbered list with 10 items, each a 3-4 word description for a city of type $cityType
      `,
      display: "Era: $name",
      style: "bg-gray-100",
      choiceType: "single-choice",
    },
    {
      name: "cityName",
      title: "City Name",
      prompt: `A numbered list of interesting and exotic names for a city of type $cityType, $cityPeriod:`,
      display: "City Name: $name",
      style: "bg-gray-100",
      choiceType: "single-choice",
    },
    {
      name: "cityBackstory",
      title: "City Backstory",
      prompt: `Brainstorm a numbered list of ideas for one-sentence descriptions of the city $cityName that is $cityType, $cityPeriod. $cityBackstory|optional

      Include one or more examples describing:

      * The climate, including some extreme weather
      * What drives the economy of the city, including anything exceptional they produce
      * The geography of the city, including surprising or unusual features
      * Formative historical events
      * The technology level present in the city, with specific examples
      * The culture flavor and culture context of the city
      * The religions of the city, including any unusual or surprising beliefs
      * The architecture and building materials used, including unavailable materials
      * The social structure of the city, such as caste system or class system, unusual family structures

      Use the present tense. Include exciting and surprising facts that describe an amazing city:
      `,
      style: "bg-white",
      choiceType: "multi-choice",
    },
    {
      name: "faction",
      title: "Faction",
      prompt: `A numbered list of factions in the city $cityName that is $cityType, $cityPeriod. $cityBackstory

      Include at least one faction for each of the following categories:

      * Government and/or military
      * Religion, sect, or cults
      * Businesses, guilds, or unions
      * Schools, academies, or universities
      * Criminal gangs
      * Artistic or cultural groups, media

      Response with a JSON list like:

      [
        {
          name: "The City Guard",
          description: "The City Guard is [description]",
          shortDescription: "The City Guard is [2-3 words]",
          roles: ["guard", "sargent", "captain"],
        }
      ]
      `,
      display: "**$name**: $description. Roles: $roles",
      style: "bg-amber-100",
      choiceType: "multi-choice",
      unpack: "json",
    },
    {
      name: "factionMember",
      title: "Faction Leaders & Members",
      parent: "faction",
      prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory

      A list of 5-10 leaders and notable members of the faction $faction ($faction.description). Give each person an interesting and culturally appropriate name. Include negative attributes.

      Response with a JSON list like this:

      [
        {
          type: $faction.roles|first|first|json, // or $faction.roles|first|rest|jsonExamples
          name: "FirstName LastName",
          description: "FirstName is [description]",
          age: 30, // age in years, 16-100
        }
      ]
      `,
      coercePrompt: `In city $cityName is a $cityType, $cityPeriod. $cityBackstory

      A leaders or notable member of the faction $faction ($faction.description). Give the person an interesting and culturally appropriate name. Include negative attributes.

      Example JSON:

      {
        type: $faction.roles|first|json, // or $faction.roles|rest|jsonExamples
        name: "FirstName LastName",
        description: "FirstName is [description]",
        age: 30, // age in years, 16-100
      }

      Respond with a JSON description of another leader or member described as "$prompt"
      `,
      display: "**$name** ($type): $description<br />\nAge: $age",
      choiceType: "multi-choice",
      unpack: "json",
      showImage: true,
      uniqueName: {
        split: true,
        fields: ["factionMember", "ownerOccupants"],
      },
    },
    {
      name: "factionMemberChat",
      title: "Faction Member Chat Prompt",
      parent: "factionMember",
      prompt: `I'm making a game set in: the city $cityName is a $cityType, theme $cityPeriod. $cityBackstory

      In the city is $faction: $faction.description

      I want to create a chatbot based on this character:

      $factionMember: $factionMember.description

      In 1-2 paragraphs describe how $factionMember to someone with no other context. Emphasize how they would behave in conversation.
      `,
      display: "**Chat prompt:** $name",
      choiceType: "auto",
      unpack: "plain",
      chatName: "$factionMember.name",
      chatSystemPrompt: `You are playing the part of the character $factionMember in a city $cityName with the theme $cityPeriod

      The user is also playing a character in this world.

      $factionMember is a member of $faction ($faction.description)

      $name

      Stay in the character of $factionMember. Usually respond with 1-2 sentences.
      `,
      chat: true,
    },
    {
      name: "factionLogoImagePrompt",
      title: "Faction Logo Image Prompt",
      parent: "faction",
      prompt: `The city $cityName is a $cityType, $cityPeriod.

      Describe a numbered list of logos for the faction $faction: $faction.description

      For each logo describe the it visually in 2-3 sentences. Include the colors, shapes, and symbols. Describe the logo in a way that would be easy to draw. Use keywords. Do not put text in the logo.

      Example:
      1. A circle with a triangle inside it, the triangle is pointing up. The circle is blue and the triangle is red.
      `,
      display: "Logo `/image prompt:`<br />\nCircular logo, fantasy style: $name",
      choiceType: "single-choice",
      attachImage: true,
      showImage: true,
    },
    {
      name: "factionBackgroundImagePrompt",
      title: "Faction Background Image Prompt",
      parent: "faction",
      prompt: `The city $cityName is a $cityType, $cityPeriod.

      Describe a backdrop for the faction $faction: $faction.description

      Describe the backdrop based on the interior of a likely headquarters for the faction. Use visual keywords, describing details, colors, and tones. Use 3-4 sentences.
      `,
      display: "Backdrop `/image prompt:`<br />\nDigital art, fantasy, a building interior: $name",
      choiceType: "auto",
      unpack: "plain",
      attachImage: true,
      showImage: true,
    },
    {
      name: "factionMemberImagePrompt",
      title: "Image prompt",
      parent: "factionMember",
      prompt: `I'm making a game set in: the city $cityName is a $cityType, theme $cityPeriod. $cityBackstory

      In the the faction $faction ($faction.description) there is a person described as:

      $factionMember: $factionMember.description
      $factionMember is $factionMember.age years old and is a $factionMember.type

      Give a description of the person in the form of a picture. Give their race (such as black, mixed, Asian, white, Arab, Indian). Make note of their age and body type (such as stout, lanky, brawny, portly, sinewy, curvy). Do not mention their eyes. Focus on the visual details. Use keywords. Describe them situated some location they might work in or frequent, appropriate for a $factionMember.type. Use 3-4 sentences.
      `,
      display: "$characterImagePrompt.name $name",
      choiceType: "auto",
      unpack: "plain",
      attachImage: true,
      showImage: false,
    },
    // {
    //   name: "factionRelationships",
    //   title: "Faction Relationships",
    //   prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory

    //   The following factions are in the city:
    //   $faction|nameDescription|markdownList

    //   Give a list of relationships between the factions. Imagine new facts and events that would cause the factions to have these relationships. Create interesting conflict.

    //   Respond with a JSON list like:

    //   [
    //     {
    //       faction: $faction|first|repr|json, // or $faction|rest|jsonExamples
    //       otherFaction: $faction|rest|first|repr|json, // or $faction|jsonExamples,
    //       relationship: "friendly", // or "hostile", "neutral", "war", "ally"
    //       description: "The factions are [description]",
    //     }
    //   ]
    //   `,
    //   coercePrompt: `
    //   The city $cityName is a $cityType, $cityPeriod. $cityBackstory

    //   The following factions are in the city:
    //   $faction|markdownList

    //   Give a relationships between two factions. Include positive and negative relationships.

    //   Example JSON list:

    //   {
    //     faction: $faction|first|repr|json, // or $faction|rest|jsonExamples
    //     otherFaction: $faction|rest|first|repr|json, // or $faction|jsonExamples,
    //     relationship: "friendly", // or "hostile", "neutral", "war", "ally"
    //     description: "The factions are [description]",
    //   }

    //   Respond with a JSON description of a relationship described as "$prompt"
    //   `,
    //   display: `**$faction** ⇔ **$otherFaction**: $relationship<br />\n$description`,
    //   style: "bg-amber-200",
    //   createName: "$faction<->$otherFaction",
    //   choiceType: "multi-choice",
    //   unpack: "json",
    // },
    {
      name: "neighborhood",
      title: "Neighborhood",
      prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory

      A numbered list of city neighborhoods using "name:description"; use interesting and thematic names for each neighborhood.Include economic, cultural, and social distinctions.
      `,
      choiceType: "multi-choice",
      display: "### $name\n\n$description",
      style: "bg-lime-100",
      unpack: "$name:$description",
    },
    {
      name: "building",
      title: "Building",
      parent: "neighborhood",
      prompt: `In the city $cityName that is a $cityType, $cityPeriod. $cityBackstory

      Create a list of buildings in $neighborhood: $neighborhood.description

      Including at least a few residences.Use colorful descriptions for the buildings, giving each building a distinct personality.

      Respond with a JSON list like:

      [
        {
          name: "public toilet",
          description: "a crude public pit toilet (1-2 sentences)",
          floors: 1,
          widthInMeters: 1,
          depthInMeters: 1,
          jobTypes: ["janitor"], // anyone who works or owns this building, or who lives in this building
        }
      ]
      `,
      coercePrompt: `In the city $cityName that is $cityType, $cityPeriod. $cityBackstory

      Describe a building in $neighborhood: $neighborhood.description

      Example JSON response:

      {
        name: "public toilet",
        description: "a crude public pit toilet (1-2 sentences)",
        floors: 1,
        widthInMeters: 1,
        depthInMeters: 1,
        jobTypes: ["janitor"], // anyone who works or owns this building, or who lives in this building
      }

      Respond with a JSON description of another building described as "$prompt"
      `,
      display: `**$name**: $description<br />
      $widthInMeters×$depthInMeters, $floors floors

      Jobs: $jobTypes <br />
      Visitors types: $visitorTypes
      `,
      choiceType: "multi-choice",
      unpack: "json",
      showImage: true,
      uniqueName: {
        split: false,
        fields: ["building", "landmark"],
      },
    },
    {
      name: "ownerOccupants",
      title: "Owners, Occupants, and Caretakers",
      parent: "building",
      prompt: `The city $cityName that is $cityType, $cityPeriod. $cityBackstory

      A list of 5-10 $building.jobTypes and other inhabitants for $building ($building.description). Give each person an interesting and culturally appropriate name and a colorful background and personality. Include negative attributes.

      Respond with a JSON list like:

      [
        {
          type: $building.jobTypes|first|repr|json, // Or $building.jobTypes|rest
          name: "FirstName LastName",
          description: "[a description of the person, their profession or role, their personality, their history]",
          age: 30, // age in years, 5-100
          arrives: "8am",
          leaves: "6pm",
        }
      ]
      `,
      coercePrompt: `In $cityName is a $cityType, $cityPeriod; a $building.jobTypes and other inhabitant for $building($building.description). Give the person an interesting and culturally appropriate name. Include negative attributes.

      Example JSON response:

      {
        type: $building.jobTypes|first|repr|json, // Or $building.jobTypes|rest|jsonExamples
        name: "FirstName LastName",
        description: "a wealthy merchant",
        age: 30, // age in years, 5-100
        arrives: "8am",
        leaves: "6pm",
      }

      Respond with a JSON description of another person described as "$prompt"
      `,
      display: `**$name** ($type): $description. Present **$arrives-$leaves**<br />\nAge: $age`,
      showImage: true,
      choiceType: "multi-choice",
      unpack: "json",
      uniqueName: {
        split: true,
        fields: ["ownerOccupants", "factionMember"],
      },
    },
    {
      name: "ownerOccupantsChat",
      title: "Occupants Chat Prompt",
      parent: "ownerOccupants",
      prompt: `I'm making a game set in: the city $cityName is a $cityType, theme $cityPeriod. $cityBackstory

      In the city is a building $building: $building.description. Inside this building is $ownerOccupants, a $ownerOccupants.jobType

      I want to create a chatbot based on this character:

      $ownerOccupants: $ownerOccupants.description

      In 1-2 paragraphs describe how would act $ownerOccupants to someone with no other context. Emphasize how they would behave in conversation.
      `,
      display: "**Chat prompt:** $name",
      choiceType: "auto",
      unpack: "plain",
      chatName: "$ownerOccupants.name",
      chatSystemPrompt: `You are playing the part of the character $ownerOccupants in a city $cityName with the theme $cityPeriod

      The user is also playing a character in this world.

      $ownerOccupants is a $ownerOccupants.type in $building ($building.description) in the neighborhood $neighborhood ($neighborhood.description)

      $name

      Stay in the character of $ownerOccupants. Usually respond with 1-2 sentences.
      `,
      chat: true,
    },
    {
      name: "ownerOccupantsImagePrompt",
      title: "Image prompt",
      parent: "ownerOccupants",
      prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory

      In $building there is a person described as:

      $ownerOccupants: $ownerOccupants.description
      $ownerOccupants is $ownerOccupants.age years old.

      Give a description of the person in the form of a picture. Give their race (such as black, mixed, Asian, white, Arab, Indian). Make note of their age and body type (such as stout, lanky, brawny, portly, sinewy, curvy). Do not mention their eyes. Focus on the visual details use keywords. Describe them situated in $building doing their job $ownerOccupant.jobType. Use 3-4 sentences.
      `,
      display: "$characterImagePrompt.name $name",
      choiceType: "auto",
      unpack: "plain",
      attachImage: true,
      showImage: false,
    },
    // {
    //   name: "visitors",
    //   title: "Visitors",
    //   parent: "building",
    //   prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory

    //   A list of $building.visitorTypes who might visit $building ($building.description). Give each an interesting and culturally appropriate name and colorful background and personality. Include negative attributes.

    //   Respond with a JSON list like:

    //   [
    //     {
    //       type: $building.visitorTypes|first|repr|json, // or $building.visitorTypes|rest|jsonExamples
    //       name: "FirstName LastName",
    //       description: "FirstName comes by to buy bread from the bakery every morning",
    //       age: 30, // age in years, 5-100
    //       arrives: "7am",
    //       leaves: "8am",
    //     }
    //   ]
    //   `,
    //   coercePrompt: `In city $cityName is a $cityType, $cityPeriod. $cityBackstory

    //   A person is a $building.visitorTypes visiting $building ($building.description). Give the person an interesting and culturally appropriate name. Include negative attributes.

    //   Example JSON response:

    //   {
    //     type: $building.visitorTypes|first|repr|json, // or $building.visitorTypes|rest|jsonExamples
    //     name: "FirstName LastName",
    //     description: "FirstName comes by to buy bread from the bakery every morning",
    //     age: 30, // age in years, 5-100
    //     arrives: "7am",
    //     leaves: "8am",
    //   }

    //   Respond with a JSON description of another visitor described as "$prompt"
    //   `,
    //   display: `**$name** ($type): $description. Present **$arrives-$leaves**<br />\nAge: $age`,
    //   choiceType: "multi-choice",
    //   unpack: "json",
    // },
    {
      name: "buildingImagePrompt",
      title: "Image prompt",
      parent: "building",
      prompt: `The city $cityName is a $cityType, theme $cityPeriod. $cityBackstory

      In $neighborhood there is a building described as:

      $building: $building.description
      It is \${building.widthInMeters}m ×\${building.depthInMeters}m, $building.floors floors.

      Give a description of the exterior of the building in the form of a picture. Do not assume any context. Focus on the visual details. Use 3-4 sentences.
      `,
      display: "$buildingImagePromptPrefix.name $name",
      choiceType: "auto",
      unpack: "plain",
      attachImage: true,
      showImage: false,
    },
    {
      name: "buildingInteriorImagePrompt",
      title: "Interior image prompt",
      parent: "building",
      prompt: `The city $cityName is a $cityType, theme $cityPeriod. $cityBackstory

      In $neighborhood there is a building described as:

      $building: $building.description
      It is \${building.widthInMeters}m ×\${building.depthInMeters}m, $building.floors floors.

      Give a description of the interior of the building focusing on rooms and feel. Do not assume any context. Focus on the visual details. Use 3-4 sentences.
      `,
      display: "$buildingInteriorImagePromptPrefix.name $name",
      choiceType: "auto",
      unpack: "plain",
      attachImage: true,
      showImage: true,
    },
    {
      name: "buildingSceneDescription",
      parent: "building",
      title: "Scene (narrative)",
      prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory

      In $neighborhood ($neighborhood.description) there is a building $building described as: $building.description

      These characters are in the building:
      $ownerOccupants|nameDescription|markdownList

      You are a fantasy author who is introducing these characters. Describe a scene as though the reader is entering the building for the first time. Describe the scene in 2-3 paragraphs. Use the characters' full names and descriptions to help the reader visualize the scene. Use Markdown and write each character's name as **FirstName LastName**.
      `,
      display: `## $building.name Scene

      $name
      `,
      unpack: "plain",
      choiceType: "auto",
    },
    {
      name: "landmark",
      title: "Landmark",
      parent: "neighborhood",
      prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory

      A numbered list of landmarks in $neighborhood: $neighborhood.description, formatted as "name: description"

      Include interesting and fantasical landmarks. Use colorful descriptions for the landmarks, giving each a distinct personality. Do not include buildings.
      `,
      display: `**$name**: $description`,
      choiceType: "multi-choice",
      unpack: "$name:$description",
      showImage: true,
      uniqueName: {
        split: false,
        fields: ["building", "landmark"],
      },
    },
    {
      name: "landmarkImagePrompt",
      title: "Image prompt",
      parent: "landmark",
      prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory

      In $neighborhood there is a landmark described as:

      $landmark: $landmark.description

      Give a description of an outdoor view of the landmark in the form of a picture. Do not assume any context. Focus on the visual details. Use 3-4 sentences.
      `,
      display: "$landmarkImagePromptPrefix.name $name",
      choiceType: "auto",
      unpack: "plain",
      attachImage: true,
      showImage: false,
    },
    {
      name: "neighborhoodImagePrompt",
      title: "Neighborhood image prompt",
      parent: "neighborhood",
      prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory

      There is a $neighborhood described as: $neighborhood.description

      Give a description of an outdoor panarama view of the neighborhood in the form of a picture. Do not assume any context. Focus on the visual details. Use 3-4 sentences.
      `,
      display: "$neighborhood.name image prompt:<br />\nFantasy style, $name",
      choiceType: "auto",
      unpack: "plain",
      attachImage: true,
      showImage: true,
    },
    {
      name: "protagonist",
      title: "Protagonist / Main Characters",
      prompt: `The city $cityName that is $cityType, $cityPeriod. $cityBackstory

      A list of protagonists who could be the main character of a story set in the city.Each protagonist be described in 3-4 sentences.

      Respond with a JSON list like:

        [
          {
            type: "adventurer", // or "hero", "anti-hero", "reluctant-hero", "everyman"/"everywoman", "tragic", "underdog", or something else
            name: "FirstName LastName",
            description: "[a description of the person, their profession or role, their personality, their history. Use **bold** on important keywords]",
            goal: "[a description of the person's goal, what they want to achieve, something that can drive a plot]",
            theCallToAdventure: "[the description of an event that causes the character to leave their normal life and go on an adventure]",
            history: "[the character's backstory, reason for their goal, how they got to where they are now]",
            age: 30, // age in years, 12-70
          }
        ]`,
      display: `### $name ($type)

      $description<br />
      **Goal:** $goal <br />
      **The Call to Adventure:** $theCallToAdventure <br />
      **History:** $history <br />
      **Age:** $age
      `,
      choiceType: "multi-choice",
      unpack: "json",
      style: "bg-fuchsia-50",
    },
    {
      name: "plotline",
      title: "Plotline",
      prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory

      A list of exciting plotlines that could happen in the city.Each plotline should be 2-3 sentences. Do not include specific characters.

      You may involve the factions:
      $faction.shortDescription|markdownList

      Respond with a JSON list like:

      [
        {
          name: "[Plotline title]",
          description: "[Plotline description]",
          factions: [$faction.name | first | repr | json], // A list with any of $faction|jsonExamples
        }
      ]
      `,
      display: `**$name**: $description<br />\nFactions: $factions`,
      style: "bg-fuchsia-100",
      choiceType: "multi-choice",
      unpack: "json",
    },
    {
      name: "plotCharacters",
      title: "Plot Characters",
      parent: "plotline",
      variables: {
        relatedFaction,
        relatedFactionCharacter,
      },
      prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory

      A plot is occuring in the city: $plotline.name: $plotline.description

      It involves the factions:
      $relatedFaction|nameDescription|markdownList

      Here are some possible characters to include in the plot:
      $relatedFactionCharacter|nameDescription|markdownList

      Identify characters involved in the plot.Use the characters from the list above and also invent some new characters.There should be both villains and heroes in the list.

      Respond with a JSON list like:

      [
        {
          name: $relatedFactionCharacter|first|repr|json, // Or $relatedFactionCharacter|rest|jsonExamples or someone new
          plotRelation: "[How the character relates to the plot]",
        }
      ]
      `,
      display: `**$name**: $plotRelation`,
      choiceType: "multi-choice",
      unpack: "json",
    },
    {
      name: "plotLocations",
      title: "Plot Locations",
      parent: "plotline",
      variables: {
        relatedFaction,
      },
      prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory

      A plot is occuring in the city: $plotline.name: $plotline.description

      It involves the factions:
      $relatedFaction|nameDescription|markdownList

      Here are some possible locations to include in the plot:
      \${building:anywhere|markdownList}
      \${landmark:anywhere|optional|markdownList}

      Identify locations involved in the plot. Use the locations from the list above and also invent some new locations.

      Respond with a JSON list like:

      [
        {
          name: "[Location name]",
          plotElement: "[How the location relates to the plot]",
        }
      ]
      `,
      display: `**$name**: $plotElement`,
      choiceType: "multi-choice",
      unpack: "json",
    },
    {
      name: "plotEvents",
      title: "Plot Events",
      parent: "plotline",
      prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory

      A plot is occuring in the city: $plotline.name: $plotline.description

      These characters are involved:
      \${plotCharacters|pack:name:plotRelation|markdownList}

      These locations are involved:
      \${plotLocations|pack:name:plotElement|markdownList}

      Create a list of possible events and pivotal moments in the plot.Each event should be 1 - 2 sentences.

      Respond with a JSON list like:

      [
        {
          name: "[Event name]",
          description: "[Event description]",
          characters: [$plotCharacters|first|repr|json], // A list with any of $plotCharacters|jsonExamples
          locations: [$plotLocations|first|repr|json], // A list with any of $plotLocations|jsonExamples
          time: "1 day", // a time this might occur after the start of the plot
        }
      ]
      `,
      display: `**$name**: $description <br />\nCharacters: $characters <br />\nLocations: $locations <br />\nTime: $time`,
      choiceType: "multi-choice",
      unpack: "json",
    },
    {
      name: "murderMystery",
      title: "Murder Mystery",
      variables: {
        allPeople,
      },
      prompt: `The city $cityName is a $cityType, theme $cityPeriod. $cityBackstory

      Describe several options for a murder mystery.These are the characters:
      $allPeople|nameDescription|markdownList

      These are the possible locations for events to happen in:
      \${building:anywhere|markdownList}

      Respond with a JSON list like:

      [
        {
          name: "[Murder Mystery Title]",
          victim: $allPeople.name|first|json, // Or any other $allPeople.name|rest|jsonExamples
          murderLocation: \${building:anywhere.name|first|json}, // Or any of \${building:anywhere|rest|jsonExamples}
          murderTime: "9pm", // or whatever time the murder occurred
          locations: [\${building.name:anywhere|first|json}, ...], // Or any number of \${building:anywhere|rest|jsonExamples}
          murderCircumstances: "[description of what happened]",
          involvedCharacters: [$allPeople.name|first|json, ...], // At least 5 characters, also including $allPeople.name|rest|jsonExamples
        }
      ]

--to disable:
$murderRelationships
  `,
      display: `**$name**: $murderCircumstances <br />
      **Victim:** $victim **at:** $murderLocation **others:** $involvedCharacters <br />
      **Murder location:** $murderLocation **others:** $locations
      `,
      choiceType: "multi-choice",
      unpack: "json",
    },
    {
      name: "murderRelationships",
      title: "Murder Relationships",
      parent: "murderMystery",
      variables: {
        victim: joiner.bind(null, "allPeople", "victim"),
        characters: joiner.bind(null, "allPeople", "involvedCharacters"),
      },
      prompt: `The city $cityName is a $cityType, theme $cityPeriod. $cityBackstory

      You will fill out details of a murder mystery, "$murderMystery.name". $murderMystery.victim was killed at $murderMystery.murderLocation: $murderMystery.murderCircumstances. $murderMystery.victim is described as $victim.description.

      For each of these characters:
      $characters|nameDescription|markdownList

      Indicate their relationship to the victim. Each should have a possible motive.

      Respond with JSON like:

      [
        {
          name: \${murderMystery|get:involvedCharacters|first|json}, // or one of \${murderMystery|get:involvedCharacters|rest|jsonExamples}
          motive: "[Possible motive murder $murderMystery.victim; motive only, not actual murder]",
          relationshipToVictim: "[Description of the relationship with $murderMystery.victim]",
        }
      ]
      `,
      display: `**$name:** $motive <br />\n **Relationship:** $relationshipToVictim`,
      choiceType: "multi-choice",
      unpack: "json",
    },
    {
      name: "murderMurderer",
      title: "Murderer",
      parent: "murderMystery",
      variables: {
        victim: joiner.bind(null, "allPeople", "victim"),
        characters: joiner.bind(null, "allPeople", "involvedCharacters"),
      },
      prompt: `The city $cityName is a $cityType, theme $cityPeriod. $cityBackstory

      You will fill out details of a murder mystery, "$murderMystery.name". $murderMystery.victim was killed at $murderMystery.murderLocation: $murderMystery.murderCircumstances in $murderMystery.murderLocation at $murderMystery.murderTime. $murderMystery.victim is described as $victim.description.

      These are the possible murderers:
      $murderRelationships|pack:name:motive|markdownList

      Imagine several possibilities of who is the actual killer and how it occurred.

      Respond with JSON like:

      [
        {
          // The name of the murderer:
          name: \${murderMystery|get:involvedCharacters|first|json}, // or one of \${murderMystery|get:involvedCharacters|rest|jsonExamples}
          circumstances: "[A description of the exact circumstances of the murder, which remains a mystery to everyone else]",
        }
      ]
      `,
      display: `**$name** committed the murder by: $circumstances`,
      choiceType: "single-choice",
      unpack: "json",
    },
    {
      name: "murderEvents",
      title: "Murder Events",
      parent: "murderMystery",
      variables: {
        victim: joiner.bind(null, "allPeople", "victim"),
        characters: joiner.bind(null, "allPeople", "involvedCharacters"),
      },
      prompt: `The city $cityName is a $cityType, theme $cityPeriod. $cityBackstory

      You will fill out details of a murder mystery, "$murderMystery.name". $murderMystery.victim was killed at $murderMystery.murderLocation: $murderMystery.murderCircumstances. $murderMystery.victim is described as $victim.description.

      At $murderMystery.murderTime $murderMystery.victim was killed in $murderMystery.murderLocation by $murderMurderer.name in the circumstances $murderMurderer.circumstances.

      These are the other possible murderers:
      $characters|nameDescription|markdownList

      These are possible locations:
      $murderMystery.locations|markdownList

      Describe the events leading up to the murder. Include some red herrings that might point to a different murderer.

      Respond with JSON like:

      [
        {
          name: "[Name of the event]",
          description: "[Description of the event]",
          time: "6pm", // the time of the event
          // People present at the event:
          characters: [\${murderMystery|get:involvedCharacters|first|json}, ...], // or any of \${murderMystery|get:involvedCharacters|rest|jsonExamples}
          location: \${murderMystery|get:locations|first|json}, // or one of \$murderMystery|get:locations|rest|jsonExamples}
        }
      ]
      `,
      display: `### $name

      At **$time** in **$location** with $characters present: <br />
      $description
      `,
      choiceType: "multi-choice",
      unpack: "json",
    },
    {
      name: "murderKnowledge",
      title: "Murder Knowledge",
      parent: "murderMystery",
      variables: {
        victim: joiner.bind(null, "allPeople", "victim"),
        characters: joiner.bind(null, "allPeople", "involvedCharacters"),
        allPeople,
      },
      prompt: `The city $cityName is a $cityType, theme $cityPeriod. $cityBackstory

      You will fill out details of a murder mystery, "$murderMystery.name". $murderMystery.victim was killed at $murderMystery.murderLocation: $murderMystery.murderCircumstances. $murderMystery.victim is described as $victim.description.

      Here are some important relationships:
      \${murderRelationships|pack:name:motive:relationshipToVictim|markdownList }

      And some important events:
      \${murderEvents|pack:description:time:characters:location|markdownList }

      For each person in this list:
      $allPeople|nameDescription|markdownList

      List their knowledge in a JSON response like:

      [
        {
          name: $allPeople.name|first|json, // or any person in the list
          knowledge: "[What the person knows about the relationships with $murderMystery.victim or any events]",
        }
      ]
      `,
      display: `**$name** knows _\${knowledge}_`,
      choiceType: "multi-choice",
      unpack: "json",
    },
    {
      name: "mysteryPlot",
      display: "Mystery Plot",
      variables: {
        allPeople,
      },
      prompt: `The city $cityName is a $cityType, theme $cityPeriod. $cityBackstory

      You are a murder mystery author and will outline a murder mystery plot.It will include some of these characters:
      $allPeople|nameDescription|markdownList

      These are the possible locations for events:
      \${building:anywhere|markdownList}

      Follow this outline for the murder description:

      1. Facts:
          - Victim: [name]
          - Murderer: [name]
          - Means of murder: [knife / cut brake lines / etc]
          - Location of murder: [a location, such as \${building:anywhere|first}]
          - Time of murder: 9pm / etc
          - Motive: [motive for the murder, 2 - 3 sentences]
          - Description: [describe the murder in detail]
      2. Events leading up to murder: [at least 5 events]
          - [Event name]
              - Location: [a location such as \${building:anywhere|rest|first}]
              - Event: [a description of the event, 2 - 3 sentences]
              - Time: 9pm / yesterday / etc
              - Witnesses: [a list of people such as \${allPeople.name|first}]
      3. Suspects [at least 5 other people who had motives]
          -[Suspect's name]
              - Motive: [motive to murder the victim, 2 - 3 sentences]
              - Relationship: [the suspect's relationship to the victim, 3-4 sentences]
      4. Other events involving the victim[at least 5 other events that serve as red herrings]
          - [Event name]
          - Location: [a location such as \${building:anywhere|rest|first}]
          - Event: [a description of the event, 2 - 3 sentences]
          - Time: 9pm / yesterday / etc
          - Witnesses: [a list of people such as \${allPeople.name|first}]

      Describe an exciting and mysterious muder.

      --to block this temporarily:
  $mysteryCoreKnowledge
    `,
      max_tokens: 2000,
      display: `# Mystery Plot

      $name
      `,
      choiceType: "single-choice",
      unpack: "plain",
    },
    {
      name: "mysteryCoreKnowledge",
      title: "Mystery Core Knowledge",
      prompt: `The city $cityName is a $cityType, theme $cityPeriod. $cityBackstory

      There is a murder mystery. It is described like this:

      $mysteryPlot

      Create a description of the plot formatted as JSON:

      [
        {
          victim: "[name]",
          murderer: "[name]",
          murderLocation: "[location name]",
          murderTime: "[time of murder]",
          murderDescription: "[how the murder happened]",
        }
      ]
      `,
      display: `**Victim:** $victim <br />
      **Murderer:** $murderer <br />
      **Location:** $murderLocation <br />
      **Time:** $murderTime <br />
      **Description:** $murderDescription
      `,
      choiceType: "auto",
      unpack: "json",
    },
    {
      name: "mysteryKnowledge",
      title: "Murder Knowledge",
      variables: {
        allPeople,
      },
      prompt: `The city $cityName is a $cityType, theme $cityPeriod. $cityBackstory

      There is a murder mystery. It is described like this:

      $mysteryPlot

      A list of characters:
      $allPeople|nameDescription|markdownList

      For each character indicate what they know.Make special note of any events the character witnessed.Imagine events and witnesses.Include all the information to understand the knowledge without any other context.Example:

      * $mysteryCoreKnowledge.murderer: knows they killed $mysteryCoreKnowledge.victim and $mysteryCoreKnowledge.murderDescription

      Include ALL context

      Respond with a list of the most relevant people first
      `,
      max_tokens: 2000,
      display: `## Murder Knowledge

      $name
      `,
      choiceType: "auto",
      unpack: "plain",
    },
    {
      name: "mapView",
      title: "Map View / Prompt",
      prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory

      It contains these neighborhoods:
      $neighborhood|nameDescription|markdownList

      Make a list of map descriptions, one for each neighborhood and then 3 for the entire city of $cityName.

      Each should describe a top-down view of a map that includes the boundaries of the city and what lies immediately outside. Describe an appropriate style of the map. Use only concrete and specific descriptions. Use 3-4 sentences each.
      `,
      display: "`/imagine prompt:`<br />\ntop-down game map of: $name",
      choiceType: "multi-choice",
      attachImage: true,
      showImage: true,
    },
    {
      name: "characterImagePrompt",
      title: "Character Image Prompt",
      defaultValue: "Full body portrait of:",
      display: "Character portrait: `/imagine prompt: ` $name ...",
      choiceType: "auto",
    },
    {
      name: "buildingImagePromptPrefix",
      title: "Building Image Prompt",
      defaultValue: "Digital art street view of a building:",
      display: "Building image prompt: `/imagine prompt: ` $name ...",
      choiceType: "auto",
    },
    {
      name: "buildingInteriorImagePromptPrefix",
      title: "Building Interior Image Prompt",
      defaultValue: "Platform game level design cross section with multiple rooms, simple, naive, silhouette:",
      display: "Building interior: `/imagine prompt: ` $name ...",
      choiceType: "auto",
    },
    {
      name: "landmarkImagePromptPrefix",
      title: "Landmark Image Prompt",
      defaultValue: "Digital fantasy art of:",
      display: "Landmark image prompt: `/imagine prompt: ` $name ...",
      choiceType: "auto",
    },
    {
      name: "cityDescription",
      title: "City description (narrative)",
      prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory

      You are a fantasy author introducing the reader to this new city and world. Describe the city in 2-3 paragraphs.
      `,
      display: `## $cityName.name

      $name
      `,
      unpack: "plain",
      choiceType: "auto",
    },
    {
      name: "factionsDescription",
      title: "Factions description (narrative)",
      prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory

      In this city are the following factions:
      $faction|nameDescription|markdownList

      You are a fantasy author who is introducing these factions to the reader. Describe all the factions in 2-3 paragraphs. Format using Markdown and put each faction name in **bold**.
      `,
      display: `## $cityName.name Factions

      $name
      `,
      unpack: "plain",
      choiceType: "auto",
    },
    {
      name: "neighborhoodssDescription",
      title: "Neighborhoods description (narrative)",
      prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory

      In this city are the following neighborhoods:
      $neighborhood|nameDescription|markdownList

      You are a fantasy author who is introducing these neighborhoods to the reader. Describe all the neighborhoods in 2-3 paragraphs. Format using Markdown and put each faction name in **bold**.
      `,
      display: `## $cityName.name Neighborhoods

      $name
      `,
      unpack: "plain",
      choiceType: "auto",
    },
    {
      name: "neighboringKingdoms",
      title: "Neighboring Kingdoms",
      prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory

      Create a numbered list of 10 neighboring kingdoms, city states, countries, etc. Format each as "name:description". Describe each in 2-3 sentences.

      * Use a variety of languages and cultures
      * In the description indicate if relations are friendly, hostile, or neutral
      * Describe any economic relations, political relationships, history, important marriages, etc.
      `,
      unpack: "$name:$description",
      display: `## $name

      $description`,
      choiceType: "multi-choice",
    },
  ],
};
