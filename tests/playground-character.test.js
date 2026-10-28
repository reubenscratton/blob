import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {PlaygroundCharacter} from '../src/PlaygroundCharacter.js';
import {PlayerMotion} from '../src/PlayerMotion.js';

test('approved GLB stands Y-up and the whole character moves and turns together', async () => {
  const bytes=readFileSync(new URL('../assets/blob.glb',import.meta.url));
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const scene=new THREE.Scene();
  const character=new PlaygroundCharacter(gltf.scene,scene), motion=new PlayerMotion();
  for (const direction of [1,-1,1]) {
    for(let i=0;i<120;i++) {
      motion.update(1/60,direction); character.update(1/60,motion);
    }
    scene.updateMatrixWorld(true);
    assert.equal(character.root.position.z,0);
    assert.equal(character.root.position.y,0);
    assert.equal(character.legs.length,2);
    for(const leg of character.legs) {
      assert.equal(leg.mesh.parent,character.facing);
      assert.equal(leg.mesh.frustumCulled,false);
      assert.ok(leg.geometry.attributes.position.array.every(Number.isFinite));
    }
  }
  for(let i=0;i<120;i++) {motion.update(1/60,0);character.update(1/60,motion);}
  scene.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(character.root);
  assert.ok(Math.abs(bounds.min.y)<.02,'feet settle onto game Y=0');
  assert.ok(bounds.max.y>2,'body stands upright');
  assert.ok(bounds.min.x>motion.x-3 && bounds.max.x<motion.x+3,'no accumulated local gait translation');
});

test('airborne legs stop walking, droop continuously, and recover on landing', async () => {
  const bytes=readFileSync(new URL('../assets/blob.glb',import.meta.url));
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const character=new PlaygroundCharacter(gltf.scene,new THREE.Scene()), motion=new PlayerMotion();
  motion.jumpHeight=character.height*2;
  for(let i=0;i<30;i++) {motion.update(1/60,1);character.update(1/60,motion);}
  const phase=character.cycles;
  for(let i=0;i<30;i++) {motion.update(1/60,-1,i===0);character.update(1/60,motion);}
  assert.equal(character.cycles,phase);
  assert.ok(Math.abs(motion.y-character.height*2)<1e-6);
  assert.equal(character.root.position.y,motion.y);
  for(const leg of character.legs) {
    const positions=leg.geometry.attributes.position;
    let toe=-1;
    for(let i=0;i<positions.count;i++) {
      if(leg.original[3*i+2]<.05 && (toe<0 || leg.original[3*i+1]<leg.original[3*toe+1])) toe=i;
    }
    assert.ok(positions.getZ(toe)<leg.original[3*toe+2]-.05,'toes hang down');
    assert.equal(leg.mesh.parent,character.facing);
    assert.ok(positions.array.every(Number.isFinite));
  }
  for(let i=0;i<120;i++) {motion.update(1/60,0);character.update(1/60,motion);}
  assert.equal(motion.y,0);
  for(const leg of character.legs) {
    const positions=leg.geometry.attributes.position.array;
    for(let i=0;i<positions.length;i++) assert.ok(Math.abs(positions[i]-leg.original[i])<1e-5);
  }
});
