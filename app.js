'use strict';

const {app, globalShortcut, ipcMain, dialog} = require('electron');
const BrowserWindow = require("electron").BrowserWindow;
const async = require('async');
let db = require('./db/config.js');

let mainWindow = null;
let ready = false, displayed = false;
global.data = {projects: {}, current: null, user_stories: {}};

app.on("ready", function(){
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        title: "Scrum Assistant",
        show: false,
        backgroundColor: "#ede8e8"
    });

    db.verify_credentials((err)=>{
        if(err){
            dialog.showMessageBox({title: 'Scrum Assistant',
                type: 'error',
                message: 'An error with database credentials occured : ' + err.message,
                buttons: ['Ok']}, resp=>{app.quit()});
        }else{
            mainWindow.loadURL('file://' + __dirname + '/app/html/loading.html');
            mainWindow.webContents.once('dom-ready', ()=>{
                mainWindow.show();
                mainWindow.webContents.openDevTools({mode:"detach"});
                connect();
            });
        }
    });
});

function connect(){
    async.waterfall([
        function(cb){
            cb(db.init(mainWindow, app));
        },
        function(cb){
            cb(db.connect());
        },
        function(cb){
            cb(db.init_realtime());
        }
    ], function (err) {
        console.log(err);
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
        case "quit": app.quit();
            break;
        default: break;
    }
})

app.once('will-quit', ()=>{
    db.disconnect();
});

// process.on('uncaughtException', function(err){
//     console.error(err);
// });
