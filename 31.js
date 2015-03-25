/*jslint plusplus: true, browser: true, devel: true, node: true, unparam: true, vars: true, white: true*/
/*global FPSMeter*/
"use strict";

var canvas = document.getElementById("canvas31"),
  canvasPri = document.createElement("canvas"),
  canvasSec = document.createElement("canvas"),
  debug = false,
  debugMenu = document.getElementById("debug"),
  meter,
  now,
  dt,
  last = window.performance.now,
  step = 1000 / 60,  // Try to update game 60 times a second, step = 16.67ms
  gridSize = 31,  // Size of board in "pixels" (number of cells) STARTS AT 1,1 in top left
  cSize;  // Size of cell in pixels



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

}

// Fill one pixel in with specific colour
function paintCell(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x * cSize), Math.round(y * cSize), cSize, cSize);
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
    case  49: keys.one   = true; break;
    case  50: keys.two   = true; break;
    case  51: keys.three = true; break;
    case  52: keys.four  = true; break;
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
    case  51: delete keys.three; break;
    case  52: delete keys.four;  break;
    default : if (debug) { console.log("Unhandled keyUNpress: " + key.which); }
  }
};
// ------- INPUT END ------ //



// -------- OBJECTS ------- //
var mainSprites = new Image();
mainSprites.src = "greyscaleSpriteSheet.png";

function SmallShip() {
  this.spriteSheet = mainSprites;
  this.spriteX = 0;    // Position of the sprite in the sheet
  this.spriteY = 3;
  this.width = 5;      // Width/Height of the Frame
  this.height = 6;
  this.index = 1;      // Current frame of the sheet
  this.weapons = {};
  this.hp = [
    {x: 2, y: 2, tiltOffsetL: -1, tiltOffsetR:  1},
    {x: 2, y: 3, tiltOffsetL: -1, tiltOffsetR:  1}
  ];
  this.maxVelocity = 0.5;
}
function BigShip() {
  var i;
  this.spriteSheet = mainSprites;
  this.spriteX = 16;    // Position of the sprite in the sheet
  this.spriteY = 0;
  this.width = 9;      // Width/Height of the Frame
  this.height = 9;
  this.index = 1;      // Current frame of the sheet
  this.weapons = {};
  this.hp = [  // hp[i].lost = true to remove a hitpoint, delete hp[i].lost to restore
    {x: 4, y: 3, tiltOffsetL: -2   , tiltOffsetR:  2    },
    {x: 3, y: 4, tiltOffsetL: false, tiltOffsetR:  2    }, // tiltOffset: false means not displayed
    {x: 4, y: 4, tiltOffsetL: -2   , tiltOffsetR:  2    },
    {x: 5, y: 4, tiltOffsetL: -2   , tiltOffsetR: false },
    {x: 3, y: 5, tiltOffsetL: false, tiltOffsetR:  2    },
    {x: 4, y: 5, tiltOffsetL: -2   , tiltOffsetR:  2    },
    {x: 5, y: 5, tiltOffsetL: -2   , tiltOffsetR: false },
    {x: 4, y: 6, tiltOffsetL: -2   , tiltOffsetR:  2    }
  ];
  this.maxVelocity = 0.3;
}

function MediumRock() {
  this.spriteSheet = mainSprites;
  this.spriteX = 44;   // Position of the sprite in the sheet
  this.spriteY = 0;
  this.width = 4;      // Width/Height of the Frame
  this.height = 4;
  this.index = 0;      // Current frame of the sheet
  this.maxHealth = 8;
  this.maxVelocity = 0.25;
  this.hp = [];  // Not sure if this actually needs to be set
}

