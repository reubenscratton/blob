import test from 'node:test';
import assert from 'node:assert/strict';
import {AABB2,moveAABB} from '../src/AABB2.js';

test('AABBs overlap in X/Y, with touching edges excluded',()=>{
  const actor=new AABB2().setFromFeet(0,0,2,3);
  assert.equal(actor.overlaps(new AABB2(.5,1,2,4)),true);
  assert.equal(actor.overlaps(new AABB2(1,0,2,3)),false);
  actor.translate(5,-2);
  assert.deepEqual([actor.left,actor.bottom,actor.right,actor.top],[4,-2,6,1]);
});

test('swept bounds catch thin walls and slide without tunnelling',()=>{
  const body=new AABB2(0,0,1,2), wall=new AABB2(3,-10,3.1,10);
  const result=moveAABB(body,20,2,[wall]);
  assert.equal(body.right,3); assert.equal(body.bottom,2);
  assert.equal(result.contacts[0].nx,-1);
  moveAABB(body,-1,0,[wall]); assert.equal(body.right,2,'can move away from contact');
});

test('landing uses the whole box, including partial ledge overlap',()=>{
  const body=new AABB2(-1,5,1,7), ledge=new AABB2(.5,-1,4,0);
  const result=moveAABB(body,0,-20,[ledge]);
  assert.equal(body.bottom,0); assert.equal(result.contacts[0].ny,1);
});

test('undersides block ascending actors and ground contact permits sideways sliding',()=>{
  const body=new AABB2(0,0,1,2), ceiling=new AABB2(-2,3,2,4);
  assert.equal(moveAABB(body,0,10,[ceiling]).contacts[0].ny,-1);
  assert.equal(body.top,3);
  const floor=new AABB2(-10,-1,10,0), grounded=new AABB2(0,0,1,2);
  moveAABB(grounded,4,-.1,[floor]);
  assert.equal(grounded.left,4); assert.equal(grounded.bottom,0);
});
