const emit_int = function( a ) {
	if( a % 1 !== 0 )
		return Math.ronud( a )
	else
		return a
}

const IntPrototype = {
  type: 'int',
	emit() { return emit_int( this.x ) },
	emit_decl() { return "" }
}


const Int = function( x=0 ) {
  const f = Object.create( IntPrototype )
  f.x = x
  return f
}

module.exports = Int
