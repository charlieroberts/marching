const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen } = require( './var.js' )

const ops = { 
  Union( a,b )        { return `opU( ${a}, ${b} )` },
  Intersection( a,b ) { return `opI( ${a}, ${b} )` },
  Substraction( a,b ) { return `opS( ${a}, ${b} )` },  
  SmoothUnion(  a,b,blend ) { return `opSmoothUnion( ${a}, ${b}, ${blend} )` }
}

const DistanceOps = {}

for( let name in ops ) {

  // get codegen function
  let op = ops[ name ]

  // create constructor
  DistanceOps[ name ] = function( a,b,blend ) {
    const op = Object.create( DistanceOps[ name ].prototype )
    op.a = a
    op.b = b

    // SmoothUnion is only distance op with k parameter
    if( name === 'SmoothUnion' ) {
      let __blend = param_wrap( blend, float_var_gen(.8) )

      Object.defineProperty( op, 'blend', {
        get() { return __blend },
        set(v) {
          __blend.set( v )
        }
      })
    } 

    op.matId = MaterialID.alloc()

    return op
  } 

  DistanceOps[ name ].prototype = SceneNode()

  DistanceOps[ name ].prototype.emit = function ( __name ) {
    const emitterA = this.a.emit( __name )
    const emitterB = this.b.emit( __name )
    const blend = this.blend !== undefined ? this.blend.emit() : null

    const output = {
      out: op( emitterA.out, emitterB.out, blend ), 
      preface: (emitterA.preface || '') + (emitterB.preface || '')
    }

    return output
  }

  DistanceOps[name].prototype.emit_decl = function () {
    let str =  this.a.emit_decl() + this.b.emit_decl()
    if( this.blend !== undefined ) str += this.blend.emit_decl()

    return str
  };

  DistanceOps[name].prototype.update_location = function(gl, program) {
    this.a.update_location( gl, program )
    this.b.update_location( gl, program )
    if( this.blend !== undefined ) {
      this.blend.update_location( gl, program )
    }
  }

  DistanceOps[name].prototype.upload_data = function(gl) {
    this.a.upload_data( gl )
    this.b.upload_data( gl )
    if( this.blend !== undefined ) {
      this.blend.upload_data( gl )
    }
  }
}

DistanceOps.Union2 = function( ...args ) {
  const u = args.reduce( (state,next) => DistanceOps.Union( state, next ) )

  return u
}

DistanceOps.SmoothUnion2 = function( ...args ) {
  // accepts unlimited arguments, but the last one could be a blending coefficient
  let blend = .8, u

  if( typeof args[ args.length - 1 ] === 'number' ) {
    blend = args.pop()
    u = args.reduce( (state,next) => DistanceOps.SmoothUnion( state, next, blend ) )
  }else{
    u = args.reduce( (state,next) => DistanceOps.SmoothUnion( state, next ) )
  }

  return u
}

module.exports = DistanceOps

