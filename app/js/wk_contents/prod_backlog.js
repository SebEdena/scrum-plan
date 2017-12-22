let tmp_us = [];
const us_msg_limit = 50;

$(document).ready(($)=>{
    ipcRenderer.send("fetch", {type:"user_stories"});

    ipcRenderer.on("fetched", (event, args) => {
        if(!(args.ret || ~asked_fetch['prod_backlog'].indexOf(args.type))){
            switch(args['type']){
                case "user_stories": fill_all_us(); break;
                default: break;
            }
            asked_fetch['prod_backlog'].push(args.type);
        }
    });

    ipcRenderer.on("created", (event, args) => {
        if(args.kind === "us"){
            if(args.status === "ok"){
                if($('#us'+args.data.id).length === 0){
                    validate_us($('#us_tmp'+args.data.tmp_ticket), args.data);
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

    ipcRenderer.on('update', (event, args) => {
        if(args.type === "user_stories"){
            $("#us"+args.data.id).find('#feat').val(args.data.feature);
            $("#us"+args.data.id).find('#desc').val(args.data.logs);
            $("#us"+args.data.id).find('#est').val(adjust_display(args.data.estimate));
            $('#us'+args.data.id).find("button").prop("disabled", false);
        }
    });

    ipcRenderer.on('delete', (event, args) => {
        if(args.type === "user_stories"){
            $('#us' + args.data.id).remove();
        }
    });

    ipcRenderer.on('insert', (event, args) =>{
        if(args.kind === "us" && $('#us'+args.data.id).length === 0){
            if(args.status === "ok" ){
                fill_us(args.data);
            }else{
                console.error(args.err.stack);
            }
        }
    });

    ipcRenderer.on('error', (event, args) => {
        console.error(args.err.stack);
        if(args.type === "us"){
            let msg = 'The US #' + args.data.id+ ' : \"' + args.data.feature;
            switch(args.action){
                case 'update' : message += "\" could not be updated."; break;
                case 'delete' : message += "\" could not be deleted."; break;
                default : break;
            }
            dialog.showMessageBox({title: "Scrum Assistant", type: 'error', buttons: ['Ok'],
            message: msg});
            $('#us'+args.data.id).find("button").prop("disabled", false);
        }
    });

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

    function fill_all_us(){
        let us = remote.getGlobal('data').user_stories;
        for(let i in us){
            fill_us(us[i]);
        }
    }

    function fill_us(us){
        let html = `
            <div class="container user_story rounded" id="us${us.id}">
                <div class="d-flex justify-content-between align-items-end">
                    <div><h4>User Story #${us.id}</h4></div>
                    <div>
                        <span class="btn-group">
                            <button type="button" id="ok" class="btn btn-secondary">Edit</button>
                            <button type="button" id="del" class="btn btn-danger">Delete</button>
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
                    project: project_id,
                    tmp_ticket: index
                };
                ipcRenderer.send("create", {type: "us", data: data});
            },
            errorElement: "div"
        });
    }

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
                        break;
                    }
                }
                item.find('#ok').text('Edit').removeClass("btn-success").addClass("btn-secondary");
                item.find('#del').text('Delete');
                item.find("input, textarea").prop("disabled", true);
            }
        });
        item.find('#ok').on('click', () => {
            if(item.find('#ok').text() === "Ok"){
                item.find('form').trigger('submit');
                item.find('#del').text('Delete');
            }else{
                item.find("input, textarea").prop("disabled", false);
                item.find('#ok').text('Ok');
                item.find('#del').text('Cancel');
                item.find('#ok').removeClass('btn-secondary').addClass('btn-success');
            }
        });
        item.find("form").validate({
            submitHandler: (form) => {
                item.find('#ok').text('Edit').removeClass("btn-success").addClass("btn-secondary");
                item.find("input, textarea, button").prop("disabled", true);
                let data = {
                    feature: form.feature.value,
                    logs: form.description.value,
                    estimate: parseFloat(form.estimate.value.replace(",", ".")).toFixed(2),
                    project: project_id,
                    id: item.data('id')
                };
                ipcRenderer.send("update", {type: "us", data: data});
            },
            errorElement: "div"
        });
    }

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

    function push_tmp(){
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

    function pop_tmp(index){
        tmp_us[index] = false;
    }

    function adjust_display(data){
        return parseFloat(data).toString();
    }

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
                    feature: item.find('#feat').val(), project: project_id}});
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
});
