import * as THREE from 'three';
import {createRockColumns} from './RockColumns.js';

// Continuous solid backing with carved relief, rather than separate pillars.
export function createRockSection({width=6,height=6,depth=3}={}) {
  const root=new THREE.Group();
  root.name='Solid grooved rock section';
  const bodyHeight=Math.max(.5,height-1);
  const material=new THREE.MeshStandardMaterial({color:0xb50907,roughness:.86});
  const core=new THREE.Mesh(new THREE.BoxGeometry(width,bodyHeight,depth),material);
  core.position.y=-bodyHeight/2;
  core.castShadow=true; core.receiveShadow=true;
  root.add(core);
  for(const sign of [-1,1]) {
    const face=new THREE.PlaneGeometry(width,bodyHeight,Math.ceil(width*28),Math.ceil(bodyHeight*18));
    const p=face.attributes.position;
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i), y=p.getY(i)-bodyHeight/2;
      // Narrow recessed clefts wander vertically through broad raised ridges.
      const phase=x*7.2+.7*Math.sin(y*1.1+x*.6)+.23*Math.sin(y*2.7+x*1.3);
      const cleft=Math.pow(.5+.5*Math.cos(phase),5);
      const edgeFade=THREE.MathUtils.smoothstep(width/2-Math.abs(x),0,.28);
      const relief=edgeFade*(.85*(1-cleft)+.025*Math.sin(x*23+y*13));
      p.setXYZ(i,x,y,sign*(depth/2+.015+relief));
    }
    if(sign<0) {
      const index=face.index;
      for(let i=0;i<index.count;i+=3) {
        const a=index.getX(i); index.setX(i,index.getX(i+2)); index.setX(i+2,a);
      }
    }
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
    const capMaterial=material.clone(); capMaterial.side=THREE.DoubleSide;
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
