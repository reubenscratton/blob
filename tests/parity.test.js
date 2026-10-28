import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {gaitPose} from '../src/WalkAnimator.js';

const reference = readFileSync(new URL('../reference/approved-standalone.html', import.meta.url), 'utf8');
const extract = (start, end) => reference.slice(reference.indexOf(start), reference.indexOf(end));

test('gait matches approved heel, stance, toe-off and swing across cycles and controls', () => {
  const context = vm.createContext({THREE});
  vm.runInContext('const smooth=t=>t*t*(3-2*t); const lerp=THREE.MathUtils.lerp;\n' +
    extract('function footPose(', 'function animate(){'), context);
  for (const offset of [0, .5]) {
    const foot = {offset, ankle: {y: 0, z: .475}, heelY: .4, toeY: -.7, heelZ: 0, toeZ: 0};
    for (const stance of [.52, .62, .75]) {
      for (const length of [.25, 1.5, 2.5]) {
        for (let i = 0; i <= 600; i++) {
          const args = [foot, i / 100 + offset, length, stance, .22, 23 * Math.PI / 180, 28 * Math.PI / 180];
          assert.equal(JSON.stringify(gaitPose(...args)), JSON.stringify(context.gaitPose(...args)));
        }
      }
    }
  }
});

function eyeHarness(modular) {
  let seed = 1234;
  const math = Object.create(Math);
  math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
  const controls = {curiosity: {value: 1}, turn: {value: 12}};
  const context = vm.createContext({THREE, Math: math, $: id => controls[id], playing: true});
  if (modular) {
    const source = readFileSync(new URL('../src/EyeAnimator.js', import.meta.url), 'utf8')
      .replace("import * as THREE from 'three';", '').replace('export function', 'function');
    vm.runInContext(source + '\nvar controller=createEyeAnimator($,()=>playing);', context);
  } else {
    const reset = extract('function reset(){', "$('toggle').onclick")
      .split('cycles=0;')[0] + '}';
    vm.runInContext('const eyes=[];const lerp=THREE.MathUtils.lerp;\n' +
      extract('const faceF=', 'function reset(){') + reset +
      '\nvar controller={setupEyes,animateEyes,resetEyes:reset};', context);
  }
  const meshes = new Map();
  for (const side of ['L', 'R']) {
    for (const prefix of ['Eye_white_', 'Pupil_centred_']) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([
        side === 'L' ? -.5 : .5, -.8, 1.7,
        side === 'L' ? -.4 : .4, -.85, 1.65,
        side === 'L' ? -.6 : .6, -.85, 1.65,
      ], 3));
      const mesh = new THREE.Mesh(geometry); mesh.name = prefix + side;
      meshes.set(mesh.name, mesh);
    }
  }
  context.controller.setupEyes(meshes);
  return {context, meshes};
}

test('seeded gaze, blink, pause and reset match the approved eye animation', () => {
  const original = eyeHarness(false), modular = eyeHarness(true);
  for (let frame = 0; frame < 1200; frame++) {
    // Reset during a held glance, then again during the subsequent sequence.
    if (frame === 160 || frame === 380) {
      original.context.controller.resetEyes(); modular.context.controller.resetEyes();
    }
    const playing = frame < 600 || frame >= 660;
    for (const harness of [original, modular]) harness.context.playing = playing;
    const dt = playing ? 1 / 60 : 0;
    assert.equal(modular.context.controller.animateEyes(dt), original.context.controller.animateEyes(dt));
    for (const [name, mesh] of original.meshes) {
      assert.deepEqual(modular.meshes.get(name).geometry.attributes.position.array, mesh.geometry.attributes.position.array);
    }
  }
});
