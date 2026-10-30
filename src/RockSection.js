import * as THREE from 'three';
import {createRockColumns} from './RockColumns.js';

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
  const hash=n=>{const v=Math.sin(n*127.1+19.7)*43758.5453;return v-Math.floor(v);};
  // A shared jittered grid: routes may join nodes in neighbouring columns.
  const columns=Math.max(3,Math.round(width/1.0));
  const rows=Math.max(3,Math.round(bodyHeight/1.4));
  const nodes=[];
  for(let row=0;row<=rows;row++) {
    const line=[];
    for(let col=0;col<columns;col++) {
      const key=row*173+col*31+11;
      line.push({
        x:-width/2+(col+.12+.76*hash(key))*width/columns,
        y:row===0?-bodyHeight:row===rows?0:
          -bodyHeight+(row-.38+.76*hash(key+7))*bodyHeight/rows,
      });
    }
    nodes.push(line);
  }
  const grooves=[];
  const connect=(a,b,key)=>{
    const radius=.065+.04*hash(key+19);
    let previous=a;
    for(let step=1;step<=10;step++) {
      const t=step/10, curve=t*t*(3-2*t);
      const point={x:THREE.MathUtils.lerp(a.x,b.x,curve),y:THREE.MathUtils.lerp(a.y,b.y,t)};
      grooves.push({a:previous,b:point,radius});
      previous=point;
    }
  };
  for(let row=0;row<rows;row++) {
    const incoming=new Set(), links=new Set();
    const link=(col,target)=>{
      const id=col*columns+target;
      if(links.has(id)) return;
      links.add(id); incoming.add(target);
      connect(nodes[row][col],nodes[row+1][target],row*271+col*23+target*71);
    };
    for(let col=0;col<columns;col++) {
      const key=row*97+col*37+3;
      const shift=hash(key)<.62?(hash(key+1)<.5?-1:1):0;
      link(col,THREE.MathUtils.clamp(col+shift,0,columns-1));
      if(hash(key+5)<.38) link(col,col);
    }
    // Every merge point participates, including those missed by random routes.
    for(let col=0;col<columns;col++) if(!incoming.has(col)) link(col,col);
  }
  for(const sign of [-1,1]) {
    const face=new THREE.PlaneGeometry(width,bodyHeight,Math.ceil(width*28),Math.ceil(bodyHeight*18));
    const p=face.attributes.position;
    const colors=[];
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i), y=p.getY(i)-bodyHeight/2;
      let cleft=0;
      for(const {a,b,radius} of grooves) {
        const dx=b.x-a.x, dy=b.y-a.y;
        const t=THREE.MathUtils.clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy),0,1);
        const distance=Math.hypot(x-a.x-t*dx,y-a.y-t*dy)/radius;
        cleft=Math.max(cleft,Math.exp(-distance*distance));
      }
      const edgeFade=THREE.MathUtils.smoothstep(width/2-Math.abs(x),0,.28);
      const relief=edgeFade*(.85*(1-cleft)+.025*Math.sin(x*23+y*13));
      p.setXYZ(i,x,y,sign*(depth/2+.015+relief));
      // Baked depth tint complements real shadows in the recessed clefts.
      const tint=1-.94*Math.pow(cleft, .65)*edgeFade;
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
