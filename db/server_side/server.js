/**
 * @file server.js
 * Main Node.js file for server side
 * @description Defines the actions on server startup
 * @author Sébastien Viguier
 * @see core.js
 */
// const https = require('https');
const http = require('http');
// const fs = require('fs');
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// let options = {
//     pfx: fs.readFileSync('./ssl/cert.pfx'),
//     requestCert: false,
//     passphrase: JSON.parse(fs.readFileSync('./ssl/certSettings.json')).passphrase,
//     rejectUnauthorized: false
// };
let serverPort = 7000; //listening port

global.online = false; //variable for db status

// let server = https.createServer(options, handler).listen(serverPort);
let server = http.createServer(handler).listen(serverPort);
function handler(req, res){
    res.writeHead(global.online?200:503);
    res.end();
}

require('./core')(server); //calling the core.js file with server as a parameter
