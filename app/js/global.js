let hideInProgress = false;
let showModalId = '';

function showModal(elementId) {
    if (hideInProgress) {
        showModalId = elementId;
    } else {
        $("#" + elementId).modal("show");
    }
};

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
};
