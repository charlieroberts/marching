const { Vec2, Vec3, Vec4 } = require( './vec.js' )
const float = require( './float.js' )
const int   = require( './int.js' )

// Var
const VarAlloc = {
	current: 0,
  clear() {
    VarAlloc.current = 0
  },
	alloc() {
		return VarAlloc.current++
	}
}

let Var = function( value, fixedName = null, __type ) {
  const v = Object.create( Var.prototype )
	v.varName = fixedName !== null ? fixedName : 'var' + VarAlloc.alloc()
  v.value = value
  v.type = v.value.type
  if( v.type === undefined ) v.type = __type || 'float' 

  value.var = v

  if( v.type !== 'float' && v.type !== 'int' ) {
    Object.defineProperties( v, {
      x: {
        get() { return this.value.x },
        set(v){ this.value.x = v; this.dirty = true }
      },
      y: {
        get() { return this.value.y },
        set(v){ this.value.y = v; this.dirty = true }
      },
      z: {
        get() { return this.value.z },
        set(v){ this.value.z = v; this.dirty = true }
      },
      w: {
        get() { return this.value.w },
        set(v){ this.value.w = v; this.dirty = true }
      },
    })
  }/*else{
    let __value = v.value
    Object.defineProperty( v, 'value', {
      get() { return __value },
      set(v){ __value = v; this.dirty = true }
    })
  }*/

  return v
}

Var.hardcode = false
const emit_float = function( a ) {
	if (a % 1 === 0)
		return a.toFixed( 1 )
	else
		return a
}

Var.prototype = {
	dirty: true,

	loc: -1,

  emit() { 
    let out
    if( this.value.isGen ) {
      const vecOut = this.value.emit() 
      out = vecOut.preface + vecOut.out
        
    }else{
      out = this.varName 
    } 

    return out
  },

  emit_decl() { 
    let out = ''
    if( this.value.isGen ) {
      out = this.value.emit_decl()
    }else{
      if( Var.hardcode === true ) {

        if( typeof this.value.emit !== 'function' ) {
          if( this.type === 'float' ) {
            out = `${this.type} ${this.varName} = ${emit_float(this.value)};\n`
          }else{
            out = `${this.type} ${this.varName} = ${this.value};\n`
          }
        }else{
          let val = this.value.emit()
          if( typeof val !== 'string' ) val = val.out
          out = val !== undefined ? `${this.type} ${this.varName} = ${val};\n` : ''
        }
      }else{
        out = `uniform ${this.type} ${this.varName};\n`
      }
    }
    return out
  },

	set(v) { this.value = v; this.dirty = true; },

	update_location(gl, program) {
    if( this.value.isGen ) {
      this.value.update_location( gl, program )
      return
    }
		this.loc = gl.getUniformLocation(program, this.varName)
	},	

	upload_data(gl) {
		if( !this.dirty ) return
		
    if( this.value.isGen ) {
      this.value.upload_data( gl  )
      this.dirty = false
      return
    }
		let v = this.value
		if (typeof v === 'number' ) {
			gl.uniform1f( this.loc, v )
		}else if ( v instanceof Vec2 ) {
			gl.uniform2f(this.loc, v.x, v.y )
		} else if( v instanceof Vec3 ) {
			gl.uniform3f(this.loc, v.x, v.y, v.z )
		} else if( v instanceof Vec4 ) {
			gl.uniform4f(this.loc, v.x, v.y, v.z, v.w )
    } else {
      // for color variables
      if( this.type === 'float' ) {
        gl.uniform1f( this.loc, v.x )
      }else{
        gl.uniform1i( this.loc, v.x )
      }
    }


		this.dirty = false
	}
}


function int_var_gen(x,name=null) { 
  let output = ()=> {
    let out = Var( int(x), name, 'int' ) 
    return out
  }

  return output
}

function float_var_gen(x,name=null) { return ()=> { return Var( float(x), name, 'float' ) } }

function vec2_var_gen(x, y,name=null) { return ()=> Var( Vec2(x, y), name  ) }

function vec3_var_gen(x, y, z,name=null) { return ()=> Var( Vec3(x, y, z), name ) }

function vec4_var_gen( x, y, z, w, name=null ) { return Var( Vec4( x, y, z, w ), name ) }

module.exports = { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc }
