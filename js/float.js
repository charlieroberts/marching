const emit_float = function( a ) {
	if (a % 1 === 0)
		return a.toFixed( 1 )
	else
		return a
}

const FloatPrototype = {
  type: 'float',
	emit() { return emit_float( this.x ) },
	emit_decl() { return "" }
}


const Float = function( x=0 ) {
  const f = Object.create( FloatPrototype )
  f.x = x
  return f
}

module.exports = Float
