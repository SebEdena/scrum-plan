'use strict';

const {app, globalShortcut} = require('electron');
const BrowserWindow = require("electron").BrowserWindow;

let mainWindow = null;

app.on("ready", function(){
    mainWindow = new BrowserWindow({
        width: 900,
        height: 900
    });

    mainWindow.loadURL('file://' + __dirname + '/app/html/loading.html');

    mainWindow.webContents.openDevTools({mode:"detach"});
});
