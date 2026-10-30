import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Reference-inspired hanging rock clusters: all contours, taper and overlap are
// geometry. Vertex colors give each curved column a dark face and red side rims.
export function createRockColumns({span=50,bodyHeight=0,halfDepth=2.5}={}) {
  const root=new THREE.Group(); root.name='Experimental Starquake rock columns';
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.66,metalness:0});
  let seed=1986;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
  function column(x,sign,layer) {
    const rings=18+Math.ceil(bodyHeight*6), segments=24;
    const length=.9+Math.pow(random(),.7)*2.5;
    const width=(layer===0?.30:.19)+random()*(layer===0?.53:.42);
    // Keep broad formations rounded in depth as well as in silhouette.
    const depth=Math.max(.42,width*.95)+random()*.22;
    const z=sign*(halfDepth+(layer===0?-.27:.05));
    const phase=random()*Math.PI*2, lean=(random()-.5)*.35;
    const positions=[], colors=[], indices=[];
    const red=.65+random()*.28;
    // Vary the dark face independently without disturbing seeded placement.
    const channelScale=.7+.5*(.5+.5*Math.sin(phase*5.71+length*2.13));
    // Derive tip variety from each existing shape, preserving cluster placement.
    const pointiness=.5+.5*Math.sin(phase*7.13+length*3.7);
    const tipRadius=.07+.18*(1-pointiness);
    // Independent chipped outlines without changing the seeded cluster layout.
    const chip=(row,side)=>{
      const n=Math.sin(row*91.73+phase*37.19+side*173.41)*43758.5453;
      return .82+.36*(n-Math.floor(n));
    };
    for(let row=0;row<=rings;row++) {
      const travel=row/rings*(bodyHeight+length);
      const t=bodyHeight>0?travel/(bodyHeight+length):row/rings;
      const tipT=bodyHeight>0?THREE.MathUtils.clamp((travel-bodyHeight)/length,0,1):t;
      // Broad attachment narrows along the whole hanging formation.
      const taper=tipRadius+(1-tipRadius)*Math.pow(1-tipT,1.05+.35*pointiness);
      const swell=1+.035*Math.sin(t*12+phase)+.015*Math.sin(t*27+phase);
      const radius=taper*swell;
      const bend=bodyHeight>0
        ? .22*Math.sin(travel*1.45+phase)+.10*Math.sin(travel*3.1+phase*2)
        : 0;
      const cx=x+lean*t+.06*Math.sin(t*7+phase)*Math.sin(Math.PI*t)+bend;
      const cy=-.03-travel;
      // Each flank has its own broad contour as well as independent chips.
      const left=(1+.10*Math.sin(t*11+phase)+.045*Math.sin(t*25+phase*1.7))*chip(row,0);
      const right=(1+.10*Math.sin(t*8.3+phase*2.3+2)+.045*Math.sin(t*21+phase*.7+1))*chip(row,1);
      for(let j=0;j<=segments;j++) {
        const angle=j/segments*Math.PI*2, c=Math.cos(angle), s=Math.sin(angle);
        const flute=1+.075*Math.cos(angle*5+Math.sin(t*5+phase));
        const edgeScale=(c<0?left:right);
        positions.push(cx+c*width*taper*flute*edgeScale,cy, z+sign*s*depth*radius*flute);
        // Viewed from the side, the forward-facing middle stays near black;
        // the curved flanks rise through deep crimson to bright red edges.
        const channelVariation=bodyHeight>0?.85+.15*Math.sin(travel*2.1+phase):1;
        const channelWidth=channelScale*channelVariation*(1-smooth((tipT-.55)/.4));
        const edge=channelWidth>0
          ? Math.pow(Math.min(1,Math.abs(c)/channelWidth),2.6)
          : 1;
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
      let x=-span/2+.3+(layer===0?0:.38);
      while(x<span/2-.2) {
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
