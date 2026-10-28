import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ElectricBolts} from '../src/ElectricBolts.js';

test('bolts spawn ahead, travel independently, light the scene and expire',()=>{
  const system=new ElectricBolts(new THREE.Scene());
  const motion={x:3,y:4,direction:-1};
  assert.equal(system.fire(motion,2.5,2.7),true);
  const bolt=system.bolts.find(b=>b.mesh.visible);
  assert.equal(bolt.length,2);
  assert.ok(bolt.mesh.position.x+bolt.length/2<motion.x-1.25);
  assert.ok(bolt.mesh.position.y>motion.y);
  assert.ok(bolt.light.intensity>0);
  assert.equal(system.fire(motion,2.5,2.7),false,'fire rate is bounded');
  const x=bolt.mesh.position.x, y=bolt.mesh.position.y;
  system.update(.1);
  assert.ok(Math.abs(bolt.mesh.position.x-(x-4.2))<1e-10);
  assert.equal(bolt.mesh.position.y,y);
  assert.deepEqual(bolt.light.position.toArray(),bolt.mesh.position.toArray());
  assert.ok(bolt.mesh.geometry.attributes.position.array.every(Number.isFinite));
  system.update(1.2);
  assert.equal(bolt.mesh.visible,false); assert.equal(bolt.light.intensity,0);
});

test('reset clears every projectile and its environmental light',()=>{
  const system=new ElectricBolts(new THREE.Scene());
  for(let i=0;i<6;i++){system.update(.21);system.fire({x:0,y:0,direction:1},2,2.7);}
  const size=system.bolts.length;
  system.clear();
  assert.equal(system.bolts.length,size);
  assert.ok(system.bolts.every(b=>!b.mesh.visible && b.light.intensity===0));
  assert.equal(system.fire({x:0,y:0,direction:1},2,2.7),true);
});
