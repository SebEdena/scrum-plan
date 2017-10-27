var pg = require('pg');

var client = new pg.Client({
    user: "scrum_user",
    password: "b8aveK",
    host: "localhost",
    port: 5432,
    database: "scrum"
});

module.exports = {
    connect: function(){
        client.connect((err) => {
            if (err) {
                console.error('connection error', err.stack)
            } else {
                console.log('connected')
            }
        });
    }
};

var require = function(path) {
    return module.exports;
};
