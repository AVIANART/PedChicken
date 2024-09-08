import { ChatInputCommandInteraction, CacheType, SlashCommandBuilder, Application, ApplicationCommandOptionWithAutocompleteMixin, ButtonBuilder, ActionRowBuilder, CategoryChannel, ButtonStyle, Guild, GuildMember, MessagePayload } from "discord.js";
import { SlashCommand } from "../../types";
import { Avianart } from "../../handlers/Avianart";


const command: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("create")
        .addAttachmentOption((option) =>
            option.setName("yaml")
                .setDescription("Your DR/OWR Compatible YAML file.")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option.setName("name")
                .setDescription("The name of your preset (defaults to 'latest', or the name in the yaml file if it exists)")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option.setName("notes")
                .setDescription("Description of preset (defaults to 'A preset by <username>', or the notes in the yaml if present)")
                .setRequired(false)
        )
        .addStringOption((option) =>
            option.setName("branch")
                .setDescription("The branch to create the preset in. (defaults to 'DRUnstable')")
                .setRequired(false)
                .addChoices([
                    {name: "DR Unstable", value: "DRVolatile"},
                    {name: "Overworld Randomizer", value: "OWR"},
                    {name: "Karafruit OWR", value: "Troll"}
                ])
        )
        .setDescription("Create a new preset in your namespace from a YAML file.")
        ,

    execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
        const reply = await interaction.deferReply({ephemeral: true});

        const user = interaction.user.username;
        const name = interaction.options.getString("name") ?? "latest";
        const notes = interaction.options.getString("notes") ?? `A preset by ${user}`;
        const branch = interaction.options.getString("branch") ?? "DRUnstable";
        const yaml = interaction.options.getAttachment("yaml");

        const avianart = new Avianart(interaction.client);
        interaction.client.logger.debug(`Creating preset ${name} in ${branch} for ${user} using ${yaml.url}...`, this);
        const preset = await avianart.createPreset(user, yaml, name, notes, branch);
        if(!preset) {
            interaction.client.logger.warn(`Failed to create the preset ${name} in ${branch} for ${user}`);
            reply.edit(`Failed to create the preset ${name} in ${branch} for ${user}, please try again later.`);
        } else {
            reply.edit(`Preset ${name} created successfully!`);
        }
    }
}

export default command;