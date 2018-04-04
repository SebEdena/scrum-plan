/**
 * @file workspace.js
 * Js file for the workspace
 * @author Sébastien Viguier
 */
'use strict';
const {ipcRenderer} = require('electron');
const remote = require('electron').remote;
const {dialog} = remote.require('electron');
let project_id = remote.getGlobal('data').current.id; //id of the opened project
let scroll_state = {}; //Store the scroll of each module to keep it for reopening the module
let asked_fetch = {}; //Lists all the fetched modules

$(document).ready(($) => {
    ipcRenderer.send("load", {type:"user_stories"}); //asks to load the user stories
    ipcRenderer.send("load", {type:"sprints"}); //asks to load the sprints

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour on loaded data event
     * @listens ipcRenderer:loaded
     * @param event - The event
     * @param args - Parameters of the event
     */
    ipcRenderer.on("loaded", (event, args) => {
        if(args.err){
            console.error("Cannot load " + args.type);
        }
    });

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour on error event
     * @listens ipcRenderer:error
     * @param event - The event
     * @param args - Parameters of the event
     */
    ipcRenderer.on('error', (event, args) => {
        let msg = "";
        switch(args.type){
            case 'us': msg += 'The US #' + args.data.id+ ' : \"' + args.data.feature + '\" ' ; break;
            case 'sprint': msg += 'The Sprint #' + args.data.id+ ' '; break;
            case 'us_sprint': msg += 'The Sprint of the US #' + args.data.id+ ' '; break;
            default: return;
        }
        switch(args.action){
            case 'update' : msg += "could not be updated."; break;
            case 'delete' : msg += "could not be deleted."; break;
            default : return;
        }
        dialog.showMessageBox({title: "Scrum Assistant", type: 'error', buttons: ['Ok'],
        message: msg}, ()=>{});
    });

    /**
     * @function switch_tab
     * @description Switches between module tabs
     * @param source - The html node which is the clicked tab
     * @see focus
     */
    function switch_tab(source){
      if($(source).prop("id") === $(".nav-group-item.active").prop("id") &&
          $(".tab-item").length !== 0){
        return;
      }
      let tab = $(".tab-item[id=" + $(source).prop("id") + "]");
      if($(tab).length !== 0){
        focus(tab);
      } else {
        $(".tab-group").append(`
          <div class="tab-item" id="${$(source).prop("id")}">
          ${$(source).text()}
          <span class="icon icon-cancel icon-close-tab"></span>
          </div>
          `);
          let item = $(".tab-item").last();
          item.on('click', (e) => {
              switch_tab($(e.target));
          });
          item.find(".icon-close-tab").on('click', (e) => {
              e.stopPropagation();
              close($(e.target).parent());
          })
          focus($(".tab-item").last());
        }
    }

    /**
     * @function focus
     * @description Changes the active tab
     * @param elt - The html node which is the new active tab
     * @see switch_tab
     */
    function focus(elt){
        scroll_state[$(".nav-group-item.active").prop('id')] = $(".pane").scrollTop();
        $(".active").removeClass("active");
        $(elt).addClass("active");
        $(".nav-group-item[id=" + $(elt).prop('id') + "]").addClass('active');
        if($(".content-page[id="+$(elt).prop('id')+"]").length === 0){
            $.get('../html/wk_contents/' + $(elt).prop('id') + '.html', (data)=>{
                $(".content").append(data);
                asked_fetch[$(elt).prop('id')] = [];
                scroll_state[$(elt).prop('id')] = 0;
            });
        }
        toggle($(elt).prop('id'));
    }

    /**
     * @function toggle
     * @description Changes the active page
     * @param elt - The html node which is the new active page
     */
    function toggle(elt){
        $(".content-page").toggle(false);
        $(".content-page[id=" + elt + "]").toggle(true);
        $(".pane").scrollTop(scroll_state[elt]);
    }

    /**
     * @function close
     * @description Closes a module tab
     * @param elt - The html node which is the tab to be removed
     */
    function close(elt){
        if($(".tab-item").length > 1){
            if($(".tab-item").index(elt) === 0){
                switch_tab($(".tab-item")[1]);
            }else{
                switch_tab($(".tab-item")[($(".tab-item").index(elt) - 1)]);
            }
        }
        $(".content-page[id=" + elt.prop("id") + "]").toggle(false);
        elt.remove();
    }

    /**
     * @function handle_scroll
     * @description Ensure the tabs stay on the top
     * @param item - The html node of the tab group
     */
    function handle_scroll(item){
        let screen_position = $(".pane").scrollTop();
        if(screen_position > item.scrollTop()){
    		item.css('top', screen_position+'px');
        }else{
    		item.css('top', '0px');
        }
    }

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour on click on nav and tab.
       Toggles the switch of tab
     * @listens nav-group-item:click&tab-item:click
     * @param e - The event
     * @see switch_tab
     */
    $(".nav-group-item, .tab-item").on('click', function(e){
        switch_tab($(this));
    });

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour on click on tab close icon.
       Toggles closure of tab
     * @listens icon-close-tab:click
     * @param e - The event
     * @see close
     */
    $(".icon-close-tab").on('click', (e) => {
        e.stopPropagation();
        close($(e.target).parent());
    });

    /**
     * @function
     * @description EVENT HANDLER - Defines behaviour on page pane scroll
     * @listens pane:scroll
     * @see handle_scroll
     */
    $(".pane").on('scroll', function(){
        handle_scroll($('.tab-group:first'));
    });

    switch_tab($(".nav-group-item[id=home]"));
});
