import * as THREE from 'three';
import {createRockColumns} from './RockColumns.js';
import barkHeight from './BarkHeightData.js';

// Continuous solid backing with carved relief, rather than separate pillars.
export function createRockSection({width=6,height=6,depth=3}={}) {
  const root=new THREE.Group();
  root.name='Solid grooved rock section';
  const bodyHeight=Math.max(.5,height-1);
  const material=new THREE.MeshStandardMaterial({color:0xb50907,roughness:.86,vertexColors:true});
  const core=new THREE.Mesh(new THREE.BoxGeometry(width,bodyHeight,depth),material);
  const coreColors=new Float32Array(core.geometry.attributes.position.count*3).fill(1);
  core.geometry.setAttribute('color',new THREE.BufferAttribute(coreColors,3));
  core.position.y=-bodyHeight/2;
  core.castShadow=true; core.receiveShadow=true;
  root.add(core);
  // Image-guided feature relief, not a luminance-to-depth conversion.
  const mirror=v=>{v=((v%2)+2)%2;return v<=1?v:2-v;};
  const sampleHeight=(u,v)=>{
    const size=barkHeight.size, x=mirror(u)*(size-1), y=mirror(v)*(size-1);
    const ix=Math.min(size-2,Math.floor(x)), iy=Math.min(size-2,Math.floor(y));
    const fx=x-ix, fy=y-iy, data=barkHeight.values;
    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(data[iy*size+ix],data[iy*size+ix+1],fx),
      THREE.MathUtils.lerp(data[(iy+1)*size+ix],data[(iy+1)*size+ix+1],fx),fy)/255;
  };
  for(const sign of [-1,1]) {
    const face=new THREE.PlaneGeometry(width,bodyHeight,Math.ceil(width*40),Math.ceil(bodyHeight*40));
    const p=face.attributes.position;
    const colors=[];
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i), y=p.getY(i)-bodyHeight/2;
      const height=sampleHeight((x+width/2)/6+width*.073,-y/6+bodyHeight*.037);
      const edgeFade=THREE.MathUtils.smoothstep(width/2-Math.abs(x),0,.20);
      const relief=edgeFade*(.68*height);
      p.setXYZ(i,x,y,sign*(depth/2+.015+relief));
      // Depth tint is independent of the photograph's colour and lighting.
      const tint=.12+.88*THREE.MathUtils.smoothstep(height,.05,.82);
      colors.push(tint,tint,tint);
    }
    if(sign<0) {
      const index=face.index;
      for(let i=0;i<index.count;i+=3) {
        const a=index.getX(i); index.setX(i,index.getX(i+2)); index.setX(i+2,a);
      }
    }
    face.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    // Seal the relief to the backing at the upper and lower boundaries.
    const columns=face.parameters.widthSegments+1;
    const capPositions=[];
    for(const row of [0,face.parameters.heightSegments]) {
      for(let j=0;j<columns-1;j++) {
        const a=row*columns+j, b=a+1;
        const va=[p.getX(a),p.getY(a),p.getZ(a)];
        const vb=[p.getX(b),p.getY(b),p.getZ(b)];
        const ca=[va[0],va[1],sign*depth/2], cb=[vb[0],vb[1],sign*depth/2];
        capPositions.push(...va,...vb,...ca,...vb,...cb,...ca);
      }
    }
    const caps=new THREE.BufferGeometry();
    caps.setAttribute('position',new THREE.Float32BufferAttribute(capPositions,3));
    caps.computeVertexNormals();
    const capMaterial=material.clone(); capMaterial.vertexColors=false; capMaterial.side=THREE.DoubleSide;
    root.add(new THREE.Mesh(caps,capMaterial));
    face.computeVertexNormals();
    const mesh=new THREE.Mesh(face,material);
    mesh.castShadow=true; mesh.receiveShadow=true;
    root.add(mesh);
  }
  const fringe=createRockColumns({span:width,halfDepth:depth/2,paintedChannels:false});
  fringe.position.y=-bodyHeight;
  root.add(fringe);
  return root;
}
