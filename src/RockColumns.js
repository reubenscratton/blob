import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Reference-inspired hanging rock clusters: all contours, taper and overlap are
// geometry. Vertex colors give each curved column a dark face and red side rims.
export function createRockColumns() {
  const root=new THREE.Group(); root.name='Experimental Starquake rock columns';
  const grain=new Uint8Array(128*128*4);
  for(let y=0;y<128;y++) for(let x=0;x<128;x++) {
    const noise=Math.sin(x*127.1+y*311.7)*43758.5453;
    const value=110+Math.floor((noise-Math.floor(noise))*70);
    grain.set([value,value,value,255],(y*128+x)*4);
  }
  const bump=new THREE.DataTexture(grain,128,128);
  bump.wrapS=bump.wrapT=THREE.RepeatWrapping;
  bump.magFilter=bump.minFilter=THREE.LinearFilter;
  bump.repeat.set(1,2); bump.needsUpdate=true;
  const material=new THREE.MeshStandardMaterial({
    vertexColors:true,roughness:.95,metalness:0,bumpMap:bump,bumpScale:.09,
  });
  let seed=1986;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
  function column(x,sign,layer) {
    const rings=18, segments=24;
    const length=.9+Math.pow(random(),.7)*2.5;
    const width=(layer===0?.28:.16)+Math.pow(random(),1.3)*(layer===0?.86:.74);
    const depth=.27+random()*.22;
    const z=sign*((layer===0?2.25:2.5)+.1*Math.sin(x*1.7+layer*2));
    const phase=random()*Math.PI*2, lean=(random()-.5)*.35;
    const positions=[], colors=[], indices=[], uvs=[], profile=[];
    const red=.65+random()*.28;
    // Derive tip variety from each existing shape, preserving cluster placement.
    const pointiness=.5+.5*Math.sin(phase*7.13+length*3.7);
    const tipRadius=.18+.43*(1-pointiness);
    const taperStart=.62+.18*(1-pointiness);
    // Independent chipped outlines on each flank; do not consume placement RNG.
    const chip=(row,side)=>{
      const n=Math.sin(row*91.73+phase*37.19+side*173.41)*43758.5453;
      return .82+.36*(n-Math.floor(n));
    };
    for(let row=0;row<=rings;row++) {
      const t=row/rings;
      // Full-width attachment at the top; only the hanging end tapers.
      const taper=1-(1-tipRadius)*smooth((t-taperStart)/(1-taperStart));
      const swell=1+.025*Math.sin(t*12+phase)+.01*Math.sin(t*27+phase);
      const radius=taper*swell;
      const cx=x+lean*t+.06*Math.sin(t*7+phase)*Math.sin(Math.PI*t);
      const cy=-.03-t*length;
      const left=chip(row,0), right=chip(row,1);
      profile.push({x:cx+width*radius*(right-left)/2,y:cy,radius:radius*(left+right)/2});
      for(let j=0;j<=segments;j++) {
        const angle=j/segments*Math.PI*2, c=Math.cos(angle), s=Math.sin(angle);
        const flute=1+.075*Math.cos(angle*5+Math.sin(t*5+phase));
        // Concentrate asymmetry at the silhouette, leaving the dark centre intact.
        const edgeScale=1+((c<0?left:right)-1)*Math.pow(Math.abs(c),2);
        positions.push(cx+c*width*radius*flute*edgeScale,cy, z+sign*s*depth*radius*flute);
        uvs.push(j/segments,t);
        // Viewed from the side, the forward-facing middle stays near black;
        // the curved flanks rise through deep crimson to bright red edges.
        const edge=smooth((Math.abs(c)/1.25-.12)/.53);
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
      positions.push(cx/segments,cy/segments,cz/segments); colors.push(.04,.006,.009); uvs.push(.5,row/rings);
      for(let j=0;j<segments;j++) {
        const a=first+j,b=first+j+1;
        if((row===0)===(sign>0)) indices.push(center,b,a); else indices.push(center,a,b);
      }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    geometry.userData.column={profile,width,depth,z,length};
    return geometry;
  }
  for(const sign of [-1,1]) {
    const pieces=[];
    for(let layer=0;layer<2;layer++) {
      let x=-24.7+(layer===0?0:.38);
      while(x<24.8) {
        pieces.push(column(x,sign,layer));
        x+=layer===0?.62+random()*.3:.43+random()*.3;
      }
    }
    // Bake short-range contact shade at intersections, rather than broad
    // directional shadows that obscure the painted central channels.
    for(const piece of pieces) {
      const position=piece.getAttribute('position'), color=piece.getAttribute('color');
      for(let i=0;i<position.count;i++) {
        const px=position.getX(i), py=position.getY(i), pz=sign*position.getZ(i);
        let shade=1;
        for(const other of pieces) {
          if(other===piece) continue;
          const {profile,width,depth,z,length}=other.userData.column;
          const row=(-py-.03)/length*18;
          if(row<0||row>18) continue;
          const lo=Math.min(17,Math.floor(row)), f=row-lo;
          const cx=THREE.MathUtils.lerp(profile[lo].x,profile[lo+1].x,f);
          const radius=THREE.MathUtils.lerp(profile[lo].radius,profile[lo+1].radius,f);
          const dx=(px-cx)/(width*radius);
          if(Math.abs(dx)>=1) continue;
          const front=sign*z+depth*radius*Math.sqrt(1-dx*dx);
          const gap=pz-front;
          if(gap>-.04&&gap<.18) shade=Math.min(shade,.62+.38*smooth(Math.max(0,gap)/.18));
        }
        color.setXYZ(i,color.getX(i)*shade,color.getY(i)*shade,color.getZ(i)*shade);
      }
    }
    const geometry=mergeGeometries(pieces);
    for(const piece of pieces) piece.dispose();
    const mesh=new THREE.Mesh(geometry,material);
    mesh.name=sign>0?'Front overlapping rock columns':'Rear overlapping rock columns';
    // Intersecting clusters must not cast dark bands across neighbouring rims.
    mesh.castShadow=false; mesh.receiveShadow=true;
    root.add(mesh);
  }
  return root;
}
