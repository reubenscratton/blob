import * as THREE from 'three';

// Blend independently chosen tiles at their borders. Side tiles may mirror but
// never rotate; tops may turn 180 degrees, preserving the same channel axis.
export function createLavaMaterial(textures, vertical = false) {
  const bumps = textures.map(texture => {
    const bump=texture.clone(); bump.colorSpace=THREE.NoColorSpace; bump.needsUpdate=true;
    return bump;
  });
  const material = new THREE.MeshStandardMaterial({
    map:textures[0], bumpMap:bumps[0], bumpScale:.12,
    roughness:.94, metalness:0,
  });
  material.customProgramCacheKey = () => `lava-variants-${vertical}`;
  material.onBeforeCompile = shader => {
    textures.forEach((texture,i) => {
      shader.uniforms[`lavaColor${i}`]={value:texture};
      shader.uniforms[`lavaHeight${i}`]={value:bumps[i]};
    });
    const uniforms=textures.map((_,i)=>`uniform sampler2D lavaColor${i};\nuniform sampler2D lavaHeight${i};`).join('\n');
    const choices=textures.map((_,i)=>`if (tile < ${i+.5}) return heightMap ? texture2D(lavaHeight${i}, p) : texture2D(lavaColor${i}, p);`).join('\n');
    const helpers=`
${uniforms}
float lavaHash(vec2 cell) {
  return fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);
}
vec4 lavaTile(vec2 p, vec2 cell, bool heightMap) {
  float h=lavaHash(cell);
  ${vertical ? '' : 'if(fract(h*17.13)>.5) p=1.0-p;'}
  if(fract(h*31.7)>.5) p.x=1.0-p.x;
  p+=vec2(fract(h*13.1),fract(h*7.3));
  // Sides use only the three vertically fluted variants; tops use all four.
  float tile=${vertical ? '1.0+floor(h*3.0)' : 'floor(h*4.0)'};
  ${choices}
  return vec4(0.0);
}
vec4 lavaSample(vec2 uv, bool heightMap) {
  vec2 cell=floor(uv), p=fract(uv);
  vec2 blend=smoothstep(vec2(.78),vec2(1.0),p);
  vec4 a=lavaTile(p,cell,heightMap);
  vec4 b=lavaTile(p-vec2(1,0),cell+vec2(1,0),heightMap);
  vec4 c=lavaTile(p-vec2(0,1),cell+vec2(0,1),heightMap);
  vec4 d=lavaTile(p-vec2(1,1),cell+vec2(1,1),heightMap);
  return mix(mix(a,b,blend.x),mix(c,d,blend.x),blend.y);
}
`;
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <map_pars_fragment>', '#include <map_pars_fragment>\n'+helpers)
      .replace('#include <map_fragment>', THREE.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )','lavaSample( vMapUv, false )'))
      .replace('#include <bumpmap_pars_fragment>', THREE.ShaderChunk.bumpmap_pars_fragment.replace(/texture2D\( bumpMap, ([^)]+)\)/g,'lavaSample( $1, true )'));
  };
  return material;
}
