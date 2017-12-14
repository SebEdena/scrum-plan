const {ipcRenderer} = require('electron');
const remote = require('electron').remote;
const {dialog} = remote.require('electron');
let project_id = remote.getGlobal('data').current.id;
let scroll_state = {};

$(document).ready(($) => {
    function switch_tab(source){
      if($(source).prop("id") === $(".nav-group-item.active").prop("id") &&
          $(".tab-item").length !== 0){
        return;
      }
      var tab = $(".tab-item[id=" + $(source).prop("id") + "]");
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

    function focus(elt){
        scroll_state[$(".nav-group-item.active").prop('id')] = $(".pane").scrollTop();
        $(".active").removeClass("active");
        $(elt).addClass("active");
        $(".nav-group-item[id=" + $(elt).prop('id') + "]").addClass('active');
        if($(".content-page[id="+$(elt).prop('id')+"]").length === 0){
            $.get('../html/wk_contents/' + $(elt).prop('id') + '.html', (data)=>{
                $(".content").append(data);
                scroll_state[$(elt).prop('id')] = 0;
            });
        }
        toggle($(elt).prop('id'));
    }

    function toggle(elt){
        $(".content-page").toggle(false);
        $(".content-page[id=" + elt + "]").toggle(true);
        $(".pane").scrollTop(scroll_state[elt]);
    }

    function close(elt){
        //do_sth to check data
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

    function handle_scroll(item){
        let screen_position = $(".pane").scrollTop();
        if(screen_position > item.scrollTop()){
    		item.css('top', screen_position+'px');
        }else{
    		item.css('top', '0px');
        }
    }

    $(".nav-group-item, .tab-item").on('click', function(e){
        switch_tab($(this));
    });

    $(".icon-close-tab").on('click', (e) => {
        e.stopPropagation();
        close($(e.target).parent());
    });

    $(".pane").on('scroll', function(){
        handle_scroll($('.tab-group:first'));
    });

    switch_tab($(".nav-group-item[id=home]"));
});
