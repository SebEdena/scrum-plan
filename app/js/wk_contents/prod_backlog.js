let tmp_us = [];
const us_msg_limit = 50;
ipcRenderer.send("fetch", {type:"user_stories"});

ipcRenderer.on("load", (event, args) => {
    switch(args['type']){
        case "user_stories": fill_us(); break;
        default: break;
    }
});

ipcRenderer.on("created", (event, args) => {
    if(args.kind === "us"){
        if(args.status === "ok"){
            validate_us($('#us_tmp'+args.data.tmp_ticket), args.data);
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
        $("#us"+args.data.id).find('#feat_us').val(args.data.feature);
        $("#us"+args.data.id).find('#desc_us').val(args.data.logs);
        $('#us'+args.data.id).find("button").prop("disabled", false);
    }
});

ipcRenderer.on('delete', (event, args) => {
    if(args.type === "user_stories"){
        $('#us' + args.data.id).remove();
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
                <div class="form-group">
                    <label for="feat_us">Feature</label>
                    <input type="text" class="form-control" id="feat_us" name="feature" placeholder="Enter story feature" maxlength="256" required>
                    <label class="pt-2" for="desc_us">Feature Logs</label>
                    <textarea class="form-control mb-2" id="desc_us" name="description" rows="3" placeholder="Feature logs" maxlength="512"></textarea>
                </div>
            </form>
        </div>
    `;
    $("#features").append($(html));
    init_create($("#us_new"));
});

function fill_us(){
    for(let us of remote.getGlobal('data').user_stories){
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
                    <div class="form-group">
                        <label for="feat_us">Feature</label>
                        <input type="text" class="form-control" id="feat_us" name="feature" value="${us.feature}" placeholder="Enter story feature" maxlength="256" required disabled>
                        <label class="pt-2" for="desc_us">Feature Logs</label>
                        <textarea class="form-control mb-2" id="desc_us" name="description" rows="3" placeholder="Feature logs" maxlength="512" disabled>${us.logs}</textarea>
                    </div>
                </form>
            </div>
        `;
        $("#features").append($(html));
        init_events($('#us' + us.id));
        $('#us' + us.id).data('id', us.id);
    }
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
        console.log(item.find('#del').text());
        if(item.find('#del').text() === "Delete"){
            ask_delete(item, false);
        }else{
            for(let us of remote.getGlobal('data').user_stories){
                if (us.id === item.data('id')){
                    item.find('#feat_us').val(us.feature);
                    item.find('#desc_us').val(us.logs);
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
                project: project_id,
                id: item.data('id')
            };
            ipcRenderer.send("update", {type: "us", data: data});
        },
        errorElement: "div"
    });
}

function validate_us(item, data){
    pop_tmp(data.tmp_ticket);
    item.detach().insertAfter($(".user_story").last());
    item.data('id', data.id);
    item.find('button').off('click');
    item.find('h4').text('User Story #' + data.id);
    item.prop('id', 'us' + data.id).removeClass('new_user_story').addClass('user_story');
    item.find('form').data('validator').destroy();
    init_events(item);
    item.find('button').prop('disabled', false);
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
                feature: item.find('feat_us').val(), project: project_id}});
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
