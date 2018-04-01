const pg = require('pg');
module.exports = DBSocketLinker;

function DBSocketLinker(db_cli, skt){
    this.db = db_cli;
    this.socket = skt;
    this.initEvents();
}

DBSocketLinker.prototype.initEvents = function(){
    this.socket.on('load', (type)=>{
        this.load(type, (err, data) =>{
            this.socket.emit('loaded', {type:type, err:err, data: data});
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
}

/**
 * @function load
 * @description Load a particular type of object from database
 * @param type - The type of data that needs to be loaded
 * @param cb - The callback that will be called at the end
 */
DBSocketLinker.prototype.load = function(type, cb){
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
        case "sprints": query = {
                            name: 'fetch-all-sprints',
                            text: 'SELECT sp.* FROM sprints sp WHERE sp.project=$1 ORDER BY sp.id',
                            values: [global.data.current.id]
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
 * @function create
 * @description Inserts a new row in the database corresponding to an object
 * @param type - The type of data that needs to be inserted
 * @param data - The data to be inserted
 * @param callback - The callback that will be called at the end
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
