/*jslint plusplus: true, browser: true, devel: true, node: true, unparam: true, vars: true, white: true*/
/*global FPSMeter*/
"use strict";

var canvas = document.getElementById("31"),
  ctx = canvas.getContext("2d"),
  debug = false,
  now,
  dt,
  last = window.performance.now,
  step = 1000 / 60,  // Try to update game 60 times a second, step = 16.67ms
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

// Makes images scale all pixely (yay!)
ctx.imageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;



// --- INPUT ---
var key,
  keys = {};

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



// Menu stuffs
var debugMenu = document.getElementById("debug");



// Sprite stuff testing
var smallShipImage = new Image();
smallShipImage.src = "smallShipSprite.png";

function sprite(options) {
  var that = {};
  that.x = options.x;
  that.y = options.y;
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
      that.x * cSize,
      that.y * cSize,
      that.width * cSize,
      that.height * cSize
    );
  };
  that.maxHP = options.maxHP; // Seems to be required to return HP of ship
  return that;
}

var smallShip = sprite({
  x: 0,
  y: 0,
  width: 5,
  height: 10,
  index: 0,
  image: smallShipImage,
  maxHP: 2
});
// Sprite testing end



function Ship(options) { // !!!! Changed this to use a object for args
  this.model = options.model || smallShip; // Default ship is the... small one.
  this.color = {}; // Set up color object, yes, this has to be here.
  this.color.primary = options.primaryColor || "rgb(80,255,240)"; // Default primary colour is cyan
  this.color.secondary = options.secondaryColor || "rgb(114,102,189)"; // Default secondary /colour is purple
  this.HP = options.HP || this.model.maxHP; // Default hit points is the max the ship can have (hopefully..)
  console.log("Ship HP: " + this.HP); // Just testing max HP is set correctly. Seems to work :D
  this.move = false;
}



function play31() {

  var // The vars have got to be at an odd angle (JSLint), this might be clearer than having 1st on same line
    playerShip; // Players current ship (and all the fancy stuff on it?)

  var meter = new FPSMeter({ theme: "colorful", heat: 1 });

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
  }



  function update(dt) {

    // Player movement
    if (playerShip.move === "left") {
      playerShip.model.x--;
      playerShip.model.index = 0;
    } else if (playerShip.move === false) {
      playerShip.model.index = 1;
    } else if (playerShip.move === "right") {
      playerShip.model.x++;
      playerShip.model.index = 2;
    }
    if (playerShip.model.x < 0) { playerShip.model.x = 0; }
    if (playerShip.model.x > (31 - playerShip.model.width)) { playerShip.model.x = 31 - playerShip.model.width; }

    if (debug) { console.log(keys); } // THIS IS JUST TEMPORARY, to show key input system
  }



  function gameLoop() {

    now = window.performance.now();
    dt = Math.min(1000, (now - last));  // duration in mili-seconds

    render(dt);
    playerShip.model.draw();

    while (dt > step) {
      dt -= step;

      // Could be put somewhere better, just for testing
      if (keys.left) { playerShip.move = "left"; }
      if (keys.right) { playerShip.move = "right"; }
      if (!keys.left && !keys.right) { playerShip.move = false; }

      debugMenu.innerHTML = playerShip.move;

      update(dt);
    }

    //if (debug) { debugMenu.innerHTML = "FrameTime: " + now.toFixed(); }

    meter.tick();
    last = now;
    animate(gameLoop);
  }



  function newGame(level) {
    // Clear old stuff

    switch (level) {
    case "level1":
      //Do level1 stuff
      playerShip = new Ship({ // !!! Changed to use an object for args
        // Starting ship properties. TODO: on 2nd run through you keep ship from previous game.
        model: smallShip
      });
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
