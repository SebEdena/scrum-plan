var pg = require('pg');

var client = new pg.Client({
    user: "scrum_user",
    password: "b8aveK",
    host: "localhost",
    port: 5432,
    database: "scrum"
});

var eventsChannel = null;

// function shapeProjectsJSON(data)

module.exports = {
    init: function(channel){
        eventsChannel = channel;
    },

    connect: function(){
        client.connect((err) => {
            if (err) {
                console.error('connection error', err.stack)
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
                    eventsChannel.send("load", {type: ""+type});
                }
            });
        }
    }
};

var require = function(path) {
    return module.exports;
};
