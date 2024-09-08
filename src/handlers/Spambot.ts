import { GuildMember, GuildTextBasedChannel, PartialGuildMember } from "discord.js";
import { LoggedManager } from "./LoggedManager";
import * as Config from "../../config.json";

export class Spambot extends LoggedManager {
    constructor(client) {
        super(client);
        this.client = client;
        this.client.on("guildMemberUpdate", (oldMember, newMember) => {
            this.processUpdate(oldMember, newMember);
        });
        this.client.logger.debug("Spambot Detector initialized", this);
    }

    private processUpdate(oldMember: GuildMember|PartialGuildMember, newMember: GuildMember) {
        if((new Date().getTime() - newMember.joinedAt.getTime()) < (1000 * 60 * 1)) {
            let banThem = false;
            let hasAllRoles = false;
            let banChannelId = "";
            const guilds = Config.spambots.guilds;
            for(let guild of guilds) {
                if(guild.id == newMember.guild.id) {
                    //Matched guild
                    hasAllRoles = true;
                    for(let role of guild.roles) {
                        if(!newMember.roles.cache.has(role))
                            hasAllRoles = false;
                    }
                    if(hasAllRoles) {
                        banThem=true;
                        banChannelId = guild.logChannel;
                    }
                }
            }
            //They match all the criteria
            if(banThem) {
                newMember.ban({reason: 'New member matched heuristics for bot', deleteMessageSeconds: 60 * 60 * 30}).then((result) => {
                    newMember.guild.channels.fetch(banChannelId).then(async (channel) => {
                        await (channel as GuildTextBasedChannel).send({content: `Banned likely bot ${newMember.displayName} [${newMember.user.username}] - Grabbed flagged roles within 10 minutes of joining`});
                    });
                }).catch((err) => {
                    newMember.guild.channels.fetch(banChannelId).then(async (channel) => {
                        await (channel as GuildTextBasedChannel).send({content: `Unable to ban, recommend banning likely bot ${newMember.displayName} [${newMember.user.username}] - Grabbed flagged roles within 10 minutes of joining`});
                    });
                    this.client.logger.error(`Unable to ban bot ${newMember.displayName} from ${newMember.guild.name} for reason: ${err.toString()}`, this);
                });
                this.client.logger.debug(`Banned likely bot ${newMember.displayName} [${newMember.user.username}] on guild ${newMember.guild.name} [${newMember.guild.id}]`, this);
            }
        }
    }
}