import { ChatInputCommandInteraction, CacheType, SlashCommandBuilder, Application, ApplicationCommandOptionWithAutocompleteMixin, ButtonBuilder, ActionRowBuilder, CategoryChannel, ButtonStyle, Guild, GuildMember, MessagePayload, EmbedBuilder } from "discord.js";
import { SlashCommand } from "../../types";
import axios from 'axios';

interface Racer {
    DiscordName: string;
    RacerGUID: string;
}

interface RaceResult {
    StartDateTime: string;
}

interface FlagResult {
    Results: RaceResult[];
}

interface RaceHistoryResponse {
    TotalCount: number;
}

async function getLadderArchiveCount(
    discordId: string,
    days: number = 365
): Promise<number> {
    const now = new Date();
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const startDate = start.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    }).replace(/\//g, '');

    const endDate = now.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    }).replace(/\//g, '');

    const response = await fetch(
        `https://archive.alttprladder.com/api/v1/PublicAPI/GetRacerRaceHistory?discordid=${discordId}&startdt=${startDate}&enddt=${endDate}`,
        {
        headers: {
            'User-Agent': 'PedChicken'
        }
        }
    );

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: RaceHistoryResponse = await response.json() as RaceHistoryResponse;
    return data.TotalCount;
}

async function getLadderGuid(discordId: string): Promise<string | undefined> {
    const response = await axios.get<Racer[]>(
        'https://alttprladder.com/api/v1/PublicAPI/GetActiveRacers',
        {
            headers: { 'User-Agent': 'PedChicken' }
        }
    );
    
    const racer = response.data.find(r => r.DiscordName === discordId);
    return racer?.RacerGUID;
}

async function getLadderCount(discordId: string, days: number = 365): Promise<number> {
    const racerGuid = await getLadderGuid(discordId);
    const response = await axios.get<FlagResult[]>(
        `https://alttprladder.com/api/v1/PublicAPI/GetRacerHistory?RacerGUID=${racerGuid}&flag_id=0`,
        {
            headers: { 'User-Agent': 'PedChicken' }
        }
    );
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return response.data.reduce((total, flag) => {
        const validRaces = flag.Results.filter(race => 
            new Date(race.StartDateTime) > cutoff
        ).length;
        return total + validRaces;
    }, 0);
}


const command: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("ladder_verify")
        .addStringOption((option) =>
            option.setName("user")
                .setDescription("The discord username you wish to verify")
                .setRequired(true)
        )
        .setDescription("Verify a racer's ladder status")
        ,

    execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
        const reply = await interaction.deferReply({ephemeral: false});

        const name = interaction.options.getString("user");
        if(name == undefined) {
            reply.edit(`Unable to resolve any races for user ${name}! Is the name correct?`);
        } else {
            let racesParticipated = 0;
            try {
                racesParticipated = await getLadderCount(name);
                
                // Try to find user across all available guilds
                let discordUser = null;
                for (const guild of interaction.client.guilds.cache.values()) {
                    try {
                        const members = await guild.members.search({ query: name });
                        if (members.size > 0) {
                            discordUser = members.first()?.user;
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }

                if (discordUser) {
                    interaction.client.logger.info(`Resolved ${name} to ${discordUser.id}...`);
                    try {
                        racesParticipated += await getLadderArchiveCount(discordUser.id);
                    } catch(e) {
                        interaction.client.logger.warn(`Failed to resolve archive ladder count for ${name}...`, e);
                    }
                } else {
                    interaction.client.logger.warn(`Could not resolve ${name} to a Discord user`);
                }
            } catch(e) {
                interaction.client.logger.error(e, this);
                interaction.client.logger.warn(`Failed to fetch user ${name}`, e);
                await reply.edit(`Unable to resolve user ${name}! Is the ID correct?`);
                return;
            }
            
            if(racesParticipated) {
                reply.edit(`${name} has participated in ${racesParticipated} races in the past 365 days.`);
            } else {
                reply.edit(`Unable to resolve any races for user ${name}!`);
            }
        }
    }
}

export default command;
