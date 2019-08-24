const glsl = require( 'glslify' )

const textures = {
  checkers: {
    name:'checkers',
    glsl:`          
        vec3 checkers( vec3 pos, vec3 normal, float size, vec3 color1, vec3 color2 ) {
          vec3 tex;
          pos  = pos * size;
          if ((int(floor(pos.x) + floor(pos.y) + floor(pos.z)) & 1) == 0) {
            tex = color1;//vec3(.5);
          }else{
            tex = color2;//vec3(0.);
          }

          return tex;
        }`,
    parameters: [
      { name:'scale', type:'float', default:5 },
      { name:'color1', type:'vec3', default:[1,1,1] },
      { name:'color2', type:'vec3', default:[0,0,0] }
    ],
  },
  noise: {
    name:'noise',
    glsl:glsl`          
        #pragma glslify: snoise = require('glsl-noise/simplex/3d')
        vec3 noise( vec3 pos, vec3 normal, float scale ) {
          float n = snoise( pos*scale );
          return vec3( n );
        }`,
    parameters: [
      { name:'scale', type:'float', default:2 }
    ],
  },
  arcs: {
    name:'arcs',
    glsl:`          
        vec3 arcs( vec3 pos, vec3 nor, float scale, vec3 color ) {
          vec3 tex;
          tex = vec3( color - smoothstep(0.3, 0.32, length(fract(abs(pos)*scale) )) );
          return tex;
        }` ,
    parameters: [
      { name:'scale', type:'float', default:5 },
      { name:'color', type:'vec3', default:[1,1,1] }
    ],
  },
  dots: {
    name:'dots',
    glsl:`          
        vec3 dots( vec3 pos, vec3 nor, float count, vec3 color ) {
          vec3 tex;
          tex = vec3( color - smoothstep(0.3, 0.32, length(fract(pos*(round(count/2.)+.5)) -.5 )) );
          return tex;
        }` ,
    parameters: [
      { name:'scale', type:'float', default:5 },
      { name:'color', type:'vec3', default:[1,1,1] }
    ],
  },
  stars: {
    name:'stars',
    glsl:`          
        vec3 stars( vec3 pos, vec3 nor, float scale, vec3 color ) {
          vec3 tex;
          tex = vec3( color - smoothstep(0.3, 0.32, length(fract((pos.x*pos.y*pos.z)*scale) -.5 )) );
          return tex;
        }` ,
    parameters: [
      { name:'scale', type:'float', default:5 },
      { name:'color', type:'vec3', default:[1,1,1] }
    ],
  },
  stripes: {
    name:'stripes',
    glsl:`          
        vec3 stripes( vec3 pos, vec3 nor, float scale, vec3 color ) {
          vec3 tex;
          tex = vec3( color - smoothstep(0.3, 0.32, length(fract((pos.x+pos.y+pos.z)*scale) -.5 )) );
          return tex;
        }` ,
    parameters: [
      { name:'scale', type:'float', default:5 },
      { name:'color', type:'vec3', default:[1,1,1] }
    ],
  },
  cellular: {
    name:'cellular',
    glsl:glsl`
        #pragma glslify: worley3D = require(glsl-worley/worley3D.glsl)

        vec3 cellular( vec3 pos, vec3 nor, float scale, float jitter, float mode, float strength ) {
          vec2 w = worley3D( pos * scale, jitter, false );
          vec3 o;
          if( mode == 0. ) {
            o = vec3( w.x );
          } else if ( mode == 1. ) {
            o = vec3( w.y );
          } else{
            o = vec3( w.y - w.x );
          }

          return o * strength;
        }
    `,
    parameters: [
      { name:'scale', type:'float', default:1 },
      { name:'jitter', type:'float', default:1 },
      { name:'mode',  type:'float', default: 0 },
      { name:'strength', type:'float', default:2 }
    ],     
  },
  voronoi: {
    name:'voronoi',
    parameters: [
      { name:'scale', type:'float', default:1 },
      { name:'res', type:'float', default:100 }
    ],
    glsl:`
    vec3 voronoi_hash(vec3 p) {
      return fract(
          sin(vec3(dot(p, vec3(1.0, 57.0, 113.0)), dot(p, vec3(57.0, 113.0, 1.0)),
                   dot(p, vec3(113.0, 1.0, 57.0)))) *
          43758.5453);
    }

    vec3 voronoi_3d(const in vec3 x, float _res ) {
      vec3 p = floor(x);
      vec3 f = fract(x);

      float id = 0.0;
      vec2 res = vec2( _res );
      for (int k = -1; k <= 1; k++) {
        for (int j = -1; j <= 1; j++) {
          for (int i = -1; i <= 1; i++) {
            vec3 b = vec3(float(i), float(j), float(k));
            vec3 r = vec3(b) - f + voronoi_hash(p + b);
            float d = dot(r, r);

            float cond = max(sign(res.x - d), 0.0);
            float nCond = 1.0 - cond;

            float cond2 = nCond * max(sign(res.y - d), 0.0);
            float nCond2 = 1.0 - cond2;

            id = (dot(p + b, vec3(1.0, 57.0, 113.0)) * cond) + (id * nCond);
            res = vec2(d, res.x) * cond + res * nCond;

            res.y = cond2 * d + nCond2 * res.y;
          }
        }
      }

      return vec3(sqrt(res), abs(id));
    }

    vec3 voronoi( vec3 pos, vec3 nor, float scale, float res, float offset ) {
      vec3 v = voronoi_3d( offset * pos * scale, res );
      return vec3( v.x );
    }
`
  }
}

module.exports = textures
