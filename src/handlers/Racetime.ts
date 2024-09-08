import { Avianart } from "./Avianart";
import { LoggedManager } from "./LoggedManager";
import RacetimeClient from "rtgg-bot";

export class RacetimeBot extends LoggedManager {
    private rtBot;
    public online = false;

    constructor(clientId: string, clientSecret: string, clientCategory: string, client) {
        super(client);
        this.client = client;
        this.rtBot = new RacetimeClient(clientId, clientSecret, clientCategory);
        this.client.logger.debug("RacetimeBot initialized", this);
    }

    async initialize() {
        setInterval(async() => {
            this.client.logger.trace("Fetching races...", this);
            await this.fetchAllRaces();
        }, 5000);
    }

    async fetchAllRaces() {
        try {
            const races = await this.rtBot.fetchRaces();
            this.online = true;
            for(let race of races) {
                if(race.status.value == "open" || race.status.value == "invitational") {
                    const raceData = await this.rtBot.fetchRaceData(race.url);
                    if(!this.rtBot.sockets.has(raceData.websocket_bot_url) && await this.rtBot.joinRaceRoom(raceData.websocket_bot_url)) {
                        this.client.logger.trace(`Found new race room: ${race.name}`, this);
                        this.rtBot.sockets.get(raceData.websocket_bot_url).sendMessage({
                            action: "message",
                            data: {
                                message: "Use !avianart to roll an avianart seed",
                                guid: Math.round(Math.random() * 10000) + ""
                            }
                        });
                        //Message handler
                        this.rtBot.sockets.get(raceData.websocket_bot_url).on("chat-message", async (message) => {
                            if(!message.message.bot) {
                                await this.handleMessage(this.rtBot.sockets.get(raceData.websocket_bot_url), message);
                            }
                        });
                        //Handle leaving if the race starts
                        this.rtBot.sockets.get(raceData.websocket_bot_url).on("race-data", (newData) => {
                            if(newData.race.status.value !== "open" && newData.race.status.value !== "invitational") {
                                try {
                                    this.rtBot.sockets.get(raceData.websocket_bot_url).socket.close();
                                    this.rtBot.sockets.delete(raceData.websocket_bot_url);
                                } catch(e) {
                                    this.client.logger.debug(`Error when trying to close socket: ${e}`, this);
                                }
                            }
                        });
                    }
                }
            } 
        } catch(e) {
            this.online = false;
            this.client.logger.warn([`Failed to fetch races:`, e], this);
        }
    }

    async handleMessage(socket, message) {
        const rawMessage = message.message.message_plain;
        if(rawMessage.startsWith("!avianart")) {
            socket.sendMessage({
                action: "message",
                data: {
                    message: "Use the button below to roll an avianart seed",
                    actions: {
                        "Roll a Seed": {
                            message: "!avianroll ${preset}${logic}",
                            submit: "Roll Seed",
                            survey: [
                                {
                                    name: "preset",
                                    label: "Preset",
                                    type: "select",
                                    options: {
                                        tph2023: "True Pot Hunt",
                                        invc2023: "Invertacrismiser",
                                        mmmmavid23: "MMMM (NotSlow)",
                                        pab: "Pots and Bones",
                                        trinity: "Trinity",
                                        crosshunt: "Crosshunt (Main Tournament)"
                                    }
                                },
                                {
                                    name: "logic",
                                    label: "Logic",
                                    type: "select",
                                    options: {
                                        "": "No Major Glitches",
                                        "hmg": "Hybrid Major Glitches",
                                        "owg": "Overworld Glitches",
                                        "nl": "No Logic"
                                    },
                                    default: ""
                                }
                            ]
                        }
                    },
                    guid: Math.round(Math.random() * 10000) + ""
                }
            });
        } else if(rawMessage.startsWith("!avianroll")) {
            socket.sendMessage({action: "message", data: {message: "Generating a seed, please wait. If nothing happens after a couple minutes, contact hiimcody1.", guid: Math.round(Math.random() * 10000) + ""}});
            
            const parts = rawMessage.split(" ");
            let mode = parts[1];
            let namespace = "avianart";
            if(mode.includes("/")) {
				namespace = mode.split("/");
				mode = namespace[1];
				namespace = namespace[0];
			}

            let avianart = new Avianart(this.client);
            let seed = (await avianart.generateSeed(mode, true, namespace)).response;

            if(seed.patch) {
                socket.sendMessage({action: "setinfo", data: {info_bot: `${mode} - https://avianart.games/perm/${seed.hash} - (${this.formatHashForRacetime(seed.spoiler.meta.hash.replaceAll(", ", "/"))})`}});
                socket.sendMessage({action: "message", data:{message: `https://avianart.games/perm/${seed.hash}`, guid: Math.round(Math.random() * 10000) + ""}});
                socket.sendMessage({action: "message", data:{message: `Generation complete. Enjoy your seed!`, guid: Math.round(Math.random() * 10000) + ""}});
            } else {
                socket.sendMessage({action: "message", data:{message: "Failed to generate seed, please try again later :(", guid: Math.round(Math.random() * 10000) + ""}});
            }
        } else if(rawMessage.startsWith("!turnier")) {
            //TODO Break this out into a tournament handler
            socket.sendMessage({action: "message", data: {message: "Generating Tournament seed, please wait. If nothing happens after a couple minutes, contact hiimcody1.", guid: Math.round(Math.random() * 10000) + ""}});

            let namespace = "avianart";

            let avianart = new Avianart(this.client);
            let seed = (await avianart.generateSeed("lightspeed", true, namespace)).response;

            if(seed.patch) {
                socket.sendMessage({action: "setinfo", data: {info_bot: `lightspeed - https://avianart.games/perm/${seed.hash} - (${this.formatHashForRacetime(seed.spoiler.meta.hash.replaceAll(", ", "/"))})`}});
                socket.sendMessage({action: "message", data:{message: `https://avianart.games/perm/${seed.hash}`, guid: Math.round(Math.random() * 10000) + ""}});
                socket.sendMessage({action: "message", data:{message: `Generation complete. Enjoy your seed!`, guid: Math.round(Math.random() * 10000) + ""}});
            } else {
                socket.sendMessage({action: "message", data:{message: "Failed to generate seed, please try again later :(", guid: Math.round(Math.random() * 10000) + ""}});
            }
        }
    }


    //TODO, make this less bad
    private formatHashForRacetime(hash): string {
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