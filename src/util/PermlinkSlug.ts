import { EmbedBuilder } from "discord.js"
import { AvianResponsePayload } from "../handlers/Avianart"

const capitalizeFirstWord = (word) => {
	return word.charAt(0).toUpperCase() + word.slice(1)
}

const capitalizeWords = (str) => {
	try {
		// Split the string into an array of words
		let words = str.split(' ');
	
		// Capitalize the first letter of each word
		let capitalizedWords = words.map(word => {
		return word.charAt(0).toUpperCase() + word.slice(1);
		});
	
		// Join the capitalized words back into a string
		let capitalizedStr = capitalizedWords.join(' ');
	
		return capitalizedStr;
	} catch {

	}
	return str;
}


const hashToEmoji = (hash) => {
	var emotes = {
		"bigkey":       "<:BigKey:995785650563461210>",
		"key":          "<:BigKey:995785650563461210>",
        "bomb":         "<:Bomb:995785651414896680>",
        "bombos":       "<:Bombos:995809205304963092>",
        "book":         "<:Book:995785653553991690>",
        "boomerang":    "<:Boomerang:995785654204112899>",
        "boots":        "<:Boots:995785655420457001>",
        "bottle":       "<:Bottle:995785657190461500>",
        "bow":          "<:Bow:995785658171928636>",
        "bugnet":       "<:BugNet:995785658557808732>",
        "cane":         "<:Cane:995785660692713552>",
        "cape":         "<:Cape:995809484372983870>",
        "compass":      "<:Compass:995785662525608097>",
        "ether":        "<:Ether:995787334870122649>",
        "flippers":     "<:Flippers:995809582037348413>",
		"ocarina":      "<:Flute:995785665994309703>",
        "flute":        "<:Flute:995785665994309703>",
        "gloves":       "<:Gloves:995785666921238549>",
        "hammer":       "<:Hammer:995785668435398788>",
        "heart":        "<:Heart:995785669681107026>",
        "hookshot":     "<:Hookshot:995785670603841667>",
        "icerod":       "<:IceRod:995785671539163257>",
		"rod":          "<:IceRod:995785671539163257>",
        "lamp":         "<:Lamp:995785673363689582>",
        "map":          "<:Map:995809485111164938>",
        "mirror":       "<:Mirror:995785676152918148>",
        "moonpearl":    "<:MoonPearl:995785676995973160>",
		"pearl":        "<:MoonPearl:995785676995973160>",
        "mushroom":     "<:Mushroom:995809486033920040>",
        "pendant":      "<:Pendant:995809118122148000>",
        "potion":       "<:Potion:995785682133975100>",
        "powder":       "<:Powder:995786797034524702>",
        "quake":        "<:Quake:995787355267027148>",
        "shield":       "<:Shield:995785686064037888>",
        "shovel":       "<:Shovel:995785687108423771>",
        "tunic":        "<:Tunic:995785689272684565>",
	}
	let glyphs = String(hash).toLowerCase().split(", ");
	let newHash = "";
	for(let i=0;i<glyphs.length;i++)
		newHash = newHash + emotes[String(glyphs[i]).replace(/ /g,"")];
	
	return newHash + " (" + String(capitalizeWords(hash)).replace(/, /g, " / ") + ")";
}


