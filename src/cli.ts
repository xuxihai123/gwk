import commander from 'commander';
import fs from 'fs';
import path from 'path';
import Client from './Client';
import Server from './Server';
import { genSubdomain } from './utils/subdomain';
import { TunnelOpts } from './types';
import { readFile } from './utils/readfile';

const pkgObj = readFile(path.resolve(__dirname, '../package.json'), true);

const isServer = process.env.GWK_SERVER;

if (isServer) {
    startServer();
} else {
    startClient();
}
commander.version(pkgObj.version);
commander.parse(process.argv);
// if (!process.argv.slice(2).length) {
//     commander.outputHelp();
// }

function startServer() {
    commander
        .description('Starts the gwk server')
        .option('-c, --config <path>', 'Path to the server configuration file')
        .action((cmd: any) => {
            const configPath = cmd.config || 'server.json';
            console.log(`Starting gwk server with config: ${configPath}`);
            const serverOpts = readFile(configPath, true);
            if (serverOpts.tlsCrt) {
                serverOpts.tlsCrt = readFile(serverOpts.tlsCrt);
                serverOpts.tlsKey = readFile(serverOpts.tlsKey);
            }
            if (serverOpts.tlsCA) {
                serverOpts.tlsCA = readFile(serverOpts.tlsCA);
            }
            const server = new Server(serverOpts);

            server.bootstrap();
        });
}

function startClient() {
    commander
        .description('Starts the gwk client')
        .option('-c, --config <path>', 'Path to the client configuration file')
        .option('-p, --port <port>', 'set web tunnel local port')
        .option('-s, --subdomain <subdomain>', 'set web tunnel subdomain')
        .action((cmd: any) => {
            const configPath = cmd.config;
            let clientOpts: any = {};
            if (configPath) {
                console.log(`Starting gwk client with config: ${configPath}`);
                clientOpts = readFile(configPath, true);
            } else {
                console.log(`Starting gwk client.`);
                const subdomain = cmd.subdomain || genSubdomain();
                const tunnelItem: TunnelOpts = { protocol: 'web', tunType: 0x2, subdomain, localIp: '127.0.0.1', localPort: cmd.port || 8080, name: 'unnamed', status: 'init' };
                clientOpts.tunnels = { [tunnelItem.name as string]: tunnelItem };
            }

            if (!clientOpts.serverHost) {
                clientOpts.serverHost = 'gank.75cos.com';
                clientOpts.serverPort = 4443;
            }
            Object.keys(clientOpts.tunnels).forEach((key) => {
                const temp = clientOpts.tunnels[key];
                temp.name = key;
                const protocol = temp.protocol;
                temp.tunType = protocol === 'tcp' ? 0x1 : protocol === 'web' ? 0x2 : protocol === 'udp' ? 0x3 : 0x4;
                if (!temp.localIp) {
                    temp.localIp = '127.0.0.1';
                }
            });
            const client = new Client(clientOpts);
            client.bootstrap();
        });
}
