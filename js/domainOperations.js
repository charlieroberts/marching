const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc } = require( './var.js' )
const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const { Vec2, Vec3, Vec4 } = require( './vec.js' )
const Transform = require( './transform.js' )

const descriptions = {
  Elongation: {
    parameters:[ { name:'distance', type:'vec3', default:Vec3(0) } ],
    emit( name='p' ) {
      const pId = this.getID()
      const pName = 'p' + pId

      let preface =
        `        vec4 ${pName}_xyzw = opElongate( ${name}, ${this.distance.emit()} );\n
        vec3 ${pName} = ${pName}_xyzw.xyz;\n`


      const sdf = this.sdf.emit( pName )

      if( typeof sdf.preface === 'string' ) preface += sdf.preface 

      return { out:`vec2(${pName}_xyzw.w + ${sdf.out}.x, ${sdf.out}.y)`, preface }
    }
  },
  PolarRepetition: {
    parameters:[ 
      { name:'count', type:'float', default:5 },
      { name:'distance', type:'float', default:.25 },
    ],
    emit( name='p' ) {
      const pId = VarAlloc.alloc()
      const pName = 'p' + pId
      const pointString =  `( ${name} * ${this.transform.emit()} ).xyz`;
      let preface =`
          vec4 ${pName} = vec4( polarRepeat( ${pointString}, ${this.count.emit() } ), 1. ); 
          ${pName} -= vec4(${this.distance.emit()},0.,0.,0.);\n`

      const sdf = this.sdf.emit( pName )

      if( typeof sdf.preface === 'string' ) preface += sdf.preface

      return { out:sdf.out, preface }
    }
  },
  Repetition: {
    parameters: [ { name:'distance', type:'vec3', default:Vec3(0) } ],
    emit( name='p' ) {
      const pId = VarAlloc.alloc()
      const pName = 'p' + pId
      const pointString =  `( ${name} * ${this.transform.emit()} ).xyz`;

      let preface =`
        vec4 ${pName} = vec4( mod( ${pointString}, ${this.distance.emit()} ) - .5 * ${this.distance.emit() }, 1. );\n`

      //vec3 ${pName} = mod( ${name}, ${this.distance.emit()} ) - .5 * ${this.distance.emit() };\n`
      const sdf = this.sdf.emit( pName )

      if( typeof sdf.preface === 'string' ) preface += sdf.preface 

      return { out:sdf.out, preface }
    }
  },
  SmoothRepetition: {
    parameters: [ { name:'distance', type:'vec3', default:Vec3(0) } ],
    emit( name='p' ) {
      const pId = this.sdf.matId
      const pName = 'p' + pId

      let preface =`        vec3 ${pName} = mod( ${name}, ${this.distance.emit()} ) - .5 * ${this.distance.emit() };\n`

      const sdf = this.sdf.emit( pName )

      if( typeof sdf.preface === 'string' ) preface += sdf.preface 

      return { out:sdf.out, preface }
    }
  },
  Rotation: {
    parameters: [
      { name:'axis', type:'vec3', default:Vec3(1) },
      { name:'angle', type:'float', default:0 },
    ],
    emit( name='p' ) {
      const pId = MaterialID.alloc()//this.matId
      const pName = 'q'+pId

      let preface =`        
        mat4 m${pName} = rotationMatrix(${this.axis.emit()}, -${this.angle.emit()});
        rotations[ 0 ] = m${pName};
      `
      const center = this.getCenter()

      preface += center !== undefined
        ? `        vec3 ${pName} = ( m${pName} * vec4(${name} - ${center.emit()}, 1.) ).xyz + ${center.emit()};\n`
        : `        vec3 ${pName} = ( m${pName} * vec4(${name}, 1.) ).xyz;\n`


      const sdf = this.sdf.emit( pName )
      let out = sdf.out

      if( typeof sdf.preface === 'string' )
        preface += sdf.preface

      return { out, preface }
    },
    glsl: `   mat4 rotationMatrix(vec3 axis, float angle) {
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
  },
  Translate:{
    parameters: [ { name:'amount', type:'vec3', default:Vec3(0) } ],
    emit( name='p' ) {
      const pId = MaterialID.alloc()//this.matId
      const pName = name+pId

      let preface = `vec3 ${pName} = ${name} - ${this.amount.emit()};\n`

      const sdf = this.sdf.emit( pName )
      let out = sdf.out

      if( typeof sdf.preface === 'string' ) preface += sdf.preface

      return { out, preface }
    }
  },
  Scale:{
    parameters: [{ name:'amount', type:'float', default:1 } ],
    emit( name='p' ) {
      const pId = MaterialID.alloc()//this.matId
      const pName = name+pId

      let preface = `         vec3 ${pName} = ${name} / ${this.amount.emit()};\n`

      let sdf = this.sdf.emit( pName )
      let out = sdf.out 
      
      sdf.preface += `      ${out}.x = ${out}.x * ${this.amount.emit()};\n`

      if( typeof sdf.preface === 'string' ) preface += sdf.preface

      return { out, preface }
    }
  }
}

const getDomainOps = function( SDF ) {
  const ops = {}

  for( let key in descriptions ) {
    const opDesc = descriptions[ key ]
    
    ops[ key ] = function( sdf, ...args ) {
      const op = Object.create( ops[ key ].prototype )
      op.sdf = sdf
      op.parameters = []
      op.transform = Transform()

      let count = 0
      for( let prop of opDesc.parameters ) {
        op.parameters.push({ name:prop.name})

        let arg = args[ count ]
        let __var

        switch( prop.type ) {
          case 'vec2':
            if( typeof arg === 'number' ) arg = Vec2( arg )
            if( arg === undefined ) arg = prop.default.copy()

            __var = param_wrap( 
              arg, 
              vec2_var_gen( prop.default )    
            )

            Object.defineProperty( op, prop.name, {
              get() { return __var },
              set(v) {
                if( typeof v === 'object' ) {
                  __var.set( v )
                }else{
                  __var.value.x = v
                  __var.value.y = v
                  __var.dirty = true
                }
              }
            })  

            break;
          case 'vec3':
            if( typeof arg === 'number' ) arg = Vec3( arg )
            if( arg === undefined ) arg = prop.default.copy()

            __var = param_wrap( 
              arg, 
              vec3_var_gen( prop.default )
            )

            Object.defineProperty( op, prop.name, {
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

            break;
          case 'vec4':
            if( typeof arg === 'number' ) arg = Vec4( arg )
              __var = param_wrap( 
              arg, 
              vec4_var_gen( prop.default )  
            )

            if( arg === undefined ) arg = prop.default.copy()

            Object.defineProperty( op, prop.name, {
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

            break;
          default: // float
            __var =  param_wrap( 
              arg, 
              float_var_gen( prop.default )
            )

            Object.defineProperty( op, prop.name, {
              get() { return __var },
              set(v) {
                __var.set( v ) 
              }
            })
            break;
        }

        count++
      }

      op.__desc = opDesc

      return op
    }

    ops[ key ].prototype = SceneNode()
    ops[ key ].prototype.emit = opDesc.emit
    ops[ key ].prototype.emit_decl = function() {
      let decl = ''
      decl += this.transform.emit_decl()
      for( let param of this.parameters ) {
        decl += this[ param.name ].emit_decl() 
      }
      decl += this.sdf.emit_decl()
      
      // for rotation etc... any extra glsl function that needs to
      // be added to the shader
      if( opDesc.glsl !== undefined && SDF.memo[ key ] === undefined ) {
        decl += opDesc.glsl
        SDF.memo[ key ] = true
      }

      return decl
    }
    ops[ key ].prototype.update_location = function( gl, program ) {
      for( let param of this.parameters ) this[ param.name ].update_location( gl, program)
      this.sdf.update_location( gl, program )
      this.transform.update_location( gl, program )
    }
    ops[ key ].prototype.upload_data = function( gl ) {
      for( let param of this.parameters ) this[ param.name ].upload_data( gl )
      this.sdf.upload_data( gl )
      this.transform.upload_data( gl )
    }
  }
  
  ops.Repeat = ops.Repetition
  ops.PolarRepeat = ops.PolarRepetition

  return ops
}

module.exports = getDomainOps
