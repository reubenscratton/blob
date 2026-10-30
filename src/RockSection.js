import * as THREE from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {createRockColumns} from './RockColumns.js';
import barkHeight from './BarkHeightData.js';

// One closed shell wraps image-guided relief around all four upright faces.
export function createRockSection({width=6,height=6,depth=3,roundEnds=true,offsetX=0}={}) {
  const root=new THREE.Group(); root.name='Solid grooved rock section';
  const bodyHeight=Math.max(.5,height-1);
  const material=new THREE.MeshStandardMaterial({color:0x790bb5,roughness:.86,vertexColors:true});
  const mirror=v=>{v=((v%2)+2)%2;return v<=1?v:2-v;};
  const sampleRaw=(u,v)=>{
    const size=barkHeight.size, x=u*(size-1), y=mirror(v)*(size-1);
    const ix=Math.min(size-2,Math.floor(x)), iy=Math.min(size-2,Math.floor(y));
    const fx=x-ix, fy=y-iy, data=barkHeight.values;
    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(data[iy*size+ix],data[iy*size+ix+1],fx),
      THREE.MathUtils.lerp(data[(iy+1)*size+ix],data[(iy+1)*size+ix+1],fx),fy)/255;
  };
  const sampleHeight=(u,v)=>{
    // Wrap in one direction rather than reflecting the bark into paired ridges.
    // Crossfade the narrow source boundary so the wrap has no hard seam.
    const wrapped=((u%1)+1)%1;
    const x=.12+wrapped*.88;
    const blend=THREE.MathUtils.smoothstep(x,.88,1);
    const strip=height=>THREE.MathUtils.lerp(sampleRaw(x,height),
      sampleRaw(Math.max(0,x-.88),height),blend);
    // Filter only along the grain: soften small crosswise ripples while
    // preserving the width and depth of the long vertical furrows.
    return (strip(v-.028)+2*strip(v-.014)+3*strip(v)
      +2*strip(v+.014)+strip(v+.028))/9;
  };
  // Continuous world-space distortion changes the source crop and scale along
  // the wall instead of restarting the same bark patch on each block.
  const sampleBark=(horizontal,vertical)=>{
    const u=horizontal/6+.045*Math.sin(horizontal*.23)
      +.012*Math.sin(horizontal*.53+vertical*.31);
    const v=vertical/6+.16*Math.sin(horizontal*.11+1.7)
      +.035*Math.sin(horizontal*.29+vertical*.19);
    return sampleHeight(u+.31,v+.53);
  };
  const geometry=new THREE.BoxGeometry(width,bodyHeight,depth,
    Math.ceil(width*40),Math.ceil(bodyHeight*40),Math.ceil(depth*40));
  const p=geometry.attributes.position;
  const colors=[];
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i), y=p.getY(i)-bodyHeight/2, z=p.getZ(i);
    // A small true curved shoulder softens the rim without adding a flat bevel.
    const radius=.16;
    const cx=roundEnds?THREE.MathUtils.clamp(x,-width/2+radius,width/2-radius):x;
    const cz=THREE.MathUtils.clamp(z,-depth/2+radius,depth/2-radius);
    const cy=Math.min(y,-radius);
    const dx=x-cx, dy=y-cy, dz=z-cz;
    const distance=Math.hypot(dx,dy,dz);
    const scale=distance>radius?radius/distance:1;
    let px=cx+dx*scale, py=cy+dy*scale, pz=cz+dz*scale;
    const sideWeight=THREE.MathUtils.smoothstep(Math.abs(x),width/2-.4,width/2);
    const sideTravel=Math.sin(Math.PI*(z/depth+.5));
    const sideFeature=sampleBark(x+offsetX+sideWeight*sideTravel*2.4,
      -y+bodyHeight*.037*6+(z<0?2.7:0));
    // Carry the same ridge/furrow relief over the cap, with world-space
    // sampling so adjoining floor blocks share identical boundary heights.
    const topFeature=sampleBark(x+offsetX,z);
    const topBlend=THREE.MathUtils.smoothstep(y,-.85,0);
    const feature=THREE.MathUtils.lerp(sideFeature,topFeature,topBlend);
    const reliefFade=THREE.MathUtils.smoothstep(y+bodyHeight,0,.08);
    const relief=.68*feature*reliefFade;
    if(roundEnds) px+=Math.sign(x)*Math.pow(Math.abs(x)/(width/2),8)*relief;
    pz+=Math.sign(z)*Math.pow(Math.abs(z)/(depth/2),8)*relief;
    // Broad irregular ridges plus fine undulation replace the flat cap.
    // A narrow walking lane stays at collision height while relief rises around it.
    const lane=THREE.MathUtils.smoothstep(Math.abs(z),.15,.8);
    const bump=.12*(topFeature-.5)+.012*Math.sin((x+offsetX)*4.7+z*3.3);
    py+=topBlend*lane*bump;
    p.setXYZ(i,px,py,pz);
    const depthTint=.12+.88*THREE.MathUtils.smoothstep(feature,.05,.82);
    // Shallower cap grooves also need less darkening than the deep side furrows.
    const tint=THREE.MathUtils.lerp(depthTint,.52+.48*depthTint,topBlend);
    colors.push(tint,tint,tint);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  // Weld face boundaries before deriving normals so adjoining surfaces have no seam.
  geometry.deleteAttribute('normal'); geometry.deleteAttribute('uv');
  const shell=mergeVertices(geometry); geometry.dispose(); shell.computeVertexNormals();
  const mesh=new THREE.Mesh(shell,material);
  mesh.castShadow=true; mesh.receiveShadow=true; root.add(mesh);
  const fringe=createRockColumns({span:width,halfDepth:depth/2,paintedChannels:false,seed:1986+Math.round((offsetX+30)*997)});
  fringe.position.y=-bodyHeight; root.add(fringe);
  return root;
}
