import { Embed, GuildBasedChannel, GuildChannel, Role, TextChannel, User } from "discord.js";
import * as Config from '../../config.json';

export enum LogLevel {
    FATAL= -1,
    ERROR= 0x00,
    WARN = 0x01,
    INFO = 0x02,
    DEBUG= 0x03,
    TRACE= 0x04,
}

interface Logging {
    trace(loggingData: any, caller: object): void;
    debug(loggingData: any, caller: object): void;
    info(loggingData: any, caller: object): void;
    warn(loggingData: any, caller: object): void;
    error(loggingData: any, caller: object): void;
    fatal(loggingData: any, caller: object): void;
}

interface LeveledLogger {
    setLevel(level: LogLevel): void;
}

abstract class BaseLogger implements Logging, LeveledLogger {
    level: LogLevel = LogLevel.ERROR;
    
    setLevel(level: LogLevel) {
        this.level = level;
    }

    abstract trace(loggingData: any, caller?: object);
    abstract debug(loggingData: any, caller?: object);
    abstract info(loggingData: any, caller?: object);
    abstract warn(loggingData: any, caller?: object);
    abstract error(loggingData: any, caller?: object);
    abstract fatal(loggingData: any, caller?: object);
}


class ConsoleLogger extends BaseLogger {
    level: LogLevel = LogLevel.TRACE;

    trace(loggingData: any, caller?: object): void {
        if(this.level >= LogLevel.TRACE)
            console.info(this.getTimestamp(), `[TRACE] ${caller ? '['+caller.constructor.name+']' : ''}`, loggingData);
    }

    debug(loggingData: any, caller?: object): void {
        if(this.level >= LogLevel.DEBUG)
            console.debug(this.getTimestamp(), `[DEBUG] ${caller ? '['+caller.constructor.name+']' : ''}`, loggingData);
    }
    
    info(loggingData: any, caller?: object): void {
        if(this.level >= LogLevel.INFO)
            console.info(this.getTimestamp(), `[INFO] ${caller ? '['+caller.constructor.name+']' : ''}`, loggingData);
    }
    
    warn(loggingData: any, caller?: object): void {
        if(this.level >= LogLevel.WARN)
            console.warn(this.getTimestamp(), `[WARN] ${caller ? '['+caller.constructor.name+']' : ''}`, loggingData);
    }

    error(loggingData: any, caller?: object): void {
        if(this.level >= LogLevel.ERROR)
            console.error(this.getTimestamp(), `[ERROR] ${caller ? '['+caller.constructor.name+']' : ''}`, loggingData);
    }

    fatal(loggingData: any, caller?: object): void {
        console.error(this.getTimestamp(), `[FATAL] ${caller ? '['+caller.constructor.name+']' : ''}`, loggingData);
    }

    private getTimestamp() {
        const date = new Date();
        return date.toISOString();
    }
}

export class DiscordLogger extends BaseLogger {
    level: LogLevel = LogLevel.WARN;
    channel: GuildBasedChannel;
    importantRoles: string[];
    rolesString: string;

    constructor(channel: GuildBasedChannel, importantRoles: string[]) {
        super();
        this.channel = channel;
        this.importantRoles = importantRoles;
        this.importantRoles.forEach((role) => {
            this.rolesString += `<@&${role}>`;
        });
    }

    trace(loggingData: any, caller?: object) {
        if(this.level >= LogLevel.TRACE)
            (this.channel as TextChannel).send(`[TRACE] ${caller ? '['+caller.constructor.name+'] ' : ''}` + loggingData.toString());
    }

    debug(loggingData: any, caller?: object) {
        if(this.level >= LogLevel.DEBUG)
            (this.channel as TextChannel).send(`[DEBUG] ${caller ? '['+caller.constructor.name+'] ' : ''}` + loggingData.toString());
    }

    info(loggingData: any, caller?: object) {
        if(this.level >= LogLevel.INFO)
            (this.channel as TextChannel).send(`[INFO] ${caller ? '['+caller.constructor.name+'] ' : ''}` + loggingData.toString());
    }

    warn(loggingData: any, caller?: object) {
        if(this.level >= LogLevel.WARN)
            (this.channel as TextChannel).send(`[WARN] ${caller ? '['+caller.constructor.name+'] ' : ''}` + loggingData.toString());
    }

    error(loggingData: any, caller?: object) {
        if(this.level >= LogLevel.ERROR)
            (this.channel as TextChannel).send(`[ERROR] ${caller ? '['+caller.constructor.name+'] ' : ''}` + loggingData.toString());
    }

    fatal(loggingData: any, caller?: object) {
        (this.channel as TextChannel).send(`[FATAL] ${caller ? '['+caller.constructor.name+'] ' : ''}` + ` ${this.rolesString} ` + loggingData.toString());
    }
}

export default class Logger extends BaseLogger implements Logging {
    targets: Logging[] = [];

    constructor() {
        super();
        this.targets.push(new ConsoleLogger());
    }

    trace(loggingData: any, caller?: object) {
        this.targets.forEach((target) => {
            target.trace(loggingData, caller);
        })
    }

    debug(loggingData: any, caller?: object) {
        this.targets.forEach((target) => {
            target.debug(loggingData, caller);
        })
    }
    
    info(loggingData: any, caller?: object) {
        this.targets.forEach((target) => {
            target.info(loggingData, caller);
        })
    }
    
    warn(loggingData: any, caller?: object) {
        this.targets.forEach((target) => {
            target.warn(loggingData, caller);
        })
    }
    
    error(loggingData: any, caller?: object) {
        this.targets.forEach((target) => {
            target.error(loggingData, caller);
        })
    }

    fatal(loggingData: any, caller?: object) {
        this.targets.forEach((target) => {
            target.fatal(loggingData, caller);
        })
    }

    addTarget(logger: BaseLogger) {
        this.targets.push(logger);
    }
}