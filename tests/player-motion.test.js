import test from 'node:test';
import assert from 'node:assert/strict';
import {PlayerMotion} from '../src/PlayerMotion.js';

test('movement is horizontal, stationary without input, and bounded', () => {
  const motion=new PlayerMotion();
  motion.update(.05,0); assert.equal(motion.x,0);
  motion.update(.05,1); assert.equal(motion.x,.45); assert.equal(motion.y,0);
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
