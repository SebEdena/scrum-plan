let drake = null;

$(document).ready(($)=>{
    ipcRenderer.send("fetch", {type:"user_stories"});
    // ipcRenderer.send("fetch", {type:"sprints"});

    ipcRenderer.on("fetched", (event, args) => {
        if(!(args.ret || ~asked_fetch['spr_backlog'].indexOf(args.type))){
            switch(args['type']){
                case "user_stories": fill_all_sprint_us();
                                     init_containers($('.spr_us_container'));
                                     break;
                // ipcRenderer.send("fetch", {type:"sprints"});
                // case "sprints": DO SOMETHING; break;
                default: break;
            }
            asked_fetch['spr_backlog'].push(args.type);
        }
    });

    function fill_all_sprint_us(){
        let us = remote.getGlobal('data').user_stories;
        for(i in us){
            fill_sprint_us(us[i]);
        }
    }

    function init_containers(containers){
        drake = dragula();
        for(let container of containers){
            drake.containers.push(container);
        }
    }

    function init_spr_events(item, value){
        // let _this = $(this);
        // $(item).find('a').on('click', (e)=>{
        //     e.preventDefault();
        //     let action = item.find('#c'+value)[0].classList.contains('show')?"show":"hide";
        //     item.find('.collapse').collapse(action);
        // });
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

    init_spr_events($('#spr_0'), 0);
    init_spr_events($('#spr_1'), 1);
});
