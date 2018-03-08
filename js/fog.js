const SceneNode = require( './sceneNode.js' ),
      { param_wrap, MaterialID } = require( './utils.js' ),
      { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen } = require( './var.js' )

const Fogger = function( Scene, SDF ) {

  const Fog = function( amount=0.055, color ) {
    const fog = Object.create( Fog.prototype )
    const __amount = param_wrap( amount, float_var_gen( amount ) )  
    
    Object.defineProperty( fog, 'amount', {
      get() { return __amount },
      set( v ) {
        __amount.var.set( v )
      }
    })

    const __color = param_wrap( color, vec3_var_gen( .5,.6,.7 ) )  
    
    Object.defineProperty( fog, 'color', {
      get() { return __color },
      set( v ) {
        __color.var.set( v )
      }
    })
    
    // this refers to the current scene via implicit binding in scene.js
    this.postprocessing.push( fog )

    return this
  }

  Fog.prototype = SceneNode()
 
  Object.assign( Fog.prototype, {
    emit() {
      return `  color = applyFog( color, t.x, ${this.amount.emit()} );`
    },
   
    emit_decl() {
      let str = this.amount.emit_decl() + this.color.emit_decl()
      const preface = `  vec3 applyFog( in vec3 rgb, in float distance, in float amount ) {
    float fogAmount = 1. - exp( -distance * amount );
    vec3  fogColor  = ${this.color.emit()};
    return mix( rgb, fogColor, fogAmount );
  }
  `
      if( SDF.memo.fog === undefined ) {
        str = str + preface
        SDF.memo.fog = true
      }else{
        str = ''
      }

      return str
    },

    update_location( gl, program ) {
      this.amount.update_location( gl, program )
      this.color.update_location( gl, program )
    },

    upload_data( gl ) {
      this.amount.upload_data( gl )
      this.color.upload_data( gl )
    }
  })

  return Fog
}

module.exports = Fogger
