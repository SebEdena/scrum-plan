let drake = null;

$(document).ready(($)=>{
    $('#spr_0').data('spr_id', 0);
    $('#spr_0').data('total', 6);
    $('#spr_0').data('pt_left', 6);

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
                        <form class="form-inline m-0 col-xl-5 d-flex justify-content-e">
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
