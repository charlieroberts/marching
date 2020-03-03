const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc } = require( './var.js' )
const Transform = require( './transform.js' )

const ops = { 
  // this needs to create an opOut, not return a vec2
  Displace( __name ) {
    let name = __name === undefined ? 'p' : __name
    const sdf = this.sdf.emit( name );

    const sdfStr = `float d1${this.id} = ${sdf.out}.x;\n`

    let displaceString = `float d2${this.id} = sin( ${this.amount.emit()}.x * ${name}.x ) * `  
    displaceString += `sin( ${this.amount.emit()}.y * ${name}.y ) * `
    displaceString += `sin( ${this.amount.emit()}.z * ${name}.z );\n`
    displaceString += `${sdf.out}.x = (d1${this.id} + d2${this.id}*${this.size.emit()})*.5;\n`

    const output = {
      out: `${sdf.out}`, 
      preface: sdf.preface + sdfStr + displaceString 
    }

    return output
  },

  Bend( __name ) {
    let name = __name === undefined ? 'p' : __name
    const sdf = this.sdf.emit( 'q'+this.id );

    let preface=`        float c${this.id} = cos( ${this.amount.emit()}.x * ${name}.x );
        float s${this.id} = sin( ${this.amount.emit()}.x * ${name}.x );
        mat2  m${this.id} = mat2( c${this.id},-s${this.id},s${this.id},c${this.id} );
        vec4  q${this.id} = vec4( m${this.id} * ${name}.xy, ${name}.z, 1. );\n`

    if( typeof sdf.preface === 'string' ) {
      preface += sdf.preface
    }

    return { preface, out:sdf.out }
  },

  Twist( __name ) {
    let name = __name === undefined ? 'p' : __name
    const sdf = this.sdf.emit( 'q'+this.id );

    let preface=`        float c${this.id} = cos( ${this.amount.emit()}.x * ${name}.y );
        float s${this.id} = sin( ${this.amount.emit()}.x * ${name}.y );
        mat2  m${this.id} = mat2( c${this.id},-s${this.id},s${this.id},c${this.id} );
        vec4  q${this.id} = vec4( m${this.id} * ${name}.xz, ${name}.y, 1. );\n`

    if( typeof sdf.preface === 'string' ) {
      preface += sdf.preface
    }

    return { preface, out:sdf.out }
  },
  __Bump( __name ) {
    let name = __name === undefined ? 'p' : __name

    const bumpString =  `        vec4 transformBump${this.id} = ${name} * ${this.transform.emit()};\n`
    const tex = this.amount.emit( name )

    const pointString = `(transformBump${this.id} * ${this.sdf.transform.emit()})`

    const sdf = this.sdf.emit( pointString, this.transform, `tex${this.id}` ) 

    Marching.textures.addTexture( this.amount.value )

    let preface=`  vec3 tex${this.id} = getTexture( ${this.amount.value.id}, ${pointString}.xyz ) * ${this.size.emit()};\n
        //vec4 displaceBump${this.id} = vec4((${pointString} - tex${this.id}), 1.);
    `
        //${sdf.out}.x = (tex${this.id}.x + tex${this.id}.y + tex${this.id}.z ) / 3. * .5 + ${sdf.out}.x;\n`
        //vec4 ${'p'+this.id} = vec4(${pointString} + tex${this.id}, 1.);\n`

    //sdf.preface += `\n        
    //    ${sdf.out}.x -= min(tex${this.id}.x, min(tex${this.id}.y, tex${this.id}.z));\n` 

    if( typeof sdf.preface === 'string' ) {
      preface = preface + sdf.preface
    }

    preface =  bumpString + preface

    return { preface, out:sdf.out }
  },
  // XXX todo: something like https://www.shadertoy.com/view/ldSGzR
  // https://www.dropbox.com/s/l1yl164jb3rhomq/mm_sfgrad_bump.pdf?dl=0
  Bump( __name ) {
    let name = __name === undefined ? 'p' : __name

    const bumpString =  `        vec4 transformBump${this.id} = ${name} * ${this.transform.emit()};\n`
    const tex = this.amount.emit( name )

    const pointString = `(transformBump${this.id} * ${this.sdf.transform.emit()}).xyz`

    const sdf = this.sdf.emit( `transformBump${this.id}`, this.transform ) 

    Marching.textures.addTexture( this.amount.value )

    let preface=`  vec3 tex${this.id} = getTexture( ${this.amount.value.id}, ${pointString}) * ${this.size.emit()};
        ${sdf.out}.x = (tex${this.id}.x + tex${this.id}.y + tex${this.id}.z)/3. + ${sdf.out}.x;\n`

    if( typeof sdf.preface === 'string' ) {
      preface = sdf.preface + preface
    }

    preface = bumpString + preface

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
    op.transform = Transform()

    const defaultValues = [.5,.5,.5]

    op.id = VarAlloc.alloc()
    const isArray = true 
    
    if( typeof b === 'number' ) {
      b = [b,b,b]
      b.type = 'vec3'
    }
    
    if( name !== 'Bumpz' ) {
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
    }else{
      op.params = []
      op.emit_decl = function() {}
      op.emit = function() {}
      op.update_data= function() {}
      op.upload_location = function() {}
    }
    op.__setMaterial = function(mat) {
      if( typeof mat === 'string' ) mat = Marching.Material[ mat ]
      this.__material = this.mat = Marching.materials.addMaterial( mat )
      op.sdf.material( this.__material )
    }
    if( name === 'Displace' || name === 'Bump' ) {
      let __var2 =  param_wrap( 
        c, 
        float_var_gen( .03 ) 
      )
      Object.defineProperty( op, 'size', {
        get() { return __var2 },
        set(v) {
          __var2.set( v )
          __var2.dirty = true
        }
      })

      op.params.push({ name:'size' })
    }
    op.__desc = { parameters:op.params }
    return op
  } 

  DistanceOps[ name ].prototype = SceneNode()

  DistanceOps[name].prototype.emit_decl = function () {
    let str =  this.sdf.emit_decl() + (this.name !== 'Bump' ? this.amount.emit_decl() : '')
    str += this.transform.emit_decl()
    if( this.name === 'Displace' || this.name === 'Bump' ) str += this.size.emit_decl()  

    return str
  };

  DistanceOps[name].prototype.update_location = function(gl, program) {
    this.sdf.update_location( gl, program )
    if( this.name !== 'Bump' ) this.amount.update_location( gl, program )
    if( this.name === 'Displace' || this.name === 'Bump') this.size.update_location( gl, program ) 
    this.transform.update_location( gl, program )
  }

  DistanceOps[name].prototype.upload_data = function(gl) {
    this.sdf.upload_data( gl )
    if( this.name !== 'Bump' ) this.amount.upload_data( gl )
    if( this.name === 'Displace' || this.name === 'Bump') this.size.upload_data( gl )
    this.transform.upload_data( gl )
  }
}

module.exports = DistanceOps

