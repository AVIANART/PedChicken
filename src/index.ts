import { Client, Collection, Events, GatewayIntentBits, GuildTextBasedChannel, InteractionType, MessagePayload, Partials } from "discord.js";
import * as Config from '../config.json';
import CommandsHandler from "./handlers/Commands";
import Logger, { DiscordLogger, LogLevel } from "./util/Logger";
import { RacetimeBot } from "./handlers/Racetime";
import { Spambot } from "./handlers/Spambot";

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildWebhooks,
		GatewayIntentBits.GuildMembers
	],
	partials: [Partials.Channel],
});

client.commands = new Collection();
client.logger = new Logger(); 

// Login into your client application with bot's token.
client.login(Config.discord.token);

client.on("ready", async (client) => {
	const commandsHandler = new CommandsHandler(client);
	const loggingChannel = await (await client.guilds.fetch(Config.discord.debug.guild)).channels.fetch(Config.discord.debug.channel) as GuildTextBasedChannel;
	const discordLogger = new DiscordLogger(loggingChannel, Config.discord.debug.roles);
	discordLogger.setLevel(Config.discord.debug.enabled ? LogLevel.DEBUG : LogLevel.WARN);
	client.logger.addTarget(discordLogger);
	client.logger.debug(`[${client.user.username}] Startup`);

	const guilds = await client.guilds.fetch();

	await commandsHandler.loadCommands();
	client.commands.forEach(async (command) => {
		if(command.initialize) {
			command.initialize(client);
		}
	});

	const racetime = new RacetimeBot(Config.racetime.clientId, Config.racetime.clientSecret, Config.racetime.clientCategory, client);
	await racetime.initialize();

	const spambotDetection = new Spambot(client);
	
	client.logger.info(`[${client.user.username}] Ready!`);
});

client.on(Events.InteractionCreate, async (interaction) => {
	let command;
	let commandName = "";
	let handler = "";
	let verb = "";
	if(interaction.isChatInputCommand()) {
		command = interaction.client.commands.get(interaction.commandName);
		commandName = interaction.commandName;
		handler = command.constructor.name;
		verb = "execute";
	} else if(interaction.isAutocomplete()) {
		command = interaction.client.commands.get(interaction.commandName);
		commandName = interaction.commandName;
		handler = command.constructor.name;
		verb = "autocomplete";
	} else if(interaction.isButton()) {
		command = interaction.client.commands.get(interaction.customId.split("|")[0]);
		commandName = command.name;
		handler = command.constructor.name;
		verb = "execute";
	} else if(interaction.isModalSubmit()) {
		command = interaction.client.commands.get(interaction.customId.split("|")[0]);
		commandName = command.name;
		handler = command.constructor.name;
		verb = "modal";
	} else if(interaction.isAnySelectMenu()) {
		command = interaction.client.commands.get(interaction.customId.split("|")[0]);
		commandName = command.name;
		handler = command.constructor.name;
		verb = "select";
	} else {
		client.logger.error(`Invalid interaction type! ${interaction.toJSON()}`);
		return;
	}

	try {
		await command[verb](interaction);
	} catch(err) {
		client.logger.error(`[${client.user.username}] Failed processing command: ${commandName}; Handler: ${handler}\n\`\`\`json\n${JSON.stringify(err, null, 2)}\n${err.toString()}\`\`\``);
		if(interaction.isAutocomplete()) {
			//Nothing
		} else {
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
			} else {
				await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
			}
		}
	}
})