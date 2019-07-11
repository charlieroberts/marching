const SceneNode = require( './sceneNode.js' ),
      getPixels = require( 'get-pixels' ),
      createTexture = require( 'gl-texture2d' ),
      { param_wrap, MaterialID } = require( './utils.js' ),
      { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen } = require( './var.js' ),
      { Vec2, Vec3, Vec4 } = require( './vec.js' )

const glsl = require( 'glslify' )

const __Textures = function( SDF ) {

  const Textures = {
    textures:[],
    __textures:[],

    addTexture( tex ) {
      if( tex === undefined ) tex = Textures.texture.default

      if( Textures.textures.indexOf( tex ) === -1 ) {
        tex.id = Textures.textures.length

        // we have to dirty the texture so that its data
        // will be uploaded to new shaders, otherwise the
        // texture will only work the first time it's used, when
        // it's dirty on initialization.
        Textures.dirty( tex )

        Textures.textures.push( tex )
      } 

      return tex
    },

    texture( filenameOrPreset, props ){
      const isPreset = filenameOrPreset.indexOf( '.' ) === -1
      const defaults = { wrap:SDF.gl.MIRRORED_REPEAT }
      const tex = { isPreset, name:filenameOrPreset }

      Object.assign( tex, defaults, props )

      tex.image = getPixels( filenameOrPreset, (err,pixels) => {
        if( err !== null ) {
          console.error( err )
          return
        }
        tex.pixels = pixels
        tex.gltexture = createTexture( SDF.gl, pixels )
        tex.gltexture.wrap = tex.wrap
      })

      Textures.addTexture( tex )

      return tex 
    },

    dirty( tex ) {},
   
    emit_decl() {
      if( this.textures.length === 0 ) return ``//uniform sampler2D textures[1];` 

      let str = `uniform sampler2D textures[${this.textures.length}];\n\n` //= Texture[${this.textures.length}](`

      return str
    },
    
    update_location( gl, program ) {
      if( this.textures.length > 0 ) {
        this.textures.sort( (a,b) => a.id > b.id ? 1 : -1 ) 

        for( let tex of this.textures ) {
          tex.loc = gl.getUniformLocation( program, `textures[${tex.id}]` )
          tex.gltexture.bind( tex.id )
        }

        this.__textures = this.textures.slice( 0 )
        this.textures.length = 0
      }
    },

    upload_data( gl, program='' ) {
      for( let tex of this.__textures ) {
        gl.uniform1i( tex.loc,tex.id )
      }
    }

  }

  const f = value => value % 1 === 0 ? value.toFixed(1) : value 

  return Textures
}

module.exports = __Textures
