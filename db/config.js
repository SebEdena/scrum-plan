/**
 * @file config.js
 * Module for communication with the server
 * @author Sébastien Viguier
 * @module config.js
 */
'use strict';
const fs = require('fs'); //File system : read/write
const {ipcMain, dialog} = require('electron');
const io = require('socket.io-client');
const connPath = './settings.json'; //File of db credentials
const credentialsRules = {
    properties: ['uri']
};
let socket = null, serverSettings = null;

let view = null, channel_send = null, app = null;

/**
 * @function init_client
 * @description Initializes the socket that will connect to the server
 * @param callback - The callback that will be called at the end
 * @listens socket:error - Any error in the communication with the server
 * @listens socket:srvError - An error linked to the database unavailability
 * @see sendAppError
 */
function init_client(callback){
    socket = io(serverSettings.uri,
        {path:"/scrum", autoConnect: false, reconnection: false});
    socket.on('error', (err)=>{
        sendAppError(err.description.code);
    });
    socket.on('srvError', (err)=>{
        if(err !== "DB_UNAVAILABLE"){
            sendAppError(err);
        }
    });
    callback(null);
}

/**
 * @function sendAppError
 * @description Sends an error dialog to the app for errors that could happen at any time
 * @param type - The error type
 */
function sendAppError(type){
    let msg = "Error : an unknown error occured.";
    switch(type){
        case "ECONNRESET": msg = 'Connection with server interrupted. The application will quit.'; break;
        case "DB_CONN_LOST": msg = 'Server lost connection with the database. The application will quit.'; break;
        default: break;
    }
    dialog.showMessageBox({
        title: "Scrum Assistant",
        type: 'error',
        buttons: ['Ok'],
        message: msg,
    }, resp => {
        if (resp === 0) {
            app.quit();
        }
    });
}

/**
 * @function needsNotification
 * @description Checks if the realtime notification needs to be notified to frontend
 * @param type - The type of notification : update, delete, insert
 * @param date - The data of the notification
 * @returns true if is needed, or false if not
 */
function needsNotification(type, data){
    if(type === "projects"){
        return true;
    }else{
        if(global.data.current){
            return data.project === global.data.current.id;
        }else{
            return false;
        }
    }
}

/**
 * @function fetch
 * @description Asks to load a particular type of object from the server.
 * @param type - The type of data that needs to be fetched
 * @param data - The data associated to the type
 * @returns true if the type of data has already been loaded, false if not.
 */
function fetch(type, data){
    if(!global.loaded[type]){
        load(type);
        return false;
    }else{
        return true;
    }
}

/**
 * @function load
 * @description Ask the server to load a particular type of object from the server
 * @param type - The type of data that needs to be loaded
 * @fires socket:load
 * @see loaded
 */
function load(type){
    let data = {};
    if(global.data.current) data.project = global.data.current.id;
    socket.emit('load', {type: type, data: data});
}

/**
 * @function loaded
 * @description Function call when a type of data has been retrieved from the server
 * @param args - The raw data
 * @param cb - The callback that will be called at the end
 * @see socket:loaded
 */
function loaded(args, cb){
    if(['user_stories', 'projects', 'sprints', 'us_sprints'].includes(args.type)){
        for(let obj of args.data){
            global.data[args.type][obj.id] = obj;
        }
        if(!global.loaded[args.type]){
            global.loaded[args.type] = true;
            cb(true);
        }else{
            cb(false);
        }
    }else{
        if(['post_its', 'dailys'].includes(args.type)){
            for(let obj of args.data){
                if(!global.data[data.type].hasOwnProperty(obj.sprint)){
                    global.data[data.type][obj.sprint] = {};
                }
                global.data[data.type][obj.sprint][obj.id] = obj;
            }
            if(!global.loaded[args.type]){
                global.loaded[args.type] = true;
                cb(true);
            }else{
                cb(false);
            }
        }else{
            cb(false);
        }
    }
}

