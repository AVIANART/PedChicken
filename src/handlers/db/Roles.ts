import mysql2, { QueryResult, RowDataPacket } from "mysql2/promise";
import { LoggedManager } from "../LoggedManager";
import * as Config from "../../../config.json";

export interface PingableRole extends RowDataPacket {
    modeId: number;
    roleId: string;
}

export interface Role extends RowDataPacket {
    roleName: string;
    roleId: string;
}

export interface RoleStrict {
    roleName: string;
    roleId: string;
}

export class RolesDB extends LoggedManager {
    private db: mysql2.Connection;

    constructor(client) {
        super(client);
        this.db = null;
        this.init();
        this.logger.debug('RolesDB initialized');
    }

    /**
     * Initialize the roles table if it doesn't exist
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
     * Get a role by ID
     */

    async getRoleById(roleId: string): Promise<Role | null> {
        const sql = 'SELECT * FROM roles WHERE roleId = ?';
        const [rows, fields] = await this.db.execute<Role[]>(sql, [roleId]);
        if (rows.length === 0) {
            return null;
        }
        const row = rows[0] as Role;
        return row;
    }

    /**
     * Get a role by name
     */
    async getRoleByName(roleName: string): Promise<Role | null> {
        const sql = 'SELECT * FROM roles WHERE roleName = ?';
        const [rows, fields] = await this.db.execute<Role[]>(sql, [roleName]);
        if (rows.length === 0) {
            return null;
        }
        const row = rows[0] as Role;
        return row;
    }

    /**
     * Get all roles
     */
    async getAllRoles(): Promise<Role[]> {
        const sql = 'SELECT * FROM roles';
        const [rows, fields] = await this.db.execute<Role[]>(sql);
        return rows;
    }

    /**
     * Get pingable roles by modeId
     */
    async getPingableRolesByModeId(modeId: number): Promise<PingableRole[]> {
        const sql = 'SELECT * FROM pingableModeRoles WHERE modeId = ?';
        const [rows, fields] = await this.db.execute<PingableRole[]>(sql, [modeId]);
        return rows;
    }

}