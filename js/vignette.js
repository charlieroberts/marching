const SceneNode = require( './sceneNode.js' ),
      { param_wrap, MaterialID } = require( './utils.js' ),
      { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc } = require( './var.js' )

const Vignette = function( Scene, SDF ) {

  const Vgn = function( radius=0.1, smoothness=16 ) {
    const vgn = Object.create( Vgn.prototype )
    const __radius = param_wrap( radius, float_var_gen( radius ) )  
    
    Object.defineProperty( vgn, 'radius', {
      get() { return __radius },
      set( v ) {
        __radius.set( v )
      }
    })

    const __smoothness = param_wrap( smoothness, float_var_gen( smoothness ) )  
    
    Object.defineProperty( vgn, 'smoothness', {
      get() { return __smoothness },
      set( v ) {
        __smoothness.set( v )
      }
    })
    
    // this refers to the current scene via implicit binding in scene.js
    this.postprocessing.push( vgn )

    return this
  }

  Vgn.prototype = SceneNode()
 
  Object.assign( Vgn.prototype, {
    emit() {
      return `  color *= vignette( uv, ${this.radius.emit()}, ${this.smoothness.emit()} );`
    },
   
    emit_decl() {
      let str = this.radius.emit_decl() + this.smoothness.emit_decl()
      // taken from https://gist.github.com/r-lyeh-archived/170b53fcdc0e17afcf15
      // originally iq
      const preface = `  float vignette(vec2 uv, float radius, float smoothness) {
        return radius + 0.5*smoothness*uv.x*uv.y*(1.0-uv.x)*(1.0-uv.y); 
      }
  `
      if( SDF.memo.vgn === undefined ) {
        str = str + preface
        SDF.memo.vgn = true
      }else{
        str = ''
      }

      return str
    },

    update_location( gl, program ) {
      this.radius.update_location( gl, program )
      this.smoothness.update_location( gl, program )
    },

    upload_data( gl ) {
      this.radius.upload_data( gl )
      this.smoothness.upload_data( gl )
    }
  })

  return Vgn
}

module.exports = Vignette 