function Entity(options) {
  var i;
  // Inherit from the correct object type
  this.type = options.type || "smallShip";
  switch(this.type) {
    case "smallShip": SmallShip.call(this); break;
    case "bigShip": BigShip.call(this); break;
    case "mediumRock": MediumRock.call(this); break;
    default: throw new Error ("Tried to load unknown object.");
  }

  this.maxHealth = this.hp.length;

  this.getHealth = function() {
    var currentHealth = this.maxHealth;
    for (i = 0; i < this.maxHealth; i++) {
      if (this.hp[i].hasOwnProperty("lost")) { currentHealth--; }
    }
    return currentHealth;
  };

  this.hpLost = function() {
    var lostHp;
    for (i = 0; i < this.maxHealth; i++) {
      if (!this.hp[i].lost && !lostHp) { this.hp[i].lost = true; lostHp = true; }
    }
    if (!lostHp) { this.dead = true; }  // Been hit after running out of HP so deaded
  };

  this.hpRestore = function() {
    var restoredHp;
    for (i = 0; i < this.maxHealth; i++) {
      if (this.hp[i].lost && !restoredHp) { delete this.hp[i].lost; restoredHp = true; }
    }
  };

  // Properties for all objects go here
  this.x = options.x || 0;
  this.y = options.y || 0;
  this.vx = options.vx || 0;
  this.vy = options.vy || 0;
  this.dead = false;

  // Colour stuff
  this.primaryColor = options.primaryColor || false;
  this.secondaryColor = options.secondaryColor || false;

  // Initial draw creates the object off screen, then these two images both get
  // drawn onto the main canvas when this.draw() is called. Each entity that is coloured
  // in this way needs to have it's own canvas or two (I think), so we should come up with a way
  // to make hidden canvaseses on the fly whenever a coloured object is spawned.

  if (this.primaryColor && this.secondaryColor) {
    if (debug) { console.log("Creating a fancy colourful ship"); }
    //canvasPri = document.getElementById('canvasPri');
    var ctxPri = canvasPri.getContext('2d');
    ctxPri.mozImageSmoothingEnabled = false;
    ctxPri.imageSmoothingEnabled = false;

    ctxPri.drawImage(this.spriteSheet, 0, 0);
    ctxPri.globalCompositeOperation = "source-atop";
    ctxPri.fillStyle = this.primaryColor;
    ctxPri.fillRect(0,0,canvasPri.width,canvasPri.height);

    //canvasSec = document.getElementById('canvasSec');
    var ctxSec = canvasSec.getContext('2d');
    ctxSec.mozImageSmoothingEnabled = false;
    ctxSec.imageSmoothingEnabled = false;

    ctxSec.drawImage(this.spriteSheet, 0, 0);
    ctxSec.globalCompositeOperation = "source-atop";
    ctxSec.fillStyle = this.secondaryColor;
    ctxSec.fillRect(0,0,canvasSec.width,canvasSec.height);

    //canvas = document.getElementById('canvas31');
    var ctx = canvas.getContext('2d');
    ctx.mozImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;
  }
  // End initial hidden draw



  this.draw = function(ctx) {

    /*
    if (this.flip) {
      ctx.save();
      ctx.translate(0, canvas.width);
      ctx.scale(1, -1);
    }
    */
    // I'm getting the feeling only ships should have primary and secondary colours because confusing
    if (this.primaryColor && this.secondaryColor) {
      ctx.drawImage(  // Ship hull (primary colour)
        canvasPri,
        this.spriteX + this.width * this.index,  // SourceX (Position of frame)
        this.spriteY,                            // SourceY
        this.width,                              // SourceW (Size of frame)
        this.height,                             // SourceH
        Math.round(this.x) * cSize,              // DestinationX (Position on canvas)
        Math.round(this.y) * cSize,              // DestinationY (Rounded to make it locked to grid)
        this.width * cSize,                      // DestinationW (Size on canvas)
        this.height * cSize                      // DestinationH
      );
      ctx.drawImage(  // Cockpit (secondary colour)
        canvasSec,
        this.spriteX + this.width * this.index,  // SourceX (Position of frame)
        this.spriteY + this.height,              // SourceY
        this.width,                              // SourceW (Size of frame)
        this.height,                             // SourceH
        Math.round(this.x) * cSize,              // DestinationX (Position on canvas)
        Math.round(this.y) * cSize,              // DestinationY (Rounded to make it locked to grid)
        this.width * cSize,                      // DestinationW (Size on canvas)
        this.height * cSize                      // DestinationH
      );
      ctx.drawImage(  // Engine trails
        this.spriteSheet,
        this.spriteX + this.width * this.index,  // SourceX (Position of frame)
        this.spriteY + this.height * 2,          // SourceY
        this.width,                              // SourceW (Size of frame)
        12, // Max height of engine trails is 12 // SourceH
        Math.round(this.x) * cSize,              // DestinationX (Position on canvas)
        Math.round(this.y + this.height - 1) * cSize, // DestinationY (-1 because goes up in ship hull)
        this.width * cSize,                      // DestinationW (Size on canvas)
        12 * cSize                               // DestinationH
      );
      // And now for the magic cockpit code
      var tilt = 0;
      for (i = 0; i < this.maxHealth; i++) {
        if (this.index === 0) { tilt = this.hp[i].tiltOffsetL; }
        if (this.index === 2) { tilt = this.hp[i].tiltOffsetR; }
        if (this.hp[i].lost) {
          var c = Math.floor(Math.random() * 64);
          paintCell(
            ctx,
            Math.round(this.x) + this.hp[i].x + tilt,
            Math.round(this.y) + this.hp[i].y,
            ('rgb(' + (c+191) + ',' + (c*3) + ',' + c + ')')
          );
        }
      }
    } else { // Draw simple sprite that doesn't have fancy colours and shit
      ctx.drawImage(
        this.spriteSheet,
        this.spriteX + this.width * this.index,  // SourceX (Position of frame)
        this.spriteY,                            // SourceY
        this.width,                              // SourceW (Size of frame)
        this.height,                             // SourceH
        Math.round(this.x) * cSize,              // DestinationX (Position on canvas)
        Math.round(this.y) * cSize,              // DestinationY (Rounded to make it locked to grid)
        this.width * cSize,                      // DestinationW (Size on canvas)
        this.height * cSize                      // DestinationH
      );
    }
    //ctx.restore();
  };
}
// ------ OBJECTS END ----- //



