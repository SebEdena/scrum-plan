const {ipcRenderer} = require('electron');
const notifier = require('node-notifier');
const path = require('path');
let data = require('electron').remote.getGlobal("data");

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
    var data = {};
    data['name'] = $("#input_pj_name").val();
    data['description'] = $("#input_pj_desc").val();
    ipcRenderer.send("create", {type:"project", data: data});
});

ipcRenderer.on("load", (event, args) => {
    switch (args['type']){
        case "projects": load_projects();
            break;
        default:
            break;
    }
});

ipcRenderer.on("created", (event, args) => {
    console.log(args);
    var params = init_notification(args);
    notifier.notify (params);
});

function load_projects(){
    $("#html_open_project").html("");
    if (data['projects'] !== undefined){
        for (project of data['projects']){
            var div = $.parseHTML(`
                <div class="row mt-3 project">
                <div class="col-sm-9">
                <div class="row"><h5>${project.title}</h5></div>
                <div class="row offset-md-1">${project.description}</div>
                </div>
                <div class="col-sm-3 text-center"><a role="button" class="btn btn-success btn-sm">Open</a></div>
                </div>
                `);
                $(div).find(".project").data("project_id", project.id);
                $("#html_open_project").append($(div));
            }
    }else{
        $("#html_open_project").append(`<h5>No project found.</h5>`);
    }
}

function init_notification(args){
    var param = {sound: true, wait: false};
    if(args['status'] === "ok"){
        param['title'] = 'Success!';
        param['icon'] = path.join(__dirname, '../img/ok.png');
        switch(args["kind"]){
            case "project": param['message'] = "The project \""
                + args['data']["name"] + "\" has been successfully created.";
                break;
            default:
                break;
        }
    }else{
        param['title'] = 'Error!';
        param['icon'] = path.join(__dirname, '../img/nok.png');
        switch(args["kind"]){
            case "project": param['message'] = "The project \""
                + args['data']["name"] + "\" could not be created.";
                break;
            default:
                break;
        }
    }
    return param;
}

load_projects();
