/*jslint plusplus: true, browser: true, devel: true, node: true, unparam: true, vars: true, white: true*/
'use strict';

var ctx, cSize;

function SmallShip() {

  this.spriteSheet = new Image();
  this.spriteSheet.src = "../smallShipSprite.png";
  this.width = 5;
  this.height = 10;
  this.index = 0;
  this.weapons = {};
  this.maxHealth = 2;
}

function Ship(options) {
  // Inherit from the ship model
  this.model = options.model || "smallShip";
  switch(this.model) {
    case "smallShip": SmallShip.call(this); break;
    default: console.log("Unknown ship model!!!!");
  }

  // Properties for all ships
  this.x = options.x || 1;
  this.y = options.y || 1;
  this.vx = options.vx || 0;
  this.vy = options.vy || 0;

  this.draw = function() {
    ctx.drawImage(
      this.image,               // Spritesheet
      this.width * this.index,  // SourceX (Position of frame)
      0,                        // SourceY
      this.width,               // SourceW (Size of frame)
      this.height,              // SourceH
      this.x * cSize,           // DestinationX (Position on canvas)
      this.y * cSize,           // DestinationY
      this.width * cSize,       // DestinationW (Size on canvas)
      this.height * cSize       // DestinationH
    );
  };
}



var player = new Ship({});
console.log(player);
