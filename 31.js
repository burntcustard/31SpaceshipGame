/*jslint plusplus: true, browser: true, devel: true, node: true, unparam: true, vars: true, white: true*/
/*global FPSMeter*/
"use strict";

var canvas = document.getElementById("canvas"),
  ctx = canvas.getContext("2d"),
  debug = false,
  now,
  dt,
  last = window.performance.now,
  step = 1000 / 60,  // Try to update game 60 times a second, step = 16.67ms
  gridSize = 31,  // Size of board in "pixels" (number of cells) STARTS AT 1,1 in top left
  cSize;  // Size of cell in pixels

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

// Resizes game window. If no scale given, you're just setting sizes on first run.
function resize(scale) {
  if (scale && (cSize + scale > 0)) {
    canvas.width = canvas.height = (gridSize * (cSize + scale));
    cSize = Math.round(canvas.width / gridSize);
  } else {
    cSize = canvas.width / gridSize;
    if ( gridSize % 1 !== 0) { // If gridSize is NOT a whole number
      console.log("ERROR: Canvas size not divisible by 31");
    }
  }
  console.log("Canvas size: " + canvas.width + ", cell size: " + cSize);
  // Makes images scale all pixely (yay!)
  ctx.mozImageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;
}

// ----- INPUT ----
var key,
  keys = {};

document.onkeydown = function (key) {
  switch (key.which) {
    case  32: keys.space = true; break;
    case  37: keys.left  = true; break;
    case  38: keys.up    = true; break;
    case  39: keys.right = true; break;
    case  40: keys.down  = true; break;
    case 187: resize(+2);        break;
    case 189: resize(-2);        break;
    case 191: debug = !debug;    break;
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
// -- Input End ---


// Menu stuffs
var debugMenu = document.getElementById("debug");



// -------- Ship Objects Start --------
function SmallShip() {
  this.spriteSheet = new Image();
  this.spriteSheet.src = "spriteSheet.png";
  this.spriteX = 0;    // Position of the sprite in the sheet
  this.spriteY = 0;
  this.width = 5;      // Width/Height of the Frame
  this.height = 18;
  this.index = 0;      // Current frame of the sheet
  this.weapons = {};
  this.maxHealth = 2;
}
function BigShip() {
  this.spriteSheet = new Image();
  this.spriteSheet.src = "spriteSheet.png";
  this.spriteX = 0;    // Position of the sprite in the sheet
  this.spriteY = 19;
  this.width = 9;      // Width/Height of the Frame
  this.height = 20;
  this.index = 0;      // Current frame of the sheet
  this.weapons = {};
  this.maxHealth = 2;
}

function Ship(options) {
  // Inherit from the ship model
  this.model = options.model || "smallShip";
  switch(this.model) {
    case "smallShip": SmallShip.call(this); break;
    case "bigShip": BigShip.call(this); break;
    default: console.log("Unknown ship model!!!!");
  }

  // Properties for all ships go here
  this.x = options.x || 0;
  this.y = options.y || 0;
  this.vx = options.vx || 0;
  this.vy = options.vy || 0;
  this.hp = options.hp || this.maxHealth;

  // Colour stuff
  this.colour = {};
  this.colour.primary = options.primaryColor || "rgb(80,255,240)"; // Default primary colour is cyan
  this.colour.secondary = options.secondaryColor || "rgb(114,102,189)"; // Default secondary colour is purple

  this.draw = function() {

    if (this.flip) {
      ctx.save();
      ctx.translate(0, canvas.width);
      ctx.scale(1, -1);
    }

    ctx.drawImage(
      this.spriteSheet,                        // Spritesheet
      this.spriteX + this.width * this.index,  // SourceX (Position of frame)
      this.spriteY,                            // SourceY
      this.width,                              // SourceW (Size of frame)
      this.height,                             // SourceH
      this.x * cSize,                          // DestinationX (Position on canvas)
      this.y * cSize,                          // DestinationY
      this.width * cSize,                      // DestinationW (Size on canvas)
      this.height * cSize                      // DestinationH
    );

    ctx.restore();
  };
}
// ----------- Ship Object End --------



function play31() {

  var playerShip; // Players current ship (and all the fancy stuff on it?)

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
      playerShip.x--;
      playerShip.index = 0;
    } else if (playerShip.move === false) {
      playerShip.index = 1;
    } else if (playerShip.move === "right") {
      playerShip.x++;
      playerShip.index = 2;
    }
    if (playerShip.x < 0) { playerShip.x = 0; }
    if (playerShip.x > (31 - playerShip.width)) { playerShip.x = 31 - playerShip.width; }

    if (debug) { console.log(keys); } // THIS IS JUST TEMPORARY, to show key input system
  }



  function gameLoop() {

    now = window.performance.now();
    dt = Math.min(1000, (now - last));  // duration in mili-seconds

    render(dt);
    playerShip.draw();

    while (dt > step) {
      dt -= step;

      // Could be put somewhere better, just for testing
      if (keys.left) { playerShip.move = "left"; }
      if (keys.right) { playerShip.move = "right"; }
      if (!keys.left && !keys.right) { playerShip.move = false; }

      // Flip this ship!
      if (keys.space) {
        playerShip.flip = true;
      } else { playerShip.flip = false; }

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
      playerShip = new Ship({
        model: "bigShip",
        x: 13,
        y: 21
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

window.onload = function () { resize(); play31(); };
