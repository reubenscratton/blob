import * as THREE from 'three';

const COUNT=6, SEGMENTS=10, COOLDOWN=.2, SPEED=42, LIFETIME=1.2;
// A fixed pool keeps both GPU light count and projectile allocations stable.
export class ElectricBolts {
  constructor(scene) {
    this.cooldown=0;
    this.material=new THREE.ShaderMaterial({
      transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
      side:THREE.DoubleSide, toneMapped:false,
      vertexShader:`attribute float edge; varying float vEdge;
        void main(){vEdge=edge;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`varying float vEdge;
        void main(){
          float halo=exp(-vEdge*vEdge*5.0);
          float core=exp(-vEdge*vEdge*180.0);
          vec3 color=mix(vec3(1.0,.55,.015),vec3(1.0,.96,.65),core);
          gl_FragColor=vec4(color,halo*.55+core*.8);
        }`,
    });
    this.bolts=Array.from({length:COUNT},(_,index)=>{
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array((SEGMENTS+1)*6),3).setUsage(THREE.DynamicDrawUsage));
      geometry.setAttribute('edge',new THREE.Float32BufferAttribute(Array.from({length:SEGMENTS+1},()=>[-1,1]).flat(),1));
      const indices=[];
      for(let i=0;i<SEGMENTS;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
      geometry.setIndex(indices);
      const mesh=new THREE.Mesh(geometry,this.material);
      mesh.visible=false; mesh.frustumCulled=false;
      mesh.renderOrder=2;
      scene.add(mesh);
      const light=new THREE.PointLight(0xffc32e,0,7,2);
      scene.add(light);
      return {mesh,light,age:LIFETIME,index,direction:1,length:1};
    });
  }
  fire(motion,width,height) {
    if(this.cooldown>0) return false;
    const bolt=this.bolts.find(b=>!b.mesh.visible);
    if(!bolt) return false;
    this.cooldown=COOLDOWN;
    bolt.age=0; bolt.length=width*.8; bolt.direction=motion.direction;
    bolt.mesh.position.set(motion.x+bolt.direction*(width*.5+bolt.length*.5+.12),motion.y+height*.45,0);
    bolt.mesh.scale.x=bolt.direction;
    bolt.mesh.visible=true;
    this.shape(bolt);
    bolt.light.position.copy(bolt.mesh.position);
    bolt.light.intensity=35;
    return true;
  }
  shape(bolt) {
    const positions=bolt.mesh.geometry.attributes.position;
    for(let i=0;i<=SEGMENTS;i++) {
      const t=i/SEGMENTS;
      const zigzag=(i===0||i===SEGMENTS)?0:(i%2?1:-1)*(.13+.035*Math.sin(bolt.age*70+i*9+bolt.index));
      // Broad golden halo around a thicker warm-white electric core.
      positions.setXYZ(i*2,(t-.5)*bolt.length,zigzag-.30,0);
      positions.setXYZ(i*2+1,(t-.5)*bolt.length,zigzag+.30,0);
    }
    positions.needsUpdate=true;
  }
  update(dt) {
    this.cooldown=Math.max(0,this.cooldown-dt);
    for(const bolt of this.bolts) {
      if(!bolt.mesh.visible) continue;
      bolt.age+=dt;
      if(bolt.age>=LIFETIME) {bolt.mesh.visible=false;bolt.light.intensity=0;continue;}
      bolt.mesh.position.x+=bolt.direction*SPEED*dt;
      this.shape(bolt);
      bolt.light.position.copy(bolt.mesh.position);
      const fade=Math.min(1,(LIFETIME-bolt.age)/.15);
      bolt.light.intensity=(30+5*Math.sin(bolt.age*90+bolt.index))*fade;
    }
  }
  clear() {
    this.cooldown=0;
    for(const bolt of this.bolts) {bolt.mesh.visible=false;bolt.light.intensity=0;bolt.age=LIFETIME;}
  }
}
