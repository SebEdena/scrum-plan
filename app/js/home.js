const {ipcRenderer} = require('electron');
const remote = require('electron').remote;
const notifier = require('node-notifier');

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
    $("#modal_create_project").modal("hide");
});

ipcRenderer.on("insert", (event, args) => {
    console.log(args);
    switch (String(args['type'])){
        case "projects": load_projects();
            break;
        default:
            break;
    }
});

ipcRenderer.on("update", (event, args) => {
    console.log(args);
    if(args.type === 'projects'){
        update_project(args.data.id);
    }
});

ipcRenderer.on("created", (event, args) => {
    var params = init_notification(args);
    notifier.notify (params);
});

function load_projects(){
    data = remote.getGlobal("data");
    $("#html_open_project").html("");
    if (data['projects'].length !== 0){
        for (project of data['projects']){
            var div = $.parseHTML(`
                <div class="row mt-3 project" id='pj${project.id}'>
                    <div class="col-sm-9">
                        <div class="row"><h5 id='title'>${project.title}</h5></div>
                        <div class="row offset-md-1" id='desc'>${project.description}</div>
                    </div>
                <div class="col-sm-3 text-center"><a role="button" class="btn btn-success btn-sm">Open</a></div>
                </div>
                `);
            $(div).find('a').data("project_id", project.id);
            $("#html_open_project").append($(div));

            $(div).find(".btn-success").on('click', (e) => {
                $("#modal_open_project").modal("hide");
                $("#create, #open").off("click");
                ipcRenderer.send('open_project',{id:$(e.target).data("project_id")});
            });
        }
    }else{
        $("#html_open_project").append(`<h5>No project found.</h5>`);
    }
}

function update_project(index){
    let pjs = remote.getGlobal("data")['projects'];
    for(let pj of pjs){
        if(pj.id === index){
            console.log($("#pj"+index));
            $('#pj' + index).find('#title').text(pj.title);
            $('#pj' + index).find('#desc').text(pj.description);
            break;
        }
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
