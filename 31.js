/*jslint plusplus: true, browser: true, devel: true, node: true, unparam: true, vars: true, white: true*/
/*global FPSMeter*/
"use strict";

var canvas = document.getElementById("canvas31"),
  canvasPri = document.createElement("canvas"),
  canvasSec = document.createElement("canvas"),
  canvasCollision = document.createElement("canvas"),
  debug = false,
  debugMenu = document.getElementById("debug"),
  meter,
  now,
  dt,
  last = window.performance.now,
  step = 1000 / 60,  // Try to update game 60 times a second, step = 16.67ms
  gridSizeX = 31,  // Size of board in "pixels" (number of cells) STARTS AT 1,1 in top left
  gridSizeY  = 39,
  initialScale = 16,  // Starting size of cell in pixels
  cSize = initialScale;  // Size of cell in pixels



// Resizes game window. If no scale given, you're just setting sizes on first run.
function resize(requestedScale) {
  var scale = requestedScale || 0;
  if (cSize + scale > 0) {
    canvas.width = gridSizeX * (cSize + scale);
    canvas.height = gridSizeY * (cSize + scale);
    cSize = canvas.width / gridSizeX;
    if (cSize % 1 !== 0) {  // If gridSize is NOT a whole number (probably dodgy CSS)
      throw new Error ("Canvas size not divisible by 31.");
    }
    canvas.style.display = "block";
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



// ======================================================================================= //
//                                                                                         //
//   .o88b.  .d88b.  db      db      d888888b .d8888. d888888b  .d88b.  d8b   db .d8888.   //
//  d8P  Y8 .8P  Y8. 88      88        `88'   88'  YP   `88'   .8P  Y8. 888o  88 88'  YP   //
//  8P      88    88 88      88         88    `8bo.      88    88    88 88V8o 88 `8bo.     //
//  8b      88    88 88      88         88      `Y8b.    88    88    88 88 V8o88   `Y8b.   //
//  Y8b  d8 `8b  d8' 88booo. 88booo.   .88.   db   8D   .88.   `8b  d8' 88  V888 db   8D   //
//   `Y88P'  `Y88P'  Y88888P Y88888P Y888888P `8888Y' Y888888P  `Y88P'  VP   V8P `8888Y'   //
//                                                                                         //
// ======================================================================================= //

/**
 * Creates a map of all of the visible pixels in the object. Effectively draws the objects
 * sprite onto a hidden canvas with no scaling, and then checks each pixel, top to bottom
 * (similar to how text is read along and then down a line) If a pixel is fully transparent,
 * i.e. rgba(-,-,-,0), it adds that pixels x, y coordinates as an object to the pixelMap array.
 *
 * @todo Consider calling this function only once per sprite, rather than every time for both
 *       sprites that might be colliding.
 * @todo Pass this function only relevant info about the object rather than the whole thing.
 *
 * @param   {Object}  obj The object with the sprite to look at, e.g. a spaceship or a space rock.
 */

function createPixelMap(obj) {
  var x, y;
  var ctxCollision = canvasCollision.getContext('2d');
  obj.pixelMap = [];
  ctxCollision.clearRect(0, 0, gridSizeX, gridSizeY);  // Clear space to draw sprites
  ctxCollision.drawImage(
    obj.sprite.source,
    obj.sprite.x + obj.sprite.w * obj.sprite.index,// SourceX (Position of frame)
    obj.sprite.y,                                  // SourceY
    obj.sprite.w,                                  // SourceW (Size of frame)
    obj.sprite.h,                                  // SourceH
    0,                                             // DestinationX (Position on canvas)
    0,                                             // DestinationY
    obj.sprite.w,                                  // DestinationW (Size on canvas)
    obj.sprite.h                                   // DestinationH
  );
  for(y = 0; y < obj.sprite.h; y++) {
    for(x = 0; x < obj.sprite.w; x++) {
    // Fetch pixel at current position
      var pixel = ctxCollision.getImageData(x, y, 1, 1);
      // Check that opacity is above zero
      if(pixel.data[3] !== 0) {
        var tmp = {x: x, y: y};
        //console.log("Pushing " + JSON.stringify(tmp) + " to pixel map");
        obj.pixelMap.push(tmp);
      }
    }
  }
}

/**
 * Offsets an entities pixel map so that it matches the entities location in the game.
 * @param   {Object}  obj The object with the pixel map to look at, e.g. a spaceship or a space rock.
 * @returns {[array]} pixelMap An array of objects containing x, y coordinates.
 */
function offsetPixelMap(obj) {
  var i,
      pixelMap = JSON.parse(JSON.stringify(obj.pixelMap)); // Reference bye bye
  for (i = 0; i < offsetPixelMap.length; i++) {
    pixelMap[i].x = obj.pixelMap[i].x + Math.round(obj.x);
    pixelMap[i].y = obj.pixelMap[i].y + Math.round(obj.y);
  }
  return pixelMap;
}



/**
 * Checks if two objects have sprites that are colliding.
 *
 * @todo Make the crazy long if statement a bit neater.
 * @todo Check if the object already has a pixelMap so it doesn't have to be generated again.
 *
 * @param   {Object}  obj1 [[Description]]
 * @param   {Object}  obj2 [[Description]]
 * @returns {Boolean} True if the objects have collided, else false.
 */
function checkCollision(obj1, obj2) {

  var t1 = Math.round(obj1.y),
      r1 = Math.round(obj1.x + obj1.sprite.w),
      b1 = Math.round(obj1.y + obj1.sprite.h),
      l1 = Math.round(obj1.x),
      t2 = Math.round(obj2.y),
      r2 = Math.round(obj2.x + obj2.sprite.w),
      b2 = Math.round(obj2.y + obj2.sprite.h),
      l2 = Math.round(obj2.x);

  // Bounding box collisions
  if (t1 >= b2) {return false;}
  if (r1 <= l2) {return false;}
  if (b1 <= t2) {return false;}
  if (l1 >= r2) {return false;}
  // It got to here so bounding boxes are colliding!
  return true;
}

function checkPixelCollision(obj1PixelMap, obj2PixelMap) {
  var obj1i, obj2i;
  //console.log("Obj1PixelMap: " + JSON.stringify(obj1PixelMap));
  for (obj1i = 0; obj1i < obj1PixelMap.length; obj1i++) {
    for (obj2i = 0; obj2i < obj2PixelMap.length; obj2i++) {
      if (obj1PixelMap[obj1i].x === obj2PixelMap[obj2i].x &&
          obj1PixelMap[obj1i].y === obj2PixelMap[obj2i].y) {
        if (debug) { console.log("Pixel collision"); }
        return true;
      }
    }
  }
}
// - COLLISION DETECTION END - //



// ====================================================================== //
//                                                                        //
//  d88888b d8b   db d888888b d888888b d888888b d888888b d88888b .d8888.  //
//  88'     888o  88 `~~88~~'   `88'   `~~88~~'   `88'   88'     88'  YP  //
//  88ooooo 88V8o 88    88       88       88       88    88ooooo `8bo.    //
//  88~~~~~ 88 V8o88    88       88       88       88    88~~~~~   `Y8b.  //
//  88.     88  V888    88      .88.      88      .88.   88.     db   8D  //
//  Y88888P VP   V8P    YP    Y888888P    YP    Y888888P Y88888P `8888Y'  //
//                                                                        //
// ====================================================================== //

var mainSprites = new Image();
mainSprites.src = "spriteSheet.png";

// Entity super class
function Entity(options, type) {
  var i;

  this.name = options.name || type.name || "Entity"; // For debugging

  this.x = options.x || 0;
  this.y = options.y || 0;
  this.vx = options.vx || 0;
  this.vy = options.vy || 0;

  this.maxVelocity = options.maxVelocity|| type.maxVelocity || 1;

  this.hp = type.hp || [];
  this.maxHealth = this.hp.length;
  this.dead = false;
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
    if (!lostHp) {  // Been hit after running out of HP so deaded
      this.dead = true;
      if (debug) { console.log(this.name + " Dead at X: " + this.x + " Y: " + this.y); }
    }
  };
  this.hpRestore = function() {
    var restoredHp;
    for (i = 0; i < this.maxHealth; i++) {
      if (this.hp[i].lost && !restoredHp) { delete this.hp[i].lost; restoredHp = true; }
    }
  };

  this.sprite = {
    source: type.source || mainSprites,
    index: type.index || 0,
    x: type.x || 0,
    y: type.y || 0,
    w: type.w || 1,
    h: type.h || 1
  };

  this.draw = function(context) {
    context.drawImage(
        this.sprite.source,
        this.sprite.x + this.sprite.index * this.sprite.w, // SourceX (Frame pos)
        this.sprite.y,                                     // SourceY
        this.sprite.w,                                     // SourceW (Frame size)
        this.sprite.h,                                     // SourceH
        Math.round(this.x) * cSize,                        // DestinationX (Position on canvas)
        Math.round(this.y) * cSize,                        // DestinationY (Rounded to grid)
        this.sprite.w * cSize,                             // DestinationW (Size on canvas)
        this.sprite.h * cSize);                            // DestinationH
  };
}



// Emitter sub-class
function Emitter(options, type) {
  Entity.call(this, options, type);

  this.emittedObj = options.emittedObj;
  this.emitX = options.emitX || [0,0];
  this.emitY = options.emitY || [0,0];
  this.emitDir = options.emitDir || "d";

  this.cooldown = options.cooldown || 1000;
  this.start = options.start || 0;
  this.duration = options.duration || -1;

  this.emitting = true;
  this.lastEmission = 0;

  this.emit = function(spawnInto) {
    var newVX = this.emittedObj.maxVelocity, newVY = this.emittedObj.maxVelocity;
    switch(this.emitDir) {
        case "u": newVX  =  0; newVY *= -1; break;
        case "r": newVX *=  1; newVY  =  0; break;
        case "d": newVX  =  0; newVY *=  1; break;
        case "l": newVX *= -1; newVY  =  0; break;
    }
    if (now - this.lastEmission > this.cooldown && now > this.start && (now < this.start + this.duration || this.duration === -1)) {
      var e = new Entity({
        x: this.x + Math.floor(this.emitX[0] + Math.random() * (this.emitX[1] - this.emitX[0])),
        y: this.y,
        vx: newVX, vy: newVY
      },
      this.emittedObj);
      spawnInto.entities.push(e);
      spawnInto.collidable.push(e);
      this.lastEmission = now;
    }
  };
}



// Ship sub-class
function Ship(options, type) {
  var i;
  Entity.call(this, options, type);

  this.weapons = type.weapons || [];

  console.log(this.weapons.length);

  for (i = 0; i < this.weapons.length; i++) {
    var weap = new Emitter({
      x: this.x + this.weapons[i].x,
      y: this.y + this.weapons[i].y,
      emittedObj: this.weapons[i].type.ammo,
      emitDir: "u",
      cooldown: 400
    }, this.weapons[i].type);
    this.weapons[i].emitter = weap;
    console.log(this.weapons);
  }

  // Colour stuff
  this.primaryColor = options.primaryColor || "rgba(0,0,0,0)";
  this.secondaryColor = options.secondaryColor || "rgba(0,0,0,0)";

  // Initial draw creates the object off screen, then these two images both get
  // drawn onto the main canvas when this.draw() is called. Each entity that is coloured
  // in this way needs to have it's own canvas or two (I think), so we should come up with a way
  // to make hidden canvaseses on the fly whenever a coloured object is spawned.

  var ctxPri = canvasPri.getContext('2d');
  ctxPri.mozImageSmoothingEnabled = false;
  ctxPri.imageSmoothingEnabled = false;
  ctxPri.drawImage(this.sprite.source, 0, 0);
  ctxPri.globalCompositeOperation = "source-atop";
  ctxPri.fillStyle = this.primaryColor;
  ctxPri.fillRect(0,0,canvasPri.width,canvasPri.height);

  var ctxSec = canvasSec.getContext('2d');
  ctxSec.mozImageSmoothingEnabled = false;
  ctxSec.imageSmoothingEnabled = false;
  ctxSec.drawImage(this.sprite.source, 0, 0);
  ctxSec.globalCompositeOperation = "source-atop";
  ctxSec.fillStyle = this.secondaryColor;
  ctxSec.fillRect(0,0,canvasSec.width,canvasSec.height);

  // End initial hidden draw

  this.draw = function(context) {
    var tilt = 0;

    // Draw weapons
    for (i = 0; i < this.weapons.length; i++) {
      if (this.sprite.index === 0) { tilt = this.weapons[i].tiltOffsetL; } else
      if (this.sprite.index === 2) { tilt = this.weapons[i].tiltOffsetR; }

      // Cheeky hack to get the weapon emitters following the ship !NEEDS TO CHANGE!
      this.weapons[i].emitter.x = this.x + this.weapons[i].x + tilt;

      context.drawImage(
        this.sprite.source,
        this.weapons[i].type.x,                             // SourceX (Position of frame)
        this.weapons[i].type.y,                             // SourceY
        this.weapons[i].type.w,                             // SourceW (Size of frame)
        this.weapons[i].type.h,                             // SourceH
        Math.round(this.x + this.weapons[i].x + tilt) * cSize,// DestinationX (Position on canvas)
        Math.round(this.y + this.weapons[i].y) * cSize,     // DestinationY
        this.weapons[i].type.w * cSize,                     // DestinationW (Size on canvas)
        this.weapons[i].type.h * cSize                      // DestinationH
      );
    }

    // Draw ship hull (primary colour)
    context.drawImage(
      canvasPri,
      this.sprite.x + this.sprite.index * this.sprite.w, // SourceX (Frame pos)
      this.sprite.y,                                     // SourceY
      this.sprite.w,                                     // SourceW (Frame size)
      this.sprite.h,                                     // SourceH
      Math.round(this.x) * cSize,                        // DestinationX (Position on canvas)
      Math.round(this.y) * cSize,                        // DestinationY (Rounded to grid)
      this.sprite.w * cSize,                             // DestinationW (Size on canvas)
      this.sprite.h * cSize                              // DestinationH
    );

    // Draw cockpit (secondary colour)
    context.drawImage(
      canvasSec,
      this.sprite.x + this.sprite.index * this.sprite.w, // SourceX (Frame pos)
      this.sprite.y + this.sprite.h,                     // SourceY
      this.sprite.w,                                     // SourceW (Frame size)
      this.sprite.h,                                     // SourceH
      Math.round(this.x) * cSize,                        // DestinationX (Position on canvas)
      Math.round(this.y) * cSize,                        // DestinationY (Rounded to grid)
      this.sprite.w * cSize,                             // DestinationW (Size on canvas)
      this.sprite.h * cSize                              // DestinationH
    );

    // Draw engine trails
    context.drawImage(
      this.sprite.source,
      this.sprite.x + this.sprite.w * this.sprite.index, // SourceX (Position of frame)
      this.sprite.y + this.sprite.h * 2,                 // SourceY
      this.sprite.w,                                     // SourceW (Size of frame)
      12,           // Max height of engine trails is 12 // SourceH
      Math.round(this.x) * cSize,                        // DestinationX (Position on canvas)
      Math.round(this.y + this.sprite.h - 1) * cSize,    // DestinationY (-1 because goes up in ship hull)
      this.sprite.w * cSize,                             // DestinationW (Size on canvas)
      12 * cSize                                         // DestinationH
    );

    // Draw destroyed cockpit tiles
    for (i = 0; i < this.maxHealth; i++) {
      if (this.sprite.index === 0) { tilt = this.hp[i].tiltOffsetL; }
      if (this.sprite.index === 2) { tilt = this.hp[i].tiltOffsetR; }
      if (this.hp[i].lost) {
        var c = Math.floor(Math.random() * 64);
        paintCell(
          context,
          Math.round(this.x) + this.hp[i].x + tilt,
          Math.round(this.y) + this.hp[i].y,
          ('rgb(' + (c+191) + ',' + (c*3) + ',' + c + ')')
        );
      }
    }

  };
}



// Object Types
var bullet = {
  name: "bullet",
  source: mainSprites,
  x: 58, y: 3,
  w: 1, h: 2,
  maxVelocity: 1
};
var smallGun = {
  name: "smallgun",
  source: mainSprites,
  x: 56, y: 4,
  w: 1, h: 3,
  cooldown: 1,
  ammo: bullet
};
var bigGun = {
  name: "bigGun",
  source: mainSprites,
  x: 56, y: 3,
  w: 1, h: 4,
  cooldown: 2,
  ammo: bullet
};
var smallShip = {
  name: "smallShip",
  source: mainSprites,
  x: 0, y: 3,
  w: 5, h: 6,
  index: 1,
  weapons: [
    {x: 2, y: -1, tiltOffsetL: -1, tiltOffsetR:  1, type: smallGun}
  ],
  hp: [
    {x: 2, y: 2, tiltOffsetL: -1, tiltOffsetR:  1},
    {x: 2, y: 3, tiltOffsetL: -1, tiltOffsetR:  1}
  ],
  maxVelocity: 0.5
};
var bigShip = {
  name: "bigShip",
  source: mainSprites,
  x: 16, y: 0,
  w: 9, h: 9,
  index: 1,
  weapons: [
    {x: 1, y: 3, tiltOffsetL:  0, tiltOffsetR:  2, type: bigGun},
    {x: 7, y: 3, tiltOffsetL: -2, tiltOffsetR:  0, type: bigGun}
  ],
  hp: [
    {x: 4, y: 3, tiltOffsetL: -2   , tiltOffsetR:  2    },
    {x: 3, y: 4, tiltOffsetL: false, tiltOffsetR:  2    }, // false = not displayed
    {x: 4, y: 4, tiltOffsetL: -2   , tiltOffsetR:  2    },
    {x: 5, y: 4, tiltOffsetL: -2   , tiltOffsetR: false },
    {x: 3, y: 5, tiltOffsetL: false, tiltOffsetR:  2    },
    {x: 4, y: 5, tiltOffsetL: -2   , tiltOffsetR:  2    },
    {x: 5, y: 5, tiltOffsetL: -2   , tiltOffsetR: false },
    {x: 4, y: 6, tiltOffsetL: -2   , tiltOffsetR:  2    }
  ],
  maxVelocity: 0.3
};
var mediumRock = {
  name: "mediumRock",
  source: mainSprites,
  x: 51, y: 3,
  w: 4, h: 4,
  maxVelocity: 0.25
};
// ------- Entity END ------- //





// ============================================================================================================== //
//                                                                                                                //
//  .88b  d88.  .d8b.  d888888b d8b   db  d88888b db    db d8b   db  .o88b. d888888b d888888b  .d88b.  d8b   db   //
//  88'YbdP`88 d8' `8b   `88'   888o  88  88'     88    88 888o  88 d8P  Y8 `~~88~~'   `88'   .8P  Y8. 888o  88   //
//  88  88  88 88ooo88    88    88V8o 88  88ooo   88    88 88V8o 88 8P         88       88    88    88 88V8o 88   //
//  88  88  88 88~~~88    88    88 V8o88  88~~~   88    88 88 V8o88 8b         88       88    88    88 88 V8o88   //
//  88  88  88 88   88   .88.   88  V888  88      88b  d88 88  V888 Y8b  d8    88      .88.   `8b  d8' 88  V888   //
//  YP  YP  YP YP   YP Y888888P VP   V8P  YP      ~Y8888P' VP   V8P  `Y88P'    YP    Y888888P  `Y88P'  VP   V8P   //
//                                                                                                                //
// ============================================================================================================== //

function play31() {

  var playerShip,   // Players current ship and all the fancy stuff on it
      i, j,
      level = {     // Data about the level
        entities: [],
        emitters: [],
        collidable: []
      };


// =============================== //
//   _____                   _     //
//  |_   _|                 | |    //
//    | |  _ __  _ __  _   _| |_   //
//    | | | '_ \| '_ \| | | | __|  //
//   _| |_| | | | |_) | |_| | |_   //
//  |_____|_| |_| .__/ \__,_|\__|  //
//              |_|                //
// =============================== //
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
      case  80: keys.p     = true; break;
      case  82: keys.r     = true; break;
      case 76: console.log(level); break;  // Pretty sure we could avoid having this here *grumpy face*
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
      case  80: delete keys.p;     break;
      case  82: delete keys.r;     break;
      default : if (debug) { console.log("Unhandled keyUNpress: " + key.which); }
    }
  };
  // -------- INPUT END -------- //


