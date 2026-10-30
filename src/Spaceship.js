import * as THREE from 'three';

// Small landed ship, modelled in Y-up game coordinates, front detail toward +Z.
export function createSpaceship() {
  const ship=new THREE.Group(); ship.name='Blob spaceship';
  const silver=new THREE.MeshStandardMaterial({color:0xaeb6b8,metalness:.65,roughness:.35});
  const pale=new THREE.MeshStandardMaterial({color:0xd7dcda,metalness:.45,roughness:.3});
  const dark=new THREE.MeshStandardMaterial({color:0x20282b,metalness:.4,roughness:.65});
  const inside=new THREE.MeshStandardMaterial({color:0x0b1014,roughness:.95});
  const glass=new THREE.MeshPhysicalMaterial({color:0x9dd6db,metalness:0,roughness:.1,
    transparent:true,opacity:.35,transmission:.45,thickness:.06,ior:1.45,
    side:THREE.DoubleSide,depthWrite:false});
  function add(geometry,material,x,y,z,parent=ship) {
    const mesh=new THREE.Mesh(geometry,material); mesh.position.set(x,y,z);
    mesh.castShadow=material!==glass; mesh.receiveShadow=true; parent.add(mesh); return mesh;
  }
  function pipe(points,radius=.075,material=silver,parent=ship) {
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    return add(new THREE.TubeGeometry(curve,32,radius,8,false),material,0,0,0,parent);
  }
  function strut(a,b,r=.085,material=silver) {
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
    const mesh=add(new THREE.CylinderGeometry(r,r,delta.length(),10),material,...start.clone().add(end).multiplyScalar(.5).toArray());
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    return mesh;
  }
  // Rounded lower fuselage around an open, recessed cockpit.
  const hull=add(new THREE.SphereGeometry(1,32,20),silver,-.35,1.18,0);
  hull.scale.set(1.45,.58,.85);
  const cockpit=add(new THREE.CylinderGeometry(.92,.72,.18,32),inside,-.88,1.66,0);
  cockpit.scale.z=.85;
  const lip=add(new THREE.TorusGeometry(.92,.055,8,40),pale,-.88,1.76,0);
  lip.rotation.x=Math.PI/2; lip.scale.y=.85;
  const seat=add(new THREE.BoxGeometry(.42,.40,.35),dark,-.8,1.72,-.2);
  seat.rotation.z=-.12;
  // Prominent rectangular engine and its recessed front badge.
  add(new THREE.BoxGeometry(1.42,.90,1.32),silver,.48,1.20,.06);
  add(new THREE.BoxGeometry(1.19,.64,.045),dark,.48,1.22,.745);
  add(new THREE.BoxGeometry(1.08,.55,.04),pale,.48,1.22,.78);
  const canvas=document.createElement('canvas'); canvas.width=256; canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#d7dcda';ctx.fillRect(0,0,256,128);
  ctx.fillStyle='#172024';ctx.font='bold 108px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('14',128,67);
  const badge=new THREE.CanvasTexture(canvas); badge.colorSpace=THREE.SRGBColorSpace;
  add(new THREE.PlaneGeometry(.99,.49),new THREE.MeshBasicMaterial({map:badge}),.48,1.22,.807);
  for(const x of [-.04,.99]) for(const y of [.96,1.48])
    add(new THREE.SphereGeometry(.032,8,6),dark,x,y,.82);
  // The exhaust mouths are real deep bores, with broad silver rims.
  for(const [x,y] of [[.38,2.74],[1.28,2.35]]) {
    strut([.64,1.56,-.25],[x,y,-.18],.19,dark);
    pipe([[.48,1.64,.25],[.75,1.98,.34],[x,y-.24,.12],[x,y,-.15]],.10,pale);
    const exhaust=new THREE.Group(); exhaust.position.set(x,y,-.12);
    exhaust.rotation.y=Math.PI/2; ship.add(exhaust);
    const barrel=add(new THREE.CylinderGeometry(.39,.34,.85,24,true),silver,0,0,0,exhaust);
    barrel.rotation.x=Math.PI/2;
    add(new THREE.CircleGeometry(.30,24),inside,0,0,-.40,exhaust);
    add(new THREE.TorusGeometry(.34,.075,10,28),pale,0,0,.44,exhaust);
    const sleeve=add(new THREE.CylinderGeometry(.29,.29,.80,24,true),dark,0,0,0,exhaust);
    sleeve.rotation.x=Math.PI/2; sleeve.material=dark.clone(); sleeve.material.side=THREE.DoubleSide;
  }
  // Three splayed landing legs with broad pads.
  for(const [a,b] of [
    [[-1.12,.95,.45],[-1.65,.18,.72]],
    [[.94,.88,.43],[1.50,.18,.70]],
    [[.10,.88,-.5],[.22,.18,-.95]],
  ]) {
    strut(a,b,.095);
    add(new THREE.SphereGeometry(.14,12,8),dark,...a);
    const pad=add(new THREE.SphereGeometry(1,16,10),silver,b[0],.095,b[2]);
    pad.scale.set(.36,.095,.25);
  }
  // Open canopy: hinge on the nose, swung up and forward away from the cockpit.
  const visor=new THREE.Group(); visor.position.set(-1.82,1.66,0); visor.rotation.z=1.12; ship.add(visor);
  const dome=add(new THREE.SphereGeometry(1.37,36,20,0,Math.PI*2,0,Math.PI/2),glass,.94,0,0,visor);
  dome.scale.set(1,.95,.85);
  const rim=add(new THREE.TorusGeometry(1.37,.055,8,48),pale,.94,0,0,visor);
  rim.rotation.x=Math.PI/2; rim.scale.y=.85;
  for(const z of [-.95,.95]) {
    add(new THREE.SphereGeometry(.12,12,8),silver,-1.82,1.66,z);
    pipe([[-1.52,1.57,z],[-1.88,1.84,z],[-1.96,2.08,z]],.045,dark);
  }
  return ship;
}
