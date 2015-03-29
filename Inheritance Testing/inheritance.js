/*jslint plusplus: true, browser: true, devel: true, node: true, unparam: true, vars: true, white: true*/
'use strict';

var canvas = document.getElementById("bigCanvas"),
    ctx = canvas.getContext("2d"),
    cSize = 20;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

ctx.mozImageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;

ctx.fillStyle = "grey";
ctx.fillRect(0, 0, canvas.width, canvas.height);

var mainSprites = new Image();
mainSprites.src = "../spriteSheet.png";


// Base entity class
function Entity(options) {
  this.x = options.x || 0;
  this.y = options.y || 0;

  this.sprite = options.type || {
    source: mainSprites,
    index: 0,
    x: options.sprite.x || 0,
    y: options.sprite.y || 0,
    w: options.sprite.w || 0,
    h: options.sprite.h || 0
  };

  this.draw = function() {
    console.log("Drawing");
    ctx.drawImage(
      mainSprites,
      this.sprite.x,
      this.sprite.y,
      this.sprite.w,
      this.sprite.h,
      this.x * cSize,
      this.y * cSize,
      this.sprite.w * cSize,
      this.sprite.h * cSize);
  };
}

// Ship sup class
function Ship(options) {
  Entity.call(this, options);
  this.weapons = [];
}


// Object types
var smallShip = {
  source: mainSprites,
  x: 0,
  y: 3,
  w: 5,
  h: 10,
  index: 1
};
var smallRock = {
  source: mainSprites,
  x: 51,
  y: 3,
  w: 4,
  h: 4,
  index: 0
};


// Emitter class
function Emitter(options) {
  Entity.call(this, options);

  this.emittedObj = options.emittedObj;
  this.emitX = options.emitX || [0,0];
  this.emitY = options.emitY || [0,0];
  this.emitDir = options.emitDir || "u";

  this.emitting = true;
  this.cooldown = options.coolDown || 1000;
  this.lastEmitted = 0;
  this.start = options.start || 0;
  this.end = options.end || -1;
  this.attatchedTo = options.attatchedTo || false;

  this.emit = function() {
    console.log("Emitting " + this.emittedObj + " at " + this.emitX + " " + this.emitY);
  };
}



var emitShip = new Emitter({
  x: 5,
  y: 10,
  emittedObj: smallRock,
  type: smallShip
});

window.onload = function() {
  console.log(emitShip);
  emitShip.draw();
  emitShip.emit();
};
