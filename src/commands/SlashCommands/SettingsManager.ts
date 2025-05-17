import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../types";
import { Setting, SettingsDB } from "../../handlers/db/Settings";
import { Avianart } from "../../handlers/Avianart";

let settingsManager: SettingsDB;

const command: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("settings")
        .setDescription("Manage settings")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("get")
                .setDescription("Get a setting")
                .addStringOption((option) =>
                    option
                        .setName("name")
                        .setDescription("The name of the setting")
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("set")
                .setDescription("Set a setting")
                .addStringOption((option) =>
                    option
                        .setName("name")
                        .setDescription("The name of the setting")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("string")
                        .setDescription("The value of the setting")
                        .setRequired(false)
                )
                .addBooleanOption((option) =>
                    option
                        .setName("boolean")
                        .setDescription("The value of the setting")
                        .setRequired(false)
                )
                .addNumberOption((option) =>
                    option
                        .setName("number")
                        .setDescription("The value of the setting")
                        .setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("delete")
                .setDescription("Delete a setting")
                .addStringOption((option) =>
                    option
                        .setName("name")
                        .setDescription("The name of the setting")
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("list")
                .setDescription("List all settings")
        ),

        execute: async (interaction: ChatInputCommandInteraction) => {
            if(!settingsManager)
                settingsManager = new SettingsDB(interaction.client);

            //Check if user has permission to use this command
            if (!interaction.memberPermissions?.has("Administrator")) {
                await interaction.reply("You do not have permission to use this command.");
                return;
            }

            const subcommand = interaction.options.getSubcommand();
            const name = interaction.options.getString("name");
            let value;
            if (interaction.options.getString("string") !== null) {
                value = interaction.options.getString("string");
            } else if (interaction.options.getBoolean("boolean") !== null) {
                value = interaction.options.getBoolean("boolean");
            } else if (interaction.options.getNumber("number") !== null) {
                value = interaction.options.getNumber("number");
            }
            switch (subcommand) {
                case "get":
                    if (!name) {
                        await interaction.reply("Please provide a setting name.");
                        return;
                    }

                    // Get the setting from the database
                    const setting = settingsManager.getSettingByName(name);
                    if (setting) {
                        await interaction.reply(`Setting: ${setting.name}, Value: ${setting.value}`);
                    } else {
                        await interaction.reply(`Setting not found: ${name}`);
                    }
                    break;
                case "set":
                    if (!name || value === undefined || value === null) {
                        await interaction.reply("Please provide a setting name and value.");
                        return;
                    }
                    // Set the setting in the database
                    settingsManager.createOrUpdateSetting(<Setting>{
                        name: name,
                        value: value,
                    });
                    await interaction.reply(`Setting updated: ${name} = ${value}`);
                    break;
                case "delete":
                    if (!name) {
                        await interaction.reply("Please provide a setting name.");
                        return;
                    }
                    // Delete the setting from the database
                    await settingsManager.deleteSetting(name);
                    await interaction.reply(`Setting deleted: ${name}`);
                    break;
                case "list":
                    // List all settings from the database
                    const settings = settingsManager.getAllSettings();
                    if (settings.length > 0) {
                        const settingsList = settings.map((s) => `${s.name}: ${s.value}`).join("\n");
                        await interaction.reply(`Settings:\n${settingsList}`);
                    } else {
                        await interaction.reply("No settings found.");
                    }
                    break;
                default:
                    await interaction.reply("Unknown subcommand.");
            }
        }
}

export default command;