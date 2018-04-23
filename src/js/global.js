/**
 * @file global.js
 * Global javascript file for utilitary methods
 * @author Sébastien Viguier
 */
'use strict';
let hideInProgress = false; //Checks if the hide modal is in progress
let showModalId = ''; //Id of the modal being shown

/**
 * @function showModal
 * @description Shows a modal on GUI
 * @param elementId - The id of the html modal
 */
function showModal(elementId) {
    if (hideInProgress) {
        showModalId = elementId;
    } else {
        $("#" + elementId).modal("show");
    }
}

/**
 * @function hideModal
 * @description Hides a modal on GUI
 * @param elementId - The id of the html modal
 */
function hideModal(elementId) {
    hideInProgress = true;
    $("#" + elementId).on('hidden.bs.modal', hideCompleted);
    $("#" + elementId).modal("hide");

    function hideCompleted() {
        hideInProgress = false;
        if (showModalId) {
            showModal(showModalId);
        }
        showModalId = '';
        $("#" + elementId).off('hidden.bs.modal');
    }
}

/**
 * @function adjust_display
 * @description Converts a string number to be more accurate with dots and commas
 * @returns {string} The converted number
 */
function adjust_display(data){
    return parseFloat(data).toString().replace(',', '.');
}
