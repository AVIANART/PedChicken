import mysql2, { QueryResult, RowDataPacket } from "mysql2/promise";
import { LoggedManager } from "../LoggedManager";
import * as Config from "../../../config.json";

export interface ScheduledRace extends RowDataPacket {
    id: number;
    time: Date;
    season: number;
    mode: number;
    raceId: number;
}

export interface ScheduledRaceStrict {
    id: number;
    time: Date;
    season: number;
    mode: number;
    raceId: number;
}

export class ScheduleDB extends LoggedManager {
    private db: mysql2.Connection;

    constructor(client) {
        super(client);
        this.db = null;
        this.init();
        this.logger.debug('ScheduleDB initialized');
    }

    /**
     * Initialize the races table if it doesn't exist
     */
    async init(): Promise<void> {
        this.db = await mysql2.createConnection({
            host: Config.jankladder.db.host,
            user: Config.jankladder.db.user,
            password: Config.jankladder.db.password,
            database: Config.jankladder.db.database,
        });
        return; 
    }

    /**
     * Get a race by ID
     */
    async getScheduledRaceById(id: number): Promise<ScheduledRace | null> {
        //Check if the connection is still alive
        try {
            await this.db.ping();
        } catch (err) {
            this.logger.error('DB connection lost, reconnecting...');
            this.db = await mysql2.createConnection({
                host: Config.jankladder.db.host,
                user: Config.jankladder.db.user,
                password: Config.jankladder.db.password,
                database: Config.jankladder.db.database,
            });
        }

        const sql = 'SELECT * FROM schedule WHERE id = ?';
        const [rows, fields] = await this.db.execute<ScheduledRace[]>(sql, [id]);
        if (rows.length === 0) {
            return null;
        }
        const row = rows[0] as ScheduledRace;
        return row;
    }

    /**
     * Update an existing race
     */
    async updateScheduledRace(scheduledRace: ScheduledRace): Promise<void> {
        //Check if the connection is still alive
        try {
            await this.db.ping();
        } catch (err) {
            this.logger.error('DB connection lost, reconnecting...');
            this.db = await mysql2.createConnection({
                host: Config.jankladder.db.host,
                user: Config.jankladder.db.user,
                password: Config.jankladder.db.password,
                database: Config.jankladder.db.database,
            });
        }

        await this.db.execute(
            'UPDATE schedule SET time = ?, season = ?, mode = ?, raceId = ? WHERE id = ?',
            [scheduledRace.time, scheduledRace.season, scheduledRace.mode, scheduledRace.raceId, scheduledRace.id]
        );
        return;
    }

    /**
     * Get all races
     */
    async getAllScheduledRaces(): Promise<ScheduledRace[]> {
        //Check if the connection is still alive
        try {
            await this.db.ping();
        } catch (err) {
            this.logger.error('DB connection lost, reconnecting...');
            this.db = await mysql2.createConnection({
                host: Config.jankladder.db.host,
                user: Config.jankladder.db.user,
                password: Config.jankladder.db.password,
                database: Config.jankladder.db.database,
            });
        }

        const [rows, metadata] = await this.db.query<ScheduledRace[]>('SELECT * FROM schedule');
        if (rows.length === 0) {
            return [];
        }
        return rows;
    }

    /**
     * Get Future Races
     */
    async getFutureScheduledRaces(limit: number = 12): Promise<ScheduledRace[]> {
        //Check if the connection is still alive
        try {
            await this.db.ping();
        } catch (err) {
            this.logger.error('DB connection lost, reconnecting...');
            this.db = await mysql2.createConnection({
                host: Config.jankladder.db.host,
                user: Config.jankladder.db.user,
                password: Config.jankladder.db.password,
                database: Config.jankladder.db.database,
            });
        }

        const [rows, metadata] = await this.db.execute<ScheduledRace[]>('SELECT * FROM schedule WHERE time > ? ORDER BY time ASC LIMIT ?', [new Date(), limit]);
        if (rows.length === 0) {
            return [];
        }
        return rows;
    }

    /**
     * Get Past Races
     */
    async getPastScheduledRaces(limit: number = 12): Promise<ScheduledRace[]> {
        //Check if the connection is still alive
        try {
            await this.db.ping();
        } catch (err) {
            this.logger.error('DB connection lost, reconnecting...');
            this.db = await mysql2.createConnection({
                host: Config.jankladder.db.host,
                user: Config.jankladder.db.user,
                password: Config.jankladder.db.password,
                database: Config.jankladder.db.database,
            });
        }

        const [rows, metadata] = await this.db.execute<ScheduledRace[]>('SELECT * FROM schedule WHERE time < ? ORDER BY time DESC LIMIT ?', [new Date(), limit]);
        if (rows.length === 0) {
            return [];
        }
        return rows;
    }

    /**
     * Get Next 11 races and last race within 3 hours
     */
    async getNextScheduledRaces(): Promise<ScheduledRace[]> {
        //Check if the connection is still alive
        try {
            await this.db.ping();
        } catch (err) {
            this.logger.error('DB connection lost, reconnecting...');
            this.db = await mysql2.createConnection({
                host: Config.jankladder.db.host,
                user: Config.jankladder.db.user,
                password: Config.jankladder.db.password,
                database: Config.jankladder.db.database,
            });
        }
        
        const date = new Date();
        date.setHours(date.getHours() - 3);
        const [rows, metadata] = await this.db.execute<ScheduledRace[]>('SELECT * FROM schedule WHERE time > ? ORDER BY time ASC LIMIT 12', [date]);
        if (rows.length === 0) {
            return [];
        }
        return rows;
    }
}