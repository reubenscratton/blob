import * as THREE from 'three';
import {createLavaMaterial} from './LavaMaterial.js';

// Flat gameplay surface, with relief supplied by the material and exposed skirt.
// The decorative lower edge never changes the player's collision plane (Y=0).
export async function createLavaFloor(scene, renderer) {
  const loader=new THREE.TextureLoader();
  const textures=await Promise.all(['cooled-lava','cooled-lava-a','cooled-lava-b','cooled-lava-c']
    .map(name=>loader.loadAsync(`/assets/textures/${name}.png`)));
  for(const texture of textures) {
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  }
  const topMaterial=createLavaMaterial(textures);
  const sideMaterial=createLavaMaterial(textures,true);
  const root = new THREE.Group();
  root.name = 'Cooled lava platform';
  const add = (geometry, material = sideMaterial) => {
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
  add(top,topMaterial);
  for (const sign of [-1,1]) {
    const skirt = new THREE.PlaneGeometry(50, 2.4, 200, 12);
    const positions = skirt.attributes.position, uv = skirt.attributes.uv;
    for (let i=0;i<positions.count;i++) {
      const x=positions.getX(i), v=1-uv.getY(i);
      // Unequal pointed lobes rather than a repeating scalloped trim.
      const ridge=Math.pow(.5+.5*Math.sin(x*2.1+.7*Math.sin(x*.83)),3);
      const depth=1.65+ridge*(.9+.65*(.5+.5*Math.sin(x*.61+1.3)))+.17*Math.sin(x*6.7);
      const bulge=.14*Math.sin(Math.PI*v)*Math.sin(x*3.1+v*4);
      positions.setXYZ(i,x,-v*depth,sign*(2.5+bulge));
      uv.setXY(i,(x+25)/4,1-v*depth/3.2);
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
