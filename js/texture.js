const SceneNode = require( './sceneNode.js' ),
      getPixels = require( 'get-pixels' ),
      createTexture = require( 'gl-texture2d' ),
      { param_wrap, MaterialID } = require( './utils.js' ),
      { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc }  = require( './var.js' ), 
      { Vec2, Vec3, Vec4 } = require( './vec.js' )


const __Textures = function( SDF ) {
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

  const Textures = {
    textures:[],
    __textures:[],

    __texturePrefaces:[],
    __textureBodies:  [],

    __types: require( './textureDescriptions.js' ),
    __wrap : require( './textureWrap.js' ), 
    
    __emitFunction() {
      let pushedWrap = false

      let decl = `
      vec3 getTexture( int id, vec3 pos ) {
        vec3 tex;
        vec2 pos2;

        switch( id ) {\n`
      
      Textures.__textureBodies.length = 0

      let funcdefs = ''
      this.textures.forEach( (t,i) => {
        const mode = t.mode !== '2d' && t.glsl !== undefined ? '3d' : '2d'

        // add texture wrap function if needed
        if( mode === '2d' && pushedWrap === false ) {
          Textures.__textureBodies.push( Textures.__wrap )
          pushedWrap = true
        }

        let glsl = mode === '3d' ? t.glsl : t.glsl2d 
        const usesId = glsl.indexOf( '_id_' ) > -1 

        let functionName = mode === '2d' ? t.name + '2d' : t.name 
        if( usesId ) {
          glsl = glsl.replace( /\_id\_/g, t.id )
          glsl = glsl.replace( new RegExp( `${functionName}`, 'g'  ), functionName+t.id )
          functionName = functionName+t.id
        }
        if( Textures.__textureBodies.indexOf( glsl ) === -1 ) { 
          Textures.__textureBodies.push( glsl )
        }

        const args = t.parameters.map( p => t.__target[ p.name ].emit() ) 
        decl +=`
          case ${i}:
            ${mode === '2d' ? `     pos2 = getUVCubic( pos );\n` : ''} 
            tex = ${functionName}( ${mode === '2d' ?'pos2':'pos'} ${ args.length > 0 ? ',' + args.join(',') : ''} );
            break;\n`            

      })

      decl += `
          default:
            tex = vec3(0.);
            break;
        }

        return tex;
      }

      vec3 getTexture( int id, vec3 pos, vec3 nor, SDF sdf, bool useTransform ) {
        vec3 tex;
        vec2 pos2;
        vec3 tpos = pos;
        if( useTransform == true ) {
          if( length(sdf.repeat) != 0. ) {
            tpos = mod( (vec4(pos,1.) * sdf.repeatTransform).xyz, sdf.repeat) - .5 * sdf.repeat;
            tpos = ( vec4(tpos, 1.) * sdf.transform).xyz;
          }else{
            tpos = (vec4(tpos,1.) * sdf.transform).xyz;
          }
        }

        return getTexture( id, tpos );
      }
      `
     
      return { glsldefs: Textures.__textureBodies.join( '\n' ), mainfunc:decl }
    },

    clear() {
      Textures.textures.length = 0
    },

    addTexture( tex ) {
      // we have to dirty the texture so that its data
      // will be uploaded to new shaders, otherwise the
      // texture will only work the first time it's used, when
      // it's dirty on initialization.
      Textures.dirty( tex )

      // if texture with same name is already found, replace it,
      // otherwise push texture
      //const oldTex = Textures.textures.find( __tex => tex.name === __tex.name )
      //if( oldTex !== undefined ) {
      //  const idx = Textures.textures.indexOf( oldTex )
      //  Textures.textures.splice( idx, 1, tex )

      //  tex.id = idx 
      //}else{
        tex.id = Textures.textures.length
        Textures.textures.push( tex )
      //}

      return tex
    },

    texture( presetName='noise', props={}, target=null ){
      //const isPreset = filenameOrPreset.indexOf( '.' ) === -1
      //const defaults = { wrap:SDF.gl.MIRRORED_REPEAT }

      if( Textures.__types[ presetName ] === undefined ) {
        console.log( `the texture type '${presetName}' does not exist.` )
      }
      const tex = Object.assign( { mode:'3d' }, Textures.__types[ presetName ], props )

      if( target === null ) target = tex
      tex.__target = target

      for( let param of tex.parameters ) {
        const defaultValues = param.default
        const isArray = Array.isArray( defaultValues )

        let count = 0
        if( isArray ) {
          let val = props[ param.name ], __var

          if( typeof val === 'number' ) {
            __var = Var( vars[ param.type ]( val ), null, 'vec3' )
          }else{
            const initvalues = val !== undefined ? val : defaultValues
            __var = Var( vars[ param.type ]( ...initvalues ), null, param.type )
          }

          // for assigning entire new vectors to property
          Object.defineProperty( target, param.name, {
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
            props[ param.name ], 
            gens[ param.type ]( defaultValues ) 
          )

          //__var.set( defaultValues )
          Object.defineProperty( target, param.name, {
            configurable:true,
            get() { return __var },
            set(v) {
              __var.set( v )
            }
          })
        }
      }

      if( presetName === 'image' ) {
        if( props.filename !== undefined ) {
          tex.image = getPixels( props.filename, (err,pixels) => {
            if( err !== null ) {
              console.error( err )
              return
            }
            tex.pixels = pixels
            tex.gltexture = createTexture( SDF.gl, pixels )
            tex.gltexture.wrap = props.wrap === undefined ? Marching.gl.REPEAT : props.wrap
          })
        }else{
          tex.image = null
          console.error('You must specify a filename when using the iamge preset.')
        }
      }else if( presetName === 'canvas' ) {
        if( props.canvas === undefined ) {
          tex.canvas = tex.image = document.createElement('canvas')
        }else{
          tex.image = tex.canvas = props.canvas
        }
        if( props.height !== undefined ) {
          tex.canvas.height = props.height
        }
        if( props.width !== undefined ) {
          tex.canvas.width = props.width
        }

        tex.ctx    = tex.canvas.getContext('2d')

        tex.update = function() {
          //tex.gltexture.setPixels( SDF.fx.merger === null ? tex.image : SDF.fx.merger.tex.front.tex )
          tex.gltexture.setPixels( tex.image )
        }

        tex.gltexture = createTexture( SDF.gl, tex.image )
        tex.gltexture.wrap = props.wrap === undefined ? Marching.gl.REPEAT : props.wrap

        tex.update()
      }else if( presetName === 'feedback' ) {
        tex.canvas = tex.image = SDF.canvas 
        tex.ctx    = tex.canvas.getContext('2d')

        tex.update = function() {
          tex.gltexture.setPixels( tex.image )
          //tex.gltexture.setPixels( SDF.fx.merger === null ? tex.image : SDF.fx.merger.tex.front.tex )
        }

        tex.gltexture = createTexture( SDF.gl, tex.image )
        tex.gltexture.wrap = props.wrap === undefined ? Marching.gl.REPEAT : props.wrap

        tex.update()
      }


      Object.defineProperty( tex, 'wrap', {
        get() { return this.gltexture.wrap },
        set(v){ 
          this.gltexture.wrap = v 
        }
      })

      tex.name = presetName

      return tex 
    },

    dirty( tex ) {},
   
    emit_decl() {
      if( this.textures.length === 0 ) return '' 

      let decl = ''

      const memo = []
      let imageCount = 0;
      this.textures.forEach( (tex,i) => {
        if( memo.indexOf( tex ) === -1 ) {
          for( let param of tex.parameters ) {
            if( param.name !== 'material' )
              decl += tex.__target[ param.name ].emit_decl()
          }
          memo.push( tex )
        }
        if( tex.name === 'image' || tex.name === 'canvas' || tex.name === 'feedback' ) {
          imageCount++

          // for some reason can't immediately call update... 
          // have to wait for some type of dom initialization?
          // so call here
          if( tex.update ) tex.update()
        }
      })

      if( imageCount > 0 ) {
        decl += `\n      uniform sampler2D textures[${imageCount}];\n`
      }
      return decl
    },
    
    update_location( gl, program ) {
      if( this.textures.length > 0 ) {
        this.textures.forEach( (tex,i) => {
          for( let param of tex.parameters ) {
            if( param.type !== 'obj' ) {
              if( param.name !== 'material' ) 
                tex.__target[ param.name ].update_location( gl,program )
            }
          }
          if( tex.name === 'image' || tex.name === 'canvas' || tex.name === 'feedback' ) {
            tex.loc = gl.getUniformLocation( program, `textures[${tex.id}]` )
            tex.gltexture.bind( i )
          }
        })
      }

      //if( this.textures.length > 0 ) {
      //  this.textures.sort( (a,b) => a.id > b.id ? 1 : -1 ) 

      //  for( let tex of this.textures ) {
      //    tex.loc = gl.getUniformLocation( program, `textures[${tex.id}]` )
      //    tex.gltexture.bind( tex.id )
      //  }

      //  this.__textures = this.textures.slice( 0 )
      //  this.textures.length = 0
      //}
    },

    upload_data( gl, program ) {
      if( this.textures.length > 0 ) {
        this.textures.forEach( (tex,i) => {
          for( let param of tex.parameters ) {
            if( param.type !== 'obj' && param.name !== 'material' )
              tex.__target[ param.name ].upload_data( gl )
          }
          if( tex.name === 'image' || tex.name === 'canvas' || tex.name === 'feedback' ) {
            gl.uniform1i( tex.loc, i )
          }
        })
      }
    }

  }

  Textures.texture.create = function( props ) {
    Textures.__types[ props.name ] = props
  }

  Object.defineProperties( Textures.texture, {
    'repeat': { get() { return Marching.gl.REPEAT } },
    'mirror': { get() { return Marching.gl.MIRRORED_REPEAT } },
    'clamp': { get() { return Marching.gl.CLAMP_TO_EDGE } },
  })

  const f = value => value % 1 === 0 ? value.toFixed(1) : value 

  return Textures
}

module.exports = __Textures
