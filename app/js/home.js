const {ipcRenderer} = require('electron');
let data = require('electron').remote.getGlobal("data");

$("#open").on("click", function(){
    $("#modal_open_project").modal("show");
});

ipcRenderer.on("load", (event, args) => {
    switch (args[0]['type']){
        case "projects": load_projects();
            break;
        default:
            break;
    }
});

function load_projects(){
    for (project of data['projects']){
        console.log(project);
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
}

load_projects();
