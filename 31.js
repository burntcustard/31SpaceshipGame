/*jslint plusplus: true, browser: true, devel: true, node: true, vars: true */
"use strict";

// Canvas compatability code, makes it work in IE
var animate = window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    function (callback) { window.setTimeout(callback, 1000 / 60); };

// Menu stuffs
var debugMenu = document.getElementById("debug");

function play31() {
  
  var debug = false; // Enable degug
  if (!debug) { debugMenu.style.display = "none"; }
  
  var canvas = document.getElementById("31"),
    ctx = canvas.getContext("2d"),
    now,
    dt,
    last = window.performance.now,
    step = 1 / 60,  // Try to update game 60 times a second
    cSize = 8,  // Size of cell in pixels
    gridSize = 31;  // Size of board in "pixels" (number of cells) STARTS AT 1,1 in top left
      
  function render() {
    
    function paintCell(color, x, y) {
      ctx.fillStyle = color;
      ctx.fillRect(x * cSize - cSize, y * cSize - cSize, cSize, cSize);
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
  }

  function update() {
  }

  function gameLoop() {
    
    now = window.performance.now();
    dt = Math.min(1, (now - last) / 1000);  // duration in seconds
    
    while (dt > step) {
      dt -= step;
      update(step);
    }
    
    if (debug) { debugMenu.innerHTML = "FrameTime: " + now.toFixed(); }
    
    render(dt);
    last = now;

    animate(gameLoop);
  }
  
  gameLoop();
  
}

window.onload = function () { play31(); };