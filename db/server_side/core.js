const async = require('async');
const fs = require('fs');
const pg = require('pg');
const DBSocketLinker = require('./db');
let io = null, server = null, db = null, connectionSettings = null;

const credentialsRules = {
    properties: ['user', 'password', 'host', 'port', 'database']
};
const connPath = './settings/settings_offline.json'; //File of db credentials;

module.exports = init;

function init(server){
    this.server = server;
    io = require('socket.io')(server, {path: "/scrum"});
    console.log('Server ready. Attempting to reach the database.');
    async.waterfall([
        db_credentials,
        db_client,
        db_connect,
        db_realtime
    ], (err, res)=>{
        if(err){
            console.error('Database not in ready state. ' + err);
            db_status(false);
        }else{
            db_status(true);
            console.log("Database ready.");
            init_events();
        }
    });
}

function init_events(){
    io.on('connection', (socket)=>{
        console.log("connect : " + socket.id);
        if(!global.online){
            socket.emit('srvError', 'DB_UNAVAILABLE');
        }else{
            new DBSocketLinker(db, socket, io);
            socket.emit('srvInfo', 'DB_OK');
        }
        socket.on("disconnect", (reason)=>{
            console.log("disconnect : " + socket.id);
        });
    });
}

function db_credentials(callback){
    fs.readFile(connPath, (err, data) => {
        if (err){
            callback(err);
        } else {
            try{
                connectionSettings = JSON.parse(data);
                for(let property of credentialsRules.properties){
                    if(!connectionSettings.hasOwnProperty(property)){
                        throw new Error('Missing credential property \"'+property+'\"');
                        return;
                    }
                }
                callback(null);
            }catch(err){
                callback(err);
            }
        }
    });
}

function db_client(callback){
    db = new pg.Client(connectionSettings);
    db.on('error', (err) => {
        switch(err.code){
            case "57P01": db_status(false);
            default: break;
        }
    });
    callback(null);
}

function db_connect(callback){
    db.connect((err) => {
        err?callback(err):callback(null);
    });
}

function db_realtime(callback){
    db.query("LISTEN insert; LISTEN update; LISTEN delete", (err,res) => {
        if(err){
            callback(err);
        }
    });
    db.on("notification", (data) => {
        let item = JSON.parse(data.payload);
        let type = String(Object.keys(item[0])[0]);
        io.sockets.emit(data.channel, {type: type, data:item[0][type]});
    });
    callback(null);
}

function db_status(online){
    console.log('Switching db status to online='+online);
    global.online = online;
    if(!online){
        console.log('Database connection unavailable');
        io.sockets.emit('srvError', 'DB_CONN_LOST');
    }
}
