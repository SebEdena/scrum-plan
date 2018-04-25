/**
 * @file prod_backlog.js
 * Js file for the product backlog module
 * @author Sébastien Viguier
 */
'use strict';
let tmp_us = []; //Array of us not validated by the database yet
let us_update = {}; //Array of sprints containing user stories to be updated after sprint update
let us_sprint_update = []; //Array of user stories to be updated once removed from sprint
let locked = {};

$(document).ready(($)=>{
    ipcRenderer.send("fetch", {type:"us_sprints"});//Asks to fetch the user_stories

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour on fetched event
     * @listens ipcRenderer:fetched
     * @param event - The event
     * @param args - Parameters of the event
     */
    ipcRenderer.on("fetched", (event, args) => {
        if(!(args.err || ~asked_fetch['prod_backlog'].indexOf(args.type))){
            switch(args['type']){
                case "us_sprints": check_us();
                                   ipcRenderer.send("fetch", {type:"user_stories"});
                                   break;
                case "user_stories": fill_all_us(); break;
                default: break;
            }
            asked_fetch['prod_backlog'].push(args.type);
        }
    });

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour on created event
     * @listens ipcRenderer:created
     * @param event - The event
     * @param args - Parameters of the event
     */
    ipcRenderer.on("created", (event, args) => {
        if(args.type === "us"){
            if(args.status === "ok"){
                if($('#us'+args.data.id).length === 0){
                    validate_us($('#us_tmp'+args.data.tmp_ticket), args.data);
                }else{
                    $('#us_tmp'+args.data.tmp_ticket).remove();
                }
                let msg = {title: "Scrum Assistant", type: 'info',buttons: ['Ok']};
                msg.message = 'The US #' + args.data.id+ ' : \"' + args.data.feature
                        + "\" has been created successfully !";
                dialog.showMessageBox(msg);
            }else{
                let msg = {title: "Scrum Assistant", type: 'error', buttons: ['Retry','Cancel']};
                msg.message = 'The US #' + args.data.id+ ' : \"' + args.data.feature
                        + "\" could not be created.";
                dialog.showMessageBox(msg, resp => {
                    if(resp === 0){
                        $('#us_tmp'+args.data.tmp_ticket).find('form').trigger('submit');
                    }else{
                        item.find('button').prop('disabled', false);
                    }
                });
            }
        }
    });

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour on update event
     * @listens ipcRenderer:update
     * @param event - The event
     * @param args - Parameters of the event
     */
    ipcRenderer.on('update', (event, args) => {
        if(args.type === "user_stories"){
            if(us_sprint_update.indexOf(args.data.id) >= 0){
                us_sprint_update.splice(us_sprint_update.indexOf(args.data.id), 1);
                update_us($('#us' + args.data.id), $('#us' + args.data.id).find('form')[0]);
            }else{
                $("#us"+args.data.id).find('#feat').val(args.data.feature);
                $("#us"+args.data.id).find('#desc').val(args.data.logs);
                $("#us"+args.data.id).find('#est').val(adjust_display(args.data.estimate));
            }
            if(locked(args.data.id)){
                $('#us'+args.data.id).find("button:not(#del)").prop("disabled", false);
            }else{
                $('#us'+args.data.id).find("button").prop("disabled", false);
            }
        }
        if(args.type === "sprints"){
            let id = 0;
            while(us_update[args.data.id] != null && us_update[args.data.id].length > 0){
                id = us_update[args.data.id].shift();
                update_us($('#us' + id), $('#us' + id).find('form')[0]);
            }
        }
    });

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour on delete event
     * @listens ipcRenderer:delete
     * @param event - The event
     * @param args - Parameters of the event
     */
    ipcRenderer.on('delete', (event, args) => {
        if(args.type === "user_stories"){
            $('#us' + args.data.id).remove();
        }
    });

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour on insert event
     * @listens ipcRenderer:insert
     * @param event - The event
     * @param args - Parameters of the event
     */
    ipcRenderer.on('insert', (event, args) =>{
        if(args.type === "user_stories" && $('#us'+args.data.id).length === 0){
            fill_us(args.data, args.data.locked);
        }
    });

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour on error event
     * @listens ipcRenderer:error
     * @param event - The event
     * @param args - Parameters of the event
     */
    ipcRenderer.on('error', (event, args) => {
        if(args.type === "us"){
            // let msg = 'The US #' + args.data.id+ ' : \"' + args.data.feature;
            // switch(args.action){
            //     case 'update' : message += "\" could not be updated."; break;
            //     case 'delete' : message += "\" could not be deleted."; break;
            //     default : break;
            // }
            // dialog.showMessageBox({title: "Scrum Assistant", type: 'error', buttons: ['Ok'],
            // message: msg}, ()=>{});
            $('#us'+args.data.id).find("button").prop("disabled", false);
        }
    });

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour on click event of create_us button
     * @listens #create_us:click
     */
    $('#create_us').on('click', () => {
        if($('#us_new').length !== 0){
            $('#us_new').find('input[name="feature"]').trigger('focus');
            return;
        }
        let html = `
            <div class="container new_user_story rounded" id="us_new">
                <div class="d-flex justify-content-between align-items-end">
                    <div><h4>New User Story</h4></div>
                    <div>
                        <span class="btn-group">
                            <button type="button" id="ok" class="btn btn-success">Ok</button>
                            <button type="button" id="del" class="btn btn-danger">Delete</button>
                        </span>
                    </div>
                </div>
                <form>
                    <div class="form-row">
                        <div class="col-md-10">
                            <label for="feat">Feature</label>
                            <input type="text" class="form-control" id="feat" name="feature" placeholder="Enter story feature" maxlength="256" required>
                        </div>
                        <div class="col-md-2">
                            <label for="est">Estimate</label>
                            <input type="number" class="form-control" id="est" name="estimate" maxlength="256" min="0" value="0" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="pt-2" for="desc">Feature Logs</label>
                        <textarea class="form-control mb-2" id="desc" name="description" rows="3" placeholder="Feature logs" maxlength="512"></textarea>
                    </div>
                </form>
            </div>
        `;
        $("#features").append($(html));
        init_create($("#us_new"));
    });

    /**
     * @function fill_all_us
     * @description Fills all user stories by calling fill_us
     * @see fill_us
     */
    function fill_all_us(){
        let us = remote.getGlobal('data').user_stories;
        for(let i in us){
            fill_us(us[i], locked[i]);
        }
    }

    /**
     * @function fill_us
     * @description Fills a user story
     * @param us - The data of the user story
     */
    function fill_us(us, locked){
        let html = `
            <div class="container user_story rounded" id="us${us.id}">
                <div class="d-flex justify-content-between align-items-end">
                    <div><h4>User Story #${us.id}</h4></div>
                    <div>
                        <span class="btn-group">
                            <button type="button" id="ok" class="btn btn-secondary">Edit</button>
                            <button type="button" id="del" class="btn btn-danger" ${locked?"disabled":""}>Delete</button>
                        </span>
                    </div>
                </div>
                <form>
                    <div class="form-row">
                        <div class="col-md-10">
                            <label for="feat">Feature</label>
                            <input type="text" class="form-control" id="feat" name="feature" placeholder="Enter story feature" value="${us.feature}" maxlength="256" required disabled>
                        </div>
                        <div class="col-md-2">
                            <label for="est">Estimate</label>
                            <input type="number" class="form-control" id="est" name="estimate" maxlength="256" min="0" value="${adjust_display(us.estimate)}" required disabled>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="pt-2" for="desc">Feature Logs</label>
                        <textarea class="form-control mb-2" id="desc" name="description" rows="3" placeholder="Feature logs" maxlength="512" disabled>${us.logs}</textarea>
                    </div>
                </form>
            </div>
        `;
        $("#features").append($(html));
        $('#us' + us.id).data('id', us.id);
        init_events($('#us' + us.id));
        insert_us(us.id, $('#us' + us.id));
    }

    /**
     * @function init_create
     * @description Initializes the events on a newly created user story
     * @param item - The html node of the user story
     * @fires ipcMain:create
     */
    function init_create(item){
        item.find('input[name="feature"]').trigger('focus');
        item.find('#del').on('click', () => {
            ask_delete(item, true);
        });
        item.find('#ok').on('click', () => {
            $(item).find('form').trigger('submit');
        });
        item.find("form").validate({
            submitHandler: (form) => {
                item.find('#ok').text('Edit').removeClass("btn-success").addClass("btn-secondary");
                item.find("input, textarea, button").prop("disabled", true);
                let index = push_tmp();
                item.prop('id', 'us_tmp' + index);
                let data = {
                    feature: form.feature.value,
                    logs: form.description.value,
                    estimate: parseFloat(form.estimate.value.replace(",", ".")).toFixed(2),
                    tmp_ticket: index
                };
                ipcRenderer.send("create", {type: "us", data: data});
            },
            errorElement: "div"
        });
    }

    function check_us(){
        let usp = remote.getGlobal('data').us_sprints;
        for(let i in usp){
            let item = usp[i];
            if(!locked.hasOwnProperty(item.us)){
                locked[item.us] = false;
            }else{
                if(locked[item.us]) continue;
            }
            locked[item.us] = locked[item.us] || item.locked;
        }
    }

    /**
     * @function init_events
     * @description Initializes the events on existing user stories
     * @param item - The html node of the user story
     */
    function init_events(item){
        item.find('#del').on('click', () => {
            if(item.find('#del').text() === "Delete"){
                ask_delete(item, false);
            }else{
                let us = remote.getGlobal('data').user_stories;
                for(let i in us){
                    if (us[i].id === item.data('id')){
                        item.find('#feat').val(us[i].feature);
                        item.find('#desc').val(us[i].logs);
                        item.find('#est').val(parseFloat(us[i].estimate));
                        break;
                    }
                }
                item.find('#ok').text('Edit').removeClass("btn-success").addClass("btn-secondary");
                if(locked[item.data('id')]) item.find("#del").prop("disabled", true);
                item.find('#del').text('Delete');
                item.find("input, textarea").prop("disabled", true);
            }
        });
        item.find('#ok').on('click', () => {
            if(item.find('#ok').text() === "Ok"){
                item.find('form').trigger('submit');
                item.find('#del').text('Delete');
            }else{
                if(locked[item.data('id')]){
                    item.find("input:not(#est), textarea").prop("disabled", false);
                }else{
                    item.find("input, textarea").prop("disabled", false);
                }
                item.find('#ok').text('Ok');
                item.find('#del').text('Cancel');
                if(locked[item.data('id')]) item.find("#del").prop("disabled", false);
                item.find('#ok').removeClass('btn-secondary').addClass('btn-success');
                item.find('input[name="feature"]').trigger('focus');
            }
        });
        item.find("form").validate({
            submitHandler: (form) => {
                item.find('#ok').text('Edit').removeClass("btn-success").addClass("btn-secondary");
                item.find("input, textarea, button").prop("disabled", true);
                if(verify_update_ok(item)){
                    update_us(item, form);
                }else{
                    us_est_overflow_resolve(item);
                }
            },
            errorElement: "div"
        });
    }

    /**
     * @function insert_us
     * @description Inserts an us in the right position (order by user story id)
     * @param id - The id of the user story
     * @param us - The html node of the user story
     */
    function insert_us(id, us){
        for (let item of $(".user_story:not(#us" + id + ")")){
            if(id < $(item).data('id')){
                us.detach().insertBefore($(item));
                return;
            }
        }
        if($(".user_story:not(#us" + id + ")").length > 0){
            us.detach().insertAfter($(".user_story:not(#us" + id + ")").last());
        }
    }

    /**
     * @function validate_us
     * @description Converts a temporary user story into a valid one
     * @param item - The html node of the user story
     * @param data - The data of the user story
     */
    function validate_us(item, data){
        pop_tmp(data.tmp_ticket);
        insert_us(data.id, item);
        item.data('id', data.id);
        item.find('button').off('click');
        item.find('h4').text('User Story #' + data.id);
        item.prop('id', 'us' + data.id).removeClass('new_user_story').addClass('user_story');
        item.find('form').data('validator').destroy();
        init_events(item);
        item.find('button').prop('disabled', false);
        item.find('#est').val(adjust_display(data.estimate));
    }

    /**
     * @function push_tmp
     * @description Gives a temporary user story an index from the tmp_us array
     * @returns {number} The index of where the user
     */
    function push_tmp(){
        let index = -1;
        for(index in tmp_us){
            if(tmp_us[index] === false){
                tmp_us[index] = true;
                return index;
            }
        }
        index = tmp_us.length;
        tmp_us[index] = true;
        return index;
    }

    /**
     * @function pop_tmp
     * @description Retrieves an index from the tmp_us array
     * @param index - The index to be retrieved
     */
    function pop_tmp(index){
        tmp_us[index] = false;
    }

    /**
     * @function ask_delete
     * @description Asks the user a delete confirmation and deletes if asked
     * @param item - The user story to be removed
     * @param new_us - True if the us is still temporary
     */
    function ask_delete(item, new_us){
        if(new_us){
            item.find("input, textarea, button").prop("disabled", true);
        }else{
            item.find("button").prop("disabled", true);
        }
        dialog.showMessageBox({title: "Scrum Assistant", type: 'info',buttons: ['Yes', 'No'],
        message: "Delete this User Story ?"}, (resp) => {
            if(resp === 0){
                if(new_us){
                    item.remove();
                }else{
                    ipcRenderer.send('delete', {type: "us", data: {id:item.data('id'),
                    feature: item.find('#feat').val()
                    // , project: project_id
                    }});
                }
            }else{
                if(new_us){
                    item.find("input, textarea, button").prop("disabled", false);
                }else{
                    item.find("button").prop("disabled", false);
                }
            }
        });
    }

    /**
     * @function verify_update_ok
     * @description Checks if the update of a user story is valid, to prevent
       edge case with sprint points
     * @param item - The user story to be checked
     * @returns {boolean} True if it is ok to update the user story
     */
    function verify_update_ok(item){
        let current_us = remote.getGlobal('data').user_stories[item.data('id')];
        let us = remote.getGlobal('data').user_stories;
        if(current_us.sprint === -1){
            return true;
        }
        let sprint = remote.getGlobal('data').sprints[current_us.sprint];
        let diff = new Decimal(sprint.points).minus(item.find('#est').val());
        for(let i in us){
            if(us[i].sprint === sprint.id && us[i].id !== current_us.id){
                diff = diff.minus(us[i].estimate);
            }
        }
        return diff.toNumber() >= 0;
    }

    /**
     * @function update_us
     * @description Gather the data and sends update request for a user story
     * @param item - The user story to updated
     * @param form - The form of the user story
     * @fires ipcMain:update
     */
    function update_us(item, form){
        let data = {
            feature: form.feature.value,
            logs: form.description.value,
            estimate: parseFloat(form.estimate.value.replace(",", ".")).toFixed(2),
            // project: project_id,
            id: item.data('id')
        };
        ipcRenderer.send("update", {type: "us", data: data});
    }

    /**
     * @function us_est_overflow_resolve
     * @description Asks the user how to resolve a edge case update of a user story
     * @param item - The html node of the user story to updated
     */
    function us_est_overflow_resolve(item){
        let us = remote.getGlobal('data').user_stories[item.data('id')];
        let sprint = remote.getGlobal('data').sprints[us.sprint];
        dialog.showMessageBox(remote.getCurrentWindow(),
            {title: "Scrum Assistant",
            type: 'info',
            buttons: ['Revert', 'Remove US from sprint', 'Add sprint points'],
            defaultId:2,
            message: `The estimate change in this user story (#${us.id}) causes sprint (#${sprint.id}) to contain more story points than it should. \nWhat do you want to do ?`},
            (resp)=>{
                switch (resp) {
                    case 0: revert_us_points(us); break;
                    case 1: remove_us_sprint(us, sprint); break;
                    case 2: sprint_update_for_overflow(us, sprint); break;
                    default: break;
                }
            });
    }

    /**
     * @function sprint_update_for_overflow
     * @description Updates the sprint total point of a user story that has an estimate overflow
     * @param us - The data of the user story
     * @param sprint - The data of the sprint
     * @fires ipcMain:update
     */
    function sprint_update_for_overflow(us, sprint){
        if(!us_update.hasOwnProperty(sprint.id)){
            us_update[sprint.id] = [];
        }
        us_update[sprint.id].push(us.id);
        let new_points = new Decimal(sprint.points)
                              .minus(us.estimate)
                              .plus($('#us'+us.id).find('#est').val())
                              .toNumber();
        let data = {
            id: sprint.id,
            // project: project_id,
            points: new_points
        };
        ipcRenderer.send('update', {type: "sprint", data: data});
    }

    /**
     * @function revert_us_points
     * @description Reverts the estimate of a user story
     * @param us - The data of the user story
     */
    function revert_us_points(us){
        $('#us'+us.id).find('#est').val(parseFloat(us.estimate));
        $('#us'+us.id).find("button").prop("disabled", false);

        $('#us'+us.id).find('#ok').text('Ok');
        $('#us'+us.id).find('#del').text('Cancel');
        $('#us'+us.id).find('#ok').removeClass('btn-secondary').addClass('btn-success');
        $('#us'+us.id).find("input, textarea, button").prop("disabled", false);
        $('#us'+us.id).find('input[name="feature"]').trigger('focus');
    }

    /**
     * @function remove_us_sprint
     * @description Removes an us from the sprint when its estimate overflows
     * @param us - The data of the user story
     * @param sprint - The data of the sprint
     * @fires ipcMain:update
     */
    function remove_us_sprint(us, sprint){
        us_sprint_update.push(us.id);
        ipcRenderer.send("update", {type:"us_sprint",
            data: {
                id:us.id,
                // project:project_id,
                sprint:-1
            }
        });
    }
});
