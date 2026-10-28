import * as THREE from 'three';

// Flat gameplay surface, with relief supplied by the material and exposed skirt.
// The decorative lower edge never changes the player's collision plane (Y=0).
export async function createLavaFloor(scene, renderer) {
  const texture = await new THREE.TextureLoader().loadAsync('/assets/textures/cooled-lava.png');
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const bump = texture.clone();
  bump.colorSpace = THREE.NoColorSpace;
  bump.needsUpdate = true;
  const material = new THREE.MeshStandardMaterial({
    map: texture, bumpMap: bump, bumpScale: .14,
    color: 0xffffff, roughness: .94, metalness: 0,
  });
  const root = new THREE.Group();
  root.name = 'Cooled lava platform';
  const add = geometry => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    root.add(mesh);
    return mesh;
  };
  // Scale UVs in world units, so the surface repeats without stretching.
  const top = new THREE.PlaneGeometry(50, 5);
  top.rotateX(-Math.PI / 2);
  const topUV = top.attributes.uv;
  for (let i=0;i<topUV.count;i++) topUV.setXY(i,topUV.getX(i)*12.5,topUV.getY(i)*1.25);
  add(top);
  for (const sign of [-1,1]) {
    const skirt = new THREE.PlaneGeometry(50, 2.4, 200, 12);
    const positions = skirt.attributes.position, uv = skirt.attributes.uv;
    for (let i=0;i<positions.count;i++) {
      const x=positions.getX(i), v=1-uv.getY(i);
      const depth=2.2+.27*Math.sin(x*2.3)+.16*Math.sin(x*5.7+.8);
      const bulge=.14*Math.sin(Math.PI*v)*Math.sin(x*3.1+v*4);
      positions.setXYZ(i,x,-v*depth,sign*(2.5+bulge));
      uv.setXY(i,(x+25)/4,1-v*depth/4);
    }
    if (sign<0) {
      // Reverse winding for the back face; retain the same continuous rim.
      const index=skirt.index;
      for(let i=0;i<index.count;i+=3) {
        const first=index.getX(i); index.setX(i,index.getX(i+2)); index.setX(i+2,first);
      }
    }
    skirt.computeVertexNormals();
    add(skirt);
  }
  for (const sign of [-1,1]) {
    const end = new THREE.PlaneGeometry(5,2.4);
    end.rotateY(sign*Math.PI/2);
    end.translate(sign*25,-1.2,0);
    const uv=end.attributes.uv;
    for(let i=0;i<uv.count;i++) uv.setXY(i,uv.getX(i)*1.25,uv.getY(i)*.6);
    add(end);
  }
  scene.add(root);
  return root;
}
