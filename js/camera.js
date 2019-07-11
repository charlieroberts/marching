const Camera = {
  init( gl, program, handler ) {
    const camera_pos    = gl.getUniformLocation( program, 'camera_pos' )
    //const camera_normal = gl.getUniformLocation( program, 'camera_normal' )
    const camera_rot    = gl.getUniformLocation( program, 'camera_rot' )

    this.pos = { dirty:false }
    this.dir = { dirty:true }
    this.__rot = { dirty:true, value:0 }

    Object.defineProperty( this, 'rotation', {
      configurable:true,
      get() { return this.__rot.value },
      set(v) { 
        this.__rot.value = v 
        this.__rot.dirty = true
      }
    })

    let px = 0, py =0, pz = 5, nx = 0, ny = 0, nz = 0
    Object.defineProperties( this.pos, {
      x: {
        get()  { return px },
        set(v) { px = v; this.dirty = true; }
      },

      y: {
        get()  { return py },
        set(v) { py = v; this.dirty = true; }
      },

      z: {
        get()  { return pz },
        set(v) { pz = v; this.dirty = true; }
      },
    })

    Object.defineProperties( this.dir, {
      x: {
        get()  { return nx },
        set(v) { nx = v; this.dirty = true; }
      },

      y: {
        get()  { return ny },
        set(v) { ny = v; this.dirty = true; }
      },

      z: {
        get()  { return nz },
        set(v) { nz = v; this.dirty = true; }
      },
    })

    let init = false
    gl.uniform3f( camera_pos,    this.pos.x, this.pos.y, this.pos.z )
    //gl.uniform3f( camera_normal, this.dir.x, this.dir.y, this.dir.z )
    gl.uniform1f( camera_rot, this.rot ) 

    handler( ()=> {
      if( this.pos.dirty === true ) {
        gl.uniform3f( camera_pos, this.pos.x, this.pos.y, this.pos.z )
        this.pos.dirty = false
      }
      //if( this.dir.dirty === true ) {
      //  gl.uniform3f( camera_normal, this.dir.x, this.dir.y, this.dir.z )
      //  this.dir.dirty = false
      //}
      if( this.__rot.dirty === true ) {
        gl.uniform1f( camera_rot, this.__rot.value )
        this.__rot.dirty = false
      }
    })

  }
}

module.exports = Camera
