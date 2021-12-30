const glsl = require( 'glslify' )

module.exports = {
  Box: {
    parameters:[
      { name:'size', type:'vec3', default:[1,1,1], min:.001, max:5 },
    ],

    primitiveString( pName ) { 
	    return `sdBox( ${pName}, ${this.size.emit()} )`;
    },

    glslify:glsl`    #pragma glslify: sdBox		= require('glsl-sdf-primitives/sdBox')`
  }, 

  // XXX we should normalize dimensions in the shader... 
  Cone: {
    parameters:[
      { name:'dimensions', type:'vec3', default:[.8,.6,.3], min:.001, max:5 },
    ],

    primitiveString( pName ) { 
      return `sdCone( ${pName}, ${this.dimensions.emit()} )`
    },
    glslify:glsl`    #pragma glslify: sdCone	= require('glsl-sdf-primitives/sdCappedCone')`
  }, 

	Cylinder: {
    parameters:[
      { name:'dimensions', type:'vec2', default:[.8,.6], min:.001, max:5 },
    ],

    primitiveString( pName ) { 
      return `sdCappedCylinder( ${pName}, ${this.dimensions.emit()} )`
    },

    glslify:`    float sdCappedCylinder( vec3 p, vec2 h ) {
    vec2 d = abs(vec2(length(p.xz),p.y)) - h;
    return min(max(d.x,d.y),0.0) + length(max(d,0.0));
  }`
  }, 

  Capsule: {	
    parameters:[
      { name:'start', type:'vec3', default:[0,0,0], min:0, max:.5 },
      { name:'end', type:'vec3', default:[.8,1,0], min:.5, max:1 },
      { name:'radius', type:'float', default:.5, min:.001, max:5 },
    ],

    primitiveString( pName ) { 
      return `sdCapsule( ${pName}, ${this.start.emit()}, ${this.end.emit()}, ${this.radius.emit()} )`
    },
    glslify:glsl`      #pragma glslify: sdCapsule	= require('glsl-sdf-primitives/sdCapsule')`

  },

  // XXX No cylinder description
  //` #pragma glslify: sdCylinder	= require('glsl-sdf-primitives/sdCylinder')`
 	HexPrism: {
    parameters:[
      { name:'dimensions', type:'vec2', default:[.8,.6], min:.001, max:5 },
    ],

    primitiveString( pName ) { 
      return `sdHexPrism( ${pName}, ${this.dimensions.emit()} )`
    },
    glslify:glsl`      #pragma glslify: sdHexPrism	= require('glsl-sdf-primitives/sdHexPrism')`
  },

  Julia: {
    parameters:[
      { name:'fold', type:'float', default:0, min:0, max:10 },
    ],

    primitiveString( pName ) { 
      return `julia( ${pName}, ${this.fold.emit()} )`
    },

    // https://www.shadertoy.com/view/MsfGRr
    glslify:glsl`  vec4 qsqr( in vec4 a ) {
    return vec4( a.x*a.x - a.y*a.y - a.z*a.z - a.w*a.w,
                 2.0*a.x*a.y,
                 2.0*a.x*a.z,
                 2.0*a.x*a.w );
  }

  float julia( in vec3 p, float atime ){
    vec4 c = 0.45*cos( vec4(0.5,3.9,1.4,1.1) + atime * vec4(1.2,1.7,1.3,2.5) ) - vec4(0.3,0.0,0.0,0.0);
    vec4 z = vec4(p,0.);
    float md2 = 1.0;
    float mz2 = dot(z,z);

    for( int i=0; i<11; i++ ){
      md2 *= 4.0*mz2;   
      // dz -> 2·z·dz, meaning |dz| -> 2·|z|·|dz| (can take the 4 out of the loop and do an exp2() afterwards)
      z = qsqr(z) + c;  // z  -> z^2 + c

      mz2 = dot(z,z);
      if(mz2>4.0) break;
    }
    
    return 0.25*sqrt(mz2/md2)*log(mz2);  // d = 0.5·|z|·log|z| / |dz|
  }`,
  },
  KIFS: {
    parameters:[
      { name:'count', type:'float', default:8 },
      { name:'fold', type:'float', default:0 },
      { name:'radius', type:'float', default:.01 },
      { name:'threshold', type:'float', default:.004 },
      { name:'scale', type:'float', default:2 },
    ],

    primitiveString( pName ) { 
      return `kifs( ${pName}, ${this.count.emit()}, ${this.fold.emit()}, ${this.radius.emit()}, ${this.threshold.emit()}, ${this.scale.emit()} )`
    },

    // adapted from http://roy.red/folding-the-koch-snowflake-.html
    glslify:glsl`      float box( vec3 p, vec3 b ){
      vec3 d = abs(p) - b;
      return min(max(d.x,max(d.y,d.z)),0.0) +
             length(max(d,0.0));
    }
    vec2 fold(vec2 p, float ang){    
        vec2 n=vec2(cos(-ang),sin(-ang));
        p-=2.*min(0.,dot(p,n))*n;
        return p;
    }
    #define KPI 3.14159
    vec3 tri_fold(vec3 pt, float foldamt) {
        pt.xy = fold(pt.xy,KPI/3. + foldamt );
        pt.xy = fold(pt.xy,-KPI/3. + foldamt );
        pt.yz = fold(pt.yz,KPI/6.+.7 + foldamt );
        pt.yz = fold(pt.yz,-KPI/6. + foldamt );
        return pt;
    }
    vec3 tri_curve(vec3 pt, float iter, float fold, float scale ) {
        int count = int(iter);
        for(int i=0;i<count;i++){
            pt*=scale;
            pt.x-=2.6;
            pt=tri_fold(pt,fold);
        }
        return pt;
    }
    float kifs(in vec3 p, float a, float fold, float radius, float thresh, float scale ){
        p.x+=1.5;
        p=tri_curve(p,a,fold,scale);
        // uncomment below line to use spheres instead of boxes
        return (length( p*thresh ) - radius );
        //return box( p*thresh, vec3(radius) );
    }
`,
  },

  Mandalay: {
    parameters:[
      { name:'size', type:'float', default:5, min:1, max:10 },
      { name:'minrad', type:'float', default:1/3, min:0, max:1 },    
      { name:'iterations', type:'float', default:5, min:1, max:10, step:1 },    
    ],
    glslify:`                 
  float sr = 4.0;
  vec3 fo =vec3 (0.7,.9528,.9);
  vec3 gh = vec3 (.8,.7,0.5638);
  vec3 gw = vec3 (.3, 0.5 ,.2);
  vec4 X = vec4( .1,0.5,0.1,.3);
  vec4 Y = vec4(.1, 0.8, .1, .1);
  vec4 Z = vec4(.2,0.2,.2,.45902);
  vec4 R = vec4(0.19,.1,.1,.2);
  vec4 orbitTrap = vec4(40000.0);
  float DBFold( vec3 p, float fo, float g, float w ){
      if(p.z>p.y) p.yz=p.zy;
      float vx=p.x-2.*fo;
      float vy=p.y-4.*fo;
      float v=max(abs(vx+fo)-fo,vy);
      float v1=max(vx-g,p.y-w);
      v=min(v,v1);
      v1=max(v1,-abs(p.x));
      return min(v,p.x);
  }
   
  vec3 DBFoldParallel(vec3 p, vec3 fo, vec3 g, vec3 w){
    vec3 p1=p;
    p.x=DBFold(p1,fo.x,g.x,w.x);
    p.y=DBFold(p1.yzx,fo.y,g.y,w.y);
    p.z=DBFold(p1.zxy,fo.z,g.z,w.z);
    return p;
  }

  vec3 DBFoldSerial(vec3 p, vec3 fo, vec3 g,vec3 w){
    p.x=DBFold(p,fo.x,g.x,w.x);
    p.y=DBFold(p.yzx,fo.y,g.y,w.y);
    p.z=DBFold(p.zxy,fo.z,g.z,w.z);
    return p;
  }
  float sineSponge(vec3 p, float scale, float minrad, float iterations ) {
    vec4 JC=vec4(p,1.);
    float r2=dot(p,p);
    float dd = 1.;
    for(int i = 0; i<int(iterations); i++){
      p = p - clamp(p.xyz, -1.0, 1.0) * 2.0;  // mandelbox's box fold
   
      vec3 signs=sign(p);//Save 	the original signs
      p=abs(p);
      p=DBFoldParallel(p,fo,gh,gw);
      
      p*=signs;//resore signs: this way the mandelbrot set won't extend in negative directions
      

      r2=dot(p,p);
      float  t = clamp(1./r2, 1., 1./minrad);
      p*=t; dd*=t;
       

      p=p*scale+JC.xyz; dd=dd*scale+JC.w;
      p=vec3(1.0,1.0,.92)*p;
   
      r2=dot(p,p);
      orbitTrap = min(orbitTrap, abs(vec4(p.x,p.y,p.z,r2)));	
    }
    dd=abs(dd);
      #if 0
        return (sqrt(r2)-sr)/dd;//bounding volume is a sphere
      #else
        p=abs(p); return (max(p.x,max(p.y,p.z))-sr)/dd;//bounding volume is a cube
      #endif
    }
    `,
   
    primitiveString( pName ) { 
      return `sineSponge( ${pName}, ${this.size.emit()}, ${this.minrad.emit()}, ${this.iterations.emit()} )`
    }
  },  
  Mandelbulb: {
    parameters:[
      { name:'fold', type:'float', default:8, min:1, max:15 },
      { name:'iterations', type:'float', default:4, min:1, max:6, step:1 },    
    ],

    primitiveString( pName ) { 
      return `mandelbulb( ${pName}, ${this.fold.emit()}, ${this.iterations.emit()} )`
    },

    // adapted from: https://www.shadertoy.com/view/ltfSWn
    glslify:glsl`      float mandelbulb( in vec3 p, in float aa, float iterations ){
        vec3 w = p;
        float m = dot(w,w);

        vec4 trap = vec4(abs(w),m);
        float dz = 1.0;
                
        for( int i=0; i<int(iterations); i++ ) {
          dz = aa*pow(sqrt(m),aa - 1.)*dz + 1.0;

          float r = length(w);
          float b = aa*acos( w.y /r);
          float a = aa*atan( w.x, w.z );
          w = p + pow(r,aa) * vec3( sin(b)*sin(a), cos(b), sin(b)*cos(a) );

          trap = min( trap, vec4(abs(w),m) );

          m = dot(w,w);
          if( m > 256.0 ) {
            break;
          }
        }

        return 0.25*log(m)*sqrt(m)/dz;
      }
    `,
  },

  // adapted from https://www.shadertoy.com/view/llGXDR
  Mandelbox: {
    parameters:[
      { name:'fold', type:'float', default:.1 },
      { name:'size', type:'float', default:3., min:1, max:10 },
      { name:'iterations', type:'float', default:5, min:1, max:10, step:1 },
    ],

    glslify:`float mandelbox( float MR2, float SCALE, float ITER, vec3 position ){
      vec4 scalevec = vec4(SCALE, SCALE, SCALE, abs(SCALE)) / MR2;
      float C1 = abs(SCALE-1.0), C2 = pow(abs(SCALE), 1.-ITER); // 10 is ITERS
      vec4 p = vec4(position.xyz, 1.0), p0 = vec4(position.xyz, 1.0);  // p.w is knighty's DEfactor
      for (int i=0; i<int(ITER); i++) {
        p.xyz = clamp(p.xyz, -1.0, 1.0) * 2.0 - p.xyz;  // box fold: min3, max3gg, mad3
        float r2 = dot(p.xyz, p.xyz);  // dp3
        p.xyzw *= clamp(max(MR2/r2, MR2), 0.0, 1.0);  // sphere fold: div1, max1.sat, mul4
        p.xyzw = p*scalevec + p0;  // mad4
      }
      return (length(p.xyz) - C1) / p.w - C2;
  }`,

    primitiveString( pName ) {
      return `mandelbox( ${this.fold.emit()}, ${this.size.emit()}, ${this.iterations.emit()}, ${pName} )`
    }
  },

	Octahedron: {
    parameters:[
      { name:'radius', type:'float', default:1, min:0, max:4 },
    ],

    primitiveString( pName ) { 
      return `sdOctahedron( ${pName}, ${this.radius.emit()} )`
    },

    glslify:`    float sdOctahedron(vec3 p, float h) {
    p.y = p.y + h; // center vertically... is it centered on the z-axis?
    vec2 d = .5*(abs(p.xz)+p.y) - min(h,p.y);
    return length(max(d,0.)) + min(max(d.x,d.y), 0.);
  }`
  }, 

 	Plane: {
    parameters:[
      { name:'normal', type:'vec3', default:[0,1,0], min:0, max:1 },
      { name:'distance', type:'float', default:1, min:0, max:5 },
    ],

    primitiveString( pName ) { 
      return `sdPlane( ${pName}, vec4( ${this.normal.emit()}, ${this.distance.emit()} ))`
    },
    
    glslify:glsl`#pragma glslify: sdPlane	= require('glsl-sdf-primitives/sdPlane')`
    
  },  
 	Quad: {
    parameters:[
      { name:'v1', type:'vec3', default:[-.5,-.5,0] },
      { name:'v2', type:'vec3', default:[.5,-.5,0] },
      { name:'v3', type:'vec3', default:[.5,.5,0] },
      { name:'v4', type:'vec3', default:[-.5,.5,0] },
    ],

    primitiveString( pName ) { 
      return `udQuad( ${pName}, ${this.v1.emit()}, ${this.v2.emit()}, ${this.v3.emit()}, ${this.v4.emit()} )`
    },
    glslify:glsl`    #pragma glslify: udQuad		= require('glsl-sdf-primitives/udQuad')`
  }, 

  RoundBox: {
    parameters:[
      { name:'size', type:'vec3', default:[1,1,1], min:0, max:3 },
      { name:'radius', type:'float', default:1, min:0, max:3 },
    ],

    primitiveString( pName ) { 
      return `udRoundBox( ${pName}, ${this.size.emit()},  ${this.radius.emit()} )`
    }, 
    glslify:glsl`    #pragma glslify: udRoundBox = require('glsl-sdf-primitives/udRoundBox')`
  }, 
  Sphere:{
    parameters:[
      { name:'radius', type:'float', default:1, min:0, max:3 },
    ],

    primitiveString( pName ) { 
      return `(length(${pName}) - ${this.radius.emit()})`
    },
    glslify:glsl`    #pragma glslify: sdSphere	= require('glsl-sdf-primitives/sdSphere' )`
  },
  // phi, m, n1, n2, n3, a, b
  SuperFormula:{
    parameters:[
      { name:'m_1', type:'float',  default:1, min:-Math.PI*4, max:Math.PI*4 },
      { name:'n1_1', type:'float', default:1, min:-Math.PI*4, max:Math.PI*4 },
      { name:'n2_1', type:'float', default:1, min:-Math.PI*4, max:Math.PI*4 },
      { name:'n3_1', type:'float', default:1, min:-Math.PI*4, max:Math.PI*4 },
      { name:'a_1', type:'float',  default:1, min:-Math.PI*4, max:Math.PI*4 },
      { name:'b_1', type:'float',  default:1, min:-Math.PI*4, max:Math.PI*4 },
      { name:'m_2', type:'float',  default:1, min:-Math.PI*4, max:Math.PI*4 },
      { name:'n1_2', type:'float', default:1, min:-Math.PI*4, max:Math.PI*4 },
      { name:'n2_2', type:'float', default:1, min:-Math.PI*4, max:Math.PI*4 },
      { name:'n3_2', type:'float', default:1, min:-Math.PI*4, max:Math.PI*4 },
      { name:'a_2', type:'float',  default:1, min:-Math.PI*4, max:Math.PI*4 },
      { name:'b_2', type:'float',  default:1, min:-Math.PI*4, max:Math.PI*4 },
    ],

    primitiveString( pName ) { 
      return `superformula( ${pName}, ${this.m_1.emit()}, ${this.n1_1.emit()},${this.n2_1.emit()},${this.n3_1.emit()},${this.a_1.emit()},${this.b_1.emit()}, ${this.m_2.emit()}, ${this.n1_2.emit()},${this.n2_2.emit()},${this.n3_2.emit()},${this.a_2.emit()},${this.b_2.emit()} )`
    },
    glslify:glsl`    #pragma glslify: SuperFormula	= require( 'glsl-superformula' )
 float superformula( vec3 p, float m_1, float n1_1, float n2_1, float n3_1, float a_1, float b_1, float m_2, float n1_2, float n2_2, float n3_2, float a_2, float b_2 ) {
    float d = length( p );
    float theta = atan(p.y, p.x);
    float phi = d == 0. ? 0. : asin(p.z / d);
    float r1 = SuperFormula( theta, m_1, n1_1, n2_1, n3_1, a_1, b_1 );
    float r2 = SuperFormula( phi, m_2, n1_2, n2_2, n3_2, a_2, b_2 );
    vec3 q = r2 * vec3(r1 * cos(theta) * cos(phi), r1 * sin(theta) * cos(phi), sin(phi));
    d = d - length(q);

    return d;
  }    
` },
 
  Torus:{
    parameters:[
      { name:'radii',  type:'vec2', default:[.5,.1], min:0, max:3 },
    ],

    primitiveString( pname ) { 
      return `sdTorus( ${pname}, ${this.radii.emit()} )`
    },
    glslify:glsl`    #pragma glslify: sdTorus 	= require('glsl-sdf-primitives/sdTorus')`

  },  
  Torus88:{
    parameters:[
      { name:'radii',  type:'vec2', default:[.5,.1], min:0, max:3 },
    ],

    primitiveString( pname ) { 
      return `sdTorus88( ${pname}, ${this.radii.emit()} )`
    },
    glslify:`float sdTorus88( vec3 p, vec2 t ) {
        vec2 q = vec2( length8( p.xz ) - t.x, p.y );
        return length8( q ) - t.y;
      }\n`,
  },
  Torus82:{
    parameters:[
      { name:'radii',  type:'vec2', default:[.5,.1], min:0, max:3 },
    ],

    primitiveString( pname ) { 
      return `sdTorus82( ${pname}, ${this.radii.emit()} )`
    },
    glslify:`float sdTorus82( vec3 p, vec2 t ) {
        vec2 q = vec2( length( p.xz ) - t.x, p.y );
        return length8( q ) - t.y;
      }\n`
  },
  
	Triangle: {
    parameters:[
      { name:'v1', type:'vec3', default:[0,-.5,0] },
      { name:'v2', type:'vec3', default:[-.5,.0,0] },
      { name:'v3', type:'vec3', default:[.5,.0,0] },
    ],

    primitiveString( pname ) { 
      return `udTriangle( ${pname}, ${this.v1.emit()}, ${this.v2.emit()}, ${this.v3.emit()} )`
    },
    glslify:glsl`    #pragma glslify: udTriangle	= require('glsl-sdf-primitives/udTriangle')`
  }, 

  TriPrism: {
    parameters:[
      { name:'dimensions', type:'vec2', default:[.5,.5], min:0, max:3 },
    ],

    primitiveString( pName ) { 
      return `sdTriPrism( ${pName}, ${this.dimensions.emit()})`
    },
    glslify:glsl`      #pragma glslify: sdTriPrism = require('glsl-sdf-primitives/sdTriPrism')`

  },

}
