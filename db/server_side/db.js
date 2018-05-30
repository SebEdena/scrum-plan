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
 * @public
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
 * @public
 * @param type - The type of data that needs to be loaded
 * @param data - The input of what needs to be loaded
 * @param cb - The callback that will be called at the end
 */
DBSocketLinker.prototype.load = function(type, data, cb){
    let query = null;
    switch (type) {
        case "projects": query = {
                            text: 'SELECT * FROM projects p ORDER BY p.id'
                         };
                         break;
        case "user_stories": query = {
                                    text: 'SELECT us.* FROM user_stories us WHERE us.project=$1 ORDER BY us.id',
                                    values: [data.project]
                             };
                             break;
        case "sprints": query = {
                            text: 'SELECT sp.* FROM sprints sp WHERE sp.project=$1 ORDER BY sp.id',
                            values: [data.project]
                        };
                        break;
        case "us_sprints": query = {
                            text: 'SELECT usp.* FROM us_sprints usp WHERE usp.project=$1 ORDER BY usp.id',
                            values: [data.project]
                        };
                        break;
        case "post_its": query = {
                            text: 'SELECT p.* FROM post_its p WHERE p.project=$1 ORDER BY p.sprint, p.usp, p.id',
                            values: [data.project]
                        };
        case "dailys": query = {
                            text: 'SELECT d.* FROM dailys d WHERE d.project=$1 ORDER BY d.sprint, d.daily_date, d.usp',
                            values: [data.project]
                        };
                        break;
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
 * @function DBSocketLinker#_classicQuery
 * @description Executes a non-transactional query
 * @private
 * @param query - The query object to be executed
 * @param needResult - If the calling function needs to be sent a result, will return null if not, or the error
 * @param cb - The callback that will be called at the end
 */
DBSocketLinker.prototype._classicQuery = function(query, needResult, cb){
    this.db.query(query, (err, res) => {
        if(err){
            cb(err); return;
        }
        (needResult && res)?cb(res.rows[0]):cb(null);
    });
}

/**
 * @function DBSocketLinker#create
 * @description Inserts a new row in the database corresponding to an object
 * @param type - The type of data that needs to be inserted
 * @param data - The data to be inserted
 * @param cb - The callback that will be called at the end
 * @see DBSocketLinker#_classicQuery
 * @see DBSocketLinker#_transacCreate
 */
DBSocketLinker.prototype.create = function(type, data, cb){
    switch(type){
        case "project": this._classicQuery({
                                text: "INSERT INTO projects(title, description) VALUES ($1, $2) RETURNING projects.*",
                                values: [data.title, data.description]}, true, cb); break;
        case "us": this._transacCreate(type, data, cb); break;
        case "sprint": this._classicQuery({
                                text: "INSERT INTO sprints (project) VALUES ($1) RETURNING sprints.*",
                                values: [data.project]}, true, cb); break;
        default: cb(new Error("Invalid Data Type")); break;
    }
}

/**
 * @function DBSocketLinker#_transacCreate
 * @description Performs a transactional INSERT
 * @param type - The type of INSERT to perform
 * @param data - The data of the insertion
 * @param cb - The callback that will be called at the end
 */
DBSocketLinker.prototype._transacCreate = async function(type, data, cb){
    if(['us'].includes(type)){
        const client = await this.db.connect();
        let res = null;
        try{
            await client.query("BEGIN");
            if(type === "us"){
                res = await client.query({
                    text: "INSERT INTO user_stories (feature, logs, estimate, project) VALUES ($1, $2, $3, $4) RETURNING user_stories.*",
                    values: [data.feature, data.logs, data.estimate, data.project]});
                await client.query({
                    text: "INSERT INTO us_sprints (project, us, estimate) VALUES ($1, $2, $3)",
                    values: [data.project, res.rows[0].id, res.rows[0].estimate]});
            }
            await client.query("COMMIT");
            cb(res.rows[0]);
        }catch(e){
            await client.query("ROLLBACK");
            cb(e);
        }finally{
            client.release();
        }
    }
}

/**
 * @function DBSocketLinker#send_update
 * @description Sends an update query to the database
 * @param args - The type and data of the object to be updated
 * @param cb - The callback that will be called at the end
 * @see DBSocketLinker#_classicQuery
 * @see DBSocketLinker#_transacUpdate
 */
DBSocketLinker.prototype.send_update = function(args, cb){
    switch(args.type){
        case 'us': this._transacUpdate(args.type, args.data, cb); break;
        case 'usp_move': this._classicQuery({
                                    text: 'UPDATE us_sprints SET sprint=$1 WHERE id=$2 AND project=$3 AND locked=0',
                                    values: [args.data.sprint, args.data.id, args.data.project]
                              }, false, cb); break;
        case 'usp_remove_overflow': this._transacUpdate(args.type, args.data, cb); break;
        case 'usp_update_overflow': this._transacUpdate(args.type, args.data, cb); break;
        case 'sprint': this._classicQuery({
                                 text: 'UPDATE sprints SET points=$1 WHERE id=$2 AND project=$3',
                                 values: [args.data.points, args.data.id, args.data.project]
                            }, false, cb); break;
        default: cb(new Error("Invalid Data Type")); break;
    }
}

/**
 * @function DBSocketLinker#_transacUpdate
 * @description Performs a transactional UPDATE
 * @param type - The type of UPDATE to perform
 * @param data - The data of the update
 * @param cb - The callback that will be called at the end
 */
DBSocketLinker.prototype._transacUpdate = async function(type, data, cb){
    if(['us', 'usp_remove_overflow', 'usp_update_overflow'].includes(type)){
        const client = await this.db.connect();
        try{
            await client.query("BEGIN");
            if(type === "us"){
                await client.query({
                            text: 'UPDATE user_stories SET (feature, logs, estimate) = ($1,$2,$3) WHERE id=$4 AND project=$5',
                            values: [data.feature, data.logs, data.estimate, data.id, data.project]});
                await client.query({
                            text: "UPDATE us_sprints SET estimate=$1 WHERE project=$2 AND us=$3 AND locked=0",
                            values: [data.estimate, data.project, data.id]});
            }
            if(type === "usp_remove_overflow"){
                await client.query({
                            text: 'UPDATE us_sprints SET sprint=null WHERE id=$1 AND project=$2 AND locked=0',
                            values: [data.id, data.project]});
                await client.query({
                            text: 'UPDATE user_stories SET (feature, logs, estimate) = ($1,$2,$3) WHERE id=$4 AND project=$5',
                            values: [data.feature, data.logs, data.estimate, data.us, data.project]});
                await client.query({
                            text: 'UPDATE us_sprints SET estimate=$1 WHERE id=$2 AND project=$3 AND locked=0',
                            values: [data.estimate, data.id, data.project]});
            }
            if(type === "usp_update_overflow"){
                await client.query({
                            text: 'UPDATE sprints SET points=$1 WHERE id=$2 AND project=$3',
                            values: [data.sp_points, data.sprint, data.project]});
                await client.query({
                            text: 'UPDATE user_stories SET (feature, logs, estimate) = ($1,$2,$3) WHERE id=$4 AND project=$5',
                            values: [data.feature, data.logs, data.estimate, data.us, data.project]});
                await client.query({
                            text: "UPDATE us_sprints SET estimate=$1 WHERE project=$2 AND id=$3 AND sprint=$4 AND locked=0",
                            values: [data.estimate, data.project, data.id, data.sprint]});
            }
            await client.query("COMMIT");
            cb(null);
        }catch(e){
            await client.query("ROLLBACK");
            cb(e);
        }finally{
            client.release();
        }
    }
}

/**
 * @function DBSocketLinker#send_delete
 * @description Sends a delete query to the database
 * @param args - The type and data of the object to be deleted
 * @param cb - The callback that will be called at the end
 * @see DBSocketLinker#_transacDelete
 */
DBSocketLinker.prototype.send_delete = function(args, cb){
    let query = null;
    switch(args.type){
        case 'us': this._transacDelete(args.type, args.data, cb); break;
        case 'sprint': this._transacDelete(args.type, args.data, cb); break;
        default: cb(new Error("Invalid Data Type")); break;
    }
}

/**
 * @function DBSocketLinker#_transacDelete
 * @description Performs a transactional DELETE
 * @param type - The type of DELETE to perform
 * @param data - The data of the deletion
 * @param cb - The callback that will be called at the end
 */
DBSocketLinker.prototype._transacDelete = async function(type, data, cb){
    if(['us', 'sprint'].includes(type)){
        const client = await this.db.connect();
        try{
            await client.query("BEGIN");
            if(type === "us"){
                await client.query({
                            text: "DELETE FROM us_sprints WHERE project=$1 AND us=$2 AND locked=0",
                            values: [data.project, data.id]});
                await client.query({
                            text: 'DELETE FROM user_stories WHERE id=$1 AND project=$2',
                            values: [data.id, data.project]});
            }
            if(type === "sprint"){
                await client.query({
                            text: 'UPDATE us_sprints SET sprint=null WHERE project=$1 AND sprint=$2 AND locked=0',
                            values: [data.project, data.id]});
                await client.query({
                            text: 'DELETE FROM sprints WHERE id=$1 AND project=$2',
                            values: [data.id, data.project]});
            }
            await client.query("COMMIT");
            cb(null);
        }catch(e){
            await client.query("ROLLBACK");
            cb(e);
        }finally{
            client.release();
        }
    }
}
