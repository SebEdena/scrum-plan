$(document).ready(($)=>{
    // ipcRenderer.send("fetch", {type:"sprints"});
    //
    // ipcRenderer.on("load", (event, args) => {
    //     switch(args['type']){
    //         case "sprints": fill_all_sprint_us(); break;
    //         default: break;
    //     }
    // });

    function fill_all_sprint_us(){
        let us = remote.getGlobal('data').user_stories;
        for(i in us){
            fill_sprint_us(us[i]);
        }
    }

    function fill_sprint_us(us){
        let html = `<div class="col-xl-6 spr_user_story d-flex flex-row justify-content-around rounded" id="spr_us${us.id}">
        <p>US#${us.id} <small class="text-muted">Estimated: ${us.estimate}</small></p>
        </div>`;
        $("#spr_us").append($(html));
        $('#spr_us' + us.id).data('id', us.id);
        $('#spr_us' + us.id).tooltip({
            placement: 'top', // or bottom, left, right, and variations
            title: us.feature
        });
    }

    fill_all_sprint_us();
});
