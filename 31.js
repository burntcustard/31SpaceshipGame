/*jslint plusplus: true, browser: true, devel: true, node: true, vars: true */
"use strict";

// Menu stuffs
var debugMenu = document.getElementById("debug");

var canvas = document.getElementById("31"),
  ctx = canvas.getContext("2d"),
  now,
  dt,
  last = window.performance.now,
  step = 1 / 60,  // Try to update game 60 times a second
  cSize = 8,  // Size of cell in pixels
  gridSize = 31;  // Size of board in "pixels" (number of cells) STARTS AT 1,1 in top left

// Canvas compatability code, makes it work in IE
var animate = window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  function (callback) { window.setTimeout(callback, 1000 / 60); };

// Hopefully makes it scale all pixely (yay!)
ctx.imageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;

// Sprite stuff testing
var smallShipImage = new Image();
smallShipImage.src = "smallShipSprite.png";

function sprite(options) {  // Stole from here: http://www.williammalone.com/articles/create-html5- canvas-javascript-sprite-animation/
  var that = {};
  that.width = options.width;
  that.height = options.height;
  that.index = options.index;
  that.image = options.image;
  that.draw = function () {
    ctx.drawImage(that.image, that.width * that.index, 0, that.width, that.height, 0, 0, that.width * 8,  that.height * 8);
  };
  return that;
}

var smallShip = sprite({
  width: 5,
  height: 10,
  index: 0,
  image: smallShipImage
});
// Sprite testing end


function play31() {
  
  var debug = true; // Enable degug
  if (!debug) { debugMenu.style.display = "none"; }
  
  function render() {
    
    function paintCell(color, x, y) {
      ctx.fillStyle = color;
      ctx.fillRect(x * cSize - cSize, y * cSize - cSize, cSize, cSize);
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    smallShip.draw();
    
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
    
    //if (debug) { debugMenu.innerHTML = "FrameTime: " + now.toFixed(); }
    
    render(dt);
    
    last = now;
    animate(gameLoop);
  }
  
  gameLoop();
  
}

window.onload = function () { play31(); };