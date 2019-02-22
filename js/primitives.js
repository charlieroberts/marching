const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc }  = require( './var.js' )
const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const Color = require( './color.js' )

const createPrimitives = function( SDF ) {

  const gens = { 
    int:   int_var_gen,
    float: float_var_gen,
    vec2: vec2_var_gen,
    vec3: vec3_var_gen,
    vec4: vec4_var_gen,
    color: Color 
  }

  // load descriptions of all primtives
  const descriptions = require( './primitiveDescriptions.js' )

  const Primitives = {
    descriptions
  }

  const createPrimitive = function( name, desc ) {

    const params = desc.parameters
    // create constructor
    Primitives[ name ] = function( ...args ) {
      const p = Object.create( Primitives[ name ].prototype )
      p.params = params

      let count = 0

      // wrap each param in a Var object for codegen
      for( let param of params ) {
        if( param.name === 'color' ) {
          p.color = args[ count ] === undefined ? param.default : args[ count++ ]
          continue
        }else if( param.name === 'material' ) {
          p.material = args[ count++ ] 
          p.material = SDF.materials.addMaterial( p.material )
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
          let __var =  param_wrap( 
            args[ count++ ], 
            gens[ param.type ]( ...defaultValues ) 
          )

          // for assigning entire new vectors to property
          Object.defineProperty( p, param.name, {
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
            get() { return __var },
            set(v) {
              __var.set( v )
            }
          })
        }
      }

      // id used for sdf code
      p.id = VarAlloc.alloc()
      //p.color = Color( 255,0,255 )

      // holds operations like scale, rotate, repeat etc.
      p.domainOperations = []

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

      const id = SDF.materials.__materials.indexOf( this.material )

      const primitive = `        vec2 ${name}${this.id} = vec2(${desc.primitiveString.call( this, pname )}, ${id} );\n`

      SDF.memo[ this.id ] = name + this.id

      return { preface:primitive, out:name+this.id  }
    }
    
    // declare any uniform variables
    Primitives[ name ].prototype.emit_decl = function() {
      let decl = ''
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
    }

    Primitives[ name ].prototype.upload_data = function( gl ) {
      for( let param of params ) {
        if( param.type !== 'obj' && param.name !== 'material' )
          this[ param.name ].upload_data( gl )
      }
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
