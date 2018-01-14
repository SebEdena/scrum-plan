/**
 * Js file for the loading screen
 * @author Sébastien Viguier
 */
'use strict';
const {ipcRenderer} = require('electron');
const remote = require('electron').remote;
const {dialog} = remote.require('electron');

$(document).ready(($)=>{
    $('#spinner > img').hide();
    $('#spinner').css('visibility', 'visible');

    /**
     * @description EVENT HANDLER - Defines behaviour on error event to check
       for any connection error with the database.
     * @event ipcRenderer#error
     * @param args - Parameters of the event
     * @fires ipcMain#action to quit or reconnect the app with the database
     */
    ipcRenderer.on('error', (event, args) => {
        $('#spinner > div').hide();
        $('#spinner > img').toggle();
        $('#connection_status').text('Connection failed.');
        if(args['type'] === "connection"){
            dialog.showMessageBox(remote.getCurrentWindow(),
            {title: 'Error',
            type: 'error',
            noLink: true,
            defaultId: 1,
            message: 'The server is unavailable.\nPlease ensure you have a working Internet connection and retry, or quit.',
            detail: 'Error: ' + args.err.code,
            buttons: ['Exit', 'Retry']}, resp=>{
                switch(resp){
                    case 0: ipcRenderer.send("action", "quit"); break;
                    case 1: ipcRenderer.send("action", "reconnect");
                            $('#spinner > div').toggle();
                            $('#spinner > img').hide();
                            $('#connection_status').text('Connecting, please wait...');
                            break;
                    default: break;
                }
            });
        }
    });
});
