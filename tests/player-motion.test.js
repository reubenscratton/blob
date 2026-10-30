import test from 'node:test';
import assert from 'node:assert/strict';
import {PlayerMotion} from '../src/PlayerMotion.js';

test('movement is horizontal, stationary without input, and bounded', () => {
  const motion=new PlayerMotion();
  motion.update(.05,0); assert.equal(motion.x,0);
  motion.update(.05,1); assert.equal(motion.x,.8); assert.equal(motion.y,0);
  for(let i=0;i<200;i++) motion.update(.05,1);
  assert.equal(motion.x,22); assert.equal(motion.distance,0);
  for(let i=0;i<400;i++) motion.update(.05,-1);
  assert.equal(motion.x,-22); assert.equal(motion.y,0);
});

test('reversal pivots smoothly through 180 degrees before walking', () => {
  const motion=new PlayerMotion();
  const start=motion.angle;
  motion.update(.09,-1);
  assert.equal(motion.x,0);
  assert.ok(Math.abs(Math.abs(motion.angle-start)-Math.PI/2)<1e-12);
  motion.update(.09,-1);
  assert.ok(Math.abs(Math.abs(motion.angle-start)-Math.PI)<1e-12);
  assert.ok(motion.x<0);
  motion.update(.05,1);
  const halfway=motion.angle;
  motion.update(.01,-1);
  assert.ok(Math.abs(motion.angle-halfway)<.1, 'rapid reversal stays continuous');
  motion.reset(); assert.equal(motion.x,0); assert.equal(motion.direction,1);
});

test('jump reaches its specified apex, keeps air control, and lands exactly', () => {
  const motion=new PlayerMotion();
  motion.jumpHeight=5.6;
  motion.update(.25,1,true);
  assert.equal(motion.airborne,true); assert.equal(motion.x,4);
  motion.update(.25,-1,true); // A second press in the air cannot restart the arc.
  assert.equal(motion.y,5.6); assert.equal(motion.x,0);
  motion.update(.25,0); assert.ok(motion.y>0 && motion.y<5.6);
  motion.update(.25,0); assert.equal(motion.y,0); assert.equal(motion.airborne,false);
  motion.update(.1,0,true); assert.equal(motion.airborne,true);
  motion.reset(); assert.equal(motion.y,0); assert.equal(motion.airborne,false);
});

test('start-room ledge bounds and spawn survive reset', () => {
  const motion=new PlayerMotion();
  motion.bounds=[.8,7.2]; motion.startX=2; motion.reset();
  assert.equal(motion.x,2);
  for(let i=0;i<20;i++) motion.update(.05,1);
  assert.equal(motion.x,7.2);
  for(let i=0;i<30;i++) motion.update(.05,-1);
  assert.equal(motion.x,.8);
  motion.reset(); assert.equal(motion.x,2);
});

test('stepped platforms allow a drop, block the riser, and permit a jump back up', () => {
  const motion=new PlayerMotion();
  motion.platforms=[{left:-4,right:0,top:-3,bottom:-6},{left:0,right:8,top:0,bottom:-6}];
  motion.startX=2; motion.reset();
  for(let i=0;i<35;i++) motion.update(.01,-1);
  assert.ok(motion.x<0); assert.equal(motion.airborne,true);
  for(let i=0;i<100;i++) motion.update(.01,0);
  assert.equal(motion.y,-3); assert.equal(motion.airborne,false);
  for(let i=0;i<40;i++) motion.update(.01,1);
  assert.equal(motion.x,-.55); assert.equal(motion.y,-3);
  motion.update(.01,0,true);
  for(let i=0;i<40;i++) motion.update(.01,0);
  assert.ok(motion.y>0);
  for(let i=0;i<15;i++) motion.update(.01,1);
  for(let i=0;i<100;i++) motion.update(.01,0);
  assert.ok(motion.x>0); assert.equal(motion.y,0); assert.equal(motion.airborne,false);
});
