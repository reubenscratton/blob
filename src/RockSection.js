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
  const geometry=new THREE.BoxGeometry(width,bodyHeight,depth,
    Math.ceil(width*40),Math.ceil(bodyHeight*40),Math.ceil(depth*40));
  const p=geometry.attributes.position;
  const colors=[];
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i), y=p.getY(i)-bodyHeight/2, z=p.getZ(i);
    // Keep the full block silhouette while the top-surface experiment is tuned.
    let px=x, py=y, pz=z;
    const sideWeight=THREE.MathUtils.smoothstep(Math.abs(x),width/2-.4,width/2);
    const sideTravel=Math.sin(Math.PI*(z/depth+.5));
    const sideFeature=sampleHeight(sampleOffset+(x+width/2)/width*sampleWidth
      +sideWeight*sideTravel*.40,-y/6+bodyHeight*.037);
    // Carry the same ridge/furrow relief over the cap, with world-space
    // sampling so adjoining floor blocks share identical boundary heights.
    const topFeature=sampleHeight((x+offsetX)/6+.31,z/6+.53);
    const topBlend=THREE.MathUtils.smoothstep(y,-.85,0);
    const feature=THREE.MathUtils.lerp(sideFeature,topFeature,topBlend);
    const reliefFade=THREE.MathUtils.smoothstep(y+bodyHeight,0,.08);
    const relief=.68*feature*reliefFade;
    if(roundEnds) px+=Math.sign(x)*Math.pow(Math.abs(x)/(width/2),8)*relief;
    pz+=Math.sign(z)*Math.pow(Math.abs(z)/(depth/2),8)*relief;
    // Broad irregular ridges plus fine undulation replace the flat red cap.
    // A narrow walking lane stays at collision height while relief rises around it.
    const lane=THREE.MathUtils.smoothstep(Math.abs(z),.15,.8);
    const bump=.38*(topFeature-.5)+.035*Math.sin((x+offsetX)*4.7+z*3.3);
    py+=topBlend*lane*bump;
    p.setXYZ(i,px,py,pz);
    const tint=.12+.88*THREE.MathUtils.smoothstep(feature,.05,.82);
    colors.push(tint,tint,tint);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  // Weld face boundaries before deriving normals so adjoining surfaces have no seam.
  geometry.deleteAttribute('normal'); geometry.deleteAttribute('uv');
  const shell=mergeVertices(geometry); geometry.dispose(); shell.computeVertexNormals();
  const mesh=new THREE.Mesh(shell,material);
  mesh.castShadow=true; mesh.receiveShadow=true; root.add(mesh);
  const fringe=createRockColumns({span:width,halfDepth:depth/2,paintedChannels:false});
  fringe.position.y=-bodyHeight; root.add(fringe);
  return root;
}
