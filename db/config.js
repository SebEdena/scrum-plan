const pg = require('pg');
const {ipcMain} = require('electron');

let client = new pg.Client({
    user: "scrum_user",
    password: "b8aveK",
    host: "localhost",
    port: 5432,
    database: "scrum"
});

var channel_send = null;

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

module.exports = {
    init: function(send){
        channel_send = send;
    },

    connect: function(){
        var nok = new Error("Server unavailable");
        client.connect((err) => {
            if (err) {
                return err;
            }
                console.log('enterd connect()');
            nok = null;
        });
        return nok;
    },

    fetch: function(type){
        console.log("here");
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
                console.log(err);
                console.log(res);
                if(err){
                    return {err};
                } else {
                    global.data[type] = JSON.parse(JSON.stringify(res.rows));
                    channel_send.send("load", {type: ""+type});
                    return null;
                }
            });
        }
    }
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

var require = function(path) {
    return module.exports;
};
