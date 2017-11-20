let tmp_us = [];
ipcRenderer.send("fetch", {type:"user_stories"});

ipcRenderer.on("load", (event, args) => {
    switch(args['type']){
        case "user_stories": fill_us(); break;
        default: break;
    }
});

ipcRenderer.on("created", (event, args) => {
    if(args.kind === "us" && args.status === "ok"){
        console.log(args);
        //validate_us($('#us_tmp'+args.data.tmp_ticket), args.data);
    }else{
        console.log(args);
    }
});

$('#create_us').on('click', () => {
    if($('#us_new').length !== 0){
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
    console.log('entered fill us');
    for(let us of remote.getGlobal('data').user_stories){
        console.log(us);
        let html = `
            <div class="container user_story rounded" id="us${us.id}">
                <div class="d-flex justify-content-between align-items-end">
                        <div><h4>User Story #${us.id}</h4></div>
                        <div>
                            <span class="btn-group">
                                <button type="button" class="btn btn-secondary">Edit</button>
                                <button type="button" class="btn btn-danger">Delete</button>
                            </span>
                        </div>
                </div>
                <form>
                    <div class="form-group">
                        <label for="feat_us">Feature</label>
                        <input type="text" class="form-control" id="feat_us" value="${us.feature}" placeholder="Enter story feature" maxlength="256" required disabled>
                        <label class="pt-2" for="desc_us">Feature Logs</label>
                        <textarea class="form-control mb-2" id="desc_us" rows="3" placeholder="Feature logs" maxlength="512" disabled>${us.logs}</textarea>
                    </div>
                </form>
            </div>
        `;
        $("#features").append($(html));
        init_events($('#us' + us.id));
    }
}

function init_create(item){
    item.find('#del').on('click', () => {
        $(item).remove();
    });
    item.find('#ok').on('click', () => {
        $(item).find('form').trigger('submit');
    });
    item.find("form").validate({
        submitHandler: (form) => {
            item.find('button').val('Edit').removeClass("btn-success").addClass("btn-secondary");
            item.find('button').prop('disabled', true).off('click');
            let index = push_tmp();
            item.prop('id', 'us_tmp' + index);
            let data = {
                feature: form.feature.value,
                logs: form.description.value,
                project: project_id,
                tmp_ticket: index
            };
            console.log(data);
            ipcRenderer.send("create", {type: "us", data: data});
        },
        errorElement: "div"
    });
}

function init_events(item){

}

function validate_us(item){
    // item.find('h4').text('User Story #' + )
}

function push_tmp(){
    for(index in tmp_us){
        if(tmp_us[index] === false){
            tmp_us[index] = true;
            console.log(index);
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
