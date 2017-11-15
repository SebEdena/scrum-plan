ipcRenderer.send("fetch", {type:"user_stories"});

ipcRenderer.on("load", (event, args) => {
    switch(args['type']){
        case "user_stories": fill_us(); break;
        default: break;
    };
});

function fill_us(){
    console.log(remote.getGlobal('data').user_stories);
    for(var us of remote.getGlobal('data').user_stories){
        var html = `
            <div class="container user_story rounded" id="us${us.id}">
                <form>
                    <h4 class="pt-3">User Story #${us.id}</h4>
                    <div class="form-group">
                        <label for="feat_us1">Feature</label>
                        <input type="text" class="form-control" id="feat_${us.id}" value="${us.feature}" placeholder="Enter story feature" maxlength="256" disabled>
                        <label class="pt-2" for="desc_us${us.id}">Feature Logs</label>
                        <textarea class="form-control mb-2" id="desc_us${us.id}" rows="3" placeholder="Feature logs" maxlength="512" disabled>${us.logs}</textarea>
                    </div>
                </form>
            </div>
        `;
        $("#features").append(html);
    }
}
