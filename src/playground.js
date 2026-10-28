import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {PlayerMotion} from './PlayerMotion.js';
import {PlaygroundCharacter} from './PlaygroundCharacter.js';

const view = document.querySelector('#view'), status = document.querySelector('#status');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#1b293c');
scene.fog = new THREE.Fog('#1b293c', 35, 80);
const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
view.append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff, 0x66738c, 2.2));
const key = new THREE.DirectionalLight(0xffffff, 3);
key.position.set(-10, 16, 10);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, {left:-29,right:29,top:16,bottom:-16,far:65});
scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 1);
fill.position.set(4, 4, -4); scene.add(fill);
const materials = new Map();
function box(x,y,z,w,h,d,color) {
  if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({color, roughness:.8}));
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), materials.get(color));
  mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true;
  scene.add(mesh); return mesh;
}
// One continuous, flat test lane. Background forms are scenery, outside the play plane.
box(0,-.45,0,50,.9,5,'#4e6775');
box(0,-.65,2.55,50,.32,.12,'#91d9c8');
for (let x=-20; x<=20; x+=5) {
  box(x,.012,0,.055,.025,4.8,'#91a8b5');
  box(x,1,-5,.22,2,.3,'#3c536b');
}
for (const [x,h,w] of [[-20,6,5],[-12,3,4],[-4,7,5],[5,4,5],[14,8,6],[22,3,3]]) {
  box(x,h/2,-10,w,h,2,'#2b3e55');
  box(x,h+.08,-10,w+.3,.16,2.3,'#53718a');
}
for (const x of [-24,24]) {
  box(x,1.1,0,.5,2.2,4.8,'#667b8a');
  box(x,2.24,0,.65,.08,5,'#f1c27b');
}
const motion = new PlayerMotion(), held = new Set();
let character, cameraX = 0;
const accepted = new Set(['ArrowLeft','ArrowRight','KeyA','KeyD']);
function clearInput() { held.clear(); }
window.addEventListener('keydown', event => {
  if (!accepted.has(event.code) || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
  event.preventDefault(); held.add(event.code);
});
window.addEventListener('keyup', event => { held.delete(event.code); });
window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => { if(document.hidden) clearInput(); });
document.querySelector('#reset').addEventListener('click', () => {
  clearInput(); motion.reset(); character?.reset(); cameraX=0;
});
new GLTFLoader().load('/assets/blob.glb', gltf => {
  gltf.scene.updateMatrixWorld(true);
  character = new PlaygroundCharacter(gltf.scene, scene);
  status.textContent = 'Ready · Facing right';
}, undefined, error => {status.textContent = 'Could not load Blob: '+error.message;});
function resize() {
  renderer.setSize(view.clientWidth,view.clientHeight);
  camera.aspect=view.clientWidth/view.clientHeight; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(view); resize();
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.05);
  const input=Number(held.has('ArrowRight')||held.has('KeyD'))-Number(held.has('ArrowLeft')||held.has('KeyA'));
  if (character) {
    motion.update(dt,input); character.update(dt,motion);
    const action=motion.turnTime<.18?'Turning':motion.distance>0?'Walking':'Standing';
    const label=`${action} · Facing ${motion.direction>0?'right':'left'}`;
    if(status.textContent!==label) status.textContent=label;
  }
  cameraX=THREE.MathUtils.damp(cameraX,motion.x,6,dt);
  // Fixed side-on view. A slight elevation reveals the floor's 3D depth.
  const distance=Math.max(20,12/camera.aspect);
  camera.position.set(cameraX,5,distance);
  camera.lookAt(cameraX,1.3,0);
  renderer.render(scene,camera);
}
animate();