// =================================== //
//   _____                _            //
//  |  __ \              | |           //
//  | |__) |___ _ __   __| | ___ _ __  //
//  |  _  // _ \ '_ \ / _` |/ _ \ '__| //
//  | | \ \  __/ | | | (_| |  __/ |    //
//  |_|  \_\___|_| |_|\__,_|\___|_|    //
//                                     //
// =================================== //
  function render() {

    if (meter) { meter.tickStart(); }  // FPS Meter start measuring time taken to render this frame

    var ctx = canvas.getContext('2d');
    ctx.mozImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;

    // Fill canvas with levels color
    ctx.fillStyle = "#2b383b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stuff in entity list
    for (i = 0; i < level.entities.length; i++) {
      level.entities[i].draw(ctx);
    }

    //rockSpawner.draw(ctx);
    //mainGun.draw(ctx);
    playerShip.draw(ctx);

    // ------- DEBUG INFO -------- //
    if (debug) {
      debugMenu.innerHTML = "";
      debugMenu.innerHTML += "Input: " + JSON.stringify(keys) + "<br>";
      debugMenu.innerHTML += "Player ship direction: " + playerShip.move + "<br>";
      debugMenu.innerHTML += "Number of emitters: " + level.emitters.length + "<br>";
      debugMenu.innerHTML += "Number of entities: " + level.entities.length + "<br>";
      debugMenu.innerHTML += "Number of colliders: " + level.collidable.length + "<br>";
      debugMenu.innerHTML += "Player ship HP: " + playerShip.getHealth() + "<br>";
      debugMenu.innerHTML += "Player ship dead: " + playerShip.dead + "<br>";
      debugMenu.innerHTML += "Frame: " + now.toFixed() + "<br>";
    }
    // -------- DEBUG END -------- //
  }





