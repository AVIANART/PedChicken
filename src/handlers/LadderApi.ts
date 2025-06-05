import { createServer, Server } from "http";
import { LoggedManager } from "./LoggedManager";
import { Guild } from "discord.js";
import * as Config from "../../config.json";

export class LadderApi extends LoggedManager {
    server: Server;
    constructor(client) {
        super(client);
    }

    async initialize() {
        this.client.logger.debug(`[LadderApi] Initializing...`);
        this.server = createServer((req, res) => {
            const args = req.url.split("/");
            switch(args[1]) {
                case "roles":
                    switch(args[2]) {
                        case "get":
                            res.writeHead(200, { "Content-Type": "text/json" });
                            for (const guild of this.client.guilds.cache.values()) {
                                if (guild.id === Config.jankladder.serverId) {
                                    res.end(JSON.stringify({ roles: guild.roles.cache.map(role => ({ id: role.id, name: role.name, color: role.hexColor })) }));
                                    return;
                                }
                            }
                            break;
                        default:
                            res.writeHead(500, { "Content-Type": "text/json" });
                            res.end('\n');
                            break;
                    }
                    res.writeHead(200, { "Content-Type": "text/json" });
                    res.end(JSON.stringify({ status: "ok" }));
                    break;
                default:
                    res.writeHead(500, {'Content-Type': 'text/json'});
                    res.end('\n');
                    break;
            }
        }).listen(8080, '127.0.0.1');
        this.client.logger.debug(`[LadderApi] Initialized!`);
    }
}