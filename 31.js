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
    case  76: keys.l     = true; break;
    case  80: keys.p     = true; break;
    case  82: keys.r     = true; break;
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
  var x, y, mI = obj.sprite.index;  // mI is map index
  var ctxCollision = canvasCollision.getContext('2d');
  if (!obj.pixelMap) { obj.pixelMap = []; }
  obj.pixelMap[mI] = [];
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
        obj.pixelMap[mI].push({x: x, y: y});
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
      pixelMap = JSON.parse(JSON.stringify(obj.pixelMap[obj.sprite.index])); // Reference bye bye
  for (i = 0; i < pixelMap.length; i++) {
    pixelMap[i].x = obj.pixelMap[obj.sprite.index][i].x + Math.round(obj.x);
    pixelMap[i].y = obj.pixelMap[obj.sprite.index][i].y + Math.round(obj.y);
  }
  return pixelMap;
}



/**
 * Checks if two objects have sprites with colliding hitboxes (squares of object h/w).
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

/**
 * Checks if two pixel maps both have a pixel with the same coordinates.
 *
 * @param   {Object}  obj1PixelMap [[Description]]
 * @param   {Object}  obj2PixelMap [[Description]]
 * @returns {Boolean} True if found 2 pixels with same coordinates.
 */
function checkPixelCollision(obj1PixelMap, obj2PixelMap) {
  var obj1i, obj2i;
  for (obj1i = 0; obj1i < obj1PixelMap.length; obj1i++) {
    for (obj2i = 0; obj2i < obj2PixelMap.length; obj2i++) {
      if (obj1PixelMap[obj1i].x === obj2PixelMap[obj2i].x &&
          obj1PixelMap[obj1i].y === obj2PixelMap[obj2i].y) {
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
function Entity(options) {
  var i;

  this.name = options.name || this.name || "Entity"; // For debugging

  this.x = options.x || this.x || 0;
  this.y = options.y || this.y || 0;
  this.vx = options.vx || this.vx || 0;
  this.vy = options.vy || this.vy || 0;

  this.sprite = this.sprite || {};
  this.sprite.index = this.sprite.index || 0;

  this.maxVelocity = options.maxVelocity || this.maxVelocity || 1;

  this.hp = this.hp || [];
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
function Emitter(options) {
  Entity.call(this, options);

  if (!options.emittedObj) { throw new Error ("Tried to create emitter without something to emit."); }
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
      var e = Object.create(this.emittedObj);
      e.x = this.x + Math.floor(this.emitX[0] + Math.random() * (this.emitX[1] - this.emitX[0]));
      e.y = this.y;
      e.vx = newVX;
      e.vy = newVY;
      //console.log(e);
      //console.log(spawnInto);
      spawnInto.entities.push(e);
      spawnInto.collidable.push(e);
      this.lastEmission = now;
    }
  };
}



// Ship sub-class
function Ship(options) {

  var i;

  Entity.call(this, options);

  // Initial position for player ship:
  if (this.name === "player" && !this.x && !this.y) { // !this.x == true if this.x == 0;
    this.x = Math.round(gridSizeX / 2) - Math.round(this.sprite.w / 2);
    this.y = gridSizeY - this.sprite.h - 2;
  }
  
  // Initial position for enemy ship:
  if (this.name === "enemy" && !this.x && !this.y) { // !this.x == true if this.x == 0;
    this.x = Math.round(gridSizeX / 2) - Math.round(this.sprite.w / 2);
    this.y = 2;
  }

  for (i = 0; i < this.weapons.length; i++) {
    var weap = new Emitter({
      x: this.x + this.weapons[i].x,
      y: this.y + this.weapons[i].y,
      emittedObj: this.weapons[i].type.ammo,
      emitDir: 'u',
      cooldown: this.weapons[i].type.cooldown
    });
    this.weapons[i].emitter = weap;
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
        this.weapons[i].type.sprite.x,                         // SourceX (Position of frame)
        this.weapons[i].type.sprite.y,                         // SourceY
        this.weapons[i].type.sprite.w,                         // SourceW (Size of frame)
        this.weapons[i].type.sprite.h,                         // SourceH
        Math.round(this.x + this.weapons[i].x + tilt) * cSize, // DestinationX (Position on canvas)
        Math.round(this.y + this.weapons[i].y) * cSize,        // DestinationY
        this.weapons[i].type.sprite.w * cSize,                 // DestinationW (Size on canvas)
        this.weapons[i].type.sprite.h * cSize                  // DestinationH
      );
    }

    // Draw ship hull (primary colour)
    context.drawImage(
      canvasPri,
      this.sprite.x + this.sprite.index * this.sprite.w,// SourceX (Frame pos)
      this.sprite.y,                                    // SourceY
      this.sprite.w,                                    // SourceW (Frame size)
      this.sprite.h,                                    // SourceH
      Math.round(this.x) * cSize,                       // DestinationX (Position on canvas)
      Math.round(this.y) * cSize,                       // DestinationY (Rounded to grid)
      this.sprite.w * cSize,                            // DestinationW (Size on canvas)
      this.sprite.h * cSize                             // DestinationH
    );

    // Draw cockpit (secondary colour)
    context.drawImage(
      canvasSec,
      this.sprite.x + this.sprite.index * this.sprite.w,// SourceX (Frame pos)
      this.sprite.y + this.sprite.h,                    // SourceY
      this.sprite.w,                                    // SourceW (Frame size)
      this.sprite.h,                                    // SourceH
      Math.round(this.x) * cSize,                       // DestinationX (Position on canvas)
      Math.round(this.y) * cSize,                       // DestinationY (Rounded to grid)
      this.sprite.w * cSize,                            // DestinationW (Size on canvas)
      this.sprite.h * cSize                             // DestinationH
    );

    // Draw engine trails
    context.drawImage(
      this.sprite.source,
      this.sprite.x + this.sprite.w * this.sprite.index,// SourceX (Position of frame)
      this.sprite.y + this.sprite.h * 2,                // SourceY
      this.sprite.w,                                    // SourceW (Size of frame)
      12,          // Max height of engine trails is 12 // SourceH
      Math.round(this.x) * cSize,                       // DestinationX (Position on canvas)
      Math.round(this.y + this.sprite.h - 1) * cSize,   // DestinationY (-1 because goes up in ship hull)
      this.sprite.w * cSize,                            // DestinationW (Size on canvas)
      12 * cSize                                        // DestinationH
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



// Object Types sub-classes
function SmallExplosion(options) {
  this.name = "smallExplosion";
  this.sprite = {
    source: mainSprites,
    x: 64, y: 5,
    w: 3, h: 6,
    frames: 8
  };
  Entity.call(this, options);
}
function MediumExplosion(options) {
  this.name = "mediumExplosion";
  this.sprite = {
    source: mainSprites,
    x: 64, y: 0,
    w: 4, h: 4,
    frames: 7
  };
  Entity.call(this, options);
}
function BigExplosion(options) {
  this.name = "bigExplosion";
  this.sprite = {
    source: mainSprites,
    x: 0, y: 59,
    w: 15, h: 15,
    frames: 9
  };
  Entity.call(this, options);
}
function Bullet(options) {
  this.name = "bullet";
  this.sprite = {
    source: mainSprites,
    x: 58, y: 3,
    w: 1, h: 2
  };
  this.maxVelocity = 1.5;
  this.explosion = SmallExplosion; 
  Entity.call(this, options);
}
function SmallGun(options) {
  this.name = "smallgun";
  this.sprite = {
    source: mainSprites,
    x: 56, y: 4,
    w: 1, h: 3
  };
  this.cooldown = 800;  // ms
  this.ammo = new Bullet({});
}
function BigGun(options) {
  this.name = "bigGun";
  this.sprite = {
    source: mainSprites,
    x: 56, y: 3,
    w: 1, h: 4
  };
  this.cooldown = 400;  // ms
  this.ammo = new Bullet({});
}
function SmallShip(options) {
  this.name = "smallShip";
  this.weapons = [
    {x: 2, y: -1, tiltOffsetL:  1, tiltOffsetR: -1, type: new SmallGun({})}
  ];
  this.hp = [
    {x: 2, y: 2, tiltOffsetL: -1, tiltOffsetR:  1},
    {x: 2, y: 3, tiltOffsetL: -1, tiltOffsetR:  1}
  ];
  this.sprite = {
    source: mainSprites,
    x: 0, y: 3,
    w: 5, h: 6,
    index: 1
  };
  this.maxVelocity = 0.5;
  Ship.call(this, options);
}
function BigShip(options) {
  this.name = "bigShip";
  this.weapons = [
    {x: 1, y: 3, tiltOffsetL:  0, tiltOffsetR:  2, type: new BigGun({})},
    {x: 7, y: 3, tiltOffsetL: -2, tiltOffsetR:  0, type: new BigGun({})}
  ];
  this.hp = [
    {x: 4, y: 3, tiltOffsetL: -2   , tiltOffsetR:  2    },
    {x: 3, y: 4, tiltOffsetL: false, tiltOffsetR:  2    }, // false = not displayed
    {x: 4, y: 4, tiltOffsetL: -2   , tiltOffsetR:  2    },
    {x: 5, y: 4, tiltOffsetL: -2   , tiltOffsetR: false },
    {x: 3, y: 5, tiltOffsetL: false, tiltOffsetR:  2    },
    {x: 4, y: 5, tiltOffsetL: -2   , tiltOffsetR:  2    },
    {x: 5, y: 5, tiltOffsetL: -2   , tiltOffsetR: false },
    {x: 4, y: 6, tiltOffsetL: -2   , tiltOffsetR:  2    }
  ];
  this.sprite = {
    source: mainSprites,
    x: 16, y: 0,
    w: 9, h: 9,
    index: 1
  };
  this.maxVelocity = 0.5;
  this.explosion = BigExplosion;
  Ship.call(this, options);
}
function MediumRock(options) {
  this.name = "mediumRock";
  this.sprite = {
    source: mainSprites,
    x: 51, y: 3,
    w: 4, h: 4
  };
  this.maxVelocity = 0.25;
  this.explosion = MediumExplosion;
  Entity.call(this, options);
}
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
      enemyShip,  // Enemy ship, should be array of enemy shipS?
      level,
      i, j;



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
    //console.log(level);
    for (i = 0; i < level.entities.length; i++) {
      level.entities[i].draw(ctx);
    }

    //rockSpawner.draw(ctx);

    // Draw the ships. Should dead checking be done in .draw? Would be an extra function
    // call which isn't great for performance, but might be neater?
    if (enemyShip && !enemyShip.dead) { enemyShip.draw(ctx); }
    if (playerShip && !playerShip.dead) { playerShip.draw(ctx); }

    // Animate explosions
    i = level.explosions.length;
    while (i--) {
      var boom = level.explosions[i];
      boom.draw(ctx);
      if (!boom.last || now - boom.last > 1000/20) { boom.sprite.index++; boom.last = now; } // 20FPS
      if (boom.sprite.index >= boom.sprite.frames) { level.explosions.splice(i, 1); }
    }

    // ------- DEBUG INFO -------- //
    if (debug) {
      if (keys.l) { console.log(level); delete keys.l; }
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
    playerShip.x += playerShip.vx;
    if (playerShip.x < 0) { playerShip.x = 0; }
    if (playerShip.x > (31 - playerShip.sprite.w)) { playerShip.x = 31 - playerShip.sprite.w; }

    // Trigger emitters
    for (i = 0; i < level.emitters.length; i++) {
      level.emitters[i].emit(level);
    }

    // Entity movement
    for (i = 0; i < level.entities.length; i++) {
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
        // If object isn't being checked against itself, isn't a thing that shouldn't collide
        // with another thing (hmm)... and has a bounding box collision with other object
        if (obj1 !== obj2 &&
            !(obj1.name === "bullet" && obj1.vy < 0 && obj2.name === "player") &&
            !(obj2.name === "bullet" && obj2.vy < 0 && obj1.name === "player") &&
            checkCollision(obj1, obj2)) {
          if (!(obj1.pixelMap && obj1.pixelMap[obj1.sprite.index])) { createPixelMap(obj1); }
          if (!(obj2.pixelMap && obj2.pixelMap[obj2.sprite.index])) { createPixelMap(obj2); }
          if (checkPixelCollision(offsetPixelMap(obj1), offsetPixelMap(obj2))) {

            // Lower HP of things that collided
            obj1.hpLost();
            obj2.hpLost();

            // Remove dead things from the collidable list
            i = level.collidable.length;
            while (i--) {
              ent = level.collidable[i];
              if (ent.dead) {
                if (ent.explosion) {
                  var boom = new ent.explosion({});
                  // All the widths/2 just help center the explosion
                  boom.x = ent.x + ent.sprite.w / 2 - boom.sprite.w / 2;
                  boom.y = ent.y + ent.sprite.h / 2 - boom.sprite.h / 2;
                  level.explosions.push(boom);
                }
                level.collidable.splice(i, 1);
              }
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
        playerShip.vx = -playerShip.maxVelocity;
        playerShip.sprite.index = 0;
      } else if (!keys.left && keys.right) {
        playerShip.vx = playerShip.maxVelocity;
        playerShip.sprite.index = 2;
      } else {
        playerShip.vx = 0;
        playerShip.sprite.index = 1;
      }

      if (keys.space) { // Fire ze weapons. Todo: more weapon keys?
        for (i = 0; i < playerShip.weapons.length; i++) {
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
    
    // Switching to new levels hmm this is messy
    var loop = true; // Are you gonn' keep looping? 
    if (keys.one) {
      loop = false;
      keys.one = false;
      newGame("level1");
    }
    if (keys.two) {
      loop = false;
      keys.two = false;
      newGame("level2");
    }
    if (loop) { window.requestAnimationFrame(gameLoop); }
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
    level = {     // Data about the level
        entities: [],
        emitters: [],
        collidable: [],
        explosions: [],
        id: ''
      };
    enemyShip = false;
    
    // Create new level
    switch (levelID) {
    case "level1":
      level.id = levelID;
      playerShip = new BigShip({
        name: "player",
        primaryColor: "rgba(80,80,0,0.7)",
        secondaryColor: "rgba(0,235,230,0.5)"
      });
      level.collidable.push(playerShip);

      var rockSpawner = new Emitter({
        x: 0, y: -4,
        emitX: [0, gridSizeX - 4],
        emittedObj: new MediumRock({}),
        spawnInto: level,
        cooldown: 1000
      });
      level.emitters.push(rockSpawner);

      break;

    case "level2":
      level.id = levelID;
      playerShip = new SmallShip({
        name: "player",
        primaryColor: "rgba(80,80,0,0.7)",
        secondaryColor: "rgba(0,235,230,0.5)"
      });
      level.collidable.push(playerShip);

      enemyShip = new BigShip({
        name: "enemy"
      });
      level.collidable.push(enemyShip);
        
      break;
        
    default:
      throw new Error ("Tried to load unknown level.");
    }
    
    gameLoop();
  }

  newGame("level1");

}

window.onload = function () { resize(); play31(); toggleDebug(); };
