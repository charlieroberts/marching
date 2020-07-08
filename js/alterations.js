const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen } = require( './var.js' )

const ops = { 
  Onion: {
    func( sdf,thickness ) { return `vec2( opOnion( ${sdf}.x, ${thickness} ), ${sdf}.y )` },
    variables:[['thickness', 'float', .03]],
    def:`
float opOnion( in float sdf, in float thickness ){
  return abs(sdf)-thickness;
}
vec2 opOnion( vec2 sdf, float thickness ) {
  float x = 0.;

  sdf.x = opOnion( sdf.x, thickness );

  return sdf;
}   
`
  },
  Halve: {
    func( sdf, direction ) { return `vec2( opHalve( ${sdf}.x, p, ${direction} ), ${sdf}.y )` },
    variables:[['direction','int',0]],
    def:`
float opHalve( in float sdf, vec4 p, in int dir ){
  float _out = 0.;
  switch( dir ) {
    case 0:  
      _out = max( sdf, p.y );
      break;
    case 1:
      _out = max( sdf, -p.y );
      break;
    case 2:
      _out = max( sdf, p.x );
      break;
    case 3:
      _out = max( sdf, -p.x );
      break;
  }

  return _out;
}

vec2 opHalve( vec2 sdf, vec4 p, int dir ) {
  float x = 0.;

  x = opHalve( sdf.x, p, dir );

  sdf.x = x;

  return sdf;
}   
`
  },
  Round: {
    func( sdf, amount ) { return `vec2( ${sdf}.x - ${amount}, ${sdf}.y )` },
    variables:[['amount','float',.1]],
    def:`

    `
  }
}



//vec4 opElongate( in vec3 p, in vec3 h ) {
//  //return vec4( p-clamp(p,-h,h), 0.0 ); // faster, but produces zero in the interior elongated box
 
//  vec3 q = abs(p)-h;
//  return vec4( max(q,0.0), min(max(q.x,max(q.y,q.z)),0.0) );
//}
const pushString = function( name ) {
  const glslobj = ops[ name ].def

  // some definitions are a single string, and not split into
  // separate float and opOut functions
  if( typeof glslobj === 'string' ) {
    if( Alterations.__glsl.indexOf( glslobj ) === -1 ) {
      Alterations.__glsl.push( glslobj )
    }
  }
}

const Alterations = {
  __glsl:[],
  __getGLSL() {
    return this.__glsl.join('\n')
  },
  __clear() { this.__glsl.length = 0 }
}

for( let name in ops ) {

  // get codegen function
  let op = ops[ name ]

  // create constructor
  Alterations[ name ] = function( sdf, ...args ) {
    const __op = Object.create( Alterations[ name ].prototype )
    __op.sdf = sdf
    __op.variables = []
    __op.__desc = { parameters:[] }

    for( let i = 0; i < op.variables.length; i++ ) {
      const propArray = op.variables[ i ]
      const propName = propArray[ 0 ]
      const propType = propArray[ 1 ]
      const propValue = args[ i ] === undefined ? propArray[ 2 ] : args[ i ]

      __op.__desc.parameters.push({ name:propName, value:propValue })
      let param

      switch( propType ) {
        case 'int':
          param = int_var_gen( propValue )()
          break;
        default:
          param = float_var_gen( propValue )()
          break;
      }
      
      Object.defineProperty( __op, propName, {
        get() { return param },
        set(v) { param.set( v ) }
      })

      __op.variables.push( param )
    }
      
    __op.matId = MaterialID.alloc()

    return __op
  } 

  Alterations[ name ].prototype = SceneNode()

  Alterations[ name ].prototype.emit = function ( __name ) {
    const emitterA = this.sdf.emit( __name )
    pushString( name )
    //const emitterB = this.b.emit()

    const output = {
      out: op.func( emitterA.out, ...this.variables.map( v => v.emit() ) ), 
      preface: (emitterA.preface || '') 
    }

    return output
  }

  Alterations[name].prototype.emit_decl = function () {
    let str =  this.sdf.emit_decl() 
    for( let v of this.variables ) {
      str += v.emit_decl()
    }

    return str
  };

  Alterations[name].prototype.update_location = function(gl, program) {
    this.sdf.update_location( gl, program )
    for( let v of this.variables ) v.update_location( gl, program )
  }

  Alterations[name].prototype.upload_data = function(gl) {
    this.sdf.upload_data( gl )
    for( let v of this.variables ) v.upload_data( gl )
    
  }
}

Alterations.Halve.UP = 0
Alterations.Halve.DOWN = 1
Alterations.Halve.LEFT = 3
Alterations.Halve.RIGHT = 2

module.exports = Alterations
