import { LoggedManager } from "./LoggedManager";
import * as Config from "../../config.json";
import { TextChannel } from "discord.js";
import { RacetimeBot } from "./Racetime";
import { CreateRaceData, RaceDetails } from "rtgg-bot/src/types";
import { Avianart, AvianGenPayload } from "./Avianart";
import { Race, RaceDB } from "./db/Races";
import { ScheduleDB, ScheduledRace, ScheduledRaceStrict } from "./db/Schedule";
import { SettingsDB } from "./db/Settings";
import { ModesDB } from "./db/Modes";
import { RolesDB } from "./db/Roles";
import { LadderApi } from "./LadderApi";

export class JankLadder extends LoggedManager {
    lastScheduleMessage: string;
    racetime: RacetimeBot;
    avianart: Avianart;
    RaceDB: RaceDB;
    ScheduleDB: ScheduleDB;
    ModesDB: ModesDB;
    RolesDB: RolesDB;
    SettingsDB: SettingsDB;
    LadderApi: LadderApi;

    constructor(client) {
        super(client);
        this.avianart = new Avianart(client);
        this.racetime = new RacetimeBot(Config.racetime.clientId, Config.racetime.clientSecret, Config.racetime.clientCategory, this.client);
        this.RaceDB = new RaceDB(this.client);
        this.ScheduleDB = new ScheduleDB(this.client);
        this.ModesDB = new ModesDB(this.client);
        this.RolesDB = new RolesDB(this.client);
        this.SettingsDB = new SettingsDB(this.client);
        this.LadderApi = new LadderApi(this.client);
        this.LadderApi.initialize();
        this.initSchedule();
    }

    async buildPinglistForRace(modeId: number): Promise<string> {
        const rolesToPing = [];
        if(this.SettingsDB.getSettingByName("pingRolesOnRoomCreation")?.value == false) {
            this.client.logger.debug(`Skipping ping roles because pinging is disabled`, this);
            return "";
        }
        const mode = await this.ModesDB.getModeById(modeId);
        if (!mode) {
            this.client.logger.debug(`Mode ${modeId} not found`, this);
            return "";
        }

        const modeRoles = await this.RolesDB.getPingableRolesByModeId(mode.id);

        if (modeRoles) {
            for (const role of modeRoles) {
                const roleResolved = await this.RolesDB.getRoleByName(role.roleId);
                rolesToPing.push(`<@&${roleResolved.roleId}>`);
            }
            const allRole = await this.RolesDB.getRoleByName("all");
            rolesToPing.push(`<@&${allRole.roleId}>`);
        }
        return rolesToPing.join(" ");
    }

    /*
    addRaceToSchedule(time: Date, architype: string, mode: string): number | bigint {
        return this.ScheduleDB.insertScheduledRace(<ScheduledRace>{
            time: time.toISOString(),
            architype: architype,
            mode: mode
        });
    }

    updateRaceInSchedule(id: number, time: Date, architype: string, mode: string, raceId: number): void {
        this.ScheduleDB.updateScheduledRace(<ScheduledRace>{
            id: id,
            time: time.toISOString(),
            architype: architype,
            mode: mode,
            raceId: raceId
        });
    }
    */

    async fetchSchedule(): Promise<ScheduledRaceStrict[]> {
        const scheduleRaw = await this.ScheduleDB.getNextScheduledRaces();
        let schedule: ScheduledRace[] = [];
        schedule = scheduleRaw.map(row => {
            return <ScheduledRace>{
                id: row.id,
                time: row.time,
                season: row.season,
                mode: row.mode,
                raceId: row.raceId,
            };
        });
        return schedule;
    }

    async initSchedule() {
        this.client.logger.debug("JankLadder initialized", this);
        this.refreshSchedule();
        setInterval(async() => {
            if(this.SettingsDB.getSettingByName("refreshSchedule")?.value == true) {
                this.client.logger.trace("Refreshing schedule", this);
                await this.refreshSchedule();
            } else {
                this.client.logger.trace("Skipping schedule refresh because setting is disabled", this);
            }
        }, 1000 * 60);
        setInterval(async() => {
            await this.raceWatcher();
        }, 1000 * 10);
    }

