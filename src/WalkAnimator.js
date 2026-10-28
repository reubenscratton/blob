import * as THREE from 'three';

const smooth=t=>t*t*(3-2*t);
const lerp=THREE.MathUtils.lerp;
// Heel / flat-sole / toe planted stages, followed by swing.
// Rotation around X: y' = y cos(a) - z sin(a); z' = y sin(a)+z cos(a).
// Contact is computed from a foot-space heel, sole or toe point. That point is
// held at Z=0 and fixed world Y for the full stance interval.
function footPose(f,angle,anchor,kind){
 const ptY=kind==='heel'?f.heelY:kind==='toe'?f.toeY:-.20;
 const ptZ=kind==='heel'?f.heelZ:kind==='toe'?f.toeZ:0;
 const dy=ptY-f.ankle.y,dz=ptZ-f.ankle.z;
 const ry=dy*Math.cos(angle)-dz*Math.sin(angle);
 const rz=dy*Math.sin(angle)+dz*Math.cos(angle);
 return {y:anchor+ptY-ry,z:-rz,angle};
}
export function gaitPose(f,c,L,stance,lift,heelMax,toeMax){
 const k=Math.floor(c),u=c-k;
 const anchor=n=>-L*(n-f.offset)-L*stance*.5+.20;
 const A=anchor(k);
 const heelEnd=.20,toeStart=.64;
 if(u<stance){
  const q=u/stance;
  if(q<heelEnd)return footPose(f,-heelMax*(1-smooth(q/heelEnd)),A,'heel');
  if(q<toeStart)return footPose(f,0,A,'sole');
  return footPose(f,toeMax*smooth((q-toeStart)/(1-toeStart)),A,'toe');
 }
 const q=(u-stance)/(1-stance),t=smooth(q);
 const from=footPose(f,toeMax,A,'toe'),to=footPose(f,-heelMax,anchor(k+1),'heel');
 return {y:lerp(from.y,to.y,t),z:lerp(from.z,to.z,t)+lift*Math.sin(Math.PI*q),angle:lerp(toeMax,-heelMax,t)};
}
