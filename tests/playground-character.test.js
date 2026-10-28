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
