'use strict';

const {app, globalShortcut} = require('electron');
const BrowserWindow = require("electron").BrowserWindow;
let db = require('./db/config.js');

let mainWindow = null;
global.data = {};

app.on("ready", function(){
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        title: "Scrum Assistant",
        show: false
    });

    mainWindow.on("ready-to-show", () => {
        mainWindow.show();
    });

    mainWindow.loadURL('file://' + __dirname + '/app/html/loading.html');

    setTimeout(()=>{
        mainWindow.loadURL('file://' + __dirname + '/app/html/home.html');
        db.init(mainWindow.webContents);
        db.connect();
        db.fetch("projects");
        mainWindow.webContents.openDevTools({mode:"detach"});
    }, 1000);
});
