import { ChatInputCommandInteraction, CacheType, SlashCommandBuilder, Application, ApplicationCommandOptionWithAutocompleteMixin, ButtonBuilder, ActionRowBuilder, CategoryChannel, ButtonStyle, Guild, GuildMember, MessagePayload, EmbedBuilder } from "discord.js";
import { SlashCommand } from "../../types";
import axios from 'axios';
import { wrapper } from "axios-cookiejar-support";
import * as tough from "tough-cookie";

import * as ALTTPRBingo from "../../../ALTTPRBingo.json";


/*
    Temporary Fake Data
*/
const goals = `[
    {"name": "Bottle %"},
    {"name": "Rush Catfish"},
    {"name": "One potion of each color"},
    {"name": "Bomb validation chest"},
    {"name": "Mirror shield"},
    {"name": "Butter sword"},
    {"name": "Buy an item from each shop"},
    {"name": "Red mail"},
    {"name": "Kiss Gary"},
    {"name": "Blind-pull Pedestal"},
    {"name": "Get Wallmastered in 2 dungeons"},
    {"name": "666 Rupees"},
    {"name": "69 Rupees"},
    {"name": "Get Bumper Ledge item"},
    {"name": "Aga 1"},
    {"name": "Complete 2 Tile Rooms"},
    {"name": "Bonk 40 times in any dungeon room"},
    {"name": "Full clear Hera with no Herapot"},
    {"name": "Kiss Sanc Priest"},
    {"name": "Rush Uncle check"},
    {"name": "Free the chicken in the back of Kak tavern"},
    {"name": "Bomb Magic Bat"},
    {"name": "Fill 3 bottles with bees"},
    {"name": "Finish with 420 rupees"},
    {"name": "Get both boomerangs"}
   ]`;

const createBoard = (groups: any) => {
    let required = [];
    let optional = [];

    for (const group of groups.Goals) {
        const min = group.Min;
        const max = group.Max;
        
        if (max > 0) {
            const choices = group.Choices
                .sort(() => 0.5 - Math.random())
                .slice(0, max);
                
            if (min > 0) {
                required.push(...choices.slice(0, min));
            }
            optional.push(...choices.slice(min));
        }
    }

    optional.sort(() => 0.5 - Math.random());
    
    while (required.length < groups.MinBricks) {
        required.push(optional.pop());
    }

    const bricks = required.map(part => 
        Array.isArray(part) ? 
            part[Math.floor(Math.random() * part.length)] : 
            part
    );

    const output = bricks.map(brick => ({ name: brick }));
    return JSON.stringify(output.sort(() => 0.5 - Math.random()));
}

const createBingoRoom = async (name: string, passphrase: string, category: string) => {
    const url = 'https://bingosync.com/';

    const jar = new tough.CookieJar();
    const client = wrapper(axios.create({jar}));

    const response = await client.get(url, {
        withCredentials: true // Ensure cookies are stored
    });

    // Step 2: Load the HTML and extract the CSRF token
    // Step 2: Extract the CSRF token from the cookies
    const cookies = jar.getCookiesSync(url);
    const csrfToken = response.headers['set-cookie'][0].split(";")[0];
    //const csrfTokenCookie = cookies.find(cookie => cookie.key === 'csrftoken');
    //const csrfToken = csrfTokenCookie ? csrfTokenCookie.value : null;

    const tokenMatch = response.data.match(/<input type="hidden" name="csrfmiddlewaretoken" value="(.+?)"/);
    const csrfmiddlewaretoken = tokenMatch ? tokenMatch[1] : null;

    if (!csrfToken || !csrfmiddlewaretoken) {
        console.log(csrfToken, csrfmiddlewaretoken);
        throw new Error('CSRF token not found in cookies.');
    }

    // Step 3: Prepare the data for the POST request
    const postData = {
        // Your data here, e.g.,
        room_name: name,
        passphrase: passphrase,
        nickname: "PedChicken",
        game_type: "18",
        variant_type: "18",
        custom_json: createBoard(ALTTPRBingo),
        lockout_mode: "0",
        seed: "",
        is_spectator: "on",
        hide_card: "on",
        csrfmiddlewaretoken: csrfmiddlewaretoken // Include the CSRF token
    };

    // Step 4: Make the POST request with cookies and CSRF token
    const postResponse = await axios.post(url, new URLSearchParams(postData), {
        headers: {
            'Cookie': csrfToken,
            'Content-Type': 'application/x-www-form-urlencoded' // Adjust based on the server requirements
        }
    });

    return postResponse.request._redirectable._currentUrl;
}

const command: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("bingo")
        .addStringOption((option) =>
            option.setName("name")
                .setDescription("The name of your Bingo Room")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option.setName("category")
                .setDescription("Category for bingo")
                .setRequired(false)
        )
        .setDescription("Create a new bingosync room")
        ,

    execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
        const reply = await interaction.deferReply({ephemeral: false});

        const name = interaction.options.getString("name") ?? "New Bingo Room";
        const passphrase = interaction.options.getString("passphrase") ?? "12345";
        const category = interaction.options.getString("category") ?? `A Bingo Room Category`;

        const roomUrl = await createBingoRoom(name, passphrase, category);
        if(roomUrl) {
            const slug = new EmbedBuilder();

            slug.setTitle(name);
            slug.setDescription(`Your room is ready. Happy clicking!\n${roomUrl}`);
            slug.addFields([{name: "Passphrase", value: passphrase}, {name: "Category", value: "<unused>"}]);
            let metadataslug = {embeds: [], content: ""};
            metadataslug.embeds.push(slug);
            reply.edit(metadataslug);
        } else {
            reply.edit(`It all went wrong, I'm sorry I let you down :(`);
        }
    }
}

export default command;
