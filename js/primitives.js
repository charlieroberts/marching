const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc }  = require( './var.js' )
const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const { Vec2, Vec3, Vec4 } = require( './vec.js' )
const Transform = require( './transform.js' )

const createPrimitives = function( SDF ) {

  const gens = { 
    int:   int_var_gen,
    float: float_var_gen,
    vec2: vec2_var_gen,
    vec3: vec3_var_gen,
    vec4: vec4_var_gen,
  }

  const vars = { 
    vec2: Vec2,
    vec3: Vec3,
    vec4: Vec4
  }

  // load descriptions of all primtives
  const descriptions = require( './primitiveDescriptions.js' )

  const Primitives = { 
    descriptions,

    emit_geometries() {
      const head = Array.isArray( SDF.__scene.__prerender ) ? SDF.__scene.__prerender[0] : SDF.__scene.__prerender
      const geos = Primitives.crawlNode( head, [] )

      geos.forEach( (geo,i) => geo.__sdfID = i )

      const length = geos.length
      const materials = SDF.materials.__materials

      let decl = `SDF sdfs[${length}] = SDF[${length}](\n`
      geos.forEach( (geo, i) => {
        decl += `        SDF( ${materials.indexOf( geo.__material )}, ${geo.transform.varName}, ${geo.__texture} )`
        if( i < geos.length - 1 ) decl += ','
        decl += '\n'
      })

      decl += `      );\n`

      return decl
    },

    crawlNode( node, arr ) {
      if( node.type === 'geometry' ) {
        arr.push( node )
      }else{
        if( node.a !== undefined ) Primitives.crawlNode( node.a, arr )
        if( node.b !== undefined ) Primitives.crawlNode( node.b, arr )
        if( node.sdf !== undefined ) Primitives.crawlNode( node.sdf, arr )
      }

      return arr
    }
  }

  const createPrimitive = function( name, desc ) {

    const params = desc.parameters
    // create constructor
    Primitives[ name ] = function( ...args ) {
      const p = Object.create( Primitives[ name ].prototype )
      p.params = params
      p.transform = Transform()
      p.type = 'geometry'

      p.__material = null
      p.__texture  = 500000
      
      let count = 0

      // wrap each param in a Var object for codegen
      for( let param of params ) {
        if( param.name === 'color' ) {
          p.color = args[ count ] === undefined ? param.default : args[ count++ ]
          continue
        }else if( param.name === 'material' ) {
          //p.material = args[ count++ ] 
          //p.material = SDF.materials.addMaterial( p.material )
          //if( SDF.materials.materials.indexOf( p.material ) === -1 ) {
          //  console.log( 'pushing material' )
          //  p.material.id = MaterialID.alloc()
          //  SDF.materials.materials.push( p.material )
          //}
          continue
        }
        if( param.type === 'obj' ) {
          let __value = args[ count++ ]
          p[ param.name ] = {
            get value() { return __value },
            set value(v){ __value = v },
            emit() {
              const output =  p[ param.name ].value.emit()
              return output
            },
            emit_decl() {
              return p[ param.name ].value.a.emit_decl() + p[param.name].value.b.emit_decl()
            }
          }
          continue
        }
        const defaultValues = param.default
        const isArray = Array.isArray( defaultValues )

        if( isArray ) {
          let val = args[ count++ ], __var

          if( typeof val === 'number' ) {
            __var = Var( vars[ param.type ]( val ), null, 'vec3' )
          }else{
            __var =  param_wrap(
              val,
              gens[ param.type ]( ...defaultValues ) 
            )
          }

          // for assigning entire new vectors to property
          Object.defineProperty( p, param.name, {
            configurable:true,
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

        }else{
          let __var  = param_wrap( 
            args[ count++ ], 
            gens[ param.type ]( defaultValues ) 
          )

          //__var.set( defaultValues )
          Object.defineProperty( p, param.name, {
            configurable:true,
            get() { return __var },
            set(v) {
              __var.set( v )
            }
          })
        }
      }

      //let mat = p.material
      //Object.defineProperty( p, 'material', {
      //  configurable:true,
      //  get() { return mat },
      //  set(v) {
      //    mat = SDF.materials.addMaterial( v )
      //  }
      //})
      // id used for sdf code
      p.id = VarAlloc.alloc()

      p.__desc = desc
      p.__setMaterial = mat => {
        if( typeof mat === 'string' ) mat = SDF.Material[ mat ]
        p.__material = SDF.materials.addMaterial( mat )
      }

      p.__setTexture = tex => {
        if( typeof mat === 'string' ) mat = SDF.Texture[ tex ]
        p.__texture = SDF.texture.addTexture( tex )
      }

      if( p.__material === null ) p.__setMaterial()

      SDF.geometries.push( p )

      return p
    }

    // define prototype to use
    Primitives[ name ].prototype = SceneNode()

    // create codegen string
    Primitives[ name ].prototype.emit = function ( __name ) {
      let shaderCode = desc.glslify.indexOf('#') > -1 ? desc.glslify.slice(18) : desc.glslify
      if( SDF.requiredGeometries.indexOf( shaderCode ) === - 1 ) {
        SDF.requiredGeometries.push( shaderCode )
      } 

      if( SDF.memo[ this.id ] !== undefined ) {
        return { preface:'', out:name+this.matId }
      }

      const pname = __name === undefined ? 'p' : __name

      //const id = SDF.materials.__materials.indexOf( this.__material )
      const id = this.__sdfID
      const s = this.transform.emit_scale()
      const pointString = `( ${pname} * ${this.transform.emit()} ).xyz`

      const primitive = `
        vec2 ${name}${this.id} = vec2(${desc.primitiveString.call( this,  pointString )} * ${s}, ${id} );
      `

      //vec2 ${name}${this.id} = vec2(${desc.primitiveString.call( this,  '_transform'+this.id )} * ${s}, ${id} );
      //vec2 ${name}${this.id} = vec2(${desc.primitiveString.call( this,  '_transform'+this.id )} * min( ${s}.x, min( ${s}.y, ${s}.z ) ), ${id} );
      SDF.memo[ this.id ] = name + this.id

      return { preface:primitive, out:name+this.id  }
    }
    
    // declare any uniform variables
    Primitives[ name ].prototype.emit_decl = function() {
      let decl = ''
      decl += this.transform.emit_decl()
      for( let param of params ) {
        if( param.name !== 'material' )
          decl += this[ param.name ].emit_decl()
      }

      return decl
    }

    Primitives[ name ].prototype.update_location = function( gl, program ) {
      for( let param of params ) {
        if( param.type !== 'obj' ) {
          if( param.name !== 'material' ) 
            this[ param.name ].update_location( gl,program )
        }
      }
      this.transform.update_location( gl, program )
    }

    Primitives[ name ].prototype.upload_data = function( gl ) {
      for( let param of params ) {
        if( param.type !== 'obj' && param.name !== 'material' )
          this[ param.name ].upload_data( gl )
      }
      this.transform.upload_data( gl )
    }
    
    return Primitives[ name ]
  }
  
  for( let name in descriptions ) {
    const desc = descriptions[ name ]
    createPrimitive( name, desc )
  }

  Primitives.create = createPrimitive

  return Primitives
}

module.exports = createPrimitives
