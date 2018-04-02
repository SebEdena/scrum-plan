/**
 * @file config.js
 * Module for datbase handling
 * @author Sébastien Viguier
 * @module config.js
 */
'use strict';
const pg = require('pg'); //Postgres for node.js
const fs = require('fs'); //File system : read/write
const {ipcMain, dialog} = require('electron');
const io = require('socket.io-client');
const connPath = './settings.json'; //File of db credentials
const credentialsRules = {
    properties: ['uri']
};
let socket = null, serverSettings = null;

let client = null, view = null, channel_send = null, app = null;

/**
 * @function init_client
 * @description Initializes the client that will connect to the database
 * @param callback - The callback that will be called at the end
 */
function init_client(callback){
    socket = io(serverSettings.uri,
        {path:"/scrum", autoConnect: false, reconnection: false});
    // client = new pg.Client(connectionSettings);
    socket.on('error', (err)=>{
        console.log('error event');
        console.log(err);
        sendAppError(err.description.code);
    });
    socket.on('srvError', (err)=>{
        if(err !== "DB_UNAVAILABLE"){
            sendAppError(err);
        }
    });
    // client.on('error', (err) => {
    //     switch(err.code){
    //         case "57P01":
    //             dialog.showMessageBox({
    //                 title: "Scrum Assistant",
    //                 type: 'error',
    //                 buttons: ['Ok'],
    //                 message: 'Connection with server interrupted. The application will quit.',
    //             }, resp => {
    //             if (resp === 0) {
    //                 app.quit();
    //             }
    //         });
    //     }
    // });
    callback(null);
}

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
 * @description Asks to load a particular type of object from database.
 * If it is already loaded, it does not do anything but calling the callback
 * @param type - The type of data that needs to be fetched
 * @param cb - The callback that will be called at the end
 */
function fetch(type, data){
    if(!global.loaded[type]){
        load(type);
        return false;
    }else{
        return true;
    }
}

// /**
//  * @function fetch
//  * @description Asks to load a particular type of object from database.
//  * If it is already loaded, it does not do anything but calling the callback
//  * @param type - The type of data that needs to be fetched
//  * @param cb - The callback that will be called at the end
//  */
// function fetch(type, cb){
//     if(!global.loaded[type]){
//         load(type, (err)=>{
//             cb(err);
//         });
//     }else{
//         cb(null);
//     }
// }

/**
 * @function load
 * @description Load a particular type of object from database
 * @param type - The type of data that needs to be loaded
 * @param cb - The callback that will be called at the end
 */
function load(type){
    let data = {};
    if(global.data.current) data.project = global.data.current.id;
    socket.emit('load', {type: type, data: data});
}

function loaded(args, cb){
    for(let obj of args.data){
        global.data[args.type][obj.id] = obj;
    }
    if(!global.loaded[args.type]){
        global.loaded[args.type] = true;
        cb(true);
    }else{
        cb(false);
    }
}

// /**
//  * @function load
//  * @description Load a particular type of object from database
//  * @param type - The type of data that needs to be loaded
//  * @param cb - The callback that will be called at the end
//  */
// function load(type, cb){
//     let query = null;
//     switch (type) {
//         case "projects": query = {
//                             name: 'fetch-projects',
//                             text: 'SELECT * FROM projects p ORDER BY p.id'
//                          };
//                          break;
//         case "user_stories": query = {
//                                     name: 'fetch-all-user-stories',
//                                     text: 'SELECT us.* FROM user_stories us WHERE us.project=$1 ORDER BY us.id',
//                                     values: [global.data.current.id]
//                              };
//                              break;
//         case "sprints": query = {
//                             name: 'fetch-all-sprints',
//                             text: 'SELECT sp.* FROM sprints sp WHERE sp.project=$1 ORDER BY sp.id',
//                             values: [global.data.current.id]
//                         };
//         default: break;
//     }
//     if(query){
//         client.query(query, (err, res) => {
//             if(err){
//                 cb(err);
//             } else {
//                 for(let obj of res.rows){
//                     global.data[type][obj.id] = obj;
//                 }
//                 cb(null);
//             }
//         });
//     }
// }

