import { Database } from "bun:sqlite";
import { LoggedManager } from "../LoggedManager";
import * as Config from "../../../config.json";

export interface ScheduledRace {
    id: number;
    time: string;
    architype: string;
    mode: string;
    raceId: number;
}

export interface ScheduledRaceFormatted {
    id: number;
    time: Date;
    architype: string;
    mode: string;
    raceId: number;
}

export class ScheduleDB extends LoggedManager {
    private db: Database;

    constructor(client) {
        super(client);
        this.db = new Database(Config.jankladder.dbPath);
        this.initTable();
        this.logger.debug('ScheduleDB initialized');
    }

    /**
     * Initialize the races table if it doesn't exist
     */
    initTable(): void {
        const query = `
            CREATE TABLE IF NOT EXISTS schedule (
                id INTEGER PRIMARY KEY,
                time TEXT,
                architype TEXT,
                mode TEXT,
                raceId INTEGER DEFAULT -1
            )
        `;
        this.db.run(query);
        return; 
    }

    /**
     * Get a race by ID
     */
    getScheduledRaceById(id: number): ScheduledRace | null {
        // bun:sqlite's get is synchronous and returns the row or null
        const row = this.db.query('SELECT * FROM schedule WHERE id = ?').get(id) as ScheduledRace | null;
        return row;
    }

    /**
     * Insert a new race
     */
    insertScheduledRace(scheduledRace: Omit<ScheduledRace, 'id'>): number {
        // bun:sqlite's run is synchronous
        const result = this.db.run(
            'INSERT INTO schedule (time, architype, mode) VALUES (?, ?, ?)',
            [scheduledRace.time, scheduledRace.architype, scheduledRace.mode]
        );
        // Get the last inserted ID
        const lastId = result.lastInsertRowid as number;
        return lastId;
    }

    /**
     * Update an existing race
     */
    updateScheduledRace(scheduledRace: ScheduledRace): void {
        // bun:sqlite's run is synchronous
        this.db.run(
            'UPDATE schedule SET time = ?, architype = ?, mode = ?, raceId = ? WHERE id = ?',
            [scheduledRace.time, scheduledRace.architype, scheduledRace.mode, scheduledRace.raceId, scheduledRace.id]
        );
        return;
    }

    /**
     * Delete a race by ID
     */
    deleteScheduledRace(id: number): void {
        // bun:sqlite's run is synchronous
        this.db.run('DELETE FROM schedule WHERE id = ?', [id]);
        return;
    }

    /**
     * Get all races
     */
    getAllScheduledRaces(): ScheduledRace[] {
        // bun:sqlite's all is synchronous and returns an array
        const rows = this.db.query('SELECT * FROM schedule').all() as ScheduledRace[];
        return rows || [];
    }

    /**
     * Get Future Races
     */
    getFutureScheduledRaces(limit: number = 12): ScheduledRace[] {
        // bun:sqlite's all is synchronous and returns an array
        const query = this.db.prepare('SELECT * FROM schedule WHERE time > ? ORDER BY time ASC LIMIT ?',
            [new Date().toISOString(), limit]
        );
        const rows = query.all() as ScheduledRace[];
        return rows || [];
    }

    /**
     * Get Past Races
     */
    getPastScheduledRaces(limit: number = 12): ScheduledRace[] {
        // bun:sqlite's all is synchronous and returns an array
        const query = this.db.prepare('SELECT * FROM schedule WHERE time < ? ORDER BY time DESC LIMIT ?', 
            [new Date().toISOString(), limit]
        );
        const rows = query.all() as ScheduledRace[];
        return rows || [];
    }

    /**
     * Get Next 11 races and last race within 3 hours
     */
    getNextScheduledRaces(): ScheduledRace[] {
        // bun:sqlite's all is synchronous and returns an array
        const date = new Date();
        date.setHours(date.getHours() - 3);
        const query = this.db.prepare('SELECT * FROM schedule WHERE time > ? ORDER BY time ASC LIMIT 12',
            [date.toISOString()]
        );
        const rows = query.all() as ScheduledRace[];
        return rows || [];
    }
}