import { CreateRaceData, RaceData, RaceDetails, RacetimeError, RTAction, RTMessageTypes, RTPacketTypes } from "rtgg-bot/src/types";
import { Avianart, AvianGenPayload, AvianResponsePayload } from "./Avianart";
import { LoggedManager } from "./LoggedManager";
import RacetimeClient from "rtgg-bot";
import WebSocketClient from "rtgg-bot/src/websocket/client";

export class RacetimeBot extends LoggedManager {
    private rtBot: RacetimeClient;
    public online = false;
    public lastSocket: WebSocketClient;

    constructor(clientId: string, clientSecret: string, clientCategory: string, client) {
        super(client);
        this.client = client;
        this.rtBot = new RacetimeClient(clientId, clientSecret, clientCategory);
        this.client.logger.debug("RacetimeBot initialized", this);
    }

    async initialize() {
        
    }

    async joinRaceRoom(url: string): Promise<boolean> {
        let joined = await this.rtBot.joinRaceRoom(url);        
        return joined;
    }

    async sendMessage(url: string|WebSocketClient, message: string) {
        let socket: WebSocketClient;
        if(typeof url === "string") {
            socket = await this.ensureSocket(url);
            if(!socket) {
                if(!await this.joinRaceRoom(url)) {
                    this.client.logger.fatal(`Cannot reach raceroom to send messages`, this);
                    return;
                }
                socket = this.rtBot.sockets.get(url);
                if(!socket) {
                    this.client.logger.fatal(`Failed to join raceroom for url: ${url}`, this);
                    return;
                }
            }
        } else {
            socket = url;
        }
        if(socket) {
            this.lastSocket = socket;
            socket.sendMessage(<RTAction>{
                action: "message", 
                data: {
                    message: message, 
                    guid: Math.round(Math.random() * 10000) + ""
                }
            });
        }
    }

    async fetchRaceData(url: string): Promise<RaceDetails> {
        return await this.rtBot.fetchRaceData(url);
    }

    async updateRaceInfo(url: string, info: string) {
        let socket = await this.ensureSocket(url);
        if(!socket) {
            if(!await this.joinRaceRoom(url)) {
                this.client.logger.fatal(`Cannot update raceroom for room URL https://racetime.gg/${url} - socket not found! Race info: ${info}`, this);
                return;
            }
            socket = this.rtBot.sockets.get(url);
            if(!socket) {
                this.client.logger.fatal(`Failed to join raceroom for url: ${url}`, this);
                return;
            }
        }
        this.lastSocket = socket;
        socket.sendMessage(<RTAction>{
            action: RTPacketTypes.SET_INFO,
            data: {
                info_bot: info
            }
        });
    }

    async startRace(url: string) {
        let socket = await this.ensureSocket(url);
        if(socket) {
            this.lastSocket = socket;
            socket.sendMessage({
                action: RTPacketTypes.BEGIN
            });
        }
    }

    async createRaceRoom(raceData: CreateRaceData) {
        try {
            const raceRoom = await this.rtBot.createRace(raceData, true);
            return raceRoom;
        } catch(e) {
            this.client.logger.error(`Error while creating race room: ${e}`, this);
            return null;
        }
    }

    async editRaceRoom(raceUrl: string, raceData: CreateRaceData) {
        try {
            const raceRoom = await this.rtBot.editRace(raceUrl, raceData);
            return raceRoom;
        } catch(e) {
            this.client.logger.error(`Error while editing race room: ${e}`, this);
            return null;
        }
    }

    private async ensureSocket(url: string): Promise<WebSocketClient> {
        let socket = this.rtBot.sockets.get(url);
        let roomInfo = await this.fetchRaceData(url);
        if(!roomInfo) {
            this.client.logger.error(`Failed to fetch room info for url: ${url}`, this);
            return null;
        }
        if(!roomInfo.websocket_bot_url) {
            this.client.logger.error(`No websocket url found for room: ${url}`, this);
            return null;
        }
        if(!this.rtBot.sockets.has(roomInfo.websocket_bot_url)) {
            let result = await this.joinRaceRoom(roomInfo.websocket_bot_url);
            if(!result) {
                this.client.logger.error(`Failed to join raceroom for url: ${url}`, this);
                return null;
            }
            this.client.logger.debug(`Joined raceroom for url: ${url}`, this);
            this.client.logger.debug(`Socket for url: ${url} is now available`, this);
            return this.rtBot.sockets.get(roomInfo.websocket_bot_url);
        }
        if(!this.rtBot.sockets.has(roomInfo.websocket_bot_url)) {
            this.client.logger.error(`Socket not found for url: ${url}`, this);
            return null;
        }
        return this.rtBot.sockets.get(roomInfo.websocket_bot_url);
    }


    //TODO, make this less bad
    public formatHashForRacetime(hash): string {
        const translateNames = new Map(
            [
                ['Bomb',    'Bombs'],
                ['Powder',  'Magic Powder'],
                ['Rod',     'Ice Rod'],
                ['Ocarina', 'Flute'],
                ['Bug Net', 'Bugnet'],
                ['Bottle',  'Empty Bottle'],
                ['Potion',  'Green Potion'],
                ['Cane',    'Somaria'],
                ['Pearl',   'Moon Pearl'],
                ['Key',     'Big Key']
            ]
        );
    
        for(let name of translateNames) {
            hash = hash.replaceAll(name[0], name[1]);
        }
        return hash.replaceAll("Bombsos", "Bombos");
    }
}