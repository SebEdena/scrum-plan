'use strict'
const pg = require('pg');
const {ipcMain, dialog} = require('electron');

let client = new pg.Client({
    user: "scrum_user",
    password: "b8aveK",
    host: "localhost",
    port: 5432,
    database: "scrum"
});

let channel_send = null;
let app = null;

function create(type, data){
    var query = null;
    switch(type){
        case "project": query = {
                        name: "create-project",
                        text: "INSERT INTO projects(title, description) VALUES ($1, $2)",
                        values: [data.name, data.description]
                        }
                        break;
        default: break;
    }
    client.query(query, (err, res) => {
        if(err){
            throw err;
        }
    });
}

function update_data(item, type, action){
    if(action === "rowchange"){
        let found = false;
        for(let obj of global.data[type]){
            if(obj.id === item[0][type].id){
                obj = item;
                found = true;
                break;
            }
        }
        if(!found){
            global.data[type].push(item[0][type]);
        }
    }
    if(action === "rowdelete"){
        let del = null;
        for(let obj in global.data[type]){
            if(global.data[type][obj].id === item[0][type].id){
                del = obj;
                break;
            }
        }
        global.data[type].splice(del, 1);
    };
};

ipcMain.on("create", (event, args) => {
    var result;
    var obj = { data: args['data'],
                kind: args['type'],
                err: null};
    try{
        result = create(args['type'], args['data']);
        obj['status'] = "ok";
    }catch(err){
        console.log(err);
        obj['status'] = "nok";
        obj['err'] = err;
    }
    event.sender.send('created', obj);
});

client.on('error', (err) => {
    switch(err.code){
        case "57P01":
            dialog.showMessageBox({
                type: 'error',
                buttons: ['Ok'],
                message: 'Connection with server interrupted. The application will quit.',
            }, resp => {
            if (resp === 0) {
                app.quit();
            }
        });
    }
});

module.exports = {
    init: function(send, appli){
        channel_send = send;
        app = appli;
    },

    connect: function(){
        var nok = new Error("Server unavailable");
        client.connect((err) => {
            if (err) {
                return err;
            }
            nok = null;
        });
        return null;
    },

    init_realtime: function(){
        client.query("LISTEN rowchange; LISTEN rowdelete", (err,res) => {
            if(err){
                console.error(err);
            }
        });
        client.on("notification", (data) => {
            let item = JSON.parse(data.payload);
            let type = String(Object.keys(item[0])[0]);
            update_data(item, type, data.channel);
            channel_send.send("load", {type: type});
            console.log(global.data);
        });
        return null;
    },

    fetch: function(type){
        var query = null;
        switch (type) {
            case "projects": query = {name: 'fetch-projects',
                             text: 'SELECT * FROM projects'};
                break;
            default:
                break;
        }
        if(query){
            client.query(query, (err, res) => {
                if(err){
                    return err;
                } else {
                    global.data[type] = JSON.parse(JSON.stringify(res.rows));
                    channel_send.send("load", {type: ""+type});
                    return null;
                }
            });
        }
    }
};

var require = function(path) {
    return module.exports;
};