/**
 * @function create
 * @description Inserts a new row in the database corresponding to an object
 * @param type - The type of data that needs to be inserted
 * @param data - The data to be inserted
 * @param callback - The callback that will be called at the end
 */
function create(type, data){
    if(global.data.current) data.project = global.data.current.id;
    socket.emit('create', {type:type, data:data});
}

// /**
//  * @function create
//  * @description Inserts a new row in the database corresponding to an object
//  * @param type - The type of data that needs to be inserted
//  * @param data - The data to be inserted
//  * @param callback - The callback that will be called at the end
//  */
// function create(type, data, callback){
//     let query = null;
//     switch(type){
//         case "project": query = {
//                         name: "create-project",
//                         text: "INSERT INTO projects(title, description) VALUES ($1, $2) RETURNING projects.*",
//                         values: [data.title, data.description]
//                         };
//                         break;
//         case "us": query = {
//                       name: "create-user-story",
//                       text: "INSERT INTO user_stories (feature, logs, estimate, project) VALUES ($1, $2, $3, $4) RETURNING user_stories.*",
//                       values: [data.feature, data.logs, data.estimate, data.project]
//                       };
//                       break;
//         case "sprint": query = {
//                         name: "create-sprint",
//                         text: "INSERT INTO sprints (project) VALUES ($1) RETURNING sprints.*",
//                         values: [data.project]
//                         };
//                         break;
//         default: break;
//     }
//     client.query(query, (err, res) => {
//         if(err){
//             callback(err); return;
//         }
//         callback(res.rows[0]);
//     });
// }

// /**
//  * @function dispatch_action
//  * @description Makes a decision when the real time system receives a notification
//  * @param item - The item concerned by the notification
//  * @param type - The type of the concerned item
//  * @param action - The action to be performed
//  * @param callback - The callback that will be called at the end
//  * @see init_realtime
//  */
// function dispatch_action(item, type, action, callback){
//     if(action === "insert" || action === "update"){
//         update_item(item, type, ()=>{
//             callback();
//         });
//     }
//     if(action === "delete"){
//         delete_item(item, type, () => {
//             callback();
//         });
//     }
// }

/**
 * @function update_item
 * @description Updates or inserts a specific item in the global.data JSON array
 * @param item - The item to be updated or inserted
 * @param type - The type of the item
 * @param callback - The callback that will be called at the end
 */
function update_item(item, type, callback){
    global.data[type][item.id] = item;
    callback();
};

// /**
//  * @function update_item
//  * @description Updates or inserts a specific item in the global.data JSON array
//  * @param item - The item to be updated or inserted
//  * @param type - The type of the item
//  * @param callback - The callback that will be called at the end
//  */
// function update_item(item, type, callback){
//     global.data[type][item[0][type].id] = item[0][type];
//     callback();
// };

/**
 * @function delete_item
 * @description Deletes a specific item in the global.data JSON array
 * @param item - The item to be deleted
 * @param type - The type of the item
 * @param callback - The callback that will be called at the end
 */
function delete_item(item, type, callback){
    if(global.data[type].hasOwnProperty(item.id)){
        delete global.data[type][item.id];
    }
    callback();
}

// /**
//  * @function delete_item
//  * @description Deletes a specific item in the global.data JSON array
//  * @param item - The item to be deleted
//  * @param type - The type of the item
//  * @param callback - The callback that will be called at the end
//  */
// function delete_item(item, type, callback){
//     if(global.data[type].hasOwnProperty(item[0][type].id)){
//         delete global.data[type][item[0][type].id];
//     }
//     callback();
// }

