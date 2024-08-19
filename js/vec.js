// add functions to animation callback if needed
const process = function( vec, dim, arg ) {

  if( typeof arg === 'function' ) {
    const fnc = arg
    Marching.postrendercallbacks.push( t => {
      vec[ dim ] = fnc( t ) 
      vec.dirty = true
      vec.var.dirty = true
    })

    // set initial value with t=0
    arg = fnc( 0 )
  }
  
  return arg
}

const Vec2 = function (x=0, y=0) {
  if( x.type === 'vec2' ) return x  
  const v = Object.create( Vec2.prototype )
  if( Array.isArray( x ) ) {
    v.x = process(v, 'x', x[0]); v.y = process(v, 'y', x[1]); 
  } else if( y === undefined ) {
    v.x = process(v, 'x', x)
    v.y = process(v, 'y', x)
  }else{
    v.x = process(v,'x',x); v.y = process(v,'y',y); 
  }

  return v
}

Vec2.prototype = {
  type: 'vec2',
	emit() { return "vec2(" + this.x + "," + this.y + ")" },
  emit_decl() { return ""; },
  copy() {
    return Vec2( this.x, this.y )
  }
}

const Vec3 = function (x=0, y, z) {
  if( x.type === 'vec3' ) return x  
  const v = Object.create( Vec3.prototype )
  let vx =0,vy=0,vz=0
  Object.defineProperties( v, {
    x: {
      get()  { return vx },
      set(v) { vx = v; this.dirty = true; }
    },

    y: {
      get()  { return vy },
      set(v) { vy = v; this.dirty = true; }
    },

    z: {
      get()  { return vz },
      set(v) { vz = v; this.dirty = true; }
    },
    r: {
      get()  { return vx },
      set(v) { vx = v; this.dirty = true; }
    },

    g: {
      get()  { return vy },
      set(v) { vy = v; this.dirty = true; }
    },

    b: {
      get()  { return vz },
      set(v) { vz = v; this.dirty = true; }
    },

  })

  if( Array.isArray( x ) ) {
    v.x = process(v,'x',x[0]); v.y = process(v,'y',x[1]); v.z = process(v,'z',x[2]); 
   } else if( y === undefined ) {
    v.x = process(v, 'x', x)
    v.y = process(v, 'y', x)
    v.z = process(v, 'z', x)
  }else{
    v.x = process(v,'x',x); v.y = process(v,'y',y); v.z=process(v,'z',z) 
  }
 
  v.isGen = v.x.type === 'string' || v.y.type === 'string' || v.z.type === 'string'
  return v
};

Vec3.prototype = {
  type: 'vec3',
  emit() { 
    let out = `vec3(`
    let preface = ''

    if( this.x.type === 'string' ) {
      const xout = this.x.emit()
      out += xout.out + ','
    }else{
      out += this.x + ','
    }

    if( this.y.type === 'string' ) {
      const yout = this.y.emit()
      out += yout.out + ',' 
    }else{
      out += this.y + ','
    }
    if( this.z.type === 'string' ) {
      const zout = this.z.emit()
      out += zout.out
    }else{
      out += this.z 
    }

    out += ')'

    return { out, preface }
  },
  emit_decl() { 
    let out = ''
    if( this.x.type === 'string' ) {
      out += this.x.emit_decl()
    } 
    if( this.y.type === 'string' && this.x !== this.y  ) {
      out += this.y.emit_decl()
    } 
    if( this.z.type === 'string' && this.z !== this.y && this.z !== this.x ) {
      out += this.z.emit_decl()
    } 
    return out
  },

	update_location(gl, program) {
    if( this.isGen ) {
      if( this.x.type === 'string' ) {
        this.x.update_location(gl,program)
      } 
      if( this.y.type === 'string' && this.x !== this.y  ) {
        this.y.update_location(gl,program)
      } 
      if( this.z.type === 'string' && this.z !== this.y && this.z !== this.x ) {
        this.z.update_location(gl,program)
      }      
    }
  },
  
  upload_data(gl) {
    if( this.isGen ) {
      if( this.x.type === 'string' ) {
        this.x.upload_data(gl)
      } 
      if( this.y.type === 'string' && this.x !== this.y  ) {
        this.y.upload_data(gl)
      } 
      if( this.z.type === 'string' && this.z !== this.y && this.z !== this.x ) {
        this.z.upload_data(gl)
      }      
    }
  },

  copy() {
    return Vec3( this.x, this.y, this.z )
  }

}

