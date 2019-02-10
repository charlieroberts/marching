const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc } = require( './var.js' )
const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )


const getDomainOps = function( SDF ) {
  
const Elongation = function( primitive, distance ) {
  const repeat = Object.create( Elongation.prototype )

  // XXX make this DRY
  const __var =  param_wrap( 
    distance, 
    param_wrap( distance, vec3_var_gen( 1,1,5 ) )    
  )

  Object.defineProperty( repeat, 'distance', {
    get() { return __var },
    set(v) {
      if( typeof v === 'object' ) {
        __var.set( v )
      }else{
        __var.value.x = v
        __var.value.y = v
        __var.value.z = v
        __var.dirty = true
      }
    }
  }) 

  repeat.sdf = primitive
  repeat.params = [{ name:'distance' }]

  return repeat 
}

Elongation.prototype = SceneNode()

Elongation.prototype.emit = function ( name='p' ) {
  const pId = this.getID()
  const pName = 'p' + pId

  let preface =
`        vec4 ${pName}_xyzw = opElongate( ${name}, ${this.distance.emit()} );\n
        vec3 ${pName} = ${pName}_xyzw.xyz;\n`


  const primitive = this.sdf.emit( pName )

  if( typeof primitive.preface === 'string' ) preface += primitive.preface 

  return { out:`vec2(${pName}_xyzw.w + ${primitive.out}.x, ${primitive.out}.y)`, preface }
}

Elongation.prototype.emit_decl = function () {
	return this.distance.emit_decl() + this.sdf.emit_decl()
};

Elongation.prototype.update_location = function( gl, program ) {
  this.distance.update_location( gl, program )
  this.sdf.update_location( gl, program )
}

Elongation.prototype.upload_data = function( gl ) {
  this.distance.upload_data( gl )
  this.sdf.upload_data( gl )
}


const Repetition = function( primitive, distance ) {
  const repeat = Object.create( Repetition.prototype )

  // XXX make this DRY
  const __var =  param_wrap( 
    distance, 
    param_wrap( distance, vec3_var_gen( 1,1,5 ) )    
  )

  Object.defineProperty( repeat, 'distance', {
    get() { return __var },
    set(v) {
      if( typeof v === 'object' ) {
        __var.set( v )
      }else{
        __var.value.x = v
        __var.value.y = v
        __var.value.z = v
        __var.dirty = true
      }
    }
  }) 

  repeat.sdf = primitive
  repeat.params = [{ name:'distance' }]

  return repeat 
}

Repetition.prototype = SceneNode()

Repetition.prototype.emit = function ( name='p' ) {
  const pId = this.sdf.matId
  const pName = 'p' + pId

  let preface =
`        vec3 ${pName} = mod( ${name}, ${this.distance.emit()} ) - .5 * ${this.distance.emit() };\n`


  const primitive = this.sdf.emit( pName )

  if( typeof primitive.preface === 'string' ) preface += primitive.preface 

  return { out:primitive.out, preface }
}

Repetition.prototype.emit_decl = function () {
	return this.distance.emit_decl() + this.sdf.emit_decl()
};

Repetition.prototype.update_location = function( gl, program ) {
  this.distance.update_location( gl, program )
  this.sdf.update_location( gl, program )
}

Repetition.prototype.upload_data = function( gl ) {
  this.distance.upload_data( gl )
  this.sdf.upload_data( gl )
}

const PolarRepetition = function( primitive, count, distance ) {
  const repeat = Object.create( PolarRepetition.prototype )
  //repeat.count = param_wrap( count, float_var_gen( 7 ) )
  repeat.distance = param_wrap( distance, float_var_gen( 1 ) )
  repeat.sdf = primitive 

  const __var =  param_wrap( 
    count, 
    param_wrap( count, float_var_gen( 7 ) )    
  )

  Object.defineProperty( repeat, 'count', {
    get() { return __var },
    set(v) {
      __var.set( v ) 
    }
  }) 

  const __var2 =  param_wrap( 
    distance, 
    param_wrap( distance, float_var_gen( 1 ) )    
  )

  Object.defineProperty( repeat, 'distance', {
    get() { return __var2 },
    set(v) {
      __var2.set( v ) 
    }
  }) 

  repeat.params = [{ name:'distance' }, { name:'count' }]
  return repeat 
}

PolarRepetition.prototype = SceneNode()

PolarRepetition.prototype.emit = function ( name='p' ) {
  const pId = VarAlloc.alloc()
  const pName = 'p' + pId

  let preface =`        vec3 ${pName} = polarRepeat( ${name}, ${this.count.emit() } ); 
        ${pName} -= vec3(${this.distance.emit()},0.,0.);\n`
//`//mod( ${name}, ${this.distance.emit()} ) - .5 * ${this.distance.emit() };\n`


  const sdf = this.sdf.emit( pName )

  if( typeof sdf.preface === 'string' ) preface += sdf.preface

  return { out:sdf.out, preface }
}

PolarRepetition.prototype.emit_decl = function () {
	return this.distance.emit_decl() + this.count.emit_decl() + this.sdf.emit_decl()
};

PolarRepetition.prototype.update_location = function( gl, program ) {
  this.count.update_location( gl, program )
  this.sdf.update_location( gl, program )
  this.distance.update_location( gl, program )
}

PolarRepetition.prototype.upload_data = function( gl ) {
  this.count.upload_data( gl )
  this.sdf.upload_data( gl )
  this.distance.upload_data( gl )
}
const Rotation = function( primitive, axis, angle=0 ) {
  const rotate = Object.create( Rotation.prototype )
  
  rotate.primitive = primitive
  rotate.matId = VarAlloc.alloc()

  let __var =  param_wrap( 
    axis, 
    param_wrap( axis, vec3_var_gen( 0,0,0 ) )    
  )

  Object.defineProperty( rotate, 'axis', {
    get() { return __var },
    set(v) {
      if( typeof v === 'object' ) {
        __var.set( v )
      }else{
        __var.value.x = v
        __var.value.y = v
        __var.value.z = v
        __var.dirty = true
      }
    }
  })

  let __angle  = param_wrap( 
    angle, 
    param_wrap( angle, float_var_gen( Math.PI/4 ) )
  )

  Object.defineProperty( rotate, 'angle', {
    get() { return __angle },
    set(v) {
      __angle.set( v )
    }
  })

  rotate.params = [{ name:'axis' }, { name:'angle' }]
  return rotate 
}


Rotation.prototype = SceneNode()

Rotation.prototype.emit = function ( name='p' ) {
  const pId = this.matId
  const pName = 'q'+pId

  let preface =
`        mat4 m${pName} = rotationMatrix(${this.axis.emit()}, -${this.angle.emit()});
        vec3 ${pName} = ( m${pName} * vec4(${name},1.) ).xyz;
`

  const primitive = this.primitive.emit( pName )
  let out = primitive.out

  if( typeof primitive.preface === 'string' )
    preface += primitive.preface

  return { out, preface }
}

Rotation.prototype.emit_decl = function () {
  let str = this.axis.emit_decl() + this.angle.emit_decl() + this.primitive.emit_decl()

  if( SDF.memo.rotation === undefined ) {
    str += Rotation.prototype.glsl
    SDF.memo.rotation = true
  }

  return str
};

Rotation.prototype.update_location = function( gl, program ) {
  this.axis.update_location( gl, program )
  this.angle.update_location( gl, program )
  this.primitive.update_location( gl, program )
}

Rotation.prototype.upload_data = function( gl ) {
  this.axis.upload_data( gl )
  this.angle.upload_data( gl )
  this.primitive.upload_data( gl )
}

Rotation.prototype.glsl = `   mat4 rotationMatrix(vec3 axis, float angle) {
    vec3 a = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    float sx = s * a.x;
    float sy = s * a.y;
    float sz = s * a.z;
    float ocx = oc * a.x;
    float ocy = oc * a.y;
    float ocz = oc * a.z;
    float ocxx = ocx * a.x;
    float ocxy = ocx * a.y;
    float ocxz = ocx * a.z;
    float ocyy = ocy * a.y;
    float ocyz = ocy * a.z;
    float oczz = ocz * a.z;
    mat4 m = mat4(
      vec4(ocxx + c, ocxy - sz, ocxz + sy, 0.0),
      vec4(ocxy + sz, ocyy + c, ocyz - sx, 0.0),
      vec4(ocxz - sy, ocyz + sx, oczz + c, 0.0),
      vec4( 0.0, 0.0, 0.0, 1.0)
    );

    return m;
  }
`


const Translate = function( primitive, amount ) {
  const rotate = Object.create( Translate.prototype )
  
  rotate.primitive = primitive
  rotate.matId = MaterialID.alloc()

  let __var =  param_wrap( 
    amount, 
    param_wrap( amount, vec3_var_gen( 0,0,0 ) )    
  )

  Object.defineProperty( rotate, 'amount', {
    get() { return __var },
    set(v) {
      if( typeof v === 'object' ) {
        __var.set( v )
      }else{
        __var.value.x = v
        __var.value.y = v
        __var.value.z = v
        __var.dirty = true
      }
    }
  })

  rotate.params = [{ name:'amount' }]
  return rotate 
}
Translate.prototype = SceneNode()

Translate.prototype.emit = function( name='p' ) {
  const pId = this.matId
  const pName = name+pId

  let preface = `vec3 ${pName} = ${name} - ${this.amount.emit()};\n`

  const primitive = this.primitive.emit( pName )
  let out = primitive.out

  if( typeof primitive.preface === 'string' )
    preface += primitive.preface

  return { out, preface }
}

Translate.prototype.emit_decl = function () {
	return this.amount.emit_decl() + this.primitive.emit_decl()
};

Translate.prototype.update_location = function( gl, program ) {
  this.amount.update_location( gl, program )
  this.primitive.update_location( gl, program )
}

Translate.prototype.upload_data = function( gl ) {
  this.amount.upload_data( gl )
  this.primitive.upload_data( gl )
}

const Scale = function( primitive,amount ) {
  const scale = Object.create( Scale.prototype )
  
  scale.primitive = primitive
  scale.matId = MaterialID.alloc()

  let __var =  param_wrap( 
    amount, 
    param_wrap( amount, vec3_var_gen( 1,1,1 ) )    
  )

  Object.defineProperty( scale, 'amount', {
    get() { return __var },
    set(v) {
      if( typeof v === 'object' ) {
        __var.set( v )
      }else{
        __var.value.x = v
        __var.value.y = v
        __var.value.z = v
        __var.dirty = true
      }
    }
  })

  scale.params = [{ name:'amount' }]
  return scale 
}

Scale.prototype.emit = function ( name='p' ) {
  const pId = 'scale'+this.matId
  const pname = name+pId

  let preface =`  vec3 ${pname} = ${name}/${this.amount.emit()};\n `

  const primitive = this.primitive.emit( pname )
  let out = primitive.out + ' * ' + this.amount.emit()

  if( typeof primitive.preface === 'string' )
    preface += primitive.preface

  return { out, preface }
}

Scale.prototype.emit_decl = function () {
	return this.amount.emit_decl() + this.primitive.emit_decl()
};

Scale.prototype.update_location = function( gl, program ) {
  this.amount.update_location( gl, program )
  this.primitive.update_location( gl, program )
}

Scale.prototype.upload_data = function( gl ) {
  this.amount.upload_data( gl )
  this.primitive.upload_data( gl )
}

return { Repeat:Repetition, Scale, Rotation, Translate, PolarRepeat:PolarRepetition, Elongation }

}

module.exports = getDomainOps
