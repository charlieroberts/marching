const vec3 = require('gl-vec3')
const mat4 = require('gl-mat4')

// camera adapted from https://github.com/shama/first-person-camera
function FirstPersonCamera(opts) {
  if (!(this instanceof FirstPersonCamera)) return new FirstPersonCamera(opts)
  opts = opts || {}
  this.position = opts.position || vec3.create()
  this.rotation = opts.rotation || vec3.create()
  this.positionSpeed = opts.positionSpeed || -.5
  this.rotationSpeed = opts.rotationSpeed || .01
}
module.exports = FirstPersonCamera

FirstPersonCamera.prototype.view = function(out) {
  if (!out) out = mat4.create()
  // altered x/y ordering from original
  mat4.rotateY(out, out, this.rotation[1])
  mat4.rotateX(out, out, this.rotation[0])
  mat4.rotateZ(out, out, this.rotation[2] - Math.PI)
  mat4.translate(out, out, [-this.position[0], -this.position[1], -this.position[2]])

  return out
}

FirstPersonCamera.prototype.control = function(dt, move, mouse, prevMouse) {
  var speed = (this.positionSpeed / 1000) * dt
  var dir = [0,0,0]
  if (move[0]) dir[2] -= speed * (Marching.keys.Alt ? 4 : 1 )
  else if (move[1]) dir[2] += speed * (Marching.keys.Alt ? 4 : 1 )
  if (move[2]) dir[0] += speed * (Marching.keys.Alt ? 4 : 1 )
  else if (move[3]) dir[0] -= speed * (Marching.keys.Alt ? 4 : 1 )
  if (move[4]) dir[1] -= speed * (Marching.keys.Alt ? 4 : 1 )
  else if (move[5]) dir[1] += speed * (Marching.keys.Alt ? 4 : 1 )
  this.move(dir)
  // just use arrow keys instead of mouse
  // this.pointer(mouse, prevMouse)
}

FirstPersonCamera.prototype.move = function(dir) {
  if (dir[0] !== 0 || dir[1] !== 0 || dir[2] !== 0) {
    var cam = mat4.create()
    mat4.rotateY(cam, cam, this.rotation[1])
    mat4.rotateX(cam, cam, this.rotation[0])
    vec3.transformMat4(dir, dir, cam)
    vec3.add(this.position, this.position, dir)
  }
}

//FirstPersonCamera.prototype.pointer = function(da, db) {
//  var dt = [da[0] - db[0], da[1]- db[1]]
//  var rot = this.rotation
//  rot[1] -= dt[0] * this.rotationSpeed
//  if (rot[1] < 0) rot[1] += Math.PI * 2
//  if (rot[1] >= Math.PI * 2) rot[1] -= Math.PI * 2
//  rot[0] -= dt[1] * this.rotationSpeed
//  if (rot[0] < -Math.PI * .5) rot[0] = -Math.PI*0.5
//  if (rot[0] > Math.PI * .5) rot[0] = Math.PI*0.5
//}

const Camera = {
  init( gl, program, handler ) {
    const camera = FirstPersonCamera({
      fov: 190,
      near:.01,
      far:10,
      direction:[0,0,1],
      viewport:[1,1,1,-1]
    })
    camera.rotation = [0,Math.PI,Math.PI] 
    Camera.__camera = camera

    const camera_pos    = gl.getUniformLocation( program, 'camera_pos' )
    const camera_normal = gl.getUniformLocation( program, 'camera_normal' )
    const camera_rot    = gl.getUniformLocation( program, 'camera_rot' )
    const ucamera       = gl.getUniformLocation( program, 'camera' )

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
        set(v) { px = camera.position[0] = v;this.dirty = true; }
      },

      y: {
        get()  { return py },
        set(v) { py = camera.position[1] = v; this.dirty = true; }
      },

      z: {
        get()  { return pz },
        set(v) { pz = camera.position[2] = v; this.dirty = true; }
      },
    })

    Object.defineProperties( this.dir, {
      x: {
        get()  { return nx },
        set(v) { nx = camera.rotation[0] = v; this.dirty = true; }
      },

      y: {
        get()  { return ny },
        set(v) { ny = camera.rotation[1] = v; this.dirty = true; }
      },

      z: {
        get()  { return nz },
        set(v) { nz = camera.rotation[2] = v; this.dirty = true; }
      },
    })

    let init = false
    gl.uniform3f( camera_normal, this.dir.x, this.dir.y, this.dir.z )
    camera.position = [this.pos.x, this.pos.y, this.pos.z ] 
    //camera.update()
    gl.uniform3f( camera_pos, this.pos.x, this.pos.y, this.pos.z )
    gl.uniformMatrix4fv( ucamera, false, camera.view() )
    gl.uniform1f( camera_rot, this.rot ) 

    Camera.move = (x,y,z) => {
      camera.move([x,y,z])
      Camera.update()
    }
    Camera.moveTo = (x,y,z) => {
      camera.position[0] = x
      camera.position[1] = y
      camera.position[2] = z
      Camera.update()
    }
    Camera.update = ()=> {
      const pos = camera.position
      gl.uniform3f( camera_pos, pos[0], pos[1], pos[2]  )
      gl.uniformMatrix4fv( ucamera, false, camera.view() )
    }

    let prvx = 0, prvy = 0, x = 0, y = 0
    Camera.__mousemovefnc = e => {
      prvx = x
      prvy = y
      x = e.pageX
      y = e.pageY
    }

    let prevTime = 0
    let k  = Marching.keys
    Camera.__framefnc = t => {
      if( k.ArrowLeft ) camera.rotation[1] += camera.rotationSpeed
      if( k.ArrowRight ) camera.rotation[1] -= camera.rotationSpeed
      if( k.ArrowUp && !k.Shift ) camera.rotation[0] -= camera.rotationSpeed
      if( k.ArrowDown && !k.Shift) camera.rotation[0] += camera.rotationSpeed
      
      if( Marching.cameraEnabled ) { 
        camera.control( 
          t*1000 - prevTime,
          [k.w,k.s,k.d,k.a,k.ArrowUp && k.Shift, k.ArrowDown && k.Shift], 
          [x,y], [prvx,prvy] 
        )
        Camera.update()
        prvx = x
        prvy = y
        prevTime = t*1000
      }
    }

    Camera.__mousemove = null
    Camera.on = ()=> {
      if( Camera.__mousemove === null ) {
        window.addEventListener( 'mousemove', Camera.__mousemovefnc )
        Camera.__mousemove = true
      }
      if( Marching.callbacks.indexOf( Camera.__framefnc ) === -1 ) {
        Marching.callbacks.push( Camera.__framefnc )
      }
    }

    handler( ()=> {
      if( this.pos.dirty === true ) {
        //camera.position = [this.pos.x, this.pos.y, this.pos.z ]
 
        //camera.position = [this.pos.x, this.pos.y, this.pos.z ]
        //camera.update()
        const pos = camera.position
        gl.uniform3f( camera_pos, pos[0], pos[1], pos[2] )
        gl.uniformMatrix4fv( ucamera, false, camera.view() )
        this.pos.dirty = false
      }

      // XXX this is broken and needs to be fixed
      if( this.dir.dirty === true ) {
        gl.uniform3f( camera_normal, this.dir.x, this.dir.y, this.dir.z )
        gl.uniformMatrix4fv( ucamera, false, camera.view() )
        this.dir.dirty = false
      }
      if( this.__rot.dirty === true ) {
        gl.uniform1f( camera_rot, this.__rot.value )
        this.__rot.dirty = false
      }
    })

  }
}

module.exports = Camera
