import mysql2, { QueryResult, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { LoggedManager } from "../LoggedManager";
import * as Config from "../../../config.json";

export interface Race extends RowDataPacket {
    id: number;
    raceActive: boolean;
    raceRoom: string;
    seed: string;
}

export interface RaceStrict {
    id: number;
    raceActive: boolean;
    raceRoom: string;
    seed: string;
}

export class RaceDB extends LoggedManager {
    private db: mysql2.Connection;

    constructor(client) {
        super(client);
        this.db = null;
        this.init();
        this.logger.debug('RaceDB initialized');
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
     * Get a Race by ID
     */
    async getRaceById(id: number): Promise<Race | null> {
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

        const sql = 'SELECT * FROM races WHERE id = ?';
        const [rows, fields] = await this.db.execute<Race[]>(sql, [id]);
        if (rows.length === 0) {
            return null;
        }
        const row = rows[0] as Race;
        return row;
    }

    /**
     * Update a Race
     */
    async updateRace(race: Race): Promise<void> {
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
            'UPDATE races SET raceActive = ?, raceRoom = ?, seed = ? WHERE id = ?',
            [race.raceActive, race.raceRoom, race.seed, race.id]
        );
        return;
    }

    /**
     * Create a new Race
     */
    async createRace(race: Race): Promise<number> {
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
        
        let [result, meta] = await this.db.execute(
            'INSERT INTO races (raceActive, raceRoom, seed) VALUES (?, ?, ?)',
            [race.raceActive, race.raceRoom, race.seed]
        );
        return (result as ResultSetHeader).insertId;
    }
}