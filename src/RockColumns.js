import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Reference-inspired hanging rock clusters: all contours, taper and overlap are
// geometry. Vertex colors give each curved column a dark face and red side rims.
export function createRockColumns() {
  const root=new THREE.Group(); root.name='Experimental Starquake rock columns';
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.66,metalness:0});
  let seed=1986;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
  function column(x,sign,layer) {
    const rings=18, segments=24;
    const length=.9+Math.pow(random(),.7)*2.5;
    const width=(layer===0?.43:.27)+random()*(layer===0?.26:.22);
    const depth=.27+random()*.22;
    const z=sign*(layer===0?2.23:2.55);
    const phase=random()*Math.PI*2, lean=(random()-.5)*.35;
    const positions=[], colors=[], indices=[];
    const red=.65+random()*.28;
    // Derive tip variety from each existing shape, preserving cluster placement.
    const pointiness=.5+.5*Math.sin(phase*7.13+length*3.7);
    const tipRadius=.18+.43*(1-pointiness);
    const taperStart=.62+.18*(1-pointiness);
    for(let row=0;row<=rings;row++) {
      const t=row/rings;
      // Full-width attachment at the top; only the hanging end tapers.
      const taper=1-(1-tipRadius)*smooth((t-taperStart)/(1-taperStart));
      const swell=1+.11*Math.sin(t*12+phase)+.055*Math.sin(t*27+phase);
      const radius=taper*swell;
      const cx=x+lean*t+.06*Math.sin(t*7+phase)*Math.sin(Math.PI*t);
      const cy=-.03-t*length;
      for(let j=0;j<=segments;j++) {
        const angle=j/segments*Math.PI*2, c=Math.cos(angle), s=Math.sin(angle);
        const flute=1+.075*Math.cos(angle*5+Math.sin(t*5+phase));
        positions.push(cx+c*width*radius*flute,cy, z+sign*s*depth*radius*flute);
        // Viewed from the side, the forward-facing middle stays near black;
        // the curved flanks rise through deep crimson to bright red edges.
        const edge=Math.pow(Math.abs(c),2.6);
        const striation=.88+.12*Math.sin(angle*9+t*12+phase);
        const rim=(.018+.982*edge)*striation;
        colors.push(red*rim,.006+rim*.009,.009+rim*.005);
      }
    }
    for(let row=0;row<rings;row++) for(let j=0;j<segments;j++) {
      const a=row*(segments+1)+j,b=a+segments+1;
      if(sign>0) indices.push(a,a+1,b,a+1,b+1,b);
      else indices.push(a,b,a+1,a+1,b,b+1);
    }
    // Small end caps keep the solid formation closed from oblique views.
    for(const row of [0,rings]) {
      const first=row*(segments+1), center=positions.length/3;
      let cx=0,cy=0,cz=0;
      for(let j=0;j<segments;j++){cx+=positions[(first+j)*3];cy+=positions[(first+j)*3+1];cz+=positions[(first+j)*3+2];}
      positions.push(cx/segments,cy/segments,cz/segments); colors.push(.04,.006,.009);
      for(let j=0;j<segments;j++) {
        const a=first+j,b=first+j+1;
        if((row===0)===(sign>0)) indices.push(center,b,a); else indices.push(center,a,b);
      }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    return geometry;
  }
  for(const sign of [-1,1]) {
    const pieces=[];
    for(let layer=0;layer<2;layer++) {
      let x=-24.7+(layer===0?0:.38);
      while(x<24.8) {
        pieces.push(column(x,sign,layer));
        x+=layer===0?.8+random()*.3:.61+random()*.34;
      }
    }
    const geometry=mergeGeometries(pieces);
    for(const piece of pieces) piece.dispose();
    const mesh=new THREE.Mesh(geometry,material);
    mesh.name=sign>0?'Front overlapping rock columns':'Rear overlapping rock columns';
    mesh.castShadow=true; mesh.receiveShadow=true;
    root.add(mesh);
  }
  return root;
}
