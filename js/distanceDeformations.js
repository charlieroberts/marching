const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc } = require( './var.js' )

const ops = { 
  Displace( __name ) {
    let name = __name === undefined ? 'p' : __name
    const primitive = this.primitive.emit( name );

    const primitiveStr = `float d1${this.id} = ${primitive.out}.x;\n`

    let displaceString = `float d2${this.id} = sin( ${this.amount.emit()}.x * ${name}.x ) * `  
    displaceString += `sin( ${this.amount.emit()}.y * ${name}.y ) * `
    displaceString += `sin( ${this.amount.emit()}.z * ${name}.z );\n`

    const output = {
      out: `vec2(d1${this.id} + d2${this.id}, ${primitive.out}.y)`, 
      preface: primitive.preface + primitiveStr + displaceString 
    }

    return output
  },

  Bend( __name ) {
    let name = __name === undefined ? 'p' : __name
    const primitive = this.primitive.emit( 'q'+this.id );

    let preface=`        float c${this.id} = cos( ${this.amount.emit()}.x * ${name}.y );
        float s${this.id} = sin( ${this.amount.emit()}.y * ${name}.y );
        mat2  m${this.id} = mat2( c${this.id},-s${this.id},s${this.id},c${this.id} );
        vec3  q${this.id} = vec3( m${this.id} * ${name}.xy, ${name}.z );\n`

    if( typeof primitive.preface === 'string' ) {
      preface += primitive.preface
    }

    return { preface, out:primitive.out }
  },

  Twist( __name ) {
    let name = __name === undefined ? 'p' : __name
    const primitive = this.primitive.emit( 'q'+this.id );

    let preface=`        float c${this.id} = cos( ${this.amount.emit()}.x * ${name}.y );
        float s${this.id} = sin( ${this.amount.emit()}.y * ${name}.y );
        mat2  m${this.id} = mat2( c${this.id},-s${this.id},s${this.id},c${this.id} );
        vec3  q${this.id} = vec3( m${this.id} * ${name}.xz, ${name}.y );\n`

    if( typeof primitive.preface === 'string' ) {
      preface += primitive.preface
    }

    return { preface, out:primitive.out }
  },

}

const DistanceOps = {}

for( let name in ops ) {

  // get codegen function
  let __op = ops[ name ]

  // create constructor
  DistanceOps[ name ] = function( a,b ) {
    const op = Object.create( DistanceOps[ name ].prototype )
    op.primitive = a
    op.amount = b
    op.emit = __op

    const defaultValues = [.5,.5,.5]

    op.id = VarAlloc.alloc()
    const isArray = true 

    let __var =  param_wrap( 
      b, 
      vec3_var_gen( ...defaultValues ) 
    )

    // for assigning entire new vectors to property
    Object.defineProperty( op, 'amount', {
      get() { return __var },
      set(v) {
        __var.set( v )
      }
    })

    return op
  } 

  DistanceOps[ name ].prototype = SceneNode()

  //DistanceOps[ name ].prototype.emit = function ( __name ) {
  //  let name = __name === undefined ? 'p' : __name
  //  const primitive = this.primitive.emit( name );

  //  const primitiveStr = `float d1 = ${primitive.out}.x;\n`

  //  const displaceString = `float d2 = sin( ${this.amount.emit()}.x * ${name}.x ) * sin( ${this.amount.emit()}.y * ${name}.y ) * sin( ${this.amount.emit()}.z * ${name}.z );\n`

  //  const output = {
  //    out: `vec2(d1 + d2, ${primitive.out}.y)`, 
  //    preface: primitive.preface + primitiveStr + displaceString 
  //  }

  //  return output
  //}

  DistanceOps[name].prototype.emit_decl = function () {
    let str =  this.primitive.emit_decl() + this.amount.emit_decl()

    return str
  };

  DistanceOps[name].prototype.update_location = function(gl, program) {
    this.primitive.update_location( gl, program )
    this.amount.update_location( gl, program )
  }

  DistanceOps[name].prototype.upload_data = function(gl) {
    this.primitive.upload_data( gl )
    this.amount.upload_data( gl )
  }
}

module.exports = DistanceOps

