const glsl = require( 'glslify' )
const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen } = require( './var.js' )

const getNoise = function( SDF ) {
Noise = function( strength=.25, bias=1, timeMod=1 ) {
  const op = Object.create( Noise.prototype )
  op.type = 'string'
  op.isGen = true

  const defaultValues = [.5,.5,.5]

  op.matId = MaterialID.alloc()

  const __strength = param_wrap( strength, float_var_gen( strength ) )
  const __timeMod  = param_wrap( timeMod, float_var_gen( timeMod ) )

  Object.defineProperty( op, 'strength', {
    get() { return __strength },
    set(v) {
     __strength.var.set( v )
    }
  })
  Object.defineProperty( op, 'timeMod', {
    get() { return __timeMod },
    set(v) {
     __timeMod.var.set( v )
    }
  })
  const __bias  = param_wrap( bias, float_var_gen( bias ) )

  Object.defineProperty( op, 'bias', {
    get() { return __bias},
    set(v) {
     __bias.var.set( v )
    }
  })
  return op
} 

Noise.prototype = SceneNode()

Noise.prototype.emit = function ( __name ) {
  let name = __name === undefined ? 'p' : __name

  const out = `(${this.bias.emit()} + snoise( vec4( p, time * ${this.timeMod.emit()} )) * ${this.strength.emit()})`  

  const output = {
    out,
    preface:''
  }

  return output
}
Noise.prototype.glsl = glsl`    #pragma glslify: noise = require('glsl-noise/simplex/4d')`

Noise.prototype.emit_decl = function () {
  let str = this.strength.emit_decl() + this.timeMod.emit_decl() + this.bias.emit_decl()

  if( SDF.memo.noise === undefined ) {
    str = Noise.prototype.glsl + str
    SDF.memo.noise = true
  }

  return str
};

Noise.prototype.update_location = function(gl, program) {
  this.strength.update_location( gl, program )
  this.timeMod.update_location( gl, program )
  this.bias.update_location( gl, program )
}

Noise.prototype.upload_data = function(gl) {
  this.strength.upload_data( gl )
  this.timeMod.upload_data( gl )
  this.bias.upload_data( gl )
}

return Noise

}

module.exports = getNoise 
