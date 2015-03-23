/*jslint plusplus: true, browser: true, devel: true, node: true, vars: true */
"use strict";

// Menu stuffs
var debugMenu = document.getElementById("debug");

var canvas = document.getElementById("31"),
  ctx = canvas.getContext("2d"),
  debug = false,
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

// Extra canvas for creating primary colour
var canvasPri = document.createElement("canvas");
canvas.id = "canvasPri";
canvasPri.width = "248px";
canvasPri.height = "248px";
document.body.appendChild(canvasPri);
canvasPri = document.getElementById("canvasPri"); // Reusing variable to grab canvas
var ctxPri = canvasPri.getContext("2d");

// --- INPUT ---
var key,
  keys = {};

// Fuck JSLint formatting this is sexy(might give it the ignor whitespace command thing...)
document.onkeydown = function (key) {
  switch (key.which) {
    case  32: keys.space = true; break; 
    case  37: keys.left  = true; break;
    case  38: keys.up    = true; break;
    case  39: keys.right = true; break;
    case  40: keys.down  = true; break;
    case 191: debug = !debug; break;
    default : console.log("Unhandled keypress: " + key.which);
  }
};
document.onkeyup = function (key) {
  switch (key.which) {
    case  32: delete keys.space; break;
    case  37: delete keys.left;  break;
    case  38: delete keys.up;    break;
    case  39: delete keys.right; break;
    case  40: delete keys.down;  break;
    default : console.log("Unhandled keyUNpress: " + key.which);
  }
};

// Makes images scale all pixely (yay!)
ctx.imageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;

// Sprite stuff testing
var smallShipImage = new Image();
smallShipImage.src = "smallShipSprite.png";

// Stole from here: http://www.williammalone.com/articles/create-html5-canvas-javascript-sprite-animation/
function sprite(options) {
  var that = {};
  that.width = options.width;
  that.height = options.height;
  that.index = options.index;
  that.image = options.image;
  that.draw = function () {
    ctx.drawImage(
      that.image,
      that.width * that.index,
      0,
      that.width,
      that.height,
      0,
      0,
      that.width * 8,
      that.height * 8
    );
  };
  that.maxHP = options.maxHP; // Seems to be required to return HP of ship
  return that;
}

var smallShip = sprite({
  width: 5,
  height: 10,
  index: 0,
  image: smallShipImage,
  maxHP: 2
});
// Sprite testing end

function Ship(model, primaryColor, secondaryColor, HP) {
  this.model = model || smallShip; // Default ship is the... small one.
  this.color = {}; // Set up color object, yes, this has to be here.
  this.color.primary = primaryColor || "rgb(80,255,240)"; // Default primary colour is cyan
  this.color.secondary = secondaryColor || "rgb(114,102,189)"; // Default secondary /colour is purple
  this.HP = HP || this.model.maxHP; // Default hit points is the max the ship can have (hopefully..)
  console.log("Ship HP: " + this.HP); // Just testing max HP is set correctly. Seems to work :D
}

function play31() {
  
  var // The vars have got to be at an odd angle (JSLint), this might be clearer than having 1st on same line
    playerShip; // Players current ship (and all the fancy stuff on it?)
  
  if (!debug) { debugMenu.style.display = "none"; }
  
  function render() {
    
    // Fill one pixel in with specific colour
    function paintCell(x, y, color) {
      ctx.fillStyle = color;
      ctx.fillRect(x * cSize - cSize, y * cSize - cSize, cSize, cSize);
    }
    
    // Fill canvas with levels color
    ctx.fillStyle = "#2b383b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    smallShip.draw();

  }

  function update() {
    if (debug) console.log(keys); // THIS IS JUST TEMPORARY, to show key input system
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
  
  function newGame(level) {
    // Clear old stuff
    
    switch (level) {
    case "level1":
      //Do level1 stuff
      playerShip = new Ship(
        // Starting ship properties. TODO: on 2nd run through you keep ship from previous game?
        null,
        null,
        null,
        null
      );
      break;
    case "level2":
      //Do level2 stuff
      break;
    default:
      // Failed to load level, throw error or go back to menu etc.
    }
    
    gameLoop();
  }
  
  newGame("level1");
  
}

window.onload = function () { play31(); };