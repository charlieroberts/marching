const Var = require('./var.js').Var
const { Vec2, Vec3, Vec4 } = require( './vec.js' )

// Wrapper
function param_wrap( v, __default, name=null ) {
	if( v === undefined || v === null ) return __default()
	if( v.__isVar === true ) return v
	
	return Var( v, name )
}

const MaterialID = {
	current: 0,
	alloc() {
		return MaterialID.current++
  },
  clear() {
    MaterialID.current = 0
  }
}

const processVec2 = function( val ) {
  if( typeof val === 'number' ) 
    val = Vec2( color )
  else if( Array.isArray( val ) ) 
    val = Vec2( val[0], val[1] )

  return val
}

const processVec3 = function( val ) {
  if( typeof val === 'number' ) 
    val = Vec3( val )
  else if( Array.isArray( val ) ) 
    val = Vec3( val[0], val[1], val[2] )

  return val
}

module.exports = { param_wrap, MaterialID, processVec2, processVec3 }
