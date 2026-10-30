import * as THREE from 'three';
import {createRockColumns} from './RockColumns.js';

// A solid block with long bark-like relief; only its lower fringe tapers.
export function createRockSection({width=6,height=6,depth=3}={}) {
  const root=new THREE.Group();
  root.name='Tall ridged rock section';
  const bodyHeight=Math.max(.5,height-1);
  const core=new THREE.Mesh(new THREE.BoxGeometry(width,bodyHeight,depth),
    new THREE.MeshStandardMaterial({color:0x340304,roughness:.8}));
  core.position.y=-bodyHeight/2;
  core.castShadow=true; core.receiveShadow=true;
  root.add(core);
  root.add(createRockColumns({span:width,bodyHeight,halfDepth:depth/2}));
  return root;
}
