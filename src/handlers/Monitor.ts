import { LoggedManager } from "./LoggedManager";
import { createServer, Server } from "http";
import { RacetimeBot } from "./Racetime";

export class UptimeMonitor extends LoggedManager {
    private server: Server;
    private racetime: RacetimeBot;

    private discordOnline = false;
    private port = 8008;

    constructor(racetime: RacetimeBot, client) {
        super(client);
        this.racetime = racetime;
        this.server = createServer(async (req, res) => {
            if (req.url == '/ping') {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.write(JSON.stringify({"reply": "pong"}));
              res.end();
            } else if (req.url == '/racetime') {
              if(this.racetime.online) {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.write(JSON.stringify({"reply": "pong"}));
              } else {
                  res.writeHead(502, { 'Content-Type': 'application/json' });
                  res.write(JSON.stringify({"reply": "down", "error": "Racetime API is down"}));
              }
          
              res.end();
            } else if (req.url == '/discord') {
              let user;
              let lastError;
              try {
                  user = await client.user.fetch(true);
                  if(user.id !== undefined)
                      this.discordOnline = true;
              } catch(e) {
                  this.discordOnline = false;
                  lastError = e;
              }
              if(this.discordOnline) {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.write(JSON.stringify({"reply": "pong"}));
              } else {
                  res.writeHead(502, { 'Content-Type': 'application/json' });
                  res.write(JSON.stringify({"reply": "down", "error": lastError}));
              }
              
              res.end();
            } else {
              res.writeHead(403, { 'Content-Type': 'text/plain' });
              res.write("403");
              res.end();
            }
          }).listen(this.port, () => console.log(`Listening on port ${this.port}`));
    }
}