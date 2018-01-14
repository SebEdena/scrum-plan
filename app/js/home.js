/**
 * @file home.js
 * Js file for the homepage
 * @author Sébastien Viguier
 */
'use strict';
const {ipcRenderer} = require('electron');
const remote = require('electron').remote;
const {dialog} = remote.require('electron');

$(document).ready(($)=>{
    ipcRenderer.send("fetch", {type:"projects"}); //Asks to fetch the projects

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour on fetched item event
       and calls load_projects function
     * @listens ipcRenderer#fetched
     * @param event - The event
     * @param args - Parameters of the event
     * @see load_projects
     */
    ipcRenderer.on("fetched", (event, args) => {
        if(!args.ret){
            switch(args['type']){
                case "projects": load_projects(); break;
                default: break;
            }
        }
    });

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour after click on open button
     * @listens #open:click
     */
    $("#open").on("click", ()=>{
        $("#modal_open_project").modal("show");
    });

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour after click on create button
     * @listens #create:click
     */
    $("#create").on("click", ()=>{
        $("#modal_create_project").modal("show");
    });

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour after modal_create_project
       being hidden. Clears the inputs of the modal
     * @listens #modal_create_project:hidden.bs.modal
     * @see Bootstrap documentation
     */
    $("#modal_create_project").on("hidden.bs.modal", ()=>{
        $("#create_pj_form").find('textarea,input').val('');
    });

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour after submitting
       create_pj_form form.
     * @param e - The event
     * @listens #create_pj_form:submit
     * @fires ipcMain#create
     */
    $("#create_pj_form").on("submit", (e)=>{
        e.preventDefault();
        let data = {};
        data['title'] = $("#input_pj_name").val();
        data['description'] = $("#input_pj_desc").val();
        ipcRenderer.send("create", {type:"project", data: data});
        $("#modal_create_project").modal("hide");
    });

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour after receiving insert
       event from ipcMain
     * @listens ipcRenderer#insert
     * @param event - The event
     * @param args - Parameters of the event
     * @see insert_project
     */
    ipcRenderer.on("insert", (event, args) => {
        switch (String(args['type'])){
            case "projects": insert_project(args.data);
                break;
            default:
                break;
        }
    });

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour after receiving update
       event from ipcMain
     * @listens ipcRenderer#update
     * @param event - The event
     * @param args - Parameters of the event
     * @see update_project
     */
    ipcRenderer.on("update", (event, args) => {
        if(args.type === 'projects'){
            update_project(args.data.id);
        }
    });

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour after receiving created
       event from ipcMain
     * @listens ipcRenderer#created
     * @param event - The event
     * @param args - Parameters of the event
     * @see pj_msg
     */
    ipcRenderer.on("created", (event, args) => {
        pj_msg(args);
    });

    /**
     * @function load_projects
     * @description Loads the list of projects into the modal_open_project modal
     */
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

    /**
     * @function update_project
     * @description Updates the project with the given index number
     * @param index - The index of the project
     */
    function update_project(index){
        let pj = remote.getGlobal("data")['projects'][index];
        $('#pj' + index).find('#title').text(pj.title);
        $('#pj' + index).find('#desc').text(pj.description);
    }

    /**
     * @function insert_project
     * @description Inserts a new project
     * @param data - The data of the project
     * @fires ipcMain#open_project
     */
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

    /**
     * @function pj_msg
     * @description Displays a message for a created event status, whether the
       project was successfully created or not.
     * @param args - The data of the created event result
     * @fires ipcMain#create
     */
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
