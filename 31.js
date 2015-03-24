/*jslint plusplus: true, browser: true, devel: true, node: true, unparam: true, vars: true, white: true*/
/*global FPSMeter*/
"use strict";

var canvas = document.getElementById("canvas31"),
  ctx = canvas.getContext("2d"),
  debug = false,
  debugMenu = document.getElementById("debug"),
  meter,
  now,
  dt,
  last = window.performance.now,
  step = 1000 / 60,  // Try to update game 60 times a second, step = 16.67ms
  gridSize = 31,  // Size of board in "pixels" (number of cells) STARTS AT 1,1 in top left
  cSize;  // Size of cell in pixels

// Canvas compatability code, makes it work in IE.
// I vote we drop these because I don't care about the ~4% we'd lose,
// and as we're not testing on those browsers, something else would
// probably fuck it up on them anyway.
// http://www.w3schools.com/browsers/browsers_stats.asp
var animate = window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  function (callback) { window.setTimeout(callback, 1000 / 60); };

/* Extra canvas for creating primary colour
var canvasPri = document.createElement("canvas");
canvas.id = "canvasPri";
canvasPri.width = "248px";
canvasPri.height = "248px";
document.body.appendChild(canvasPri);
canvasPri = document.getElementById("canvasPri"); // Reusing variable to grab canvas
var ctxPri = canvasPri.getContext("2d");
*/

// Resizes game window. If no scale given, you're just setting sizes on first run.
function resize(scale) {
  if (scale && (cSize + scale > 0)) {
    // Rescaling, and won't end up too small (remember, scale could be negative)
    canvas.width = canvas.height = gridSize * (cSize + scale);
    cSize = canvas.width / gridSize;
  } else {
    // Setting size on page load
    cSize = canvas.width / gridSize;
    if (cSize % 1 !== 0) {  // If gridSize is NOT a whole number (probably dodgy CSS)
      throw new Error ("Canvas size not divisible by 31.");
    }
  }
  // Makes images scale all pixely rather than blurring
  ctx.mozImageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;
}



function toggleDebug() {
  debug = !debug;
  if (debug) {
    if (!meter) { meter = new FPSMeter({ theme: "colorful", heat: 1 }); }
    meter.show();
    debugMenu.style.display = "block";
  } else {
    if (meter) { meter.hide(); }  // Only hide FPS Meter if it exists
    debugMenu.style.display = "none";
  }
}



// --------- INPUT -------- //
var key,
  keys = {};

document.onkeydown = function (key) {
  switch (key.which) {
    // Gameplay input keys - should be duplicated in .onkeyup
    case  32: keys.space = true; break;
    case  37: keys.left  = true; break;
    case  38: keys.up    = true; break;
    case  39: keys.right = true; break;
    case  40: keys.down  = true; break;

    // Other keys
    case  49: keys.one = true;   break;  // So many things can't start with a number char!
    case  50: keys.two = true;   break;
    case 187: resize(+2);        break;
    case 189: resize(-2);        break;
    case 191: toggleDebug();     break;
    default : if (debug) { console.log("Unhandled keypress: " + key.which); }
  }
};
document.onkeyup = function (key) {
  switch (key.which) {
    case  32: delete keys.space; break;
    case  37: delete keys.left;  break;
    case  38: delete keys.up;    break;
    case  39: delete keys.right; break;
    case  40: delete keys.down;  break;
    case  49: delete keys.one;   break;
    case  50: delete keys.two;   break;
    default : if (debug) { console.log("Unhandled keyUNpress: " + key.which); }
  }
};
// ------- INPUT END ------ //



// ----- SHIP OBJECTS ----- //
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
  this.maxVelocity = 0.5;  // 0.25 pixels/s max speed. Probably shouldn't have anything slower 'coz clunky
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
  this.maxHealth = 8;
  this.maxVelocity = 0.25;
}

