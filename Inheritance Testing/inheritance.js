/*jslint plusplus: true, browser: true, devel: true, node: true, unparam: true, vars: true, white: true*/
'use strict';

function Entity() {
  this.x = 1;
  this.y = 2;
  this.draw = function() {
    console.log("Drawing");
  }
}

var player = new Entity();

console.log(player);
