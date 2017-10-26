'use strict';

const {app, globalShortcut} = require('electron');
const BrowserWindow = require("electron").BrowserWindow;

let mainWindow = null;

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
    }, 1000);

    mainWindow.webContents.openDevTools({mode:"detach"});
});
