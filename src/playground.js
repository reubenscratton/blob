import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {PlayerMotion} from './PlayerMotion.js';
import {PlaygroundCharacter} from './PlaygroundCharacter.js';
import {createLavaFloor} from './LavaFloor.js';
import {ElectricBolts} from './ElectricBolts.js';
import {createRockSection} from './RockSection.js';

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
// The geometric view now follows the original start-room grid.
const geometricSides=new URLSearchParams(location.search).get('rock')!=='texture';
const comparison=document.querySelector('#compare-rocks');
comparison.href=geometricSides?'?rock=texture':'?rock=geometry';
comparison.textContent=geometricSides?'Compare textured rocks':'Try geometric rocks';
if(geometricSides) {
  // 8 × 6 cells, each 4 wide × 3 high, matching the reference screen's 4:3 cells.
  // Bottom row: columns 3,4,5; row above: columns 4,5 (zero-based).
  // Merge touching cells vertically so no internal stalactite fringe is exposed.
  for(const [column,columns,rows] of [[3,1,1],[4,2,2]]) {
    const width=columns*4, bodyHeight=rows*3;
    const x=-16+column*4+width/2;
    const rock=createRockSection({width,height:bodyHeight+1,depth:5,
      roundEnds:true,offsetX:x});
    rock.position.set(x,-6+bodyHeight,0);
    scene.add(rock);
  }
} else {
  createLavaFloor(scene,renderer,{geometricSides:false})
    .catch(error=>console.error('Lava floor texture could not load:',error));
}
const motion = new PlayerMotion(), held = new Set(), bolts = new ElectricBolts(scene);
if(geometricSides) {
  motion.platforms=[{left:-4,right:0,top:-3,bottom:-6},
    {left:0,right:8,top:0,bottom:-6}];
  motion.bounds=[-15,15];
  motion.startX=2;
  motion.reset();
}
let character, cameraX = 0, jumpPressed = false, firePressed = false;
const accepted = new Set(['ArrowLeft','ArrowRight','KeyA','KeyD','Space','KeyF']);
function clearInput() { held.clear(); jumpPressed = false; firePressed = false; }
window.addEventListener('keydown', event => {
  if (!accepted.has(event.code) || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
  event.preventDefault();
  if(event.code==='Space' && !event.repeat && !held.has('Space')) jumpPressed = true;
  held.add(event.code);
});
window.addEventListener('keyup', event => { held.delete(event.code); });
window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => { if(document.hidden) clearInput(); });
document.querySelector('#reset').addEventListener('click', () => {
  clearInput(); motion.reset(); character?.reset(); bolts.clear(); cameraX=0;
});
document.querySelector('#fire').addEventListener('click',()=>{firePressed=true;});
new GLTFLoader().load(new URL('../assets/blob.glb',import.meta.url).href, gltf => {
  gltf.scene.updateMatrixWorld(true);
  character = new PlaygroundCharacter(gltf.scene, scene);
  motion.jumpHeight = 2 * character.height;
  motion.characterHeight = character.height;
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
  bolts.update(dt);
  if (character) {
    motion.update(dt,input,jumpPressed); jumpPressed=false; character.update(dt,motion);
    if(firePressed||held.has('KeyF')) bolts.fire(motion,character.width,character.height);
    firePressed=false;
    const action=motion.airborne?'Airborne':motion.turnTime<.18?'Turning':motion.distance>0?'Walking':'Standing';
    const label=`${action} · Facing ${motion.direction>0?'right':'left'}`;
    if(status.textContent!==label) status.textContent=label;
  }
  cameraX=geometricSides?0:THREE.MathUtils.damp(cameraX,motion.x,6,dt);
  // Fixed side-on view. A slight elevation reveals the floor's 3D depth.
  const distance=geometricSides?Math.max(37,54/camera.aspect):Math.max(40,24/camera.aspect);
  const targetY=geometricSides?3:1.3;
  camera.position.set(cameraX,targetY+7.4,distance);
  camera.lookAt(cameraX,targetY,0);
  renderer.render(scene,camera);
}
animate();
