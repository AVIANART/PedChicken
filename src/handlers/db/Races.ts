import { Database } from "bun:sqlite";
import { LoggedManager } from "../LoggedManager";
import * as Config from "../../../config.json";

export interface Race {
    id: number;
    raceRoom: string;
    raceActive: boolean;
    seed: string;
}

export class RacesDB extends LoggedManager {
    private db: Database;

    constructor(client) {
        super(client);
        this.db = new Database(Config.jankladder.dbPath);
        this.initTable();
        this.logger.debug('RacesDB initialized');
    }

    /**
     * Initialize the races table if it doesn't exist
     */
    initTable(): void {
        const query = `
            CREATE TABLE IF NOT EXISTS races (
                id INTEGER PRIMARY KEY,
                raceRoom TEXT,
                raceActive BOOLEAN DEFAULT 0,
                seed TEXT DEFAULT ''
            )
        `;
        this.db.run(query);
        return; 
    }

    /**
     * Get a race by ID
     */
    getRaceById(id: number): Race | null {
        // bun:sqlite's get is synchronous and returns the row or null
        const row = this.db.query('SELECT * FROM races WHERE id = ?').get(id) as Race | null;
        return row;
    }

    /**
     * Insert a new race
     */
    insertRace(race: Omit<Race, 'id'>): number {
        // bun:sqlite's run is synchronous
        const result = this.db.prepare(
            'INSERT INTO races (raceRoom) VALUES (?)',
            [race.raceRoom]
        ).run();
        // Get the last inserted ID
        const lastId = result.lastInsertRowid as number;
        return lastId;
    }

    /**
     * Update an existing race
     */
    updateRace(race: Race): void {
        // bun:sqlite's run is synchronous
        this.db.run(
            'UPDATE races SET raceRoom = ?, raceActive = ?, seed = ? WHERE id = ?',
            [race.raceRoom, race.raceActive, race.seed, race.id]
        );
        return;
    }

    /**
     * Delete a race by ID
     */
    deleteRace(id: number): void {
        // bun:sqlite's run is synchronous
        this.db.run('DELETE FROM races WHERE id = ?', [id]);
        return;
    }

    /**
     * Get all races
     */
    getAllRaces(): Race[] {
        // bun:sqlite's all is synchronous and returns an array
        const rows = this.db.query('SELECT * FROM races').all() as Race[];
        return rows || [];
    }
}