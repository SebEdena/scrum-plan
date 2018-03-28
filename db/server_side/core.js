let io = null, server = null;

module.exports = init;

function init(server){
    this.server = server;
    io = require('socket.io')(server, {path: "/scrum"});
}

io.on('connection', (socket)=>{
     console.log("new connection : " + socket.id);
     socket.send('welcome');
});
