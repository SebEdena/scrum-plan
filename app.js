'use strict';

const {app, globalShortcut, ipcMain} = require('electron');
const BrowserWindow = require("electron").BrowserWindow;
const async = require('async');
let db = require('./db/config.js');

let mainWindow = null;
let ready = false;
global.data = {};

app.on("ready", function(){
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        title: "Scrum Assistant",
        show: false
    });

    mainWindow.loadURL('file://' + __dirname + '/app/html/loading.html');

    mainWindow.on("ready-to-show", () => {
        mainWindow.show();
    });

    mainWindow.webContents.openDevTools({mode:"detach"});

    connect();
});

function connect(){
    async.waterfall([
        function(cb){
            cb(db.init(mainWindow.webContents, app));
        },
        function(cb){
            cb(db.connect());
        },
        function(cb){
            cb(db.fetch("projects"));
        },
    ], function (err, result) {
        if(err){
            mainWindow.webContents.send('error', {type: "connection", err: err});
        }else{
            setTimeout(()=>{
                mainWindow.loadURL('file://' + __dirname + '/app/html/home.html');
            }, 3000);
        }
    });
}

ipcMain.on("action", (event, args) => {
    switch(args){
        case "ready": ready = true;
            break;
        case "reconnect": connect();
            break;
        case "quit": app.exit();
            break;
        default: break;
    }
})

// process.on('uncaughtException', function(err){
//     console.error(err);
// });
