/**
 * @file whiteboard.js
 * Js file for the whiteboard module
 * @author Sébastien Viguier
 */
'use strict';
let wh_drake = null; //The drag and drop system
let wh_window_height = 0; //The height of the window

$(document).ready(($)=>{

        $(".wh_post_it").tooltip({
            html:true,
            title: `<div><b>US #1</b></div>
                    <div><b>Subtask #14</b></div>
                    <div class="wh_tooltip_logs">It seems that evos prefer asphalt conditions wheras aioooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooIt seems that evos prefer asphalt conditions wheras aiooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo0123456789</div>`
        });
        // $(document).on('mousemove', function(e) {
        //     let mousePosition = e.pageY - $(".content-page#whiteboard").scrollTop();
        //     let topRegion = 0.15*window_height;
        //     let bottomRegion = window_height - 0.15*window_height;
        //
        //     if(e.which == 1 && drake.dragging && (mousePosition < topRegion || mousePosition > bottomRegion)){    // e.wich = 1 => click down !
        //         let distance = e.clientY - window_height / 2;
        //         distance = distance * 0.1; // <- velocity
        //         $(".pane").scrollTop( distance + $(".pane").scrollTop()) ;
        //     }
        // });
});