function Ship(options) {
  // Inherit from the ship model
  this.model = options.model || "smallShip";
  switch(this.model) {
    case "smallShip": SmallShip.call(this); break;
    case "bigShip": BigShip.call(this); break;
    default: throw new Error ("Tried to load unknown ship.");
  }

  // Properties for all ships go here
  // ACTUALLY every sprite in the game will need these things, not just ships? ^.-
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
      Math.round(this.x) * cSize,              // DestinationX (Position on canvas)
      Math.round(this.y) * cSize,              // DestinationY (Rounded to make it locked to grid)
      this.width * cSize,                      // DestinationW (Size on canvas)
      this.height * cSize                      // DestinationH
    );

    ctx.restore();
  };
}
// --- SHIP OBJECTS END --- //



function play31() {

  var playerShip, // Players current ship and all the fancy stuff on it
      level;      // Data about the level


  function render() {

    // Fill one pixel in with specific colour
    function paintCell(x, y, color) {
      ctx.fillStyle = color;
      ctx.fillRect(x * cSize - cSize, y * cSize - cSize, cSize, cSize);
    }

    // Fill canvas with levels color
    ctx.fillStyle = "#2b383b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (meter) { meter.tickStart(); }  // FPS Meter start measuring time taken to render this frame

    if (debug) {
      debugMenu.innerHTML = "";
      debugMenu.innerHTML += "Input: " + JSON.stringify(keys) + "<br>";
      debugMenu.innerHTML += "Player ship direction: " + playerShip.move + "<br>";
    }

    playerShip.draw();

    if (meter) { meter.tick(); }  // FPS Meter measure FPS
  }



  function update(dt) {

    // Switching ships for testing. Ship only actually have to be changed at the start of the
    // level rather than on the fly like this.

    // I thought I could do this :/
    if (keys.one) { playerShip.model = "smallShip"; }

    // But this works, but not sure is best way?
    if (keys.two) {
      playerShip = new Ship({
        model: "bigShip",
        x: 11,
        y: 21
      });
    }



    // Player movement
    if (playerShip.move === "left") {
      playerShip.x -= playerShip.maxVelocity;
      playerShip.index = 0;
    } else if (!playerShip.move) {
      playerShip.index = 1;
    } else if (playerShip.move === "right") {
      playerShip.x += playerShip.maxVelocity;
      playerShip.index = 2;
    }

    // I feel like this should be just a tiny bit seperate from movement :P
    if (playerShip.x < 0) { playerShip.x = 0; }
    if (playerShip.x > (31 - playerShip.width)) { playerShip.x = 31 - playerShip.width; }

    // Testing up/down movement for "going off top of screen" because looks cool
    // Minus and plusses look wrong way around but remember 1,1 is top left!
    if (playerShip.move === "up") { playerShip.y -= playerShip.maxVelocity; }
    if (playerShip.move === "down") { playerShip.y += playerShip.maxVelocity; }

  }



  function gameLoop() {

    now = window.performance.now();
    dt = Math.min(1000, (now - last));  // duration in mili-seconds

    render(dt);

    while (dt > step) {
      dt -= step;

      // Could be put somewhere better, just for testing. Edited so don't delete without reason!
      // In my head this is really simple, but formatted like this looks like crap
      if (keys.left && !keys.right) {
        playerShip.move = "left";
      } else {
        if (!keys.left && keys.right) {
          playerShip.move = "right";
        } else {
          playerShip.move = false;
        }
      }

      // Testing up/down movement for "going off top of screen" because looks cool
      if (keys.up) { playerShip.move = "up"; }
      if (keys.down) { playerShip.move = "down"; }

      // Flip this ship!
      if (keys.space) {
        playerShip.flip = true;
      } else { playerShip.flip = false; }

      update(dt);
    }

    last = now;
    animate(gameLoop);
  }



  function newGame(level) {
    // Clear old stuff

    switch (level) {
    case "level1":
      // TODO: level = new Level (and add a nice constructor class)?
      playerShip = new Ship({
        model: "smallShip",
        x: 13,
        y: 22
      });
      break;
    case "level2":
      playerShip = new Ship({
        model: "bigShip",
        x: 13,
        y: 20
      });
      break;
    default:
      throw new Error ("Tried to load unknown level.");
    }

    gameLoop();
  }

  newGame("level1");

}
window.onload = function () { resize(); play31(); };