// ==================================== //
//   _    _           _       _         //
//  | |  | |         | |     | |        //
//  | |  | |_ __   __| | __ _| |_ ___   //
//  | |  | | '_ \ / _` |/ _` | __/ _ \  //
//  | |__| | |_) | (_| | (_| | ||  __/  //
//   \____/| .__/ \__,_|\__,_|\__\___|  //
//         |_|                          //
// ==================================== //

  function update(dt) {

    var i, j, deads, ent;

    // Player movement
    if (playerShip.move === "left") {
      playerShip.x -= playerShip.maxVelocity;
      playerShip.sprite.index = 0;
    } else if (!playerShip.move) {
      playerShip.sprite.index = 1;
    } else if (playerShip.move === "right") {
      playerShip.x += playerShip.maxVelocity;
      playerShip.sprite.index = 2;
    }

    // I feel like this should be just a tiny bit seperate from movement :P
    if (playerShip.x < 0) { playerShip.x = 0; }
    if (playerShip.x > (31 - playerShip.sprite.w)) { playerShip.x = 31 - playerShip.sprite.w; }

    // Trigger emitters
    for (i = 0; i < level.emitters.length; i++) {
      level.emitters[i].emit(level);
    }

    // Entity movement
    i = level.entities.length;
    while (i--) {
      ent = level.entities[i];
      ent.y += ent.vy;
      // If the entity is off screen, remove
      if (ent.y < -ent.sprite.h || ent.y > gridSizeY + ent.sprite.h ||
          ent.x < -ent.sprite.w || ent.x > gridSizeX + ent.sprite.w) {
        level.entities.splice(i, 1);
        level.collidable.splice(level.collidable.indexOf(ent), 1);
      }
    }



    // Collision checking
    for (i = 0; i < level.collidable.length; i++) {
      var obj1 = level.collidable[i];
      for (j = 0; j < level.collidable.length; j++) {
        var obj2 = level.collidable[j];
        // If object not colliding with its self
        if (obj1 !== obj2
            && !(obj1.name === "bullet" && obj1.vy < 0 && obj2.name === "player")
            && !(obj2.name === "bullet" && obj2.vy < 0 && obj1.name === "player")
            && checkCollision(obj1, obj2)) {
          if (!obj1.pixelMap) { createPixelMap(obj1); }
          if (!obj2.pixelMap) { createPixelMap(obj2); }
          if (checkPixelCollision(offsetPixelMap(obj1), offsetPixelMap(obj2))) {

            // Lower HP of things that collided
            obj1.hpLost();
            obj2.hpLost();

            // Remove dead things from the collidable list
            i = level.collidable.length;
            while (i--) {
              ent = level.collidable[i];
              if (ent.dead) { level.collidable.splice(i, 1); }
            }
          }
        }
      }
    }

    // Remove dead entities (you already can't collide with them since the collision check)
    for (i = 0; i < level.entities.length; i++) {
      if (level.entities[i].dead) { level.entities.splice(i, 1); }
    }

  }

