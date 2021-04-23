const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc } = require( './var.js' )
const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const { Vec2, Vec3, Vec4 } = require( './vec.js' )
const Transform = require( './transform.js' )

const descriptions = {
  Elongation: {
    parameters:[ { name:'active', type:'float', default:1. },{ name:'distance', type:'vec3', default:Vec3(0) } ],
    func:`
      vec4 opElongate( in vec3 p, in vec3 h ) {
        //return vec4( p-clamp(p,-h,h), 0.0 ); // faster, but produces zero in the interior elongated box
        
        vec3 q = abs(p)-h;
        return vec4( max(q,0.0), min(max(q.x,max(q.y,q.z)),0.0) );
      }`,
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
      { name:'distance', type:'vec3', default:Vec3(.25) },
      { name:'active', type:'float', default:1. }
    ],
    emit( name='p', transform=null) {
      const pId = VarAlloc.alloc()
      const pName = 'p' + pId

      if( transform !== null ) this.transform.apply( transform, false )
      this.transform.invert()

      const pointString =  `( ${name} * ${this.transform.emit()} ).xyz`

      let preface =`
          vec4 ${pName} = vec4( polarRepeat( ${pointString}, ${this.__target.count.emit() } ) * ${this.transform.emit_scale()}, 1. ); 
          ${pName} -= vec4(${this.__target.distance.emit()}.x,0.,0.,0.);\n`

      const sdf = this.sdf.emit( pName )

      if( typeof sdf.preface === 'string' ) preface += sdf.preface

      return { out:sdf.out, preface }
    }
  },
  Mirror: {
    parameters: [ { name:'distance', type:'vec3', default:Vec3(0) },{ name:'active', type:'float', default:1. }  ],
    extra:[{ name:'dims', type:'local', default:'xyz' }],

    emit( name='p', transform=null, notused=null, scale=null ) {
      const pId = VarAlloc.alloc()
      const pName = 'p' + pId

      if( transform !== null ) {
        this.transform.apply( transform, false )
      }
      this.transform.invert()
     
      const pointString =  `( ${name} * ${this.transform.emit()} ).xyz`,
            s = scale === null ? this.transform.emit_scale() : `${this.transform.emit_scale()} * ${scale}`
 
      let preface =`
        vec4 ${pName} = vec4( ( ${pointString} ) , 1.);\n
        ${pName}.${this.dims} = abs( ${pName}.${this.dims} );\n`

      const sdf = this.sdf.emit( pName, null, null, s )

      if( typeof sdf.preface === 'string' ) preface += sdf.preface 

      return { out:sdf.out, preface }
    }
  },


  //let preface = `         vec3 ${pName} = ${name} / ${this.amount.emit()};\n`

  //let sdf = this.sdf.emit( pName )
  //let out = sdf.out 

  //sdf.preface += `      ${out}.x = ${out}.x * ${this.amount.emit()};\n`

  //if( typeof sdf.preface === 'string' ) preface += sdf.preface
  Repetition: {
    parameters: [ { name:'distance', type:'vec3', default:Vec3(0) },  { name:'active', type:'float', default:1. }],
    emit( name='p', transform=null ) {
      const pId = VarAlloc.alloc()
      const pName = 'p' + pId

      if( transform !== null ) this.transform.apply( transform, false )
      
      this.transform.invert()
     
      const pointString =  `( ${name} * ${this.transform.emit()} ).xyz`;

      let preface =`
        vec4 ${pName} = vec4( (mod( ${pointString}, ${this.__target.distance.emit()} ) - .5 * ${this.__target.distance.emit()}) * ${this.transform.emit_scale()}, 1.);\n`

      const sdf = this.sdf.emit( pName )//, this.transform )//, 1, this.__target.distance )

      if( typeof sdf.preface === 'string' ) preface += sdf.preface 

      return { out:sdf.out, preface }
    }
  },
  // https://www.shadertoy.com/view/wlyBWm
  // https://www.shadertoy.com/view/NdS3Dh
  SmoothRepetition: {
    parameters: [ { name:'distance', type:'vec3', default:Vec3(0) },  { name:'smoothness', type:'float', default:.5 }],
    emit( name='p', transform=null ) {
      const pId = VarAlloc.alloc()
      const pName = 'p' + pId

      if( transform !== null ) this.transform.apply( transform, false )
      
      this.transform.invert()
     
      const pointString =  `( ${name} * ${this.transform.emit()} ).xyz`;

//    vec2 smoothrepeat_asin_sin(vec2 p,float smooth_size,float size){
//    p/=size;
//    p=asin(sin(p)*(1.0-smooth_size));
//    return p*size;

      let preface =`
        vec3 ${pName}Mod = ${pointString}/${this.__target.distance.emit()};
        ${pName}Mod = asin( sin( ${pName}Mod ) * (1.0 - ${this.__target.smoothness.emit()} ) );
        vec4 ${pName} = vec4( ${pName}Mod * ${this.__target.distance.emit()} * ${this.transform.emit_scale()}, 1. );\n`

      const sdf = this.sdf.emit( pName )//, this.transform )//, 1, this.__target.distance )

      if( typeof sdf.preface === 'string' ) preface += sdf.preface 

      return { out:sdf.out, preface }
    }
  },
  SmoothPolar: {
    parameters:[ 
      { name:'count', type:'float', default:5 },
      { name:'distance', type:'vec3', default:Vec3(.25) },
      { name:'active', type:'float', default:1. }
    ],
    emit( name='p', transform=null) {
      const pId = VarAlloc.alloc()
      const pName = 'p' + pId

      if( transform !== null ) this.transform.apply( transform, false )
      this.transform.invert()

      const pointString =  `( ${name} * ${this.transform.emit()} ).xyz`

      //s repetitions
      ////m smoothness (0-1)
      ////c correction (0-1)
      ////d object displace from center
/*vec2 smoothRot(vec2 p,float s,float m,float c,float d){
  s*=0.5;
  float k=length(p);
  float x=asin(sin(atan(p.x,p.y)*s)*(1.0-m))*k;
  float ds=k*s;
  float y=mix(ds,2.0*ds-sqrt(x*x+ds*ds),c);
  return vec2(x/s,y/s-d);
}*/ 
      let preface =`
          vec4 ${pName} = vec4( polarRepeat( ${pointString}, ${this.__target.count.emit() } ) * ${this.transform.emit_scale()}, 1. ); 
          ${pName} -= vec4(${this.__target.distance.emit()}.x,0.,0.,0.);\n`

      const sdf = this.sdf.emit( pName )

      if( typeof sdf.preface === 'string' ) preface += sdf.preface

      return { out:sdf.out, preface }
    }
  },
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
      op.name = key
      const target = op.__target = op // sdf.__target !== undefined ? sdf.__target : op

      let count = 0
      for( let prop of opDesc.parameters ) {
        op.parameters.push( prop )

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

            Object.defineProperty( target, prop.name, {
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

            Object.defineProperty( target, prop.name, {
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

            Object.defineProperty( target, prop.name, {
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

            Object.defineProperty( target, prop.name, {
              get() { return __var },
              set(v) {
                __var.set( v ) 
              }
            })
            break;
          }
        count++
      }
      
      if( opDesc.extra !== undefined ) {
        for( let extra of opDesc.extra ) {
          op[ extra.name ] = args[ count - 1 ] || extra.default
        }
      }
      op.sdf.active = op.active
      op.__setTexture = function(tex,props) {
        if( typeof tex === 'string' ) {
          this.texture = op.texture.bind( this )
          this.__textureObj = this.tex = Marching.Texture( tex,props,this.texture )
          this.__textureID = this.__textureObj.id
        }else{
          this.__textureObj = this.tex = Object.assign( tex, props )
          this.__textureID = this.__textureObj.id
        }
      }
      op.__setMaterial = function(mat) {
        if( typeof mat === 'string' ) mat = Marching.Material[ mat ]
        this.__material = this.mat = Marching.materials.addMaterial( mat )
      }
      op.__desc = opDesc

      if( key !== 'Mirror' ) op.sdf.repeat = op
      return op
    }

    ops[ key ].prototype = SceneNode()
    ops[ key ].prototype.emit = opDesc.emit
    
    ops[ key ].prototype.texture = function( ...args ) {
      this.__setTexture( ...args )
      this.sdf.texture( this.__textureObj )

      return this
    }
    ops[ key ].prototype.material = function( ...args ) {
      this.__setMaterial( ...args )
      this.sdf.material( this.__material )

      return this
    }

    ops[ key ].prototype.emit_decl = function( shouldEmitSDF=true ) {
      let decl = ''
      decl += this.transform.emit_decl()
      for( let param of this.parameters ) {
        decl += this.__target[ param.name ].emit_decl() 
      }
      if( shouldEmitSDF ) decl += this.sdf.emit_decl()
      
      // for rotation etc... any extra glsl function that needs to
      // be added to the shader
      if( opDesc.glsl !== undefined && SDF.memo[ key ] === undefined ) {
        decl += opDesc.glsl
        SDF.memo[ key ] = true
      }

      return decl
    }
    ops[ key ].prototype.update_location = function( gl, program, shouldUpdateSDF=true ) {
      for( let param of this.parameters ) this.__target[ param.name ].update_location( gl, program)
      if( shouldUpdateSDF ) this.sdf.update_location( gl, program )
      this.transform.update_location( gl, program )
    }
    ops[ key ].prototype.upload_data = function( gl, shouldUploadSDF=true ) {
      for( let param of this.parameters ) this.__target[ param.name ].upload_data( gl )
      this.transform.upload_data( gl )
      if( shouldUploadSDF ) this.sdf.upload_data( gl )
    }
  }
  
  ops.Repeat = ops.Repetition
  ops.RepeatScale = ops.RepetitionShrink
  ops.PolarRepeat = ops.PolarRepetition

  return ops
}

module.exports = getDomainOps