//TODO Clean up error handling
const buildMetadataSlug = (preset: string, seed_data: AvianResponsePayload, namespace?: string) => {
    const slug = new EmbedBuilder();

    if(namespace) {
        preset = `${namespace}/${preset}`;
    }

    let raw_name = seed_data.spoiler.meta.user_notes ? seed_data.spoiler.meta.user_notes : (seed_data.spoiler.meta.seed_name ? seed_data.spoiler.meta.seed_name : "Generated Seed");
    let seed_name;
    let seed_description;
    if (raw_name.includes("||")) {
        seed_name = raw_name.split("||")[0];
        seed_description = raw_name.split("||")[1];
    } else {
        seed_name = raw_name;
        seed_description = seed_data.spoiler.meta.seed_notes ?? "Generated Seed";
    }
    try {
        slug.setTitle(seed_name);
    } catch(err) {
        slug.setTitle("Generated Seed");
    }
    
    try {
        slug.setURL(`https://avianart.games/perm/${seed_data.hash}`);
    } catch(err) {
        slug.setURL(`https://avianart.games/`);
    }
    try {
        slug.setDescription(seed_description);
    } catch(err) {

    }

    try {
        slug.addFields([{name: "Preset", value: `${preset}`, inline: false}]);
    } catch(err) {

    }

    try {
        slug.addFields([{name: "Generation", value: `**Build:** ${capitalizeWords(seed_data.spoiler.meta.version)}\n**Glitches Required:** ${capitalizeWords(seed_data.spoiler.meta.logic)}\n**Accessibility:** ${capitalizeWords(seed_data.spoiler.meta.accessibility)}\n**Hints:** ${seed_data.spoiler.meta.hints ? 'Yes' : 'No'}`, inline: true}]);
    } catch(err) {

    }

    try {
        if(seed_data.spoiler.meta.goal.includes("hunt") || seed_data.spoiler.meta.goal.includes("trinity")) {
            if(seed_data.spoiler.meta.goal.includes("triforcehunt")) {
                slug.addFields([{name: "Goal", value: `**Goal:** ${capitalizeWords(seed_data.spoiler.meta.goal)}\n**Open Tower:** ${capitalizeWords(seed_data.spoiler.meta.gt_crystals)}\n**Pieces Required:** ${capitalizeWords(seed_data.spoiler.meta.triforcegoal)}\n**Pieces Available:** ${capitalizeWords(seed_data.spoiler.meta.triforcepool)}`, inline: true}]);
            } else {
                slug.addFields([{name: "Goal", value: `**Goal:** ${capitalizeWords(seed_data.spoiler.meta.goal)}\n**Open Tower:** ${capitalizeWords(seed_data.spoiler.meta.gt_crystals)}\n**Ganon Vulnerable:** ${capitalizeWords(seed_data.spoiler.meta.ganon_crystals)}\n**Pieces Required:** ${capitalizeWords(seed_data.spoiler.meta.triforcegoal)}\n**Pieces Available:** ${capitalizeWords(seed_data.spoiler.meta.triforcepool)}`, inline: true}]);
            }
        } else {
            if(seed_data.spoiler.meta.goal.includes("pedestal")) {
                slug.addFields([{name: "Goal", value: `**Goal:** ${capitalizeWords(seed_data.spoiler.meta.goal)}\n**Open Tower:** ${capitalizeWords(seed_data.spoiler.meta.gt_crystals)}`, inline: true}]);
            } else {
                slug.addFields([{name: "Goal", value: `**Goal:** ${capitalizeWords(seed_data.spoiler.meta.goal)}\n**Open Tower:** ${capitalizeWords(seed_data.spoiler.meta.gt_crystals)}\n**Ganon Vulnerable:** ${capitalizeWords(seed_data.spoiler.meta.ganon_crystals)}`, inline: true}]);
            }
        }
    } catch(err) {

    }

    try {
        slug.addFields([{name: "Gameplay", value: `**World State:** ${capitalizeWords(seed_data.spoiler.meta.mode)}\n**Overworld Shuffle:** ${capitalizeWords(seed_data.spoiler.meta.ow_shuffle ? seed_data.spoiler.meta.ow_shuffle : 'vanilla')}\n**Entrance Shuffle:** ${capitalizeWords(seed_data.spoiler.meta.shuffle)}\n**Door Shuffle:** ${capitalizeWords(seed_data.spoiler.meta.door_type_mode)} ${(seed_data.spoiler.meta.door_type_mode == 'original') ? '' : 'Intensity ' + seed_data.spoiler.meta.intensity}\n**Boss Shuffle:** ${capitalizeWords(seed_data.spoiler.meta.boss_shuffle)}\n**Enemy Shuffle:** ${capitalizeWords(seed_data.spoiler.meta.boss_shuffle)}\n**Pot Shuffle:** ${capitalizeWords((seed_data.spoiler.meta.potshuffle ? 'legacy' : '') + seed_data.spoiler.meta.pottery)}\n**Drop Shuffle:** ${capitalizeWords(seed_data.spoiler.meta.dropshuffle)}`, inline: true}]);
    } catch(err) {

    }

    try {
        slug.addFields([{name: "Difficulty", value: `**Weapons:** ${capitalizeWords(seed_data.spoiler.meta.weapons)}\n**Item Pool:** ${capitalizeWords(seed_data.spoiler.meta.item_pool)}\n**Item Functionality:** ${capitalizeWords(seed_data.spoiler.meta.item_functionality)}\n**Enemy Damage:** ${capitalizeWords(seed_data.spoiler.meta.enemy_damage)}\n**Enemy Health:** ${capitalizeWords(seed_data.spoiler.meta.enemy_health)}`, inline: true}]);
    } catch(err) {

    }

    try {
        slug.addFields([{name: "File Select Hash", value: `${hashToEmoji(seed_data.spoiler.meta.hash)}`, inline: false}]);
    } catch(err) {

    }

    try {
        slug.addFields([{name: "Permalink", value: `https://avianart.games/perm/${seed_data.hash}`}]);
    } catch(err) {

    }

    slug.setFooter({text: "Generated", iconURL: "https://static.hiimcody1.com/alttp/Chicken.gif"});
    slug.setTimestamp(new Date(seed_data.meta.gentime * 1000));

    return slug;
}

export default buildMetadataSlug;