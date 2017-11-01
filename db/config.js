var pg = require('pg');
var {ipcMain} = require('electron');

var client = new pg.Client({
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
        return err;
    });
}

module.exports = {
    init: function(send){
        channel_send = send;
    },

    connect: function(){
        client.connect((err) => {
            if (err) {
                console.error('connection error', err.stack);
            } else {
            }
        });
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
                    console.error(err.stack);
                } else {
                    global.data[type] = JSON.parse(JSON.stringify(res.rows));
                    channel_send.send("load", {type: ""+type});
                }
            });
        }
    }
};

ipcMain.on("create", (event, args) => {
    var result = create(args['type'], args['data']);
    console.log(!result);
    if(!result){
        // if result is true, there is an error;
        event.sender.send('created', 'ok', args['data'], result);
    }else{
        event.sender.send('created', 'nok', args['data'], result);
    }
});

var require = function(path) {
    return module.exports;
};