// =================================================== //
//    _____                      _                     //
//   / ____|                    | |                    //
//  | |  __  __ _ _ __ ___   ___| | ___   ___  _ __    //
//  | | |_ |/ _` | '_ ` _ \ / _ \ |/ _ \ / _ \| '_ \   //
//  | |__| | (_| | | | | | |  __/ | (_) | (_) | |_) |  //
//   \_____|\__,_|_| |_| |_|\___|_|\___/ \___/| .__/   //
//                                            |_|      //
// =================================================== //
  function gameLoop() {

    now = window.performance.now();
    dt = Math.min(1000, (now - last));  // duration in mili-seconds

    render(dt);

    while (dt > step) {
      dt -= step;

      // ----- INPUT HANDLING ------ //
      if (keys.left && !keys.right) {
        playerShip.move = "left";
      } else {
        if (!keys.left && keys.right) {
          playerShip.move = "right";
        } else {
          playerShip.move = false;
        }
      }

      if (keys.space) {
        for (i = 0; i < playerShip.weapons.length; i++) {
          //console.log(playerShip.weapons);
          playerShip.weapons[i].emitter.emit(level);
        }
      }

      if (keys.r) { // Respawn the ship
        if (playerShip.dead) {
          for (i = 0; i < playerShip.maxHealth; i++) { delete playerShip.hp[i].lost; }
          level.collidable.push(playerShip);
          playerShip.dead = false;
        }
      }
      // --- INPUT HANDLING END ---- //

      update(dt);
    }

    if (meter) { meter.tick(); }  // FPS Meter tick finish

    last = now;
    window.requestAnimationFrame(gameLoop);
  }

