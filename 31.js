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
 * Creates a map of all of the visible pixels in the object. Effectively draws the objects sprite
 * onto a hidden canvas with no scaling, and then checks each pixel, top to bottom (similar to how
 * text is read along and then down a line) If a pixel is fully transparent, i.e. rgba(-,-,-,0),
 * it adds that pixels x, y coordinates as an object to the pixelMap array. Also offsets the those
 * coordinates in the pixel map to align with the sprites current position in the "real" game canvas.
 *
 * @todo Make this decription shorter and easier to understand :D
 * @todo Consider calling this function only once per sprite, rather than every time for both
 *       sprites that might be colliding.
 * @todo Consider passing this function only relevant info about the object rather than the whole thing.
 *
 * @param   {Object}  obj The object with the sprite to look at, e.g. a spaceship or a space rock.
 * @returns {[array]} An array of objects containing x, y coordinates.
 */
function createPixelMap(obj) {
  var pixelMap = [], x, y, i;
  var ctxCollision = canvasCollision.getContext('2d');
  ctxCollision.clearRect(0, 0, gridSizeX, gridSizeY);  // Clear space to draw sprites
  ctxCollision.drawImage(
    obj.spriteSheet,
    obj.spriteX + obj.width * obj.index,  // SourceX (Position of frame)
    obj.spriteY,                          // SourceY
    obj.width,                            // SourceW (Size of frame)
    obj.height,                           // SourceH
    0,                                    // DestinationX (Position on canvas)
    0,                                    // DestinationY
    obj.width,                            // DestinationW (Size on canvas)
    obj.height                            // DestinationH
  );
  for(y = 0; y < obj.height; y++) {
    for(x = 0; x < obj.width; x++) {
    // Fetch pixel at current position
      var pixel = ctxCollision.getImageData(x, y, 1, 1);
      // Check that opacity is above zero
      if(pixel.data[3] !== 0) {
        pixelMap.push({x: x, y: y});
      }
    }
  }
  // Add the x and y offset of the object in the game to the pixel map
  for (i = 0; i < pixelMap.length; i++) {
    pixelMap[i].x += Math.round(obj.x);
    pixelMap[i].y += Math.round(obj.y);
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
      r1 = Math.round(obj1.x + obj1.width),
      b1 = Math.round(obj1.y + obj1.height),
      l1 = Math.round(obj1.x),
      t2 = Math.round(obj2.y),
      r2 = Math.round(obj2.x + obj2.width),
      b2 = Math.round(obj2.y + obj2.height),
      l2 = Math.round(obj2.x),
      obj1PixelMap,
      obj2PixelMap,
      obj1i, obj2i;

  // Bounding box collisions
  if (t1 >= b2) {return false;}
  if (r1 <= l2) {return false;}
  if (b1 <= t2) {return false;}
  if (l1 >= r2) {return false;}
  // It got to here so bounding boxes are colliding!

  // Per pixel collisions
  obj1PixelMap = createPixelMap(obj1);
  obj2PixelMap = createPixelMap(obj2);
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

// Need to have the types of entity before the constuctor (Grrrr JSLint)
function SmallShip() {
  this.spriteSheet = mainSprites;
  this.spriteX = 0;    // Position of the sprite in the sheet
  this.spriteY = 3;
  this.width = 5;      // Width/Height of the Frame
  this.height = 6;
  this.index = 1;      // Current frame of the sheet
  this.weapons = [
    {x: 2, y: 1, tiltOffsetL: -1, tiltOffsetR: 1, type: false}
  ];
  this.hp = [
    {x: 2, y: 2, tiltOffsetL: -1, tiltOffsetR:  1},
    {x: 2, y: 3, tiltOffsetL: -1, tiltOffsetR:  1}
  ];
  this.maxVelocity = 0.5;
}
function BigShip() {
  this.spriteSheet = mainSprites;
  this.spriteX = 16;    // Position of the sprite in the sheet
  this.spriteY = 0;
  this.width = 9;      // Width/Height of the Frame
  this.height = 9;
  this.index = 1;      // Current frame of the sheet
  this.weapons = [
    {x: 1, y: 6, tiltOffsetL: 0, tiltOffsetR: 0, type: false},
    {x: 2, y: 7, tiltOffsetL: 0, tiltOffsetR: 0, type: false}
  ];
  this.hp = [
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
function SmallGun() {
  this.spriteSheet = mainSprites;
  this.spriteX = 56;   // Position of the sprite in the sheet
  this.spriteY = 4;
  this.width = 1;      // Width/Height of the Frame
  this.height = 3;
  this.maxVelocity = 2;  // Dunno if we need this but set high just in case it would slow ship
  this.hp = [];  // Not sure if this actually needs to be set
  this.cooldown = 1;
}
function BigGun() {
  this.spriteSheet = mainSprites;
  this.spriteX = 56;   // Position of the sprite in the sheet
  this.spriteY = 3;
  this.width = 1;      // Width/Height of the Frame
  this.height = 4;
  this.maxVelocity = 2;
  this.hp = [];  // Not sure if this actually needs to be set
  this.cooldown = 2;
}
function Bullet() {
  this.spriteSheet = mainSprites;
  this.spriteX = 58;
  this.spriteY = 3;
  this.width = 1;
  this.height = 2;
  this.maxVelocity = 0.5;
  this.hp = [];
}
function MediumRock() {
  this.spriteSheet = mainSprites;
  this.spriteX = 51;   // Position of the sprite in the sheet
  this.spriteY = 3;
  this.width = 4;      // Width/Height of the Frame
  this.height = 4;
  this.maxVelocity = 0.25;
  this.hp = [];  // Not sure if this actually needs to be set
}



// General entity constuctor function
function Entity(options) {
  var i;
  // Inherit from the correct object type
  this.type = options.type || "smallShip";
  switch(this.type) {
    case "smallShip": SmallShip.call(this); break;
    case "bigShip": BigShip.call(this); break;
    case "smallGun": SmallGun.call(this); break;
    case "mediumRock": MediumRock.call(this); break;
    default: throw new Error ("Tried to load unknown object: " + this.type);
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
    if (!lostHp) {  // Been hit after running out of HP so deaded
      this.dead = true;
      if (debug) { console.log(this.type + " Dead at X: " + this.x + " Y: " + this.y); }
    }
  };

  this.hpRestore = function() {
    var restoredHp;
    for (i = 0; i < this.maxHealth; i++) {
      if (this.hp[i].lost && !restoredHp) { delete this.hp[i].lost; restoredHp = true; }
    }
  };

  // Properties for all objects go here
  this.x = options.x || Math.round(gridSizeX / 2) - Math.round(this.width / 2);
  this.y = options.y || gridSizeY - this.height - 1;
  this.vx = options.vx || 0;
  this.vy = options.vy || 0;
  this.index = options.index || 0;
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
    //canvasPri = document.createElement('canvas');
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



/**
 * Emitter object that emits other Entities, can be 'attatched' to an entity (weapon for example)
 * @param {Object} options (All the options for the emitter)
 */
function Emitter(options) {

  Entity.call(this, options);

  this.spawnInto = options.spawnInto;      // Where the emitter is being put (level object)
  this.attachedTo = options.attachedTo || false; // Can set a parent object for the emitter

  this.emittedType = options.emittedType;  // Emitted entity (can be array)
  this.emitX = options.emitX || [0, 0];    // RELATIVE Position of the spawned entity (array: [min, max])
  this.emitY = options.emitY || 0;
  this.start = options.start || 0;         // When to start emitting
  this.duration = options.duration || -1;  // How long to emit for (-1 = forever)
  this.enable = options.enable || true;    // Toggle emission
  this.cooldown = options.cooldown || 1000;// Delay between emissions (in ms)
  this.lasEmitted = 0;                     // Store when the last object was emitted for timing

  /*
  // Additions to make work with weapons hopefully:
  this.direction = options.direction || 'D'; // "Down"
  this.spriteSheet = mainSprites;
  this.spriteX = 51;   // Position of the sprite in the sheet
  this.spriteY = 3;
  this.width = 4;      // Width/Height of the Frame
  this.height = 4;
  */

  this.emit = function() {
    if (now - this.lasEmitted > this.cooldown && now > this.start && (now < this.start + this.duration || this.duration === -1)) {
      var e = new Entity({
        type: this.emittedType,
        x: Math.floor(this.emitX[0] + Math.random() * (this.emitX[1] - this.emitX[0])),
        y: this.y
      });
      this.spawnInto.rocks.push(e);
      this.spawnInto.collidable.push(e);
      this.lasEmitted = now;
    }
  };

  this.draw = function(ctx) {
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
  };
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
      rockEmitter,
      i, j,
      level = {     // Data about the level
        rocks: [],
        enemies: [],
        collidable: [], // All things that collide
        emmitters: [], // Entity emitters
        background: "Pink!"
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

    // Draw space rocks
    for (i = 0; i < level.rocks.length; i++) {
      level.rocks[i].draw(ctx);
    }

    playerShip.draw(ctx);

    rockEmitter.draw(ctx);

    playerShip.weapons[0].draw(ctx);


    // ------- DEBUG INFO -------- //
    if (debug) {
      debugMenu.innerHTML = "";
      debugMenu.innerHTML += "Input: " + JSON.stringify(keys) + "<br>";
      debugMenu.innerHTML += "Player ship direction: " + playerShip.move + "<br>";
      debugMenu.innerHTML += "Player ship HP: " + playerShip.getHealth() + "<br>";
      debugMenu.innerHTML += "Player ship dead: " + playerShip.dead + "<br>";
      debugMenu.innerHTML += "Number of emitters: " + level.emmitters.length + "<br>";
      debugMenu.innerHTML += "Number of space rocks: " + level.rocks.length + "<br>";
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

    var i, j, deads;

    // Switching ships for testing. Ship only actually have to be changed at the start of the
    // level rather than on the fly like this.
    if (keys.one) {
      if (level.collidable.indexOf(playerShip) >= 0) {
        level.collidable.splice(level.collidable.indexOf(playerShip), 1);
      }
      playerShip = new Entity({
        type: "smallShip",
        primaryColor: "rgba(0,235,230,0.5)",
        secondaryColor: "rgba(80,50,255,0.5)"
      });
    }

    if (keys.two) {
      if (level.collidable.indexOf(playerShip) >= 0) {
        level.collidable.splice(level.collidable.indexOf(playerShip), 1);
      }
      playerShip = new Entity({
        type: "bigShip",
        primaryColor: "rgba(80,80,0,0.7)",
        secondaryColor: "rgba(0,235,230,0.5)"
      });
      level.collidable.push(playerShip);
    }

    // Testing up/down movement for "going off top of screen" because looks cool
    // Minus and plusses look wrong way around but remember 1,1 is top left!
    if (playerShip.move === "up") { playerShip.y -= playerShip.maxVelocity; }
    if (playerShip.move === "down") { playerShip.y += playerShip.maxVelocity; }

    // hitpoints / hp / health debugging
    if (keys.three) { delete keys.three; playerShip.hpLost(); }
    if (keys.four) { delete keys.four; playerShip.hpRestore(); }



    // Trigger emitters
    for (i = 0; i < level.emmitters.length; i++) {
      level.emmitters[i].emit();
    }



    // Rock movement
    i = level.rocks.length;
    while (i--) {
      var ent = level.rocks[i];
      ent.y += ent.maxVelocity;
      // If the rock is off the bottom + height, remove
      if (ent.y > gridSizeY + ent.height) {
        level.rocks.splice(level.rocks[i], 1);
        level.collidable.splice(level.collidable.indexOf(ent), 1);
      }
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



    // Collision checking
    for (i = 0; i < level.collidable.length; i++) {
      var obj1 = level.collidable[i];
      for (j = 0; j < level.collidable.length; j++) {
        var obj2 = level.collidable[j];
        // If object not colliding with its self
        if (obj1 !== obj2 && checkCollision(obj1, obj2)) {
          if (debug) { console.log(now.toFixed() + " " + obj1.type + " colliding with " + obj2.type); }
          obj1.hpLost();
          obj2.hpLost();
          // Remove dead things from the collidable list:
          // This fucks up when ship respawned and not sure why, replaced with for loop that works but slower.
          //if (obj1.dead) { level.collidable.splice(i, 1); }
          //if (obj2.dead) { level.collidable.splice(j, 1); }
          for (deads = 0; deads < level.collidable.length; deads++) {
            if (level.collidable[deads].dead) { level.collidable.splice(deads, 1); }
          }
        }
      }
    }

    // Remove dead rocks (you already can't collide with them since the collision check)
    for (i = 0; i < level.rocks.length; i++) {
      if (level.rocks[i].dead) { level.rocks.splice(i, 1); }
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

      // Testing up/down movement for "going off top of screen" because looks cool
      if (keys.up) { playerShip.move = "up"; }
      if (keys.down) { playerShip.move = "down"; }

      // Flip this ship!
      if (keys.space) {
        playerShip.flip = true;
      } else { playerShip.flip = false; }
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
      // TODO: level = new Level (and add a nice constructor class)?
      playerShip = new Entity({
        type: "smallShip",
        primaryColor: "rgba(80,80,0,0.7)",
        secondaryColor: "rgba(0,235,230,0.5)"
      });
      level.collidable.push(playerShip);

      playerShip.weapons[0] = new Emitter({
        attatchedTo: playerShip,
        type: "smallGun"
      });

      rockEmitter = new Emitter(
        {
          spawnInto: level,
          emitX: [3, 25],
          index: 1,
          X: 11,
          y: 5,
          emittedType: "mediumRock",
          start: 0,
          duration: -1
        }
      );
      level.emmitters.push(rockEmitter);
      break;

    case "level2":
      playerShip = new Entity({
        type: "bigShip",
        x: 13,
        y: 20,
        primaryColor: "rgba(80,80,0,0.7)",
        secondaryColor: "rgba(0,235,230,0.5)"
      });
      level.collidable.push(playerShip);
      break;

    default:
      throw new Error ("Tried to load unknown level.");
    }
    console.log(level.emmitters[0]);
    gameLoop();
  }

  newGame("level1");

}

window.onload = function () { resize(); play31(); toggleDebug(); };
