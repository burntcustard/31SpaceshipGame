/*jslint plusplus: true, browser: true, devel: true, node: true, unparam: true, vars: true, white: true*/
'use strict';

var canvas = document.getElementById("bigCanvas"),
    ctx = canvas.getContext("2d"),
    cSize = 20,
    now,
    dt,
    step = 1000 / 60,
    last;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

ctx.mozImageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;

ctx.fillStyle = "grey";
ctx.fillRect(0, 0, canvas.width, canvas.height);

var mainSprites = new Image();
mainSprites.src = "../spriteSheet.png";


// Entity super class
function ScaleEntity(options) {
  var i;

  this.name = options.name || this.name || "Entity"; // For debugging

  this.x = options.x || this.x || 0;
  this.y = options.y || this.y || 0;
  this.vx = options.vx || this.vx || 0;
  this.vy = options.vy || this.vy || 0;

  this.sprite = this.sprite || options.sprite || {};
  this.sprite.index = this.sprite.index || 0;

  this.maxVelocity = options.maxVelocity || this.maxVelocity || 100;

  this.hp = this.hp || [];
  this.maxHealth = this.hp.length;
  this.dead = false;

  this.move = function() {
    this.x += this.vx;
    this.y += this.vy;
  };

  this.draw = options.draw || function(ctx) {
    ctx.drawImage(
      this.sprite.source,
      this.sprite.x + this.sprite.index * this.sprite.w, // SourceX (Frame pos)
      this.sprite.y,                                     // SourceY
      this.sprite.w,                                     // SourceW (Frame size)
      this.sprite.h,                                     // SourceH
      Math.round(this.x / 100) * cSize,                  // DestinationX (Position on canvas)
      Math.round(this.y / 100) * cSize,                  // DestinationY (Rounded to grid)
      this.sprite.w * cSize,                             // DestinationW (Size on canvas)
      this.sprite.h * cSize);                            // DestinationH
  };
}

function FloatEntity(options) {
  ScaleEntity.call(this, options);

  this.draw = options.draw || function(ctx) {
    ctx.drawImage(
      this.sprite.source,
      this.sprite.x + this.sprite.index * this.sprite.w, // SourceX (Frame pos)
      this.sprite.y,                                     // SourceY
      this.sprite.w,                                     // SourceW (Frame size)
      this.sprite.h,                                     // SourceH
      Math.round(this.x) * cSize,                  // DestinationX (Position on canvas)
      Math.round(this.y) * cSize,                  // DestinationY (Rounded to grid)
      this.sprite.w * cSize,                             // DestinationW (Size on canvas)
      this.sprite.h * cSize);                            // DestinationH
  };
}

function ScaleMediumRock(options) {
  this.name = "mediumRock";
  this.vy = 101;
  this.sprite = {
    source: mainSprites,
    x: 51, y: 3,
    w: 4, h: 4
  };
  this.maxVelocity = 25;
  ScaleEntity.call(this, options);
}

function FloatMediumRock(options) {
  this.name = "mediumRock";
  this.vy = 1.01;
  this.sprite = {
    source: mainSprites,
    x: 51, y: 3,
    w: 4, h: 4
  };
  this.maxVelocity = 25;
  FloatEntity.call(this, options);
}



var scaleRocks = [];
scaleRocks[0] = new ScaleMediumRock({
});
scaleRocks[1] = new ScaleMediumRock({
  x: 400
});
scaleRocks[2] = new ScaleMediumRock({
  x: 800
});
scaleRocks[3] = new ScaleMediumRock({
  x: 1200
});

var floatRocks = [];
floatRocks[0] = new FloatMediumRock({
  x: 18
});
floatRocks[1] = new FloatMediumRock({
  x: 22
});
floatRocks[2] = new FloatMediumRock({
  x: 26
});
floatRocks[3] = new FloatMediumRock({
  x: 30
});



function gameLoop() {

  var i;

  now = window.performance.now();
  dt = Math.min(50, (now - last));

  ctx.fillStyle = "grey";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (i = 0; i < scaleRocks.length; i++) {
    scaleRocks[i].draw(ctx);
  }
  for (i = 0; i < floatRocks.length; i++) {
    floatRocks[i].draw(ctx);
  }

  while (dt > step) {
    dt -= step;

    for (i = 0; i < scaleRocks.length; i++) {
      scaleRocks[i].move();
      if (scaleRocks[i].y > 2000) {
        scaleRocks[i].y = 0;
      }
    }
    for (i = 0; i < floatRocks.length; i++) {
      floatRocks[i].move();
      if (floatRocks[i].y > 20) {
        floatRocks[i].y = 0;
      }
    }
    console.log(scaleRocks[0].y);
    console.log(floatRocks[0].y);

  }

  last = now;
  window.requestAnimationFrame(gameLoop);
}



window.onload = function() { gameLoop(); };