/**
 * @function create
 * @description Ask the server to create a new object
 * @param type - The type of data that needs to be inserted
 * @param data - The data to be inserted
 * @fires socket:create
 */
function create(type, data){
    if(global.data.current) data.project = global.data.current.id;
    socket.emit('create', {type:type, data:data});
}

/**
 * @function update_item
 * @description Updates or inserts a specific item in the global.data JSON array
 * @param item - The item to be updated or inserted
 * @param type - The type of the item
 * @param callback - The callback that will be called at the end
 */
function update_item(item, type, callback){
    if(['user_stories', 'projects', 'sprints', 'us_sprints'].includes(type)){
        global.data[type][item.id] = item;
    }
    if(['post_its', 'dailys'].includes(type)){
        global.data[type][item.sprint][item.id] = item;
    }
    callback();
};

/**
 * @function delete_item
 * @description Deletes a specific item in the global.data JSON array
 * @param item - The item to be deleted
 * @param type - The type of the item
 * @param callback - The callback that will be called at the end
 */
function delete_item(item, type, callback){
    if(['user_stories', 'projects', 'sprints', 'us_sprints'].includes(type)){
        if(global.data[type].hasOwnProperty(item.id)){
            delete global.data[type][item.id];
        }
    }
    if(['post_its', 'dailys'].includes(type)){
        if(global.data[type].hasOwnProperty(item.sprint) &&
            global.data[type][item.sprint].hasOwnProperty(item.id)){
            delete global.data[type][item.sprint][item.id];
        }
    }
    callback();
}

/**
 * @function
 * @description EVENT HANDLER - Defines behaviour on create item event
 * @listens ipcMain:create
 * @param event - The event
 * @param args - Parameters of the event
 * @see create
 */
ipcMain.on("create", (event, args) => {
    create(args.type, args.data);
});

/**
 * @function
 * @description EVENT HANDLER - Defines behaviour on open project event
 * @listens ipcMain:open_project
 * @param event - The event
 * @param args - Parameters of the event
 */
ipcMain.on("open_project", (event, args)=>{
    for(let i in global.data['projects']){
        if(args.id === global.data['projects'][i].id){
            global.data['current'] = global.data['projects'][i];
            break;
        }
    }
    view.loadURL('file://' + __dirname + '/../app/html/workspace.html');
});

/**
 * @function
 * @description EVENT HANDLER - Defines behaviour on fetch data event
 * @listens ipcMain:fetch
 * @param event - The event
 * @param args - Parameters of the event
 * @fires ipcRenderer:fetched - When the type of data has already been fetched
 * @see fetch
 */
ipcMain.on("fetch", (event, args) => {
    if(fetch(args.type, args.data)) channel_send.send("fetched", {type: args.type});
});

/**
 * @function
 * @description EVENT HANDLER - Defines behaviour on load data event
 * @listens ipcMain:load
 * @param event - The event
 * @param args - Parameters of the event
 * @see load
 */
ipcMain.on("load", (event, args) => {
    load(args.type);
});

/**
 * @function
 * @description EVENT HANDLER - Defines behaviour on update data event
 * @listens ipcMain:update
 * @param event - The event
 * @param args - Parameters of the event
 * @fires socket:update
 */
ipcMain.on('update', (event, args) => {
    if(global.data.current) args.data.project = global.data.current.id;
    socket.emit('update', args);
});

/**
 * @function
 * @description EVENT HANDLER - Defines behaviour on delete data event
 * @listens ipcMain:delete
 * @param event - The event
 * @param args - Parameters of the event
 * @fires socket:delete
 */
ipcMain.on('delete', (event, args) => {
    if(global.data.current) args.data.project = global.data.current.id;
    socket.emit('delete', args);
});

