/**
 * @file app.js
 * Main electron js file
 * @description Defines the actions on app start
 * @author Sébastien Viguier
 */
'use strict';
const {app, globalShortcut, ipcMain, dialog} = require('electron');
const BrowserWindow = require("electron").BrowserWindow;
const async = require('async');

/**
 * Requiring the database handler module
 * @see db/config.js
 */
let db = require('./db/config.js');

let mainWindow = null; //The window being shown to the user

/**
 * Initial state of the data
 */
global.data = {
    projects: {},
    current: null,
    user_stories: {},
    sprints: {}
};

/**
 * State of the data fetch
 */
global.loaded = {
    projects: false,
    user_stories: false,
    sprints: false
};

/**
 * @function
 * @description Main function of the app.
   Connects to the database and loads the GUI.
 * @listens app#ready
 * @listens mainWindow#dom-ready
 */
app.on("ready", function(){
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        title: "Scrum Assistant",
        show: false,
        icon: __dirname + "/scrum.ico",
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
                mainWindow.webContents.openDevTools({mode:"detach"});
                mainWindow.show();
                connect();
            });
        }
    });
});

/**
 * @function connect
 * @description Defines the functions to call to initialize the databse link
 */
function connect(){
    async.waterfall([
        help_init,
        db.init, //initiazes the variables
        db.connect, //connects to the database
        db.init_realtime //registers the app as a listener of the database changes
    ], function (err, res) {
        if(err){
            mainWindow.webContents.send('error', {type: "connection", err: err});
        }else{
            setTimeout(()=>{
                mainWindow.loadURL('file://' + __dirname + '/app/html/home.html');
            }, 3000);
        }
    });
}

/**
 * @function help_init
 * @description Helper for the connection phase
 * Initiates the first function
 * @param callback - The callback used to communicate between functions
 */
function help_init(callback){
    callback(null, mainWindow, app);
}

/**
 * @function
 * @description EVENT HANDLER - Defines behaviour on action event
 * @listens  ipcMain#action
 * @param event - The event
 * @param args - Parameters of the event
 */
ipcMain.on("action", (event, args) => {
    switch(args){
        case "reconnect": connect();
            break;
        case "quit": app.quit();
            break;
        default: break;
    }
})

/**
 * @function
 * @description EVENT HANDLER - Defines behaviour when exiting the application
 * @listens app#will-quit
 */
app.once('will-quit', ()=>{
    db.disconnect();
});

// process.on('uncaughtException', function(err){
//     console.error(err);
// });
