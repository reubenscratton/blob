import * as THREE from 'three';

// Eye patch vertices are rewritten on the original 30-degree face orientation.
export function createEyeAnimator(getControl, isPlaying) {
  const $ = getControl;
  const lerp = THREE.MathUtils.lerp;
  const eyes = [];
  // The eyes are patches on the original tilted spherical surface, not little
// floating eyeballs. Rebuild their positions on that surface each frame.
const faceF=new THREE.Vector3(0,-Math.cos(Math.PI/6),Math.sin(Math.PI/6));
const faceU=new THREE.Vector3(0,Math.sin(Math.PI/6),Math.cos(Math.PI/6));
const faceR=new THREE.Vector3(1,0,0);
const eyeCentre=new THREE.Vector3(0,0,1.15);
function setupEyes(byName){
 for(const side of ['L','R']){
  const white=byName.get('Eye_white_'+side),pupil=byName.get('Pupil_centred_'+side);
  if(!white||!pupil)continue;
  const samples=[];
  for(const mesh of [white,pupil]){
   const g=mesh.geometry.clone();mesh.geometry=g;
   const attr=g.attributes.position;attr.setUsage(THREE.DynamicDrawUsage);
   const angles=new Float32Array(attr.count*2);
   for(let i=0;i<attr.count;i++){
    const d=new THREE.Vector3(attr.getX(i),attr.getY(i),attr.getZ(i)).sub(eyeCentre).normalize();
    angles[2*i]=Math.atan2(d.dot(faceR),d.dot(faceF));
    angles[2*i+1]=Math.asin(THREE.MathUtils.clamp(d.dot(faceU),-1,1));
   }
   mesh.frustumCulled=false;
   samples.push({mesh,attr,angles,r:mesh===white?1.037:1.052});
  }
  eyes.push({side,samples});
 }
}
let gazeX=0,gazeY=0,targetX=0,targetY=0,lookHold=2.4,lookReturn=false;
let blinkWait=2.4,blinkElapsed=0,blinking=false,blinkCount=0;
let idleTime=0;
const random=(a,b)=>a+Math.random()*(b-a);
function animateEyes(dt){
 const curiosity=+$('curiosity').value;
 if(isPlaying()){
  lookHold-=dt;
  if(lookHold<=0){
   if(lookReturn||curiosity<.05){targetX=targetY=0;lookReturn=false;lookHold=random(1.5,3.2);}
   else {targetX=random(-.125,.125)*curiosity;targetY=random(-.12,.10)*curiosity;lookReturn=true;lookHold=random(1.0,2.6);}
  }
  // Fast, nervous saccades: ~95% of each eye movement completes in 0.12s.
  const follow=1-Math.exp(-dt*25.0);
  gazeX=lerp(gazeX,targetX,follow);gazeY=lerp(gazeY,targetY,follow);
  if(!blinking){blinkWait-=dt;if(blinkWait<=0){blinking=true;blinkElapsed=0;}}
  else {blinkElapsed+=dt; if(blinkElapsed>=.19){blinking=false;blinkWait=random(2.0,5.7);}}
 }
 // Smoothly pinch the eye patches to slits, revealing the black mask behind.
 const blinkPhase=blinking?Math.min(blinkElapsed/.19,1):0;
 const blinkAmount=blinking?Math.pow(Math.sin(Math.PI*blinkPhase),1.2):0;
 const open=1-.985*blinkAmount;
 for(const eye of eyes){
  const h0=eye.side==='L' ? -.52:.52;
  for(const {mesh,attr,angles,r} of eye.samples){
   const pupil=mesh.name.startsWith('Pupil_');
   for(let i=0;i<attr.count;i++){
    const h=h0+(angles[2*i]-h0)+(pupil?gazeX:0);
    const v=(angles[2*i+1]+(pupil?gazeY:0))*open;
    const cv=Math.cos(v),sv=Math.sin(v),ch=Math.cos(h),sh=Math.sin(h);
    attr.setXYZ(i,r*(cv*ch*faceF.x+cv*sh*faceR.x+sv*faceU.x),
        r*(cv*ch*faceF.y+cv*sh*faceR.y+sv*faceU.y),
        1.15+r*(cv*ch*faceF.z+cv*sh*faceR.z+sv*faceU.z));
   }
   attr.needsUpdate=true;
   mesh.geometry.computeVertexNormals();
  }
 }
 return curiosity*THREE.MathUtils.clamp(gazeX/.125,-1,1)*THREE.MathUtils.degToRad(+$('turn').value);
}


  function resetEyes() {
    gazeX=gazeY=targetX=targetY=0;
    // Preserve the archived reset: a pending glance still returns to neutral.
    lookHold=1.8;
    blinkWait=2.2;blinkElapsed=0;blinking=false;
  }
  return {setupEyes, animateEyes, resetEyes};
}
