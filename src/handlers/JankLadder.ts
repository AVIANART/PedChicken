import { LoggedManager } from "./LoggedManager";
import * as Config from "../../config.json";
import { TextChannel } from "discord.js";
import { RacetimeBot } from "./Racetime";
import { CreateRaceData, RaceDetails } from "rtgg-bot/src/types";
import { Database } from "bun:sqlite";
import { Avianart, AvianGenPayload } from "./Avianart";

export class JankLadder extends LoggedManager {
    lastScheduleMessage: string;
    db: Database;
    racetime: RacetimeBot;
    avianart: Avianart;
    constructor(client) {
        super(client);
        this.avianart = new Avianart(client);
        this.racetime = new RacetimeBot(Config.racetime.clientId, Config.racetime.clientSecret, Config.racetime.clientCategory, this.client);
        this.db = new Database(Config.jankladder.dbPath);
        //this.db.prepare("DROP TABLE IF EXISTS jankladder").run();
        this.db.prepare("CREATE TABLE IF NOT EXISTS jankladder (id INTEGER PRIMARY KEY, time TEXT, architype TEXT, mode TEXT, raceRoom TEXT , raceActive BOOL , seed TEXT)").run();
        this.initSchedule();
        this.refreshSchedule();
    }

    addRaceToSchedule(time: Date, architype: string, mode: string): number | bigint {
        const insert = this.db.prepare("INSERT INTO jankladder (id, time, architype, mode, raceRoom, raceActive, seed) VALUES (?, ?, ?, ?, ?, ?, ?)");
        let result = insert.run(null, time.toISOString(), architype, mode, null, 0, null);
        this.fetchSchedule();
        return result.lastInsertRowid;
    }

    updateRaceInSchedule(id: number, time: Date, architype: string, mode: string, raceRoom: string|null, raceActive: number, seed: string|null): void {
        const update = this.db.prepare("UPDATE jankladder SET time = ?, architype = ?, mode = ? , raceRoom = ? , raceActive = ? , seed = ? WHERE id = ?");
        update.run(time.toISOString(), architype, mode, raceRoom, raceActive, seed, id);
        this.fetchSchedule();
    }

    fetchSchedule() {
        //this.logger.debug(`Fetching schedule...`, this);
        let scheduleRaw = this.db.prepare(`SELECT * FROM jankladder ORDER BY time ASC`);
        //this.logger.debug(`Fetching schedule for month ${month}`, this);
        //this.logger.debug(scheduleRaw, this);
        let schedule = [];
        if (scheduleRaw.all().length > 0) {
            const rows = scheduleRaw.all() as any[];
            schedule = rows.map(row => {
                return {
                    id: row.id,
                    time: new Date(row.time),
                    architype: row.architype,
                    mode: row.mode,
                    raceRoom: row.raceRoom ? { url: row.raceRoom } : null,
                    seed: row.seed,
                };
            }
            );
        }
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
                    if (!entry.raceRoom) {
                        const raceRoom: RaceDetails = await this.racetime.createRaceRoom(<CreateRaceData>{
                            info_user: `Jank Ladder Series - [${entry.architype}] - ${entry.mode}`,
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
                            this.client.logger.info(`Created race room for ${entry.architype} - ${entry.mode} - Room URL: ${raceRoom.url}`, this);
                            schedule.find(e => e.time.getTime() === entry.time.getTime()).raceRoom = raceRoom;
                            const raceChannel = await this.client.channels.fetch(Config.jankladder.raceChannelId) as TextChannel;
                            await raceChannel.send(`**${entry.mode}** -- https://racetime.gg${raceRoom.url}`);
                            this.updateRaceInSchedule(entry.id, entry.time, entry.architype, entry.mode, raceRoom.url, 0, null);
                        }
                    } else {
                        if(entry.time.getTime() - now.getTime() <= 1000 * 60 * 10 && entry.seed === null) {
                            this.client.logger.info(`Race starting in less than 10 minutes, seeding it`, this);
                            this.racetime.sendMessage(entry.raceRoom.url, `Rolling seed now. If nothing happens after 2 minutes, ping a ladder admin!`);
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
                                    info = `${mode} - https://avianart.games/perm/${theSeed.hash} - (${this.racetime.formatHashForRacetime(theSeed.spoiler.meta.hash.replaceAll(", ", "/"))})`;
                                } catch(e) {
                                    info = `${mode} - https://avianart.games/perm/${theSeed.hash}`;
                                }
                                this.racetime.updateRaceInfo(entry.raceRoom.url, info);
                                this.racetime.sendMessage(entry.raceRoom.url, `https://avianart.games/perm/${theSeed.hash}`);
                                this.updateRaceInSchedule(entry.id, entry.time, entry.architype, entry.mode, entry.raceRoom.url, 0, theSeed.hash);
                            }, 500);
                        }
                        if(entry.time.getTime() - now.getTime() <= 1000 * 70 && entry.time.getTime() - now.getTime() >= 1000 * 60) {
                            this.client.logger.info(`Race starting in less than a minute, warning about it`, this);
                            this.racetime.sendMessage(entry.raceRoom.url, `Race starting in less than a minute! Ready up or you will be removed!`);
                        }
                        if(entry.time.getTime() - now.getTime() < 1000 * 15 && entry.raceActive === 0 && now.getTime() + 1000 * 60 * 15 > entry.time.getTime()) {
                            this.client.logger.info(`Race starting in less 15 seconds, starting it`, this);
                            this.racetime.startRace(entry.raceRoom.url);
                            this.updateRaceInSchedule(entry.id, entry.time, entry.architype, entry.mode, entry.raceRoom.url, 1, entry.seed);
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
            const upcomingRaces = schedule.filter(entry => entry.time > cutoffTime).slice(0, 36);
            //const upcomingRaces = schedule.slice(0, 12);
            for (const entry of upcomingRaces) {
                entry.time.setHours(entry.time.getHours());
                content += `<t:${Math.floor(entry.time.getTime() / 1000)}:f> (<t:${Math.floor(entry.time.getTime() / 1000)}:R>) - ${entry.mode}\n`;
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
                raceRoom: null
            });
            this.addRaceToSchedule(startTime, architype, mode);
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
        let fifteenMinutesFromNow = new Date();
        fifteenMinutesFromNow.setMinutes(fifteenMinutesFromNow.getMinutes() + 11);
        this.addRaceToSchedule(fifteenMinutesFromNow, "Jank", "Casual Boots");
        schedule.push({
            id: null,
            time: fifteenMinutesFromNow,
            architype: "Jank",
            mode: "Casual Boots",
        });
        */
        this.client.logger.debug(`Generated schedule with ${schedule.length} races`, this);

        return schedule;
    }
}