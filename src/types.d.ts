import { SlashCommandBuilder, CommandInteraction, Collection, PermissionResolvable, Message, AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandSubcommandBuilder, ButtonInteraction, Client, ModalSubmitInteraction, CacheType, UserSelectMenuInteraction, AnySelectMenuInteraction, SharedSlashCommand } from "discord.js";
import Logger from "./util/Logger";

export interface SlashCommand {
    command: SharedSlashCommand,
    execute: (interaction: ChatInputCommandInteraction) => void,
    autocomplete?: (interaction: AutocompleteInteraction) => void,
    modal?: (interaction: ModalSubmitInteraction<CacheType>) => void,
    select?: (interaction: AnySelectMenuInteraction) => void,
    cooldown?: number // in seconds
}

export interface ButtonCommand {
    name: string,
    initialize: (client: Client) => void,
    execute: (interaction: ButtonInteraction) => void,
    modal?: (interaction: ModalSubmitInteraction<CacheType>) => void
    select?: (interaction: AnySelectMenuInteraction) => void,
}

declare module "discord.js" {
    export interface Client {
        commands: Collection<string, Command>,
        logger: Logger
    }
}