/**
 * @function initSocketEvents
 * @description Initializes events coming from the server
 * @param cb - The callback that will be called at the end
 * @listens socket:loaded - When data has been loaded
 * @listens socket:created - When data has been created by the app
 * @listens socket:insert - When data has been created by any app
 * @listens socket:update - When data has been updated by any app
 * @listens socket:delete - When data has beed deleted by any app
 * @listens socket:dbError - When an error happend with a SQL query
 * @fires ipcRenderer:loaded - To inform the app that data is ready
 * @fires ipcRenderer:fetched - To inform the app that data has been fetched
 * @fires ipcRenderer:created - To inform the app that data has been created
 * @fires ipcRenderer:insert - To inform the app that data has been inserted
 * @fires ipcRenderer:update - To inform the app that data has been updated
 * @fires ipcRenderer:delete - To inform the app that data has been deleted
 * @fires ipcRenderer:error - To inform the app of any error with the data
 * @see needsNotification
 * @see loaded
 * @see update_item
 * @see delete_item
 */
function initSocketEvents(cb){

    socket.on('loaded', (args)=>{
        loaded(args, (sendFetch)=>{
            args.data = null;
            channel_send.send('loaded', args);
            if(sendFetch) channel_send.send('fetched', args);
        });
    });

    socket.on('created', (args)=>{
        channel_send.send('created', args);
    });

    socket.on('insert', (args)=>{
        if(needsNotification(args.type, args.data)){
            update_item(args.data, args.type, ()=>{
                channel_send.send('insert', args);
            });
        }
    });

    socket.on('update', (args)=>{
        if(needsNotification(args.type, args.data)){
            update_item(args.data, args.type, ()=>{
                channel_send.send('update', args);
            });
        }
    });

    socket.on('delete', (args)=>{
        if(needsNotification(args.type, args.data)){
            delete_item(args.data, args.type, ()=>{
                channel_send.send('delete', args);
            });
        }
    });

    socket.on('dbError', (args)=>{
        if(needsNotification(args.type, args.data)) channel_send.send('error', args);
    });

    cb(null);
}

/**
 * All the functions that will be exported from the module
 */
module.exports = {

    /**
     * @function verify_credentials
     * @description Checks that the given server credentials are correct
     * @param callback - The callback that will be called at the end
     */
    verify_credentials: function(callback){
        fs.readFile(connPath, (err, data) => {
            if (err) callback(err);
            try{
                serverSettings = JSON.parse(data);
                for(let property of credentialsRules.properties){
                    if(!serverSettings.hasOwnProperty(property)){
                        callback(new Error('Missing credential property \"'+property+'\"'));
                        return;
                    }
                }
                callback(null);
            }catch(err){
                callback(err);
            }
        });
    },

    /**
     * @function init
     * @description Initializes the module
     * @param front - The BrowserWindow instance of the application (GUI object)
     * @param appli - Instance of the app object
     * @param callback - The callback that will be called at the end
     */
    init: function(front, appli, callback){
        view = front;
        channel_send = front.webContents;
        app = appli;
        init_client((err)=>{
            callback(err);
        });
    },

    /**
     * @function connect
     * @description Asks the client to connect to the server and register associated events
     * @param callback - The callback that will be called at the end
     * @listens socket:connect_error - When an error occured with the connection
     * @listens socket:srvError - When the server has issues with the database
     * @listens socket:srvInfo - When the server can serve the client
     */
    connect: function(callback){
        socket.connect();
        socket.on('connect_error', (err) => {
            callback(err);
        });
        socket.on('srvError', (err)=>{
            if(err === "DB_UNAVAILABLE"){
                callback(err);
            }
        });
        socket.on('srvInfo', (status) => {
            callback(null);
        });
    },

    /**
     * @function init_events
     * @desc Calls the functions for event definition.
     * @param cb - The callback that will be called at the end
     * @see initSocketEvents
     */
    init_events: function(cb){
        initSocketEvents(cb);
    },

    /**
     * @function disconnect
     * @description Asks the client to disconnect from the socket
     */
    disconnect: function(){
        socket.close();
    }
};

var require = function(path) {
    return module.exports;
};