// /**
//  * @function send_update
//  * @description Sends an update query to the database
//  * @param args - The type and data of the object to be updated
//  * @param callback - The callback that will be called at the end
//  */
// function send_update(args, callback){
//     let query = null, column = null;
//     switch(args.type){
//         case 'us': query = { name: 'update-us',
//                              text: 'UPDATE user_stories SET (feature, logs, estimate) = ($1,$2,$3) WHERE id=$4 AND project=$5',
//                              values: [args.data.feature, args.data.logs, args.data.estimate, args.data.id, args.data.project]
//                          }; column="user_stories"; break;
//         case 'us_sprint': query = { name: 'update-us-sprint',
//                                     text: 'UPDATE user_stories SET sprint=$1 WHERE id=$2 AND project=$3',
//                                     values: [args.data.sprint, args.data.id, args.data.project]
//                                 }; column="user_stories"; break;
//         case 'sprint': query = { name: 'update-sprint',
//                                  text: 'UPDATE sprints SET points=$1 WHERE id=$2 AND project=$3',
//                                  values: [args.data.points, args.data.id, args.data.project]
//                              }; column="sprints"; break;
//         default: break;
//     }
//     client.query(query, (err, res) => {
//         if(err){
//             console.log(err);
//             callback(err);
//         }
//         callback(null);
//     });
// }

// /**
//  * @function send_delete
//  * @description Sends an delete query to the database
//  * @param args - The type and data of the object to be deleted
//  * @param callback - The callback that will be called at the end
//  */
// function send_delete(args, callback){
//     let query = null, column = null;
//     switch(args.type){
//         case 'us': query = { name: 'delete-us',
//                              text: 'DELETE FROM user_stories WHERE id=$1 AND project=$2',
//                              values: [args.data.id, args.data.project]
//                          }; column="user_stories"; break;
//         case 'sprint': query = { name: 'delete-sprint',
//                                 text: 'DELETE FROM sprints WHERE id=$1 AND project=$2',
//                                 values: [args.data.id, args.data.project]
//                             }; column="sprints"; break;
//         default: break;
//     }
//     client.query(query, (err, res) => {
//         if(err){
//             callback(err);
//         }
//         callback(null);
//     });
// }

/**
 * @function
 * @description EVENT HANDLER - Defines behaviour on create item event
 * @listens ipcMain#create
 * @param event - The event
 * @param args - Parameters of the event
 * @fires ipcRenderer#created
 * @see create
 */
ipcMain.on("create", (event, args) => {
    create(args.type, args.data);
});

// /**
//  * @function
//  * @description EVENT HANDLER - Defines behaviour on create item event
//  * @listens ipcMain#create
//  * @param event - The event
//  * @param args - Parameters of the event
//  * @fires ipcRenderer#created
//  * @see create
//  */
// ipcMain.on("create", (event, args) => {
//     let obj = {data: args['data'],
//                type: args['type'],
//                err: null};
//
//     create(args['type'], args['data'], (ret) => {
//         if(typeof ret === 'Error'){
//           obj['status'] = "nok";
//           obj['err'] = ret;
//         }else{
//           Object.keys(ret).forEach((key) => obj['data'][key] = ret[key]);
//           obj['status'] = "ok";
//         }
//         event.sender.send('created', obj);
//     });
// });

/**
 * @function
 * @description EVENT HANDLER - Defines behaviour on open project event
 * @listens ipcMain#open_project
 * @param event - The event
 * @param args - Parameters of the event
 */
