// const https = require('https');
const http = require('http');
const fs = require('fs');
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// let options = {
//     pfx: fs.readFileSync('./ssl/cert.pfx'),
//     requestCert: false,
//     passphrase: JSON.parse(fs.readFileSync('./ssl/certSettings.json')).passphrase,
//     rejectUnauthorized: false
// };
let serverPort = 7000;

global.online = false;

// let server = https.createServer(options, handler).listen(serverPort);
let server = http.createServer(handler).listen(serverPort);
function handler(req, res){
    res.writeHead(global.online?200:503);
    res.end();
}

require('./core')(server);
