
const glsl = require( 'glslify' )
const Color = require( './Color' )

module.exports = {
  Box: {
    parameters:[
      { name:'size', type:'vec3', default:[1,1,1] },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
	    return `sdBox( ${pName} - ${this.center.emit()}, ${this.size.emit()} )`;
    },

    glslify:glsl`    #pragma glslify: sdBox		= require('glsl-sdf-primitives/sdBox')`
  }, 

  // XXX we should normalize dimensions in the shader... 
  Cone: {
    parameters:[
      { name:'dimension', type:'vec3', default:[.8,.6,.3] },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `sdCone( ${pName} - ${this.center.emit()}, ${this.dimension.emit()} )`
    },
    glslify:glsl`    #pragma glslify: sdCone	= require('glsl-sdf-primitives/sdCappedCone')`
  }, 

	Cylinder: {
    parameters:[
      { name:'dimension', type:'vec2', default:[.8,.6] },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `sdCappedCylinder( ${pName} - ${this.center.emit()}, ${this.dimension.emit()} )`
    },

    glslify:`    float sdCappedCylinder( vec3 p, vec2 h ) {
    vec2 d = abs(vec2(length(p.xz),p.y)) - h;
    return min(max(d.x,d.y),0.0) + length(max(d,0.0));
  }`
  }, 

  Capsule: {	
    parameters:[
      { name:'start', type:'vec3', default:[0,0,0] },
      { name:'end', type:'vec3', default:[.8,1,0] },
      { name:'radius', type:'float', default:.5 },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `sdCapsule( ${pName},  ${this.start.emit()}, ${this.end.emit()}, ${this.radius.emit()} )`
    },
    glslify:glsl`      #pragma glslify: sdCapsule	= require('glsl-sdf-primitives/sdCapsule')`

  },
  // XXX No cylinder description
  //` #pragma glslify: sdCylinder	= require('glsl-sdf-primitives/sdCylinder')`
 	HexPrism: {
    parameters:[
      { name:'dimension', type:'vec2', default:[.8,.6] },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `sdHexPrism( ${pName} - ${this.center.emit()}, ${this.dimension.emit()} )`
    },
    glslify:glsl`      #pragma glslify: sdHexPrism	= require('glsl-sdf-primitives/sdHexPrism')`
  },   
	Octahedron: {
    parameters:[
      { name:'size', type:'float', default:1 },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `sdOctahedron( ${pName} - ${this.center.emit()}, ${this.size.emit()} )`
    },

    glslify:`    float sdOctahedron(vec3 p, float h) {
    vec2 d = .5*(abs(p.xz)+p.y) - min(h,p.y);
    return length(max(d,0.)) + min(max(d.x,d.y), 0.);
  }`
  }, 

 	Plane: {
    parameters:[
      { name:'normal', type:'vec3', default:[0,1,0] },
      { name:'distance', type:'float', default:1 },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `sdPlane( ${pName}, vec4( ${this.normal.emit()}, ${this.distance.emit()} ))`
    },
    
    glslify:glsl`#pragma glslify: sdPlane	= require('glsl-sdf-primitives/sdPlane')`
    
  },  
 	Quad: {
    parameters:[
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'v1', type:'vec3', default:[-.5,-.5,0] },
      { name:'v2', type:'vec3', default:[.5,-.5,0] },
      { name:'v3', type:'vec3', default:[.5,.5,0] },
      { name:'v4', type:'vec3', default:[-.5,.5,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `udQuad( ${pName} - ${this.center.emit()}, ${this.v1.emit()}, ${this.v2.emit()}, ${this.v3.emit()}, ${this.v4.emit()} )`
    },
    glslify:glsl`    #pragma glslify: udQuad		= require('glsl-sdf-primitives/udQuad')`
  }, 
  RoundBox: {
    parameters:[
      { name:'size', type:'vec3', default:[1,1,1] },
      { name:'radius', type:'float', default:1 },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `udRoundBox( ${pName} -${this.center.emit()}, ${this.size.emit()},  ${this.radius.emit()} )`
    }, 
    glslify:glsl`    #pragma glslify: udRoundBox = require('glsl-sdf-primitives/udRoundBox')`
  }, 
  Sphere:{
    parameters:[
      { name:'radius', type:'float', default:1 },
      { name:'center', type:'vec3', default:[0,0,0] },
      //{ name:'color', type:'float', default:Color(0,0,255) }
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `sdSphere( ${pName} - ${this.center.emit()}, ${this.radius.emit()} )`
    },
    glslify:glsl`    #pragma glslify: sdSphere	= require('glsl-sdf-primitives/sdSphere' )`
  },
  Torus:{
    parameters:[
      { name:'radii',  type:'vec2', default:[.5,.1] },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `sdTorus( ${pName} - ${this.center.emit()}, ${this.radii.emit()} )`
    },
    glslify:glsl`    #pragma glslify: sdTorus 	= require('glsl-sdf-primitives/sdTorus')`

  },  
  Torus88:{
    parameters:[
      { name:'radii',  type:'vec2', default:[.5,.1] },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `sdTorus88( ${pName} - ${this.center.emit()}, ${this.radii.emit()} )`
    },
    glslify:`float sdTorus88( vec3 p, vec2 t ) {
        vec2 q = vec2( length8( p.xz ) - t.x, p.y );
        return length8( q ) - t.y;
      }\n`,
  },
  Torus82:{
    parameters:[
      { name:'radii',  type:'vec2', default:[.5,.1] },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `sdTorus82( ${pName} - ${this.center.emit()}, ${this.radii.emit()} )`
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
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `udTriangle( ${pName} - ${this.center.emit()}, ${this.v1.emit()}, ${this.v2.emit()}, ${this.v3.emit()} )`
    },
    glslify:glsl`    #pragma glslify: udTriangle	= require('glsl-sdf-primitives/udTriangle')`
  }, 

  TriPrism: {
    parameters:[
      { name:'dimension', type:'vec2', default:[.5,.5] },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `sdTriPrism( ${pName} - ${this.center.emit()}, ${this.dimension.emit()})`
    },
    glslify:glsl`      #pragma glslify: sdTriPrism = require('glsl-sdf-primitives/sdTriPrism')`

  }, 


}
