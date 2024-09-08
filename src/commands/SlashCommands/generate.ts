import { ChatInputCommandInteraction, CacheType, SlashCommandBuilder, Application, ApplicationCommandOptionWithAutocompleteMixin, ButtonBuilder, ActionRowBuilder, CategoryChannel, ButtonStyle, Guild, GuildMember, MessagePayload } from "discord.js";
import { SlashCommand } from "../../types";
import { Avianart } from "../../handlers/Avianart";
import buildMetadataSlug from "../../util/PermlinkSlug";

const command: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("gen")
        .addStringOption(
            option => 
                option.setName("preset")
                .setDescription("The preset to use for generation.")
                .setRequired(true)
        )
        .addBooleanOption(
            option =>
                option.setName("race")
                .setDescription("Whether to generate a race seed.")
                .setRequired(false)
        )
        .setDescription("Generate an AVIANART seed."),

    execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
        const reply = await interaction.deferReply();
        
        let preset = interaction.options.getString("preset", true);
        let namespace = "avianart";
        
        if(preset.includes("/")) {
            if(preset.split("/").length !== 2) {
                interaction.client.logger.warn(`Invalid preset format: ${preset} from ${interaction.user.username} via ${interaction.guild?.name ?? "DM"}`);
                reply.edit("Invalid preset format. Please use `namespace/preset`.");
                return;
            }
            [namespace, preset] = preset.split("/");
        }

        const isRace = interaction.options.getBoolean("race") ?? true;

        //reply.edit(`Generating your ${isRace ? "race " : ""}seed with preset ${namespace}/${preset}`);

        const avianart = new Avianart(interaction.client);
        const seed = await avianart.generateSeed(preset, isRace, namespace);
        if(!seed) {
            interaction.client.logger.warn(`Failed to generate the seed using preset ${namespace}/${preset}`);
            reply.edit(`Failed to generate the seed using preset ${namespace}/${preset}, please try again later.`);
        } else {
            let metadataslug = {embeds: [], content: ""};
            try {
                metadataslug.embeds.push(await buildMetadataSlug(preset, seed.response, namespace));
            } catch(err) {
                interaction.client.logger.error(`Failed to build metadata slug for ${namespace}/${preset}: ${err}`);
                metadataslug.content = "https://avianart.games/perm/" + seed.response.hash;
            }
            reply.edit(metadataslug);
        }
    }
}

export default command;