let drake = null, del_sprints = [];

$(document).ready(($)=>{
    $("#spr_us").data('spr_id', -1);

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
        if(args.type === "sprints" && $("#spr_"+args.data.id).length === 0){
            fill_sprint(args.data);
            $("#spr_"+args.data.id).find('#spr_total_edit').trigger('click');
        }
    });

    ipcRenderer.on('delete', (event, args) =>{
        if(args.type === "sprints"){
            for(let us of $("#spr_"+args.data.id).find('.spr_user_story')){
                assign_us_to_sprint($(us), -1, true, "#spr_"+args.data.id);
            }
            $("#spr_"+args.data.id).remove();
        }
    });

    ipcRenderer.on('update', (event, args)=>{
        if(args.type === "user_stories"){
            if($('#spr_us'+args.data.id).length === 0){
                fill_sprint_us(args.data);
            }else{
                let diff_est = new Decimal(args.data.estimate)
                                    .minus($('#spr_us'+args.data.id).data('estimate'));
                let previous_sp = $('#spr_us'+args.data.id).parents().closest(".pj_spr");
                $('#spr_us'+args.data.id).data('estimate', parseFloat(args.data.estimate));
                if(previous_sp.data('spr_id') !== args.data.sprint){
                    assign_us_to_sprint($('#spr_us'+args.data.id), args.data.sprint, true, "#"+previous_sp.attr('id'));
                } else {
                    if(args.data.sprint !== -1){
                        $('#spr_'+args.data.sprint).data('pt_left',
                        new Decimal($('#spr_'+args.data.sprint).data('pt_left'))
                        .minus(diff_est)
                        .toNumber());
                        $('#spr_'+args.data.sprint)
                        .find('#left')
                        .text('Left: ' + $('#spr_'+args.data.sprint).data('pt_left'));
                    }
                }
                $('#spr_us'+args.data.id).html(`<p>US#${args.data.id} <small class="text-muted">Estimated: ${parseFloat(args.data.estimate)}</small></p>`);
                $('#spr_us' + args.data.id).tooltip('dispose').tooltip({
                    placement: 'top',
                    title: args.data.feature
                });
            }
        }
        if(args.type === "sprints"){
            let item = $('#spr_'+args.data.id);
            let diff_pts = parseFloat(args.data.points) - item.data('total');
            item.data('total', parseFloat(args.data.points));
            item.find('#total_pts').val(item.data('total'))
                                   .attr('min', new Decimal(item.data('total'))
                                                .minus(item.data('pt_left'))
                                                .toNumber());
            item.data('total', parseFloat(args.data.points));
            item.data('pt_left', item.data('pt_left') + diff_pts);
            item.find('#left').text('Left: ' + item.data('pt_left'));
            item.find('#spr_total_edit').text('Edit').prop("disabled", false);
        }
    });

    ipcRenderer.on('error', (event, args) =>{
        console.error(args);
    })

    $('#create_sp').on('click', ()=>{
        ipcRenderer.send('create', {type: "sprint", data:{project:project_id}});
    });

    $('#delete_sp').on('click', ()=>{
        let items = $(".pj_spr:not(#spr_us)");
        if(items.length !== 0){
            ipcRenderer.send('delete', {type: "sprint", data:{project:project_id, id:items.last().data("spr_id")}});
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
                        <p>US#${us.id} <small class="text-muted">Estimated: ${parseFloat(us.estimate)}</small></p>
                    </div>`;
        $("#spr_us").append($(html));
        $('#spr_us' + us.id).data('id', us.id);
        $('#spr_us' + us.id).data('estimate', parseFloat(us.estimate));
        $('#spr_us' + us.id).tooltip({
            placement: 'top',
            title: us.feature
        });
        assign_us_to_sprint($('#spr_us'+us.id), us.sprint, false);
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
                        <h3 class="m-0 col-xl-3" id="left"></h3>
                        <form class="form-inline m-0 col-xl-6 d-flex justify-content-center">
                            <!-- <label for="total_pts">Total sprint points</label> -->
                            <div class="form-group input-group m-0 col-lg-6">
                                <!-- <div class="input-group-addon">Points</div> -->
                                <input type="number" class="form-control form-control-sm rounded" id="total_pts" name="points" placeholder="Total points" min="0" step="0.5" value="${parseFloat(sprint.points)}" required disabled>
                            </div>
                            <div class="col-lg-6 row p-0 btn-group">
                                <button type="button" class="btn btn-success col-sm-5" id='spr_total_edit'>Edit</button>
                                <button type="button" class="btn btn-danger col-sm-7" id='spr_total_cancel' disabled>Cancel</button>
                            </div>
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
        $('#spr_'+sprint.id).data('spr_id', sprint.id)
                            .data('total', parseFloat(sprint.points))
                            .data('pt_left', parseFloat(sprint.points))
                            .find('#left').text('Left: ' + parseFloat(sprint.points));

        $('#spr_'+sprint.id).find('#total_pts').tooltip({
            placement: "top",
            title: "Total sprint points"
        });

        $('#spr_'+sprint.id).find('#spr_total_edit').on('click', ()=>{handle_edit($('#spr_'+sprint.id))});
        $('#spr_'+sprint.id).find('#spr_total_cancel').on('click', ()=>{handle_cancel($('#spr_'+sprint.id))});
    }

    function handle_edit(item){
        let btn = item.find('#spr_total_edit');
        if(btn.text() === "Edit"){
            btn.text("Ok");
            item.find('input, #spr_total_cancel').prop("disabled", false);
            item.find('#total_pts').trigger('focus');
        }else{
            item.find('form').trigger('submit');
        }
        item.find('form').validate({
            submitHandler: (form)=>{
                item.find('input, button').prop("disabled", true);
                let data = {
                    id: item.data('spr_id'),
                    project: project_id,
                    points: parseFloat(form.points.value).toFixed(2)
                };
                ipcRenderer.send('update', {type: "sprint", data: data});
            },
            showErrors: function(errorMap, errorList) {
                $.each(errorList, function (index, error) {
                    $(error.element).tooltip("dispose")
                    .addClass("error")
                    .tooltip({
                        placement: 'top',
                        title: error.message
                    });
                });
            }
        });
    }

    function handle_cancel(item){
        item.find('#spr_total_edit').text('Edit');
        item.find('#spr_total_cancel').prop("disabled", true);
        item.find('#total_pts').val(item.data('total'))
                                                .tooltip('dispose').tooltip({
                                                    placement: "top",
                                                    title: "Total sprint points"
                                                })
                                                .prop("disabled", true);
    }

    function init_containers(containers){
        drake = dragula({
            accepts: (el, target, source, sibling) => {
                if($(target).is($(source)) || $(target).prop('id')==="spr_us"){
                    return true;
                }
                let item = $(target).parents().closest(".pj_spr");
                return (new Decimal(item.data('pt_left'))
                                        .minus($(el).data('estimate'))
                                        .toNumber()) >= 0;
            },
        });
        for(let container of containers){
            drake.containers.push(container);
        }
        drake.on('drop', (el, target, source, sibling) => {
            update_points(el, target, source, true);
        });
        drake.on('drag',function(el,source){
            var h = $(".content-page#spr_backlog").height();
            $(".content-page#spr_backlog").on('mousemove', function(e) {
                // console.log(e.clientY);
                console.log(h);
                var mousePosition = e.pageY - $(".content-page#spr_backlog").scrollTop();
                var topRegion = 220;
                var bottomRegion = h - 220;
                if(e.which == 1 && (mousePosition < topRegion || mousePosition > bottomRegion)){    // e.wich = 1 => click down !

                        console.log('A there');
                    var distance = e.clientY - h / 2;
                    distance = distance * 0.1; // <- velocity
                    $(".pane").scrollTop( distance + $(".content-page#spr_backlog").scrollTop()) ;
                }else{
                    console.log('there');
                    // $(".content-page#spr_backlog").unbind('mousemove');
                }
            });
        });
    }

    function assign_us_to_sprint(item, sprint, update, source="#spr_us"){
        let target = (sprint === -1)?$("#spr_us"):$("#spr_"+sprint).find('.spr_us_container');
        let new_source = (source === "#spr_us")?$(source):$(source).find('.spr_us_container');
        $(item).detach().appendTo(target);
        update_points(item, target, new_source, update);
    }

    function update_points(el, target, source, update){
        if(!$(target).is($(source)) && $(target).has($(el))){
            let item = null, new_sp = -1;
            if($(source).prop('id')!=="spr_us"){
                item = $(source).parents().closest(".pj_spr");
                item.data('pt_left', (new Decimal(item.data('pt_left'))
                                        .plus($(el).data('estimate')))
                                        .toNumber());
                item.find('#left').text('Left: ' + item.data('pt_left'));
                item.find("#total_pts").attr('min', item.data('total')
                                                    - item.data('pt_left'));
            }
            if($(target).prop('id')!=="spr_us"){
                item = $(target).parents().closest(".pj_spr");
                new_sp = item.data('spr_id');
                item.data('pt_left', (new Decimal(item.data('pt_left'))
                                        .minus($(el).data('estimate')))
                                        .toNumber());
                item.find('#left').text('Left: ' + item.data('pt_left'));
                item.find("#total_pts").attr('min', item.data('total')
                                                    - item.data('pt_left'));
            }
            if(update){
                ipcRenderer.send("update", {type:"us_sprint",
                data: {
                    id:$(el).data('id'),
                    project:project_id,
                    sprint:new_sp
                }});
            }
        }
    }
});
