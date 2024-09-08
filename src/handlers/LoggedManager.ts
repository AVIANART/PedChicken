import { Client, Guild } from "discord.js";
import Logger from "../util/Logger";

export abstract class LoggedManager {
    client: Client;
    logger: Logger;

    constructor(client: Client) {
        this.client = client;
        this.logger = client.logger;
    }
}