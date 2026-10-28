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
  // A broad, uneven quarter-round shoulder replaces the hard top/front crease.
  // Its inner edge stays well outside Blob's fixed-depth walking lane.
  const radius=x=>.45+.07*Math.sin(x*1.1)+.04*Math.sin(x*3.3+.8);
  const radiusSlope=x=>.077*Math.cos(x*1.1)+.132*Math.cos(x*3.3+.8);
  const top = new THREE.PlaneGeometry(50, 5, 200, 8);
  top.rotateX(-Math.PI / 2);
  const topPositions=top.attributes.position, topUV=top.attributes.uv;
  for(let i=0;i<topPositions.count;i++) {
    const x=topPositions.getX(i), z=topPositions.getZ(i)*(2.5-radius(x))/2.5;
    topPositions.setXYZ(i,x,0,z);
    topUV.setXY(i,(x+25)/4,(2.5-z)/4);
  }
  add(top,topMaterial);
  for(const sign of [-1,1]) {
    const shoulder=new THREE.PlaneGeometry(50,1,200,10);
    const p=shoulder.attributes.position, uv=shoulder.attributes.uv, normals=shoulder.attributes.normal;
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i), t=1-uv.getY(i), angle=t*Math.PI/2;
      const r=radius(x), sn=Math.sin(angle), cs=Math.cos(angle);
      p.setXYZ(i,x,-r*(1-cs),sign*(2.5-r+r*sn));
      const normal=new THREE.Vector3(radiusSlope(x)*(sn+cs-1),cs,sign*sn).normalize();
      normals.setXYZ(i,normal.x,normal.y,normal.z);
      uv.setXY(i,(x+25)/4,1-(r*angle)/3.2);
    }
    if(sign<0) {
      const index=shoulder.index;
      for(let i=0;i<index.count;i+=3) {
        const first=index.getX(i); index.setX(i,index.getX(i+2)); index.setX(i+2,first);
      }
    }
    add(shoulder);
  }
  for (const sign of [-1,1]) {
    const skirt = new THREE.PlaneGeometry(50, 2.4, 200, 12);
    const positions = skirt.attributes.position, uv = skirt.attributes.uv;
    for (let i=0;i<positions.count;i++) {
      const x=positions.getX(i), v=1-uv.getY(i);
      // Unequal pointed lobes rather than a repeating scalloped trim.
      const ridge=Math.pow(.5+.5*Math.sin(x*2.1+.7*Math.sin(x*.83)),3);
      const depth=1.65+ridge*(.9+.65*(.5+.5*Math.sin(x*.61+1.3)))+.17*Math.sin(x*6.7);
      const bulge=.14*Math.sin(Math.PI*v)**2*Math.sin(x*3.1+v*4);
      const r=radius(x), y=-r-v*(depth-r);
      positions.setXYZ(i,x,y,sign*(2.5+bulge));
      // Continue the curved shoulder's texture distance down the rock face.
      uv.setXY(i,(x+25)/4,1-(r*Math.PI/2+v*(depth-r))/3.2);
    }
    if (sign<0) {
      // Reverse winding for the back face; retain the same continuous rim.
      const index=skirt.index;
      for(let i=0;i<index.count;i+=3) {
        const first=index.getX(i); index.setX(i,index.getX(i+2)); index.setX(i+2,first);
      }
    }
    skirt.computeVertexNormals();
    // The shoulder ends vertically: match that tangent along the shared rim.
    for(let i=0;i<=200;i++) skirt.attributes.normal.setXYZ(i,0,0,sign);
    add(skirt);
  }
  for (const sign of [-1,1]) {
    // End caps follow the same rounded profile, avoiding square protruding ears.
    const r=radius(sign*25), outline=new THREE.Shape();
    outline.moveTo(-2.5,-2.4); outline.lineTo(2.5,-2.4); outline.lineTo(2.5,-r);
    for(let i=10;i>=0;i--) {
      const angle=i/10*Math.PI/2;
      outline.lineTo(2.5-r+r*Math.sin(angle),-r*(1-Math.cos(angle)));
    }
    outline.lineTo(-2.5+r,0);
    for(let i=0;i<=10;i++) {
      const angle=i/10*Math.PI/2;
      outline.lineTo(-2.5+r-r*Math.sin(angle),-r*(1-Math.cos(angle)));
    }
    outline.closePath();
    const end=new THREE.ShapeGeometry(outline), uv=end.attributes.uv, p=end.attributes.position;
    for(let i=0;i<uv.count;i++) uv.setXY(i,(p.getX(i)+2.5)/4,1+p.getY(i)/3.2);
    end.rotateY(sign*Math.PI/2);
    end.translate(sign*25,0,0);
    add(end);
  }
  scene.add(root);
  return root;
}
