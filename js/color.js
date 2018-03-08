const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc } = require( './var.js' )

const Color = function( __r=0, __g=0, __b=0 ) {
  let __value = (__r << 16) + (__g << 8) + __b 
  const name = 'color' + VarAlloc.alloc()

  let __var  = float_var_gen( __value, name )()

  Object.defineProperty( __var, 'r', {
    get()  { return __r },
    set(v) { __r = v; __var.set(  __r * 255 * 255 + __g * 255 + __b ) }
  }) 
  Object.defineProperty( __var, 'g', {
    get()  { return __g },
    set(v) { __g = v; __var.set(  __r * 255 * 255 + __g * 255 + __b ) }
  }) 
  Object.defineProperty( __var, 'b', {
    get()  { return __b },
    set(v) { __b = v; __var.set(  __r * 255 * 255 + __g * 255 + __b ) }
  })

  return __var
}

module.exports = Color
