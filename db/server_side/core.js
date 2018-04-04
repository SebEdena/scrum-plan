/**
 * @file core.js
 * Module for core database interactions
 * @author Sébastien Viguier
 * @module core.js
 */
const async = require('async'); //asynchronous utilities
const fs = require('fs'); //filesystem access
const pg = require('pg'); //Postgres for node.js
const DBSocketLinker = require('./db'); //Class defining interactions for each connected client
let io = null, server = null, db = null, pool = null, connectionSettings = null;

const credentialsRules = {
    properties: ['user', 'password', 'host', 'port', 'database']
};
const connPath = './settings/settings_offline.json'; //File of db credentials;

module.exports = init; //Using require will automatically call this function

/**
 * @function init
 * @description Initializes the module
 * @param server - The Node.Js HTTP(s) server instance
 * @see db_status
 * @see init_events
 */
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
            pool = new pg.Pool(Object.assign({max:10,
                                              idleTimeoutMillis: 2000},
                                              connectionSettings));
            db_status(true);
            console.log("Database ready.");
            init_events();
        }
    });
}

/**
 * @function init_events
 * @description Initializes the events that the module will listen to
 * @listens io#connection - Everytime a new socket is created from a client app
 * @listens io#disconnect - Everytime a socket is disconnected from a client app
 * @listens pool#error - Any error from the pool of client available for client apps
 * @fires socket#srvError - To inform a client of the server being unavailable
 * @fires socket#srvInfo - To inform a client of the server availability
 * @see DBSocketLinker
 */
function init_events(){
    io.on('connection', (socket)=>{
        console.log("connect : " + socket.id);
        if(!global.online){
            socket.emit('srvError', 'DB_UNAVAILABLE');
        }else{
            new DBSocketLinker(pool, socket, io);
            socket.emit('srvInfo', 'DB_OK');
        }
        socket.on("disconnect", (reason)=>{
            console.log("disconnect : " + socket.id);
        });
    });
    pool.on('error', (err, cli)=>{
        console.log(err);
    });
}

/**
 * @function db_credentials
 * @description Checks that the given database credentials are correct
 * @param callback - The callback that will be called at the end
 */
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

/**
 * @function db_client
 * @description Initializes the server's client that will connect to the database
 * @listens error from PostgreSQL
 * @param callback - The callback that will be called at the end
 */
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

/**
 * @function db_connect
 * @description Asks the server's client to connect to the database
 * @param callback - The callback that will be called at the end
 */
function db_connect(callback){
    db.connect((err) => {
        err?callback(err):callback(null);
    });
}

/**
 * @function db_realtime
 * @description Initializes the realtime data management
 * @listens notification from PostgreSQL
 * @param callback - The callback that will be called at the end
 * @fires io#insert|update|delete - The notification to send to the clients
 */
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

/**
 * @function db_status
 * @description Switches the database availability status for the server
 * @param online - The status of the database to switch
 * @fires io#srvError when database availability is switched to false
 */
function db_status(online){
    console.log('Switching db status to online='+online);
    global.online = online;
    if(!online){
        console.log('Database connection unavailable');
        io.sockets.emit('srvError', 'DB_CONN_LOST');
    }
}
