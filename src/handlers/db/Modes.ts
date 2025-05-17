import mysql2, { QueryResult, RowDataPacket } from "mysql2/promise";
import { LoggedManager } from "../LoggedManager";
import * as Config from "../../../config.json";

export interface Archetype extends RowDataPacket {
    id: number;
    name: string;
}

export interface ArchetypeStrict {
    id: number;
    name: string;
}

export interface Mode extends RowDataPacket {
    id: number;
    archetype: number;
    name: string;
    slug: string;
    description: string;
    active: boolean;
}

export interface ModeStrict {
    id: number;
    archetype: number;
    name: string;
    slug: string;
    description: string;
    active: boolean;
}

export class ModesDB extends LoggedManager {
    private db: mysql2.Connection;

    constructor(client) {
        super(client);
        this.db = null;
        this.init();
        this.logger.debug('ModesDB initialized');
    }

    /**
     * Initialize the modes table if it doesn't exist
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
     * Get a mode by ID
     */
    async getModeById(id: number): Promise<Mode | null> {
        const sql = 'SELECT * FROM modes WHERE id = ?';
        const [rows, fields] = await this.db.execute<Mode[]>(sql, [id]);
        if (rows.length === 0) {
            return null;
        }
        const row = rows[0] as Mode;
        return row;
    }

    /**
     * Get modes by archetype ID
     */
    async getModesByArchetypeId(archetypeId: number): Promise<Mode[]> {
        const sql = 'SELECT * FROM modes WHERE archetype = ?';
        const [rows, fields] = await this.db.execute<Mode[]>(sql, [archetypeId]);
        return rows as Mode[];
    }

    /**
     * Get all modes
     */
    async getAllModes(): Promise<Mode[]> {
        const sql = 'SELECT * FROM modes';
        const [rows, fields] = await this.db.execute<Mode[]>(sql);
        return rows as Mode[];
    }

    /**
     * Get all active modes
     */
    async getAllActiveModes(): Promise<Mode[]> {
        const sql = 'SELECT * FROM modes WHERE active = 1';
        const [rows, fields] = await this.db.execute<Mode[]>(sql);
        return rows as Mode[];
    }

    /**
     * Get all active modes by archetype ID
     */
    async getAllActiveModesByArchetypeId(archetypeId: number): Promise<Mode[]> {
        const sql = 'SELECT * FROM modes WHERE archetype = ? AND active = 1';
        const [rows, fields] = await this.db.execute<Mode[]>(sql, [archetypeId]);
        return rows as Mode[];
    }

    /**
     * Get all archetypes
     */
    async getAllArchetypes(): Promise<Archetype[]> {
        const sql = 'SELECT * FROM archetypes';
        const [rows, fields] = await this.db.execute<Archetype[]>(sql);
        return rows as Archetype[];
    }

    /**
     * Get an archetype by ID
     */
    async getArchetypeById(id: number): Promise<Archetype | null> {
        const sql = 'SELECT * FROM archetypes WHERE id = ?';
        const [rows, fields] = await this.db.execute<Archetype[]>(sql, [id]);
        if (rows.length === 0) {
            return null;
        }
        const row = rows[0] as Archetype;
        return row;
    }
}