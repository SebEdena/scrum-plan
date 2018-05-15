/**
 * @file spr_backlog.js
 * Js file for the sprint backlog module
 * @author Sébastien Viguier
 */
'use strict';
let sp_drake = null; //The drag and drop system
let sp_window_height = 0; //The height of the window

$(document).ready(($)=>{
    $.datetimepicker.setDateFormatter('moment');
    $.validator.addMethod("valid_date", (value, element)=>{
        return moment(value, 'DD/MM/Y HH:mm').isValid();
    }, 'This date is invalid');
    $.validator.addMethod("valid_interval", (value, element)=>{
        return moment(value, 'DD/MM/Y HH:mm').isSameOrBefore(moment($("#dtp_end").val(), 'DD/MM/Y HH:mm'));
    }, 'The interval is invalid');

    $("#spr_us").data('spr_id', -1);
    sp_window_height = $(window).height(); //Gets the height of the window

    $('#dtp_start').datetimepicker({
        format: "DD/MM/Y HH:mm",
        formatDate: "DD/MM/Y",
        formatTime: "HH:mm",
        step: 15,
        onShow: function(ct){
            this.setOptions({
                maxDate: $('#dtp_end').val()?$('#dtp_end').val().split(' ')[0]:false,
                maxTime: $('#dtp_end').val()?$('#dtp_end').val().split(' ')[1]:false
            });
        }
    });

    $('#dtp_end').datetimepicker({
        format: "DD/MM/Y HH:mm",
        formatDate: "DD/MM/Y",
        formatTime: "HH:mm",
        step: 15,
        onShow: function(ct){
            this.setOptions({
                minDate: $('#dtp_start').val()?$('#dtp_start').val().split(' ')[0]:false,
                minTime: $('#dtp_start').val()?$('#dtp_start').val().split(' ')[1]:false
            });
        }
    });

    $("#modal_start_sprint").on('hidden.bs.modal', ()=>{
        $("#modal_start_sprint").find('.dtp').datetimepicker('reset');
        $('#dtp_start').datetimepicker('setOptions', {maxDate: false, maxTime: false});
        $('#dtp_end').datetimepicker('setOptions', {minDate: false, minTime: false});
        $("#modal_start_sprint").find('#ck_import_sp').prop('checked', false);
        $("#modal_start_sprint").find('form').validate().destroy();
    });

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
                case "user_stories": ipcRenderer.send("fetch", {type:"us_sprints"});
                                     break;
                case "us_sprints": ipcRenderer.send("fetch", {type:"sprints"});
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
        if(args.type === "us_sprints" && $("#usp"+args.data.us).length === 0){
            fill_sprint_us(args.data, remote.getGlobal("data").user_stories[args.data.us]);
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
            while($("#spr_"+args.data.id).find('.spr_user_story').length){}
            $("#spr_"+args.data.id).remove();
        }
        if(args.type === "us_sprints"){
            $('#spr_'+args.data.sprint).data('pt_left',
                            $('#spr_'+args.data.sprint).data('pt_left')
                            .add(args.data.estimate));
            $('#spr_'+args.data.sprint).find('#left')
                    .text('Left: ' + $('#spr_'+args.data.sprint).data('pt_left'));
            $('#usp'+args.data.id).remove();
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
        if(args.type === "us_sprints"){
            if($('#usp'+args.data.id).length === 0){
                fill_sprint_us(args.data, remote.getGlobal('data').user_stories[args.data.us]);
            }else{
                let diff_est = Decimal.sub(args.data.estimate,$('#usp'+args.data.id).data('estimate'));
                let previous_sp = $('#usp'+args.data.id).parents().closest(".pj_spr");
                $('#usp'+args.data.id).data('estimate', parseFloat(args.data.estimate));
                if(previous_sp.data('spr_id') !== args.data.sprint){
                    assign_us_to_sprint($('#usp'+args.data.id), args.data.sprint, previous_sp.data('id'));
                } else {
                    if(args.data.sprint != null){
                        let item = $('#spr_'+args.data.sprint);
                        item.data('pt_left',
                            $('#spr_'+args.data.sprint).data('pt_left')
                            .minus(diff_est));
                        item.find('#left')
                            .text('Left: ' + $('#spr_'+args.data.sprint).data('pt_left'));
                        item.find('#total_pts').attr('min', Decimal.sub(item.data('total'),
                                                                        item.data('pt_left'))
                                                                        .toNumber());
                    }
                }
                $('#usp'+args.data.id).html(`<p>US#${args.data.us} <small class="text-muted">Estimated: ${parseFloat(args.data.estimate)}</small></p>`);
            }
        }
        if(args.type === "sprints"){
            let item = $('#spr_'+args.data.id);
            let diff_pts = Decimal.sub(args.data.points,item.data('total'));
            item.data('total', new Decimal(args.data.points));
            item.data('pt_left', Decimal.add(item.data('pt_left'),diff_pts));
            item.find('#total_pts').val(item.data('total').toNumber())
                                   .attr('min', Decimal.sub(item.data('total'),
                                                            item.data('pt_left'))
                                                            .toNumber());
            item.data('status', args.data.status);
            item.find('#left').text('Left: ' + item.data('pt_left').toNumber());
            item.find('#spr_total_edit').text('Edit').prop("disabled", false);
            item.find('#actions').prop("disabled", false);
        }
        if(args.type === "user_stories"){
            $('.spr_us' + args.data.id).tooltip('dispose').tooltip({
                placement: 'top',
                title: args.data.feature
            });
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
       Updates the sp_window_height variable.
     * @listens window:resize
     */
    $(window).resize(()=>{
        sp_window_height = $(window).height();
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
        if(can_delete_sprint()){
            dialog.showMessageBox({title: "Scrum Assistant",
                type: 'info',
                buttons: ['No', 'Yes'],
                message: "Do you really want to delete the last sprint ?",
                defaultId: 0},
                (resp)=>{
                    if(resp === 1){
                        ipcRenderer.send('delete', {type: "sprint", data:{
                            id:$(".pj_spr:not(#spr_us)").last().data("spr_id")}});
                    }
                });
        }else{
            dialog.showMessageBox({title: "Scrum Assistant",
                type: 'error',
                buttons: ['Ok'],
                message: "Unable to delete the last sprint."},
                (resp)=>{});
        }
    });

    /**
     * @function fill_all_sprint_us
     * @description Inserts all the user stories by calling fill_sprint_us
     * @see fill_sprint_us
     */
    function fill_all_sprint_us(){
        let us = remote.getGlobal('data').user_stories;
        let usp = remote.getGlobal('data').us_sprints;
        for(let i in usp){
            let item = usp[i];
            fill_sprint_us(item, us[item.us]);
        }
    }

    /**
     * @function fill_sprint_us
     * @description Inserts a user story
     * @param us_sp - The data of the user story - sprint link
     * @param us - The data of the user story
     */
    function fill_sprint_us(us_sp, us){
        let html = `<div class="col-xl-6 spr_user_story spr_us${us_sp.us} ${us_sp.locked===1?"locked":""} d-flex flex-row justify-content-around rounded" id="usp${us_sp.id}">
                        <p>US#${us_sp.us} <small class="text-muted">Estimated: ${parseFloat(us_sp.estimate)}</small></p>
                    </div>`;
        $("#spr_us").append($(html));
        $('#usp' + us_sp.id).data('us', us_sp.us);
        $('#usp' + us_sp.id).data('id', us_sp.id);
        $('#usp' + us_sp.id).data('estimate', new Decimal(us_sp.estimate));
        $('#usp' + us_sp.id).data('locked', !!us_sp.locked);
        if(us){
            $('.spr_us' + us_sp.us).tooltip({
                placement: 'top',
                title: us.feature
            });
        }
        assign_us_to_sprint($('#usp'+us_sp.id), us_sp.sprint, null);
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
                            ${sprint.current>=0?`<span class="badge badge-secondary">Current</span>`:""}
                        </h3>
                        <h3 class="m-0 col-xl-3" id="left"></h3>
                        <form class="form-inline m-0 col-xl-6">
                            <div class="input-group-sm">
                                <input type="number" class="form-control form-control-sm rounded" id="total_pts" name="points" placeholder="Total points" min="0" value="${parseFloat(sprint.points)}" required disabled>
                            </div>
                            <div class="dropdown">
                                <button class="btn btn-secondary btn-sm dropdown-toggle" type="button" id="actions" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                    Actions
                                </button>
                                <div class="dropdown-menu dropdown-menu-right" aria-labelledby="actions">
                                    <button type="button" class='dropdown-item' id='spr_total_edit'>Edit</button>
                                    <button type="button" class='dropdown-item' id='spr_total_cancel' disabled>Cancel</button>
                                    <button type="button" class='dropdown-item' id='spr_start' ${sprint.current>=0?"disabled":""}>Start Sprint</button>
                                </div>
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
                            .data('status', sprint.current)
                            .find('#left').text('Left: ' + parseFloat(sprint.points));

        $('#spr_'+sprint.id).find('#total_pts').tooltip({
            placement: "top",
            title: "Total sprint points"
        });

        $('#spr_'+sprint.id).find('#spr_total_edit').on('click', ()=>{handle_edit($('#spr_'+sprint.id))});
        $('#spr_'+sprint.id).find('#spr_total_cancel').on('click', ()=>{handle_cancel($('#spr_'+sprint.id))});
        $('#spr_'+sprint.id).find('#spr_start').on('click', ()=>{handle_start($('#spr_'+sprint.id))});
        sp_drake.containers.push($('#spr_'+sprint.id).find('.spr_us_container')[0]);
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

    function handle_start(item){
        $("#modal_start_sprint").find('h4').text("Start Sprint #" + item.data('spr_id'));
        $('#modal_start_sprint').find('form').validate({
            rules: {
                date_start: {
                    valid_date: true,
                    valid_interval: true
                },
                date_end: {
                    valid_date: true
                }
            },
            submitHandler: (form)=>{
                let data = {
                    id: item.data('spr_id'),
                    start: moment(form.date_start.value, 'DD/MM/Y HH:mm').toDate(),
                    end: moment(form.date_end.value, 'DD/MM/Y HH:mm').toDate(),
                    import_old: $("#ck_import_sp").is(":checked")
                };
                $("#modal_start_sprint").modal('hide');
                console.log(data);
                // ipcRenderer.send('update', {type: "sprint", data: data});

            },
            errorElement: "div"
        });
        $('#modal_start_sprint').modal('show');
    }

    /**
     * @function init_containers
     * @description Initializes the drag and drop containers and the drag events
     * @listens sp_drake:drop
     * @listens document:mousemove
     */
    function init_containers(){
        sp_drake = dragula({
            accepts: (el, target, source, sibling) => {
                if($(target).is($(source)) || $(target).prop('id')==="spr_us"){
                    return true;
                }
                let item = $(target).parents().closest(".pj_spr");
                return Decimal.sub(item.data('pt_left'), $(el).data('estimate')).isPositive();
            },
            moves: function (el, source, handle, sibling) {
                return $(el).hasClass('spr_user_story') &&
                    ($(source).prop('id') === "spr_us" ||
                    $(source).parents().closest(".pj_spr").data('status') < 0);
            },
            invalid: function (el, handle) {
                return $(el).hasClass('locked');
            }
        });
        sp_drake.containers.push($('#spr_us')[0]);
        sp_drake.on('drop', (el, target, source, sibling) => {
            update_points(el, target, source, true);
        });
        $(document).on('mousemove', function(e) {
            let mousePosition = e.pageY - $(".content-page#spr_backlog").scrollTop();
            let topRegion = 0.15*sp_window_height;
            let bottomRegion = sp_window_height - 0.15*sp_window_height;

            if(e.which == 1 && sp_drake.dragging && (mousePosition < topRegion || mousePosition > bottomRegion)){    // e.wich = 1 => click down !
                let distance = e.clientY - sp_window_height / 2;
                distance = distance * 0.1; // <- velocity
                $(".pane").scrollTop( distance + $(".pane").scrollTop()) ;
            }
        });
    }

    /**
     * @function assign_us_to_sprint
     * @description Assigns a user story to a sprint or to the default container
     * @param item - The html node of the user story
     * @param target_sprint - The index of the target sprint
     * @param source_sprint - The id of the source sprint
     */
    function assign_us_to_sprint(item, target_sprint, source_sprint){
        let target = (target_sprint == null)?$("#spr_us"):$("#spr_"+target_sprint).find('.spr_us_container');
        let new_source = (source_sprint == null)?$("#spr_us"):$("#spr_"+source_sprint).find('.spr_us_container');
        $(item).detach().appendTo(target);
        update_points(item, target, new_source, false);
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
            let item = null, new_sp = null;
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
                ipcRenderer.send("update", {type:"usp_move",
                data: {
                    id:$(el).data('id'),
                    sprint:new_sp
                }});
            }
        }
    }

    function can_delete_sprint(){
        let items = $(".pj_spr:not(#spr_us)");
        if(!items.length){
            return false;
        }else{
            return !($.grep(items.last().find('.spr_user_story'), (n, i)=>{
                return $(n).data('locked');
            }).length);
        }
    }
});
