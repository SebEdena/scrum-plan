'use strict'
const pg = require('pg');
const {ipcMain, dialog} = require('electron');

let update_rules = {full:{types:['projects']},
                    partial:{types:['user_stories']}};

let client = new pg.Client({
    user: "scrum_user",
    password: "b8aveK",
    host: "localhost",
    port: 5432,
    database: "scrum"
});

let view = null;
let channel_send = null;
let app = null;

function create(type, data, callback){
    let query = null;
    switch(type){
        case "project": query = {
                        name: "create-project",
                        text: "INSERT INTO projects(title, description) VALUES ($1, $2) RETURNING projects.*",
                        values: [data.name, data.description]
                        };
                        break;
        case "us": query = {
                      name: "create-user-story",
                      text: "INSERT INTO user_stories (feature, logs, project) VALUES ($1, $2, $3) RETURNING user_stories.*",
                      values: [data.feature, data.logs, data.project]
                      };
                      break;
        default: break;
    }
    client.query(query, (err, res) => {
        if(err){
            return callback(err);
        }
        return callback(res.rows[0]);
    });
}

function dispatch_action(item, type, action, callback){
    if(action === "insert" || action === "update"){
        for(var method of Object.keys(update_rules)){
            if(update_rules[method].types.indexOf(type) >= 0){
                update_rules[method].fct(item, type, ()=>{
                    callback();
                });
                break;
            }
        }
    }
    if(action === "delete"){
        delete_item(item, type, () => {
            callback();
        });
    }
}

update_rules.full.fct = (item, type, callback) => {
    let found = false;
    for(let i in global.data[type]){
        if(global.data[type][i].id === item[0][type].id){
            for(let [key,value] of Object.entries(item[0][type])){
                if(key !== 'id'){
                    global.data[type][i][key] = value;
                }
            }
            found = true;
            callback();
        }
    }
    if(!found){
        global.data[type].push(item[0][type]);
        callback();
    }
};

update_rules.partial.fct = (item, type, callback) => {
    let change = {
        "user_stories": ['feature', 'logs']
    };
    let found = false;
    for(let obj of global.data[type]){
        if(obj.id === item[0][type].id){
            for(let cols of change[type]){
                obj[cols] = item[0][type][cols];
            }
            found = true;
            callback();
        }
    }
    if(!found){
        global.data[type].push(item[0][type]);
        callback();
    }
};

function delete_item(item, type, callback){
    let del = null;
    for(let obj in global.data[type]){
        if(global.data[type][obj].id === item[0][type].id){
            del = obj;
            break;
        }
    }
    global.data[type].splice(del, 1);
    callback();
}

function send_update(args, callback){
    let query = null, column = null;
    switch(args.type){
        case 'us': query = { name: 'update-us',
                             text: 'UPDATE user_stories SET (feature, logs) = ($1,$2) WHERE id=$3 AND project=$4',
                             values: [args.data.feature, args.data.logs, args.data.id, args.data.project]
                         }; column="user_stories"; break;
        default: break;
    }
    client.query(query, (err, res) => {
        if(err){
            callback(err);
        }
        callback(null);
    });
}

function send_delete(args, callback){
    let query = null, column = null;
    switch(args.type){
        case 'us': query = { name: 'delete-us',
                             text: 'DELETE FROM user_stories WHERE id=$1 AND project=$2',
                             values: [args.data.id, args.data.project]
                         }; column="user_stories"; break;
        default: break;
    }
    client.query(query, (err, res) => {
        if(err){
            console.log(err);
            callback(err);
        }
        callback(null);
    });
}

ipcMain.on("create", (event, args) => {
    let obj = {data: args['data'],
               kind: args['type'],
               err: null};

    create(args['type'], args['data'], (ret) => {
        if(typeof ret === 'Error'){
          obj['status'] = "nok";
          obj['err'] = ret;
        }else{
          Object.keys(ret).forEach((key) => obj['data'][key] = ret[key]);
          obj['status'] = "ok";
        }
        event.sender.send('created', obj);
    });
});

ipcMain.on("open_project", (event, args)=>{
    for(let i in global.data['projects']){
        if(args.id === global.data['projects'][i].id){
            global.data['current'] = global.data['projects'][i];
            break;
        }
    }
    //PJ not found ?
    view.loadURL('file://' + __dirname + '/../app/html/workspace.html');
});

ipcMain.on("fetch", (event, args) => {
    module.exports.fetch(args.type);
});

ipcMain.on('update', (event, args) => {
    send_update(args, res => {
        if(typeof res === 'Error'){
            let obj = {data: args['data'],
                       action: "update",
                       kind: args['type'],
                       err: res};
            event.sender.send('error', obj);
        }
    });
});

ipcMain.on('delete', (event, args) => {
    send_delete(args, res => {
        if(typeof res === 'Error'){
            let obj = {data: args['data'],
            kind: args['type'],
            action: "delete",
            err: res};
            event.sender.send('error', obj);
        }
    });
});

client.on('error', (err) => {
    switch(err.code){
        case "57P01":
            dialog.showMessageBox({
                title: "Scrum Assistant",
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
    init: function(front, appli){
        view = front;
        channel_send = front.webContents;
        app = appli;
    },

    connect: function(){
        let nok = new Error("Server unavailable");
        client.connect((err) => {
            if (err) {
                return err;
            }
            nok = null;
        });
        return null;
    },

    init_realtime: function(){
        client.query("LISTEN insert; LISTEN update; LISTEN delete", (err,res) => {
            if(err){
                return err;
            }
        });
        client.on("notification", (data) => {
            let item = JSON.parse(data.payload);
            let type = String(Object.keys(item[0])[0]);
            dispatch_action(item, type, data.channel, ()=>{
                channel_send.send(data.channel, {type: type, data:item[0][type]});
            });
        });
        return null;
    },

    fetch: function(type){
        let query = null;
        switch (type) {
            case "projects": query = {
                                name: 'fetch-projects',
                                text: 'SELECT * FROM projects p ORDER BY p.id'
                             };
                             break;
            case "user_stories": query = {
                                        name: 'fetch-all-user-stories',
                                        text: 'SELECT us.* FROM user_stories us WHERE us.project=$1 ORDER BY us.id',
                                        values: [global.data.current.id]
                                 };
                                 break;
            default: break;
        }
        if(query){
            client.query(query, (err, res) => {
                if(err){
                    return err;
                } else {
                    global.data[type] = JSON.parse(JSON.stringify(res.rows));
                    channel_send.send("load", {type: type});
                    return null;
                }
            });
        }
    }
};

var require = function(path) {
    return module.exports;
};
