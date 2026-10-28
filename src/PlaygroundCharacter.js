import * as THREE from 'three';
import {setupBlobCharacter} from './BlobCharacter.js';
import {createEyeAnimator} from './EyeAnimator.js';
import {gaitPose} from './WalkAnimator.js';

// Approved animation parameters; the original viewer retains its full controls.
const settings = {curiosity: {value: 1}, turn: {value: 12}};
export class PlaygroundCharacter {
  constructor(model, scene) {
    this.root = new THREE.Group();
    scene.add(this.root);
    // Map model +Z up to game +Y up without editing the approved mesh.
    this.root.rotation.x = -Math.PI / 2;
    this.facing = new THREE.Group();
    this.root.add(this.facing);
    this.shell = new THREE.Group();
    this.facing.add(this.shell);
    this.eyes = createEyeAnimator(id => settings[id], () => true);
    Object.assign(this, setupBlobCharacter(model, this.facing, this.shell, this.eyes));
    this.cycles = 0;
    this.weight = 0;
  }
  reset() { this.cycles = 0; this.weight = 0; this.eyes.resetEyes(); }
  update(dt, motion) {
    const moving = motion.distance > 0;
    // Fade a stopped stride back into the original grounded standing mesh.
    this.weight = THREE.MathUtils.damp(this.weight, moving ? 1 : 0, 22, dt);
    if (moving) this.cycles += motion.distance / 2.5;
    const {shell, legs, antennas, cycles, weight} = this;
    const L=2.5, stance=.62, lift=.22, hip=.10;
    const heel=THREE.MathUtils.degToRad(23), toe=THREE.MathUtils.degToRad(28);
    const phase=Math.sin(2*Math.PI*cycles), bodyY=-L*cycles;
    const bodyX=.012*phase*weight;
    shell.position.set(bodyX,0,.010*.5*(1-Math.cos(4*Math.PI*cycles))*weight);
    shell.rotation.set(0,.006*phase*weight,this.eyes.animateEyes(dt)+.007*phase*weight);
    this.root.position.set(motion.x,motion.y,0);
    this.facing.rotation.z=motion.angle;
    for(const a of antennas) a.pivot.rotation.x=THREE.MathUtils.degToRad(12)*Math.sin(2*Math.PI*cycles+a.offset)*weight;
  for(const f of legs){
   const pose=gaitPose(f,cycles+f.offset,L,stance,lift,heel,toe);
   const ankleWorld=new THREE.Vector3(f.ankle.x+bodyX,pose.y-bodyY,pose.z);
   // Recenter the approved gait around the movable character root.
   const localDZ=.32;
   const desiredHipY=hip*Math.sin(2*Math.PI*(cycles+f.offset));
   const difference=THREE.MathUtils.clamp(desiredHipY-ankleWorld.y,-.20,.20);
   const upperAngle=THREE.MathUtils.clamp(-Math.asin(difference/localDZ),-.62,.62);
   // Animate a single connected topology. Only vertices in the narrow ankle
   // transition (.33-.62 high) interpolate between the upper and foot poses.
   // Translation and rotation never separate because both share ankleWorld.
   const footCos=Math.cos(pose.angle), footSin=Math.sin(pose.angle);
   const upCos=Math.cos(upperAngle),upSin=Math.sin(upperAngle);
   const orig=f.original, weights=f.weights, dst=f.geometry.attributes.position;
   for(let i=0;i<weights.length;i++){
    const j=3*i,x=orig[j]-f.ankle.x,y=orig[j+1]-f.ankle.y,z=orig[j+2]-f.ankle.z;
    const w=weights[i],a=footCos*(1-w)+upCos*w,b=footSin*(1-w)+upSin*w;
    dst.array[j]=orig[j]+weight*(ankleWorld.x+x-orig[j]);
    dst.array[j+1]=orig[j+1]+weight*(ankleWorld.y+y*a-z*b-orig[j+1]);
    dst.array[j+2]=orig[j+2]+weight*(ankleWorld.z+y*b+z*a-orig[j+2]);
   }
   dst.needsUpdate=true;
   f.geometry.computeVertexNormals();

  }
  }
}
