import { LoggedManager } from "./LoggedManager";
import * as Config from "../../config.json";
import { TextChannel } from "discord.js";
import { RacetimeBot } from "./Racetime";
import { CreateRaceData, RaceDetails } from "rtgg-bot/src/types";
import { Database } from "bun:sqlite";
import { Avianart, AvianGenPayload } from "./Avianart";
import { Race, RacesDB } from "./db/Races";
import { ScheduleDB, ScheduledRace, ScheduledRaceFormatted } from "./db/Schedule";
import { Setting, SettingsDB } from "./db/Settings";

export class JankLadder extends LoggedManager {
    lastScheduleMessage: string;
    racetime: RacetimeBot;
    avianart: Avianart;
    RacesDB: RacesDB;
    ScheduleDB: ScheduleDB;
    SettingsDB: SettingsDB

    constructor(client) {
        super(client);
        this.avianart = new Avianart(client);
        this.racetime = new RacetimeBot(Config.racetime.clientId, Config.racetime.clientSecret, Config.racetime.clientCategory, this.client);
        this.RacesDB = new RacesDB(this.client);
        this.ScheduleDB = new ScheduleDB(this.client);
        this.SettingsDB = new SettingsDB(this.client);
        this.initSchedule();
        this.refreshSchedule();
    }

