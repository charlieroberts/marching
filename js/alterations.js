const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen } = require( './var.js' )

const ops = { 
  Onion: {
    func( sdf,thickness ) { return `vec2( opOnion( ${sdf}.x, ${thickness} ), ${sdf}.y )` },
    variables:[['thickness', 'float', .03]]
  },
  Halve: {
    func( sdf, direction ) { return `vec2( opHalve( ${sdf}.x, p, ${direction} ), ${sdf}.y )` },
    variables:[['direction','int',0]]
  },
  Round: {
    func( sdf, amount ) { return `vec2( ${sdf}.x - ${amount}, ${sdf}.y )` },
    variables:[['amount','float',.1]]
  }
}


const Alterations= {}

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
