import { ChatInputCommandInteraction, CacheType, SlashCommandBuilder, Application, ApplicationCommandOptionWithAutocompleteMixin, ButtonBuilder, ActionRowBuilder, CategoryChannel, ButtonStyle, Guild, GuildMember, MessagePayload } from "discord.js";
import { SlashCommand } from "../../types";
import { Avianart } from "../../handlers/Avianart";


const command: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("list")
        .setDescription("List your presets.")
        ,

    execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
        const reply = await interaction.deferReply({ephemeral: true});

        const user = interaction.user.username;

        const avianart = new Avianart(interaction.client);
        interaction.client.logger.debug(`Fetching presets list for ${user}...`, this);
        const presets = await avianart.fetchPresetList(user);
        if(!presets) {
            interaction.client.logger.warn(`Failed to fetch presets for ${user}`);
            reply.edit(`Failed to fetch your presets, please try again later.`);
        } else {
            let message = `Your presets:\n\`\`\``;
            interaction.client.logger.debug(`Fetched ${presets.presets.length} presets for ${user}`);
            interaction.client.logger.debug(presets.presets);
            for(let preset of presets.presets) {
                message += `\n${preset.slug}: ${preset.name}`;
            }
            message += `\`\`\``;
            reply.edit(message);
        }
    }
}

export default command;
