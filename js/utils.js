const Var = require('./var.js').Var


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

module.exports = { param_wrap, MaterialID }
