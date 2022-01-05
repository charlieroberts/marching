const SceneNode = require( './sceneNode.js' ),
      { param_wrap, MaterialID } = require( './utils.js' ),
      { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen } = require( './var.js' )

const { Vec2, Vec3, Vec4 } = require( './vec.js' )

const BG = function( Scene, SDF ) {

  const Background = function( color ) {
    if( SDF.memo.background === undefined ) {
      const bg = Object.create( Background.prototype )

      if( color !== undefined && color.type === 'vec3' ) color = Vec4( color.x, color.y, color.z, 1 )
      const __color = param_wrap( Vec4( color ), vec4_var_gen( 0,0,0,1, 'bg' ), 'bg' )  
      
      Object.defineProperty( bg, 'color', {
        get() { return __color },
        set( v ) {
          __color.var.set( v )
        }
      })
      
      // this refers to the current scene via implicit binding in scene.js
      //this.postprocessing.push( bg )
      bg.__backgroundColor = color
      this.__background = bg

      SDF.memo.background = true
    }
    return this
  }

  Background.prototype = SceneNode()
 
  Object.assign( Background.prototype, {
    emit() {
      return ''// this.color.emit()
    },
   
    emit_decl() {
      //let str = this.color.emit_decl()
      //SDF.memo.background = true
        
      const out = this.__backgroundColor === undefined
        ? 'vec4 bg = vec4(0.,0.,0.,1.);'
        : `vec4 bg = vec4(${ this.__backgroundColor.x }, ${this.__backgroundColor.y}, ${this.__backgroundColor.z}, 1.);`

      return out
    },

    update_location( gl, program ) {
      this.color.update_location( gl, program )
    },

    upload_data( gl ) {
      this.color.upload_data( gl )
    }
  })

  return Background
}

module.exports = BG 
