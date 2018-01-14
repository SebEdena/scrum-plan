/**
 * Brings the modules for front-end with browserify
 * @see app/js/bundle.js
 * @author Sébastien Viguier
 */
const $ = require('jquery');
$("img[attr$='png']").hide();
require('jquery-validation');
const Popper = require('popper.js');
const dragula = require('dragula');
const {Decimal} = require('decimal.js');
