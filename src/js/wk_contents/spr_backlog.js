/**
 * @file spr_backlog.js
 * Js file for the sprint backlog module
 * @author Sébastien Viguier
 */
'use strict';
let drake = null; //The drag and drop system
let window_height = 0; //The height of the window

$(document).ready(($)=>{
    $("#spr_us").data('spr_id', -1);
    window_height = $(window).height(); //Gets the height of the window

    ipcRenderer.send("fetch", {type:"user_stories"});//Asks to fetch the user_stories

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour on fetched event
     * @listens ipcRenderer:fetched
     * @param event - The event
     * @param args - Parameters of the event
     */
    ipcRenderer.on("fetched", (event, args) => {
        if(!(args.err || ~asked_fetch['spr_backlog'].indexOf(args.type))){
            switch(args['type']){
                case "user_stories": ipcRenderer.send("fetch", {type:"sprints"});
                                     break;
                case "sprints": init_containers();
                                fill_all_sprints();
                                fill_all_sprint_us();
                                break;
                default: break;
            }
            asked_fetch['spr_backlog'].push(args.type);
        }
    });

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour on created event
     * @listens ipcRenderer:created
     * @param event - The event
     * @param args - Parameters of the event
     */
    ipcRenderer.on('created', (event, args)=>{
        if(args.err && args.type === "sprint"){
            dialog.showMessageBox({title: "Scrum Assistant",
                                    type: 'error',
                                    buttons: ['ok'],
                                    message: "Unable to create a new sprint."},
                                    (resp)=>{});
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
        if(args.type === "sprints" && $("#spr_"+args.data.id).length === 0){
            fill_sprint(args.data);
            $("#spr_"+args.data.id).find('#spr_total_edit').trigger('click');
        }
        if(args.type === "user_stories" && $("#spr_us"+args.data.id).length === 0){
            fill_sprint_us(args.data);
        }
    });

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour on delete event
     * @listens ipcRenderer:delete
     * @param event - The event
     * @param args - Parameters of the event
     */
    ipcRenderer.on('delete', (event, args) =>{
        if(args.type === "sprints"){
            for(let us of $("#spr_"+args.data.id).find('.spr_user_story')){
                assign_us_to_sprint($(us), -1, true, "#spr_"+args.data.id);
            }
            $("#spr_"+args.data.id).remove();
        }
    });

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour on update event
     * @listens ipcRenderer:update
     * @param event - The event
     * @param args - Parameters of the event
     */
    ipcRenderer.on('update', (event, args)=>{
        if(args.type === "user_stories"){
            if($('#spr_us'+args.data.id).length === 0){
                fill_sprint_us(args.data);
            }else{
                let diff_est = Decimal.sub(args.data.estimate,$('#spr_us'+args.data.id).data('estimate'));
                let previous_sp = $('#spr_us'+args.data.id).parents().closest(".pj_spr");
                $('#spr_us'+args.data.id).data('estimate', parseFloat(args.data.estimate));
                if(previous_sp.data('spr_id') !== args.data.sprint){
                    assign_us_to_sprint($('#spr_us'+args.data.id), args.data.sprint, true, "#"+previous_sp.attr('id'));
                } else {
                    if(args.data.sprint !== -1){
                        let item = $('#spr_'+args.data.sprint);
                        item.data('pt_left',
                            new Decimal($('#spr_'+args.data.sprint).data('pt_left'))
                            .minus(diff_est)
                            .toNumber());
                        item.find('#left')
                            .text('Left: ' + $('#spr_'+args.data.sprint).data('pt_left'));
                        item.find('#total_pts').attr('min', Decimal.sub(item.data('total'),
                                                                        item.data('pt_left'))
                                                                        .toNumber());
                    }
                }
                $('#spr_us'+args.data.id).html(`<p>US#${args.data.id} <small class="text-muted">Estimated: ${parseFloat(args.data.estimate)}</small></p>`);
                $('#spr_us' + args.data.id).tooltip('dispose').tooltip({
                    placement: 'top',
                    title: args.data.feature
                });
            }
        } // 17 63 26 22
        if(args.type === "sprints"){
            let item = $('#spr_'+args.data.id);
            let diff_pts = Decimal.sub(args.data.points,item.data('total'));
            item.data('total', new Decimal(args.data.points));
            item.data('pt_left', Decimal.add(item.data('pt_left'),diff_pts));
            item.find('#total_pts').val(item.data('total').toNumber())
                                   .attr('min', Decimal.sub(item.data('total'),
                                                            item.data('pt_left'))
                                                            .toNumber());
            item.find('#left').text('Left: ' + item.data('pt_left').toNumber());
            item.find('#spr_total_edit').text('Edit').prop("disabled", false);
        }
    });

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour on error event
     * @listens ipcRenderer:error
     * @param event - The event
     * @param args - Parameters of the event
     */
    ipcRenderer.on('error', (event, args) =>{
        console.error(args);
    });

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour on resizing window.
       Updates the window_height variable.
     * @listens window:resize
     */
    $(window).resize(()=>{
        window_height = $(window).height();
    });

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour on click on create sprint button
     * @listens #create_sp:resize
     */
    $('#create_sp').on('click', ()=>{
        ipcRenderer.send('create', {type: "sprint", data:{}});
    });

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour on click on delete sprint button
     * @listens #delete_sp:resize
     */
    $('#delete_sp').on('click', ()=>{
        let items = $(".pj_spr:not(#spr_us)");
        if(items.length !== 0){
            ipcRenderer.send('delete', {type: "sprint", data:{
                // project:project_id,
                id:items.last().data("spr_id")}});
        }
    });

    /**
     * @function fill_all_sprint_us
     * @description Inserts all the user stories by calling fill_sprint_us
     * @see fill_sprint_us
     */
    function fill_all_sprint_us(){
        let us = remote.getGlobal('data').user_stories;
        for(let i in us){
            fill_sprint_us(us[i]);
        }
    }

    /**
     * @function fill_sprint_us
     * @description Inserts a user story
     * @param us - The data of the user story
     */
    function fill_sprint_us(us){
        let html = `<div class="col-xl-6 spr_user_story d-flex flex-row justify-content-around rounded" id="spr_us${us.id}">
                        <p>US#${us.id} <small class="text-muted">Estimated: ${parseFloat(us.estimate)}</small></p>
                    </div>`;
        $("#spr_us").append($(html));
        $('#spr_us' + us.id).data('id', us.id);
        $('#spr_us' + us.id).data('estimate', new Decimal(us.estimate));
        $('#spr_us' + us.id).tooltip({
            placement: 'top',
            title: us.feature
        });
        assign_us_to_sprint($('#spr_us'+us.id), us.sprint, false);
    }

    /**
     * @function fill_all_sprints
     * @description Inserts all the sprints by calling fill_sprint
     * @see fill_sprint
     */
    function fill_all_sprints(){
        let sprints = remote.getGlobal('data').sprints;
        for(let i in sprints){
            fill_sprint(sprints[i]);
        }
    }

    /**
     * @function fill_sprint
     * @description Inserts a sprint
     * @param sprint - The data of the sprint
     */
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
                                <input type="number" class="form-control form-control-sm rounded" id="total_pts" name="points" placeholder="Total points" min="0" value="${parseFloat(sprint.points)}" required disabled>
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
                            .data('total', new Decimal(sprint.points))
                            .data('pt_left', new Decimal(sprint.points))
                            .find('#left').text('Left: ' + parseFloat(sprint.points));

        $('#spr_'+sprint.id).find('#total_pts').tooltip({
            placement: "top",
            title: "Total sprint points"
        });

        $('#spr_'+sprint.id).find('#spr_total_edit').on('click', ()=>{handle_edit($('#spr_'+sprint.id))});
        $('#spr_'+sprint.id).find('#spr_total_cancel').on('click', ()=>{handle_cancel($('#spr_'+sprint.id))});
        drake.containers.push($('#spr_'+sprint.id).find('.spr_us_container')[0]);
    }

    /**
     * @function handle_edit
     * @description Handles the click on an "Edit" button
     * @param item - The html node of the user story
     * @fires ipcMain:update
     */
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
                    // project: project_id,
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

    /**
     * @function handle_edit
     * @description Handles the click on a "Cancel" button
     * @param item - The html node of the user story
     */
    function handle_cancel(item){
        item.find('#spr_total_edit').text('Edit');
        item.find('#spr_total_cancel').prop("disabled", true);
        item.find('#total_pts').val(item.data('total').toNumber())
                                        .tooltip('dispose').tooltip({
                                            placement: "top",
                                            title: "Total sprint points"
                                        })
                                        .prop("disabled", true);
    }

    /**
     * @function init_containers
     * @description Initializes the drag and drop containers and the drag events
     * @listens drake:drop
     * @listens document:mousemove
     */
    function init_containers(){
        drake = dragula({
            accepts: (el, target, source, sibling) => {
                if($(target).is($(source)) || $(target).prop('id')==="spr_us"){
                    return true;
                }
                let item = $(target).parents().closest(".pj_spr");
                return Decimal.sub(item.data('pt_left'), $(el).data('estimate')).isPositive();
            },
            moves: function (el, source, handle, sibling) {
                return $(el).hasClass('spr_user_story');
            },
        });
        drake.containers.push($('#spr_us')[0]);
        drake.on('drop', (el, target, source, sibling) => {
            update_points(el, target, source, true);
        });
        $(document).on('mousemove', function(e) {
            let mousePosition = e.pageY - $(".content-page#spr_backlog").scrollTop();
            let topRegion = 0.15*window_height;
            let bottomRegion = window_height - 0.15*window_height;

            if(e.which == 1 && drake.dragging && (mousePosition < topRegion || mousePosition > bottomRegion)){    // e.wich = 1 => click down !
                let distance = e.clientY - window_height / 2;
                distance = distance * 0.1; // <- velocity
                $(".pane").scrollTop( distance + $(".pane").scrollTop()) ;
            }
        });
    }

    /**
     * @function assign_us_to_sprint
     * @description Assigns a user story to a sprint or to the default container
     * @param item - The html node of the user story
     * @param sprint - The index of the target sprint
     * @param update - True if the assignment needs a user story update
     * @param source - The id of the source sprint
     */
    function assign_us_to_sprint(item, sprint, update, source="#spr_us"){
        let target = (sprint === -1)?$("#spr_us"):$("#spr_"+sprint).find('.spr_us_container');
        let new_source = (source === "#spr_us")?$(source):$(source).find('.spr_us_container');
        $(item).detach().appendTo(target);
        update_points(item, target, new_source, update);
    }

    /**
     * @function update_points
     * @description Update the points of the source and target sprint while moving a user story
     * @param el - The html node of the user story
     * @param target - The html node of the target sprint container
     * @param source - The html node of the source sprint container
     * @param update - True if the assignment needs a user story update
     */
    function update_points(el, target, source, update){
        if(!$(target).is($(source)) && $(target).has($(el))){
            let item = null, new_sp = -1;
            if($(source).prop('id')!=="spr_us"){
                item = $(source).parents().closest(".pj_spr");
                item.data('pt_left', Decimal.add(item.data('pt_left'),
                                                $(el).data('estimate')));
                item.find('#left').text('Left: ' + item.data('pt_left').toNumber());
                item.find("#total_pts").attr('min', item.data('total')
                                                        .minus(item.data('pt_left'))
                                                        .toNumber());
            }
            if($(target).prop('id')!=="spr_us"){
                item = $(target).parents().closest(".pj_spr");
                new_sp = item.data('spr_id');
                item.data('pt_left', Decimal.sub(item.data('pt_left'),
                                                $(el).data('estimate')));
                item.find('#left').text('Left: ' + item.data('pt_left').toNumber());
                item.find("#total_pts").attr('min', item.data('total')
                                                        .minus(item.data('pt_left'))
                                                        .toNumber());
            }
            if(update){
                ipcRenderer.send("update", {type:"us_sprint",
                data: {
                    id:$(el).data('id'),
                    // project:project_id,
                    sprint:new_sp
                }});
            }
        }
    }
});
