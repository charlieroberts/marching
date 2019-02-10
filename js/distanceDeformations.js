const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc } = require( './var.js' )

const ops = { 
  Displace( __name ) {
    let name = __name === undefined ? 'p' : __name
    const sdf = this.sdf.emit( name );

    const sdfStr = `float d1${this.id} = ${sdf.out}.x;\n`

    let displaceString = `float d2${this.id} = sin( ${this.amount.emit()}.x * ${name}.x ) * `  
    displaceString += `sin( ${this.amount.emit()}.y * ${name}.y ) * `
    displaceString += `sin( ${this.amount.emit()}.z * ${name}.z );\n`

    const output = {
      out: `vec2((d1${this.id} + d2${this.id}*${this.scale.emit()})*.5, ${sdf.out}.y)`, 
      preface: sdf.preface + sdfStr + displaceString 
    }

    return output
  },

  Bend( __name ) {
    let name = __name === undefined ? 'p' : __name
    const sdf = this.sdf.emit( 'q'+this.id );

    let preface=`        float c${this.id} = cos( ${this.amount.emit()}.x * ${name}.y );
        float s${this.id} = sin( ${this.amount.emit()}.y * ${name}.y );
        mat2  m${this.id} = mat2( c${this.id},-s${this.id},s${this.id},c${this.id} );
        vec3  q${this.id} = vec3( m${this.id} * ${name}.xy, ${name}.z );\n`

    if( typeof sdf.preface === 'string' ) {
      preface += sdf.preface
    }

    return { preface, out:sdf.out }
  },

  Twist( __name ) {
    let name = __name === undefined ? 'p' : __name
    const sdf = this.sdf.emit( 'q'+this.id );

    let preface=`        float c${this.id} = cos( ${this.amount.emit()}.x * ${name}.y );
        float s${this.id} = sin( ${this.amount.emit()}.y * ${name}.y );
        mat2  m${this.id} = mat2( c${this.id},-s${this.id},s${this.id},c${this.id} );
        vec3  q${this.id} = vec3( m${this.id} * ${name}.xz, ${name}.y );\n`

    if( typeof sdf.preface === 'string' ) {
      preface += sdf.preface
    }

    return { preface, out:sdf.out }
  },

}

const DistanceOps = {}

for( let name in ops ) {

  // get codegen function
  let __op = ops[ name ]

  // create constructor
  DistanceOps[ name ] = function( a,b,c ) {
    const op = Object.create( DistanceOps[ name ].prototype )
    op.sdf = a
    op.amount = b
    op.emit = __op
    op.name = name

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
        if( typeof v === 'object' ) {
          __var.set( v )
        }else{
          __var.value.x = v
          __var.value.y = v
          __var.value.z = v
          __var.value.w = v
          __var.dirty = true
        }
      }
    })

    op.params = [{ name:'amount' }]

    if( name === 'Displace' ) {
      let __var2 =  param_wrap( 
        c, 
        float_var_gen( .03 ) 
      )
      Object.defineProperty( op, 'scale', {
        get() { return __var2 },
        set(v) {
          __var2.set( v )
          __var2.dirty = true
        }
      })

      op.params.push({ name:'scale' })
    }
    return op
  } 

  DistanceOps[ name ].prototype = SceneNode()

  //DistanceOps[ name ].prototype.emit = function ( __name ) {
  //  let name = __name === undefined ? 'p' : __name
  //  const sdf = this.sdf.emit( name );

  //  const sdfStr = `float d1 = ${sdf.out}.x;\n`

  //  const displaceString = `float d2 = sin( ${this.amount.emit()}.x * ${name}.x ) * sin( ${this.amount.emit()}.y * ${name}.y ) * sin( ${this.amount.emit()}.z * ${name}.z );\n`

  //  const output = {
  //    out: `vec2(d1 + d2, ${sdf.out}.y)`, 
  //    preface: sdf.preface + sdfStr + displaceString 
  //  }

  //  return output
  //}

  DistanceOps[name].prototype.emit_decl = function () {
    let str =  this.sdf.emit_decl() + this.amount.emit_decl()
    if( this.name === 'Displace' ) str += this.scale.emit_decl()  

    return str
  };

  DistanceOps[name].prototype.update_location = function(gl, program) {
    this.sdf.update_location( gl, program )
    this.amount.update_location( gl, program )
    if( this.name === 'Displace' ) this.scale.update_location( gl, program ) 
  }

  DistanceOps[name].prototype.upload_data = function(gl) {
    this.sdf.upload_data( gl )
    this.amount.upload_data( gl )
    if( this.name === 'Displace' ) this.scale.upload_data( gl )
  }
}

module.exports = DistanceOps

