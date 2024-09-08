import { LoggedManager } from "./LoggedManager";
import * as Config from "../../config.json";
import { Attachment } from "discord.js";

export enum AvianGenStatus {
    PREGEN      = "pregeneration",
    GENERATION  = "generating",
    POSTGEN     = "postgen",
    FAILURE     = "failure"
}

export type AvianResponsePayload = {
    status?: AvianGenStatus,
    hash: string,
    attempts: number,
    message: string
    starttime?: number,
    basepatch?: {
        bps: string
    },
    type?: string,
    bps_t0_p1?: string,
    spoiler?: {
        meta: {
            [key: string]: any
        }
    },
    meta?: {
        startgen: number,
        gentime: number,
    },
    patch?: {}
}

export type AvianGenPayload = {
    status: number,
    response: AvianResponsePayload
}

export type AvianCreatePayload = {
    status: number,
    response: {
        namespace: string
    }
}

export class Avianart extends LoggedManager {
    constructor(client) {
        super(client);
    }

    private async sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async generateSeed(preset: string, race: boolean, namespace?: string | undefined): Promise<AvianGenPayload> {
        this.logger.debug(`Generating ${race ? 'race ' : ''}seed using ${namespace ? namespace + '/' : ''}${preset}...`, this);
        
        let seedParams = {};
        
        if(race)
            seedParams['race'] = true;
        if(namespace)
            seedParams['namespace'] = namespace;

        let seedRequest: RequestInit = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': Config.avianart.api.key
            },
            body: JSON.stringify([{args: seedParams}])
        };
        let genResponse = await fetch(`${Config.avianart.api.url}?action=generate&preset=${preset}`, seedRequest);
        let genstatus = await genResponse.json() as AvianGenPayload;
        if(genstatus.status != 200) {
            this.logger.error([genstatus.response.message, seedRequest.body], this);
            this.logger.error(`Failed to generate seed using ${namespace ? namespace + '/' : ''}${preset}!`, this);
            return;
        }
        let hash = genstatus.response.hash;
        let genStatus = AvianGenStatus.PREGEN;
        while(genStatus !== AvianGenStatus.FAILURE) {
            await this.sleep(5000);
            let status = await this.fetchPermlink(hash);
            if(!status.response.status) {
                //Probably complete
                if(status.response.patch) {
                    this.logger.info(`Seed generation complete!`, this);
                    return status;
                }
            }
            genStatus = status.response.status;
            this.logger.trace(`Generation status for ${hash}: ${genStatus}`, this);
        }

        this.logger.error(`Failed to generate seed using ${namespace ? namespace + '/' : ''}${preset}!`, this);
        return null;
    }

    async createPreset(user: string, yaml: Attachment, name: string, notes: string, branch: string): Promise<AvianCreatePayload> {
        const payload = {
            yaml: yaml.url,
            name: name,
            notes: notes,
            branch: branch
        }

        const createRequest: RequestInit = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': Config.avianart.api.key,
                'x-api-key': Config.avianart.api.key
            },
            body: JSON.stringify([payload])
        };

        const createResponse = await fetch(`${Config.avianart.api.url}?action=createpreset&namespace=` + user, createRequest);
        const createStatus = await createResponse.json() as AvianCreatePayload;

        if(createStatus.status != 200) {
            this.logger.error([createStatus.response, createRequest.body], this);
            this.logger.error(`Failed to create preset ${name} in ${branch} for ${user}!`, this);
            return null;
        }
        this.logger.debug(`Preset ${name} created in ${branch} for ${user}!`, this);
        return createStatus;
    }

    async fetchPermlink(hash: string): Promise<AvianGenPayload> {
        this.logger.trace(`Fetching permlink for ${hash}...`, this);

        let statusRequest: RequestInit = {
            method: 'GET',
            headers: {
                'Authorization': Config.avianart.api.key
            }
        };
        
        let permlinkRaw = await fetch(`${Config.avianart.api.url}?action=permlink&hash=${hash}`, statusRequest);
        let permlink = await permlinkRaw.json() as AvianGenPayload;
        
        return permlink;
    }
}