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

      A list of leaders and notable members of the faction $faction ($faction.description). Give each person an interesting and culturally appropriate name. Include negative attributes.

      Response with a JSON list like this:

      [
        {
          type: $faction.roles|first|first|json, // or $faction.roles|first|rest|jsonExamples
          name: "FirstName LastName",
          description: "FirstName is [description]",
          age: 30, // age in years
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
        age: 30, // age in years
      }
    
      Respond with a JSON description of another leader or member described as "$prompt"
      `,
      display: "**$name** ($type): $description<br />\nAge: $age",
      choiceType: "multi-choice",
      unpack: "json",
      showImage: true,
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
      
      $name

      Stay in the character of $factionMember.
      `,
      chat: true,
    },
    {
      name: "factionMemberImagePrompt",
      title: "Image prompt",
      parent: "factionMember",
      prompt: `I'm making a game set in: the city $cityName is a $cityType, theme $cityPeriod. $cityBackstory

      In the the faction $faction ($faction.description) there is a person described as:

      $factionMember: $factionMember.description
      $factionMember is $factionMember.age years old.

      Give a description of the person in the form of a picture. Do not assume any context. Focus on the visual details. Use 3-4 sentences.
      `,
      display: "$characterImagePrompt.name $name",
      choiceType: "auto",
      unpack: "plain",
      attachImage: true,
      showImage: false,
    },
    {
      name: "factionRelationships",
      title: "Faction Relationships",
      prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory
      
      The following factions are in the city:
      $faction|nameDescription|markdownList
      
      Give a list of relationships between the factions.Include interesting and meaningful positive and negative relationships.Conflict is good.Include at least one relationship for each faction.

      Respond with a JSON list like:

      [
        {
          faction: $faction|first|repr|json, // or $faction|rest|jsonExamples
          otherFaction: $faction|rest|first|repr|json, // or $faction|jsonExamples,
          relationship: "friendly", // or "hostile", "neutral", "war", "ally"
          description: "The factions are [description]",
        }
      ]
      `,
      coercePrompt: `
      The city $cityName is a $cityType, $cityPeriod. $cityBackstory
      
      The following factions are in the city:
      $faction|markdownList
      
      Give a  relationships between two factions.Include positive and negative relationships.

      Example JSON list:

      {
        faction: $faction|first|repr|json, // or $faction|rest|jsonExamples
        otherFaction: $faction|rest|first|repr|json, // or $faction|jsonExamples,
        relationship: "friendly", // or "hostile", "neutral", "war", "ally"
        description: "The factions are [description]",
      }

      Respond with a JSON description of a relationship described as "$prompt"
      `,
      display: `**$faction** ⇔ **$otherFaction**: $relationship<br />\n$description`,
      style: "bg-amber-200",
      createName: "$faction<->$otherFaction",
      choiceType: "multi-choice",
      unpack: "json",
    },
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
          jobTypes: ["janitor"], // anyone who works or owns this building
          visitorTypes: ["homeless", "criminal", "tourist"], // anyone who visits this building
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
        jobTypes: ["janitor"], // anyone who works or owns this building
        visitorTypes: ["homeless", "criminal", "tourist"], // anyone who visits this building
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
    },
    {
      name: "ownerOccupants",
      title: "Owners, Occupants, and Caretakers",
      parent: "building",
      prompt: `The city $cityName that is $cityType, $cityPeriod. $cityBackstory

      A list of $building.jobTypes and other inhabitants for $building($building.description). Give each person an interesting and culturally appropriate name and a colorful background and personality. Include negative attributes.

      Respond with a JSON list like:

      [
        {
          type: $building.jobTypes|first|repr|json, // Or $building.jobTypes|rest
          name: "FirstName LastName",
          description: "[a description of the person, their profession or role, their personality, their history]",
          age: 30, // age in years
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
        age: 30, // age in years
        arrives: "8am",
        leaves: "6pm",
      }
      
      Respond with a JSON description of another person described as "$prompt"
      `,
      display: `**$name** ($type): $description. Present **$arrives-$leaves**<br />\nAge: $age`,
      showImage: true,
      choiceType: "multi-choice",
      unpack: "json",
    },
    {
      name: "ownerOccupantsImagePrompt",
      title: "Image prompt",
      parent: "ownerOccupants",
      prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory

      In $building there is a person described as:

      $ownerOccupants: $ownerOccupants.description
      $ownerOccupants is $ownerOccupants.age years old.

      Give a description of the person in the form of a picture. Do not assume any context. Focus on the visual details. Use 3-4 sentences.
      `,
      display: "$characterImagePrompt.name $name",
      choiceType: "auto",
      unpack: "plain",
      attachImage: true,
      showImage: false,
    },
    {
      name: "visitors",
      title: "Visitors",
      parent: "building",
      prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory

      A list of $building.visitorTypes who might visit $building ($building.description). Give each an interesting and culturally appropriate name and colorful background and personality. Include negative attributes.

      Respond with a JSON list like:

      [
        {
          type: $building.visitorTypes|first|repr|json, // or $building.visitorTypes|rest|jsonExamples
          name: "FirstName LastName",
          description: "FirstName comes by to buy bread from the bakery every morning",
          age: 30, // age in years
          arrives: "7am",
          leaves: "8am",
        }
      ]
      `,
      coercePrompt: `In city $cityName is a $cityType, $cityPeriod. $cityBackstory
      
      A person is a $building.visitorTypes visiting $building ($building.description). Give the person an interesting and culturally appropriate name. Include negative attributes.

      Example JSON response:

      {
        type: $building.visitorTypes|first|repr|json, // or $building.visitorTypes|rest|jsonExamples
        name: "FirstName LastName",
        description: "FirstName comes by to buy bread from the bakery every morning",
        age: 30, // age in years
        arrives: "7am",
        leaves: "8am",
      }
      
      Respond with a JSON description of another visitor described as "$prompt"
      `,
      display: `**$name** ($type): $description. Present **$arrives-$leaves**<br />\nAge: $age`,
      choiceType: "multi-choice",
      unpack: "json",
    },
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
      name: "landmark",
      title: "Landmark",
      parent: "neighborhood",
      prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory

      A numbered list of landmarks in $neighborhood: $neighborhood.description

      Include interesting and fantasical landmarks. Use colorful descriptions for the landmarks, giving each a distinct personality. Do not include buildings.
      `,
      display: `**$name**: $description`,
      choiceType: "multi-choice",
      unpack: "$name:$description",
    },
    {
      name: "plotline",
      title: "Plotline",
      prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory

      A list of exciting plotlines that could happen in the city. Each plotline should be 2 - 3 sentences. Do not include specific characters.

      You may involve the factions:
      $faction.shortDescription|markdownList

      Respond with a JSON list like:

      [
        {
          name: "[Plotline title]",
          description: "[Plotline description]",
          factions: [$faction.name|first|repr|json], // A list with any of $faction|jsonExamples
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

      Identify characters involved in the plot. Use the characters from the list above and also invent some new characters. There should be both villains and heroes in the list.

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

      Create a list of possible events and pivotal moments in the plot. Each event should be 1 - 2 sentences.

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
      display: `**$name**: $description<br />\nCharacters: $characters<br />\nLocations: $locations<br />\nTime: $time`,
      cohiceType: "multi-choice",
      unpack: "json",
    },
    {
      name: "mapView",
      title: "Map View / Prompt",
      prompt: `The city $cityName is a $cityType, $cityPeriod. $cityBackstory

      It contains these neighborhoods:
      $neighborhood|nameDescription|markdownList

      Make a list of map descriptions. Each should describe a top - down view of a map that includes the boundaries of the city and what lies immediately outside. Describe an appropriate style of the map. Use only concrete and specific descriptions. Use 2-3 sentences.
      `,
      display: "`/imagine prompt:` top-down game map of: $name",
      choiceType: "single-choice",
      attachImage: true,
      showImage: true,
    },
    {
      name: "characterImagePrompt",
      title: "Character Image Prompt",
      defaultValue: "Full body portrait of:",
      display: "Character portrait: `/imagine prompt:` $name ...",
      choiceType: "auto",
    },
    {
      name: "buildingImagePromptPrefix",
      title: "Building Image Prompt",
      defaultValue: "Digital art street view of a building:",
      display: "Building image: `/imagine prompt:` $name ...",
      choiceType: "auto",
    },
  ],
};
