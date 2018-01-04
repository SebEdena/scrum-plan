let drake = null;

$(document).ready(($)=>{
    ipcRenderer.send("fetch", {type:"user_stories"});

    ipcRenderer.on("fetched", (event, args) => {
        if(!(args.ret || ~asked_fetch['spr_backlog'].indexOf(args.type))){
            switch(args['type']){
                case "user_stories": ipcRenderer.send("fetch", {type:"sprints"});
                                     break;
                case "sprints": fill_all_sprints();
                                init_containers($('.spr_us_container'));
                                fill_all_sprint_us();
                                break;
                default: break;
            }
            asked_fetch['spr_backlog'].push(args.type);
        }
    });

    ipcRenderer.on('created', (event, args)=>{
        if(args.err && args.kind === "sprint"){
            dialog.showMessageBox({title: "Scrum Assistant",
                                    type: 'error',
                                    buttons: ['ok'],
                                    message: "Unable to create a new sprint."},
                                    (resp)=>{});
        }
    });

    ipcRenderer.on('insert', (event, args) =>{
        if(args.type === "sprints"){
            fill_sprint(args.data);
        }
    });

    $('#create_sp').on('click', ()=>{
        ipcRenderer.send('create', {type: "sprint", data:{project:project_id}});
    });

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
        $('#spr_us' + us.id).data('estimate', us.estimate);
        $('#spr_us' + us.id).tooltip({
            placement: 'top', // or bottom, left, right, and variations
            title: us.feature
        });
        assign_us_to_sprint($('#spr_us'+us.id), us.sprint);
    }

    function fill_all_sprints(){
        let sprints = remote.getGlobal('data').sprints;
        for(i in sprints){
            fill_sprint(sprints[i]);
        }
    }

    function fill_sprint(sprint){
        let html = `
            <div class="card pj_spr" id="spr_${sprint.id}">
                <div class="card-header" role="tab" id="h${sprint.id}">
                    <div class="row d-flex justify-content-between">
                        <h3 class="m-0 col-xl-3">
                            <a data-toggle="collapse" href="#c${sprint.id}" aria-expanded="true" aria-controls="c${sprint.id}">
                                Sprint #${sprint.id}
                            </a>
                        </h3>
                        <h3 class="m-0 col-xl-4" id="left"></h3>
                        <form class="form-inline m-0 col-xl-5 d-flex">
                            <label class="sr-only" for="total_pts">Total sprint points</label>
                            <div class="input-group col-lg-7">
                                <!-- <div class="input-group-addon">Points</div> -->
                                <input type="number" class="form-control form-control-sm" id="total_pts" placeholder="Username" min="0" value="${sprint.points}" required>
                            </div>
                            <button type="submit" class="btn btn-success col-lg-5">Change</button>
                        </form>
                    </div>
                </div>
                <div id="c${sprint.id}" class="collapse" role="tabpanel" aria-labelledby="h${sprint.id}">
                    <div class="card-body">
                        <div class="d-flex flex-wrap spr_us_container">
                        </div>
                    </div>
                </div>
            </div>`;
        $('#sprints_container').append($(html));
        $('#spr_'+sprint.id).data('spr_id', sprint.id);
        $('#spr_'+sprint.id).data('total', sprint.points);
        $('#spr_'+sprint.id).data('pt_left', sprint.points);
    }

    function init_containers(containers){
        drake = dragula({
            accepts: (el, target, source, sibling) => {
                if($(target).is($(source)) || $(target).prop('id')==="spr_us"){
                    return true;
                }
                let item = $(target).parents().closest(".pj_spr");
                return (item.data('pt_left') - $(el).data('estimate')) >= 0;
            },
        });
        for(let container of containers){
            drake.containers.push(container);
        }
        drake.on('drop', (el, target, source, sibling) => {
            update_points(el, target, source);
        });
    }

    function assign_us_to_sprint(item, sprint){
        if(parseInt(sprint) >= 0){
            $(item).detach().appendTo($("#spr_"+sprint).find('.spr_us_container'));
            update_points(item, $("#spr_"+sprint).find('.spr_us_container'), "#spr_us");
        }
    }

    function update_points(el, target, source){
        if(!$(target).is($(source)) && $(target).has($(el))){
            let item = null;
            if($(source).prop('id')!=="spr_us"){
                item = $(source).parents().closest(".pj_spr");
                item.data('pt_left', (parseFloat(item.data('pt_left'))
                + parseFloat($(el).data('estimate'))));
                item.find('#left').text('Left: ' + item.data('pt_left'));
            }
            if($(target).prop('id')!=="spr_us"){
                item = $(target).parents().closest(".pj_spr");
                item.data('pt_left', (parseFloat(item.data('pt_left'))
                - parseFloat($(el).data('estimate'))));
                item.find('#left').text('Left: ' + item.data('pt_left'));
            }
        }
    }
});
