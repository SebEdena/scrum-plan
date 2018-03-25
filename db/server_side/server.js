const https = require('https');
const fs = require('fs');

let options = {
  key: fs.readFileSync('./ssl/prv/ca.key'),
  cert: fs.readFileSync('./ssl/ca.crt'),
  passphrase: JSON.parse(fs.readFileSync('./ssl/prv/caSettings.json')).passphrase
}, serverPort = 7000;

let server = https.createServer(options, handler).listen(serverPort);
let io = require('socket.io')(server);

function handler(req, res){
    res.writeHead(200);
    res.end("<h1>Hello</h1>");
}
