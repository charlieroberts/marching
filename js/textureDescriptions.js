const glsl = require( 'glslify' )

const textures = {
  image: {
    name:'image',
    glsl2d:`
      vec3 image2d( vec2 uv, float scale, vec3 mod, float strength ) {
        return texture( textures[ 0 ], (uv+mod)*scale ).xyz * strength;
      }
    `,
    parameters:[
      { name:'scale', type:'float', default:1 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'strength', type:'float', default:1 },   
    ]
  },
  canvas: {
    name:'canvas',
    glsl2d:`
      vec3 canvas2d( vec2 uv, float scale, vec3 mod, float strength ) {
        return texture( textures[ 0 ], (uv+mod)*scale ).xyz * strength;
      }
    `,
    parameters:[
      { name:'scale', type:'float', default:1 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'strength', type:'float', default:1 },   
    ]
  },
  feedback: {
    name:'feedback',
    glsl2d:`
      vec3 feedback2d( vec2 uv, float scale, float mod, float strength ) {
        return texture( textures[ 0 ], (uv+mod)*scale ).xyz * strength;
      }
    `,
    parameters:[
      { name:'scale', type:'float', default:1 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'strength', type:'float', default:1 },   
    ]
  },
  rainbow: {
    name:'rainbow',
    parameters: [
      { name:'strength', type:'float', default:1 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'shift', type:'float', default:0 },
      { name:'scale', type:'float', default:1 },
    ],
    glsl:` 
    vec3 rainbow( vec3 pos, float strength, vec3 mod, float shift, float scale ) {
      pos = (pos+mod) * scale;
      vec3 a = vec3(0.5,0.5,0.5), b = vec3(0.5,0.5,0.5), c = vec3(1.0,1.0,1.0),d = vec3(0.0,0.33,0.67);
      return a + b * cos( 6.283818 * ( c * mod(length(pos) + shift, 1. ) + d ) ) * strength;
    }` 
  },
  checkers: {
    name:'checkers',
    glsl:`          
        vec3 checkers( vec3 pos, float size, vec3 mod, vec3 color1, vec3 color2 ) {
          vec3 tex;
          pos  = (pos+mod) * size;
          if ((int(floor(pos.x) + floor(pos.y) + floor(pos.z)) & 1) == 0) {
            tex = color1;
          }else{
            tex = color2;
          }

          return tex;
        }`,
    glsl2d:`
        vec3 checkers2d( vec2 uv, float size, vec3 mod, vec3 color1, vec3 color2 ) {
          float fmodResult = mod(floor(size * (uv.x+mod.x)) + floor(size * (uv.y+mod.y)), 2.0);
          float fin = max(sign(fmodResult), 0.0); 

          return vec3(fin);
        }
    `,
    parameters: [
      { name:'scale',  type:'float', default:5 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'color1', type:'vec3', default:[1,1,1] },
      { name:'color2', type:'vec3', default:[0,0,0] }
    ],
  },
  noise: {
    name:'noise',
    glsl:glsl`          
        #pragma glslify: snoise = require('glsl-noise/simplex/4d')
        vec3 noise( vec3 pos, float scale, vec3 mod, float strength, float time ) {
          float n = snoise( vec4((pos+mod)*scale, time) );
          return vec3( n ) * strength;
        }`,
    glsl2d:glsl`    
        #pragma glslify: snoise = require('glsl-noise/simplex/3d')
        vec3 noise2d( vec2 st, float scale, vec3 mod, float strength, float time ) {
          float col = snoise( vec3( (st+mod.xy), time ) * scale );

          return vec3(col) * strength;
        }
` ,
    parameters: [
      { name:'scale', type:'float', default:2 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'strength', type:'float', default:.1 },
      { name:'time', type:'float', default:1 }
    ],
  },
  // adapted from https://thebookofshaders.com/10/
  truchet: {
    name:'truchet',
    glsl2d:`    
        float random_truchet(in vec2 _st) {
          return fract(sin(dot(_st.xy,
                         vec2(12.9898,78.233)))*
                        43758.5453123);
        }

        vec2 truchetPattern(in vec2 _st, in float _index){
            _index = fract(((_index-0.5)*2.0));
            if (_index > 0.75) {
                _st = vec2(1.0) - _st;
            } else if (_index > 0.5) {
                _st = vec2(1.0-_st.x,_st.y);
            } else if (_index > 0.25) {
                _st = 1.0-vec2(1.0-_st.x,_st.y);
            }
            return _st;
        }

        vec3 truchet2d( vec2 st, float scale, vec3 mod, vec3 color ) {
            st = (st+mod.xy) * scale;
            vec2 ipos = floor(st);  // integer
            vec2 fpos = fract(st);  // fraction

            vec2 tile = truchetPattern(fpos, random_truchet( ipos ));

            float col = smoothstep(tile.x-0.3,tile.x,tile.y)-smoothstep(tile.x,tile.x+.3,tile.y);
            return color * col;
        }

` ,
    parameters: [
      { name:'scale', type:'float', default:10 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'color', type:'vec3', default:[1,1,1] }
    ],
  },
  dots: {
    name:'dots',
    glsl:`          
        vec3 dots( vec3 pos, float count, float radius, vec3 color ) {
          vec3 tex;
          tex = vec3( color - smoothstep( radius, radius+.02, length(fract(pos*(round(count/2.)+.5)) -.5 )) );
          return tex;
        }` ,
    glsl2d:`
      vec2 tile(vec2 _st, float _zoom){
        _st *= _zoom;
        return fract(_st);
      }

      float circle(vec2 _st, float _radius){
        vec2 pos = vec2(0.5)-_st;
        _radius *= 0.75;
        return 1.-smoothstep(_radius-(_radius*0.05),_radius+(_radius*0.05),dot(pos,pos)*3.14);
      }
    
      vec3 dots2d( vec2 _st, float scale, vec3 mod, float radius, vec3 color ) {
        vec2 st = tile((_st+mod.xy,scale);
        vec3 fin = vec3(circle(st, radius)) * color;
        return fin;
      }
    `,
    parameters: [
      { name:'scale', type:'float', default:5 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'radius', type:'float', default:.3 },
      { name:'color', type:'vec3', default:[1,1,1] }
    ],
  },
  stripes: {
    name:'stripes',
    glsl:`          
        vec3 stripes( vec3 pos, float scale, vec3 mod, vec3 color ) {
          vec3 tex;
          pos = pos + mod;
          tex = vec3( color - smoothstep(0.3, 0.32, length(fract((pos.x+pos.y+pos.z)*scale) -.5 )) );
          return tex;
        }` ,
    parameters: [
      { name:'scale', type:'float', default:5 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'color', type:'vec3', default:[1,1,1] }
    ],
  },
  cellular: {
    name:'cellular',
    glsl:glsl`
        #pragma glslify: worley3D = require(glsl-worley/worley3D.glsl)

        vec3 cellular( vec3 pos, float scale, vec3 mod, float jitter, float mode, float strength, float time ) {
          vec2 w = worley3D( (pos+mod) * scale + time, jitter, false );
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
    glsl2d:glsl`
        #pragma glslify: worley3D = require(glsl-worley/worley3D.glsl)

        vec3 cellular( vec3 pos, float scale, float jitter, float mode, float strength ) {
          vec2 w = worley3D( pos, jitter, false );
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

        vec3 cellular2d( vec2 st, float scale, vec3 mod, float jitter, float mode, float strength, float time ) {
          return cellular( vec3((st+mod.xy) * scale, time), nor, scale, jitter, mode, strength );
        }
    `,
    parameters: [
      { name:'scale', type:'float', default:1 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'jitter', type:'float', default:1 },
      { name:'type',  type:'float', default: 0 },
      { name:'strength', type:'float', default:2 },
      { name:'time', type:'float', default:1 }
    ],     
  },

  voronoi: {
    name:'voronoi',
    parameters: [
      { name:'scale', type:'float', default:1 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'res', type:'float', default:100 },
      { name:'time', type:'float', default:1 },
      { name:'mode', type:'float', default:0 }
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

    vec3 voronoi( vec3 pos, float scale, vec3 mod, float res, float time, float mode ) {
      vec3 v = voronoi_3d( (pos+mod) * scale, res );
      vec3 fin;
      if( mode == 0. ) fin = vec3(v.x);
      if( mode == 1. ) fin = vec3(v.y);
      if( mode == 2. ) fin = vec3(v.y - v.x); 

      return fin;
    }
`,
    glsl2d:glsl`    
    vec3 voronoi_hash(vec3 p) {
      return fract(
          sin(vec3(dot(p, vec3(1.0, 57.0, 113.0)), dot(p, vec3(57.0, 113.0, 1.0)),
                   dot(p, vec3(113.0, 1.0, 57.0)))) * 43758.5453);
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

    vec3 voronoi2d( vec2 st, float scale, vec3 mod, float res, float time, float mode ) {
      vec3 v = voronoi_3d( vec3((st+mod.xy) * scale, time), res );
      vec3 fin;
      if( mode == 0. ) fin = vec3(v.x);
      if( mode == 1. ) fin = vec3(v.y);
      if( mode == 2. ) fin = vec3(v.y - v.x); 

      return fin;
    }

` ,
  },
  // adapted from https://thebookofshaders.com/edit.php#09/zigzag.frag
  zigzag: {
    name:'zigzag',
    glsl2d:`    
       vec2 mirrorTile(vec2 _st, float _zoom){
         _st *= _zoom;
         if (fract(_st.y * 0.5) > 0.5){
           _st.x = _st.x+0.5;
           _st.y = 1.0-_st.y;
         }
         return fract(_st);
       }

       float fillY(vec2 _st, float _pct,float _antia){
         return smoothstep( _pct-_antia, _pct, _st.y);
       }

       vec3 zigzag2d( vec2 st, float scale, vec3 mod, float time ) {
         st = mirrorTile((st+mod.xy)*vec2(1.,2.),scale);
         float x = st.x*2.;
         float a = floor(1.+sin(x*3.14));
         float b = floor(1.+sin((x+1.)*3.14));
         float f = fract(x);

         vec3 color = vec3( fillY(st,mix(a,b,f),0.01) ); 

         return vec3(color);
       }
` ,
    parameters: [
      { name:'scale', type:'float', default:5 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'time', type:'float', default:1 }
    ],
  }
}

module.exports = textures