    async raceWatcher() {
        try {
            const now = new Date();
            const cutoffTime = new Date(now);
            cutoffTime.setHours(cutoffTime.getHours() - 2);
            const schedule = await this.fetchSchedule();
            const upcomingRaces = schedule.filter(entry => entry.time > cutoffTime).slice(0, 6);
            // const upcomingRaces = schedule.slice(0, 12);
            for (const entry of upcomingRaces) {
                if (
                    entry.time.getTime() - now.getTime() < 1000 * 60 * Config.jankladder.prestart && 
                    entry.time.getTime() > cutoffTime.getTime() &&
                    now.getTime() - entry.time.getTime() <= 1000 * 60 * 15
                ) {
                    const entryMode = await this.ModesDB.getModeById(entry.mode);
                    const entryArchetype = await this.ModesDB.getArchetypeById(entryMode.archetype);

                    if (entry.raceId == -1 || entry.raceId == null) {
                        if(this.SettingsDB.getSettingByName("createRacerooms")?.value == false) {
                            this.client.logger.debug(`Skipping race creation for Scheduled Race ${entry.id} [${entryArchetype.name}/${entryMode.slug}] @ <t:${Math.floor(entry.time.getTime() / 1000)}:f> because racerooms are disabled`, this);
                            continue;
                        }
                        const raceRoom: RaceDetails = await this.racetime.createRaceRoom(<CreateRaceData>{
                            info_user: `Step Ladder Series - [${entryArchetype.name}] - ${entryMode.name}`,
                            goal: "Beat the game (Group)",
                            start_delay: 15,
                            time_limit: 6,
                            auto_start: false,
                            allow_midrace_chat: false,
                            allow_non_entrant_chat: true,
                            allow_comments: true,
                            hide_comments: true,
                            streaming_required: true,
                            unlisted: false,
                            chat_message_delay: 0
                        });
                        if (raceRoom) {
                            this.client.logger.info(`Created race room for ${entryArchetype.name} - ${entryMode.name} - Room URL: https://racetime.gg${raceRoom.url}`, this);
                            
                            const raceId = await this.RaceDB.createRace(<Race>{
                                raceActive: false,
                                raceRoom: raceRoom.url,
                                seed: null
                            });
                            
                            await this.ScheduleDB.updateScheduledRace(<ScheduledRace>{
                                id: entry.id,
                                time: entry.time,
                                season: entry.season,
                                mode: entry.mode,
                                raceId: raceId
                            });
                            const raceChannel = await this.client.channels.fetch(Config.jankladder.raceChannelId) as TextChannel;
                            const rolesToPing = await this.buildPinglistForRace(entry.mode);
                            const startsInXMinutes = `<t:${Math.floor(entry.time.getTime() / 1000)}:R>`;
                            //Clear the channel before sending the message
                            //await raceChannel.bulkDelete(100, true);
                            await raceChannel.send(`${rolesToPing}\n**${entryMode.name}** -- https://racetime.gg${raceRoom.url} -- ${startsInXMinutes}`);
                        }
                    } else {
                        const race = await this.RaceDB.getRaceById(entry.raceId);
                        //this.logger.trace(`if(entry.time.getTime() - now.getTime() <= 1000 * 60 * 10 && race.seed === null): ${entry.time.getTime() - now.getTime() <= 1000 * 60 * 10} | ${!race.seed}`, this);
                        if(entry.time.getTime() - now.getTime() <= 1000 * 60 * 10 && !race.seed) {
                            this.client.logger.debug(`Race starting in less than 10 minutes, seeding it`, this);
                            this.racetime.sendMessage(race.raceRoom, `Rolling seed now. If nothing happens after 2 minutes, ping a ladder admin!`);
                            this.RaceDB.updateRace(<Race>{
                                id: entry.raceId,
                                raceRoom: race.raceRoom,
                                raceActive: false,
                                seed: "<generating>"
                            });
                            setTimeout(async() => {
                                let seed: AvianGenPayload;
                                
                                if(entryMode.slug.includes("/")) {
                                    let modeRaw = entryMode.slug.split("/");
                                    seed = await this.avianart.generateSeed(modeRaw[1], true, modeRaw[0]);
                                } else {
                                    if(entryMode.slug == "mmmmavid23") {
                                        seed = await this.avianart.generateMysteryForLadder();
                                    } else {
                                        seed = await this.avianart.generateSeed(entryMode.slug, true);
                                    }
                                }
                                let theSeed = seed.response;
                                let info;
                                try {
                                    if(theSeed.vt) {
                                        info = `${entryMode.slug} - https://alttpr.racing/getseed.php?race=${entry.raceId} - (${theSeed.fshash.replaceAll(", ", "/")})`;
                                    } else {
                                        info = `${entryMode.slug} - https://alttpr.racing/getseed.php?race=${entry.raceId} - (${this.racetime.formatHashForRacetime(theSeed.spoiler.meta.hash.replaceAll(", ", "/"))})`;
                                    }
                                } catch(e) {
                                    console.log(theSeed);
                                    this.client.logger.error(`Error while formatting hash for racetime: ${e}`, this);
                                    this.client.logger.error(`Seed: ${Object.keys(theSeed)}`, this);
                                    this.client.logger.error(`Seed: ${Object.keys(theSeed.spoiler)}`, this);
                                    info = `${entryMode.slug} - https://alttpr.racing/getseed.php?race=${entry.id}`;
                                }
                                this.racetime.updateRaceInfo(race.raceRoom, info);
                                this.racetime.sendMessage(race.raceRoom, `https://alttpr.racing/getseed.php?race=${entry.raceId}`);
                                this.RaceDB.updateRace(<Race>{
                                    id: entry.raceId,
                                    raceActive: false,
                                    raceRoom: race.raceRoom,
                                    seed: theSeed.hash
                                });
                            }, 3000);
                        }
                        if(entry.time.getTime() - now.getTime() <= 1000 * 70 * 5 && entry.time.getTime() - now.getTime() >= 1000 * 60 * 5) {
                            this.client.logger.debug(`Race starting in less than 5 minutes, checking if we need to ping for it`, this);
                            let numberOfEntrants = 0;
                            let raceDetails = await this.racetime.fetchRaceData(race.raceRoom);
                            numberOfEntrants = raceDetails.entrants.length;
                            if(numberOfEntrants < 2 && numberOfEntrants > 0) {
                                //TODO Ping roles
                                this.client.logger.debug(`Race has less than 2 entrants, pinging roles`, this);
                            }

                        }
                        if(entry.time.getTime() - now.getTime() <= 1000 * 70 && entry.time.getTime() - now.getTime() >= 1000 * 60) {
                            this.client.logger.debug(`Race starting in less than a minute, warning about it`, this);
                            this.racetime.sendMessage(race.raceRoom, `@unready Race starting in less than a minute! Ready up or you will be removed!`);
                            /*
                            const raceRoom: RaceDetails = await this.racetime.editRaceRoom(race.raceRoom, <CreateRaceData>{
                                unlisted: false,
                            });
                            */
                            setTimeout(async() => {
                                this.client.logger.debug(`Race starting in less 15 seconds, autostarting it`, this);
                                this.racetime.startRace(race.raceRoom);
                                this.RaceDB.updateRace(<Race>{
                                    id: entry.raceId,
                                    raceActive: true,
                                    raceRoom: race.raceRoom,
                                    seed: race.seed
                                });
                            }, 55 * 1000);
                        }
                        if(entry.time.getTime() - now.getTime() < 1000 && !race.raceActive) {
                            this.client.logger.debug(`Race started, updating it`, this);
                            this.racetime.startRace(race.raceRoom);
                            this.RaceDB.updateRace(<Race>{
                                id: entry.raceId,
                                raceActive: true,
                                raceRoom: race.raceRoom,
                                seed: race.seed
                            });
                        }
                    }
                }
            }
        } catch(e) {
            this.client.logger.error(`Error while updating racerooms: ${e}`, this);
        }
    }

