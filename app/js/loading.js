const {ipcRenderer} = require('electron');

$("#modal_connect").modal({
    backdrop: false,
    keyboard: false,
    show: false
});

$("#retry").on('click', function(){
    hideModal("modal_connect");
    ipcRenderer.send("action", "reconnect");
});

$("#close").on('click', function(){
    hideModal("modal_connect");
    ipcRenderer.send("action", "quit");
});

ipcRenderer.on('error', (event, args) => {
    if(args['type'] === "connection"){
        showModal("modal_connect");
    }
});

ipcRenderer.send("action", "ready");