ipcMain.on("open_project", (event, args)=>{
    for(let i in global.data['projects']){
        // console.log(global.data.projects[i]);
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
 * @listens ipcMain#fetch
 * @param event - The event
 * @param args - Parameters of the event
 * @fires ipcRenderer#fetched
 * @see fetch
 */
ipcMain.on("fetch", (event, args) => {
    if(fetch(args.type, args.data)) channel_send.send("fetched", {type: args.type});
    // fetch(args.type, (err) => {
    //     channel_send.send("fetched", {type: args.type, ret: err});
    // });
});

/**
 * @function
 * @description EVENT HANDLER - Defines behaviour on load data event
 * @listens ipcMain#load
 * @param event - The event
 * @param args - Parameters of the event
 * @fires ipcRenderer#loaded
 * @see load
 */
ipcMain.on("load", (event, args) => {
    load(args.type);
});

// /**
//  * @function
//  * @description EVENT HANDLER - Defines behaviour on load data event
//  * @listens ipcMain#load
//  * @param event - The event
//  * @param args - Parameters of the event
//  * @fires ipcRenderer#loaded
//  * @see load
//  */
// ipcMain.on("load", (event, args) => {
//     load(args.type, (err) => {
//         channel_send.send("loaded", {type: args.type, ret: err});
//     });
// });

/**
 * @function
 * @description EVENT HANDLER - Defines behaviour on update data event
 * @listens ipcMain#update
 * @param event - The event
 * @param args - Parameters of the event
 * @fires ipcRenderer#error
 * @see send_update
 */
ipcMain.on('update', (event, args) => {
    if(global.data.current) args.data.project = global.data.current.id;
    socket.emit('update', args);
});

// /**
//  * @function
//  * @description EVENT HANDLER - Defines behaviour on update data event
//  * @listens ipcMain#update
//  * @param event - The event
//  * @param args - Parameters of the event
//  * @fires ipcRenderer#error
//  * @see send_update
//  */
// ipcMain.on('update', (event, args) => {
//     send_update(args, res => {
//         if(res){
//             let obj = {data: args['data'],
//                        action: "update",
//                        kind: args['type'],
//                        err: res};
//             event.sender.send('error', obj);
//         }
//     });
// });

/**
 * @function
 * @description EVENT HANDLER - Defines behaviour on delete data event
 * @listens ipcMain#delete
 * @param event - The event
 * @param args - Parameters of the event
 * @fires ipcRenderer#error
 * @see send_delete
 */
ipcMain.on('delete', (event, args) => {
    if(global.data.current) args.data.project = global.data.current.id;
    socket.emit('delete', args);
});

// /**
//  * @function
//  * @description EVENT HANDLER - Defines behaviour on delete data event
//  * @listens ipcMain#delete
//  * @param event - The event
//  * @param args - Parameters of the event
//  * @fires ipcRenderer#error
//  * @see send_delete
//  */
// ipcMain.on('delete', (event, args) => {
//     send_delete(args, res => {
//         if(res){
//             let obj = {data: args['data'],
//             kind: args['type'],
//             action: "delete",
//             err: res};
//             event.sender.send('error', obj);
//         }
//     });
// });

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
     * @description Checks that the given database credentials are correct
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
     * @description Asks the client to connect to the database
     * @param callback - The callback that will be called at the end
     */
    connect: function(callback){
        socket.connect();
        socket.on('connect', () => {
            console.log("connected");
        });
        socket.on('connect_error', (err) => {
            console.log(err);
            callback(err);
        });
        socket.on('srvError', (err)=>{
            if(err === "DB_UNAVAILABLE"){
                console.log('srvError event');
                console.log(err);
                callback(err);
            }
        });
        socket.on('srvInfo', (status) => {
            console.log(status);
            callback(null);
        });
    },

    init_events: function(cb){
        initSocketEvents(cb);
    },

    /**
     * @function init_realtime
     * @description Initializes the realtime data management
     * @listens notification from PostgreSQL
     * @param callback - The callback that will be called at the end
     * @see dispatch_action called when notification received
     */
    init_realtime: function(callback){
        // client.query("LISTEN insert; LISTEN update; LISTEN delete", (err,res) => {
        //     if(err){
        //         callback(err);
        //     }
        // });
        // client.on("notification", (data) => {
        //     let item = JSON.parse(data.payload);
        //     let type = String(Object.keys(item[0])[0]);
        //     dispatch_action(item, type, data.channel, ()=>{
        //         channel_send.send(data.channel, {type: type, data:item[0][type]});
        //     });
        // });
        callback(null);
    },

    /**
     * @function disconnect
     * @description Asks the client to disconnect to the database
     */
    disconnect: function(){
        socket.close();
    }
};

var require = function(path) {
    return module.exports;
};
