import * as THREE from 'three';

// The v0.6 GLB has world-space vertex positions and a nested `world` node.
export function setupBlobCharacter(model, scene, shell, eyeAnimator) {
 const legs=[],antennas=[];
 const smooth=t=>t*t*(3-2*t);
 // GLB meshes use world-space vertex coordinates. Reparent at a world-space pivot
// and subtract the same pivot from the child, preserving the original appearance.
function attachAt(mesh,pivotPoint,parent){
 const pivot=new THREE.Group();pivot.position.copy(pivotPoint);parent.add(pivot);
 pivot.add(mesh);mesh.position.sub(pivotPoint);return pivot;
}
 const parts=[];model.traverse(o=>{if(o.isMesh)parts.push(o)});
 const byName=new Map(parts.map(o=>[o.name,o]));
 eyeAnimator.setupEyes(byName);
 for(const o of parts)o.castShadow=true;
 for(const o of parts){
  if(o.name.startsWith('Leg_'))continue;
  if(o.name.startsWith('Antenna_')){
   const sign=o.name.includes('_L_')?-1:1;
   const pt=new THREE.Vector3(sign*.53,.02,1.80);
   const pivot=attachAt(o,pt,shell);
   antennas.push({pivot,offset:sign<0?-.75:.9});
  }else shell.add(o);
 }
 for(const [side,sign,offset] of [['L',-1,0],['R',1,.5]]){
  const mesh=parts.find(o=>o.name.startsWith('Leg_'+side+'_'));
  if(!mesh)throw Error('Missing original continuous leg '+side);
  // Unbroken mesh (no split at the ankle). All vertices retain their original
  // topological neighbours; only the small ankle flex region is blended.
  scene.add(mesh);
  // Positions are animated in world coordinates every frame. The original
  // GLB bounds are therefore no longer valid for camera-frustum culling.
  // Keep both legs rendered regardless of viewing angle.
  mesh.frustumCulled=false;
  const geometry=mesh.geometry.clone();mesh.geometry=geometry;
  geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  const pos=geometry.attributes.position;
  const original=new Float32Array(pos.array);const weights=new Float32Array(pos.count);
  const ankle=new THREE.Vector3(sign*.88,0,.475);
  for(let i=0;i<pos.count;i++){
   const h=original[3*i+2];
   const u=THREE.MathUtils.clamp((h-.33)/(.62-.33),0,1);
   weights[i]=smooth(u); // foot rigid below .33; upper leg rigid above .62
  }
  // Contact points from the bottom geometry, measured in original model space.
  let heelY=.4,toeY=-.7;
  for(let i=0;i<pos.count;i++){
   const y=original[i*3+1],z=original[i*3+2];
   if(Math.abs(z)<.012){heelY=Math.max(heelY,y);toeY=Math.min(toeY,y)}
  }
  legs.push({side,sign,offset,ankle,mesh,geometry,original,weights,heelY,toeY,
             heelZ:0,toeZ:0});
 }

 return {legs, antennas, meshCount: parts.length};
}