const Vec4 = function (x=0, y, z, w) {
  if( x.type === 'vec4' ) return x
  const v = Object.create( Vec4.prototype )

  if( Array.isArray( x ) ) {
    v.x = x[0]; v.y = x[1]; v.z = x[2]; v.w = x[3] 
  } else if( y === undefined && z === undefined) {
    v.x = v.y = v.z = v.w = x
  }else{
    v.x = x; v.y = y; v.z = z; v.w = w;;
  }

  v.isGen = v.x.type === 'string' || v.y.type === 'string' || v.z.type === 'string'

  return v
};

Vec4.prototype = {
  type: 'vec4',
  emit() { 
    let out = `vec4(`
    let preface = ''

    if( this.x.type === 'string' ) {
      const xout = this.x.emit()
      out += xout.out + ','
    }else{
      out += this.x + ','
    }

    if( this.y.type === 'string' ) {
      const yout = this.y.emit()
      out += yout.out + ',' 
    }else{
      out += this.y + ','
    }

    if( this.z.type === 'string' ) {
      const zout = this.z.emit()
      out += zout.out
    }else{
      out += this.z 
    }
    
    if( this.w.type === 'string' ) {
      const wout = this.w.emit()
      out += wout.out
    }else{
      out += this.w 
    }

    out += ')'

    return { out, preface }
  },
  emit_decl() { 
    let out = ''
    if( this.x.type === 'string' ) {
      out += this.x.emit_decl()
    } 
    if( this.y.type === 'string' && this.x !== this.y  ) {
      out += this.y.emit_decl()
    } 
    if( this.z.type === 'string' && this.z !== this.y && this.z !== this.x ) {
      out += this.z.emit_decl()
    } 
    if( this.w.type === 'string' && this.w !== this.y && this.w !== this.x && this.w !== this.z ) {
      out += this.w.emit_decl()
    }
    return out
  },

	update_location(gl, program) {
    if( this.isGen ) {
      if( this.x.type === 'string' ) {
        this.x.update_location(gl,program)
      } 
      if( this.y.type === 'string' && this.x !== this.y  ) {
        this.y.update_location(gl,program)
      } 
      if( this.z.type === 'string' && this.z !== this.y && this.z !== this.x ) {
        this.z.update_location(gl,program)
      }      
      if( this.w.type === 'string' && this.w !== this.y && this.w !== this.x && this.w !== this.z ) {
        this.w.update_location(gl,program)
      }  
    }
  },
  
  upload_data(gl) {
    if( this.isGen ) {
      if( this.x.type === 'string' ) {
        this.x.upload_data(gl)
      } 
      if( this.y.type === 'string' && this.x !== this.y  ) {
        this.y.upload_data(gl)
      } 
      if( this.z.type === 'string' && this.z !== this.y && this.z !== this.x ) {
        this.z.upload_data(gl)
      } 
      if( this.w.type === 'string' && this.w !== this.y && this.w !== this.x && this.w !== this.z ) {
        this.w.upload_data(gl)
      }      
    }
  },

  copy() {
    return Vec4( this.x, this.y, this.z, this.w )
  }
}
// Vec4

//let Vec4 = function (x, y, z, w) {
//  const v = Object.create( Vec4.prototype )
//  v.x = x; v.y = y; v.z = z; v.w = w

//  return v
//};

//Vec4.prototype = {
//  type: 'vec4',
//  emit() { return "vec4(" + this.x + "," + this.y + "," + this.z + "," + this.w + ")"; },
//  emit_decl() { return ""; }
//}





module.exports = { Vec2, Vec3, Vec4 } 