// =================================================== //
//   _   _                _____                        //
//  | \ | |              / ____|                       //
//  |  \| | _____      _| |  __  __ _ _ __ ___   ___   //
//  | . ` |/ _ \ \ /\ / / | |_ |/ _` | '_ ` _ \ / _ \  //
//  | |\  |  __/\ V  V /| |__| | (_| | | | | | |  __/  //
//  |_| \_|\___| \_/\_/  \_____|\__,_|_| |_| |_|\___|  //
//                                                     //
// =================================================== //
  function newGame(levelID) {
    // Clear old stuff
    //  - Old collidable list, rocks, etc.

    // Create new level
    switch (levelID) {
    case "level1":

      playerShip = new Ship({
        name: "player",
        x: gridSizeX / 2 - bigShip.w / 2,
        y: gridSizeY - bigShip.h - 2,
        primaryColor: "rgba(80,80,0,0.7)",
        secondaryColor: "rgba(0,235,230,0.5)"
      }, bigShip);
      level.collidable.push(playerShip);

      var rockSpawner = new Emitter({
        x: 0, y: -4,
        emitX: [0, gridSizeX - mediumRock.w],
        emittedObj: mediumRock,
        spawnInto: level,
        cooldown: 1000
      }, mediumRock);
      //level.emitters.push(rockSpawner);

      break;

    default:
      throw new Error ("Tried to load unknown level.");
    }
    gameLoop();
  }

  newGame("level1");

  console.log(playerShip);

}

window.onload = function () { resize(); play31(); toggleDebug(); };
