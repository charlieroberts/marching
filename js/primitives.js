const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc }  = require( './var.js' )
const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID, processVec3, processVec2 } = require( './utils.js' )
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

    textureMemo: [],

    emit_geometries() {
      const head = Array.isArray( SDF.__scene.__prerender ) ? SDF.__scene.__prerender[0] : SDF.__scene.__prerender
      const geos = Primitives.crawlNode( head, [] )

      geos.forEach( (geo,i) => {
        geo.__sdfID = i 
        if( geo.__textureObj !== undefined ) {
          SDF.textures.addTexture( geo.__textureObj )
        }
      })

      const length = geos.length
      const materials = SDF.materials.materials

      let decl = `SDF sdfs[${length}] = SDF[${length}](\n`
      geos.forEach( (geo, i) => {
        const textureID = geo.__textureObj === undefined ? 50000 : geo.__textureObj.id
        const hasRepeat = geo.repeat !== null && geo.repeat !== undefined
        decl += `        SDF( ${materials.indexOf( geo.__material )}, ${geo.transform.varName}, ${textureID}, ${hasRepeat ? geo.repeat.distance.emit() : 'vec3(0.)'}, ${hasRepeat ? geo.repeat.transform.emit() : `mat4(1.)`} )`
        if( i < geos.length - 1 ) decl += ','
        decl += '\n'
      })

      decl += `      );\n`

      this.geometries = geos

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
      p.transform.shouldInvert = true
      p.type = 'geometry'
      p.name = name
      p.repeat = null//Var( vars.vec3( 0 ), null, 'vec3' )

      p.__material = null
      p.__textureID  = 500000
      
      let count = 0

      // wrap each param in a Var object for codegen
      for( let param of params ) {
        if( param.name === 'color' ) {
          p.color = args[ count ] === undefined ? param.default : args[ count++ ]
          continue
        }
        // setup to enable passing functions 
        // to set values
        if( typeof args[count] === 'function' ) {
          const func = args[ count ]
          Marching.postrendercallbacks.push( t => {
            p[ param.name ] = func( t ) 
          })

          // set initial value with t=0
          args[ count ] = func( 0 )
        }
        if( param.type === 'obj' ) {error
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
          // a bit of santization...
          if( Array.isArray( args[ count ] ) ) {
            args[ count ] = defaultValues.length === 3 
              ? processVec3( args[ count ] )
              : processVec2( args[ count ] )
          }
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

      p.id = VarAlloc.alloc()

      p.__desc = desc
      p.__setMaterial = function(mat) {
        if( typeof mat === 'string' ) mat = SDF.Material[ mat ]
        this.__material = this.mat = SDF.materials.addMaterial( mat )
      }

      p.__setTexture = function(tex,props) {
        if( typeof tex === 'string' ) {
          this.texture = p.texture.bind( this )
          this.__textureObj = this.tex = SDF.Texture( tex,props,this.texture )
          this.__textureID = this.__textureObj.id
        }else{
          this.__textureObj = this.tex = Object.assign( tex, props )
          this.__textureID = this.__textureObj.id
        }
      }
      p.__setBump = function(tex,props) {
        //this.bump = p.bump.bind( this )
        const b = this.bump = this.__bumpObj = SDF.Bump( this, tex, props )
        this.bump.texture = this.bump.amount.value
        this.__bumpID = this.__bumpObj.id
        this.rotate = this.bump.rotate
        this.translate = this.bump.translate
        this.scale = this.bump.scale
        Object.defineProperty( this.bump, 'strength', {
          get() { return b.size },
          set(v){ b.size = v }
        })
      }

      Object.assign( p, {
        renderingBump : false,
        emittingDecl  : false,
        uploading     : false,
        updating      : false
      })

      if( p.__material === null ) p.__setMaterial()

      SDF.geometries.push( p )

      return p
    }

    // define prototype to use
    Primitives[ name ].prototype = SceneNode()
    Primitives[ name ].prototype.type = 'geometry'
    
    // create codegen string


    Primitives[ name ].prototype.emit = function ( __name, transform = null, bump=null, scale=null ) {
      // XXX after the first time a primitive is rendered, all its 
      // properties / transform are set to not be dirty, which means that
      // the next time it is rendered, none of it's data is uploaded
      // correctly. The next few lines set all the properties to be
      // dirty as well as the transform
      this.__dirty() 

      if( SDF.memo[ this.id ] !== undefined ) return { preface:'', out:name+this.matId }
      if( this.__bumpObj !== undefined && this.renderingBump === false) {
        this.renderingBump = true
        return this.__bumpObj.emit( __name, transform )
      }
      
      const shaderCode = desc.glslify.indexOf('#') > -1 
        ? desc.glslify.slice(18) 
        : desc.glslify

      if( SDF.requiredGeometries.indexOf( shaderCode ) === - 1 ) {
        SDF.requiredGeometries.push( shaderCode )
      } 

      if( transform !== null ) this.transform.apply( transform, false )
      //this.transform.invert( true )
      this.transform.internal()

      const pname = typeof __name !== 'string' ? 'p' : __name,
            id = this.__sdfID,
            s = scale === null ? this.transform.emit_scale() : `${this.transform.emit_scale()} * ${scale}`,
            tstring = `( ${pname} * ${this.transform.emit()} ).xyz`
      
      const primitive = `
        vec2 ${name}${this.id} = vec2( ${desc.primitiveString.call( this, tstring, bump )} * ${s}, ${id}.);
      `
      SDF.memo[ this.id ] = name + this.id

      this.renderingBump = false
      return { preface:primitive, out:name+this.id  }
    }
    
    // declare any uniform variables
    Primitives[ name ].prototype.emit_decl = function() {
      if( this.__bumpObj !== undefined && this.emittingDecl === false) {
        this.emittingDecl = true
        return this.__bumpObj.emit_decl() 
      }
      let decl = ''
      decl += this.transform.emit_decl()

      if( this.__repeat !== undefined ) decl += this.__repeat.emit_decl( false )
      if( this.__polarRepeat !== undefined ) decl += this.__polarRepeat.emit_decl( false )

      for( let param of params ) {
        if( param.name !== 'material' )
          decl += this[ param.name ].emit_decl( )
      }

      this.emittingDecl = false
      return decl
    }

    Primitives[ name ].prototype.update_location = function( gl, program ) {
      if( this.__bumpObj !== undefined && this.updating === false) {
        this.updating = true
        return this.__bumpObj.update_location( gl, program )
      }

      for( let param of params ) {
        if( param.type !== 'obj' && param.name !== 'material' ) { 
          this[ param.name ].update_location( gl,program )
        }
      }
     

      if( this.__repeat !== undefined ) this.__repeat.update_location( gl, program, false )
      if( this.__polarRepeat !== undefined ) this.__polarRepeat.update_location( gl, program, false )
      this.transform.update_location( gl, program )
      this.updating = false
    }

    Primitives[ name ].prototype.upload_data = function( gl ) {
      if( this.__bumpObj !== undefined && this.uploading  === false ) {
        this.uploading = true
        return this.__bumpObj.upload_data( gl )
      }
      for( let param of params ) {
        if( param.type !== 'obj' && param.name !== 'material' ) {
          this[ param.name ].upload_data( gl )
        }
      }

      if( this.__polarRepeat !== undefined ) this.__polarRepeat.upload_data( gl, false )
      this.transform.upload_data( gl )
      this.uploading = false
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