function play31() {

  var playerShip,   // Players current ship and all the fancy stuff on it
      level = {     // Data about the level
        rocks: [],
        enemies: [],
        collidable: [], // All things that collide
        background: "Pink!"
      },
      i;


  function render() {

    if (meter) { meter.tickStart(); }  // FPS Meter start measuring time taken to render this frame

    var ctx = canvas.getContext('2d');
    ctx.mozImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;

    // Fill canvas with levels color
    ctx.fillStyle = "#2b383b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw space rocks
    for (i = 0; i < level.rocks.length; i++) {
      level.rocks[i].draw(ctx);
    }

    playerShip.draw(ctx);



    // ------ DEBUG INFO ------ //
    if (debug) {
      debugMenu.innerHTML = "";
      debugMenu.innerHTML += "Input: " + JSON.stringify(keys) + "<br>";
      debugMenu.innerHTML += "Player ship direction: " + playerShip.move + "<br>";
      debugMenu.innerHTML += "Player ship HP: " + playerShip.getHealth() + "<br>";
    }
    // ------- DEBUG END ------ //
  }



  function update(dt) {

    var i;

    // Switching ships for testing. Ship only actually have to be changed at the start of the
    // level rather than on the fly like this.
    if (keys.one) {
      playerShip = new Entity({
        type: "smallShip",
        x: 13,
        y: 23,
        primaryColor: "rgba(0,235,230,0.5)",
        secondaryColor: "rgba(80,50,255,0.5)"
      });
    }

    if (keys.two) {
      playerShip = new Entity({
        type: "bigShip",
        x: 11,
        y: 20,
        primaryColor: "rgba(80,80,0,0.7)",
        secondaryColor: "rgba(0,235,230,0.5)"
      });
    }



    // Testing up/down movement for "going off top of screen" because looks cool
    // Minus and plusses look wrong way around but remember 1,1 is top left!
    if (playerShip.move === "up") { playerShip.y -= playerShip.maxVelocity; }
    if (playerShip.move === "down") { playerShip.y += playerShip.maxVelocity; }

    // hitpoints / hp / health debugging
    if (keys.three) { delete keys.three; playerShip.hpLost(); }
    if (keys.four) { delete keys.four; playerShip.hpRestore(); }



    /* Making space rocks testing. Shouldl be turned into a "rock spawner"
      Like this?
        emitter{
          startTime,
          endTime,
          type(like ships model? could emit rocks, or harmless particles),
          frequency,
          x, y
        }
    */

    var random100 = Math.floor(Math.random()*100); // Random number between 0 and 100ish

    // Random number between 0 and 31ish, should be - this.width/2? Unless rocks can appear off the side
    // and you can strafe (moving camera) sideways into them
    var random31 = Math.floor(Math.random()*(31-2));
    var rockSpawnerFrequency = 5;
    if (random100 < rockSpawnerFrequency) {
      var r = new Entity({
        type: "mediumRock",
        x: random31,
        y: -10  // Should be - this.height
      });
      level.rocks.push(r);
    }

    // Rock movement
    for (i = 0; i < level.rocks.length; i++) {
      var ent = level.rocks[i];
      ent.y += ent.maxVelocity;
      // If the rock goes off the bottom move to the top, wont want this in the final
      //if (ent.y > 32) { ent.y = -ent.height; }
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

    if (meter) { meter.tick(); }  // FPS Meter tick finish

    last = now;
    window.requestAnimationFrame(gameLoop);
  }



  function newGame(levelID) {
    // Clear old stuff

    switch (levelID) {
    case "level1":
      // TODO: level = new Level (and add a nice constructor class)?
      playerShip = new Entity({
        type: "smallShip",
        x: 13,
        y: 23,
        primaryColor: "rgba(80,80,0,0.7)",
        secondaryColor: "rgba(0,235,230,0.5)"
      });
      var r = new Entity({
        type: "mediumRock",
        x: 5,
        y: 5
      });
      level.rocks.push(r);
      break;
    case "level2":
      playerShip = new Entity({
        type: "bigShip",
        x: 13,
        y: 20,
        primaryColor: "rgba(80,80,0,0.7)",
        secondaryColor: "rgba(0,235,230,0.5)"
      });
      break;
    default:
      throw new Error ("Tried to load unknown level.");
    }

    console.log(level);

    gameLoop();
  }

  newGame("level1");

}
window.onload = function () { resize(); play31(); };
