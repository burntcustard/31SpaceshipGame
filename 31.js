/*jslint plusplus: true, browser: true, devel: true, node: true */
"use strict";

// Canvas compatability code, makes it work in IE
var animate = window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    function (callback) {window.setTimeout(callback, 1000 / 60);};

function play31() {
  var canvas = document.getElementById("31"),
    ctx = canvas.getContext("2d"),
    now,
    dt,
    last = window.performance.now,
    step = 1 / 60, // Try to update game 60 times a second
    cSize = 8, // Size of cell in pixels
    gridSize = 31; // Size of board in "pixels" (number of cells) STARTS AT 1,1 in top left
      
  function render() {
    
    function paintCell(color, x, y) {
      ctx.fillRect(x * cSize, y * cSize, cSize, cSize);
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
  }

  function update() {
  }

  function gameLoop() {
    now = window.performance.now;
    dt = Math.min(1, (now - last) / 1000);    // duration in seconds
    while (dt > step) {
      dt = dt - step;
      update(step);
    }
    render(dt);
    last = now;

    animate(update);
  }
  
  animate(gameLoop);
  
}

window.onload = function () { play31(); };