const { param_wrap, MaterialID } = require( './utils.js' )
const Matrix = require( './external/matrix.js' )

const MatrixWrap = function () {
  const m = Object.create( MatrixWrap.prototype )
  m.dirty = true
  m.translation = {}
  m.scale = {}
  m.rotation = {
    axis: {}
  }

  let tx = 0, ty = 0, tz = 0
  Object.defineProperties( m.translation, {
    x: {
      get() { return tx },
      set(v){
        tx = v
        //m.__data = m.__data.multiply( Matrix.translate( tx, ty, tz ) )
        m.dirty = true
      }
    },
    y: {
      get() { return ty },
      set(v){
        ty = v
        //m.__data = m.__data.multiply( Matrix.translate( tx, ty, tz ) )
        m.dirty = true
      }
    },
    z: {
      get() { return tz },
      set(v){
        tz = v
        //m.__data = m.__data.multiply( Matrix.translate( tx, ty, tz ) )
        m.dirty = true
      }
    },
  })

  // scaling must be sent as separate uniform to avoid sdf over estimation 
  let scale = 1
  Object.defineProperty( m,'scale', {
    get() { return scale },
    set(v){
      scale = v
      //m.__data = m.__data.multiply( Matrix.rotate( angle, rx, ry, rz ) )
      m.dirty = true
    } 
  })

  /* FOR NON-UNIFORM SCALING:
   *
   * 1. comment out scale property above
   * 2. uncomment scale property below
   * 3. change emit_decl to use a vec3 for scale
   * 4. change upload_data to upload a 3f
   * 5. In "primitives.js", replace line 155 (part of emit) to use compensated scaling
   */ 

  //let sx = 1, sy = 1, sz = 1
  //Object.defineProperties( m.scale, {
  //  x: {
  //    get() { return sx },
  //    set(v){
  //      sx = v
  //      //m.__data = m.__data.multiply( Matrix.scale( sx, sy, sz ) )
  //      m.dirty = true
  //    }
  //  },
  //  y: {
  //    get() { return sy },
  //    set(v){
  //      sy = v
  //      //m.__data = m.__data.multiply( Matrix.scale( sx, sy, sz ) )
  //      m.dirty = true
  //    }
  //  },
  //  z: {
  //    get() { return sz },
  //    set(v){
  //      sz = v
  //      //m.__data = m.__data.multiply( Matrix.scale( sx, sy, sz ) )
  //      m.dirty = true
  //    }
  //  },
  //})

  let angle = 0
  Object.defineProperty( m.rotation, 'angle', {
    get() { return angle },
    set(v){
      angle = v
      //m.__data = m.__data.multiply( Matrix.rotate( angle, rx, ry, rz ) )
      m.dirty = true
    } 
  })

  let rx = 1, ry = 1, rz = 1
  Object.defineProperties( m.rotation.axis, {
    x: {
      get() { return rx },
      set(v){
        rx = v
        //m.__data = m.__data = Matrix.rotate( angle, rx, ry, rz, m.__data )
        m.dirty = true
      }
    },
    y: {
      get() { return ry },
      set(v){
        ry = v
        //m.__data = m.__data = Matrix.rotate( angle, rx, ry, rz, m.__data )
        m.dirty = true
      }
    },
    z: {
      get() { return rz },
      set(v){
        rz = v
        //m.__data = m.__data = Matrix.rotate( angle, rx, ry, rz, m.__data )
        m.dirty = true
      }
    },
  })

  m.__id   = MaterialID.alloc()  
  m.__data = Matrix.identity()
  m.__dirty = function() {}
  m.varName = 'transform' + m.__id

  return m
}

MatrixWrap.prototype = {
  type: 'matrix',

  emit() { return this.varName },

  emit_scale() { return this.varName + '_scale' },

  emit_decl() { 
    const decl =  `    uniform mat4 ${this.varName};
    uniform float ${this.varName}_scale;
    ` 

    return decl
  },

	update_location(gl, program) {
    //if( this.value.isGen ) {
    //  this.value.update_location( gl, program )
    //  return
    //}
		this.loc = gl.getUniformLocation( program, this.varName )
		this.loc_scale = gl.getUniformLocation( program, this.varName+'_scale' )
	},	

	upload_data(gl) {
		if( !this.dirty ) return
		
    //if( this.value.isGen ) {
    //  this.value.upload_data( gl  )
    //  this.dirty = false
    //  return
    //}
    

    this.__data = Matrix.identity()

    this.__data = this.__data.multiply( Matrix.translate( this.translation.x, this.translation.y, this.translation.z ) ) 
    this.__data = this.__data.multiply( Matrix.rotate( this.rotation.angle, this.rotation.axis.x, this.rotation.axis.y, this.rotation.axis.z ) )
    this.__data = this.__data.multiply( Matrix.scale( this.scale, this.scale, this.scale ) )

    const inverse = Matrix.inverse( this.__data )
    gl.uniformMatrix4fv( this.loc, false, inverse.m )
    
    //gl.uniform3f(this.loc_scale, this.scale.x, this.scale.y, this.scale.z )
    
    // scaling must be sent as separate uniform to avoid sdf over estimation 
    gl.uniform1f(this.loc_scale, this.scale )

		this.dirty = false
	}

}

module.exports = MatrixWrap
