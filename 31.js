/*jslint plusplus: true, browser: true, devel: true, node: true, vars: true */
"use strict";

var canvas = document.getElementById("31"),
  ctx = canvas.getContext("2d"),
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

// Extra canvas for creating primary col
var canvasPri = document.createElement("canvas");
canvas.id = "canvasPri";
canvasPri.width = "248px";
canvasPri.height = "248px";
document.body.appendChild(canvasPri);
canvasPri = document.getElementById("canvasPri"); // Reusing variable to grab canvas
var ctxPri = canvasPri.getContext("2d");

// Hopefully makes it scale all pixely (yay!)
ctx.imageSmoothingEnabled = false;



// Keyboard handling
// Some common keys
var KEY = {
  ENTER:   13,
  SPACE:    32,
  LEFT:     37,
  UP:       38,
  RIGHT:    39,
  DOWN:     40
};
var pressed = {};

// When the key is first pressed the timestamp (now) is stored in pressed.keyCode. It is removed
// when the key is released
document.addEventListener("keydown", function (ev) {
  ev.preventDefault();
  if (!pressed[ev.keyCode]) { pressed[ev.keyCode] = now; }
});
document.addEventListener("keyup", function (ev) {
  ev.preventDefault();
  pressed[ev.keyCode] = false;
});



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
      that.x * 8,
      that.y * 8,
      that.width * 8,
      that.height * 8
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
    debug = true,
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
  }

  function gameLoop() {

    now = window.performance.now();
    dt = Math.min(1000, (now - last));  // duration in mili-seconds

    render(dt);
    playerShip.model.draw();

    while (dt > step) {
      dt -= step;

      // Could be put somewhere better, just for testing
      if (pressed[KEY.LEFT]) { playerShip.move = "left"; }
      if (pressed[KEY.RIGHT]) { playerShip.move = "right"; }
      if (!pressed[KEY.LEFT] && !pressed[KEY.RIGHT]) { playerShip.move = false; }

      debugMenu.innerHTML = playerShip.move;

      update(dt);
    }

    //if (debug) { debugMenu.innerHTML = "FrameTime: " + now.toFixed(); }

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
