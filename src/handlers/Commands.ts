import { Client, Guild, REST, Routes, SlashCommandBuilder } from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";
import * as Config from '../../config.json';
import { ButtonCommand, SlashCommand } from "../types";
import { LoggedManager } from "./LoggedManager";
import { env } from "process";

export default class CommandsHandler extends LoggedManager {
    slashCommands: SlashCommand[];
    buttonCommands: ButtonCommand[];

    constructor(client: Client) {
        super(client);
        this.slashCommands = [];
        this.buttonCommands = [];
    }

    async loadCommands() {
        const commandsDir = join(__dirname,"../commands");
        const fileExt = env.NODE_DEV ? ".ts" : ".js";
        const jsonCommands = [];
        const rest = new REST().setToken(Config.discord.token);

        this.logger.debug("Loading Button Commands...", this);
        readdirSync(commandsDir+"/ButtonCommands").forEach((file) => {
            if(!file.endsWith(fileExt)) return;
            let command = require(`${commandsDir}/ButtonCommands/${file}`).default as ButtonCommand;
            this.buttonCommands.push(command);
            this.client.commands.set(command.name, command);
        });

        this.logger.debug("Loading Slash Commands...", this);
        readdirSync(commandsDir+"/SlashCommands").forEach((file) => {
            if(!file.endsWith(fileExt)) return;
            let command = require(`${commandsDir}/SlashCommands/${file}`).default as SlashCommand;
            this.slashCommands.push(command);
        });

        //Prepare the JSON for the slash commands
        this.slashCommands.forEach((command) => {
            jsonCommands.push(command.command.toJSON());
            this.client.commands.set(command.command.name, command);
        });

        if(env.NODE_DEV) {
            this.logger.debug("Skipping command registration in development mode, register to guild instead", this);
            const guild = await this.client.guilds.fetch(Config.discord.debug.guild) as Guild;
            const registeredCommands = await rest.put(Routes.applicationGuildCommands(Config.discord.clientId, guild.id), { body: jsonCommands }) as SlashCommand[];
            if(registeredCommands.length > 0) {
                this.client.logger.info(`Successfully registered ${registeredCommands.length} application (/) commands and ${this.buttonCommands.length} button commands to guild ${guild.name}`);
            }
        } else {
            this.logger.debug(`Registering ${jsonCommands.length} commands on Discord...`, this);
            const registeredCommands = await rest.put(Routes.applicationCommands(Config.discord.clientId), { body: jsonCommands }) as SlashCommand[];
            if(registeredCommands.length > 0) {
                this.client.logger.info(`Successfully registered ${registeredCommands.length} application (/) commands and ${this.buttonCommands.length} button commands globally`);
            }
        }
    }
}