    async refreshSchedule() {
        try {
            const channel = await this.client.channels.fetch(Config.jankladder.scheduleChannelId) as TextChannel;
            const message = await channel.messages.fetch(Config.jankladder.scheduleMessageId);
            let content = `**Step Ladder Schedule** (Times are local)\n`;
            const now = new Date();
            const cutoffTime = new Date(now);
            cutoffTime.setHours(cutoffTime.getHours() - 2);
            const schedule = await this.fetchSchedule();
            const upcomingRaces = schedule.filter(entry => entry.time > cutoffTime).slice(0, 12);
            //const upcomingRaces = schedule.slice(0, 12);
            for (const entry of upcomingRaces) {
                entry.time.setHours(entry.time.getHours());
                const entryMode = await this.ModesDB.getModeById(entry.mode);
                content += `<t:${Math.floor(entry.time.getTime() / 1000)}:f> (<t:${Math.floor(entry.time.getTime() / 1000)}:R>) - ${entryMode.name}`;
                if (entry.raceId != -1 && entry.raceId != null) {
                    const race = await this.RaceDB.getRaceById(entry.raceId);
                    content += ` - https://racetime.gg${race.raceRoom}`;
                }
                content += `\n`;
            }
            if(this.lastScheduleMessage !== content) {
                try {
                    await message.edit(content);
                    this.lastScheduleMessage = content;
                } catch(e) {
                    this.logger.error(`Error while editing schedule message: ${e}`, this);
                }
            }
        } catch(e) {
            this.client.logger.error(`Error while refreshing schedule: ${e}`, this);
        }
    }
}