    buildPinglistForRace(mode: string): string {
        const rolesToPing = [];
        const modeRoles = Config.jankladder.modeRoles[mode];
        if (modeRoles) {
            for (const role of modeRoles) {
                if (Config.jankladder.roleIndex[role]) {
                    rolesToPing.push(`<@&${Config.jankladder.roleIndex[role]}>`);
                }
            }
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

    fetchSchedule(): ScheduledRaceFormatted[] {
        const scheduleRaw = this.ScheduleDB.getNextScheduledRaces();
        let schedule: ScheduledRaceFormatted[] = [];
        schedule = scheduleRaw.map(row => {
            return <ScheduledRaceFormatted>{
                id: row.id,
                time: new Date(row.time),
                architype: row.architype,
                mode: row.mode,
                raceId: row.raceId,
            };
        });
        return schedule;
    }

    initSchedule() {
        this.client.logger.debug("JankLadder initialized", this);
        if(this.fetchSchedule().length < 1) {
            this.client.logger.debug("Generating new schedule because fetched schedule is empty", this);
            this.generateSchedule();
        }
        setInterval(async() => {
            this.client.logger.trace("Refreshing schedule", this);
            await this.refreshSchedule();
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
            const schedule = this.fetchSchedule();
            const upcomingRaces = schedule.filter(entry => entry.time > cutoffTime).slice(0, 6);
            // const upcomingRaces = schedule.slice(0, 12);
            for (const entry of upcomingRaces) {
                if (
                    entry.time.getTime() - now.getTime() < 1000 * 60 * Config.jankladder.prestart && 
                    entry.time.getTime() > cutoffTime.getTime() &&
                    now.getTime() - entry.time.getTime() <= 1000 * 60 * 15
                ) {
                    if (entry.raceId == -1) {
                        if(this.SettingsDB.getSettingByName("createRacerooms")?.value == false) {
                            this.client.logger.debug(`Skipping race creation for Scheduled Race ${entry.id} [${entry.architype}/${entry.mode}] @ <t:${Math.floor(entry.time.getTime() / 1000)}:f> because racerooms are disabled`, this);
                            continue;
                        }
                        const raceRoom: RaceDetails = await this.racetime.createRaceRoom(<CreateRaceData>{
                            info_user: `Step Ladder Series - [${entry.architype}] - ${entry.mode}`,
                            custom_goal: "Finish the Race",
                            start_delay: 15,
                            time_limit: 3,
                            auto_start: false,
                            allow_midrace_chat: false,
                            allow_non_entrant_chat: false,
                            allow_comments: true,
                            hide_comments: true,
                            streaming_required: true,
                            unlisted: true,
                            chat_message_delay: 0
                        });
                        if (raceRoom) {
                            this.client.logger.info(`Created race room for ${entry.architype} - ${entry.mode} - Room URL: https://racetime.gg${raceRoom.url}`, this);
                            const raceId = this.RacesDB.insertRace(<Race>{
                                raceRoom: raceRoom.url
                            });
                            this.ScheduleDB.updateScheduledRace(<ScheduledRace>{
                                id: entry.id,
                                time: entry.time.toISOString(),
                                architype: entry.architype,
                                mode: entry.mode,
                                raceId: raceId
                            });
                            const raceChannel = await this.client.channels.fetch(Config.jankladder.raceChannelId) as TextChannel;
                            const rolesToPing = this.buildPinglistForRace(entry.mode);
                            const startsInXMinutes = `<t:${Math.floor(entry.time.getTime() / 1000)}:R>`;
                            //Clear the channel before sending the message
                            await raceChannel.bulkDelete(100, true);
                            await raceChannel.send(`${rolesToPing}\n**${entry.mode}** -- https://racetime.gg${raceRoom.url} -- ${startsInXMinutes}`);
                        }
                    } else {
                        const race = this.RacesDB.getRaceById(entry.raceId);
                        //this.logger.trace(`if(entry.time.getTime() - now.getTime() <= 1000 * 60 * 10 && race.seed === null): ${entry.time.getTime() - now.getTime() <= 1000 * 60 * 10} | ${!race.seed}`, this);
                        if(entry.time.getTime() - now.getTime() <= 1000 * 60 * 10 && !race.seed) {
                            this.client.logger.info(`Race starting in less than 10 minutes, seeding it`, this);
                            this.racetime.sendMessage(race.raceRoom, `Rolling seed now. If nothing happens after 2 minutes, ping a ladder admin!`);
                            this.RacesDB.updateRace(<Race>{
                                id: entry.raceId,
                                raceRoom: race.raceRoom,
                                raceActive: false,
                                seed: "<generating>"
                            });
                            setTimeout(async() => {
                                let seed: AvianGenPayload;
                                let mode = Config.jankladder.modes[entry.mode];
                                if(mode.includes("/")) {
                                    let modeRaw = entry.mode.split("/");
                                    seed = await this.avianart.generateSeed(modeRaw[0], true, modeRaw[1]);
                                } else {
                                    seed = await this.avianart.generateSeed(mode, true);
                                }
                                let theSeed = seed.response;
                                let info;
                                try {
                                    if(theSeed.vt) {
                                        info = `${mode} - https://alttpr.racing/getseed.php?race=${entry.raceId} - (${theSeed.fshash.replaceAll(", ", "/")})`;
                                    } else {
                                        info = `${mode} - https://alttpr.racing/getseed.php?race=${entry.raceId} - (${this.racetime.formatHashForRacetime(theSeed.spoiler.meta.hash.replaceAll(", ", "/"))})`;
                                    }
                                } catch(e) {
                                    console.log(theSeed);
                                    this.client.logger.error(`Error while formatting hash for racetime: ${e}`, this);
                                    this.client.logger.error(`Seed: ${Object.keys(theSeed)}`, this);
                                    this.client.logger.error(`Seed: ${Object.keys(theSeed.spoiler)}`, this);
                                    info = `${mode} - https://alttpr.racing/getseed.php?race=${entry.id}`;
                                }
                                this.racetime.updateRaceInfo(race.raceRoom, info);
                                this.racetime.sendMessage(race.raceRoom, `https://alttpr.racing/getseed.php?race=${entry.raceId}`);
                                this.RacesDB.updateRace(<Race>{
                                    id: entry.raceId,
                                    raceActive: false,
                                    raceRoom: race.raceRoom,
                                    seed: theSeed.hash
                                });
                            }, 3000);
                        }
                        if(entry.time.getTime() - now.getTime() <= 1000 * 70 && entry.time.getTime() - now.getTime() >= 1000 * 60) {
                            this.client.logger.info(`Race starting in less than a minute, warning about it`, this);
                            this.racetime.sendMessage(race.raceRoom, `Race starting in less than a minute! Ready up or you will be removed!`);
                            setTimeout(async() => {
                                this.client.logger.info(`Race starting in less 15 seconds, autostarting it`, this);
                                this.racetime.startRace(race.raceRoom);
                                this.RacesDB.updateRace(<Race>{
                                    id: entry.raceId,
                                    raceActive: true,
                                    raceRoom: race.raceRoom,
                                    seed: race.seed
                                });
                            }, 45 * 1000);
                        }
                        if(entry.time.getTime() - now.getTime() < 1000 && !race.raceActive) {
                            this.client.logger.info(`Race started, updating it`, this);
                            this.racetime.startRace(race.raceRoom);
                            this.RacesDB.updateRace(<Race>{
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
            let content = `**Jank Ladder Schedule**\n`;
            const now = new Date();
            const cutoffTime = new Date(now);
            cutoffTime.setHours(cutoffTime.getHours() - 2);
            const schedule = this.fetchSchedule();
            const upcomingRaces = schedule.filter(entry => entry.time > cutoffTime).slice(0, 12);
            //const upcomingRaces = schedule.slice(0, 12);
            for (const entry of upcomingRaces) {
                entry.time.setHours(entry.time.getHours());
                content += `<t:${Math.floor(entry.time.getTime() / 1000)}:f> (<t:${Math.floor(entry.time.getTime() / 1000)}:R>) - ${entry.mode}`;
                if (entry.raceId != -1) {
                    const race = this.RacesDB.getRaceById(entry.raceId);
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

    generateSchedule() {
        const architypes = Config.jankladder.architypes;
        const architypeKeys = Object.keys(architypes);
        const schedule = [];
        const racesPerDay = 6;
        let races=0;
        const totalDays = 60;
        const totalRaces = racesPerDay * totalDays;
        const startTime = new Date();
        let startHour = 10;
        let cutoffHour = 1;
        startTime.setMonth(2, 1);
        startTime.setHours(10, 0, 0, 0); // 10AM ET in Finland time (UTC+2)
        const scheduledTimes = new Set();

        for (let i = 0; i < totalRaces; i++) {
            const architype = architypeKeys[Config.jankladder.archetypeIndex];
            const modes = architypes[architype];
            const mode = modes[Config.jankladder.modeIndex[architype]];

            // Ensure no overlap
            /*
            while (scheduledTimes.has(startTime.getTime())) {
                startTime.setTime(startTime.getTime() + 1000 * 60 * 60 * 3);
            }
            */

            schedule.push({
                id: null,
                time: new Date(startTime),
                architype,
                mode,
                raceRoom: null,
                active: 0
            });
            this.ScheduleDB.insertScheduledRace(<ScheduledRace>{
                time: startTime.toISOString(),
                architype: architype,
                mode: mode
            });
            scheduledTimes.add(startTime.getTime());

            // Rotate mode index
            Config.jankladder.modeIndex[architype] = (Config.jankladder.modeIndex[architype] + 1) % modes.length;

            // Increment time by 3 hours
            //startTime.setHours(startTime.getHours() + 3);
            startTime.setTime(startTime.getTime() + 1000 * 60 * 60 * 3);

            // Rotate architype index
            Config.jankladder.archetypeIndex = (Config.jankladder.archetypeIndex + 1) % architypeKeys.length;
            races++;

            if(races >= racesPerDay) {
                startHour = startHour == 10 ? 9 : 10;
                startTime.setHours(startHour, 0, 0, 0);
                races=0;

            }
        }

        /*
        // Create a race that starts in 15 minutes for testing purposes
        let fifteenMinutesFromNow = new Date();
        fifteenMinutesFromNow.setMinutes(fifteenMinutesFromNow.getMinutes() + 11);
        this.ScheduleDB.insertScheduledRace(<ScheduledRace>{
            time: fifteenMinutesFromNow.toISOString(),
            architype: "Jank",
            mode: "Casual Boots"
        });

        schedule.push({
            id: null,
            time: fifteenMinutesFromNow,
            architype: "Jank",
            mode: "Casual Boots",
        });
        //*/
        this.client.logger.debug(`Generated schedule with ${schedule.length} races`, this);

        return schedule;
    }
}