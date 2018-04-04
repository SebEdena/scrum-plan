/**
 * @file db.js
 * Module for the DBSocketLinker class
 * @author Sébastien Viguier
 * @module db.js
 */
const pg = require('pg');
module.exports = DBSocketLinker; //Exports the module as the DBSocketLinker class

/**
 * Initializes the class
 * @class
 * @classdesc This class helps each client app to interact with the server individually
 * @see DBSocketLinker#initEvents
 */
function DBSocketLinker(db_cli, skt){
    this.db = db_cli; //Reference to the pool of available database clients
    this.socket = skt; //The socket of the client app
    this.initEvents();
}

/**
 * @function DBSocketLinker#initEvents
 * @description Initializes the events ot the module
 * @listens socket:load - When the client app is asking to load data
 * @listens socket:create - When the client app asks to create data
 * @listens socket:upload - When the client app asks to upload data
 * @listens socket:delete - When the client app asks to delete data
 * @fires socket:loaded - When data is loaded
 * @fires socket:created - When the data has been created
 * @fires socket:dbError - In case of any error while uploading
 * @fires socket:dbError - In case of any error while deleting
 * @see DBSocketLinker#load
 * @see DBSocketLinker#create
 * @see DBSocketLinker#send_update
 * @see DBSocketLinker#send_delete
 */
DBSocketLinker.prototype.initEvents = function(){
    this.socket.on('load', (args)=>{
        this.load(args.type, args.data, (err, data) =>{
            this.socket.emit('loaded', {type:args.type, err:err, data: data});
        });
    });
    this.socket.on('create', (args)=>{
        let obj = {data: args['data'],
                   type: args['type'],
                   err: null};
        this.create(args['type'], args['data'], (ret) => {
            if(typeof ret === 'Error'){
              obj['status'] = "nok";
              obj['err'] = ret;
            }else{
              Object.keys(ret).forEach((key) => obj['data'][key] = ret[key]);
              obj['status'] = "ok";
            }
            this.socket.emit('created', obj);
        });
    });
    this.socket.on('update', (args)=>{
        this.send_update(args, res => {
            if(res){
                let obj = {data: args['data'],
                action: "update",
                type: args['type'],
                err: res};
                this.socket.emit('dbError', obj);
            }
        });
    });
    this.socket.on('delete', (args) => {
        this.send_delete(args, res => {
            if(res){
                let obj = {data: args['data'],
                type: args['type'],
                action: "delete",
                err: res};
                this.socket.emit('dbError', obj);
            }
        });
    });
}

/**
 * @function DBSocketLinker#load
 * @description Loads a particular type of object from the database
 * @param type - The type of data that needs to be loaded
 * @param data - The input of what needs to be loaded
 * @param cb - The callback that will be called at the end
 */
DBSocketLinker.prototype.load = function(type, data, cb){
    let query = null;
    console.log(data);
    switch (type) {
        case "projects": query = {
                            name: 'fetch-projects',
                            text: 'SELECT * FROM projects p ORDER BY p.id'
                         };
                         break;
        case "user_stories": query = {
                                    name: 'fetch-all-user-stories',
                                    text: 'SELECT us.* FROM user_stories us WHERE us.project=$1 ORDER BY us.id',
                                    values: [data.project]
                             };
                             break;
        case "sprints": query = {
                            name: 'fetch-all-sprints',
                            text: 'SELECT sp.* FROM sprints sp WHERE sp.project=$1 ORDER BY sp.id',
                            values: [data.project]
                        };
        default: break;
    }
    if(query){
        this.db.query(query, (err, res) => {
            if(err){
                cb(err, null);
            } else {
                cb(null, res.rows);
            }
        });
    }
}

/**
 * @function DBSocketLinker#create
 * @description Inserts a new row in the database corresponding to an object
 * @param type - The type of data that needs to be inserted
 * @param data - The data to be inserted
 * @param cb - The callback that will be called at the end
 */
DBSocketLinker.prototype.create = function(type, data, cb){
    let query = null;
    switch(type){
        case "project": query = {
                        name: "create-project",
                        text: "INSERT INTO projects(title, description) VALUES ($1, $2) RETURNING projects.*",
                        values: [data.title, data.description]
                        };
                        break;
        case "us": query = {
                      name: "create-user-story",
                      text: "INSERT INTO user_stories (feature, logs, estimate, project) VALUES ($1, $2, $3, $4) RETURNING user_stories.*",
                      values: [data.feature, data.logs, data.estimate, data.project]
                      };
                      break;
        case "sprint": query = {
                        name: "create-sprint",
                        text: "INSERT INTO sprints (project) VALUES ($1) RETURNING sprints.*",
                        values: [data.project]
                        };
                        break;
        default: break;
    }
    this.db.query(query, (err, res) => {
        if(err){
            cb(err); return;
        }
        cb(res.rows[0]);
    });
}



/**
 * @function DBSocketLinker#send_update
 * @description Sends an update query to the database
 * @param args - The type and data of the object to be updated
 * @param cb - The callback that will be called at the end
 */
DBSocketLinker.prototype.send_update = function(args, cb){
    let query = null, column = null;
    switch(args.type){
        case 'us': query = { name: 'update-us',
                             text: 'UPDATE user_stories SET (feature, logs, estimate) = ($1,$2,$3) WHERE id=$4 AND project=$5',
                             values: [args.data.feature, args.data.logs, args.data.estimate, args.data.id, args.data.project]
                         }; column="user_stories"; break;
        case 'us_sprint': query = { name: 'update-us-sprint',
                                    text: 'UPDATE user_stories SET sprint=$1 WHERE id=$2 AND project=$3',
                                    values: [args.data.sprint, args.data.id, args.data.project]
                                }; column="user_stories"; break;
        case 'sprint': query = { name: 'update-sprint',
                                 text: 'UPDATE sprints SET points=$1 WHERE id=$2 AND project=$3',
                                 values: [args.data.points, args.data.id, args.data.project]
                             }; column="sprints"; break;
        default: break;
    }
    this.db.query(query, (err, res) => {
        if(err){
            cb(err);
        }
        cb(null);
    });
}

/**
 * @function DBSocketLinker#send_delete
 * @description Sends a delete query to the database
 * @param args - The type and data of the object to be deleted
 * @param cb - The callback that will be called at the end
 */
DBSocketLinker.prototype.send_delete = function(args, cb){
    let query = null, column = null;
    switch(args.type){
        case 'us': query = { name: 'delete-us',
                             text: 'DELETE FROM user_stories WHERE id=$1 AND project=$2',
                             values: [args.data.id, args.data.project]
                         }; column="user_stories"; break;
        case 'sprint': query = { name: 'delete-sprint',
                                text: 'DELETE FROM sprints WHERE id=$1 AND project=$2',
                                values: [args.data.id, args.data.project]
                            }; column="sprints"; break;
        default: break;
    }
    this.db.query(query, (err, res) => {
        if(err){
            cb(err);
        }
        cb(null);
    });
}
