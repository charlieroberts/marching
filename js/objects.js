const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen } = require( './var.js' )
const { Vec2, Vec3, Vec4 } = require( './vec.js' )
const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialIDAlloc } = require( './utils.js' )


const { Union, SmoothUnion, Intersection, Substraction } = require( './distanceOperations.js' )
const Subtraction = Substraction
const { Scale, Repeat } = require( './domainOperations' )


const __out = {
	Vec2,
	Vec3,
	Vec4,
  Var,
	SceneNode,
 	Union,
	Intersection,
  Substraction,
  Subtraction,
  Scale,
  Repeat,
	SmoothUnion: SmoothUnion
}

Object.assign( __out, require( './primitives.js' ) )

module.exports = __out
