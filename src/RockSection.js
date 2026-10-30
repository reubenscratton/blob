import * as THREE from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {createRockColumns} from './RockColumns.js';
import barkHeight from './BarkHeightData.js';

// One closed shell wraps image-guided relief around all four upright faces.
export function createRockSection({width=6,height=6,depth=3,roundEnds=true,offsetX=0}={}) {
  const root=new THREE.Group(); root.name='Solid grooved rock section';
  const bodyHeight=Math.max(.5,height-1);
  const material=new THREE.MeshStandardMaterial({color:0xb50907,roughness:.86,vertexColors:true});
  const mirror=v=>{v=((v%2)+2)%2;return v<=1?v:2-v;};
  const sampleHeight=(u,v)=>{
    const size=barkHeight.size, x=mirror(u)*(size-1), y=mirror(v)*(size-1);
    const ix=Math.min(size-2,Math.floor(x)), iy=Math.min(size-2,Math.floor(y));
    const fx=x-ix, fy=y-iy, data=barkHeight.values;
    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(data[iy*size+ix],data[iy*size+ix+1],fx),
      THREE.MathUtils.lerp(data[(iy+1)*size+ix],data[(iy+1)*size+ix+1],fx),fy)/255;
  };
  const sampleWidth=Math.min(.94,width/6);
  const sampleOffset=(1-sampleWidth)*(.5+.4*Math.sin(width*2.13+bodyHeight));
  const radius=Math.min(.48,bodyHeight*.3);
  const geometry=new THREE.BoxGeometry(width,bodyHeight,depth,
    Math.ceil(width*40),Math.ceil(bodyHeight*40),Math.ceil(depth*40));
  const p=geometry.attributes.position, originalNormals=geometry.attributes.normal;
  const colors=[], normal=new THREE.Vector3();
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i), y=p.getY(i)-bodyHeight/2, z=p.getZ(i);
    // Rounded vertical corners and a quarter-round shoulder at the top.
    const cx=roundEnds?THREE.MathUtils.clamp(x,-width/2+radius,width/2-radius):x;
    const cz=THREE.MathUtils.clamp(z,-depth/2+radius,depth/2-radius);
    const cy=THREE.MathUtils.clamp(y,-bodyHeight+radius,-radius);
    normal.set(x-cx,y-cy,z-cz);
    if(normal.lengthSq()>1e-10) normal.normalize();
    else normal.fromBufferAttribute(originalNormals,i);
    let px=cx+normal.x*radius, py=cy+normal.y*radius, pz=cz+normal.z*radius;
    // Interior cap points stay on their planar surface.
    if(Math.abs(x)<=width/2-radius&&Math.abs(z)<=depth/2-radius) {
      px=x; pz=z; py=y;
    }
    const sideWeight=THREE.MathUtils.smoothstep(Math.abs(x),width/2-.4,width/2);
    const sideTravel=Math.sin(Math.PI*(z/depth+.5));
    const feature=sampleHeight(sampleOffset+(x+width/2)/width*sampleWidth
      +sideWeight*sideTravel*.40,-y/6+bodyHeight*.037);
    const reliefFade=THREE.MathUtils.smoothstep(-y,radius,radius+.5)
      *THREE.MathUtils.smoothstep(y+bodyHeight,0,.08);
    const relief=.68*feature*reliefFade;
    px+=normal.x*relief; pz+=normal.z*relief;
    // Low-amplitude, broad bumps keep the cap mostly flat.
    const surfaceX=px+offsetX;
    const bump=.024*Math.sin(surfaceX*2.7+pz*.8)*Math.cos(pz*3.1)
      +.012*Math.sin(surfaceX*7.1-pz*4.3);
    py+=Math.max(0,normal.y)*bump;
    p.setXYZ(i,px,py,pz);
    const depthTint=.12+.88*THREE.MathUtils.smoothstep(feature,.05,.82);
    const tint=THREE.MathUtils.lerp(1,depthTint,reliefFade);
    colors.push(tint,tint,tint);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  // Weld face boundaries before deriving normals so rounded corners have no seam.
  geometry.deleteAttribute('normal'); geometry.deleteAttribute('uv');
  const shell=mergeVertices(geometry); geometry.dispose(); shell.computeVertexNormals();
  const mesh=new THREE.Mesh(shell,material);
  mesh.castShadow=true; mesh.receiveShadow=true; root.add(mesh);
  const fringe=createRockColumns({span:width,halfDepth:depth/2,paintedChannels:false});
  fringe.position.y=-bodyHeight; root.add(fringe);
  return root;
}
