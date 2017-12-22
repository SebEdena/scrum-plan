const {ipcRenderer} = require('electron');
const remote = require('electron').remote;
const {dialog} = remote.require('electron');

$(document).ready(($)=>{
    ipcRenderer.send("fetch", {type:"projects"});

    ipcRenderer.on("fetched", (event, args) => {
        if(!args.ret){
            switch(args['type']){
                case "projects": load_projects(); break;
                default: break;
            }
        }
    });

    $("#open").on("click", function(){
        $("#modal_open_project").modal("show");
    });

    $("#create").on("click", function(){
        $("#modal_create_project").modal("show");
    });

    $("#modal_create_project").on("hidden.bs.modal", function(){
        $("#create_pj_form").find('textarea,input').val('');
    });

    $("#create_pj_form").on("submit", function(e){
        e.preventDefault();
        let data = {};
        data['title'] = $("#input_pj_name").val();
        data['description'] = $("#input_pj_desc").val();
        ipcRenderer.send("create", {type:"project", data: data});
        $("#modal_create_project").modal("hide");
    });

    ipcRenderer.on("insert", (event, args) => {
        switch (String(args['type'])){
            case "projects": insert_project(args.data);
                break;
            default:
                break;
        }
    });

    ipcRenderer.on("update", (event, args) => {
        if(args.type === 'projects'){
            update_project(args.data.id);
        }
    });

    ipcRenderer.on("created", (event, args) => {
        pj_msg(args);
    });

    function load_projects(){
        let projects = remote.getGlobal("data")['projects'];
        $("#html_open_project").html("");
        if (projects.length !== 0){
            for (let i in projects){
                insert_project(projects[i]);
            }
        }else{
            $("#html_open_project").append(`<h5>No project found.</h5>`);
        }
    }

    function update_project(index){
        let pj = remote.getGlobal("data")['projects'][index];
        $('#pj' + index).find('#title').text(pj.title);
        $('#pj' + index).find('#desc').text(pj.description);
    }

    function insert_project(data){
        var div = $.parseHTML(`
            <div class="row mt-3 project" id='pj${data.id}'>
            <div class="col-sm-9">
            <div class="row"><h5 id='title'>${data.title}</h5></div>
            <div class="row offset-md-1" id='desc'>${data.description}</div>
            </div>
            <div class="col-sm-3 text-center"><a role="button" class="btn btn-success btn-sm">Open</a></div>
            </div>
            `);
            $(div).find('a').data("project_id", data.id);
            $("#html_open_project").append($(div));

            $(div).find(".btn-success").on('click', (e) => {
                $("#modal_open_project").modal("hide");
                $("#create, #open").off("click");
                ipcRenderer.send('open_project',{id:$(e.target).data("project_id")});
            });
    }

    function pj_msg(args){
        if(args.kind === "project"){
            if(args.status === "ok"){
                let msg = {title: "Scrum Assistant", type: 'info',buttons: ['Ok']};
                msg.message = 'The project \"' + args.data.title + '\" ' + "has been created successfully !";
                dialog.showMessageBox(msg);
            }else{
                let msg = {title: "Scrum Assistant", type: 'error', buttons: ['Retry','Cancel']};
                msg.message = 'The project \"' + args.data.title + '\" ' + "could not be created.";
                dialog.showMessageBox(msg, resp => {
                    if(resp === 0){
                        ipcRenderer.send("create", {type:"project", data: {
                            title: args.data.title,
                            description: args.data.description
                        }});
                    }
                });
            }
        }
    }
});
