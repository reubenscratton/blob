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
  const noise=(y,key)=>{
    const cell=Math.floor(y), f=y-cell, blend=f*f*(3-2*f);
    return THREE.MathUtils.lerp(hash(cell+key*91.3),hash(cell+1+key*91.3),blend);
  };
  // Scatter merge nodes inside a grid, independently for each column/cell.
  // Project lateral jitter into the angle budget before routing the branches.
  const steps=Math.ceil(bodyHeight/.04), dy=bodyHeight/steps;
  const maxSlope=Math.tan(20*Math.PI/180)-.03;
  const cellHeight=bodyHeight/Math.max(2,Math.round(bodyHeight/2.1));
  const channels=[];
  let steepest=0;
  for(let branch=-1;branch<=Math.ceil(width/1.1);branch++) {
    const key=branch+17, anchor=-width/2+branch*1.1;
    const nodes=[{x:anchor,y:-bodyHeight}];
    for(let cell=0;cell<Math.round(bodyHeight/cellHeight);cell++) {
      const y=-bodyHeight+(cell+.15+.7*hash(key*13+cell*7))*cellHeight;
      const previous=nodes[nodes.length-1], budget=.045*(y-previous.y);
      const x=THREE.MathUtils.clamp(anchor+(hash(key*29+cell*11)-.5)*.85,
        previous.x-budget,previous.x+budget);
      nodes.push({x,y});
    }
    const previous=nodes[nodes.length-1];
    nodes.push({x:previous.x,y:0});
    for(const side of [-1,1]) {
      const samples=[];
      let segment=0;
      for(let row=0;row<=steps;row++) {
        const y=-bodyHeight+row*dy;
        while(segment<nodes.length-2&&y>nodes[segment+1].y) segment++;
        const a=nodes[segment], b=nodes[segment+1], length=b.y-a.y;
        const t=THREE.MathUtils.clamp((y-a.y)/length,0,1);
        const event=key*43+segment*17;
        // Unequal branch excursions, occasional shared runs, no periodic waves.
        const pivot=.25+.5*hash(event+side*3);
        const excursion=Math.min(t/pivot,(1-t)/(1-pivot));
        const split=hash(event+side*9)>.24
          ? excursion*length*Math.min(pivot,1-pivot)*.28*(.8+.2*hash(event+side*5))
          : 0;
        let x=THREE.MathUtils.lerp(a.x,b.x,t)+side*split;
        let radius=.045+.025*noise(y*1.1,key+side*13);
        if(row>0) {
          const previous=samples[row-1];
          x=THREE.MathUtils.clamp(x,previous.x-maxSlope*dy,previous.x+maxSlope*dy);
          radius=THREE.MathUtils.clamp(radius,previous.radius-.03*dy,previous.radius+.03*dy);
          steepest=Math.max(steepest,(Math.abs(x-previous.x)+Math.abs(radius-previous.radius))/dy);
        }
        samples.push({x,radius});
      }
      channels.push(samples);
    }
  }
  root.userData.maximumChannelAngle=Math.atan(steepest)*180/Math.PI;
  for(const sign of [-1,1]) {
    const face=new THREE.PlaneGeometry(width,bodyHeight,Math.ceil(width*28),Math.ceil(bodyHeight*18));
    const p=face.attributes.position;
    const colors=[];
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i), y=p.getY(i)-bodyHeight/2;
      let cleft=0;
      const sample=THREE.MathUtils.clamp((y+bodyHeight)/dy,0,steps);
      const row=Math.min(steps-1,Math.floor(sample)), blend=sample-row;
      for(const channel of channels) {
        const path=THREE.MathUtils.lerp(channel[row].x,channel[row+1].x,blend);
        const radius=THREE.MathUtils.lerp(channel[row].radius,channel[row+1].radius,blend);
        const distance=(x-path)/radius;
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
