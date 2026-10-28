import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {setupBlobCharacter} from './BlobCharacter.js';
import {createEyeAnimator} from './EyeAnimator.js';
import {gaitPose} from './WalkAnimator.js';
const $=id=>document.getElementById(id), view=$('view'), status=$('status');
const scene=new THREE.Scene();scene.background=new THREE.Color('#333b49');
const camera=new THREE.PerspectiveCamera(38,1,.05,200);camera.up.set(0,0,1);camera.position.set(4,-7,3.45);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.5;view.prepend(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,1.15);controls.enableDamping=true;
scene.add(new THREE.HemisphereLight(0xffffff,0x66738c,2.2));
const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(-3,-4,8);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;scene.add(key);
const fill=new THREE.DirectionalLight(0xffffff,1);fill.position.set(4,2,4);scene.add(fill);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.MeshStandardMaterial({color:'#66717a',roughness:.92}));ground.position.z=-.012;ground.receiveShadow=true;scene.add(ground);
const grid=new THREE.GridHelper(500,1000,0x8a94a2,0x707985);grid.rotation.x=Math.PI/2;grid.position.z=-.008;grid.material.transparent=true;grid.material.opacity=.13;scene.add(grid);
let shell, model, legs=[], antennas=[], clock=new THREE.Clock(),cycles=0,playing=true,lastBodyY=0;
function slider(name,fmt){const el=$(name),out=$(name+'Value');const update=()=>out.textContent=fmt(+el.value);el.addEventListener('input',update);update();}
slider('speed',v=>v.toFixed(2)+'×');slider('length',v=>v.toFixed(2));slider('lift',v=>v.toFixed(2));slider('stance',v=>Math.round(100*v)+'%');slider('heel',v=>v+'°');slider('toe',v=>v+'°');slider('hip',v=>v.toFixed(2));slider('bob',v=>v.toFixed(3));slider('flop',v=>v+'°');slider('curiosity',v=>Math.round(v*100)+'%');slider('turn',v=>v+'°');
// Load the exact last approved model; split behaviour into small modules.
const eyesController=createEyeAnimator($,()=>playing);
new GLTFLoader().load('./assets/blob.glb',gltf=>{
 model=gltf.scene;model.updateMatrixWorld(true);shell=new THREE.Group();scene.add(shell);
 const character=setupBlobCharacter(model,scene,shell,eyesController);
 legs=character.legs;antennas=character.antennas;
 status.textContent=`Loaded Blob (${character.meshCount} meshes) · continuous ankle, nervous gaze, visibility fix.`;
},undefined,err=>status.textContent='Model loading error: '+(err?.message||err));
const animateEyes=(dt)=>eyesController.animateEyes(dt);
function reset(){eyesController.resetEyes();cycles=0;lastBodyY=0;playing=true;$('toggle').textContent='Pause';if(shell){shell.position.set(0,0,0);shell.rotation.set(0,0,0)}camera.position.set(4,-7,3.45);controls.target.set(0,0,1.15);controls.update()}
$('toggle').onclick=()=>{playing=!playing;$('toggle').textContent=playing?'Pause':'Play'};
$('reset').onclick=reset;
function animate(){
 requestAnimationFrame(animate);
 const dt=Math.min(clock.getDelta(),.05),speed=+$('speed').value,L=+$('length').value;
 const stance=+$('stance').value,lift=+$('lift').value,bob=+$('bob').value,hip=+$('hip').value;
 const heel=THREE.MathUtils.degToRad(+$('heel').value),toe=THREE.MathUtils.degToRad(+$('toe').value);
 const flop=THREE.MathUtils.degToRad(+$('flop').value);
 if(playing&&speed>0)cycles+=dt*1.1*speed;
 const glanceYaw=animateEyes(playing?dt:0);
 if(shell){
  const bodyY=-L*cycles, phase=Math.sin(2*Math.PI*cycles);
  const bodyX=.012*phase,bodyZ=bob*.5*(1-Math.cos(4*Math.PI*cycles));
  shell.position.set(bodyX,bodyY,bodyZ);shell.rotation.set(0,.006*phase,glanceYaw+.007*phase);
  for(const a of antennas)a.pivot.rotation.x=flop*Math.sin(2*Math.PI*cycles+a.offset);
  for(const f of legs){
   const pose=gaitPose(f,cycles+f.offset,L,stance,lift,heel,toe);
   const ankleWorld=new THREE.Vector3(f.ankle.x+bodyX,pose.y,pose.z);
   // The hip side rotates around the same ankle centre. The difference from
   // previous versions: no detached mesh and no separate hinge transforms.
   // Upper and lower rigid transformations meet at precisely this centre.
   const localDZ=.32;
   const desiredHipY=bodyY+hip*Math.sin(2*Math.PI*(cycles+f.offset));
   const difference=THREE.MathUtils.clamp(desiredHipY-ankleWorld.y,-.20,.20);
   const upperAngle=THREE.MathUtils.clamp(-Math.asin(difference/localDZ),-.62,.62);
   // Animate a single connected topology. Only vertices in the narrow ankle
   // transition (.33-.62 high) interpolate between the upper and foot poses.
   // Translation and rotation never separate because both share ankleWorld.
   const footCos=Math.cos(pose.angle), footSin=Math.sin(pose.angle);
   const upCos=Math.cos(upperAngle),upSin=Math.sin(upperAngle);
   const orig=f.original, weights=f.weights, dst=f.geometry.attributes.position;
   for(let i=0;i<weights.length;i++){
    const j=3*i,x=orig[j]-f.ankle.x,y=orig[j+1]-f.ankle.y,z=orig[j+2]-f.ankle.z;
    const w=weights[i],a=footCos*(1-w)+upCos*w,b=footSin*(1-w)+upSin*w;
    dst.array[j]=ankleWorld.x+x;
    dst.array[j+1]=ankleWorld.y+y*a-z*b;
    dst.array[j+2]=ankleWorld.z+y*b+z*a;
   }
   dst.needsUpdate=true;
   f.geometry.computeVertexNormals();

  }
  const shift=bodyY-lastBodyY;camera.position.y+=shift;controls.target.y+=shift;lastBodyY=bodyY;
 }
 controls.update();renderer.render(scene,camera);
}
function resize(){const w=view.clientWidth,h=view.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}
new ResizeObserver(resize).observe(view);resize();animate();
