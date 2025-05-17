import { Database } from "bun:sqlite";
import { LoggedManager } from "../LoggedManager";
import * as Config from "../../../config.json";

interface SettingRaw {
    name: string;
    type: string;
    value: string;
}

export interface Setting {
    name: string;
    value: string|number|boolean;
}

export interface DynamicSettings {
    pingRolesOnRoomCreation: Setting;
    createRaceRooms: Setting;
    createRaces: Setting;
}

export class SettingsDB extends LoggedManager {
    private db: Database;

    constructor(client) {
        super(client);
        this.db = new Database(Config.jankladder.db.settingsDbPath);
        this.initTable();
        this.logger.debug('ScheduleDB initialized');
    }

    /**
     * Initialize the races table if it doesn't exist
     */
    initTable(): void {
        const query = `
            CREATE TABLE IF NOT EXISTS settings (
                name TEXT PRIMARY KEY,
                type TEXT,
                value TEXT
            )
        `;
        this.db.run(query);
        return; 
    }

    /**
     * Get a setting by name
     */
    getSettingByName(name: string): Setting | null {
        // bun:sqlite's get is synchronous and returns the row or null
        const row = this.db.query('SELECT * FROM settings WHERE name = ?').get(name) as SettingRaw | null;
        let setting: Setting = <Setting>{};
        if (row) {
            setting.name = row.name;
            // Convert the value to the correct type
            switch (row.type) {
                case 'string':
                    setting.value = row.value as string;
                    break;
                case 'number':
                    setting.value = parseInt(row.value as string);
                    break;
                case 'boolean':
                    setting.value = (row.value as string) === '1';
                    break;
                default:
                    break;
            }
        }
        return row;
    }

    /**
     * Insert a new setting
     */
    insertSetting(setting: Setting): void {
        // bun:sqlite's run is synchronous
        this.db.run(
            'INSERT INTO settings (name, type, value) VALUES (?, ?, ?)',
            [setting.name, typeof setting.value, setting.value]
        );
        return;
    }

    /**
     * Update an existing setting
     */
    updateSetting(setting: Setting): void {
        // bun:sqlite's run is synchronous
        this.db.prepare(
            'UPDATE settings SET type = ?, value = ? WHERE name = ?',
            [typeof setting.value, setting.value, setting.name]
        ).run();
        return;
    }

    /**
     * Create or Update a setting
     */
    createOrUpdateSetting(setting: Setting): void {
        // bun:sqlite's run is synchronous
        this.db.prepare(
            'INSERT INTO settings (name, type, value) VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET type = ?, value = ?',
            [setting.name, typeof setting.value, setting.value, typeof setting.value, setting.value]
        ).run();
        return;
    }


    /**
     * Delete a setting by name
     */
    deleteSetting(name: string): void {
        // bun:sqlite's run is synchronous
        this.db.run('DELETE FROM settings WHERE name = ?', [name]);
        return;
    }

    /**
     * Get all settings
     */
    getAllSettings(): Setting[] {
        // bun:sqlite's all is synchronous and returns an array
        const rows = this.db.query('SELECT * FROM settings').all() as SettingRaw[];
        const settings: Setting[] = [];
        if (rows) {
            for (const row of rows) {
                let setting: Setting = <Setting>{};
                setting.name = row.name;
                // Convert the value to the correct type
                switch (row.type) {
                    case 'string':
                        setting.value = row.value as string;
                        break;
                    case 'number':
                        setting.value = parseInt(row.value as string);
                        break;
                    case 'boolean':
                        setting.value = (row.value as string) === '1';
                        break;
                    default:
                        break;
                }
                settings.push(setting);
            }
        }
        return settings || [];
    }
}