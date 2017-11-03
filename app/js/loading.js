const {ipcRenderer} = require('electron');

$("#modal_connect").modal({
    backdrop: false,
    keyboard: false
});

$("#retry").on('click', function(){
    $("#modal_connect").modal('hide');
    ipcRenderer.send("action", "reconnect");
});

$("#close").on('click', function(){
    $("#modal_connect").modal('hide');
    ipcRenderer.send("action", "quit");
});

ipcRenderer.on('error', (args) => {
    if(args['type'] === "connection"){
        $("modal_connect").modal('show');
    }
});
