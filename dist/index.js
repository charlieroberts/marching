(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen } = require( './var.js' )

const ops = { 
  Onion: {
    func( sdf,thickness ) { return `vec2( opOnion( ${sdf}.x, ${thickness} ), ${sdf}.y )` },
    variables:[['thickness', 'float', .03]],
    def:`
float opOnion( in float sdf, in float thickness ){
  return abs(sdf)-thickness;
}
vec2 opOnion( vec2 sdf, float thickness ) {
  float x = 0.;

  sdf.x = opOnion( sdf.x, thickness );

  return sdf;
}   
`
  },
  Halve: {
    func( sdf, direction ) { return `vec2( opHalve( ${sdf}.x, p, ${direction} ), ${sdf}.y )` },
    variables:[['direction','int',0]],
    def:`
float opHalve( in float sdf, vec4 p, in int dir ){
  float _out = 0.;
  switch( dir ) {
    case 0:  
      _out = max( sdf, p.y );
      break;
    case 1:
      _out = max( sdf, -p.y );
      break;
    case 2:
      _out = max( sdf, p.x );
      break;
    case 3:
      _out = max( sdf, -p.x );
      break;
  }

  return _out;
}

vec2 opHalve( vec2 sdf, vec4 p, int dir ) {
  float x = 0.;

  x = opHalve( sdf.x, p, dir );

  sdf.x = x;

  return sdf;
}   
`
  },
  Round: {
    func( sdf, amount ) { return `vec2( ${sdf}.x - ${amount}, ${sdf}.y )` },
    variables:[['amount','float',.1]],
    def:`

    `
  }
}



//vec4 opElongate( in vec3 p, in vec3 h ) {
//  //return vec4( p-clamp(p,-h,h), 0.0 ); // faster, but produces zero in the interior elongated box
 
//  vec3 q = abs(p)-h;
//  return vec4( max(q,0.0), min(max(q.x,max(q.y,q.z)),0.0) );
//}
const pushString = function( name ) {
  const glslobj = ops[ name ].def

  // some definitions are a single string, and not split into
  // separate float and opOut functions
  if( typeof glslobj === 'string' ) {
    if( Alterations.__glsl.indexOf( glslobj ) === -1 ) {
      Alterations.__glsl.push( glslobj )
    }
  }
}

const Alterations = {
  __glsl:[],
  __getGLSL() {
    return this.__glsl.join('\n')
  },
  __clear() { this.__glsl.length = 0 }
}

for( let name in ops ) {

  // get codegen function
  let op = ops[ name ]

  // create constructor
  Alterations[ name ] = function( sdf, ...args ) {
    const __op = Object.create( Alterations[ name ].prototype )
    __op.sdf = sdf
    __op.variables = []
    __op.__desc = { parameters:[] }

    for( let i = 0; i < op.variables.length; i++ ) {
      const propArray = op.variables[ i ]
      const propName = propArray[ 0 ]
      const propType = propArray[ 1 ]
      const propValue = args[ i ] === undefined ? propArray[ 2 ] : args[ i ]

      __op.__desc.parameters.push({ name:propName, value:propValue })
      let param

      switch( propType ) {
        case 'int':
          param = int_var_gen( propValue )()
          break;
        default:
          param = float_var_gen( propValue )()
          break;
      }
      
      Object.defineProperty( __op, propName, {
        get() { return param },
        set(v) { param.set( v ) }
      })

      __op.variables.push( param )
    }
      
    __op.matId = MaterialID.alloc()

    return __op
  } 

  Alterations[ name ].prototype = SceneNode()

  Alterations[ name ].prototype.emit = function ( __name ) {
    const emitterA = this.sdf.emit( __name )
    pushString( name )
    //const emitterB = this.b.emit()

    const output = {
      out: op.func( emitterA.out, ...this.variables.map( v => v.emit() ) ), 
      preface: (emitterA.preface || '') 
    }

    return output
  }

  Alterations[name].prototype.emit_decl = function () {
    let str =  this.sdf.emit_decl() 
    for( let v of this.variables ) {
      str += v.emit_decl()
    }

    return str
  };

  Alterations[name].prototype.update_location = function(gl, program) {
    this.sdf.update_location( gl, program )
    for( let v of this.variables ) v.update_location( gl, program )
  }

  Alterations[name].prototype.upload_data = function(gl) {
    this.sdf.upload_data( gl )
    for( let v of this.variables ) v.upload_data( gl )
    
  }
}

Alterations.Halve.UP = 0
Alterations.Halve.DOWN = 1
Alterations.Halve.LEFT = 3
Alterations.Halve.RIGHT = 2

module.exports = Alterations

},{"./sceneNode.js":24,"./utils.js":29,"./var.js":30}],2:[function(require,module,exports){
const Audio = {
  __hasInput: false,
  ctx: null,
  bins:null,

  start( bins=null ) {
    if( Audio.__hasInput === false ) {
      Audio.ctx = new AudioContext()
      Audio.createInput().then( input => {
        if( bins !== null ) Audio.bins = bins
        Audio.createFFT()
        input.connect( Audio.FFT )

        Audio.interval = setInterval( Audio.fftCallback, 1000/60 )
        //window.FFT = Audio.FFT
      })
      Audio.__hasInput = true
    }else{
      if( bins !== null ) Audio.bins = bins
    }
  },

  createInput() {
    console.log( 'connecting audio input...' )
    
    const p = new Promise( resolve => {
      console.log( 'start?' )
      navigator.mediaDevices.getUserMedia({ audio:true, video:false })
        .then( stream => {
          console.log( 'audio input connected' )
          Audio.input = Audio.ctx.createMediaStreamSource( stream )
          //Audio.mediaStreamSource.connect( Gibberish.node )
          Audio.__hasInput = true
          resolve( Audio.input )
        })
        .catch( err => { 
          console.log( 'error opening audio input:', err )
        })
    })
    return p
  },

  createFFT() {
    Audio.FFT = Audio.ctx.createAnalyser()

    let __windowSize = 512
    Object.defineProperty( Audio, 'windowSize', {
      configurable:true,
      get() { return __windowSize },
      set(v){
        __windowSize = v
        Audio.FFT.fftSize = v 
        Audio.FFT.values = new Uint8Array( Audio.FFT.frequencyBinCount )
      }
    })

    Audio.windowSize = 512
  },

  fftCallback() {
    Audio.FFT.getByteFrequencyData( Audio.FFT.values )
    
    let lowSum, midSum, highSum, lowCount, midCount, highCount
    lowSum = midSum = highSum = lowCount = midCount = highCount = 0

    let frequencyCounter = 0

    // does this start at 0Hz? ack... can't remember... does it include DC offset?
    const hzPerBin = (Audio.ctx.sampleRate / 2) / Audio.FFT.frequencyBinCount
    const lowRange = 150, midRange = 1400, highRange = Audio.ctx.sampleRate / 2

    if( Audio.bins === null ) {
      for( let i = 1; i < Audio.FFT.frequencyBinCount; i++ ) {
        if( frequencyCounter < lowRange ) {
          lowSum += Audio.FFT.values[ i ]
          lowCount++
        }else if( frequencyCounter < midRange ) {
          midSum += Audio.FFT.values[ i ]
          midCount++
        }else{
          highSum += Audio.FFT.values[ i ]
          highCount++
        }

        frequencyCounter += hzPerBin
      }

      Audio.low = (lowSum / lowCount) / 255
      Audio.mid = (midSum / midCount) / 255 || 0
      Audio.high = (highSum / highCount) / 255
    }else{
      const sums = {}
      for( let bin = 0; bin < Audio.bins.length; bin++ ) {
        const frequency = Audio.bins[ bin ]

        sums[ bin ] = { count: 0, value: 0 }

        for( let i = 1; i < Audio.FFT.frequencyBinCount; i++ ) {
          if( frequencyCounter < frequency ) {
            sums[ bin ].value += Audio.FFT.values[i]
            sums[ bin ].count++
            frequencyCounter += hzPerBin
          }else{
            break
          }
        }
        Audio[ bin ] = (sums[ bin ].value / sums[ bin ].count) / 255 
      }
    }
  }
}

module.exports = Audio

},{}],3:[function(require,module,exports){
const SceneNode = require( './sceneNode.js' ),
      { param_wrap, MaterialID } = require( './utils.js' ),
      { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen } = require( './var.js' )

const { Vec2, Vec3, Vec4 } = require( './vec.js' )

const BG = function( Scene, SDF ) {

  const Background = function( color ) {
    if( SDF.memo.background === undefined ) {
      const bg = Object.create( Background.prototype )

      if( color !== undefined && color.type === 'vec3' ) color = Vec4( color.x, color.y, color.z, 1 )
      const __color = param_wrap( Vec4( color ), vec4_var_gen( 0,0,0,1, 'bg' ), 'bg' )  
      
      Object.defineProperty( bg, 'color', {
        get() { return __color },
        set( v ) {
          __color.var.set( v )
        }
      })
      
      // this refers to the current scene via implicit binding in scene.js
      //this.postprocessing.push( bg )
      bg.__backgroundColor = color
      this.__background = bg

      SDF.memo.background = true
    }
    return this
  }

  Background.prototype = SceneNode()
 
  Object.assign( Background.prototype, {
    emit() {
      return ''// this.color.emit()
    },
   
    emit_decl() {
      //let str = this.color.emit_decl()
      //SDF.memo.background = true
        
      const out = this.__backgroundColor === undefined
        ? 'vec4 bg = vec4(0.,0.,0.,1.);'
        : `vec4 bg = vec4(${ this.__backgroundColor.x }, ${this.__backgroundColor.y}, ${this.__backgroundColor.z}, 1.);`

      return out
    },

    update_location( gl, program ) {
      this.color.update_location( gl, program )
    },

    upload_data( gl ) {
      this.color.upload_data( gl )
    }
  })

  return Background
}

module.exports = BG 

},{"./sceneNode.js":24,"./utils.js":29,"./var.js":30,"./vec.js":31}],4:[function(require,module,exports){
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
    this.parent.pos.dirty = true

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
    camera.parent = this

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
      // XXX does this need to update property values?
      camera.move([x,y,z])
      Camera.update()
    }
    Camera.moveTo = (x,y,z) => {
      Camera.pos.x = x
      Camera.pos.y = y
      Camera.pos.z = z
    }
    Camera.update = ()=> {
      const pos = camera.position
      gl.uniform3f( camera_pos, pos[0], pos[1], pos[2]  )
      gl.uniformMatrix4fv( ucamera, false, camera.view() )
    }

    // determine an offset from the current camera position based
    // on the current camera rotation e.g. to always position a light
    // behind the camera.
    Camera.offset = (amt=[0,0,3]) => {
      const cam = mat4.create()
      mat4.rotateY(cam, cam, camera.rotation[1])
      mat4.rotateX(cam, cam, camera.rotation[0])
      vec3.transformMat4(amt, amt, cam)
      return amt
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
      if( typeof this.onmove === 'function' ) {
        this.onmove( this )
      }
    })

  }
}

module.exports = Camera

},{"gl-mat4":116,"gl-vec3":150}],5:[function(require,module,exports){
const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc } = require( './var.js' )
const Transform = require( './transform.js' )

const ops = { 
  // this needs to create an opOut, not return a vec2
  Displace( __name ) {
    let name = __name === undefined ? 'p' : __name
    const sdf = this.sdf.emit( name );

    const sdfStr = `float d1${this.id} = ${sdf.out}.x;\n`

    let displaceString = `float d2${this.id} = sin( ${this.amount.emit()}.x * ${name}.x ) * `  
    displaceString += `sin( ${this.amount.emit()}.y * ${name}.y ) * `
    displaceString += `sin( ${this.amount.emit()}.z * ${name}.z );\n`
    displaceString += `${sdf.out}.x = (d1${this.id} + d2${this.id}*${this.size.emit()})*.5;\n`

    const output = {
      out: `${sdf.out}`, 
      preface: sdf.preface + sdfStr + displaceString 
    }

    return output
  },
  Halve( __name ) {
    let name = __name === undefined ? 'p' : __name

    // XXX why?
    this.transform.invert()

    const bumpString =  `        vec4 transformBump${this.id} = ${name} * ${this.transform.emit()};\n`
    const pointString = `        vec4 transformBump2${this.id} = (transformBump${this.id} * ${this.sdf.transform.emit()});\n`
    const sdf = this.sdf.emit( `transformBump2${this.id}` );

    let displaceString = `${sdf.out}.x = opHalve( ${sdf.out}.x, transformBump2${this.id}, int(${this.amount.emit()}) );`

    const output = {
      out: `${sdf.out}`, 
      preface: bumpString + pointString + sdf.preface + displaceString 
    }

    return output
  },
  Bend( __name ) {
    let name = __name === undefined ? 'p' : __name
    const sdf = this.sdf.emit( 'q'+this.id );

    let preface=`        float c${this.id} = cos( ${this.amount.emit()}.x * ${name}.x );
        float s${this.id} = sin( ${this.amount.emit()}.x * ${name}.x );
        mat2  m${this.id} = mat2( c${this.id},-s${this.id},s${this.id},c${this.id} );
        vec4  q${this.id} = vec4( m${this.id} * ${name}.xy, ${name}.z, 1. );\n`

    if( typeof sdf.preface === 'string' ) {
      preface += sdf.preface
    }

    return { preface, out:sdf.out }
  },

  Twist( __name ) {
    let name = __name === undefined ? 'p' : __name
    const sdf = this.sdf.emit( 'q'+this.id );

    let preface=`        float c${this.id} = cos( ${this.amount.emit()}.x * ${name}.y );
        float s${this.id} = sin( ${this.amount.emit()}.x * ${name}.y );
        mat2  m${this.id} = mat2( c${this.id},-s${this.id},s${this.id},c${this.id} );
        vec4  q${this.id} = vec4( m${this.id} * ${name}.xz, ${name}.y, 1. );\n`

    if( typeof sdf.preface === 'string' ) {
      preface += sdf.preface
    }

    return { preface, out:sdf.out }
  },
  __Bump( __name ) {
    let name = __name === undefined ? 'p' : __name

    const bumpString =  `        vec4 transformBump${this.id} = ${name} * ${this.transform.emit()};\n`
    const tex = this.amount.emit( name )

    const pointString = `(transformBump${this.id} * ${this.sdf.transform.emit()})`

    const sdf = this.sdf.emit( pointString, this.transform, `tex${this.id}` ) 

    Marching.textures.addTexture( this.amount.value )

    let preface=`  vec3 tex${this.id} = getTexture( ${this.amount.value.id}, ${pointString}.xyz ) * ${this.size.emit()};\n
        //vec4 displaceBump${this.id} = vec4((${pointString} - tex${this.id}), 1.);
    `
        //${sdf.out}.x = (tex${this.id}.x + tex${this.id}.y + tex${this.id}.z ) / 3. * .5 + ${sdf.out}.x;\n`
        //vec4 ${'p'+this.id} = vec4(${pointString} + tex${this.id}, 1.);\n`

    //sdf.preface += `\n        
    //    ${sdf.out}.x -= min(tex${this.id}.x, min(tex${this.id}.y, tex${this.id}.z));\n` 

    if( typeof sdf.preface === 'string' ) {
      preface = preface + sdf.preface
    }

    preface =  bumpString + preface

    return { preface, out:sdf.out }
  },
  // XXX todo: something like https://www.shadertoy.com/view/ldSGzR
  // https://www.dropbox.com/s/l1yl164jb3rhomq/mm_sfgrad_bump.pdf?dl=0
  Bump( __name ) {
    let name = __name === undefined ? 'p' : __name

    const bumpString =  `        vec4 transformBump${this.id} = ${name} * ${this.transform.emit()};\n`
    const tex = this.amount.emit( name )

    const pointString = `(transformBump${this.id} * ${this.sdf.transform.emit()}).xyz`

    const sdf = this.sdf.emit( `transformBump${this.id}`, this.transform ) 

    Marching.textures.addTexture( this.amount.value )

    let preface=`  vec3 tex${this.id} = getTexture( ${this.amount.value.id}, ${pointString}) * ${this.size.emit()};
        ${sdf.out}.x = (tex${this.id}.x + tex${this.id}.y + tex${this.id}.z)/3. + ${sdf.out}.x;\n`

    if( typeof sdf.preface === 'string' ) {
      preface = sdf.preface + preface
    }

    preface = bumpString + preface

    return { preface, out:sdf.out }
  },
}

const DistanceOps = {}

for( let name in ops ) {

  // get codegen function
  let __op = ops[ name ]

  // create constructor
  DistanceOps[ name ] = function( a,b,c ) {
    const op = Object.create( DistanceOps[ name ].prototype )
    op.sdf = a
    op.amount = b
    op.emit = __op
    op.name = name
    op.transform = Transform()

    const defaultValues = [.5,.5,.5]

    op.id = VarAlloc.alloc()
    const isArray = true 

    if( name === 'Halve' ) {
      op.amount = param_wrap( b, float_var_gen( b ) )
    }else{
      if( typeof b === 'number' ) {
        b = [b,b,b]
        b.type = 'vec3'
      }
    }

    if( name !== 'Bumpz' ) {
      let __var =  param_wrap( 
        b, 
        vec3_var_gen( ...defaultValues ) 
      )

      // for assigning entire new vectors to property
      Object.defineProperty( op, 'amount', {
        get() { return __var },
        set(v) {
          if( typeof v === 'object' ) {
            __var.set( v )
          }else{
            __var.value.x = v
            __var.value.y = v
            __var.value.z = v
            __var.value.w = v
            __var.dirty = true
          }
        }
      })

      op.params = [{ name:'amount' }]
    }else{
      op.params = []
      op.emit_decl = function() {}
      op.emit = function() {}
      op.update_data= function() {}
      op.upload_location = function() {}
    }
    op.__setMaterial = function(mat) {
      if( typeof mat === 'string' ) mat = Marching.Material[ mat ]
      this.__material = this.mat = Marching.materials.addMaterial( mat )
      op.sdf.material( this.__material )
    }
    if( name === 'Displace' || name === 'Bump' ) {
      let __var2 =  param_wrap( 
        c, 
        float_var_gen( .03 ) 
      )
      Object.defineProperty( op, 'size', {
        get() { return __var2 },
        set(v) {
          __var2.set( v )
          __var2.dirty = true
        }
      })

      op.params.push({ name:'size' })
    }
    op.__desc = { parameters:op.params }
    return op
  } 

  DistanceOps[ name ].prototype = SceneNode()

  DistanceOps[name].prototype.emit_decl = function () {
    let str =  this.sdf.emit_decl() + (this.name !== 'Bump' ? this.amount.emit_decl() : '')
    str += this.transform.emit_decl()
    if( this.name === 'Displace' || this.name === 'Bump' ) str += this.size.emit_decl()  

    return str
  };

  DistanceOps[name].prototype.update_location = function(gl, program) {
    this.sdf.update_location( gl, program )
    if( this.name !== 'Bump' ) this.amount.update_location( gl, program )
    if( this.name === 'Displace' || this.name === 'Bump') this.size.update_location( gl, program ) 
    this.transform.update_location( gl, program )
  }

  DistanceOps[name].prototype.upload_data = function(gl) {
    this.sdf.upload_data( gl )
    if( this.name !== 'Bump' ) this.amount.upload_data( gl )
    if( this.name === 'Displace' || this.name === 'Bump' ) this.size.upload_data( gl )
    this.transform.upload_data( gl )
  }
}
DistanceOps.Halve.UP = 0
DistanceOps.Halve.DOWN = 1
DistanceOps.Halve.LEFT = 3
DistanceOps.Halve.RIGHT = 2

module.exports = DistanceOps


},{"./sceneNode.js":24,"./transform.js":28,"./utils.js":29,"./var.js":30}],6:[function(require,module,exports){
const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc } = require( './var.js' )
const Transform = require( './transform.js' )
const glslops = require( './distanceOperationsGLSL.js' )

const opslen = { 
  Union:2,
  Intersection:2,
  Difference:2,
  StairsUnion:4,
  StairsIntersection:4,
  StairsDifference:4,
  RoundUnion:3,
  RoundDifference:3,
  RoundIntersection:3,
  ChamferUnion:3,
  ChamferDifference:3,
  ChamferIntersection:3,
  Pipe:3,
  Engrave:3,
  Groove:4,
  Tongue:4,
  
  // these two do not currently have support for transforms or repeats...
  Onion:2,
  Switch:2
}

const ops = { 
  Union( ...args ) { return `opU( ${args.join(',')} )` },
  SmoothUnion( ...args  ) { return `opSmoothUnion( ${args.join(',')} )` },
  Intersection( ...args ) { return `opI( ${args.join(',')} )` },
  SmoothIntersection( ...args ) { return `opSmoothIntersection( ${args.join(',')} )` },  
  Difference( ...args ) { return `opS( ${args.join(',')} )` },  
  SmoothDifference( ...args ) { return `opSmoothSubtraction( ${args.join(',')} )` },  
  StairsUnion(  ...args ) { return `fOpUnionStairs( ${args.join(',')} )`  },
  StairsIntersection( ...args ) { return `fOpIntersectionStairs( ${args.join(',')} )` },
  StairsDifference( ...args ) { return `fOpSubstractionStairs( ${args.join(',')} )` },
  RoundUnion( ...args ) { return `fOpUnionRound( ${args.join(',')} )` },
  RoundDifference( ...args ) { return `fOpDifferenceRound( ${args.join(',')} )` },
  RoundIntersection( ...args ) { return `fOpIntersectionRound( ${args.join(',')} )` },
  ChamferUnion( ...args ) { return `fOpUnionChamfer( ${args.join(',')} )` },
  ChamferDifference( ...args ) { return `fOpDifferenceChamfer( ${args.join(',')} )` },
  ChamferIntersection( ...args ) { return `fOpIntersectionChamfer( ${args.join(',')} )` },
  Pipe( ...args ) { return `fOpPipe( ${args.join(',')} )` },
  Engrave( ...args ) { return `fOpEngrave( ${args.join(',')} )` },
  Groove( ...args ) { return `fOpGroove( ${args.join(',')} )` },
  Tongue( ...args ) { return `fOpTongue( ${args.join(',')} )` },
  
  // these two do not currently have support for transforms or repeats...
  Onion( ...args ) { return `opOnion( ${args.join(',')} )` },
  Switch( a,b,c,d,e,f ) { return `opSwitch( ${a}, ${b}, ${c} )` }
}

const emit_float = function( a ) {
	if (a % 1 === 0)
		return a.toFixed( 1 )
	else
		return a
}

const DistanceOps = {
  __glsl:[],
  __getGLSL() {
    return this.__glsl.join('\n')
  },
  __clear() { this.__glsl.length = 0 }
}

const oneops = ['Onion','Halve']

for( let name in ops ) {

  // get codegen function
  let op = ops[ name ]
  const name2 = name + '2'

  // create constructor
  DistanceOps[ name ] = function( a,b,c,d ) {
    const op = Object.create( DistanceOps[ name ].prototype )
    op.a = a
    op.b = oneops.indexOf( name ) === -1 ? b : param_wrap( b, float_var_gen(.2 ) )
    op.transform = Transform( false )
    op.id = VarAlloc.alloc()
    op.type = 'distance_op'
    op.name = name

    let __c = param_wrap( c, float_var_gen(.3) )

    op.__len = opslen[ name ]
    if( op.__len > 2 ) {
      Object.defineProperty( op, 'c', {
        get() { return __c },
        set(v) {
          __c.set( v )
        }
      })
      
      if( op.__len > 3 ) {
        let __d = param_wrap( d, float_var_gen(4) )

        Object.defineProperty( op, 'd', {
          get() { return __d },
          set(v) {
            __d.set( v )
          }
        })
      }
    }

    op.__setTexture = function(tex,props) {
      if( typeof tex === 'string' ) {
        this.texture = op.texture.bind( this )
        this.__textureObj = this.tex = Marching.Texture( tex,props,this.texture )
        this.__textureID = this.__textureObj.id
      }else{
        this.__textureObj = this.tex = Object.assign( tex, props )
        this.__textureID = this.__textureObj.id
      }
    }
    op.__setMaterial = function(mat) {
      if( typeof mat === 'string' ) mat = Marching.Material[ mat ]
      this.__material = this.mat = Marching.materials.addMaterial( mat )
    }
    op.__setBump = function(tex,props) {
      //this.bump = p.bump.bind( this )
      const b = this.bump = this.__bumpObj = Marching.Bump( this, tex, props )
      this.bump.texture = this.bump.amount.value
      this.__bumpID = this.__bumpObj.id
      this.rotate = this.bump.rotate
      this.translate = this.bump.translate
      this.scale = this.bump.scale
      Object.defineProperty( this.bump, 'strength', {
        get() { return b.size },
        set(v){ b.size = v }
      })
    }
    Object.assign( op, {
      renderingBump : false,
      emittingDecl  : false,
      uploading     : false,
      updating      : false
    })

    let repeat = null
    Object.defineProperty( op, 'repeat', {
      get() { return repeat },
      set(v){ 
        repeat = v
        this.a.repeat = v
        this.b.repeat = v
      }
    })

    op.matId = MaterialID.alloc()

    op.params = [{name:'c'},{ name:'d'}]
    op.__desc = { parameters: op.params }

    return op
  } 
  
  DistanceOps[ name2 ] = function( ...args ) {
    // accepts unlimited arguments, but the last one could be a blending coefficient
    let blend = .25, coeff=4, u

    if( typeof args[ args.length - 1 ] === 'number' ) {
      blend = args.pop()

      // if there are two non-sdf arguments to the function...
      if( typeof args[ args.length - 1 ] === 'number' ) {
        coeff = blend
        blend = args.pop()
      }

      u = args.reduce( (state,next) => DistanceOps[ name ]( state, next, blend, coeff ) )
    }else{
      u = args.reduce( (state,next) => DistanceOps[ name ]( state, next ) )
    }

    return u
  }

  DistanceOps[ name ].prototype = SceneNode()

  DistanceOps[ name ].prototype.texture = function( ...args ) {
    this.__setTexture( ...args )
    this.a.texture( this.__textureObj )
    if( oneops.indexOf( name ) === -1 )
      this.b.texture( this.__textureObj )

    return this
  }
  DistanceOps[ name ].prototype.material = function( ...args ) {
    this.__setMaterial( ...args )
    this.a.material( this.__material )
    if( oneops.indexOf( name ) === -1 )
      this.b.material( this.__material )

    return this
  }

  const pushString = function( name ) {
    const glslobj = glslops[ name ]
    
    // some definitions are a single string, and not split into
    // separate float and opOut functions
    if( typeof glslobj === 'string' ) {
      if( DistanceOps.__glsl.indexOf( glslobj ) === -1 ) {
        DistanceOps.__glsl.push( glslobj )
      }
    }else{
      // some distance operations are dependent on other ones...
      // if this one has dependencies add them.
      // dependencies must be added before adding other functions
      // so that they're above them in the final GLSL code.
      if( glslobj.dependencies !== undefined ) {
        for( let dname of glslobj.dependencies ) {
          const d = glslops[ dname ]
          if( DistanceOps.__glsl.indexOf( d.float ) === -1 ) {
            DistanceOps.__glsl.push( d.float )
          }
        }
      }  
      if( DistanceOps.__glsl.indexOf( glslobj.float ) === -1 ) {
        DistanceOps.__glsl.push( glslobj.float )
      }
      if( DistanceOps.__glsl.indexOf( glslobj.vec2) === -1 ) {
        DistanceOps.__glsl.push( glslobj.vec2 )
      }
    }
  }

  DistanceOps[ name ].prototype.emit = function ( pname='p', transform = null ){
    const isNotOneop = oneops.indexOf( name ) === -1 
    if( this.__bumpObj !== undefined && this.renderingBump === false) {
      this.renderingBump = true
      return this.__bumpObj.emit( pname, transform )
    }
    pushString( name )

    if( transform !== null ) this.transform.apply( transform, false )
    //this.transform.internal()

    // first two args are fixed, rest are variable
    let emitters = []
    const a = this.a.emit( pname, this.transform ) 
    const b = isNotOneop ? this.b.emit( pname, this.transform ) : this.b.emit()

    emitters[0] = a.out
    emitters[1] = isNotOneop ?  b.out : b
    if( this.__len > 2 ) emitters.push( this.c.emit() )
    if( this.__len > 3 ) emitters.push( this.d.emit() )
    
    const body = `
        vec2 do${this.id} = ${op( ...emitters )};
        do${this.id}.x *= ${this.transform.emit()}_scale;
    `

    const output = {
      out: 'do'+this.id,
      preface: (a.preface || '') + ( isNotOneop ? b.preface || '' : '') + body
    }

    this.renderingBump = false
    return output
  }

  DistanceOps[name].prototype.emit_decl = function () {
    if( this.__bumpObj !== undefined && this.emittingDecl === false) {
      this.emittingDecl = true
      return this.__bumpObj.emit_decl() 
    }
    let str =  this.transform.emit_decl() + this.a.emit_decl() + this.b.emit_decl()
    if( this.c !== undefined ) str += this.c.emit_decl()
    if( this.d !== undefined ) str += this.d.emit_decl()

    if( ops[ name ].code !== undefined ) {
      //str += ops[ name ].code
      if( Marching.requiredOps.indexOf( ops[ name ].code ) === - 1 ) {
        Marching.requiredOps.push( ops[ name ].code )
      }
    }

    this.emittingDecl = false
    return str
  };

  DistanceOps[name].prototype.update_location = function(gl, program) {
    if( this.__bumpObj !== undefined && this.updating === false) {
      this.updating = true
      return this.__bumpObj.update_location( gl, program )
    }
    this.a.update_location( gl, program )
    this.transform.update_location( gl, program )
    this.b.update_location( gl, program )
    if( this.c !== undefined ) this.c.update_location( gl, program )
    if( this.d !== undefined ) this.d.update_location( gl, program )

    this.updating = false
  }

  DistanceOps[name].prototype.upload_data = function(gl) {
    if( this.__bumpObj !== undefined && this.uploading  === false ) {
      this.uploading = true
      return this.__bumpObj.upload_data( gl )
    }
    this.transform.internal()
    this.transform.upload_data( gl )
    this.a.transform.apply( this.transform )
    if( oneops.indexOf( name ) === -1 )
      this.b.transform.apply( this.transform )

    this.a.upload_data( gl )
    this.b.upload_data( gl )
    if( this.c !== undefined ) this.c.upload_data( gl )
    if( this.d !== undefined ) this.d.upload_data( gl )
    this.uploading = false
    
  }
}

module.exports = DistanceOps

},{"./distanceOperationsGLSL.js":7,"./sceneNode.js":24,"./transform.js":28,"./utils.js":29,"./var.js":30}],7:[function(require,module,exports){
module.exports = {
  Union:{
    float:`
      float opU( float d1, float d2 ) {
        return min(d1,d2);
      }
      `,
    vec2:`
      vec2 opU( vec2 d1, vec2 d2 ) {
        vec2 o;

        if( d1.x < d2.x ) {
          o = d1;
        }else{
          o = d2; 
        }

        return o;
      }
      `
  },
  Intersection:{
    float:`
      float opI( float d1, float d2 ) {
        return max(d1,d2);
      }
      `,
    vec2:`
      vec2 opI( vec2 d1, vec2 d2  ) {
        vec2 o;

        if( d1.x > d2.x ) {
          o = d1; 
        }else{
          o = d2; 
        }

        return o;
      }
      `
  },

  Difference:{
    float:`
      float opS( float d1, float d2 ) { return max(d1,-d2); }
      `,
    vec2:`
      vec2 opS( vec2 d1, vec2 d2  ) {
        vec2 o;

        if( d1.x >= -d2.x ) {
          o = d1; 
        }else{
          d2.x *= -1.;
          o = d2;
        }

        return o;
      }
      `
  },

  StairsUnion:{
    float:`
      float fOpUnionStairs(float a, float b, float r, float n) {
        float s = r/n;
        float u = b-r;
        return min(min(a,b), 0.5 * (u + a + abs ((mod (u - a + s, 2. * s)) - s)));
      }`,
    vec2:`
      vec2 fOpUnionStairs( vec2 d1, vec2 d2, float r, float n  ) {
        vec2 o = vec2( 0., d1.y ); 

        if( d1.x <= d2.x ) {
          o.y = d1.y; 
        }else{
          o.y = d2.y; 
        }

        o.x = fOpUnionStairs( d1.x, d2.x, r, n );

        return o;
      }
      `
  },
  StairsIntersection:{
    dependencies: ['StairsUnion'],
    float:`
      // We can just call Union since stairs are symmetric.
      float fOpIntersectionStairs(float a, float b, float r, float n) {
        return -fOpUnionStairs(-a, -b, r, n);
      }
      `,
    vec2:`
      vec2 fOpIntersectionStairs( vec2 d1, vec2 d2, float r, float n  ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = -fOpUnionStairs( -d1.x, -d2.x, r, n );

        if( -d1.x <= -d2.x ) {
          o.y = d1.y;
        }else{
          o.y = d2.y;
        }

        return o;
      }
      `
  },
  StairsDifference:{
    dependencies: ['StairsUnion'],
    float:`
      float fOpSubstractionStairs(float a, float b, float r, float n) {
        return -fOpUnionStairs(-a, b, r, n);
      }`,
    vec2:`
      vec2 fOpSubstractionStairs( vec2 d1, vec2 d2, float r, float n  ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = -fOpUnionStairs( -d1.x, d2.x, r, n );

        if( -d1.x <= d2.x ) {
          o.y = d1.y;
        }else{
          o.y = d2.y;
        }

        return o;
      }
      `
  },

  RoundUnion:{
    float:`
      float fOpUnionRound(float a, float b, float r) {
        vec2 u = max(vec2(r - a,r - b), vec2(0));
        return max(r, min (a, b)) - length(u);
      }`,

    vec2:`
      vec2 fOpUnionRound( vec2 d1, vec2 d2, float r  ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = fOpUnionRound( d1.x, d2.x, r );

        if( d1.x <= d2.x ) {
          o.y = d1.y;
        }else{
          o.y = d2.y;
        }

        return o;
      }
      `
  },
  RoundIntersection:{
    float:`
      float fOpIntersectionRound(float a, float b, float r) {
        vec2 u = max(vec2(r + a,r + b), vec2(0));
        return min(-r, max (a, b)) + length(u);
      }`,
    vec2:`
      vec2 fOpIntersectionRound( vec2 d1, vec2 d2, float r  ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = fOpIntersectionRound( d1.x, d2.x, r );

        if( d1.x >= d2.x ) {
          o.y = d1.y;
        }else{
          o.y = d2.y;
        }

        return o;
      }
      `
  },

  RoundDifference:{
    dependencies: ['RoundIntersection'],
    float:`
      float fOpDifferenceRound (float a, float b, float r) {
        return fOpIntersectionRound(a, -b, r);
      }`,
    vec2:`
      vec2 fOpDifferenceRound( vec2 d1, vec2 d2, float r  ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = fOpDifferenceRound( d1.x, d2.x, r );

        if( d1.x >= -d2.x ) {
          o.y = d1.y; 
        }else{
          o.y = d2.y;
        }

        return o;
      }
      `
  },
  ChamferUnion:{
    float:`
      float fOpUnionChamfer(float a, float b, float r) {
        return min(min(a, b), (a - r + b)*sqrt(0.5));
      }`,
    vec2:`
      vec2 fOpUnionChamfer( vec2 d1, vec2 d2, float r  ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = fOpUnionChamfer( d1.x, d2.x, r );

        if( d1.x <= d2.x ) {
          o.y = d1.y;
        }else{
          o.y = d2.y;
        }

        return o;
      }
      `
  },
  ChamferIntersection:{
    float:`
      float fOpIntersectionChamfer(float a, float b, float r) {
        return max(max(a, b), (a + r + b)*sqrt(0.5));
      }`,
    vec2:`
      vec2 fOpIntersectionChamfer( vec2 d1, vec2 d2, float r   ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = fOpIntersectionChamfer( d1.x, d2.x, r );

        if( d1.x >= d2.x ) {
          o.y = d1.y;
        }else{
          o.y = d2.y;
        }

        return o;
      }
      `
  },

  ChamferDifference:{
    dependencies:['ChamferIntersection'],
    float:`
      float fOpDifferenceChamfer (float a, float b, float r) {
        return fOpIntersectionChamfer(a, -b, r);
      }`,
    vec2:`
      vec2 fOpDifferenceChamfer( vec2 d1, vec2 d2, float r  ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = fOpDifferenceChamfer( d1.x, d2.x, r );

        if( d1.x >= -d2.x ) {
          o.y = d1.y;
        }else{
          o.y = d2.y;
        }

        return o;
      }
      `
  },
  Pipe:`
      float fOpPipe(float a, float b, float r) {
        return length(vec2(a, b)) - r;
      }
      vec2 fOpPipe( vec2 d1, vec2 d2, float r   ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = fOpPipe( d1.x, d2.x, r );

        return o;
      }
      `,

  Engrave:`
      float fOpEngrave(float a, float b, float r) {
        return max(a, (a + r - abs(b))*sqrt(0.5));
      }
      vec2 fOpEngrave( vec2 d1, vec2 d2, float r  ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = fOpEngrave( d1.x, d2.x, r );

        return o;
      }
      `,
  Groove:`
      float fOpGroove(float a, float b, float ra, float rb) {
        return max(a, min(a + ra, rb - abs(b)));
      }
      vec2 fOpGroove( vec2 d1, vec2 d2, float r, float n  ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = fOpGroove( d1.x, d2.x, r, n );

        return o;
      }
      `,

  Tongue:`
      float fOpTongue(float a, float b, float ra, float rb) {
        return min(a, max(a - ra, abs(b) - rb));
      }
      vec2 fOpTongue( vec2 d1, vec2 d2, float r, float n  ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = fOpTongue( d1.x, d2.x, r, n );

        return o;
      }
      `,
  Onion:`
      float opOnion( float sdf, float thickness ){
        return abs(sdf)-thickness;
      }
      vec2 opOnion( vec2 sdf, float thickness ) {
        float x = 0.;

        sdf.x = opOnion( sdf.x, thickness );

        return sdf;
      }  
      `,
  Halve:`
      float opHalve( in float sdf, vec4 p, in int dir ){
        float _out = 0.;
        switch( dir ) {
          case 0:  
            _out = max( sdf, p.y );
            break;
          case 1:
            _out = max( sdf, -p.y );
            break;
          case 2:
            _out = max( sdf, p.x );
            break;
          case 3:
            _out = max( sdf, -p.x );
            break;
        }

        return _out;
      }

      vec2 opHalve( vec2 sdf, vec4 p, int dir ) {
        float x = 0.;

        x = opHalve( sdf.x, p, dir );

        sdf.x = x;

        return sdf;
      } 
  `,

  Switch:`
      vec2 opSwitch( vec2 a, vec2 b, float c ) {
        if( c < .5 ) {
          return a;
        }else{
          return b;
        } 
      }
      `
}

},{}],8:[function(require,module,exports){
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc } = require( './var.js' )
const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const { Vec2, Vec3, Vec4 } = require( './vec.js' )
const Transform = require( './transform.js' )

const descriptions = {
  Elongation: {
    parameters:[ { name:'active', type:'float', default:1. },{ name:'distance', type:'vec3', default:Vec3(0) } ],
    func:`
      vec4 opElongate( in vec3 p, in vec3 h ) {
        //return vec4( p-clamp(p,-h,h), 0.0 ); // faster, but produces zero in the interior elongated box
        
        vec3 q = abs(p)-h;
        return vec4( max(q,0.0), min(max(q.x,max(q.y,q.z)),0.0) );
      }`,
    emit( name='p' ) {
      const pId = this.getID()
      const pName = 'p' + pId

      let preface =
        `        vec4 ${pName}_xyzw = opElongate( ${name}, ${this.distance.emit()} );\n
        vec3 ${pName} = ${pName}_xyzw.xyz;\n`


      const sdf = this.sdf.emit( pName )

      if( typeof sdf.preface === 'string' ) preface += sdf.preface 

      return { out:`vec2(${pName}_xyzw.w + ${sdf.out}.x, ${sdf.out}.y)`, preface }
    }
  },
  PolarRepetition: {
    parameters:[ 
      { name:'count', type:'float', default:5 },
      { name:'distance', type:'vec3', default:Vec3(.25) },
      { name:'active', type:'float', default:1. }
    ],
    emit( name='p', transform=null) {
      const pId = VarAlloc.alloc()
      const pName = 'p' + pId

      if( transform !== null ) this.transform.apply( transform, false )
      this.transform.invert()

      const pointString =  `( ${name} * ${this.transform.emit()} ).xyz`

      let preface =`
          vec4 ${pName} = vec4( polarRepeat( ${pointString}, ${this.__target.count.emit() } ) * ${this.transform.emit_scale()}, 1. ); 
          ${pName} -= vec4(${this.__target.distance.emit()}.x,0.,0.,0.);\n`

      const sdf = this.sdf.emit( pName )

      if( typeof sdf.preface === 'string' ) preface += sdf.preface

      return { out:sdf.out, preface }
    }
  },
  Mirror: {
    parameters: [ { name:'distance', type:'vec3', default:Vec3(0) },{ name:'active', type:'float', default:1. }  ],
    extra:[{ name:'dims', type:'local', default:'xyz' }],

    emit( name='p', transform=null, notused=null, scale=null ) {
      const pId = VarAlloc.alloc()
      const pName = 'p' + pId

      if( transform !== null ) {
        this.transform.apply( transform, false )
      }
      this.transform.invert()
     
      const pointString =  `( ${name} * ${this.transform.emit()} ).xyz`,
            s = scale === null ? this.transform.emit_scale() : `${this.transform.emit_scale()} * ${scale}`
 
      let preface =`
        vec4 ${pName} = vec4( ( ${pointString} ) , 1.);\n
        ${pName}.${this.dims} = abs( ${pName}.${this.dims} );\n`

      const sdf = this.sdf.emit( pName, null, null, s )

      if( typeof sdf.preface === 'string' ) preface += sdf.preface 

      return { out:sdf.out, preface }
    }
  },


  //let preface = `         vec3 ${pName} = ${name} / ${this.amount.emit()};\n`

  //let sdf = this.sdf.emit( pName )
  //let out = sdf.out 

  //sdf.preface += `      ${out}.x = ${out}.x * ${this.amount.emit()};\n`

  //if( typeof sdf.preface === 'string' ) preface += sdf.preface
  Repetition: {
    parameters: [ { name:'distance', type:'vec3', default:Vec3(0) },  { name:'active', type:'float', default:1. }],
    emit( name='p', transform=null ) {
      const pId = VarAlloc.alloc()
      const pName = 'p' + pId

      if( transform !== null ) this.transform.apply( transform, false )
      
      this.transform.invert()
     
      const pointString =  `( ${name} * ${this.transform.emit()} ).xyz`;

      let preface =`
        vec4 ${pName} = vec4( (mod( ${pointString}, ${this.__target.distance.emit()} ) - .5 * ${this.__target.distance.emit()}) * ${this.transform.emit_scale()}, 1.);\n`

      const sdf = this.sdf.emit( pName )//, this.transform )//, 1, this.__target.distance )

      if( typeof sdf.preface === 'string' ) preface += sdf.preface 

      return { out:sdf.out, preface }
    }
  },
  // https://www.shadertoy.com/view/wlyBWm
  // https://www.shadertoy.com/view/NdS3Dh
  SmoothRepetition: {
    parameters: [ { name:'distance', type:'vec3', default:Vec3(0) },  { name:'smoothness', type:'float', default:.5 }],
    emit( name='p', transform=null ) {
      const pId = VarAlloc.alloc()
      const pName = 'p' + pId

      if( transform !== null ) this.transform.apply( transform, false )
      
      this.transform.invert()
     
      const pointString =  `( ${name} * ${this.transform.emit()} ).xyz`;

//    vec2 smoothrepeat_asin_sin(vec2 p,float smooth_size,float size){
//    p/=size;
//    p=asin(sin(p)*(1.0-smooth_size));
//    return p*size;

      let preface =`
        vec3 ${pName}Mod = ${pointString}/${this.__target.distance.emit()};
        ${pName}Mod = asin( sin( ${pName}Mod ) * (1.0 - ${this.__target.smoothness.emit()} ) );
        vec4 ${pName} = vec4( ${pName}Mod * ${this.__target.distance.emit()} * ${this.transform.emit_scale()}, 1. );\n`

      const sdf = this.sdf.emit( pName )//, this.transform )//, 1, this.__target.distance )

      if( typeof sdf.preface === 'string' ) preface += sdf.preface 

      return { out:sdf.out, preface }
    }
  },
  SmoothPolar: {
    parameters:[ 
      { name:'count', type:'float', default:5 },
      { name:'distance', type:'vec3', default:Vec3(.25) },
      { name:'active', type:'float', default:1. }
    ],
    emit( name='p', transform=null) {
      const pId = VarAlloc.alloc()
      const pName = 'p' + pId

      if( transform !== null ) this.transform.apply( transform, false )
      this.transform.invert()

      const pointString =  `( ${name} * ${this.transform.emit()} ).xyz`

      //s repetitions
      ////m smoothness (0-1)
      ////c correction (0-1)
      ////d object displace from center
/*vec2 smoothRot(vec2 p,float s,float m,float c,float d){
  s*=0.5;
  float k=length(p);
  float x=asin(sin(atan(p.x,p.y)*s)*(1.0-m))*k;
  float ds=k*s;
  float y=mix(ds,2.0*ds-sqrt(x*x+ds*ds),c);
  return vec2(x/s,y/s-d);
}*/ 
      let preface =`
          vec4 ${pName} = vec4( polarRepeat( ${pointString}, ${this.__target.count.emit() } ) * ${this.transform.emit_scale()}, 1. ); 
          ${pName} -= vec4(${this.__target.distance.emit()}.x,0.,0.,0.);\n`

      const sdf = this.sdf.emit( pName )

      if( typeof sdf.preface === 'string' ) preface += sdf.preface

      return { out:sdf.out, preface }
    }
  },
}

const getDomainOps = function( SDF ) {
  const ops = {}

  for( let key in descriptions ) {
    const opDesc = descriptions[ key ]
    
    ops[ key ] = function( sdf, ...args ) {
      const op = Object.create( ops[ key ].prototype )
      op.sdf = sdf
      op.parameters = []
      op.transform = Transform()
      op.name = key
      const target = op.__target = op // sdf.__target !== undefined ? sdf.__target : op

      let count = 0
      for( let prop of opDesc.parameters ) {
        op.parameters.push( prop )

        let arg = args[ count ]
        let __var
        
        if( typeof args[count] === 'function' ) {
          const func = args[ count ]
          Marching.postrendercallbacks.push( t => {
            op[ prop.name ] = func( t ) 
          })

          // set initial value with t=0
          args[ count ] = arg = func( 0 )
        }

        switch( prop.type ) {
          case 'vec2':
            if( typeof arg === 'number' ) arg = Vec2( arg )
            if( arg === undefined ) arg = prop.default.copy()

            __var = param_wrap( 
              arg, 
              vec2_var_gen( prop.default )    
            )

            Object.defineProperty( target, prop.name, {
              get() { return __var },
              set(v) {
                if( typeof v === 'object' ) {
                  __var.set( v )
                }else{
                  __var.value.x = v
                  __var.value.y = v
                  __var.dirty = true
                }
              }
            })  

            break;
          case 'vec3':
            if( typeof arg === 'number' ) arg = Vec3( arg )
            if( arg === undefined ) arg = prop.default.copy()

            __var = param_wrap( 
              arg, 
              vec3_var_gen( prop.default )
            )

            Object.defineProperty( target, prop.name, {
              get() { return __var },
              set(v) {
                if( typeof v === 'object' ) {
                  __var.set( v )
                }else{
                  __var.value.x = v
                  __var.value.y = v
                  __var.value.z = v
                  __var.dirty = true
                }
              }
            })  

            break;
          case 'vec4':
            if( typeof arg === 'number' ) arg = Vec4( arg )
              __var = param_wrap( 
              arg, 
              vec4_var_gen( prop.default )  
            )

            if( arg === undefined ) arg = prop.default.copy()

            Object.defineProperty( target, prop.name, {
              get() { return __var },
              set(v) {
                if( typeof v === 'object' ) {
                  __var.set( v )
                }else{
                  __var.value.x = v
                  __var.value.y = v
                  __var.value.z = v
                  __var.value.w = v
                  __var.dirty = true
                }
              }
            })  

            break;
          default: // float
            __var =  param_wrap( 
              arg, 
              float_var_gen( prop.default )
            )

            Object.defineProperty( target, prop.name, {
              get() { return __var },
              set(v) {
                __var.set( v ) 
              }
            })
            break;
          }
        count++
      }
      
      if( opDesc.extra !== undefined ) {
        for( let extra of opDesc.extra ) {
          op[ extra.name ] = args[ count - 1 ] || extra.default
        }
      }
      op.sdf.active = op.active
      op.__setTexture = function(tex,props) {
        if( typeof tex === 'string' ) {
          this.texture = op.texture.bind( this )
          this.__textureObj = this.tex = Marching.Texture( tex,props,this.texture )
          this.__textureID = this.__textureObj.id
        }else{
          this.__textureObj = this.tex = Object.assign( tex, props )
          this.__textureID = this.__textureObj.id
        }
      }
      op.__setMaterial = function(mat) {
        if( typeof mat === 'string' ) mat = Marching.Material[ mat ]
        this.__material = this.mat = Marching.materials.addMaterial( mat )
      }
      op.__desc = opDesc

      if( key !== 'Mirror' ) op.sdf.repeat = op
      return op
    }

    ops[ key ].prototype = SceneNode()
    ops[ key ].prototype.emit = opDesc.emit
    
    ops[ key ].prototype.texture = function( ...args ) {
      this.__setTexture( ...args )
      this.sdf.texture( this.__textureObj )

      return this
    }
    ops[ key ].prototype.material = function( ...args ) {
      this.__setMaterial( ...args )
      this.sdf.material( this.__material )

      return this
    }

    ops[ key ].prototype.emit_decl = function( shouldEmitSDF=true ) {
      let decl = ''
      decl += this.transform.emit_decl()
      for( let param of this.parameters ) {
        decl += this.__target[ param.name ].emit_decl() 
      }
      if( shouldEmitSDF ) decl += this.sdf.emit_decl()
      
      // for rotation etc... any extra glsl function that needs to
      // be added to the shader
      if( opDesc.glsl !== undefined && SDF.memo[ key ] === undefined ) {
        decl += opDesc.glsl
        SDF.memo[ key ] = true
      }

      return decl
    }
    ops[ key ].prototype.update_location = function( gl, program, shouldUpdateSDF=true ) {
      for( let param of this.parameters ) this.__target[ param.name ].update_location( gl, program)
      if( shouldUpdateSDF ) this.sdf.update_location( gl, program )
      this.transform.update_location( gl, program )
    }
    ops[ key ].prototype.upload_data = function( gl, shouldUploadSDF=true ) {
      for( let param of this.parameters ) this.__target[ param.name ].upload_data( gl )
      this.transform.upload_data( gl )
      if( shouldUploadSDF ) this.sdf.upload_data( gl )
    }
  }
  
  ops.Repeat = ops.Repetition
  ops.RepeatScale = ops.RepetitionShrink
  ops.PolarRepeat = ops.PolarRepetition

  return ops
}

module.exports = getDomainOps

},{"./sceneNode.js":24,"./transform.js":28,"./utils.js":29,"./var.js":30,"./vec.js":31}],9:[function(require,module,exports){
// matrix.js - taken from https://github.com/evanw/lightgl.js/

// Represents a 4x4 matrix stored in row-major order that uses Float32Arrays
// when available. Matrix operations can either be done using convenient
// methods that return a new matrix for the result or optimized methods
// that store the result in an existing matrix to avoid generating garbage.

var hasFloat32Array = (typeof Float32Array != 'undefined');

// ### new GL.Matrix([elements])
//
// This constructor takes 16 arguments in row-major order, which can be passed
// individually, as a list, or even as four lists, one for each row. If the
// arguments are omitted then the identity matrix is constructed instead.
function Matrix() {
  var m = Array.prototype.concat.apply([], arguments);
  if (!m.length) {
    m = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
  }
  this.m = hasFloat32Array ? new Float32Array(m) : m;
}

Matrix.prototype = {
  // ### .inverse()
  //
  // Returns the matrix that when multiplied with this matrix results in the
  // identity matrix.
  inverse: function() {
    return Matrix.inverse(this, new Matrix());
  },

  // ### .transpose()
  //
  // Returns this matrix, exchanging columns for rows.
  transpose: function() {
    return Matrix.transpose(this, new Matrix());
  },

  // ### .multiply(matrix)
  //
  // Returns the concatenation of the transforms for this matrix and `matrix`.
  // This emulates the OpenGL function `glMultMatrix()`.
  multiply: function(matrix) {
    return Matrix.multiply(this, matrix, new Matrix());
  },

  // ### .transformPoint(point)
  //
  // Transforms the vector as a point with a w coordinate of 1. This
  // means translations will have an effect, for example.
  transformPoint: function(v) {
    var m = this.m;
    return new Vector(
      m[0] * v.x + m[1] * v.y + m[2] * v.z + m[3],
      m[4] * v.x + m[5] * v.y + m[6] * v.z + m[7],
      m[8] * v.x + m[9] * v.y + m[10] * v.z + m[11]
    ).divide(m[12] * v.x + m[13] * v.y + m[14] * v.z + m[15]);
  },

  // ### .transformPoint(vector)
  //
  // Transforms the vector as a vector with a w coordinate of 0. This
  // means translations will have no effect, for example.
  transformVector: function(v) {
    var m = this.m;
    return new Vector(
      m[0] * v.x + m[1] * v.y + m[2] * v.z,
      m[4] * v.x + m[5] * v.y + m[6] * v.z,
      m[8] * v.x + m[9] * v.y + m[10] * v.z
    );
  }
};

// ### GL.Matrix.inverse(matrix[, result])
//
// Returns the matrix that when multiplied with `matrix` results in the
// identity matrix. You can optionally pass an existing matrix in `result`
// to avoid allocating a new matrix. This implementation is from the Mesa
// OpenGL function `__gluInvertMatrixd()` found in `project.c`.
Matrix.inverse = function(matrix, result) {
  result = result || new Matrix();
  var m = matrix.m, r = result.m;

  r[0] = m[5]*m[10]*m[15] - m[5]*m[14]*m[11] - m[6]*m[9]*m[15] + m[6]*m[13]*m[11] + m[7]*m[9]*m[14] - m[7]*m[13]*m[10];
  r[1] = -m[1]*m[10]*m[15] + m[1]*m[14]*m[11] + m[2]*m[9]*m[15] - m[2]*m[13]*m[11] - m[3]*m[9]*m[14] + m[3]*m[13]*m[10];
  r[2] = m[1]*m[6]*m[15] - m[1]*m[14]*m[7] - m[2]*m[5]*m[15] + m[2]*m[13]*m[7] + m[3]*m[5]*m[14] - m[3]*m[13]*m[6];
  r[3] = -m[1]*m[6]*m[11] + m[1]*m[10]*m[7] + m[2]*m[5]*m[11] - m[2]*m[9]*m[7] - m[3]*m[5]*m[10] + m[3]*m[9]*m[6];

  r[4] = -m[4]*m[10]*m[15] + m[4]*m[14]*m[11] + m[6]*m[8]*m[15] - m[6]*m[12]*m[11] - m[7]*m[8]*m[14] + m[7]*m[12]*m[10];
  r[5] = m[0]*m[10]*m[15] - m[0]*m[14]*m[11] - m[2]*m[8]*m[15] + m[2]*m[12]*m[11] + m[3]*m[8]*m[14] - m[3]*m[12]*m[10];
  r[6] = -m[0]*m[6]*m[15] + m[0]*m[14]*m[7] + m[2]*m[4]*m[15] - m[2]*m[12]*m[7] - m[3]*m[4]*m[14] + m[3]*m[12]*m[6];
  r[7] = m[0]*m[6]*m[11] - m[0]*m[10]*m[7] - m[2]*m[4]*m[11] + m[2]*m[8]*m[7] + m[3]*m[4]*m[10] - m[3]*m[8]*m[6];

  r[8] = m[4]*m[9]*m[15] - m[4]*m[13]*m[11] - m[5]*m[8]*m[15] + m[5]*m[12]*m[11] + m[7]*m[8]*m[13] - m[7]*m[12]*m[9];
  r[9] = -m[0]*m[9]*m[15] + m[0]*m[13]*m[11] + m[1]*m[8]*m[15] - m[1]*m[12]*m[11] - m[3]*m[8]*m[13] + m[3]*m[12]*m[9];
  r[10] = m[0]*m[5]*m[15] - m[0]*m[13]*m[7] - m[1]*m[4]*m[15] + m[1]*m[12]*m[7] + m[3]*m[4]*m[13] - m[3]*m[12]*m[5];
  r[11] = -m[0]*m[5]*m[11] + m[0]*m[9]*m[7] + m[1]*m[4]*m[11] - m[1]*m[8]*m[7] - m[3]*m[4]*m[9] + m[3]*m[8]*m[5];

  r[12] = -m[4]*m[9]*m[14] + m[4]*m[13]*m[10] + m[5]*m[8]*m[14] - m[5]*m[12]*m[10] - m[6]*m[8]*m[13] + m[6]*m[12]*m[9];
  r[13] = m[0]*m[9]*m[14] - m[0]*m[13]*m[10] - m[1]*m[8]*m[14] + m[1]*m[12]*m[10] + m[2]*m[8]*m[13] - m[2]*m[12]*m[9];
  r[14] = -m[0]*m[5]*m[14] + m[0]*m[13]*m[6] + m[1]*m[4]*m[14] - m[1]*m[12]*m[6] - m[2]*m[4]*m[13] + m[2]*m[12]*m[5];
  r[15] = m[0]*m[5]*m[10] - m[0]*m[9]*m[6] - m[1]*m[4]*m[10] + m[1]*m[8]*m[6] + m[2]*m[4]*m[9] - m[2]*m[8]*m[5];

  var det = m[0]*r[0] + m[1]*r[4] + m[2]*r[8] + m[3]*r[12];
  for (var i = 0; i < 16; i++) r[i] /= det;
  return result;
};

// ### GL.Matrix.transpose(matrix[, result])
//
// Returns `matrix`, exchanging columns for rows. You can optionally pass an
// existing matrix in `result` to avoid allocating a new matrix.
Matrix.transpose = function(matrix, result) {
  result = result || new Matrix();
  var m = matrix.m, r = result.m;
  r[0] = m[0]; r[1] = m[4]; r[2] = m[8]; r[3] = m[12];
  r[4] = m[1]; r[5] = m[5]; r[6] = m[9]; r[7] = m[13];
  r[8] = m[2]; r[9] = m[6]; r[10] = m[10]; r[11] = m[14];
  r[12] = m[3]; r[13] = m[7]; r[14] = m[11]; r[15] = m[15];
  return result;
};

// ### GL.Matrix.multiply(left, right[, result])
//
// Returns the concatenation of the transforms for `left` and `right`. You can
// optionally pass an existing matrix in `result` to avoid allocating a new
// matrix. This emulates the OpenGL function `glMultMatrix()`.
Matrix.multiply = function(left, right, result) {
  result = result || new Matrix();
  var a = left.m, b = right.m, r = result.m;

  r[0] = a[0] * b[0] + a[1] * b[4] + a[2] * b[8] + a[3] * b[12];
  r[1] = a[0] * b[1] + a[1] * b[5] + a[2] * b[9] + a[3] * b[13];
  r[2] = a[0] * b[2] + a[1] * b[6] + a[2] * b[10] + a[3] * b[14];
  r[3] = a[0] * b[3] + a[1] * b[7] + a[2] * b[11] + a[3] * b[15];

  r[4] = a[4] * b[0] + a[5] * b[4] + a[6] * b[8] + a[7] * b[12];
  r[5] = a[4] * b[1] + a[5] * b[5] + a[6] * b[9] + a[7] * b[13];
  r[6] = a[4] * b[2] + a[5] * b[6] + a[6] * b[10] + a[7] * b[14];
  r[7] = a[4] * b[3] + a[5] * b[7] + a[6] * b[11] + a[7] * b[15];

  r[8] = a[8] * b[0] + a[9] * b[4] + a[10] * b[8] + a[11] * b[12];
  r[9] = a[8] * b[1] + a[9] * b[5] + a[10] * b[9] + a[11] * b[13];
  r[10] = a[8] * b[2] + a[9] * b[6] + a[10] * b[10] + a[11] * b[14];
  r[11] = a[8] * b[3] + a[9] * b[7] + a[10] * b[11] + a[11] * b[15];

  r[12] = a[12] * b[0] + a[13] * b[4] + a[14] * b[8] + a[15] * b[12];
  r[13] = a[12] * b[1] + a[13] * b[5] + a[14] * b[9] + a[15] * b[13];
  r[14] = a[12] * b[2] + a[13] * b[6] + a[14] * b[10] + a[15] * b[14];
  r[15] = a[12] * b[3] + a[13] * b[7] + a[14] * b[11] + a[15] * b[15];

  return result;
};

// ### GL.Matrix.identity([result])
//
// Returns an identity matrix. You can optionally pass an existing matrix in
// `result` to avoid allocating a new matrix. This emulates the OpenGL function
// `glLoadIdentity()`.
Matrix.identity = function(result) {
  result = result || new Matrix();
  var m = result.m;
  m[0] = m[5] = m[10] = m[15] = 1;
  m[1] = m[2] = m[3] = m[4] = m[6] = m[7] = m[8] = m[9] = m[11] = m[12] = m[13] = m[14] = 0;
  return result;
};

// ### GL.Matrix.perspective(fov, aspect, near, far[, result])
//
// Returns a perspective transform matrix, which makes far away objects appear
// smaller than nearby objects. The `aspect` argument should be the width
// divided by the height of your viewport and `fov` is the top-to-bottom angle
// of the field of view in degrees. You can optionally pass an existing matrix
// in `result` to avoid allocating a new matrix. This emulates the OpenGL
// function `gluPerspective()`.
Matrix.perspective = function(fov, aspect, near, far, result) {
  var y = Math.tan(fov * Math.PI / 360) * near;
  var x = y * aspect;
  return Matrix.frustum(-x, x, -y, y, near, far, result);
};

// ### GL.Matrix.frustum(left, right, bottom, top, near, far[, result])
//
// Sets up a viewing frustum, which is shaped like a truncated pyramid with the
// camera where the point of the pyramid would be. You can optionally pass an
// existing matrix in `result` to avoid allocating a new matrix. This emulates
// the OpenGL function `glFrustum()`.
Matrix.frustum = function(l, r, b, t, n, f, result) {
  result = result || new Matrix();
  var m = result.m;

  m[0] = 2 * n / (r - l);
  m[1] = 0;
  m[2] = (r + l) / (r - l);
  m[3] = 0;

  m[4] = 0;
  m[5] = 2 * n / (t - b);
  m[6] = (t + b) / (t - b);
  m[7] = 0;

  m[8] = 0;
  m[9] = 0;
  m[10] = -(f + n) / (f - n);
  m[11] = -2 * f * n / (f - n);

  m[12] = 0;
  m[13] = 0;
  m[14] = -1;
  m[15] = 0;

  return result;
};

// ### GL.Matrix.ortho(left, right, bottom, top, near, far[, result])
//
// Returns an orthographic projection, in which objects are the same size no
// matter how far away or nearby they are. You can optionally pass an existing
// matrix in `result` to avoid allocating a new matrix. This emulates the OpenGL
// function `glOrtho()`.
Matrix.ortho = function(l, r, b, t, n, f, result) {
  result = result || new Matrix();
  var m = result.m;

  m[0] = 2 / (r - l);
  m[1] = 0;
  m[2] = 0;
  m[3] = -(r + l) / (r - l);

  m[4] = 0;
  m[5] = 2 / (t - b);
  m[6] = 0;
  m[7] = -(t + b) / (t - b);

  m[8] = 0;
  m[9] = 0;
  m[10] = -2 / (f - n);
  m[11] = -(f + n) / (f - n);

  m[12] = 0;
  m[13] = 0;
  m[14] = 0;
  m[15] = 1;

  return result;
};

// ### GL.Matrix.scale(x, y, z[, result])
//
// This emulates the OpenGL function `glScale()`. You can optionally pass an
// existing matrix in `result` to avoid allocating a new matrix.
Matrix.scale = function(x, y, z, result) {
  result = result || new Matrix();
  var m = result.m;

  m[0] = x;
  m[1] = 0;
  m[2] = 0;
  m[3] = 0;

  m[4] = 0;
  m[5] = y;
  m[6] = 0;
  m[7] = 0;

  m[8] = 0;
  m[9] = 0;
  m[10] = z;
  m[11] = 0;

  m[12] = 0;
  m[13] = 0;
  m[14] = 0;
  m[15] = 1;

  return result;
};

// ### GL.Matrix.translate(x, y, z[, result])
//
// This emulates the OpenGL function `glTranslate()`. You can optionally pass
// an existing matrix in `result` to avoid allocating a new matrix.
Matrix.translate = function(x, y, z, result) {
  result = result || new Matrix();
  var m = result.m;

  m[0] = 1;
  m[1] = 0;
  m[2] = 0;
  m[3] = x;

  m[4] = 0;
  m[5] = 1;
  m[6] = 0;
  m[7] = y;

  m[8] = 0;
  m[9] = 0;
  m[10] = 1;
  m[11] = z;

  m[12] = 0;
  m[13] = 0;
  m[14] = 0;
  m[15] = 1;

  return result;
};

// ### GL.Matrix.rotate(a, x, y, z[, result])
//
// Returns a matrix that rotates by `a` degrees around the vector `x, y, z`.
// You can optionally pass an existing matrix in `result` to avoid allocating
// a new matrix. This emulates the OpenGL function `glRotate()`.
Matrix.rotate = function(a, x, y, z, result) {
  if (!a || (!x && !y && !z)) {
    return Matrix.identity(result);
  }

  result = result || new Matrix();
  var m = result.m;

  var d = Math.sqrt(x*x + y*y + z*z);
  a *= Math.PI / 180; x /= d; y /= d; z /= d;
  var c = Math.cos(a), s = Math.sin(a), t = 1 - c;

  m[0] = x * x * t + c;
  m[1] = x * y * t - z * s;
  m[2] = x * z * t + y * s;
  m[3] = 0;

  m[4] = y * x * t + z * s;
  m[5] = y * y * t + c;
  m[6] = y * z * t - x * s;
  m[7] = 0;

  m[8] = z * x * t - y * s;
  m[9] = z * y * t + x * s;
  m[10] = z * z * t + c;
  m[11] = 0;

  m[12] = 0;
  m[13] = 0;
  m[14] = 0;
  m[15] = 1;

  return result;
};

// ### GL.Matrix.lookAt(ex, ey, ez, cx, cy, cz, ux, uy, uz[, result])
//
// Returns a matrix that puts the camera at the eye point `ex, ey, ez` looking
// toward the center point `cx, cy, cz` with an up direction of `ux, uy, uz`.
// You can optionally pass an existing matrix in `result` to avoid allocating
// a new matrix. This emulates the OpenGL function `gluLookAt()`.
Matrix.lookAt = function(ex, ey, ez, cx, cy, cz, ux, uy, uz, result) {
  result = result || new Matrix();
  var m = result.m;

  var e = new Vector(ex, ey, ez);
  var c = new Vector(cx, cy, cz);
  var u = new Vector(ux, uy, uz);
  var f = e.subtract(c).unit();
  var s = u.cross(f).unit();
  var t = f.cross(s).unit();

  m[0] = s.x;
  m[1] = s.y;
  m[2] = s.z;
  m[3] = -s.dot(e);

  m[4] = t.x;
  m[5] = t.y;
  m[6] = t.z;
  m[7] = -t.dot(e);

  m[8] = f.x;
  m[9] = f.y;
  m[10] = f.z;
  m[11] = -f.dot(e);

  m[12] = 0;
  m[13] = 0;
  m[14] = 0;
  m[15] = 1;

  return result;
};

module.exports = Matrix

},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
const SceneNode = require( './sceneNode.js' ),
      { param_wrap, MaterialID } = require( './utils.js' ),
      { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc } = require( './var.js' )

const { Vec2, Vec3, Vec4 } = require( './vec.js' )

const Fogger = function( Scene, SDF ) {

  const Fog = function( amount=0.055, color ) {
    const fog = Object.create( Fog.prototype )
    const __amount = param_wrap( amount, float_var_gen( amount ) )  
    
    Object.defineProperty( fog, 'amount', {
      get() { return __amount },
      set( v ) {
        __amount.set( v )
      }
    })

    const __color = param_wrap( Vec3(color), vec3_var_gen( 0,0,0 ) )  
    
    Object.defineProperty( fog, 'color', {
      get() { return __color },
      set( v ) {
        __color.var.set( v )
      }
    })
    
    // this refers to the current scene via implicit binding in scene.js
    this.postprocessing.push( fog )

    return this
  }

  Fog.prototype = SceneNode()
 
  Object.assign( Fog.prototype, {
    emit() {
      return `  color.rgb = applyFog( color.rgb, t.x, ${this.amount.emit()} );`
    },
   
    emit_decl() {
      let str = this.amount.emit_decl() + this.color.emit_decl()
      const preface = `  vec3 applyFog( in vec3 rgb, in float distance, in float amount ) {
    float fogAmount = 1. - exp( -distance * amount );
    vec3  fogColor  = ${this.color.emit()};
    return mix( rgb, fogColor, fogAmount );
  }
  `
      if( SDF.memo.fog === undefined ) {
        str = str + preface
        SDF.memo.fog = true
      }else{
        str = ''
      }

      return str
    },

    update_location( gl, program ) {
      this.amount.update_location( gl, program )
      this.color.update_location( gl, program )
    },

    upload_data( gl ) {
      this.amount.upload_data( gl )
      this.color.upload_data( gl )
    }
  })

  return Fog
}

module.exports = Fogger

},{"./sceneNode.js":24,"./utils.js":29,"./var.js":30,"./vec.js":31}],12:[function(require,module,exports){
'use strict'

const Marching = require( './main.js' )

Marching.__export = Marching.export
Marching.export = obj => {
  obj.march = Marching.createScene.bind( Marching )
  Marching.__export( obj )
}

window.Marching = Marching

module.exports = Marching

},{"./main.js":15}],13:[function(require,module,exports){
const emit_int = function( a ) {
	if( a % 1 !== 0 )
		return Math.round( a )
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

},{}],14:[function(require,module,exports){
const SceneNode = require( './sceneNode.js' ),
      { param_wrap, MaterialID } = require( './utils.js' ),
      { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen } = require( './var.js' ),
      { Vec2, Vec3, Vec4 } = require( './vec.js' )

const glsl = require( 'glslify' )

const Lights = function( SDF ) {

  const Light = {
    lights:[],
    materials:[],

    defaultLights:`
      Light lights[2] = Light[2](
        Light( vec3( 2.,2.,3. ),  vec3(0.25,0.25,.25), 1. ),
        Light( vec3( -2.,2.,3. ), vec3(.25,0.25,0.25), 1. )
      );
    `,

    defaultMaterials:`
      Material materials[2] = Material[2](
        Material( 0, vec3( 1. ), vec3(0.,0.,0.), vec3(1.), 8., Fresnel( 0., 1., 2.), 0 ),
        Material( 0, vec3( 1. ), vec3(1.,0.,0.), vec3(1.), 8., Fresnel( 0., 1., 2.), 0 )
      );
    `,

    light( __pos=Vec3(2,2,3), __color=Vec3(0,0,1), attenuation=1 ) {
      const light = { 
        __attenuation: param_wrap( attenuation, float_var_gen( 1 ) ),
      }

      pos = typeof __pos === 'number' ? Vec3( __pos ) : __pos

      const __varpos = param_wrap( 
        pos, 
        vec3_var_gen( [2,2,3] )
      )

      Object.defineProperty( light, 'pos', {
        get() { return __varpos },
        set(v) {
          if( typeof v === 'object' ) {
            __varpos.set( v )
          }else{
            __varpos.value.x = v
            __varpos.value.y = v
            __varpos.value.z = v
            __varpos.dirty = true
          }
        }
      })  

      color = typeof __color === 'number' ? Vec3( __color ) : __color

      const __varcol = param_wrap( 
        color, 
        vec3_var_gen( [0,0,1] )
      )

      Object.defineProperty( light, 'color', {
        get() { return __varcol },
        set(v) {
          if( typeof v === 'object' ) {
            __varcol.set( v )
          }else{
            __varcol.value.x = v
            __varcol.value.y = v
            __varcol.value.z = v
            __varcol.dirty = true
          }
        }
      })  

      Object.defineProperty( light, 'attenuation', {
        get() { return light.__attenuation.value },
        set(v){
          light.__attenuation.value = v
          light.__attenuation.dirty = true
        }
      })

      return light
    },

    emit_lights() {
      if( this.lights.length === 0 ) return this.defaultLights

      let str = `Light lights[${this.lights.length}] = Light[${this.lights.length}](`

      for( let light of this.lights ) {
        str += `\n        Light( ${light.pos.emit()}, ${light.color.emit()}, ${light.__attenuation.emit()}),` 
      }
      
      str = str.slice(0,-1) // remove trailing comma

      str += '\n      );'

      return str
    },

    mode:'global',

    gen( shadows=8, geometries ) {
      //const str = this.modes[ this.mode ]( this.lights.length || 2, this.emit_lights(), SDF.materials.emit_materials(), shadows )
   
      const modeConstants = SDF.materials.modeConstants
      this.modesEmployed.length = 0

      let lightingFunctions = []

      // loop through all materials used and add corresponding lighting functions as needed
      for( let mat of SDF.materials.materials ) {
        if( this.modesEmployed.indexOf( mat.mode ) === -1 ) {
          lightingFunctions.push( this.modes[ mat.mode ]() )  

          this.modesEmployed.push( mat.mode )
        }
      }

      // check all modes to see if they're lighting function has been added to the shader,
      // if not, add their function stub
      for( let mode of modeConstants ) {
        // key is iterated as string, must use parseInt
        if( this.modesEmployed.indexOf( mode ) === -1 ) {
          lightingFunctions.push( this.defaultFunctionDeclarations[ modeConstants.indexOf( mode ) ] )
        }
      }

      const textures = Marching.textures.__emitFunction()
      const lighting = this.shell( 
        this.lights.length || 2, 
        this.emit_lights(), 
        SDF.materials.emit_materials(), 
        shadows,
        geometries, 
        textures.glsldefs,
        textures.mainfunc
      )

      let lightingFuncStr = lightingFunctions.join('\n')
      lightingFuncStr = lightingFuncStr.replace( /(MAX\_LIGHTS)/g, this.lights.length || 2 )
      return lighting[0] + lightingFuncStr + lighting[1]
    },

    emit_decl() {
      let str = ''
      for( let light of this.lights ) {
        str += light.pos.emit_decl()
        str += light.color.emit_decl()
        str += light.__attenuation.emit_decl()
      }

      return str
    },

    update_location( gl, program ) {
      for( let light of this.lights ) {
        if( light.pos.dirty === true )  light.pos.update_location( gl, program )
        if( light.color.dirty === true )  light.color.update_location( gl, program )
        if( light.__attenuation.dirty === true ) light.__attenuation.update_location( gl, program )
      }

    },

    upload_data( gl, program='' ) {
      for( let light of this.lights ) {
        if( light.pos.dirty === true )   light.pos.upload_data( gl, program )
        if( light.color.dirty === true )  light.color.upload_data( gl, program )
        if( light.__attenuation.dirty === true )  light.__attenuation.upload_data( gl, program )
      }
    },

    modesEmployed:[],

    // these stubs are placed in the shader by default as placeholders so that they can be referenced in 
    // a switch statement selecting lighting. They are overridden by actual lighting functions if any
    // material in the scene uses a corresponding function.
    defaultFunctionDeclarations: [
      '    vec3 global( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, Material mat, Light lights[MAX_LIGHTS], vec3 textureColor ) { return vec3(0.); }',
      '    vec3 normal( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, Material mat, Light lights[MAX_LIGHTS] ) { return vec3(0.); }',
      '    vec3 directional( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, Material mat, Light lights[MAX_LIGHTS], vec3 textureColor ) { return vec3(0.); }',
      '    vec3 orenn( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, Material mat, Light lights[MAX_LIGHTS] ) { return vec3(0.); }',
    ],

    shell( numlights, lights, materials, shadow=0, sdfs, texturePreface, textureBody ) {
      const __shadow = shadow > 0
        ? `diffuseCoefficient *= softshadow( surfacePosition, normalize( light.position ), 0.02, 2.5, ${shadow.toFixed(1)} );` 
        : ''


      let preface = glsl(["#define GLSLIFY 1\n  int MAX_LIGHTS = ",";\n    float ao( in vec3 pos, in vec3 nor ){\n      float occ = 0.0;\n      float sca = 1.0;\n      for( int i=0; i<5; i++ )\n      {\n          float hr = 0.01 + 0.12 * float( i ) / 4.0;\n          vec3 aopos =  nor * hr + pos;\n          float dd = scene ( aopos ).x;\n          occ += -(dd-hr)*sca;\n          sca *= 0.95;\n      }\n      return clamp( 1.0 - 3.0*occ, 0.0, 1.0 );    \n    }\n\n    \n    ","\n    ","\n    ",""],numlights,texturePreface,textureBody)
      let func = `

    vec3 lighting( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, float sdfID, bool useTextureTransform ) {
      ${sdfs}
      SDF sdf = sdfs[ int( sdfID ) ];

      ${materials}
      Material mat = materials[ sdf.materialID ];

      int MAX_LIGHTS = ${numlights};     

      ${lights}
 
      vec3 tex = getTexture( int(sdf.textureID), surfacePosition, normal, sdf, useTextureTransform );

      vec3 clr;
      switch( mat.mode ) {
        case 0: clr = global( surfacePosition, normal, rayOrigin, rayDirection, mat, lights, tex ); break;
        case 1: clr = normal; break;
        case 2: clr = directional( surfacePosition, normal, rayOrigin, rayDirection, mat, lights, tex ); break;
        case 3: clr = orenn( surfacePosition, normal, rayOrigin, rayDirection, mat, lights ); break;
        default:
          clr = normal;
      }

      return clr; 
    }
`
      return [ preface, func ]
    }, 

    modes:{
      global() {
        const shadow = SDF.__scene.__shadow

        const str = glsl(["#define GLSLIFY 1\n\n\n        vec3 global( vec3 pos, vec3 nor, vec3 ro, vec3 rd, Material mat, Light lights[MAX_LIGHTS], vec3 textureColor ) {\n          Light light = lights[ 0 ];\n          vec3  ref = reflect( rd, nor ); // reflection angle\n          float occ = ao( pos, nor );\n          vec3  lig = normalize( light.position ); // light position\n          float amb = clamp( 0.5 + 0.5 * nor.y, 0.0, 1.0 );\n          float dif = clamp( dot( nor, lig ), 0.0, 1.0 );\n\n          // simulated backlight\n          float bac = clamp( dot( nor, normalize( vec3( -lig.x, 0.0 , -lig.z ))), 0.0, 1.0 ) * clamp( 1.0-pos.y, 0.0 ,1.0 );\n\n          // simulated skydome light\n          float dom = smoothstep( -0.1, 0.1, ref.y );\n          float fre = pow( clamp( 1.0 + dot( nor,rd ),0.0,1.0 ), 3.0);\n          float spe = pow( clamp( dot( ref, lig ), 0.0, 1.0 ), 8.0 );\n\n          dif *= softshadow( pos, lig, 0.02, 2.5, "," );\n          dom *= softshadow( pos, ref, 0.02, 2.5, "," );\n\n          vec3 brdf = textureColor;//vec3( 0.0 );\n          brdf += 1.20 * dif * vec3( 1.00,0.90,0.60 ) * mat.diffuse * light.color;\n          brdf += 2.20 * spe * vec3( 1.00,0.90,0.60 ) * dif * mat.specular * light.color;\n          brdf += 0.30 * amb * vec3( 0.50,0.70,1.00 ) * occ * mat.ambient * light.color;\n          brdf += 0.40 * dom * vec3( 0.50,0.70,1.00 );\n          brdf += 0.70 * bac * vec3( 0.25 );\n          brdf += 0.40 * (fre * light.color);\n\n          return brdf;\n        }\n        ",""],shadow.toFixed(1),shadow.toFixed(1))

        return str
      },

      phong( numlights, lights, materials ) {
        const shadow = SDF.__scene.__shadow

        const __shadow = shadow > 0
          ? `diffuseCoefficient *= softshadow( surfacePosition, normalize( light.position ), 0.02, 2.5, ${shadow.toFixed(1)} );` 
          : ''

        const str = glsl(["#define GLSLIFY 1\n  \n        \n        vec3 directional( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, Material mat, Light lights[MAX_LIGHTS], vec3 textureColor ) {\n          vec3  outputColor   = textureColor;//vec3( 0. );\n   \n          // applies to all lights\n          float occlusion = ao( surfacePosition, normal );\n\n          for( int i = 0; i < 20000; i++ ) {\n            if( i >= MAX_LIGHTS ) break;\n\n            Light light = lights[ i ];\n\n            vec3 surfaceToLightDirection = normalize( light.position - surfacePosition );\n            \n            // get similarity between normal and direction to light\n            float diffuseCoefficient = dot( normal, surfaceToLightDirection ); \n\n            // get reflection angle for light striking surface\n            vec3 angleOfReflection = reflect( -surfaceToLightDirection, normal );\n\n            // see if reflected light travels to camera and generate coefficient accordingly\n            float specularAngle = clamp( dot( angleOfReflection, -rayDirection ), 0., 1. );\n            float specularCoefficient = pow( specularAngle, mat.shininess );\n\n            // lights should have an attenuation factor\n            float attenuation = 1. / ( light.attenuation * pow( length( light.position - surfacePosition ), 2. ) ); \n\n            // bias, scale, power\n            float fresnel = mat.fresnel.x + mat.fresnel.y * pow( 1.0 + dot( rayDirection, normal ), mat.fresnel.z ); \n\n            ","\n\n            vec3 color = vec3( 0. );\n            color += 1.2 * diffuseCoefficient * mat.diffuse * light.color;\n            color += 2.2 * specularCoefficient * mat.specular * light.color;\n            color += 0.3 * (mat.ambient * light.color) * occlusion;\n            color += (fresnel * light.color);\n\n            // texture\n            //color *= textureColor.xyz;\n\n            // gamma correction must occur before light attenuation\n            // which means it must be applied on a per-light basis unfortunately\n            vec3 gammaCorrectedColor = pow( color, vec3( 1./2.2 ) );\n            vec3 attenuatedColor = 2. * gammaCorrectedColor * attenuation; \n\n            outputColor += attenuatedColor;\n          }\n\n          return outputColor;\n        }\n        ",""],__shadow)

        return str
      }, 
      phongT( numlights, lights, materials ) {
        const shadow = SDF.__scene.__shadow

        const __shadow = shadow > 0
          ? `diffuseCoefficient *= softshadow( surfacePosition, normalize( light.position ), 0.02, 2.5, ${shadow.toFixed(1)} );` 
          : ''

        const str = glsl(["#define GLSLIFY 1\n  \n\n        vec3 directional( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, Material mat, Light lights[MAX_LIGHTS] ) {\n          vec3  outputColor   = vec3( 0. );\n   \n          // applies to all lights\n          float occlusion = ao( surfacePosition, normal );\n\n          vec4 textureColor;\n          if( mat.textureID > -1 ) {\n            //textureColor = texcube( textures[ mat.textureID ], surfacePosition, normal, 1. );//texture( textures[ mat.textureID ], surfacePosition.xy - normal.xy ); \n            vec2 uv = getUVCubic( surfacePosition, vec3(0.) );//surfacePosition.xz*vec2(0.03,0.07);\n            textureColor = texture( textures[ mat.textureID ], uv );\n          }else{\n            textureColor = vec4(0.);\n          }\n\n          outputColor = 0;//textureColor.xyz;\n\n          for( int i = 0; i < 20000; i++ ) {\n            if( i >= MAX_LIGHTS ) break;\n\n            Light light = lights[ i ];\n\n            vec3 surfaceToLightDirection = normalize( light.position - surfacePosition );\n            \n            // get similarity between normal and direction to light\n            float diffuseCoefficient = dot( normal, surfaceToLightDirection ); \n\n            // get reflection angle for light striking surface\n            vec3 angleOfReflection = reflect( -surfaceToLightDirection, normal );\n\n            // see if reflected light travels to camera and generate coefficient accordingly\n            float specularAngle = clamp( dot( angleOfReflection, -rayDirection ), 0., 1. );\n            float specularCoefficient = pow( specularAngle, mat.shininess );\n\n            // lights should have an attenuation factor\n            float attenuation = 1. / ( light.attenuation * pow( length( light.position - surfacePosition ), 2. ) ); \n\n            // bias, scale, power\n            float fresnel = mat.fresnel.x + mat.fresnel.y * pow( 1.0 + dot( rayDirection, normal ), mat.fresnel.z ); \n\n            ","\n\n            vec3 color = vec3( 0. );\n            color += 1.2 * diffuseCoefficient * textureColor.xyz * light.color;\n            color += 2.2 * specularCoefficient * textureColor.xyz * light.color;\n            color += 0.3 * (mat.ambient * light.color) * occlusion;\n            color += (fresnel * light.color);\n\n            // texture\n            //color *= textureColor.xyz;\n\n            // gamma correction must occur before light attenuation\n            // which means it must be applied on a per-light basis unfortunately\n            vec3 gammaCorrectedColor = pow( color, vec3( 1./2.2 ) );\n            vec3 attenuatedColor = 2. * gammaCorrectedColor * attenuation; \n\n            outputColor += attenuatedColor;\n          }\n\n          return outputColor;\n        }\n        ",""],__shadow)

        return str
      }, 


      orenn( numlights, lights, materials ) {
        const shadow = SDF.__scene.__shadow
        const __shadow = shadow > 0
          ? `diffuseCoefficient *= softshadow( surfacePosition, normalize( light.position ), 0.02, 2.5, ${shadow.toFixed(1)} );` 
          : ''

        const str = glsl(["#define GLSLIFY 1\n  \n        float orenNayarDiffuse(\n  vec3 lightDirection,\n  vec3 viewDirection,\n  vec3 surfaceNormal,\n  float roughness,\n  float albedo) {\n  \n  float LdotV = dot(lightDirection, viewDirection);\n  float NdotL = dot(lightDirection, surfaceNormal);\n  float NdotV = dot(surfaceNormal, viewDirection);\n\n  float s = LdotV - NdotL * NdotV;\n  float t = mix(1.0, max(NdotL, NdotV), step(0.0, s));\n\n  float sigma2 = roughness * roughness;\n  float A = 1.0 + sigma2 * (albedo / (sigma2 + 0.13) + 0.5 / (sigma2 + 0.33));\n  float B = 0.45 * sigma2 / (sigma2 + 0.09);\n\n  return albedo * max(0.0, NdotL) * (A + B * s / t) / 3.14159265;\n}\n\n        float gaussianSpecular(\n  vec3 lightDirection,\n  vec3 viewDirection,\n  vec3 surfaceNormal,\n  float shininess) {\n  vec3 H = normalize(lightDirection + viewDirection);\n  float theta = acos(dot(H, surfaceNormal));\n  float w = theta / shininess;\n  return exp(-w*w);\n}\n\n        vec3 orenn( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, Material mat, Light lights[MAX_LIGHTS] ) {\n          vec3  outputColor   = vec3( 0. );\n   \n          // applies to all lights\n          float occlusion = ao( surfacePosition, normal );\n\n          for( int i = 0; i < 20000; i++ ) {\n            if( i >= MAX_LIGHTS ) break;\n\n            Light light = lights[ i ];\n\n            vec3 surfaceToLightDirection = normalize( light.position - surfacePosition );\n            \n            // get similarity between normal and direction to light\n            float diffuseCoefficient = orenNayarDiffuse( surfaceToLightDirection, -rayDirection, normal, 0.15, 4.0);\n\n            // get reflection angle for light striking surface\n            vec3 angleOfReflection = reflect( -surfaceToLightDirection, normal );\n\n            // see if reflected light travels to camera and generate coefficient accordingly\n            float specularAngle = clamp( dot( angleOfReflection, -rayDirection ), 0., 1. );\n            float specularCoefficient = gaussianSpecular( surfaceToLightDirection, -rayDirection, normal, .5 ); \n\n            // lights should have an attenuation factor\n            float attenuation = 1. / ( light.attenuation * pow( length( light.position - surfacePosition ), 2. ) ); \n\n            float fresnel = mat.fresnel.x + mat.fresnel.y * pow( 1.0 + dot( rayDirection, normal ), mat.fresnel.z ); \n\n            ","\n\n            vec3 color = vec3( 0. );\n            color += 1.2 * diffuseCoefficient * mat.diffuse * light.color;\n            color += 2.2 * specularCoefficient * mat.specular * light.color;\n            color += 0.3 * (mat.ambient * light.color) * occlusion;\n            color += (fresnel * light.color);\n\n            // gamma correction must occur before light attenuation\n            // which means it must be applied on a per-light basis unfortunately\n            vec3 gammaCorrectedColor = pow( color, vec3( 1./2.2 ) );\n            vec3 attenuatedColor = 2. * gammaCorrectedColor * attenuation; \n\n            outputColor += attenuatedColor;\n          }\n\n          return outputColor;\n        }",""],__shadow)

        return str
      }, 

      normal() { return '' },
      noise() { return '' }
    },
  }

  return Light
}

module.exports = Lights

// old lighting
/*
*/

},{"./sceneNode.js":24,"./utils.js":29,"./var.js":30,"./vec.js":31,"glslify":178}],15:[function(require,module,exports){
const SDF = {
  camera:           require( './camera.js' ),
  __primitives:     require( './primitives.js' ),
  vectors:          require( './vec.js' ),
  distanceOps:      require( './distanceOperations.js' ),
  alterations:      require( './alterations.js' ),
  distanceDeforms:  require( './distanceDeformations.js' ),
  __domainOps:      require( './domainOperations.js' ),
  __noise:          require( './noise.js' ),
  __scene:          require( './scene.js' ),
  __lighting:       require( './lighting.js' ),
  __materials:      require( './material.js' ),
  __textures:       require( './texture.js' ),
  Var:              require( './var.js' ).Var,
  //Color:            require( './color.js' ),
  FFT:              require( './audio.js' ),
  OSC:              require( './osc.js' ),
  fx:               require( './mergepass.js' ),

  gl:               null,
  // a function that generates the fragment shader
  renderFragmentShader: require( './renderFragmentShader.js' ),

  // additional callbacks that are run once per frame
  callbacks: [],
  // callbacks that are run *after* all rendering has occurred
  postrendercallbacks: [],
  geometries: [],

  // the main drawing callback
  render: null,

  // the scene is a chain of Unions combining all elements together
  scene:  null,

  // a speed of 1 corresponds to 60 fps.
  delay: 0,
  __isPaused:false,

  defaultVertexSource:`    #version 300 es
    in vec2 a_pos;

		void main() {
			gl_Position = vec4( a_pos, 0., 1. );
    }`
  ,

  export( obj ) {
    Object.assign( 
      obj, 
      this.primitives,
      this.vectors,
      this.distanceOps,
      this.domainOps,
      this.distanceDeforms,
      //this.alterations
    )

    this.fx.export( obj )

    obj.Light = this.Light
    obj.Material = this.Material
    obj.Texture  = this.Texture
    obj.camera = this.camera
    obj.callbacks = this.callbacks // XXX remove once API stops using callbacks
    obj.FFT = this.FFT
    obj.OSC = this.OSC
  },

  init( canvas, shouldInit = true ) {
    this.primitives = this.__primitives( this )
    this.Scene      = this.__scene( this )
    this.domainOps  = this.__domainOps( this )
    this.noise     = this.__noise( this )
    this.export( this )

    this.canvas = canvas//document.createElement('canvas')

    this.lighting   = this.__lighting( this )
    this.Light = this.lighting.light
    this.materials  = this.__materials( this )
    this.Material = this.materials.material
    this.textures = this.__textures( this )
    this.Texture = this.textures.texture

    if( shouldInit ) this.initGL()
     

  },

  initGL() {
    this.gl = this.canvas.getContext( 'webgl2', { antialias:true, alpha:true })
  },
  // generate shaders, initialize camera, start rendering loop 
  createScene( ...args ) {
    const scene = this.Scene( args, this.canvas )

    this.requiredGeometries = []
    this.requiredOps = []
    this.memo = {}

    return scene
  },

  start( fs, width, height, shouldAnimate ) {
    if( this.render !== null ) this.render.running = false

    if( this.gl === null ) 
      this.gl = this.canvas.getContext( 'webgl2', { antialias:true, alpha:true })

    this.fs = fs
    this.callbacks.length = 0

    this.render = this.initWebGL( this.defaultVertexSource, fs, width, height, shouldAnimate )
    this.render.running = true

    this.camera.init( this.gl, this.program, cb => { 
      this.callbacks.push( cb )
    })

    setTimeout( ()=> this.render( 0.0 ), 0 )
  },

  generateSDF( __scene ) {
    let scene = { preface:'' }

    /* if there is more than one object in our scene, chain pairs of objects
       in Unions. So, given objects a,b,c, and d create:

       Union( a, Union( b, Union( c,d ) ) )

       ... or something like that. If there is only a single object,
       use that object as the entire scene.
     */

    let objs = __scene.objs
    if( objs.length > 1 ) {
      // reduce objects to nested Unions
      scene.output = objs.reduce( ( current, next ) => this.Union( current, next ) )
    }else{
      scene.output = objs[0]
    }

    // create an fancy emit() function that wraps the scene
    // with an id #.

    scene.output.__emit = scene.output.emit.bind( scene.output )
    scene.output.emit = function( ...args ) {
      const emitted = scene.output.__emit(...args)
      const output = {
        out:     emitted.out,
        preface: emitted.preface || '' 
      }

      return output 
    }

    this.scene = scene.output

    let variablesDeclaration = scene.output.emit_decl()
    const sceneRendering = scene.output.emit()

    let pp = ''
    for( let processor of __scene.postprocessing ) {
      pp += processor.emit()
      variablesDeclaration += processor.emit_decl()
    }
    
    this.postprocessing = __scene.postprocessing

    return [ variablesDeclaration, sceneRendering, pp ]
  },

	compile( type, source ) {
    const gl = this.gl

		const shader = this.shader = gl.createShader( type );
		gl.shaderSource( shader, source )
		gl.compileShader( shader )

		if( gl.getShaderParameter( shader, gl.COMPILE_STATUS) !== true ) {
			let log = gl.getShaderInfoLog( shader )
			gl.deleteShader( shader )

			console.log( source )
			console.log( log )

			return null
		}

		return shader
	},

  createProgram( vs_source, fs_source ) {
    const gl = this.gl
		const vs = this.compile( gl.VERTEX_SHADER, vs_source )
		const fs = this.compile( gl.FRAGMENT_SHADER, fs_source )

		if( null === vs || null === fs ) return null

		const program = gl.createProgram()
		gl.attachShader( program, vs )
		gl.attachShader( program, fs )
		gl.linkProgram( program )

		if( gl.getProgramParameter( program, gl.LINK_STATUS ) !== true ){
			const log = gl.getProgramInfoLog( program )
			gl.deleteShader(vs)
			gl.deleteShader(fs)
			gl.deleteProgram(program)

			console.error( log )
			return null
		}

    const drawProgram = gl.createProgram()
    const fragSource = ` #version 300 es
  precision mediump float;

  uniform sampler2D uSampler;
  uniform vec2 resolution;

  out vec4 col;
  void main() {
    // copy color info from texture
    col = vec4( texture( uSampler, gl_FragCoord.xy / resolution ).rgb, 1. );
  }`

    const fs_draw = this.compile( gl.FRAGMENT_SHADER, fragSource )
    const vs_draw = this.compile( gl.VERTEX_SHADER, vs_source )

    gl.attachShader( drawProgram, vs_draw )
		gl.attachShader( drawProgram, fs_draw )
		gl.linkProgram( drawProgram )

    return [ program, drawProgram ]
  },

  clear() {
    if( this.callbacks !== undefined ) this.callbacks.length = 0
    if( this.postrendercallbacks !== undefined ) this.postrendercallbacks.length = 0
    if( this.render !== null ) this.render.running = false

    // remove post-processing fx
    this.fx.clear()

    this.geometries.length = 0

    const gl = this.gl
    if( gl !== null )
      gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT )
  },

  pause() {
    this.__isPaused = !this.__isPaused
  },

  initBuffers( width, height, colorTexture, depthTexture ) {
    if( this.gl === null ) this.initGL()
    const gl = this.gl
    gl.clearColor( 0.0, 0.0, 0.0, 0.0 )
    gl.clear(gl.COLOR_BUFFER_BIT)

    const framebuffer = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    const vbo = gl.createBuffer()

    const vertices = new Float32Array([
      -1, -1,
      1,  -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1
    ])

    // initialize memory for buffer and populate it. Give
    // open gl hint contents will not change dynamically.
    gl.bindBuffer( gl.ARRAY_BUFFER, vbo )
    gl.bufferData( gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW )

    gl.drawBuffers([
      gl.COLOR_ATTACHMENT0,
      gl.COLOR_ATTACHMENT1 
    ])

    return { vbo, vertices, framebuffer }
  },

  initUniforms( gl, program ) {
    const aPos = this.gl.getAttribLocation( this.program, "a_pos" )

    const uTime= this.gl.getUniformLocation( this.program, "time" )
    const uResolution = this.gl.getUniformLocation( this.program, "resolution" )

    return { aPos, uTime, uResolution } 
  },

  initTextures( gl, width, height ) {
    gl.getExtension( 'EXT_color_buffer_float' )

    const colorTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, colorTexture)
    
    // must use linear interpolation for merge-pass integration 
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR )
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR )
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE )
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE )
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.myColorTexture = colorTexture

    // store depth in floating point texture
    const depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthTexture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null)

    return { colorTexture, depthTexture }
  },

  updateLocations() {
    this.postprocessing.forEach( pp => pp.update_location( this.gl, this.program ) )
    this.scene.update_location( this.gl, this.program )
    this.textures.update_location( this.gl, this.program )
    this.materials.update_location( this.gl, this.program )
    this.lighting.update_location( this.gl, this.program )
  },

  initShaderProgram( vs, fs, gl ) {
    const programs = this.createProgram( vs, fs )
    this.program = programs[0]

    return programs
  },

  uploadData( gl ) {
    this.materials.upload_data( gl )
    this.textures.upload_data( gl )
    this.scene.upload_data( gl )
    this.lighting.upload_data( gl )
    this.postprocessing.forEach( pp => pp.upload_data( gl ) )
  },

  uploadVertices( gl, aPos, vertices ) {
    gl.bufferData( gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW )

    gl.enableVertexAttribArray( aPos )
    gl.vertexAttribPointer( aPos, 2, gl.FLOAT, false, 0, 0)
  },

  initWebGL( vs, fs, width, height,shouldAnimate=false ) {
    this.canvas.width = width 
    this.canvas.height = height 

    this.fx.MP.settings.offset = this.textures.textures.length 

    const gl                                = this.gl,
          programs                          = this.initShaderProgram( vs, fs, gl ),
          { colorTexture, depthTexture }    = this.initTextures( gl, width, height ),
          { aPos, uTime, uResolution }      = this.initUniforms( gl, programs[0] ),
          { vbo, vertices, framebuffer }    = this.initBuffers( width, height, colorTexture, depthTexture )
 
    let total_time = 0.0,
        frameCount = 0

    // only init post-processing if effects have been registered
    if( this.fx.chain.length > 0 ) this.fx.init( colorTexture, depthTexture, gl )

    gl.useProgram( this.program )
    this.updateLocations( gl, this.program )
    this.uploadVertices( gl, aPos, vertices )

    gl.viewport( 0,0,width,height )
    gl.uniform2f( uResolution, width, height )
 
    const render = function( timestamp ){
      if( render.running === true && shouldAnimate === true ) {
        window.requestAnimationFrame( render )
      }else if( render.running === false ) {
        gl.bindFramebuffer( gl.FRAMEBUFFER, framebuffer )
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT )
        return
      }

      gl.useProgram( this.program )
      gl.bindFramebuffer( gl.FRAMEBUFFER, framebuffer )
    
      if( this.fx.merger !== null ) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fx.merger.tex.back.tex, 0 )
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.fx.merger.tex.bufTextures[0].tex, 0)
      }else{
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, depthTexture, 0)
      }

      gl.enableVertexAttribArray( aPos )

      if( this.__isPaused === false ) {
        this.currentTime = timestamp

        if( this.delay !== 0 && this.delay >= frameCount ) {
          frameCount++
          return
        }else if( this.delay !== 0 ) {
          frameCount = 0
        }

        total_time = timestamp / 1000.0
        gl.uniform1f( uTime, total_time )

        this.callbacks.forEach( cb => cb( total_time, this.currentTime ) )

        if( typeof window.onframe === 'function' ) window.onframe( total_time )
      }

      //this.textures.update_location( gl, this.program )
      // transfer all data associated with uniforms in marching.js
      this.uploadData( gl )

      // draw to color and depth texturese
      gl.bindBuffer( gl.ARRAY_BUFFER, vbo )

      // if post-processing is not being used,
      // draw directly to screen
      if( this.fx.merger === null ) {
        gl.bindFramebuffer( gl.FRAMEBUFFER, null )
      }

      gl.drawArrays( gl.TRIANGLES, 0, 6 )

      /********* UNCOMMENT THIS LINE TO CHECK MARCHING.JS COLOR OUPTUT ***************/
      // this.runCopyShader( gl, width, height, aPos, programs, colorTexture, vbo )
      
      /********* UNCOMMENT THIS LINE TO CHECK MARCHING.JS DEPTH OUPTUT ***************/
      // this.runCopyShader( gl, width, height, aPos, programs, depthTexture, vbo )
 
      // conditional mergepass render
      if( this.fx.merger !== null ) this.fx.merger.draw( total_time )

      this.postrendercallbacks.forEach( fnc => fnc( total_time ) )

    }.bind( SDF )

    render.running = true

    return render    
  },

  runCopyShader( gl, width, height, loc_a_pos, programs, colorTexture, vbo ) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null )

    gl.bindTexture(gl.TEXTURE_2D, colorTexture)
    gl.viewport(0, 0, width, height )

    gl.bindBuffer( gl.ARRAY_BUFFER, vbo )
    gl.useProgram( programs[1] )

    const u_resolution = gl.getUniformLocation(programs[1], "resolution" )
    gl.uniform2f( u_resolution, width, height )

    gl.drawArrays( gl.TRIANGLES, 0, 6 )
  }
}

module.exports = SDF

},{"./alterations.js":1,"./audio.js":2,"./camera.js":4,"./distanceDeformations.js":5,"./distanceOperations.js":6,"./domainOperations.js":8,"./lighting.js":14,"./material.js":16,"./mergepass.js":17,"./noise.js":18,"./osc.js":19,"./primitives.js":21,"./renderFragmentShader.js":22,"./scene.js":23,"./texture.js":25,"./var.js":30,"./vec.js":31}],16:[function(require,module,exports){
const SceneNode = require( './sceneNode.js' ),
      { param_wrap, MaterialID } = require( './utils.js' ),
      { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen } = require( './var.js' ),
      { Vec2, Vec3, Vec4 } = require( './vec.js' )


const glsl = require( 'glslify' )

const __Materials = function( SDF ) {

  const Materials = {
    materials:[],
    __materials:[],
    modeConstants : [
      'global',
      'normal',
      'phong',
      'orenn',
      'noise'
    ],

    default: 'global',

    //defaultMaterials:`
    //  Material materials[2] = Material[2](
    //    Material( 0, vec3( 1. ), vec3(0.,0.,0.), vec3(1.), 8., Fresnel( 0., 1., 2.) ),
    //    Material( 0, vec3( 1. ), vec3(1.,0.,0.), vec3(1.), 8., Fresnel( 0., 1., 2.) )
    //  );
    //`,

    addMaterial( mat ) {
      if( mat === undefined ) mat = Materials.material.default

      if( Materials.materials.indexOf( mat ) === -1 ) {
        mat.id = MaterialID.alloc()

        // we have to dirty the material so that its data
        // will be uploaded to new shaders, otherwise the
        // material will only work the first time it's used, when
        // it's dirty on initialization.
        Materials.dirty( mat )

        Materials.materials.push( mat )
      } 

      return mat
    },

    material( mode='global', __ambient, __diffuse, __specular, __shininess, __fresnel, __texture=null ){
      let modeIdx = Materials.modeConstants.indexOf( mode )
      if( modeIdx === -1 ) {
        console.warn( `There is no material type named ${mode}. Using the default material, ${Materials.default}, instead.` )
        mode = Materials.default
        modeIdx = Materials.modeConstants.indexOf( mode )
      }

      if( typeof __ambient === 'number' ) __ambient = Vec3( __ambient )
      const ambient = param_wrap( __ambient, vec3_var_gen(.1,.1,.1) )
      if( typeof __diffuse=== 'number' ) __diffuse= Vec3( __diffuse )
      const diffuse = param_wrap( __diffuse, vec3_var_gen(0,0,1) )
      if( typeof __specular === 'number' ) __specular = Vec3( __specular )
      const specular = param_wrap( __specular, vec3_var_gen(1,1,1) )
      const shininess = param_wrap( __shininess, float_var_gen(8) )
      if( typeof __fresnel === 'number' ) __fresnel = Vec3( __fresnel )
      const fresnel = param_wrap( __fresnel, vec3_var_gen(0,1,2) )

      const mat = { shininess, mode, texture:__texture, type:'material' }

      Object.defineProperty( mat, 'ambient', {
        get() { return ambient },
        set(v) {
          if( typeof v === 'object' ) {
            ambient.set( v )
          }else{
            ambient.value.x = v
            ambient.value.y = v
            ambient.value.z = v
            ambient.dirty = true
          }
        }
      })  
      Object.defineProperty( mat, 'diffuse', {
        get() { return diffuse },
        set(v) {
          if( typeof v === 'object' ) {
            diffuse.set( v )
          }else{
            diffuse.value.x = v
            diffuse.value.y = v
            diffuse.value.z = v
            diffuse.dirty = true
          }
        }
      })  
      Object.defineProperty( mat, 'specular', {
        get() { return specular },
        set(v) {
          if( typeof v === 'object' ) {
            specular.set( v )
          }else{
            specular.value.x = v
            specular.value.y = v
            specular.value.z = v
            specular.dirty = true
          }
        }
      })  
      Object.defineProperty( mat, 'fresnel', {
        get() { return fresnel },
        set(v) {
          if( typeof v === 'object' ) {
            fresnel.set( v )
          }else{
            fresnel.value.x = v
            fresnel.value.y = v
            fresnel.value.z = v
            fresnel.dirty = true
          }
        }
      })  
      //Object.defineProperty( mat, 'shininess', {
      //  get() { return mat.shininess.value },
      //  set(v){
      //    mat.shininess.value = v
      //    mat.shininess.dirty = true
      //  }
      //})     //
      
      return mat 
    },

    dirty( mat ) {
      mat.ambient.dirty = true
      mat.diffuse.dirty = true
      mat.specular.dirty = true
      mat.shininess.dirty = true
      mat.fresnel.dirty = true
      if( mat.texture !== null ) mat.texture.dirty = true
    },
   
    emit_materials() {
      if( this.materials.length === 0 ) {
        console.log( 'returning undefined?', this.defaultMaterials )
        return this.defaultMaterials//this.addMaterial() 
      }

      let str = `Material materials[${this.materials.length}] = Material[${this.materials.length}](`

      this.materials.sort( (a,b) => a.id > b.id ? 1 : -1 ) 

      for( let mat of this.materials ) {
        const fresnel = `Fresnel( ${f(mat.fresnel.x)}, ${f(mat.fresnel.y)}, ${f(mat.fresnel.z)} )`

        const texid = 0//SDF.textures.textures.indexOf( mat.texture )
        str += mat.texture === null 
          ? `\n        Material( ${this.modeConstants.indexOf( mat.mode )}, ${mat.ambient.emit()}, ${mat.diffuse.emit()}, ${mat.specular.emit()}, ${mat.shininess.emit()}, ${mat.fresnel.emit()}, ${ texid } ),` 
          : `\n        Material( ${this.modeConstants.indexOf( mat.mode )}, ${mat.ambient.emit()}, ${mat.diffuse.emit()}, ${mat.specular.emit()}, ${mat.shininess.emit()}, ${mat.fresnel.emit()}, ${ texid } ),` 
      }
      
      str = str.slice(0,-1) // remove trailing comma

      str += '\n      );'

      this.__materials = this.materials.slice( 0 )
      this.materials.length = 0

      return str
    },

    emit_decl() {
      let str = ''
      for( let mat of this.__materials ) {
        str += mat.ambient.emit_decl()
        str += mat.diffuse.emit_decl()
        str += mat.specular.emit_decl()
        str += mat.shininess.emit_decl()
        str += mat.fresnel.emit_decl()
      }

      return str
    },

    update_location( gl, program ) {
      for( let mat of this.__materials ) {
        if( mat.ambient.dirty === true )   mat.ambient.update_location( gl, program )
        if( mat.diffuse.dirty === true )   mat.diffuse.update_location( gl, program )
        if( mat.specular.dirty === true )  mat.specular.update_location( gl, program )
        if( mat.shininess.dirty === true ) mat.shininess.update_location( gl, program )
        if( mat.fresnel.dirty === true )   mat.fresnel.update_location( gl, program )
      }
    },

    upload_data( gl, program='' ) {
      for( let mat of this.__materials ) {
        if( mat.ambient.dirty === true )   mat.ambient.upload_data( gl, program )
        if( mat.diffuse.dirty === true )   mat.diffuse.upload_data( gl, program )
        if( mat.specular.dirty === true )  mat.specular.upload_data( gl, program )
        if( mat.shininess.dirty === true ) mat.shininess.upload_data( gl, program )
        if( mat.fresnel.dirty === true )   mat.fresnel.upload_data( gl, program )
      }
    }

  }

  const f = value => value % 1 === 0 ? value.toFixed(1) : value 

  Object.assign( Materials.material, {
    default : Materials.material( 'global', Vec3( .15 ), Vec3(0), Vec3(1), 8, Vec3( 0, 1, .5 ) ),  
    red     : Materials.material( 'global', Vec3(.25,0,0), Vec3(1,0,0), Vec3(0), 2, Vec3(0) ),
    green   : Materials.material( 'global', Vec3(0,.25,0), Vec3(0,1,0), Vec3(0), 2, Vec3(0) ),
    blue    : Materials.material( 'global', Vec3(0,0,.25), Vec3(0,0,1), Vec3(0), 2, Vec3(0) ),
    cyan    : Materials.material( 'global', Vec3(0,.25,.25), Vec3(0,1,1), Vec3(0), 2, Vec3(0) ),
    magenta : Materials.material( 'global', Vec3(.25,0,.25), Vec3(1,0,1), Vec3(0), 2, Vec3(0) ),
    yellow  : Materials.material( 'global', Vec3(.25,.25,.0), Vec3(1,1,0), Vec3(0), 2, Vec3(0) ),
    black   : Materials.material( 'global', Vec3(0, 0, 0), Vec3(0,0,0), Vec3(0), 2, Vec3(0) ),
    white   : Materials.material( 'global', Vec3(.25), Vec3(1), Vec3(1), 2, Vec3(0) ),
    grey    : Materials.material( 'global', Vec3(.25), Vec3(.33), Vec3(1), 2, Vec3(0) ),

    'white glow' : Materials.material( 'phong',  Vec3(.015), Vec3(1), Vec3(1), 16, Vec3(0,200,5) ),
    glue         : Materials.material( 'phong',  Vec3(.015), Vec3(1), Vec3(1), 16, Vec3(0,15,-.1) ),
    inverse      : Materials.material( 'phong', 1, .5, 1, 16, Vec3(1,.5,-2) ),
    blackhole    : Materials.material( 'phong', Vec3(0), Vec3(0), Vec3(0), 32 ),

    normal  : Materials.material( 'normal' ),
    noise   : Materials.material( 'noise',  Vec3( .15 ), Vec3(1,0,0), Vec3(1), 8, Vec3( 0, 1, .5 ))
  })

  return Materials
}

module.exports = __Materials

},{"./sceneNode.js":24,"./utils.js":29,"./var.js":30,"./vec.js":31,"glslify":178}],17:[function(require,module,exports){
const MP   = require( '@bandaloo/merge-pass' )

const FX = {
  merger:null,
  chain: [],
  MP,
  clear() {
    this.deleteMerger()  
    this.chain.length = 0
  },

  deleteMerger() {
    if( this.merger !== null ) {
       this.merger.delete()
       this.merger = null
    }
  },

  init( colorTexture, depthTexture, gl ) {
    this.merger = new MP.Merger( 
      this.chain,
      colorTexture, 
      gl, 
      // pass null to create second scratch channel
      // this is the samplerNum for arguments
      { channels: [ depthTexture, null, null ] }
    )
  }, 

  run( time ) {
    merger.draw( time )
  },

  post( ...fx ) {
    //FX.chain = fx.map( v => v.__wrapped__ )
    FX.chain.length = 0

    fx.forEach( v => {
      if( Array.isArray( v.__wrapped__ ) ) {
        v.__wrapped__.forEach( w => FX.chain.push( w ) )
      }else{
        FX.chain.push( v.__wrapped__ )
      }
    })
  },

  export( obj ) {
    obj.Antialias  = FX.Antialias
    obj.Blur       = FX.Blur
    obj.Bloom      = FX.Bloom
    obj.BloomOld   = FX.BloomOld
    obj.Brightness = FX.Brightness
    obj.Contrast   = FX.Contrast
    obj.Edge       = FX.Edge
    obj.Focus      = FX.Focus
    obj.Glow       = FX.Glow
    obj.Godrays    = FX.Godrays
    obj.Hue        = FX.Hue
    obj.Invert     = FX.Invert
    obj.MotionBlur = FX.MotionBlur
  },

  wrapProperty( obj, name, __value, transform=null ) {
    __value = transform === null ? __value : transform( __value )
    const primitive = MP.float( MP.mut( __value ) )
    
    let value = __value 
    Object.defineProperty( obj, name, {
      get() { return value },
      set(v) {
        value = transform === null ? v : transform( v )
        primitive.setVal( value )
      }
    })

    return primitive
  },

  Bloom( __threshold=0, __boost = .5, __horizontal=1, __vertical=1, taps = 9, reps = 3, num=1 ) {
    const fx = {},
          threshold  = FX.wrapProperty( fx, 'threshold',  __threshold ),
          horizontal = FX.wrapProperty( fx, 'vertical',  __vertical ),
          vertical   = FX.wrapProperty( fx, 'horizontal',  __horizontal ),
          boost      = FX.wrapProperty( fx, 'amount', __boost ) 

    fx.__wrapped__ = MP.bloom( threshold, horizontal, vertical, boost, num, taps, reps ) 

    return fx
  },

  BloomOld( __threshold=0, __boost=.5 ) {
    const fx = {},
          threshold  = FX.wrapProperty( fx, 'threshold',  __threshold ),
          boost      = FX.wrapProperty( fx, 'amount', __boost ) 

    fx.__wrapped__ = MP.bloom( threshold, boost ) 

    return fx
  },

  Blur( amount=3, reps=2, taps=5 ) {
    const fx = {}

    const __amount = FX.wrapProperty( fx, 'amount', amount )
    fx.__wrapped__ = MP.blur2d( __amount, __amount, reps, taps )

    return fx 
  },

  Brightness( __amount=.25 ) {
    const fx = {},
          amount = FX.wrapProperty( fx, 'amount', __amount )

    fx.__wrapped__ = MP.brightness( amount )

    return fx
  },

  Contrast( __amount=.5 ) {
    const fx = {},
          amount = FX.wrapProperty( fx, 'amount', __amount )

    fx.__wrapped__ = MP.contrast( amount )

    return fx
  },

  Edge( mode=0, color=1 ) {
    const fx = {}

    switch( mode ) {
      case 0: fx.__wrapped__ = MP.sobel(); break;
      case 1: fx.__wrapped__ = MP.edge( color,0 ); break;
      case 2: fx.__wrapped__ = MP.edgecolor( MP.vec4(...color) ); break;
    }

    return fx 
  },

  Focus( __depth=0, __radius=.01 ) {
    const fx = {},
          depth  = FX.wrapProperty( fx, 'depth',  __depth, v => 1 - v ),
          radius = FX.wrapProperty( fx, 'radius', __radius ) 

    fx.__wrapped__ = MP.dof( depth, radius ) 

    return fx
  },

  Glow( __contrast=1.2, __brightness = .15, __blur=1, __adjust=-.5, loops=5 ) {
    const fx = {},
          contrast   = FX.wrapProperty( fx, 'contrast', __contrast ),
          brightness = FX.wrapProperty( fx, 'brightness', __brightness ),
          blur       = FX.wrapProperty( fx, 'blur', __blur ),
          adjust     = FX.wrapProperty( fx, 'adjust', __adjust )

    fx.__wrapped__ = [  
      MP.loop([
        MP.gauss(MP.vec2(blur, 0)),
        MP.gauss(MP.vec2(0, blur)),
        MP.brightness( brightness ),
        MP.contrast( contrast),
      ], loops ),
      MP.brightness( adjust ),
      MP.setcolor( MP.op( MP.fcolor(), "+", MP.input() ) )
    ]

    return fx
  },


  Godrays( __decay=1, __weight=.01, __density=1, __threshold=.9, __newColor=[.5,.15,0,1] ) {
    const fx = {},
          decay   = FX.wrapProperty( fx, 'decay',   __decay   ),
          weight  = FX.wrapProperty( fx, 'weight',  __weight  ),
          density = FX.wrapProperty( fx, 'density', __density ),
          threshold = FX.wrapProperty( fx, 'threshold', __threshold, v => 1 - v )

    const newColor = MP.mut( MP.pvec4( ...__newColor ) )
    
    let value = __newColor 
    Object.defineProperty( fx, 'color', {
      get() { return value },
      set(v) {
        value = Array.isArray(v) ? v : [v,v,v,v]
        fx.__wrapped__.setNewColor( MP.pvec4( ...value ) )
      }
    })


    fx.__wrapped__ = MP.godrays({ 
      decay, weight, density,

      convertDepth: {                 
        threshold,                 
        newColor
      }
    })

    return fx
  },

  Hue( __shift=.5, __threshold = .99 )  {
    const fx = {},
          frag = MP.fcolor(), 
          depth = MP.channel(0),
          threshold = FX.wrapProperty( fx, 'threshold', __threshold, v => 1 - v ),
          shift= FX.wrapProperty( fx, 'shift', __shift )

    let control
    fx.__wrapped__ = MP.hsv2rgb( 
      MP.changecomp(
        MP.rgb2hsv( MP.fcolor() ),
        MP.cfloat( MP.tag `length(${depth}.rgb) >= ${threshold} ? ${shift} : 0.`  ),
        "r", 
        "+"
      )
    )

    return fx
  },

  Invert( __threshold = .99 )  {
    const fx = {},
          frag = MP.fcolor(), 
          depth = MP.channel(0),
          threshold = FX.wrapProperty( fx, 'threshold', __threshold, v => 1 - v )

    fx.__wrapped__ = MP.cvec4( MP.tag `length(${depth}.rgb) >= ${threshold} ? (1. - vec4(${frag}.rgb, 0.)) : ${frag}`  )
     

    return fx
  },

  MotionBlur( __amount = .7) {
    const fx = {},
          amount = FX.wrapProperty( fx, 'amount', __amount, v => 1-v )

    // 1 is the sampler for blur, and 2 is for motionbblur
    fx.__wrapped__ = MP.motionblur( 2, amount ) 

    return fx
  },

  Antialias( mult=1 ) {
    return { __wrapped__: MP.loop([ MP.fxaa() ], mult ) }
  },

}

module.exports = FX

},{"@bandaloo/merge-pass":84}],18:[function(require,module,exports){
const glsl = require( 'glslify' )
const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen } = require( './var.js' )

const getNoise = function( SDF ) {
Noise = function( strength=.25, bias=1, timeMod=1 ) {
  const op = Object.create( Noise.prototype )
  op.type = 'string'
  op.isGen = true

  const defaultValues = [.5,.5,.5]

  op.matId = MaterialID.alloc()

  const __strength = param_wrap( strength, float_var_gen( strength ) )
  const __timeMod  = param_wrap( timeMod, float_var_gen( timeMod ) )

  Object.defineProperty( op, 'strength', {
    get() { return __strength },
    set(v) {
     __strength.var.set( v )
    }
  })
  Object.defineProperty( op, 'timeMod', {
    get() { return __timeMod },
    set(v) {
     __timeMod.var.set( v )
    }
  })
  const __bias  = param_wrap( bias, float_var_gen( bias ) )

  Object.defineProperty( op, 'bias', {
    get() { return __bias},
    set(v) {
     __bias.var.set( v )
    }
  })
  return op
} 

Noise.prototype = SceneNode()

Noise.prototype.emit = function ( __name ) {
  let name = __name === undefined ? 'p' : __name

  const out = `(${this.bias.emit()} + snoise( vec4( p.xyz, time * ${this.timeMod.emit()} )) * ${this.strength.emit()})`  

  const output = {
    out,
    preface:''
  }

  return output
}
Noise.prototype.glsl = glsl(["#define GLSLIFY 1\n    //\n// Description : Array and textureless GLSL 2D/3D/4D simplex\n//               noise functions.\n//      Author : Ian McEwan, Ashima Arts.\n//  Maintainer : ijm\n//     Lastmod : 20110822 (ijm)\n//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.\n//               Distributed under the MIT License. See LICENSE file.\n//               https://github.com/ashima/webgl-noise\n//\n\nvec4 mod289(vec4 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0; }\n\nfloat mod289(float x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0; }\n\nvec4 permute(vec4 x) {\n     return mod289(((x*34.0)+1.0)*x);\n}\n\nfloat permute(float x) {\n     return mod289(((x*34.0)+1.0)*x);\n}\n\nvec4 taylorInvSqrt(vec4 r)\n{\n  return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nfloat taylorInvSqrt(float r)\n{\n  return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nvec4 grad4(float j, vec4 ip)\n  {\n  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);\n  vec4 p,s;\n\n  p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;\n  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);\n  s = vec4(lessThan(p, vec4(0.0)));\n  p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;\n\n  return p;\n  }\n\n// (sqrt(5) - 1)/4 = F4, used once below\n#define F4 0.309016994374947451\n\nfloat snoise(vec4 v)\n  {\n  const vec4  C = vec4( 0.138196601125011,  // (5 - sqrt(5))/20  G4\n                        0.276393202250021,  // 2 * G4\n                        0.414589803375032,  // 3 * G4\n                       -0.447213595499958); // -1 + 4 * G4\n\n// First corner\n  vec4 i  = floor(v + dot(v, vec4(F4)) );\n  vec4 x0 = v -   i + dot(i, C.xxxx);\n\n// Other corners\n\n// Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)\n  vec4 i0;\n  vec3 isX = step( x0.yzw, x0.xxx );\n  vec3 isYZ = step( x0.zww, x0.yyz );\n//  i0.x = dot( isX, vec3( 1.0 ) );\n  i0.x = isX.x + isX.y + isX.z;\n  i0.yzw = 1.0 - isX;\n//  i0.y += dot( isYZ.xy, vec2( 1.0 ) );\n  i0.y += isYZ.x + isYZ.y;\n  i0.zw += 1.0 - isYZ.xy;\n  i0.z += isYZ.z;\n  i0.w += 1.0 - isYZ.z;\n\n  // i0 now contains the unique values 0,1,2,3 in each channel\n  vec4 i3 = clamp( i0, 0.0, 1.0 );\n  vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );\n  vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );\n\n  //  x0 = x0 - 0.0 + 0.0 * C.xxxx\n  //  x1 = x0 - i1  + 1.0 * C.xxxx\n  //  x2 = x0 - i2  + 2.0 * C.xxxx\n  //  x3 = x0 - i3  + 3.0 * C.xxxx\n  //  x4 = x0 - 1.0 + 4.0 * C.xxxx\n  vec4 x1 = x0 - i1 + C.xxxx;\n  vec4 x2 = x0 - i2 + C.yyyy;\n  vec4 x3 = x0 - i3 + C.zzzz;\n  vec4 x4 = x0 + C.wwww;\n\n// Permutations\n  i = mod289(i);\n  float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);\n  vec4 j1 = permute( permute( permute( permute (\n             i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))\n           + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))\n           + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))\n           + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));\n\n// Gradients: 7x7x6 points over a cube, mapped onto a 4-cross polytope\n// 7*7*6 = 294, which is close to the ring size 17*17 = 289.\n  vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;\n\n  vec4 p0 = grad4(j0,   ip);\n  vec4 p1 = grad4(j1.x, ip);\n  vec4 p2 = grad4(j1.y, ip);\n  vec4 p3 = grad4(j1.z, ip);\n  vec4 p4 = grad4(j1.w, ip);\n\n// Normalise gradients\n  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\n  p0 *= norm.x;\n  p1 *= norm.y;\n  p2 *= norm.z;\n  p3 *= norm.w;\n  p4 *= taylorInvSqrt(dot(p4,p4));\n\n// Mix contributions from the five corners\n  vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);\n  vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);\n  m0 = m0 * m0;\n  m1 = m1 * m1;\n  return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))\n               + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;\n\n  }\n\n"])

Noise.prototype.emit_decl = function () {
  let str = this.strength.emit_decl() + this.timeMod.emit_decl() + this.bias.emit_decl()

  if( SDF.memo.noise === undefined ) {
    str = Noise.prototype.glsl + str
    SDF.memo.noise = true
  }

  return str
};

Noise.prototype.update_location = function(gl, program) {
  this.strength.update_location( gl, program )
  this.timeMod.update_location( gl, program )
  this.bias.update_location( gl, program )
}

Noise.prototype.upload_data = function(gl) {
  this.strength.upload_data( gl )
  this.timeMod.upload_data( gl )
  this.bias.upload_data( gl )
}

return Noise

}

module.exports = getNoise 

},{"./sceneNode.js":24,"./utils.js":29,"./var.js":30,"glslify":178}],19:[function(require,module,exports){
const osc = require( 'osc/dist/osc-browser' ),
      { Vec2, Vec3, Vec4 } = require( './vec.js' )

function unpackArg( arg ) {
  if( Array.isArray( arg ) )
    return Vec4( arg.map( a => a.value ) )

  return arg.value
}

const OSC = {
  client: null,

  start( url ) {
    console.log("STARTING", url)
    OSC.client = new osc.WebSocketPort({ url, metadata: true, unpackSingleArgs: true })
    OSC.client.on( 'message', OSC.messageCallback )
    OSC.client.open()
    console.log("STARTING", OSC.client)
  },

  stop() {
    OSC.client.close()
  },

  messageCallback(message) {
    const parts = message.address.split('/')

    let object = window
    for( const part of parts.slice( 1, -1 ) ) {
      object = object[part]

      if( !object ) {
        throw new Error( `can't handle OSC message ${message.address}: no such key '${part}'` )
      }
    }

    const key = parts[parts.length - 1]
    switch( key ) {
      /* methods */
      case 'translate':
      case 'rotate':
      case 'scale':
      case 'fog':
      case 'material':
        object[key].apply( object, message.args.map( unpackArg ) )
        break

      /* variables */
      default: {
        const old = object[key]

        if( !old ) {
          throw new Error( `can't handle OSC message ${message.address}: no such key ${key}` )
        }

        switch( old.type ) {
          case 'int':
          case 'float':
            object[key] = message.args.value
            break

          case 'vec2':
          case 'vec3':
          case 'vec4':
            object[key] = Vec4( message.args.map( a => a.value ) )
            break

          default:
            throw new Error( `can't handle OSC message ${message.address}: type ${old.type}` )
        }
      }
    }
  }
}

module.exports = OSC

},{"./vec.js":31,"osc/dist/osc-browser":190}],20:[function(require,module,exports){
const glsl = require( 'glslify' )

module.exports = {
  Box: {
    parameters:[
      { name:'size', type:'vec3', default:[1,1,1], min:.001, max:5 },
    ],

    primitiveString( pName ) { 
	    return `sdBox( ${pName}, ${this.size.emit()} )`;
    },

    glslify:glsl(["#define GLSLIFY 1\n    float sdBox( vec3 p, vec3 b )\n{\n  vec3 d = abs(p) - b;\n  return min(max(d.x,max(d.y,d.z)),0.0) +\n         length(max(d,0.0));\n}\n\n"])
  }, 

  // XXX we should normalize dimensions in the shader... 
  Cone: {
    parameters:[
      { name:'dimensions', type:'vec3', default:[.8,.6,.3], min:.001, max:5 },
    ],

    primitiveString( pName ) { 
      return `sdCone( ${pName}, ${this.dimensions.emit()} )`
    },
    glslify:glsl(["#define GLSLIFY 1\n    float sdCone( in vec3 p, in vec3 c )\n{\n    vec2 q = vec2( length(p.xz), p.y );\n    float d1 = -p.y-c.z;\n    float d2 = max( dot(q,c.xy), p.y);\n    return length(max(vec2(d1,d2),0.0)) + min(max(d1,d2), 0.);\n}\n\n"])
  }, 

	Cylinder: {
    parameters:[
      { name:'dimensions', type:'vec2', default:[.8,.6], min:.001, max:5 },
    ],

    primitiveString( pName ) { 
      return `sdCappedCylinder( ${pName}, ${this.dimensions.emit()} )`
    },

    glslify:`    float sdCappedCylinder( vec3 p, vec2 h ) {
    vec2 d = abs(vec2(length(p.xz),p.y)) - h;
    return min(max(d.x,d.y),0.0) + length(max(d,0.0));
  }`
  }, 

  Capsule: {	
    parameters:[
      { name:'start', type:'vec3', default:[0,0,0], min:0, max:.5 },
      { name:'end', type:'vec3', default:[.8,1,0], min:.5, max:1 },
      { name:'radius', type:'float', default:.5, min:.001, max:5 },
    ],

    primitiveString( pName ) { 
      return `sdCapsule( ${pName}, ${this.start.emit()}, ${this.end.emit()}, ${this.radius.emit()} )`
    },
    glslify:glsl(["#define GLSLIFY 1\n      float sdCapsule( vec3 p, vec3 a, vec3 b, float r )\n{\n    vec3 pa = p - a, ba = b - a;\n    float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );\n    return length( pa - ba*h ) - r;\n}\n\n"])

  },

  // XXX No cylinder description
  //` #pragma glslify: sdCylinder	= require('glsl-sdf-primitives/sdCylinder')`
 	HexPrism: {
    parameters:[
      { name:'dimensions', type:'vec2', default:[.8,.6], min:.001, max:5 },
    ],

    primitiveString( pName ) { 
      return `sdHexPrism( ${pName}, ${this.dimensions.emit()} )`
    },
    glslify:glsl(["#define GLSLIFY 1\n      float sdHexPrism( vec3 p, vec2 h )\n{\n    vec3 q = abs(p);\n    return max(q.z-h.y,max((q.x*0.866025+q.y*0.5),q.y)-h.x);\n}\n\n"])
  },

  Julia: {
    parameters:[
      { name:'fold', type:'float', default:0, min:0, max:10 },
    ],

    primitiveString( pName ) { 
      return `julia( ${pName}, ${this.fold.emit()} )`
    },

    // https://www.shadertoy.com/view/MsfGRr
    glslify:glsl(["#define GLSLIFY 1\n  vec4 qsqr( in vec4 a ) {\n    return vec4( a.x*a.x - a.y*a.y - a.z*a.z - a.w*a.w,\n                 2.0*a.x*a.y,\n                 2.0*a.x*a.z,\n                 2.0*a.x*a.w );\n  }\n\n  float julia( in vec3 p, float atime ){\n    vec4 c = 0.45*cos( vec4(0.5,3.9,1.4,1.1) + atime * vec4(1.2,1.7,1.3,2.5) ) - vec4(0.3,0.0,0.0,0.0);\n    vec4 z = vec4(p,0.);\n    float md2 = 1.0;\n    float mz2 = dot(z,z);\n\n    for( int i=0; i<11; i++ ){\n      md2 *= 4.0*mz2;   \n      // dz -> 2·z·dz, meaning |dz| -> 2·|z|·|dz| (can take the 4 out of the loop and do an exp2() afterwards)\n      z = qsqr(z) + c;  // z  -> z^2 + c\n\n      mz2 = dot(z,z);\n      if(mz2>4.0) break;\n    }\n    \n    return 0.25*sqrt(mz2/md2)*log(mz2);  // d = 0.5·|z|·log|z| / |dz|\n  }",""]),
  },
  KIFS: {
    parameters:[
      { name:'count', type:'float', default:8 },
      { name:'fold', type:'float', default:0 },
      { name:'radius', type:'float', default:.01 },
      { name:'threshold', type:'float', default:.004 },
      { name:'scale', type:'float', default:2 },
    ],

    primitiveString( pName ) { 
      return `kifs( ${pName}, ${this.count.emit()}, ${this.fold.emit()}, ${this.radius.emit()}, ${this.threshold.emit()}, ${this.scale.emit()} )`
    },

    // adapted from http://roy.red/folding-the-koch-snowflake-.html
    glslify:glsl(["#define GLSLIFY 1\n      float box( vec3 p, vec3 b ){\n      vec3 d = abs(p) - b;\n      return min(max(d.x,max(d.y,d.z)),0.0) +\n             length(max(d,0.0));\n    }\n    vec2 fold(vec2 p, float ang){    \n        vec2 n=vec2(cos(-ang),sin(-ang));\n        p-=2.*min(0.,dot(p,n))*n;\n        return p;\n    }\n    #define KPI 3.14159\n    vec3 tri_fold(vec3 pt, float foldamt) {\n        pt.xy = fold(pt.xy,KPI/3. + foldamt );\n        pt.xy = fold(pt.xy,-KPI/3. + foldamt );\n        pt.yz = fold(pt.yz,KPI/6.+.7 + foldamt );\n        pt.yz = fold(pt.yz,-KPI/6. + foldamt );\n        return pt;\n    }\n    vec3 tri_curve(vec3 pt, float iter, float fold, float scale ) {\n        int count = int(iter);\n        for(int i=0;i<count;i++){\n            pt*=scale;\n            pt.x-=2.6;\n            pt=tri_fold(pt,fold);\n        }\n        return pt;\n    }\n    float kifs(in vec3 p, float a, float fold, float radius, float thresh, float scale ){\n        p.x+=1.5;\n        p=tri_curve(p,a,fold,scale);\n        // uncomment below line to use spheres instead of boxes\n        return (length( p*thresh ) - radius );\n        //return box( p*thresh, vec3(radius) );\n    }\n",""]),
  },

  Mandalay: {
    parameters:[
      { name:'size', type:'float', default:5, min:1, max:10 },
      { name:'minrad', type:'float', default:1/3, min:0, max:1 },    
      { name:'iterations', type:'float', default:5, min:1, max:10, step:1 },    
    ],
    glslify:`                 
  float sr = 4.0;
  vec3 fo =vec3 (0.7,.9528,.9);
  vec3 gh = vec3 (.8,.7,0.5638);
  vec3 gw = vec3 (.3, 0.5 ,.2);
  vec4 X = vec4( .1,0.5,0.1,.3);
  vec4 Y = vec4(.1, 0.8, .1, .1);
  vec4 Z = vec4(.2,0.2,.2,.45902);
  vec4 R = vec4(0.19,.1,.1,.2);
  vec4 orbitTrap = vec4(40000.0);
  float DBFold( vec3 p, float fo, float g, float w ){
      if(p.z>p.y) p.yz=p.zy;
      float vx=p.x-2.*fo;
      float vy=p.y-4.*fo;
      float v=max(abs(vx+fo)-fo,vy);
      float v1=max(vx-g,p.y-w);
      v=min(v,v1);
      v1=max(v1,-abs(p.x));
      return min(v,p.x);
  }
   
  vec3 DBFoldParallel(vec3 p, vec3 fo, vec3 g, vec3 w){
    vec3 p1=p;
    p.x=DBFold(p1,fo.x,g.x,w.x);
    p.y=DBFold(p1.yzx,fo.y,g.y,w.y);
    p.z=DBFold(p1.zxy,fo.z,g.z,w.z);
    return p;
  }

  vec3 DBFoldSerial(vec3 p, vec3 fo, vec3 g,vec3 w){
    p.x=DBFold(p,fo.x,g.x,w.x);
    p.y=DBFold(p.yzx,fo.y,g.y,w.y);
    p.z=DBFold(p.zxy,fo.z,g.z,w.z);
    return p;
  }
  float sineSponge(vec3 p, float scale, float minrad, float iterations ) {
    vec4 JC=vec4(p,1.);
    float r2=dot(p,p);
    float dd = 1.;
    for(int i = 0; i<int(iterations); i++){
      p = p - clamp(p.xyz, -1.0, 1.0) * 2.0;  // mandelbox's box fold
   
      vec3 signs=sign(p);//Save 	the original signs
      p=abs(p);
      p=DBFoldParallel(p,fo,gh,gw);
      
      p*=signs;//resore signs: this way the mandelbrot set won't extend in negative directions
      

      r2=dot(p,p);
      float  t = clamp(1./r2, 1., 1./minrad);
      p*=t; dd*=t;
       

      p=p*scale+JC.xyz; dd=dd*scale+JC.w;
      p=vec3(1.0,1.0,.92)*p;
   
      r2=dot(p,p);
      orbitTrap = min(orbitTrap, abs(vec4(p.x,p.y,p.z,r2)));	
    }
    dd=abs(dd);
      #if 0
        return (sqrt(r2)-sr)/dd;//bounding volume is a sphere
      #else
        p=abs(p); return (max(p.x,max(p.y,p.z))-sr)/dd;//bounding volume is a cube
      #endif
    }
    `,
   
    primitiveString( pName ) { 
      return `sineSponge( ${pName}, ${this.size.emit()}, ${this.minrad.emit()}, ${this.iterations.emit()} )`
    }
  },  
  Mandelbulb: {
    parameters:[
      { name:'fold', type:'float', default:8, min:1, max:15 },
      { name:'iterations', type:'float', default:4, min:1, max:6, step:1 },    
    ],

    primitiveString( pName ) { 
      return `mandelbulb( ${pName}, ${this.fold.emit()}, ${this.iterations.emit()} )`
    },

    // adapted from: https://www.shadertoy.com/view/ltfSWn
    glslify:glsl(["#define GLSLIFY 1\n      float mandelbulb( in vec3 p, in float aa, float iterations ){\n        vec3 w = p;\n        float m = dot(w,w);\n\n        vec4 trap = vec4(abs(w),m);\n        float dz = 1.0;\n                \n        for( int i=0; i<int(iterations); i++ ) {\n          dz = aa*pow(sqrt(m),aa - 1.)*dz + 1.0;\n\n          float r = length(w);\n          float b = aa*acos( w.y /r);\n          float a = aa*atan( w.x, w.z );\n          w = p + pow(r,aa) * vec3( sin(b)*sin(a), cos(b), sin(b)*cos(a) );\n\n          trap = min( trap, vec4(abs(w),m) );\n\n          m = dot(w,w);\n          if( m > 256.0 ) {\n            break;\n          }\n        }\n\n        return 0.25*log(m)*sqrt(m)/dz;\n      }\n    ",""]),
  },

  // adapted from https://www.shadertoy.com/view/llGXDR
  Mandelbox: {
    parameters:[
      { name:'fold', type:'float', default:.1 },
      { name:'size', type:'float', default:3., min:1, max:10 },
      { name:'iterations', type:'float', default:5, min:1, max:10, step:1 },
    ],

    glslify:`float mandelbox( float MR2, float SCALE, float ITER, vec3 position ){
      vec4 scalevec = vec4(SCALE, SCALE, SCALE, abs(SCALE)) / MR2;
      float C1 = abs(SCALE-1.0), C2 = pow(abs(SCALE), 1.-ITER); // 10 is ITERS
      vec4 p = vec4(position.xyz, 1.0), p0 = vec4(position.xyz, 1.0);  // p.w is knighty's DEfactor
      for (int i=0; i<int(ITER); i++) {
        p.xyz = clamp(p.xyz, -1.0, 1.0) * 2.0 - p.xyz;  // box fold: min3, max3gg, mad3
        float r2 = dot(p.xyz, p.xyz);  // dp3
        p.xyzw *= clamp(max(MR2/r2, MR2), 0.0, 1.0);  // sphere fold: div1, max1.sat, mul4
        p.xyzw = p*scalevec + p0;  // mad4
      }
      return (length(p.xyz) - C1) / p.w - C2;
  }`,

    primitiveString( pName ) {
      return `mandelbox( ${this.fold.emit()}, ${this.size.emit()}, ${this.iterations.emit()}, ${pName} )`
    }
  },

	Octahedron: {
    parameters:[
      { name:'radius', type:'float', default:1, min:0, max:4 },
    ],

    primitiveString( pName ) { 
      return `sdOctahedron( ${pName}, ${this.radius.emit()} )`
    },

    glslify:`    float sdOctahedron(vec3 p, float h) {
    p.y = p.y + h; // center vertically... is it centered on the z-axis?
    vec2 d = .5*(abs(p.xz)+p.y) - min(h,p.y);
    return length(max(d,0.)) + min(max(d.x,d.y), 0.);
  }`
  }, 

 	Plane: {
    parameters:[
      { name:'normal', type:'vec3', default:[0,1,0], min:0, max:1 },
      { name:'distance', type:'float', default:1, min:0, max:5 },
    ],

    primitiveString( pName ) { 
      return `sdPlane( ${pName}, vec4( ${this.normal.emit()}, ${this.distance.emit()} ))`
    },
    
    glslify:glsl(["#define GLSLIFY 1\nfloat sdPlane( vec3 p, vec4 n )\n{\n  // n must be normalized\n  return dot(p,n.xyz) + n.w;\n}\n\n"])
    
  },  
 	Quad: {
    parameters:[
      { name:'v1', type:'vec3', default:[-.5,-.5,0] },
      { name:'v2', type:'vec3', default:[.5,-.5,0] },
      { name:'v3', type:'vec3', default:[.5,.5,0] },
      { name:'v4', type:'vec3', default:[-.5,.5,0] },
    ],

    primitiveString( pName ) { 
      return `udQuad( ${pName}, ${this.v1.emit()}, ${this.v2.emit()}, ${this.v3.emit()}, ${this.v4.emit()} )`
    },
    glslify:glsl(["#define GLSLIFY 1\n    float dot2( in vec3 v ) { return dot(v,v); }\nfloat udQuad( vec3 p, vec3 a, vec3 b, vec3 c, vec3 d )\n{\n    vec3 ba = b - a; vec3 pa = p - a;\n    vec3 cb = c - b; vec3 pb = p - b;\n    vec3 dc = d - c; vec3 pc = p - c;\n    vec3 ad = a - d; vec3 pd = p - d;\n    vec3 nor = cross( ba, ad );\n\n    return sqrt(\n    (sign(dot(cross(ba,nor),pa)) +\n     sign(dot(cross(cb,nor),pb)) +\n     sign(dot(cross(dc,nor),pc)) +\n     sign(dot(cross(ad,nor),pd))<3.0)\n     ?\n     min( min( min(\n     dot2(ba*clamp(dot(ba,pa)/dot2(ba),0.0,1.0)-pa),\n     dot2(cb*clamp(dot(cb,pb)/dot2(cb),0.0,1.0)-pb) ),\n     dot2(dc*clamp(dot(dc,pc)/dot2(dc),0.0,1.0)-pc) ),\n     dot2(ad*clamp(dot(ad,pd)/dot2(ad),0.0,1.0)-pd) )\n     :\n     dot(nor,pa)*dot(nor,pa)/dot2(nor) );\n}\n\n"])
  }, 

  RoundBox: {
    parameters:[
      { name:'size', type:'vec3', default:[1,1,1], min:0, max:3 },
      { name:'radius', type:'float', default:1, min:0, max:3 },
    ],

    primitiveString( pName ) { 
      return `udRoundBox( ${pName}, ${this.size.emit()},  ${this.radius.emit()} )`
    }, 
    glslify:glsl(["#define GLSLIFY 1\n    float udRoundBox( vec3 p, vec3 b, float r )\n{\n  return length(max(abs(p)-b,0.0))-r;\n}\n\n"])
  }, 
  Sphere:{
    parameters:[
      { name:'radius', type:'float', default:1, min:0, max:3 },
    ],

    primitiveString( pName ) { 
      return `(length(${pName}) - ${this.radius.emit()})`
    },
    glslify:glsl(["#define GLSLIFY 1\n    float sdSphere( vec3 p, float s )\n{\n  return length( p ) - s;\n}\n\n"])
  },
  // phi, m, n1, n2, n3, a, b
  SuperFormula:{
    parameters:[
      { name:'m_1', type:'float',  default:1, min:-Math.PI*4, max:Math.PI*4 },
      { name:'n1_1', type:'float', default:1, min:-Math.PI*4, max:Math.PI*4 },
      { name:'n2_1', type:'float', default:1, min:-Math.PI*4, max:Math.PI*4 },
      { name:'n3_1', type:'float', default:1, min:-Math.PI*4, max:Math.PI*4 },
      { name:'a_1', type:'float',  default:1, min:-Math.PI*4, max:Math.PI*4 },
      { name:'b_1', type:'float',  default:1, min:-Math.PI*4, max:Math.PI*4 },
      { name:'m_2', type:'float',  default:1, min:-Math.PI*4, max:Math.PI*4 },
      { name:'n1_2', type:'float', default:1, min:-Math.PI*4, max:Math.PI*4 },
      { name:'n2_2', type:'float', default:1, min:-Math.PI*4, max:Math.PI*4 },
      { name:'n3_2', type:'float', default:1, min:-Math.PI*4, max:Math.PI*4 },
      { name:'a_2', type:'float',  default:1, min:-Math.PI*4, max:Math.PI*4 },
      { name:'b_2', type:'float',  default:1, min:-Math.PI*4, max:Math.PI*4 },
    ],

    primitiveString( pName ) { 
      return `superformula( ${pName}, ${this.m_1.emit()}, ${this.n1_1.emit()},${this.n2_1.emit()},${this.n3_1.emit()},${this.a_1.emit()},${this.b_1.emit()}, ${this.m_2.emit()}, ${this.n1_2.emit()},${this.n2_2.emit()},${this.n3_2.emit()},${this.a_2.emit()},${this.b_2.emit()} )`
    },
    glslify:glsl(["#define GLSLIFY 1\n    float SuperFormula( float phi, float m, float n1, float n2, float n3, float a, float b ){\n\t\n\tfloat t1 = abs((1.0 / a) * cos(m * phi / 4.0));\n\tt1 = pow(t1, n2);\n\n\tfloat t2 = abs((a / b) * sin(m * phi / 4.0));\n\tt2 = pow(t2, n3);\n\n\tfloat t3 = t1 + t2;\n\n\tfloat r = pow(t3, -1.0 / n1);\n\n\treturn r;\n}\n\n float superformula( vec3 p, float m_1, float n1_1, float n2_1, float n3_1, float a_1, float b_1, float m_2, float n1_2, float n2_2, float n3_2, float a_2, float b_2 ) {\n    float d = length( p );\n    float theta = atan(p.y, p.x);\n    float phi = d == 0. ? 0. : asin(p.z / d);\n    float r1 = SuperFormula( theta, m_1, n1_1, n2_1, n3_1, a_1, b_1 );\n    float r2 = SuperFormula( phi, m_2, n1_2, n2_2, n3_2, a_2, b_2 );\n    vec3 q = r2 * vec3(r1 * cos(theta) * cos(phi), r1 * sin(theta) * cos(phi), sin(phi));\n    d = d - length(q);\n\n    return d;\n  }    \n",""]) },
 
  Torus:{
    parameters:[
      { name:'radii',  type:'vec2', default:[.5,.1], min:0, max:3 },
    ],

    primitiveString( pname ) { 
      return `sdTorus( ${pname}, ${this.radii.emit()} )`
    },
    glslify:glsl(["#define GLSLIFY 1\n    float sdTorus( vec3 p, vec2 t )\n{\n  vec2 q = vec2(length(p.xz)-t.x,p.y);\n  return length(q)-t.y;\n}\n\n"])

  },  
  Torus88:{
    parameters:[
      { name:'radii',  type:'vec2', default:[.5,.1], min:0, max:3 },
    ],

    primitiveString( pname ) { 
      return `sdTorus88( ${pname}, ${this.radii.emit()} )`
    },
    glslify:`float sdTorus88( vec3 p, vec2 t ) {
        vec2 q = vec2( length8( p.xz ) - t.x, p.y );
        return length8( q ) - t.y;
      }\n`,
  },
  Torus82:{
    parameters:[
      { name:'radii',  type:'vec2', default:[.5,.1], min:0, max:3 },
    ],

    primitiveString( pname ) { 
      return `sdTorus82( ${pname}, ${this.radii.emit()} )`
    },
    glslify:`float sdTorus82( vec3 p, vec2 t ) {
        vec2 q = vec2( length( p.xz ) - t.x, p.y );
        return length8( q ) - t.y;
      }\n`
  },
  
	Triangle: {
    parameters:[
      { name:'v1', type:'vec3', default:[0,-.5,0] },
      { name:'v2', type:'vec3', default:[-.5,.0,0] },
      { name:'v3', type:'vec3', default:[.5,.0,0] },
    ],

    primitiveString( pname ) { 
      return `udTriangle( ${pname}, ${this.v1.emit()}, ${this.v2.emit()}, ${this.v3.emit()} )`
    },
    glslify:glsl(["#define GLSLIFY 1\n    float dot2( in vec3 v ) { return dot(v,v); }\nfloat udTriangle( vec3 p, vec3 a, vec3 b, vec3 c )\n{\n    vec3 ba = b - a; vec3 pa = p - a;\n    vec3 cb = c - b; vec3 pb = p - b;\n    vec3 ac = a - c; vec3 pc = p - c;\n    vec3 nor = cross( ba, ac );\n\n    return sqrt(\n    (sign(dot(cross(ba,nor),pa)) +\n     sign(dot(cross(cb,nor),pb)) +\n     sign(dot(cross(ac,nor),pc))<2.0)\n     ?\n     min( min(\n     dot2(ba*clamp(dot(ba,pa)/dot2(ba),0.0,1.0)-pa),\n     dot2(cb*clamp(dot(cb,pb)/dot2(cb),0.0,1.0)-pb) ),\n     dot2(ac*clamp(dot(ac,pc)/dot2(ac),0.0,1.0)-pc) )\n     :\n     dot(nor,pa)*dot(nor,pa)/dot2(nor) );\n}\n\n"])
  }, 

  TriPrism: {
    parameters:[
      { name:'dimensions', type:'vec2', default:[.5,.5], min:0, max:3 },
    ],

    primitiveString( pName ) { 
      return `sdTriPrism( ${pName}, ${this.dimensions.emit()})`
    },
    glslify:glsl(["#define GLSLIFY 1\n      float sdTriPrism( vec3 p, vec2 h )\n{\n    vec3 q = abs(p);\n    return max(q.z-h.y,max(q.x*0.866025+p.y*0.5,-p.y)-h.x*0.5);\n}\n\n"])

  },

}

},{"glslify":178}],21:[function(require,module,exports){
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc }  = require( './var.js' )
const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID, processVec3, processVec2 } = require( './utils.js' )
const { Vec2, Vec3, Vec4 } = require( './vec.js' )
const Transform = require( './transform.js' )

const createPrimitives = function( SDF ) {

  const gens = { 
    int:   int_var_gen,
    float: float_var_gen,
    vec2: vec2_var_gen,
    vec3: vec3_var_gen,
    vec4: vec4_var_gen,
  }

  const vars = { 
    vec2: Vec2,
    vec3: Vec3,
    vec4: Vec4
  }

  // load descriptions of all primtives
  const descriptions = require( './primitiveDescriptions.js' )

  const Primitives = { 
    descriptions,

    textureMemo: [],

    emit_geometries() {
      const head = Array.isArray( SDF.__scene.__prerender ) ? SDF.__scene.__prerender[0] : SDF.__scene.__prerender
      const geos = Primitives.crawlNode( head, [] )

      geos.forEach( (geo,i) => {
        geo.__sdfID = i 
        if( geo.__textureObj !== undefined ) {
          SDF.textures.addTexture( geo.__textureObj )
        }
      })

      const length = geos.length
      const materials = SDF.materials.materials

      let decl = `SDF sdfs[${length}] = SDF[${length}](\n`
      geos.forEach( (geo, i) => {
        const textureID = geo.__textureObj === undefined ? 50000 : geo.__textureObj.id
        const hasRepeat = geo.repeat !== null && geo.repeat !== undefined
        decl += `        SDF( ${materials.indexOf( geo.__material )}, ${geo.transform.varName}, ${textureID}, ${hasRepeat ? geo.repeat.distance.emit() : 'vec3(0.)'}, ${hasRepeat ? geo.repeat.transform.emit() : `mat4(1.)`} )`
        if( i < geos.length - 1 ) decl += ','
        decl += '\n'
      })

      decl += `      );\n`

      this.geometries = geos

      return decl
    },

    crawlNode( node, arr ) {
      if( node.type === 'geometry' ) {
        arr.push( node )
      }else{
        if( node.a !== undefined ) Primitives.crawlNode( node.a, arr )
        if( node.b !== undefined ) Primitives.crawlNode( node.b, arr )
        if( node.sdf !== undefined ) Primitives.crawlNode( node.sdf, arr )
      }

      return arr
    }
  }

  const createPrimitive = function( name, desc ) {

    const params = desc.parameters
    // create constructor
    Primitives[ name ] = function( ...args ) {
      const p = Object.create( Primitives[ name ].prototype )
      p.params = params
      p.transform = Transform()
      p.transform.shouldInvert = true
      p.type = 'geometry'
      p.name = name
      p.repeat = null//Var( vars.vec3( 0 ), null, 'vec3' )

      p.__material = null
      p.__textureID  = 500000
      
      let count = 0

      // wrap each param in a Var object for codegen
      for( let param of params ) {
        if( param.name === 'color' ) {
          p.color = args[ count ] === undefined ? param.default : args[ count++ ]
          continue
        }
        // setup to enable passing functions 
        // to set values
        if( typeof args[count] === 'function' ) {
          const func = args[ count ]
          Marching.postrendercallbacks.push( t => {
            p[ param.name ] = func( t ) 
          })

          // set initial value with t=0
          args[ count ] = func( 0 )
        }
        if( param.type === 'obj' ) {
          let __value = args[ count++ ]
          p[ param.name ] = {
            get value() { return __value },
            set value(v){ __value = v },
            emit() {
              const output =  p[ param.name ].value.emit()
              return output
            },
            emit_decl() {
              return p[ param.name ].value.a.emit_decl() + p[param.name].value.b.emit_decl()
            }
          }
          continue
        }
        const defaultValues = param.default
        const isArray = Array.isArray( defaultValues )

        if( isArray ) {
          let val = args[ count++ ], __var

          if( typeof val === 'number' ) {
            __var = Var( vars[ param.type ]( val ), null, 'vec3' )
          }else{
            __var =  param_wrap(
              val,
              gens[ param.type ]( ...defaultValues ) 
            )
          }

          // for assigning entire new vectors to property
          Object.defineProperty( p, param.name, {
            configurable:true,
            get() { return __var },
            set(v) {
              if( typeof v === 'object' ) {
                __var.set( v )
              }else{
                __var.value.x = v
                __var.value.y = v
                __var.value.z = v
                __var.value.w = v
                __var.dirty = true
              }
            }
          })

        }else{
          // a bit of santization...
          if( Array.isArray( args[ count ] ) ) {
            args[ count ] = defaultValues.length === 3 
              ? processVec3( args[ count ] )
              : processVec2( args[ count ] )
          }
          let __var  = param_wrap( 
            args[ count++ ], 
            gens[ param.type ]( defaultValues ) 
          )

          //__var.set( defaultValues )
          Object.defineProperty( p, param.name, {
            configurable:true,
            get() { return __var },
            set(v) {
              __var.set( v )
            }
          })
        }
      }

      p.id = VarAlloc.alloc()

      p.__desc = desc
      p.__setMaterial = function(mat) {
        if( typeof mat === 'string' ) mat = SDF.Material[ mat ]
        this.__material = this.mat = SDF.materials.addMaterial( mat )
      }

      p.__setTexture = function(tex,props) {
        if( typeof tex === 'string' ) {
          this.texture = p.texture.bind( this )
          this.__textureObj = this.tex = SDF.Texture( tex,props,this.texture )
          this.__textureID = this.__textureObj.id
        }else{
          this.__textureObj = this.tex = Object.assign( tex, props )
          this.__textureID = this.__textureObj.id
        }
      }
      p.__setBump = function(tex,props) {
        //this.bump = p.bump.bind( this )
        const b = this.bump = this.__bumpObj = SDF.Bump( this, tex, props )
        this.bump.texture = this.bump.amount.value
        this.__bumpID = this.__bumpObj.id
        this.rotate = this.bump.rotate
        this.translate = this.bump.translate
        this.scale = this.bump.scale
        Object.defineProperty( this.bump, 'strength', {
          get() { return b.size },
          set(v){ b.size = v }
        })
      }

      Object.assign( p, {
        renderingBump : false,
        emittingDecl  : false,
        uploading     : false,
        updating      : false
      })

      if( p.__material === null ) p.__setMaterial()

      SDF.geometries.push( p )

      return p
    }

    // define prototype to use
    Primitives[ name ].prototype = SceneNode()
    Primitives[ name ].prototype.type = 'geometry'
    
    // create codegen string


    Primitives[ name ].prototype.emit = function ( __name, transform = null, bump=null, scale=null ) {
      if( SDF.memo[ this.id ] !== undefined ) return { preface:'', out:name+this.matId }
      if( this.__bumpObj !== undefined && this.renderingBump === false) {
        this.renderingBump = true
        return this.__bumpObj.emit( __name, transform )
      }
      
      const shaderCode = desc.glslify.indexOf('#') > -1 
        ? desc.glslify.slice(18) 
        : desc.glslify

      if( SDF.requiredGeometries.indexOf( shaderCode ) === - 1 ) {
        SDF.requiredGeometries.push( shaderCode )
      } 

      if( transform !== null ) this.transform.apply( transform, false )
      //this.transform.invert( true )
      this.transform.internal()

      const pname = typeof __name !== 'string' ? 'p' : __name,
            id = this.__sdfID,
            s = scale === null ? this.transform.emit_scale() : `${this.transform.emit_scale()} * ${scale}`,
            tstring = `( ${pname} * ${this.transform.emit()} ).xyz`
      
      const primitive = `
        vec2 ${name}${this.id} = vec2( ${desc.primitiveString.call( this, tstring, bump )} * ${s}, ${id}.);
      `
      SDF.memo[ this.id ] = name + this.id

      this.renderingBump = false
      return { preface:primitive, out:name+this.id  }
    }
    
    // declare any uniform variables
    Primitives[ name ].prototype.emit_decl = function() {
      if( this.__bumpObj !== undefined && this.emittingDecl === false) {
        this.emittingDecl = true
        return this.__bumpObj.emit_decl() 
      }
      let decl = ''
      decl += this.transform.emit_decl()

      if( this.__repeat !== undefined ) decl += this.__repeat.emit_decl( false )
      if( this.__polarRepeat !== undefined ) decl += this.__polarRepeat.emit_decl( false )

      for( let param of params ) {
        if( param.name !== 'material' )
          decl += this[ param.name ].emit_decl( )
      }

      this.emittingDecl = false
      return decl
    }

    Primitives[ name ].prototype.update_location = function( gl, program ) {
      if( this.__bumpObj !== undefined && this.updating === false) {
        this.updating = true
        return this.__bumpObj.update_location( gl, program )
      }

      for( let param of params ) {
        if( param.type !== 'obj' ) {
          if( param.name !== 'material' ) 
            this[ param.name ].update_location( gl,program )
        }
      }

      if( this.__repeat !== undefined ) this.__repeat.update_location( gl, program, false )
      if( this.__polarRepeat !== undefined ) this.__polarRepeat.update_location( gl, program, false )
      this.transform.update_location( gl, program )
      this.updating = false
    }

    Primitives[ name ].prototype.upload_data = function( gl ) {
      if( this.__bumpObj !== undefined && this.uploading  === false ) {
        this.uploading = true
        return this.__bumpObj.upload_data( gl )
      }
      for( let param of params ) {
        if( param.type !== 'obj' && param.name !== 'material' )
          this[ param.name ].upload_data( gl )
      }

      if( this.__polarRepeat !== undefined ) this.__polarRepeat.upload_data( gl, false )
      this.transform.upload_data( gl )
      this.uploading = false
    }
    
    return Primitives[ name ]
  }
  
  for( let name in descriptions ) {
    const desc = descriptions[ name ]
    createPrimitive( name, desc )
  }

  Primitives.create = createPrimitive

  return Primitives
}

module.exports = createPrimitives

},{"./primitiveDescriptions.js":20,"./sceneNode.js":24,"./transform.js":28,"./utils.js":29,"./var.js":30,"./vec.js":31}],22:[function(require,module,exports){
const getMainContinuous = function( steps, minDistance, maxDistance, postprocessing, bg='vec4(0.,0.,0.,1.)' ) {
  const out = `
  // adapted from https://www.shadertoy.com/view/ldfSWs
  vec3 calcNormal(vec3 pos, float eps) {
    const vec3 v1 = vec3( 1.0,-1.0,-1.0);
    const vec3 v2 = vec3(-1.0,-1.0, 1.0);
    const vec3 v3 = vec3(-1.0, 1.0,-1.0);
    const vec3 v4 = vec3( 1.0, 1.0, 1.0);

    return normalize( v1 * scene ( pos + v1*eps ).x+
                      v2 * scene ( pos + v2*eps ).x+
                      v3 * scene ( pos + v3*eps ).x+
                      v4 * scene ( pos + v4*eps ).x);
  }

  vec3 calcNormal(vec3 pos) {
    return calcNormal(pos, 0.002);
  }

  // Adapted from from https://www.shadertoy.com/view/ldfSWs
  vec2 calcRayIntersection( vec3 rayOrigin, vec3 rayDir, float maxd, float precis ) {
    float latest = precis * 2.0;
    float dist   = +0.0;
    float type   = -1.0;
    vec2 result;
    vec2 res = vec2(-50000., -1.);;

    for (int i = 0; i < ${steps} ; i++) {
      if (latest < precis || dist > maxd) break;

      result = scene(rayOrigin + rayDir * dist);

      latest = result.x;
      dist  += latest;
    }

    if( dist < maxd ) {
      result.x = dist;
      res = result;
    }

    return res;
  }

  layout(location = 0) out vec4 col;
  layout(location = 1) out vec4 depth;
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 pos = uv * 2.0 - 1.0;

    // not sure why I need the -y axis but without it
    // everything is flipped using perspective-camera
    pos.x *= ( resolution.x / -resolution.y );

    vec4 color = bg;  
    vec3 ro = camera_pos;
    vec3 rd = normalize( mat3(camera) * vec3( pos, 2. ) ); 
    
    vec2 t = calcRayIntersection( ro, rd, ${maxDistance}, ${minDistance} );

    vec3 samplePos = vec3(100.f);
    if( t.x > -0.5 ) {
      samplePos = ro + rd * t.x;
      vec3 nor = calcNormal( samplePos );

      color = vec4( lighting( samplePos, nor, ro, rd, t.y, true ), 1. );
      ${postprocessing}
    }

    
    col = clamp( vec4( color ), 0., 1. );

    float normalizedDepth = t.x / ${maxDistance}; 
    depth = abs(samplePos.z - ro.z ) < ${maxDistance} ? vec4( vec3( 1.-normalizedDepth ), 1. ) : vec4(0.);
  }`

  return out
}

const getMainVoxels = function( steps, postprocessing, voxelSize = .05 ) {
  const out = `
  struct VoxelDistance {
    bvec3 mask;
    vec3  distance;
    float fogCoeff;
    int   id;
  };

  VoxelDistance calcRayIntersection( vec3 rayOrigin, vec3 rayDir ) {
    vec2 result;

    float m = ${voxelSize};
    rayOrigin *= 1./m;
    vec3 mapPos = vec3(floor(rayOrigin));
    vec3 diff = mapPos - rayOrigin;

    vec3 deltaDist = abs(vec3(length(rayDir)) / rayDir);
    vec3 rayStep = vec3(sign(rayDir));
    vec3 sideDist = (sign(rayDir) * diff + (sign(rayDir) * 0.5) + 0.5) * deltaDist; 

    bvec3 mask;
    vec3 d = vec3(-100000.);
    float fogCoeff = 0.;

    for (int i = 0; i < ${Math.round(steps*1/voxelSize)} ; i++) {
      result = scene(mapPos*m);
      if( result.x <= 0. ) {
        d = mapPos*m+result.x;
        break;
      }

      mask = bvec3( lessThanEqual(sideDist.xyz, min(sideDist.yzx, sideDist.zxy)) );
      sideDist += vec3( mask ) * deltaDist; 
      mapPos += vec3(mask) * rayStep;
      fogCoeff += result.x * m;
    }

    VoxelDistance vd = VoxelDistance( mask, d, fogCoeff, int(result.y) );
    return vd;
  }

  layout(location = 0) out vec4 col;
  layout(location = 1) out vec4 depth;
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 pos = uv * 2.0 - 1.0;

    // not sure why I need the -y axis but without it
    // everything is flipped using perspective-camera
    pos.x *= ( resolution.x / -resolution.y );
    
    vec4 color = bg; 
    vec3 ro = camera_pos;
    vec3 rd = normalize( mat3(camera) * vec3( pos, 2. ) ); 
                 
    VoxelDistance vd = calcRayIntersection( ro, rd );
    bvec3 mask = vd.mask;
    
    vec3 nor;
    if (mask.x) {
      color = vec4(vec3(0.5), 1.);
      nor = vec3(1.,0.,0.);
    }
    if (mask.y) {
      color = vec4( vec3(1.0), 1. );
      nor = vec3(0.,1.,0.);
    }
    if (mask.z) {
      color = vec4( vec3(0.75), 1. );
      nor = vec3(0.,0.,1.);
    }
    if( vd.distance.x == -100000. ) {
      color = bg;
    }
    
    float modAmount = ${(1./voxelSize).toFixed(1)};
    bool hit = false;
    vec3 t = vec3( length(vd.distance-ro) );

    if( color != bg ) {
      vec3 pos = vd.distance; 
      color.xyz *= lighting( pos * modAmount, nor, ro, rd, float(vd.id), false ); 
      hit = true;
      ${postprocessing}; 
    }

    col = color;

    float normalizedDepth = length( (vd.distance-ro) * ${voxelSize.toFixed(1)} ); 
    depth = hit == true ? vec4( vec3(1.-normalizedDepth), 1. ) : vec4(0.);
  }`

  return out
}

module.exports = function( variables, scene, preface, geometries, lighting, postprocessing, steps=90, minDistance=.001, maxDistance=20, ops, useVoxels=false, voxelSize=0 ) {

  const main = useVoxels === false
    ? getMainContinuous( steps, minDistance, maxDistance, postprocessing ) 
    : getMainVoxels( steps, postprocessing, voxelSize )

    const fs_source = `     #version 300 es
      precision mediump float;

      float PI = 3.141592653589793;
      
      struct Light {
        vec3 position;
        vec3 color;
        float attenuation;
      };

      int rotationCount = 1;

      mat4 rotations[4] = mat4[4](
        mat4(0.), mat4(0.), mat4(0.), mat4(0.)
      );

      struct Material {
        int  mode;
        vec3 ambient;
        vec3 diffuse;
        vec3 specular;
        float shininess;
        vec3 fresnel;
        int textureID;
      };     

      struct SDF {
        int materialID;
        mat4 transform;
        int textureID;
        vec3 repeat;
        mat4 repeatTransform;
      };

      uniform float time;
      uniform vec2 resolution;
      uniform vec3 camera_pos;
      uniform vec3 camera_normal;
      uniform float camera_rot;
      uniform mat4 camera;

      

      ${variables}

      // must be before geometries!
      float length8( vec2 p ) { 
        return float( pow( pow(p.x,8.)+pow(p.y,8.), 1./8. ) ); 
      }

      vec4 opElongate( in vec3 p, in vec3 h ) {
        //return vec4( p-clamp(p,-h,h), 0.0 ); // faster, but produces zero in the interior elongated box
       
        vec3 q = abs(p)-h;
        return vec4( max(q,0.0), min(max(q.x,max(q.y,q.z)),0.0) );
      }
      ${ops}

      /* GEOMETRIES */
      ${geometries}

      vec2 scene(vec3 p);

      // XXX todo put this in domainOperations.js
      vec3 polarRepeat(vec3 p, float repetitions) {
        float angle = 2.*PI/repetitions;
        float a = atan(p.z, p.x) + angle/2.;
        float r = length(p.xz);
        float c = floor(a/angle);
        a = mod(a,angle) - angle/2.;
        vec3 _p = vec3( cos(a) * r, p.y,  sin(a) * r );
        // For an odd number of repetitions, fix cell index of the cell in -x direction
        // (cell index would be e.g. -5 and 5 in the two halves of the cell):
        if (abs(c) >= (repetitions/2.)) c = abs(c);
        return _p;
      }

      // XXX this shouldn't be here...
      float opHalve( in float sdf, vec4 p, in int dir ){
        float _out = 0.;
        switch( dir ) {
          case 0:  
            _out = max( sdf, p.y );
            break;
          case 1:
            _out = max( sdf, -p.y );
            break;
          case 2:
            _out = max( sdf, p.x );
            break;
          case 3:
            _out = max( sdf, -p.x );
            break;
        }

        return _out;
      }

      // added k value to glsl-sdf-ops/soft-shadow
      float softshadow( in vec3 ro, in vec3 rd, in float mint, in float tmax, in float k ){
        float res = 1.0;
        float t = mint;

        for( int i = 0; i < 12; i++ ) {
          float h = scene( ro + rd * t ).x;
          res = min( res, k * h / t );
          t += clamp( h, 0.02, 0.10 );
          if( h<0.001 || t>tmax ) break;
        }

        return clamp( res, 0.0, 1.0 );
      }

${lighting}

    vec2 scene(vec3 _p ) {
      vec4 p = vec4( _p, 1. );
${preface}
      return ${scene};
    }
 
${main}
`

    return fs_source
  }

},{}],23:[function(require,module,exports){
const getFog = require( './fog.js' )
const vignette = require( './vignette.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const __lighting = require( './lighting.js' )
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc } = require('./var.js')

const getScene = function( SDF ) {

  Scene = function( objs, canvas, steps=100, minDistance=.001, maxDistance=40, size=2, shouldAnimate=false ) {
    const scene  = Object.create( Scene.prototype )

    MaterialID.clear()

    SDF.lighting.lights = []

    scene.__prerender = objs
    if( objs.length > 1 ) {
      // reduce objects to nested Unions
      scene.__prerender = objs.reduce( ( current, next ) => SDF.Union( current, next ) )
    }

    Object.assign( scene, { 
      objs, 
      canvas,
      postprocessing:[],
      __shadow:8,
      __followLight:null,
      __postprocessingFlag:false,
      __steps:null,
      __thresold:null,
      __farPlane:null,
      __resolution:null,
      __voxelSize:.1
    })

    scene.useQuality = true
    scene.useVoxels  = false

    SDF.__scene = scene

    return scene
  }

  Scene.prototype = {
    animate( v ) { this.__animate = v; return this },  
    setdim( w, h ) {
      this.width = w
      this.height = h 

      this.donotuseresolution = true
      return this
    },
    resolution( v ) { 
      this.width = Math.floor( this.canvas.width = window.innerWidth * v )
      this.height = Math.floor( this.canvas.height = window.innerHeight * v )
      
      this.__resolution = v;
      return this 
    },  
    voxel( v = .1 ) { 
      this.useVoxels = true
      this.__voxelSize = v
      return this
    },
    threshold( v ) { this.__threshold = v; return this },  
    steps( v ) { this.__steps = v; return this },  
    farPlane( v ) { this.__farPlane = v; return this },  
    camera( x=0, y=0, z=5, speed=1 ) {
      SDF.camera.__camera.position[0] = x
      SDF.camera.__camera.position[1] = y
      SDF.camera.__camera.position[2] = z
      SDF.camera.__camera.rotationSpeed = speed * .01
      SDF.camera.__camera.positionSpeed = speed * -.25
      SDF.camera.update()
      return this
    },
    shadow( k=0 ) {
      this.__shadow = k;
      return this;
    },
    quality( quality=10 ) {
      if( this.__thresold === null ) this.threshold( .1 / (quality * quality * quality ) )
      if( this.__steps === null ) this.steps( quality * 20 )
      if( this.__farPlane === null ) this.farPlane( quality * 5 )
      if( this.donotuseresolution === undefined && this.__resolultion === null ) this.resolution( Math.min( .2 * quality, 2 ) )

      return this
    },
    follow( light, distance=3 ) {
      this.__followLight = light
      SDF.camera.onmove = function( camera ) {
        const offset = SDF.camera.offset()
        light.pos.x = SDF.camera.__camera.position[0] - offset[0]
        light.pos.y = SDF.camera.__camera.position[1] - offset[1]
        light.pos.z = SDF.camera.__camera.position[2] - offset[2]
        light.dirty = true
      }
      SDF.lighting.lights = [light]
      return this
    },
    light( ...lights ) {
      SDF.lighting.lights = SDF.lighting.lights.concat( lights )
      if( this.__followLight !== null ) SDF.lighting.lights.push( this.__followLight )
      return this
    },
    fog: getFog( Scene, SDF ),
    vignette: vignette( Scene, SDF ),
    background: require( './background.js' )( Scene, SDF ),
    
    applyPreset( presetName ) {
      const preset = this.presets[ presetName ]
      if( preset.farPlane !== undefined ) {
        this.farPlane( this.__farPlane || preset.farPlane )
      }else{
        this.__farPlane = 0
      }
      this.steps( this.__steps || preset.steps )
      if( this.donotuseresolution === undefined ) this.resolution( this.__resolution || preset.resolution )
      this.threshold( this.__threshold || preset.threshold || .001 )
      this.useVoxels = presetName.indexOf( 'voxel' ) !== -1

      return preset.animated
    },

    post( ...fx ) {
      this.__postprocessingFlag = true
      SDF.fx.clear()
      SDF.fx.post( ...fx )
      return this
    },

    render( quality=10, animate=false, useQuality=true ) {
      // adds default if none has been specified
      this.background() 
      if( this.__postprocessingFlag === false ) { SDF.fx.clear() }

      if( typeof quality === 'string' ) {
        animate = this.applyPreset( quality )
      }else if( this.useQuality === true ) {
        this.quality( quality )
      }

      this.animate( animate )

      SDF.distanceOps.__clear()
      SDF.alterations.__clear()
      SDF.textures.clear()
      const geometries = SDF.primitives.emit_geometries()

      let [ variablesDeclaration, sceneRendering, postprocessing ] = SDF.generateSDF( this )

      const lighting = SDF.lighting.gen( this.__shadow, geometries )
      variablesDeclaration += SDF.materials.emit_decl() 
      variablesDeclaration += SDF.textures.emit_decl() 
      variablesDeclaration += SDF.lighting.emit_decl() 
      variablesDeclaration += this.__background.emit_decl()

      this.fs = SDF.renderFragmentShader( 
        variablesDeclaration, 
        sceneRendering.out, 
        sceneRendering.preface,
        SDF.requiredGeometries.join('\n') + SDF.requiredOps.join('\n'),
        lighting,
        postprocessing, 
        this.__steps, this.__threshold, this.__farPlane.toFixed(1),
        SDF.distanceOps.__getGLSL() + SDF.alterations.__getGLSL(),
        this.useVoxels,
        this.__voxelSize
      )

      if( this.width === undefined ) this.width = window.innerWidth
      if( this.height === undefined ) this.height = window.innerHeight
      SDF.start( this.fs, this.width, this.height, this.__animate )

      //SDF.materials.materials.length = 0

      this.useQuality = true

      this.__postprocessingFlag = false
      this.__threshold = null
      this.__farPlane = null
      this.__steps = null
      this.__resolution = null

      return this
    },
    presets: {
      'fractal.close': {
        farPlane:1,
        resolution:1,
        steps:150,
        animated:true,
        threshold:.000125
      },
      'fractal.kindaclose': {
        farPlane:2,
        resolution:1,
        steps:250,
        animated:true,
        threshold:.000125/2
      },
      'fractal.med': {
        farPlane:5,
        resolution:.75,
        steps:80,
        animated:true,
        threshold:.001,
      },
      'fractal.low': {
        farPlane:3.0,
        resolution:.5,
        animated:true,
        steps:50,
        threshold:.005,
      },
      'fractal.high': {
        farPlane:10,
        resolution:1,
        animated:true,
        steps:100,
        threshold:.001,
      },
      'repeat.low': {
        farPlane:25,
        resolution:.5,
        animated:true,
        steps:50
      },
      'repeat.med': {
        farPlane:35,
        resolution:1,
        animated:true,
        steps:75
      },
      'repeat.high': {
        farPlane:40,
        resolution:1,
        animated:true,
        steps:100
      },
      'voxel.high': {
        resolution:1,
        animated:true,
        steps:30
      },
      'voxel.med': {
        resolution:1,
        animated:true,
        steps:20
      },
      'voxel.low': {
        resolution:.5,
        animated:true,
        steps:10
      },
      low: {
        threshold:.05,
        steps:45,
        farPlane:12,
        resolution:.4,
        animated:true
      },
      medium: {
        threshold:.01,
        steps:80,
        farPlane:18,
        resolution:.5,
        animated:true
      },
      med: {
        threshold:.01,
        steps:80,
        farPlane:18,
        resolution:.5,
        animated:true
      },
      high: {
        threshold:.005,
        steps:90,
        farPlane:20,
        resolution:1,
        animated:true
      }
    },

  }

  return Scene

}

module.exports = getScene 

},{"./background.js":3,"./fog.js":11,"./lighting.js":14,"./utils.js":29,"./var.js":30,"./vignette.js":32}],24:[function(require,module,exports){
const SceneNode = ()=> Object.create( SceneNode.prototype )
const Matrix = require( './external/matrix.js' )

SceneNode.prototype = {
  active: 1,

  // register functions passed as property values
  // to callbacks, and assign initial value by
  // running the function
  __processFunction( value, name ) {
    if( typeof value === 'function' ) {
      const __value = value
      Marching.postrendercallbacks.push( t => {
        this.transform[ name ] = __value( t ) 
      })

      value = value( 0 )
    }

    return value
  },

	emit() { return "#NotImplemented#"; },

	emit_decl() { return ""; },

	update_location(gl, program) {},

  upload_data(gl) {},

  getID() {
    let id = this.id

    if( id === undefined && this.sdf !== undefined ) {
      id = this.sdf.getID()
    }

    return id
  },

  getCenter() {
    let center = this.center

    if( center === undefined && this.sdf !== undefined ) {
      if( this.sdf.getCenter === undefined ) {
        center = this.sdf.__wrapped.getCenter()
      }else{
        center = this.sdf.getCenter()
      }
    }

    return center
  },

  move( ...args ) {
    return this.translate( ...args )
  },

  rotate( angle, x,y,z ) {
    this.transform.rotation.angle = angle
    if( x !== undefined ) this.transform.rotation.axis.x = x
    if( y !== undefined ) this.transform.rotation.axis.y = y
    if( z !== undefined ) this.transform.rotation.axis.z = z
  
    return this
  },

  rotateBy( angle,x,y,z ) {
    this.transform.__rotations.push( Matrix.rotate( angle,x,y,z ) )
    return this
  },

  translate( x,y,z ) {
    if( x !== undefined && x !== null ) this.transform.translation.x = x
    if( y !== undefined && y !== null ) this.transform.translation.y = y
    if( z !== undefined && z !== null ) this.transform.translation.z = z
  
    return this
  },

  scale( amount ) {
    amount = this.__processFunction( amount, 'scale' )
    if( amount !== undefined ) this.transform.scale = amount
    return this
  },

  material( mat ) {
    this.__setMaterial( mat )
    return this
  },

  texture( tex,props ) {
    this.__setTexture( tex,props )
    return this
  },

  bump( tex,strength ) {
    this.__setBump( tex,strength )
    return this
  }
}

const ops = [ 'repeat', 'polarRepeat', 'elongation' ]

ops.forEach( op => {
  const constructorName = op[0].toUpperCase() + op.slice(1)
  SceneNode.prototype[ op ] = function( ...args ) {
    this[ op ] = this[ op ].bind( this )
    Object.assign( this[ op ], SceneNode.prototype )
    this.__target = this[ op ]
    this[ '__'+op ] = Marching[ constructorName ]( this, ...args, this[ op ] )
    this[ op ].transform = this[ '__'+op ].transform
    return this
  }
})

module.exports = SceneNode

},{"./external/matrix.js":9}],25:[function(require,module,exports){
const SceneNode = require( './sceneNode.js' ),
      getPixels = require( 'get-pixels' ),
      createTexture = require( 'gl-texture2d' ),
      { param_wrap, MaterialID } = require( './utils.js' ),
      { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc }  = require( './var.js' ), 
      { Vec2, Vec3, Vec4 } = require( './vec.js' )


const __Textures = function( SDF ) {
  const gens = { 
    int:   int_var_gen,
    float: float_var_gen,
    vec2: vec2_var_gen,
    vec3: vec3_var_gen,
    vec4: vec4_var_gen,
  }

  const vars = { 
    vec2: Vec2,
    vec3: Vec3,
    vec4: Vec4
  }

  const Textures = {
    textures:[],
    __textures:[],

    __texturePrefaces:[],
    __textureBodies:  [],

    __types: require( './textureDescriptions.js' ),
    __wrap : require( './textureWrap.js' ), 
    
    __emitFunction() {
      let pushedWrap = false

      let decl = `
      vec3 getTexture( int id, vec3 pos ) {
        vec3 tex;
        vec2 pos2;

        switch( id ) {\n`
      
      Textures.__textureBodies.length = 0

      let funcdefs = ''
      this.textures.forEach( (t,i) => {
        const mode = t.mode !== '2d' && t.glsl !== undefined ? '3d' : '2d'

        // add texture wrap function if needed
        if( mode === '2d' && pushedWrap === false ) {
          Textures.__textureBodies.push( Textures.__wrap )
          pushedWrap = true
        }

        let glsl = mode === '3d' ? t.glsl : t.glsl2d 
        const usesId = glsl.indexOf( '_id_' ) > -1 

        let functionName = mode === '2d' ? t.name + '2d' : t.name 
        if( usesId ) {
          glsl = glsl.replace( /\_id\_/g, t.id )
          glsl = glsl.replace( new RegExp( `${functionName}`, 'g'  ), functionName+t.id )
          functionName = functionName+t.id
        }
        if( Textures.__textureBodies.indexOf( glsl ) === -1 ) { 
          Textures.__textureBodies.push( glsl )
        }

        const args = t.parameters.map( p => t.__target[ p.name ].emit() ) 
        decl +=`
          case ${i}:
            ${mode === '2d' ? `     pos2 = getUVCubic( pos );\n` : ''} 
            tex = ${functionName}( ${mode === '2d' ?'pos2':'pos'} ${ args.length > 0 ? ',' + args.join(',') : ''} );
            break;\n`            

      })

      decl += `
          default:
            tex = vec3(0.);
            break;
        }

        return tex;
      }

      vec3 getTexture( int id, vec3 pos, vec3 nor, SDF sdf, bool useTransform ) {
        vec3 tex;
        vec2 pos2;
        vec3 tpos = pos;
        if( useTransform == true ) {
          if( length(sdf.repeat) != 0. ) {
            tpos = mod( (vec4(pos,1.) * sdf.repeatTransform).xyz, sdf.repeat) - .5 * sdf.repeat;
            tpos = ( vec4(tpos, 1.) * sdf.transform).xyz;
          }else{
            tpos = (vec4(tpos,1.) * sdf.transform).xyz;
          }
        }

        return getTexture( id, tpos );
      }
      `
     
      return { glsldefs: Textures.__textureBodies.join( '\n' ), mainfunc:decl }
    },

    clear() {
      Textures.textures.length = 0
    },

    addTexture( tex ) {
      // we have to dirty the texture so that its data
      // will be uploaded to new shaders, otherwise the
      // texture will only work the first time it's used, when
      // it's dirty on initialization.
      Textures.dirty( tex )

      // if texture with same name is already found, replace it,
      // otherwise push texture
      //const oldTex = Textures.textures.find( __tex => tex.name === __tex.name )
      //if( oldTex !== undefined ) {
      //  const idx = Textures.textures.indexOf( oldTex )
      //  Textures.textures.splice( idx, 1, tex )

      //  tex.id = idx 
      //}else{
        tex.id = Textures.textures.length
        Textures.textures.push( tex )
      //}

      return tex
    },

    texture( presetName='noise', props={}, target=null ){
      //const isPreset = filenameOrPreset.indexOf( '.' ) === -1
      //const defaults = { wrap:SDF.gl.MIRRORED_REPEAT }

      if( Textures.__types[ presetName ] === undefined ) {
        console.log( `the texture type '${presetName}' does not exist.` )
      }
      const tex = Object.assign( { mode:'3d' }, Textures.__types[ presetName ], props )

      if( target === null ) target = tex
      tex.__target = target

      for( let param of tex.parameters ) {
        const defaultValues = param.default
        const isArray = Array.isArray( defaultValues )

        let count = 0
        if( isArray ) {
          let val = props[ param.name ], __var

          if( typeof val === 'number' ) {
            __var = Var( vars[ param.type ]( val ), null, 'vec3' )
          }else{
            const initvalues = val !== undefined ? val : defaultValues
            __var = Var( vars[ param.type ]( ...initvalues ), null, param.type )
          }

          // for assigning entire new vectors to property
          Object.defineProperty( target, param.name, {
            configurable:true,
            get() { return __var },
            set(v) {
              if( typeof v === 'object' ) {
                __var.set( v )
              }else{
                __var.value.x = v
                __var.value.y = v
                __var.value.z = v
                __var.value.w = v
                __var.dirty = true
              }
            }
          })

        }else{
          let __var  = param_wrap( 
            props[ param.name ], 
            gens[ param.type ]( defaultValues ) 
          )

          //__var.set( defaultValues )
          Object.defineProperty( target, param.name, {
            configurable:true,
            get() { return __var },
            set(v) {
              __var.set( v )
            }
          })
        }
      }

      if( presetName === 'image' ) {
        if( props.filename !== undefined ) {
          tex.image = getPixels( props.filename, (err,pixels) => {
            if( err !== null ) {
              console.error( err )
              return
            }
            tex.pixels = pixels
            tex.gltexture = createTexture( SDF.gl, pixels )
            tex.gltexture.wrap = props.wrap === undefined ? Marching.gl.REPEAT : props.wrap
          })
        }else{
          tex.image = null
          console.error('You must specify a filename when using the iamge preset.')
        }
      }else if( presetName === 'canvas' ) {
        if( props.canvas === undefined ) {
          tex.canvas = tex.image = document.createElement('canvas')
        }else{
          tex.image = tex.canvas = props.canvas
        }
        if( props.height !== undefined ) {
          tex.canvas.height = props.height
        }
        if( props.width !== undefined ) {
          tex.canvas.width = props.width
        }

        tex.ctx    = tex.canvas.getContext('2d')

        tex.update = function() {
          //tex.gltexture.setPixels( SDF.fx.merger === null ? tex.image : SDF.fx.merger.tex.front.tex )
          tex.gltexture.setPixels( tex.image )
        }

        tex.gltexture = createTexture( SDF.gl, tex.image )
        tex.gltexture.wrap = props.wrap === undefined ? Marching.gl.REPEAT : props.wrap

        tex.update()
      }else if( presetName === 'feedback' ) {
        tex.canvas = tex.image = SDF.canvas 
        tex.ctx    = tex.canvas.getContext('2d')

        tex.update = function() {
          tex.gltexture.setPixels( tex.image )
          //tex.gltexture.setPixels( SDF.fx.merger === null ? tex.image : SDF.fx.merger.tex.front.tex )
        }

        tex.gltexture = createTexture( SDF.gl, tex.image )
        tex.gltexture.wrap = props.wrap === undefined ? Marching.gl.REPEAT : props.wrap

        tex.update()
      }


      Object.defineProperty( tex, 'wrap', {
        get() { return this.gltexture.wrap },
        set(v){ 
          this.gltexture.wrap = v 
        }
      })

      tex.name = presetName

      return tex 
    },

    dirty( tex ) {},
   
    emit_decl() {
      if( this.textures.length === 0 ) return '' 

      let decl = ''

      const memo = []
      let imageCount = 0;
      this.textures.forEach( (tex,i) => {
        if( memo.indexOf( tex ) === -1 ) {
          for( let param of tex.parameters ) {
            if( param.name !== 'material' )
              decl += tex.__target[ param.name ].emit_decl()
          }
          memo.push( tex )
        }
        if( tex.name === 'image' || tex.name === 'canvas' || tex.name === 'feedback' ) {
          imageCount++

          // for some reason can't immediately call update... 
          // have to wait for some type of dom initialization?
          // so call here
          if( tex.update ) tex.update()
        }
      })

      if( imageCount > 0 ) {
        decl += `\n      uniform sampler2D textures[${imageCount}];\n`
      }
      return decl
    },
    
    update_location( gl, program ) {
      if( this.textures.length > 0 ) {
        this.textures.forEach( (tex,i) => {
          for( let param of tex.parameters ) {
            if( param.type !== 'obj' ) {
              if( param.name !== 'material' ) 
                tex.__target[ param.name ].update_location( gl,program )
            }
          }
          if( tex.name === 'image' || tex.name === 'canvas' || tex.name === 'feedback' ) {
            tex.loc = gl.getUniformLocation( program, `textures[${tex.id}]` )
            tex.gltexture.bind( i )
          }
        })
      }

      //if( this.textures.length > 0 ) {
      //  this.textures.sort( (a,b) => a.id > b.id ? 1 : -1 ) 

      //  for( let tex of this.textures ) {
      //    tex.loc = gl.getUniformLocation( program, `textures[${tex.id}]` )
      //    tex.gltexture.bind( tex.id )
      //  }

      //  this.__textures = this.textures.slice( 0 )
      //  this.textures.length = 0
      //}
    },

    upload_data( gl, program ) {
      if( this.textures.length > 0 ) {
        this.textures.forEach( (tex,i) => {
          for( let param of tex.parameters ) {
            if( param.type !== 'obj' && param.name !== 'material' )
              tex.__target[ param.name ].upload_data( gl )
          }
          if( tex.name === 'image' || tex.name === 'canvas' || tex.name === 'feedback' ) {
            gl.uniform1i( tex.loc, i )
          }
        })
      }
    }

  }

  Textures.texture.create = function( props ) {
    Textures.__types[ props.name ] = props
  }

  Object.defineProperties( Textures.texture, {
    'repeat': { get() { return Marching.gl.REPEAT } },
    'mirror': { get() { return Marching.gl.MIRRORED_REPEAT } },
    'clamp': { get() { return Marching.gl.CLAMP_TO_EDGE } },
  })

  const f = value => value % 1 === 0 ? value.toFixed(1) : value 

  return Textures
}

module.exports = __Textures

},{"./sceneNode.js":24,"./textureDescriptions.js":26,"./textureWrap.js":27,"./utils.js":29,"./var.js":30,"./vec.js":31,"get-pixels":100,"gl-texture2d":131}],26:[function(require,module,exports){
const glsl = require( 'glslify' )

const textures = {
  image: {
    name:'image',
    glsl2d:`
      vec3 image2d( vec2 uv, float scale, vec3 mod, float strength ) {
        return texture( textures[ _id_ ], (uv+mod)*scale ).xyz * strength;
      }
    `,
    parameters:[
      { name:'scale', type:'float', default:1 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'strength', type:'float', default:1 },   
    ]
  },
  canvas: {
    name:'canvas',
    glsl2d:`
      vec3 canvas2d( vec2 uv, float scale, vec3 mod, float strength ) {
        return texture( textures[ _id_ ], (uv+mod.xy)*scale ).xyz * strength;
      }
    `,
    parameters:[
      { name:'scale', type:'float', default:1 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'strength', type:'float', default:1 },   
    ]
  },
  feedback: {
    name:'feedback',
    glsl2d:`
      vec3 feedback2d( vec2 uv, float scale, vec3 mod, float strength ) {
        return texture( textures[ _id_ ], (uv+mod.xy)*scale ).xyz * strength;
      }
    `,
    parameters:[
      { name:'scale', type:'float', default:1 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'strength', type:'float', default:1 },   
    ]
  },
  rainbow: {
    name:'rainbow',
    parameters: [
      { name:'strength', type:'float', default:1 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'shift', type:'float', default:0 },
      { name:'scale', type:'float', default:1 },
    ],
    glsl:` 
    vec3 rainbow( vec3 pos, float strength, vec3 uvmod, float shift, float scale ) {
      pos = (pos+uvmod) * scale;
      vec3 a = vec3(0.5,0.5,0.5), b = vec3(0.5,0.5,0.5), c = vec3(1.0,1.0,1.0),d = vec3(0.0,0.33,0.67);
      return a + b * cos( 6.283818 * ( c * mod(length(pos) + shift, 1. ) + d ) ) * strength;
    }` 
  },
  checkers: {
    name:'checkers',
    glsl:`          
        vec3 checkers( vec3 pos, float size, vec3 mod, vec3 color1, vec3 color2 ) {
          vec3 tex;
          pos  = (pos+mod) * size;
          if ((int(floor(pos.x) + floor(pos.y) + floor(pos.z)) & 1) == 0) {
            tex = color1;
          }else{
            tex = color2;
          }

          return tex;
        }`,
    glsl2d:`
        vec3 checkers2d( vec2 uv, float size, vec3 mod, vec3 color1, vec3 color2 ) {
          float fmodResult = mod(floor(size * (uv.x+mod.x)) + floor(size * (uv.y+mod.y)), 2.0);
          float fin = max(sign(fmodResult), 0.0); 

          return vec3(fin);
        }
    `,
    parameters: [
      { name:'scale',  type:'float', default:5 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'color1', type:'vec3', default:[1,1,1] },
      { name:'color2', type:'vec3', default:[0,0,0] }
    ],
  },
  noise: {
    name:'noise',
    glsl:glsl(["#define GLSLIFY 1\n          \n        //\n// Description : Array and textureless GLSL 2D/3D/4D simplex\n//               noise functions.\n//      Author : Ian McEwan, Ashima Arts.\n//  Maintainer : ijm\n//     Lastmod : 20110822 (ijm)\n//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.\n//               Distributed under the MIT License. See LICENSE file.\n//               https://github.com/ashima/webgl-noise\n//\n\nvec4 mod289(vec4 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0; }\n\nfloat mod289(float x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0; }\n\nvec4 permute(vec4 x) {\n     return mod289(((x*34.0)+1.0)*x);\n}\n\nfloat permute(float x) {\n     return mod289(((x*34.0)+1.0)*x);\n}\n\nvec4 taylorInvSqrt(vec4 r)\n{\n  return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nfloat taylorInvSqrt(float r)\n{\n  return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nvec4 grad4(float j, vec4 ip)\n  {\n  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);\n  vec4 p,s;\n\n  p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;\n  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);\n  s = vec4(lessThan(p, vec4(0.0)));\n  p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;\n\n  return p;\n  }\n\n// (sqrt(5) - 1)/4 = F4, used once below\n#define F4 0.309016994374947451\n\nfloat snoise(vec4 v)\n  {\n  const vec4  C = vec4( 0.138196601125011,  // (5 - sqrt(5))/20  G4\n                        0.276393202250021,  // 2 * G4\n                        0.414589803375032,  // 3 * G4\n                       -0.447213595499958); // -1 + 4 * G4\n\n// First corner\n  vec4 i  = floor(v + dot(v, vec4(F4)) );\n  vec4 x0 = v -   i + dot(i, C.xxxx);\n\n// Other corners\n\n// Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)\n  vec4 i0;\n  vec3 isX = step( x0.yzw, x0.xxx );\n  vec3 isYZ = step( x0.zww, x0.yyz );\n//  i0.x = dot( isX, vec3( 1.0 ) );\n  i0.x = isX.x + isX.y + isX.z;\n  i0.yzw = 1.0 - isX;\n//  i0.y += dot( isYZ.xy, vec2( 1.0 ) );\n  i0.y += isYZ.x + isYZ.y;\n  i0.zw += 1.0 - isYZ.xy;\n  i0.z += isYZ.z;\n  i0.w += 1.0 - isYZ.z;\n\n  // i0 now contains the unique values 0,1,2,3 in each channel\n  vec4 i3 = clamp( i0, 0.0, 1.0 );\n  vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );\n  vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );\n\n  //  x0 = x0 - 0.0 + 0.0 * C.xxxx\n  //  x1 = x0 - i1  + 1.0 * C.xxxx\n  //  x2 = x0 - i2  + 2.0 * C.xxxx\n  //  x3 = x0 - i3  + 3.0 * C.xxxx\n  //  x4 = x0 - 1.0 + 4.0 * C.xxxx\n  vec4 x1 = x0 - i1 + C.xxxx;\n  vec4 x2 = x0 - i2 + C.yyyy;\n  vec4 x3 = x0 - i3 + C.zzzz;\n  vec4 x4 = x0 + C.wwww;\n\n// Permutations\n  i = mod289(i);\n  float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);\n  vec4 j1 = permute( permute( permute( permute (\n             i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))\n           + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))\n           + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))\n           + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));\n\n// Gradients: 7x7x6 points over a cube, mapped onto a 4-cross polytope\n// 7*7*6 = 294, which is close to the ring size 17*17 = 289.\n  vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;\n\n  vec4 p0 = grad4(j0,   ip);\n  vec4 p1 = grad4(j1.x, ip);\n  vec4 p2 = grad4(j1.y, ip);\n  vec4 p3 = grad4(j1.z, ip);\n  vec4 p4 = grad4(j1.w, ip);\n\n// Normalise gradients\n  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\n  p0 *= norm.x;\n  p1 *= norm.y;\n  p2 *= norm.z;\n  p3 *= norm.w;\n  p4 *= taylorInvSqrt(dot(p4,p4));\n\n// Mix contributions from the five corners\n  vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);\n  vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);\n  m0 = m0 * m0;\n  m1 = m1 * m1;\n  return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))\n               + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;\n\n  }\n\n        vec3 noise( vec3 pos, float scale, vec3 mod, float strength, float time ) {\n          float n = snoise( vec4((pos+mod)*scale, time) );\n          return vec3( n ) * strength;\n        }",""]),
    glsl2d:glsl(["#define GLSLIFY 1\n    \n        //\n// Description : Array and textureless GLSL 2D/3D/4D simplex\n//               noise functions.\n//      Author : Ian McEwan, Ashima Arts.\n//  Maintainer : ijm\n//     Lastmod : 20110822 (ijm)\n//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.\n//               Distributed under the MIT License. See LICENSE file.\n//               https://github.com/ashima/webgl-noise\n//\n\nvec3 mod289(vec3 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 mod289(vec4 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 permute(vec4 x) {\n     return mod289(((x*34.0)+1.0)*x);\n}\n\nvec4 taylorInvSqrt(vec4 r)\n{\n  return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nfloat snoise(vec3 v)\n  {\n  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;\n  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);\n\n// First corner\n  vec3 i  = floor(v + dot(v, C.yyy) );\n  vec3 x0 =   v - i + dot(i, C.xxx) ;\n\n// Other corners\n  vec3 g = step(x0.yzx, x0.xyz);\n  vec3 l = 1.0 - g;\n  vec3 i1 = min( g.xyz, l.zxy );\n  vec3 i2 = max( g.xyz, l.zxy );\n\n  //   x0 = x0 - 0.0 + 0.0 * C.xxx;\n  //   x1 = x0 - i1  + 1.0 * C.xxx;\n  //   x2 = x0 - i2  + 2.0 * C.xxx;\n  //   x3 = x0 - 1.0 + 3.0 * C.xxx;\n  vec3 x1 = x0 - i1 + C.xxx;\n  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y\n  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y\n\n// Permutations\n  i = mod289(i);\n  vec4 p = permute( permute( permute(\n             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))\n           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))\n           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));\n\n// Gradients: 7x7 points over a square, mapped onto an octahedron.\n// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)\n  float n_ = 0.142857142857; // 1.0/7.0\n  vec3  ns = n_ * D.wyz - D.xzx;\n\n  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)\n\n  vec4 x_ = floor(j * ns.z);\n  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)\n\n  vec4 x = x_ *ns.x + ns.yyyy;\n  vec4 y = y_ *ns.x + ns.yyyy;\n  vec4 h = 1.0 - abs(x) - abs(y);\n\n  vec4 b0 = vec4( x.xy, y.xy );\n  vec4 b1 = vec4( x.zw, y.zw );\n\n  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;\n  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;\n  vec4 s0 = floor(b0)*2.0 + 1.0;\n  vec4 s1 = floor(b1)*2.0 + 1.0;\n  vec4 sh = -step(h, vec4(0.0));\n\n  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;\n  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;\n\n  vec3 p0 = vec3(a0.xy,h.x);\n  vec3 p1 = vec3(a0.zw,h.y);\n  vec3 p2 = vec3(a1.xy,h.z);\n  vec3 p3 = vec3(a1.zw,h.w);\n\n//Normalise gradients\n  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\n  p0 *= norm.x;\n  p1 *= norm.y;\n  p2 *= norm.z;\n  p3 *= norm.w;\n\n// Mix final noise value\n  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);\n  m = m * m;\n  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),\n                                dot(p2,x2), dot(p3,x3) ) );\n  }\n\n        vec3 noise2d( vec2 st, float scale, vec3 mod, float strength, float time ) {\n          float col = snoise( vec3( (st+mod.xy), time ) * scale );\n\n          return vec3(col) * strength;\n        }\n",""]) ,
    parameters: [
      { name:'scale', type:'float', default:2 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'strength', type:'float', default:.1 },
      { name:'time', type:'float', default:1 }
    ],
  },
  // adapted from https://thebookofshaders.com/10/
  truchet: {
    name:'truchet',
    glsl2d:`    
        float random_truchet(in vec2 _st) {
          return fract(sin(dot(_st.xy,
                         vec2(12.9898,78.233)))*
                        43758.5453123);
        }

        vec2 truchetPattern(in vec2 _st, in float _index){
            _index = fract(((_index-0.5)*2.0));
            if (_index > 0.75) {
                _st = vec2(1.0) - _st;
            } else if (_index > 0.5) {
                _st = vec2(1.0-_st.x,_st.y);
            } else if (_index > 0.25) {
                _st = 1.0-vec2(1.0-_st.x,_st.y);
            }
            return _st;
        }

        vec3 truchet2d( vec2 st, float scale, vec3 mod, vec3 color ) {
            st = (st+mod.xy) * scale;
            vec2 ipos = floor(st);  // integer
            vec2 fpos = fract(st);  // fraction

            vec2 tile = truchetPattern(fpos, random_truchet( ipos ));

            float col = smoothstep(tile.x-0.3,tile.x,tile.y)-smoothstep(tile.x,tile.x+.3,tile.y);
            return color * col;
        }

` ,
    parameters: [
      { name:'scale', type:'float', default:10 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'color', type:'vec3', default:[1,1,1] }
    ],
  },
  dots: {
    name:'dots',
    glsl:`          
        vec3 dots( vec3 pos, float count, vec3 mod, float radius, vec3 color ) {
          vec3 tex;
          tex = vec3( color - smoothstep( radius, radius+.02, length(fract(pos*(round(count/2.)+.5)) -.5 )) );
          return tex;
        }` ,
    glsl2d:`
      vec2 tile(vec2 _st, float _zoom){
        _st *= _zoom;
        return fract(_st);
      }

      float circle(vec2 _st, float _radius){
        vec2 pos = vec2(0.5)-_st;
        _radius *= 0.75;
        return 1.-smoothstep(_radius-(_radius*0.05),_radius+(_radius*0.05),dot(pos,pos)*3.14);
      }
    
      vec3 dots2d( vec2 _st, float scale, vec3 mod, float radius, vec3 color ) {
        vec2 st = tile((_st+mod.xy,scale);
        vec3 fin = vec3(circle(st, radius)) * color;
        return fin;
      }
    `,
    parameters: [
      { name:'scale', type:'float', default:5 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'radius', type:'float', default:.3 },
      { name:'color', type:'vec3', default:[1,1,1] }
    ],
  },
  stripes: {
    name:'stripes',
    glsl:`          
        vec3 stripes( vec3 pos, float scale, vec3 mod, vec3 color ) {
          vec3 tex;
          pos = pos + mod;
          tex = vec3( color - smoothstep(0.3, 0.32, length(fract((pos.x+pos.y+pos.z)*scale) -.5 )) );
          return tex;
        }` ,
    parameters: [
      { name:'scale', type:'float', default:5 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'color', type:'vec3', default:[1,1,1] }
    ],
  },
  cellular: {
    name:'cellular',
    glsl:glsl(["#define GLSLIFY 1\n\n        // Permutation polynomial: (34x^2 + x) mod 289\nvec3 permute(vec3 x) {\n  return mod((34.0 * x + 1.0) * x, 289.0);\n}\n\nvec3 dist(vec3 x, vec3 y, vec3 z,  bool manhattanDistance) {\n  return manhattanDistance ?  abs(x) + abs(y) + abs(z) :  (x * x + y * y + z * z);\n}\n\nvec2 worley(vec3 P, float jitter, bool manhattanDistance) {\nfloat K = 0.142857142857; // 1/7\nfloat Ko = 0.428571428571; // 1/2-K/2\nfloat  K2 = 0.020408163265306; // 1/(7*7)\nfloat Kz = 0.166666666667; // 1/6\nfloat Kzo = 0.416666666667; // 1/2-1/6*2\n\n\tvec3 Pi = mod(floor(P), 289.0);\n \tvec3 Pf = fract(P) - 0.5;\n\n\tvec3 Pfx = Pf.x + vec3(1.0, 0.0, -1.0);\n\tvec3 Pfy = Pf.y + vec3(1.0, 0.0, -1.0);\n\tvec3 Pfz = Pf.z + vec3(1.0, 0.0, -1.0);\n\n\tvec3 p = permute(Pi.x + vec3(-1.0, 0.0, 1.0));\n\tvec3 p1 = permute(p + Pi.y - 1.0);\n\tvec3 p2 = permute(p + Pi.y);\n\tvec3 p3 = permute(p + Pi.y + 1.0);\n\n\tvec3 p11 = permute(p1 + Pi.z - 1.0);\n\tvec3 p12 = permute(p1 + Pi.z);\n\tvec3 p13 = permute(p1 + Pi.z + 1.0);\n\n\tvec3 p21 = permute(p2 + Pi.z - 1.0);\n\tvec3 p22 = permute(p2 + Pi.z);\n\tvec3 p23 = permute(p2 + Pi.z + 1.0);\n\n\tvec3 p31 = permute(p3 + Pi.z - 1.0);\n\tvec3 p32 = permute(p3 + Pi.z);\n\tvec3 p33 = permute(p3 + Pi.z + 1.0);\n\n\tvec3 ox11 = fract(p11*K) - Ko;\n\tvec3 oy11 = mod(floor(p11*K), 7.0)*K - Ko;\n\tvec3 oz11 = floor(p11*K2)*Kz - Kzo; // p11 < 289 guaranteed\n\n\tvec3 ox12 = fract(p12*K) - Ko;\n\tvec3 oy12 = mod(floor(p12*K), 7.0)*K - Ko;\n\tvec3 oz12 = floor(p12*K2)*Kz - Kzo;\n\n\tvec3 ox13 = fract(p13*K) - Ko;\n\tvec3 oy13 = mod(floor(p13*K), 7.0)*K - Ko;\n\tvec3 oz13 = floor(p13*K2)*Kz - Kzo;\n\n\tvec3 ox21 = fract(p21*K) - Ko;\n\tvec3 oy21 = mod(floor(p21*K), 7.0)*K - Ko;\n\tvec3 oz21 = floor(p21*K2)*Kz - Kzo;\n\n\tvec3 ox22 = fract(p22*K) - Ko;\n\tvec3 oy22 = mod(floor(p22*K), 7.0)*K - Ko;\n\tvec3 oz22 = floor(p22*K2)*Kz - Kzo;\n\n\tvec3 ox23 = fract(p23*K) - Ko;\n\tvec3 oy23 = mod(floor(p23*K), 7.0)*K - Ko;\n\tvec3 oz23 = floor(p23*K2)*Kz - Kzo;\n\n\tvec3 ox31 = fract(p31*K) - Ko;\n\tvec3 oy31 = mod(floor(p31*K), 7.0)*K - Ko;\n\tvec3 oz31 = floor(p31*K2)*Kz - Kzo;\n\n\tvec3 ox32 = fract(p32*K) - Ko;\n\tvec3 oy32 = mod(floor(p32*K), 7.0)*K - Ko;\n\tvec3 oz32 = floor(p32*K2)*Kz - Kzo;\n\n\tvec3 ox33 = fract(p33*K) - Ko;\n\tvec3 oy33 = mod(floor(p33*K), 7.0)*K - Ko;\n\tvec3 oz33 = floor(p33*K2)*Kz - Kzo;\n\n\tvec3 dx11 = Pfx + jitter*ox11;\n\tvec3 dy11 = Pfy.x + jitter*oy11;\n\tvec3 dz11 = Pfz.x + jitter*oz11;\n\n\tvec3 dx12 = Pfx + jitter*ox12;\n\tvec3 dy12 = Pfy.x + jitter*oy12;\n\tvec3 dz12 = Pfz.y + jitter*oz12;\n\n\tvec3 dx13 = Pfx + jitter*ox13;\n\tvec3 dy13 = Pfy.x + jitter*oy13;\n\tvec3 dz13 = Pfz.z + jitter*oz13;\n\n\tvec3 dx21 = Pfx + jitter*ox21;\n\tvec3 dy21 = Pfy.y + jitter*oy21;\n\tvec3 dz21 = Pfz.x + jitter*oz21;\n\n\tvec3 dx22 = Pfx + jitter*ox22;\n\tvec3 dy22 = Pfy.y + jitter*oy22;\n\tvec3 dz22 = Pfz.y + jitter*oz22;\n\n\tvec3 dx23 = Pfx + jitter*ox23;\n\tvec3 dy23 = Pfy.y + jitter*oy23;\n\tvec3 dz23 = Pfz.z + jitter*oz23;\n\n\tvec3 dx31 = Pfx + jitter*ox31;\n\tvec3 dy31 = Pfy.z + jitter*oy31;\n\tvec3 dz31 = Pfz.x + jitter*oz31;\n\n\tvec3 dx32 = Pfx + jitter*ox32;\n\tvec3 dy32 = Pfy.z + jitter*oy32;\n\tvec3 dz32 = Pfz.y + jitter*oz32;\n\n\tvec3 dx33 = Pfx + jitter*ox33;\n\tvec3 dy33 = Pfy.z + jitter*oy33;\n\tvec3 dz33 = Pfz.z + jitter*oz33;\n\n\tvec3 d11 = dist(dx11, dy11, dz11, manhattanDistance);\n\tvec3 d12 =dist(dx12, dy12, dz12, manhattanDistance);\n\tvec3 d13 = dist(dx13, dy13, dz13, manhattanDistance);\n\tvec3 d21 = dist(dx21, dy21, dz21, manhattanDistance);\n\tvec3 d22 = dist(dx22, dy22, dz22, manhattanDistance);\n\tvec3 d23 = dist(dx23, dy23, dz23, manhattanDistance);\n\tvec3 d31 = dist(dx31, dy31, dz31, manhattanDistance);\n\tvec3 d32 = dist(dx32, dy32, dz32, manhattanDistance);\n\tvec3 d33 = dist(dx33, dy33, dz33, manhattanDistance);\n\n\tvec3 d1a = min(d11, d12);\n\td12 = max(d11, d12);\n\td11 = min(d1a, d13); // Smallest now not in d12 or d13\n\td13 = max(d1a, d13);\n\td12 = min(d12, d13); // 2nd smallest now not in d13\n\tvec3 d2a = min(d21, d22);\n\td22 = max(d21, d22);\n\td21 = min(d2a, d23); // Smallest now not in d22 or d23\n\td23 = max(d2a, d23);\n\td22 = min(d22, d23); // 2nd smallest now not in d23\n\tvec3 d3a = min(d31, d32);\n\td32 = max(d31, d32);\n\td31 = min(d3a, d33); // Smallest now not in d32 or d33\n\td33 = max(d3a, d33);\n\td32 = min(d32, d33); // 2nd smallest now not in d33\n\tvec3 da = min(d11, d21);\n\td21 = max(d11, d21);\n\td11 = min(da, d31); // Smallest now in d11\n\td31 = max(da, d31); // 2nd smallest now not in d31\n\td11.xy = (d11.x < d11.y) ? d11.xy : d11.yx;\n\td11.xz = (d11.x < d11.z) ? d11.xz : d11.zx; // d11.x now smallest\n\td12 = min(d12, d21); // 2nd smallest now not in d21\n\td12 = min(d12, d22); // nor in d22\n\td12 = min(d12, d31); // nor in d31\n\td12 = min(d12, d32); // nor in d32\n\td11.yz = min(d11.yz,d12.xy); // nor in d12.yz\n\td11.y = min(d11.y,d12.z); // Only two more to go\n\td11.y = min(d11.y,d11.z); // Done! (Phew!)\n\treturn sqrt(d11.xy); // F1, F2\n\n}\n\n        vec3 cellular( vec3 pos, float scale, vec3 mod, float jitter, float mode, float strength, float time ) {\n          vec2 w = worley( (pos+mod) * scale + time, jitter, false );\n          vec3 o;\n          if( mode == 0. ) {\n            o = vec3( w.x );\n          } else if ( mode == 1. ) {\n            o = vec3( w.y );\n          } else{\n            o = vec3( w.y - w.x );\n          }\n\n          return o * strength;\n        }\n    ",""]),
    glsl2d:glsl(["#define GLSLIFY 1\n\n        // Permutation polynomial: (34x^2 + x) mod 289\nvec3 permute(vec3 x) {\n  return mod((34.0 * x + 1.0) * x, 289.0);\n}\n\nvec3 dist(vec3 x, vec3 y, vec3 z,  bool manhattanDistance) {\n  return manhattanDistance ?  abs(x) + abs(y) + abs(z) :  (x * x + y * y + z * z);\n}\n\nvec2 worley(vec3 P, float jitter, bool manhattanDistance) {\nfloat K = 0.142857142857; // 1/7\nfloat Ko = 0.428571428571; // 1/2-K/2\nfloat  K2 = 0.020408163265306; // 1/(7*7)\nfloat Kz = 0.166666666667; // 1/6\nfloat Kzo = 0.416666666667; // 1/2-1/6*2\n\n\tvec3 Pi = mod(floor(P), 289.0);\n \tvec3 Pf = fract(P) - 0.5;\n\n\tvec3 Pfx = Pf.x + vec3(1.0, 0.0, -1.0);\n\tvec3 Pfy = Pf.y + vec3(1.0, 0.0, -1.0);\n\tvec3 Pfz = Pf.z + vec3(1.0, 0.0, -1.0);\n\n\tvec3 p = permute(Pi.x + vec3(-1.0, 0.0, 1.0));\n\tvec3 p1 = permute(p + Pi.y - 1.0);\n\tvec3 p2 = permute(p + Pi.y);\n\tvec3 p3 = permute(p + Pi.y + 1.0);\n\n\tvec3 p11 = permute(p1 + Pi.z - 1.0);\n\tvec3 p12 = permute(p1 + Pi.z);\n\tvec3 p13 = permute(p1 + Pi.z + 1.0);\n\n\tvec3 p21 = permute(p2 + Pi.z - 1.0);\n\tvec3 p22 = permute(p2 + Pi.z);\n\tvec3 p23 = permute(p2 + Pi.z + 1.0);\n\n\tvec3 p31 = permute(p3 + Pi.z - 1.0);\n\tvec3 p32 = permute(p3 + Pi.z);\n\tvec3 p33 = permute(p3 + Pi.z + 1.0);\n\n\tvec3 ox11 = fract(p11*K) - Ko;\n\tvec3 oy11 = mod(floor(p11*K), 7.0)*K - Ko;\n\tvec3 oz11 = floor(p11*K2)*Kz - Kzo; // p11 < 289 guaranteed\n\n\tvec3 ox12 = fract(p12*K) - Ko;\n\tvec3 oy12 = mod(floor(p12*K), 7.0)*K - Ko;\n\tvec3 oz12 = floor(p12*K2)*Kz - Kzo;\n\n\tvec3 ox13 = fract(p13*K) - Ko;\n\tvec3 oy13 = mod(floor(p13*K), 7.0)*K - Ko;\n\tvec3 oz13 = floor(p13*K2)*Kz - Kzo;\n\n\tvec3 ox21 = fract(p21*K) - Ko;\n\tvec3 oy21 = mod(floor(p21*K), 7.0)*K - Ko;\n\tvec3 oz21 = floor(p21*K2)*Kz - Kzo;\n\n\tvec3 ox22 = fract(p22*K) - Ko;\n\tvec3 oy22 = mod(floor(p22*K), 7.0)*K - Ko;\n\tvec3 oz22 = floor(p22*K2)*Kz - Kzo;\n\n\tvec3 ox23 = fract(p23*K) - Ko;\n\tvec3 oy23 = mod(floor(p23*K), 7.0)*K - Ko;\n\tvec3 oz23 = floor(p23*K2)*Kz - Kzo;\n\n\tvec3 ox31 = fract(p31*K) - Ko;\n\tvec3 oy31 = mod(floor(p31*K), 7.0)*K - Ko;\n\tvec3 oz31 = floor(p31*K2)*Kz - Kzo;\n\n\tvec3 ox32 = fract(p32*K) - Ko;\n\tvec3 oy32 = mod(floor(p32*K), 7.0)*K - Ko;\n\tvec3 oz32 = floor(p32*K2)*Kz - Kzo;\n\n\tvec3 ox33 = fract(p33*K) - Ko;\n\tvec3 oy33 = mod(floor(p33*K), 7.0)*K - Ko;\n\tvec3 oz33 = floor(p33*K2)*Kz - Kzo;\n\n\tvec3 dx11 = Pfx + jitter*ox11;\n\tvec3 dy11 = Pfy.x + jitter*oy11;\n\tvec3 dz11 = Pfz.x + jitter*oz11;\n\n\tvec3 dx12 = Pfx + jitter*ox12;\n\tvec3 dy12 = Pfy.x + jitter*oy12;\n\tvec3 dz12 = Pfz.y + jitter*oz12;\n\n\tvec3 dx13 = Pfx + jitter*ox13;\n\tvec3 dy13 = Pfy.x + jitter*oy13;\n\tvec3 dz13 = Pfz.z + jitter*oz13;\n\n\tvec3 dx21 = Pfx + jitter*ox21;\n\tvec3 dy21 = Pfy.y + jitter*oy21;\n\tvec3 dz21 = Pfz.x + jitter*oz21;\n\n\tvec3 dx22 = Pfx + jitter*ox22;\n\tvec3 dy22 = Pfy.y + jitter*oy22;\n\tvec3 dz22 = Pfz.y + jitter*oz22;\n\n\tvec3 dx23 = Pfx + jitter*ox23;\n\tvec3 dy23 = Pfy.y + jitter*oy23;\n\tvec3 dz23 = Pfz.z + jitter*oz23;\n\n\tvec3 dx31 = Pfx + jitter*ox31;\n\tvec3 dy31 = Pfy.z + jitter*oy31;\n\tvec3 dz31 = Pfz.x + jitter*oz31;\n\n\tvec3 dx32 = Pfx + jitter*ox32;\n\tvec3 dy32 = Pfy.z + jitter*oy32;\n\tvec3 dz32 = Pfz.y + jitter*oz32;\n\n\tvec3 dx33 = Pfx + jitter*ox33;\n\tvec3 dy33 = Pfy.z + jitter*oy33;\n\tvec3 dz33 = Pfz.z + jitter*oz33;\n\n\tvec3 d11 = dist(dx11, dy11, dz11, manhattanDistance);\n\tvec3 d12 =dist(dx12, dy12, dz12, manhattanDistance);\n\tvec3 d13 = dist(dx13, dy13, dz13, manhattanDistance);\n\tvec3 d21 = dist(dx21, dy21, dz21, manhattanDistance);\n\tvec3 d22 = dist(dx22, dy22, dz22, manhattanDistance);\n\tvec3 d23 = dist(dx23, dy23, dz23, manhattanDistance);\n\tvec3 d31 = dist(dx31, dy31, dz31, manhattanDistance);\n\tvec3 d32 = dist(dx32, dy32, dz32, manhattanDistance);\n\tvec3 d33 = dist(dx33, dy33, dz33, manhattanDistance);\n\n\tvec3 d1a = min(d11, d12);\n\td12 = max(d11, d12);\n\td11 = min(d1a, d13); // Smallest now not in d12 or d13\n\td13 = max(d1a, d13);\n\td12 = min(d12, d13); // 2nd smallest now not in d13\n\tvec3 d2a = min(d21, d22);\n\td22 = max(d21, d22);\n\td21 = min(d2a, d23); // Smallest now not in d22 or d23\n\td23 = max(d2a, d23);\n\td22 = min(d22, d23); // 2nd smallest now not in d23\n\tvec3 d3a = min(d31, d32);\n\td32 = max(d31, d32);\n\td31 = min(d3a, d33); // Smallest now not in d32 or d33\n\td33 = max(d3a, d33);\n\td32 = min(d32, d33); // 2nd smallest now not in d33\n\tvec3 da = min(d11, d21);\n\td21 = max(d11, d21);\n\td11 = min(da, d31); // Smallest now in d11\n\td31 = max(da, d31); // 2nd smallest now not in d31\n\td11.xy = (d11.x < d11.y) ? d11.xy : d11.yx;\n\td11.xz = (d11.x < d11.z) ? d11.xz : d11.zx; // d11.x now smallest\n\td12 = min(d12, d21); // 2nd smallest now not in d21\n\td12 = min(d12, d22); // nor in d22\n\td12 = min(d12, d31); // nor in d31\n\td12 = min(d12, d32); // nor in d32\n\td11.yz = min(d11.yz,d12.xy); // nor in d12.yz\n\td11.y = min(d11.y,d12.z); // Only two more to go\n\td11.y = min(d11.y,d11.z); // Done! (Phew!)\n\treturn sqrt(d11.xy); // F1, F2\n\n}\n\n        vec3 cellular( vec3 pos, float scale, float jitter, float mode, float strength ) {\n          vec2 w = worley( pos, jitter, false );\n          vec3 o;\n          if( mode == 0. ) {\n            o = vec3( w.x );\n          } else if ( mode == 1. ) {\n            o = vec3( w.y );\n          } else{\n            o = vec3( w.y - w.x );\n          }\n\n          return o * strength;\n        }\n\n        vec3 cellular2d( vec2 st, float scale, vec3 mod, float jitter, float mode, float strength, float time ) {\n          return cellular( vec3((st+mod.xy) * scale, time), nor, scale, jitter, mode, strength );\n        }\n    ",""]),
    parameters: [
      { name:'scale', type:'float', default:1 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'jitter', type:'float', default:1 },
      { name:'type',  type:'float', default: 0 },
      { name:'strength', type:'float', default:2 },
      { name:'time', type:'float', default:1 }
    ],     
  },

  voronoi: {
    name:'voronoi',
    parameters: [
      { name:'scale', type:'float', default:1 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'res', type:'float', default:100 },
      { name:'time', type:'float', default:1 },
      { name:'mode', type:'float', default:0 }
    ],
    glsl:`
    vec3 voronoi_hash(vec3 p) {
      return fract(
          sin(vec3(dot(p, vec3(1.0, 57.0, 113.0)), dot(p, vec3(57.0, 113.0, 1.0)),
                   dot(p, vec3(113.0, 1.0, 57.0)))) *
          43758.5453);
    }

    vec3 voronoi_3d(const in vec3 x, float _res ) {
      vec3 p = floor(x);
      vec3 f = fract(x);

      float id = 0.0;
      vec2 res = vec2( _res );
      for (int k = -1; k <= 1; k++) {
        for (int j = -1; j <= 1; j++) {
          for (int i = -1; i <= 1; i++) {
            vec3 b = vec3(float(i), float(j), float(k));
            vec3 r = vec3(b) - f + voronoi_hash(p + b);
            float d = dot(r, r);

            float cond = max(sign(res.x - d), 0.0);
            float nCond = 1.0 - cond;

            float cond2 = nCond * max(sign(res.y - d), 0.0);
            float nCond2 = 1.0 - cond2;

            id = (dot(p + b, vec3(1.0, 57.0, 113.0)) * cond) + (id * nCond);
            res = vec2(d, res.x) * cond + res * nCond;

            res.y = cond2 * d + nCond2 * res.y;
          }
        }
      }

      return vec3(sqrt(res), abs(id));
    }

    vec3 voronoi( vec3 pos, float scale, vec3 mod, float res, float time, float mode ) {
      vec3 v = voronoi_3d( (pos+mod) * scale, res );
      vec3 fin;
      if( mode == 0. ) fin = vec3(v.x);
      if( mode == 1. ) fin = vec3(v.y);
      if( mode == 2. ) fin = vec3(v.y - v.x); 

      return fin;
    }
`,
    glsl2d:glsl(["#define GLSLIFY 1\n    \n    vec3 voronoi_hash(vec3 p) {\n      return fract(\n          sin(vec3(dot(p, vec3(1.0, 57.0, 113.0)), dot(p, vec3(57.0, 113.0, 1.0)),\n                   dot(p, vec3(113.0, 1.0, 57.0)))) * 43758.5453);\n    }\n\n    vec3 voronoi_3d(const in vec3 x, float _res ) {\n      vec3 p = floor(x);\n      vec3 f = fract(x);\n\n      float id = 0.0;\n      vec2 res = vec2( _res );\n      for (int k = -1; k <= 1; k++) {\n        for (int j = -1; j <= 1; j++) {\n          for (int i = -1; i <= 1; i++) {\n            vec3 b = vec3(float(i), float(j), float(k));\n            vec3 r = vec3(b) - f + voronoi_hash(p + b);\n            float d = dot(r, r);\n\n            float cond = max(sign(res.x - d), 0.0);\n            float nCond = 1.0 - cond;\n\n            float cond2 = nCond * max(sign(res.y - d), 0.0);\n            float nCond2 = 1.0 - cond2;\n\n            id = (dot(p + b, vec3(1.0, 57.0, 113.0)) * cond) + (id * nCond);\n            res = vec2(d, res.x) * cond + res * nCond;\n\n            res.y = cond2 * d + nCond2 * res.y;\n          }\n        }\n      }\n\n      return vec3(sqrt(res), abs(id));\n    }\n\n    vec3 voronoi2d( vec2 st, float scale, vec3 mod, float res, float time, float mode ) {\n      vec3 v = voronoi_3d( vec3((st+mod.xy) * scale, time), res );\n      vec3 fin;\n      if( mode == 0. ) fin = vec3(v.x);\n      if( mode == 1. ) fin = vec3(v.y);\n      if( mode == 2. ) fin = vec3(v.y - v.x); \n\n      return fin;\n    }\n\n",""]) ,
  },
  // adapted from https://thebookofshaders.com/edit.php#09/zigzag.frag
  zigzag: {
    name:'zigzag',
    glsl2d:`    
       vec2 mirrorTile(vec2 _st, float _zoom){
         _st *= _zoom;
         if (fract(_st.y * 0.5) > 0.5){
           _st.x = _st.x+0.5;
           _st.y = 1.0-_st.y;
         }
         return fract(_st);
       }

       float fillY(vec2 _st, float _pct,float _antia){
         return smoothstep( _pct-_antia, _pct, _st.y);
       }

       vec3 zigzag2d( vec2 st, float scale, vec3 mod, float time ) {
         st = mirrorTile((st+mod.xy)*vec2(1.,2.),scale);
         float x = st.x*2.;
         float a = floor(1.+sin(x*3.14));
         float b = floor(1.+sin((x+1.)*3.14));
         float f = fract(x);

         vec3 color = vec3( fillY(st,mix(a,b,f),0.01) ); 

         return vec3(color);
       }
` ,
    parameters: [
      { name:'scale', type:'float', default:5 },
      { name:'uv',  type:'vec3', default:[0,0,0] },
      { name:'time', type:'float', default:1 }
    ],
  }
}

module.exports = textures

},{"glslify":178}],27:[function(require,module,exports){
module.exports = `
    // p = point on surface, p0 = object center
    vec2 getUVCubic(vec3 p ){
      vec3 absp = abs(p);
        
      // First conditional: If the point is in one of the sextants to the 
      // left or right of the x-axis, the uv cordinate will be (0.5*p.zy)/(p.x).
      // If you trace a line out to a zy plane that is 0.5 units from the zero origin,  
      // (0.5*p.xyz)/(p.x) will be the result, and
      // the yz components will be our uv coordinates, hence (0.5*p.zy)/(p.x).

      vec2 uv = ((absp.x>=absp.y)&&(absp.x>=absp.z)) 
        ? (0.5*p.zy)/(p.x) 
        : ((absp.y>=absp.z)&&(absp.y>=absp.x)) ? (0.5*p.xz)/(p.y) : (-0.5*p.xy)/(p.z);

      //We still need to determine which side our uv cordinates are on so
      //that the texture orients the right way. Note that there's some 
      // redundancy there, which I'll fix at some stage. For now, it works, so I'm not touching it. :)
      if( ((p.x<0.)&&(absp.x>=absp.y)&&(absp.x>=absp.z)) 
       || ((p.y<0.)&&(absp.y>=absp.z)&&(absp.y>=absp.x)) 
       || ((p.z>0.)&&(absp.z>=absp.x)&&(absp.z>=absp.y)) ) uv.y*=-1.;
             
      // Mapping the uv range from [-0.5, 0.5] to [0.0, 1.0].
      return (uv+0.5);
    }
    vec4 triplanar(vec3 n, vec4 texx, vec4 texy, vec4 texz, bool adjust3d, bool rescale) {
      //if (doflipz) n.z = -n.z;
      if (rescale) {
        texx = 2.0*texx - 1.0;
        texy = 2.0*texy - 1.0;
        texz = 2.0*texz - 1.0;
      }
      if (adjust3d) {
        texx.x *= sign(n.x);
        texy.y *= sign(n.y);
        texz.z *= sign(n.z);
      }
      //if (justtexy) return texy;
      vec3 weights = abs(n);
      //if (doweightcorrection) weights /= dot(weights,vec3(1)); // Keep spherical!
        return mat4(texx,texy,texz,vec4(0))*vec4(weights,0);
    } 
    `
/*
module.exports = `vec3 t3(sampler2D tex, vec3 p, vec3 n)
{
  mat3 R = mat3(vec3(cos(T),sin(T),0),vec3(-sin(T),cos(T),0),vec3(0,0,-1));
  p *= R/8.0;
  n *= R;
  #ifdef Smooth
  return  (texture(tex,p.xy).rgb*n.z*n.z
    +texture(tex,p.zy).rgb*n.x*n.x
    +texture(tex,p.xz).rgb*n.y*n.y);
  #else
    return (texture(tex,p.xy).rgb
      +texture(tex,p.zy).rgb
      +texture(tex,p.xz).rgb)/3.0;
    #endif
    }`
    */

},{}],28:[function(require,module,exports){
const { param_wrap, MaterialID } = require( './utils.js' )
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc }  = require( './var.js' )
const Matrix = require( './external/matrix.js' )
window.Matrix = Matrix
const MatrixWrap = function ( shouldInvert = false ) {
  const m = Object.create( MatrixWrap.prototype )
  m.dirty = true
  m.translation = {}
  m.scale = {}
  m.shouldInvert = shouldInvert
  m.rotation = {
    axis: {}
  }
  m.parent = null

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

  let rx = 0, ry = 0, rz = 0
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

  m.__rotations = []
  m.__id   = VarAlloc.alloc()  
  m.__dirty = function() {}
  m.__data = Matrix.identity()
  m.__Matrix = Matrix
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
		this.loc = gl.getUniformLocation( program, this.varName )
		this.loc_scale = gl.getUniformLocation( program, this.varName+'_scale' )
	},	

	upload_data(gl) {
		if( !this.dirty ) return
		
    this.internal()

    if( this.shouldInvert === true ) {
      const inverse = Matrix.inverse( this.__data )
      gl.uniformMatrix4fv( this.loc, false, inverse.m )
    }else{
      gl.uniformMatrix4fv( this.loc, false, this.__data.m )
    }
    //gl.uniform3f(this.loc_scale, this.scale.x, this.scale.y, this.scale.z )
    
    // scaling must be sent as separate uniform to avoid sdf over-estimation 
    gl.uniform1f(this.loc_scale, this.scale )

		this.dirty = false
  },


  internal() {
    this.__data = Matrix.identity()
    if( this.parent != null ) this.__data = this.parent.__data

    this.__data = this.__data.multiply( Matrix.translate( this.translation.x, this.translation.y, this.translation.z ) ) 

    // handle cumulative rotations via .rotateBy() method
    this.__rotations.forEach( r => this.__data = this.__data.multiply( r ) )

    // handle absolute rotations via .rotate() method... should this be aliased to rotateTo() ?
    this.__data = this.__data.multiply( Matrix.rotate( this.rotation.angle, this.rotation.axis.x, this.rotation.axis.y, this.rotation.axis.z ) )

    this.__data = this.__data.multiply( Matrix.scale( this.scale, this.scale, this.scale ) )
  },

  invert( shouldInvert = true) {
    this.shouldInvert = shouldInvert
    this.dirty = true
  },

  apply( transform = null, shouldInvert = false ) {
    this.parent = transform
    this.dirty = true
  } 

}

module.exports = MatrixWrap

},{"./external/matrix.js":9,"./utils.js":29,"./var.js":30}],29:[function(require,module,exports){
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
    val = Vec3( val[0], val[1] || val[0], val[2] || val[0] )

  return val
}

module.exports = { param_wrap, MaterialID, processVec2, processVec3 }

},{"./var.js":30,"./vec.js":31}],30:[function(require,module,exports){
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

const Var = function( value, fixedName = null, __type ) {
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
      r: {
        get() { return this.value.x },
        set(v){ this.value.x = v; this.dirty = true }
      },
      g: {
        get() { return this.value.y },
        set(v){ this.value.y = v; this.dirty = true }
      },
      b: {
        get() { return this.value.z },
        set(v){ this.value.z = v; this.dirty = true }
      },
    })
  }

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

function vec2_var_gen(x, y,name=null) { 
  return ()=> Var( Vec2(x, y), name  ) 
}

function vec3_var_gen(x=0, y, z,name=null) { 
  return ()=> Var( Vec3(x, y, z), name ) 
}

function vec4_var_gen( x, y, z, w, name=null ) { 
  return Var( Vec4( x, y, z, w ), name ) 
}
//function float_var_gen(x,name=null) { return ()=> { return Var( float(x), name, 'float' ) } }

//function vec2_var_gen(x, y,name=null) { return ()=> Var( Vec2(x, y), name  ) }

//function vec3_var_gen(x, y, z,name=null) { return ()=> Var( Vec3(x, y, z), name ) }

//function vec4_var_gen( x, y, z, w, name=null ) { return Var( Vec4( x, y, z, w ), name ) }

module.exports = { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc }

/*function float_var_gen(x,name=null) { return ()=> { return Var( float(x), name, 'float' ) } }

function vec2_var_gen(x, y,name=null) { 
  if( y === undefined ) y = x
  return ()=> Var( Vec2(x, y), name  ) 
}

function vec3_var_gen(x, y, z,name=null) { 
  if( y === undefined ) y = x
  if( z === undefined ) z = x
  return ()=> Var( Vec3(x, y, z), name ) 
}

function vec4_var_gen( x, y, z, w, name=null ) { 
  if( y === undefined ) y = x
  if( z === undefined ) z = x
  if( w === undefined ) w = x
  return Var( Vec4( x, y, z, w ), name ) 
}
*/

},{"./float.js":10,"./int.js":13,"./vec.js":31}],31:[function(require,module,exports){
const Vec2 = function (x=0, y=0) {
  if( x.type === 'vec2' ) return x  
  const v = Object.create( Vec2.prototype )
  if( Array.isArray( x ) ) {
    v.x = x[0]; v.y = x[1]; 
  } else if( y === undefined ) {
    v.x = v.y = x
  }else{
    v.x = x; v.y = y; 
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
    v.x = x[0]; v.y = x[1]; v.z = x[2]; 
  } else if( y === undefined && z === undefined) {
    v.x = v.y = v.z = x
  }else{
    v.x = x; v.y = y; v.z = z;
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

},{}],32:[function(require,module,exports){
const SceneNode = require( './sceneNode.js' ),
      { param_wrap, MaterialID } = require( './utils.js' ),
      { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc } = require( './var.js' )

const Vignette = function( Scene, SDF ) {

  const Vgn = function( radius=0.1, smoothness=16 ) {
    const vgn = Object.create( Vgn.prototype )
    const __radius = param_wrap( radius, float_var_gen( radius ) )  
    
    Object.defineProperty( vgn, 'radius', {
      get() { return __radius },
      set( v ) {
        __radius.set( v )
      }
    })

    const __smoothness = param_wrap( smoothness, float_var_gen( smoothness ) )  
    
    Object.defineProperty( vgn, 'smoothness', {
      get() { return __smoothness },
      set( v ) {
        __smoothness.set( v )
      }
    })
    
    // this refers to the current scene via implicit binding in scene.js
    this.postprocessing.push( vgn )

    return this
  }

  Vgn.prototype = SceneNode()
 
  Object.assign( Vgn.prototype, {
    emit() {
      return `  color *= vignette( uv, ${this.radius.emit()}, ${this.smoothness.emit()} );`
    },
   
    emit_decl() {
      let str = this.radius.emit_decl() + this.smoothness.emit_decl()
      // taken from https://gist.github.com/r-lyeh-archived/170b53fcdc0e17afcf15
      // originally iq
      const preface = `  float vignette(vec2 uv, float radius, float smoothness) {
        return radius + 0.5*smoothness*uv.x*uv.y*(1.0-uv.x)*(1.0-uv.y); 
      }
  `
      if( SDF.memo.vgn === undefined ) {
        str = str + preface
        SDF.memo.vgn = true
      }else{
        str = ''
      }

      return str
    },

    update_location( gl, program ) {
      this.radius.update_location( gl, program )
      this.smoothness.update_location( gl, program )
    },

    upload_data( gl ) {
      this.radius.upload_data( gl )
      this.smoothness.upload_data( gl )
    }
  })

  return Vgn
}

module.exports = Vignette 

},{"./sceneNode.js":24,"./utils.js":29,"./var.js":30}],33:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeBuilder = exports.channelSamplerName = void 0;
const expr_1 = require("./exprs/expr");
const webglprogramloop_1 = require("./webglprogramloop");
const settings_1 = require("./settings");
/** @ignore */
const FRAG_SET = `  gl_FragColor = texture2D(uSampler, gl_FragCoord.xy / uResolution);\n`;
/** @ignore */
const SCENE_SET = `uniform sampler2D uSceneSampler;\n`;
/** @ignore */
const TIME_SET = `uniform mediump float uTime;\n`;
/** @ignore */
const MOUSE_SET = `uniform mediump vec2 uMouse;\n`;
/** @ignore */
const COUNT_SET = `uniform int uCount;\n`;
/** @ignore */
const BOILERPLATE = `#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D uSampler;
uniform mediump vec2 uResolution;\n`;
/**
 * returns the string name of the sampler uniform for code generation purposes
 * @param num channel number to sample from
 */
function channelSamplerName(num) {
    // texture 2 sampler has number 0 (0 and 1 are used for back buffer and scene)
    return num === -1 ? "uSampler" : `uBufferSampler${num}`;
}
exports.channelSamplerName = channelSamplerName;
/**
 * returns the string of the declaration of the sampler for code generation
 * purposes
 * @param num channel number to sample from
 */
function channelSamplerDeclaration(num) {
    return `uniform sampler2D ${channelSamplerName(num)};`;
}
/** class that manages generation and compilation of GLSL code */
class CodeBuilder {
    constructor(effectLoop) {
        this.calls = [];
        this.externalFuncs = new Set();
        this.uniformDeclarations = new Set();
        this.counter = 0;
        this.baseLoop = effectLoop;
        const buildInfo = {
            uniformTypes: {},
            externalFuncs: new Set(),
            exprs: [],
            // update me on change to needs
            needs: {
                centerSample: false,
                neighborSample: false,
                sceneBuffer: false,
                timeUniform: false,
                mouseUniform: false,
                passCount: false,
                extraBuffers: new Set(),
            },
        };
        this.addEffectLoop(effectLoop, 1, buildInfo);
        // add all the types to uniform declarations from the `BuildInfo` instance
        for (const name in buildInfo.uniformTypes) {
            const typeName = buildInfo.uniformTypes[name];
            this.uniformDeclarations.add(`uniform mediump ${typeName} ${name};`);
        }
        // add all external functions from the `BuildInfo` instance
        buildInfo.externalFuncs.forEach((func) => this.externalFuncs.add(func));
        this.totalNeeds = buildInfo.needs;
        this.exprs = buildInfo.exprs;
    }
    addEffectLoop(effectLoop, indentLevel, buildInfo, topLevel = true) {
        const needsLoop = !topLevel && effectLoop.loopInfo.num > 1;
        if (needsLoop) {
            const iName = "i" + this.counter;
            indentLevel++;
            const forStart = "  ".repeat(indentLevel - 1) +
                `for (int ${iName} = 0; ${iName} < ${effectLoop.loopInfo.num}; ${iName}++) {`;
            this.calls.push(forStart);
        }
        for (const e of effectLoop.effects) {
            if (e instanceof expr_1.Expr) {
                e.parse(buildInfo);
                this.calls.push("  ".repeat(indentLevel) + "gl_FragColor = " + e.sourceCode + ";");
                this.counter++;
            }
            else {
                this.addEffectLoop(e, indentLevel, buildInfo, false);
            }
        }
        if (needsLoop) {
            this.calls.push("  ".repeat(indentLevel - 1) + "}");
        }
    }
    /** generate the code and compile the program into a loop */
    compileProgram(gl, vShader, uniformLocs, shaders = []) {
        // set up the fragment shader
        const fShader = gl.createShader(gl.FRAGMENT_SHADER);
        if (fShader === null) {
            throw new Error("problem creating fragment shader");
        }
        const fullCode = BOILERPLATE +
            (this.totalNeeds.sceneBuffer ? SCENE_SET : "") +
            (this.totalNeeds.timeUniform ? TIME_SET : "") +
            (this.totalNeeds.mouseUniform ? MOUSE_SET : "") +
            (this.totalNeeds.passCount ? COUNT_SET : "") +
            Array.from(this.totalNeeds.extraBuffers)
                .map((n) => channelSamplerDeclaration(n))
                .join("\n") +
            "\n" +
            [...this.uniformDeclarations].join("\n") +
            "\n" +
            [...this.externalFuncs].join("\n") +
            "\n" +
            "void main() {\n" +
            (this.totalNeeds.centerSample ? FRAG_SET : "") +
            this.calls.join("\n") +
            "\n}";
        if (settings_1.settings.verbosity > 0)
            console.log(fullCode);
        gl.shaderSource(fShader, fullCode);
        gl.compileShader(fShader);
        // set up the program
        const program = gl.createProgram();
        if (program === null) {
            throw new Error("problem creating program");
        }
        gl.attachShader(program, vShader);
        gl.attachShader(program, fShader);
        shaders.push(fShader);
        const shaderLog = (name, shader) => {
            const output = gl.getShaderInfoLog(shader);
            if (output)
                console.log(`${name} shader info log\n${output}`);
        };
        shaderLog("vertex", vShader);
        shaderLog("fragment", fShader);
        gl.linkProgram(program);
        // we need to use the program here so we can get uniform locations
        gl.useProgram(program);
        // find all uniform locations and add them to the dictionary
        for (const expr of this.exprs) {
            for (const name in expr.uniformValChangeMap) {
                const location = gl.getUniformLocation(program, name);
                if (location === null) {
                    throw new Error("couldn't find uniform " + name);
                }
                // TODO enforce unique names in the same program
                if (uniformLocs[name] === undefined) {
                    uniformLocs[name] = { locs: [], counter: 0 };
                }
                // assign the name to the location
                uniformLocs[name].locs.push(location);
            }
        }
        // set the uniform resolution (every program has this uniform)
        const uResolution = gl.getUniformLocation(program, "uResolution");
        gl.uniform2f(uResolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
        if (this.totalNeeds.sceneBuffer) {
            // TODO allow for texture options for scene texture
            const location = gl.getUniformLocation(program, "uSceneSampler");
            // put the scene buffer in texture 1 (0 is used for the backbuffer)
            gl.uniform1i(location, 1 + settings_1.settings.offset);
        }
        // set all sampler uniforms
        for (const b of this.totalNeeds.extraBuffers) {
            const location = gl.getUniformLocation(program, channelSamplerName(b));
            // offset the texture location by 2 (0 and 1 are used for scene and original)
            gl.uniform1i(location, b + 2 + settings_1.settings.offset);
        }
        // set the default sampler if there is an offset
        if (settings_1.settings.offset !== 0) {
            const location = gl.getUniformLocation(program, "uSampler");
            gl.uniform1i(location, settings_1.settings.offset);
        }
        // TODO do we need to do this every time?
        // get attribute
        const position = gl.getAttribLocation(program, "aPosition");
        // enable the attribute
        gl.enableVertexAttribArray(position);
        // points to the vertices in the last bound array buffer
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        return new webglprogramloop_1.WebGLProgramLoop(new webglprogramloop_1.WebGLProgramLeaf(program, this.totalNeeds, this.exprs), this.baseLoop.loopInfo, gl);
    }
}
exports.CodeBuilder = CodeBuilder;

},{"./exprs/expr":47,"./settings":86,"./webglprogramloop":88}],34:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.a1 = exports.Arity1HomogenousExpr = void 0;
const expr_1 = require("./expr");
/** @ignore */
function genArity1SourceList(name, val) {
    return {
        sections: [name + "(", ")"],
        values: [val],
    };
}
/** arity 1 homogenous function expression */
class Arity1HomogenousExpr extends expr_1.Operator {
    constructor(val, operation) {
        super(val, genArity1SourceList(operation, val), ["uVal"]);
        this.val = val;
    }
    /** set the value being passed into the arity 1 homogenous function */
    setVal(val) {
        this.setUniform("uVal" + this.id, val);
        this.val = expr_1.wrapInValue(val);
    }
}
exports.Arity1HomogenousExpr = Arity1HomogenousExpr;
/**
 * built-in functions that take in one `genType x` and return a `genType x`
 * @param name function name (see [[Arity1HomogenousName]] for valid function names)
 * @param val the `genType x` argument
 */
function a1(name, val) {
    return new Arity1HomogenousExpr(expr_1.wrapInValue(val), name);
}
exports.a1 = a1;

},{"./expr":47}],35:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.a2 = exports.Arity2HomogenousExpr = void 0;
const expr_1 = require("./expr");
// note: glsl has atan(y/x) as well as atan(y, x)
/** @ignore */
function genArity1SourceList(name, val1, val2) {
    return {
        sections: [name + "(", ",", ")"],
        values: [val1, val2],
    };
}
/** arity 2 homogenous function expression */
class Arity2HomogenousExpr extends expr_1.Operator {
    constructor(name, val1, val2) {
        super(val1, genArity1SourceList(name, val1, val2), ["uVal1", "uVal2"]);
        this.val1 = val1;
        this.val2 = val2;
    }
    /** set the first value being passed into the arity 2 homogenous function */
    setFirstVal(val1) {
        this.setUniform("uVal1" + this.id, val1);
        this.val1 = expr_1.wrapInValue(val1);
    }
    /** set the second value being passed into the arity 2 homogenous function */
    setSecondVal(val2) {
        this.setUniform("uVal2" + this.id, val2);
        this.val2 = expr_1.wrapInValue(val2);
    }
}
exports.Arity2HomogenousExpr = Arity2HomogenousExpr;
// implementation
/**
 * built-in functions that take in two `genType x` arguments and return a `genType x`
 * @param name function name (see [[Arity2HomogenousName]] for valid function names)
 * @param val1 the first `genType x` argument
 * @param val2 the second `genType x` argument
 */
function a2(name, val1, val2) {
    return new Arity2HomogenousExpr(name, expr_1.wrapInValue(val1), expr_1.wrapInValue(val2));
}
exports.a2 = a2;

},{"./expr":47}],36:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bloom = exports.BloomLoop = void 0;
const mergepass_1 = require("../mergepass");
const arity2_1 = require("./arity2");
const blurexpr_1 = require("./blurexpr");
const brightnessexpr_1 = require("./brightnessexpr");
const channelsampleexpr_1 = require("./channelsampleexpr");
const contrastexpr_1 = require("./contrastexpr");
const expr_1 = require("./expr");
const fragcolorexpr_1 = require("./fragcolorexpr");
const opexpr_1 = require("./opexpr");
const vecexprs_1 = require("./vecexprs");
// TODO bloom uses `input` so it has to be the first
// TODO maybe a way to update the scene buffer?
/** bloom loop */
class BloomLoop extends mergepass_1.EffectLoop {
    constructor(threshold = expr_1.float(expr_1.mut(0.4)), horizontal = expr_1.float(expr_1.mut(1)), vertical = expr_1.float(expr_1.mut(1)), boost = expr_1.float(expr_1.mut(1.3)), samplerNum = 1, taps = 9, reps = 3) {
        const bright = expr_1.cfloat(expr_1.tag `((${channelsampleexpr_1.channel(samplerNum)}.r + ${channelsampleexpr_1.channel(samplerNum)}.g + ${channelsampleexpr_1.channel(samplerNum)}.b) / 3.)`);
        const step = arity2_1.a2("step", bright, threshold);
        const col = expr_1.cvec4(expr_1.tag `vec4(${channelsampleexpr_1.channel(samplerNum)}.rgb * (1. - ${step}), 1.)`);
        const list = [
            mergepass_1.loop([col]).target(samplerNum),
            mergepass_1.loop([
                blurexpr_1.gauss(vecexprs_1.vec2(horizontal, 0), taps),
                blurexpr_1.gauss(vecexprs_1.vec2(0, vertical), taps),
                brightnessexpr_1.brightness(0.1),
                contrastexpr_1.contrast(boost),
            ], reps).target(samplerNum),
            opexpr_1.op(fragcolorexpr_1.fcolor(), "+", channelsampleexpr_1.channel(samplerNum)),
        ];
        super(list, { num: 1 });
        this.threshold = threshold;
        this.horizontal = horizontal;
        this.vertical = vertical;
        this.boost = boost;
    }
    /**
     * set the horizontal stretch of the blur effect (no greater than 1 for best
     * effect)
     */
    setHorizontal(num) {
        if (!(this.horizontal instanceof expr_1.BasicFloat))
            throw new Error("horizontal expression not basic float");
        this.horizontal.setVal(num);
    }
    /**
     * set the vertical stretch of the blur effect (no greater than 1 for best
     * effect)
     */
    setVertical(num) {
        if (!(this.vertical instanceof expr_1.BasicFloat))
            throw new Error("vertical expression not basic float");
        this.vertical.setVal(num);
    }
    /** set the treshold */
    setThreshold(num) {
        if (!(this.threshold instanceof expr_1.BasicFloat))
            throw new Error("threshold expression not basic float");
        this.threshold.setVal(num);
    }
    /** set the contrast boost */
    setBoost(num) {
        if (!(this.boost instanceof expr_1.BasicFloat))
            throw new Error("boost expression not basic float");
        this.boost.setVal(num);
    }
}
exports.BloomLoop = BloomLoop;
/**
 * creates a bloom loop
 * @param threshold values below this brightness don't get blurred (0.4 is
 * about reasonable, which is also the default)
 * @param horizontal how much to blur vertically (defaults to 1 pixel)
 * @param vertical how much to blur horizontally (defaults to 1 pixel)
 * @param taps how many taps for the blur (defaults to 9)
 * @param reps how many times to loop the blur (defaults to 3)
 */
function bloom(threshold, horizontal, vertical, boost, samplerNum, taps, reps) {
    return new BloomLoop(expr_1.wrapInValue(threshold), expr_1.wrapInValue(horizontal), expr_1.wrapInValue(vertical), expr_1.wrapInValue(boost), samplerNum, taps, reps);
}
exports.bloom = bloom;

},{"../mergepass":85,"./arity2":35,"./blurexpr":38,"./brightnessexpr":39,"./channelsampleexpr":41,"./contrastexpr":42,"./expr":47,"./fragcolorexpr":48,"./opexpr":65,"./vecexprs":81}],37:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blur2d = exports.Blur2dLoop = void 0;
const mergepass_1 = require("../mergepass");
const blurexpr_1 = require("./blurexpr");
const expr_1 = require("./expr");
const vecexprs_1 = require("./vecexprs");
/** 2D blur loop */
class Blur2dLoop extends mergepass_1.EffectLoop {
    constructor(horizontal = expr_1.float(expr_1.mut(1)), vertical = expr_1.float(expr_1.mut(1)), reps = 2, taps, samplerNum) {
        const side = blurexpr_1.gauss(vecexprs_1.vec2(horizontal, 0), taps, samplerNum);
        const up = blurexpr_1.gauss(vecexprs_1.vec2(0, vertical), taps, samplerNum);
        super([side, up], { num: reps });
        this.horizontal = horizontal;
        this.vertical = vertical;
    }
    /**
     * set the horizontal stretch of the blur effect (no greater than 1 for best
     * effect)
     */
    setHorizontal(num) {
        if (!(this.horizontal instanceof expr_1.BasicFloat))
            throw new Error("horizontal expression not basic float");
        this.horizontal.setVal(num);
    }
    /**
     * set the vertical stretch of the blur effect (no greater than 1 for best
     * effect)
     */
    setVertical(num) {
        if (!(this.vertical instanceof expr_1.BasicFloat))
            throw new Error("vertical expression not basic float");
        this.vertical.setVal(num);
    }
}
exports.Blur2dLoop = Blur2dLoop;
/**
 * creates a loop that runs a horizontal, then vertical gaussian blur (anything
 * more than 1 pixel in the horizontal or vertical direction will create a
 * ghosting effect, which is usually not desirable)
 * @param horizontalExpr float for the horizontal blur (1 pixel default)
 * @param verticalExpr float for the vertical blur (1 pixel default)
 * @param reps how many passes (defaults to 2)
 * @param taps how many taps (defaults to 5)
 * @param samplerNum change if you want to sample from a different channel and
 * the outer loop has a different target
 */
function blur2d(horizontalExpr, verticalExpr, reps, taps, samplerNum) {
    return new Blur2dLoop(expr_1.wrapInValue(horizontalExpr), expr_1.wrapInValue(verticalExpr), reps, taps, samplerNum);
}
exports.blur2d = blur2d;

},{"../mergepass":85,"./blurexpr":38,"./expr":47,"./vecexprs":81}],38:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gauss = exports.BlurExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
/** @ignore */
function genBlurSource(direction, taps) {
    return {
        sections: [`gauss${taps}(`, ")"],
        values: [direction],
    };
}
/** @ignore */
function tapsToFuncSource(taps) {
    switch (taps) {
        case 5:
            return glslfunctions_1.glslFuncs.gauss5;
        case 9:
            return glslfunctions_1.glslFuncs.gauss9;
        case 13:
            return glslfunctions_1.glslFuncs.gauss13;
    }
}
/** gaussian blur expression */
class BlurExpr extends expr_1.ExprVec4 {
    constructor(direction, taps = 5, samplerNum) {
        // this is already guaranteed by typescript, but creates helpful error for
        // use in gibber or anyone just using javascript
        if (![5, 9, 13].includes(taps)) {
            throw new Error("taps for gauss blur can only be 5, 9 or 13");
        }
        super(genBlurSource(direction, taps), ["uDirection"]);
        this.direction = direction;
        this.externalFuncs = [tapsToFuncSource(taps)];
        this.brandExprWithChannel(0, samplerNum);
    }
    /** set the blur direction (keep magnitude no greater than 1 for best effect) */
    setDirection(direction) {
        this.setUniform("uDirection" + this.id, direction);
        this.direction = direction;
    }
}
exports.BlurExpr = BlurExpr;
/**
 * creates expression that performs one pass of a gaussian blur
 * @param direction direction to blur (keep magnitude less than or equal to 1
 * for best effect)
 * @param taps number of taps (defaults to 5)
 * @param samplerNum which channel to sample from (default 0)
 */
function gauss(direction, taps = 5, samplerNum) {
    return new BlurExpr(direction, taps, samplerNum);
}
exports.gauss = gauss;

},{"../glslfunctions":83,"./expr":47}],39:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.brightness = exports.Brightness = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
const fragcolorexpr_1 = require("./fragcolorexpr");
/** brightness expression */
class Brightness extends expr_1.ExprVec4 {
    constructor(brightness, col = fragcolorexpr_1.fcolor()) {
        super(expr_1.tag `brightness(${brightness}, ${col})`, ["uBrightness", "uColor"]);
        this.brightness = brightness;
        this.externalFuncs = [glslfunctions_1.glslFuncs.brightness];
    }
    /** set the brightness (should probably be between -1 and 1) */
    setBrightness(brightness) {
        this.setUniform("uBrightness" + this.id, brightness);
        this.brightness = expr_1.wrapInValue(brightness);
    }
}
exports.Brightness = Brightness;
/**
 * changes the brightness of a color
 * @param val float for how much to change the brightness by (should probably be
 * between -1 and 1)
 * @param col the color to increase the brightness of (defaults to current
 * fragment color)
 */
function brightness(val, col) {
    return new Brightness(expr_1.wrapInValue(val), col);
}
exports.brightness = brightness;

},{"../glslfunctions":83,"./expr":47,"./fragcolorexpr":48}],40:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changecomp = exports.ChangeCompExpr = void 0;
const expr_1 = require("./expr");
const getcompexpr_1 = require("./getcompexpr");
/** @ignore */
function getChangeFunc(typ, id, setter, comps, op = "") {
    return `${typ} changecomp_${id}(${typ} col, ${setter.typeString()} setter) {
  col.${comps} ${op}= setter;
  return col;
}`;
}
/**
 * throws a runtime error if component access is not valid, and disallows
 * duplicate components because duplicate components can not be in a left
 * expression. (for example `v.xyx = vec3(1., 2., 3.)` is illegal, but `v1.xyz
 * = v2.xyx` is legal.) also checks for type errors such as `v1.xy = vec3(1.,
 * 2., 3.)`; the right hand side can only be a `vec2` if only two components
 * are supplied
 * @param comps component string
 * @param setter how the components are being changed
 * @param vec the vector where components are being accessed
 */
function checkChangeComponents(comps, setter, vec) {
    // setter has different length than components
    if (comps.length !== getcompexpr_1.typeStringToLength(setter.typeString())) {
        throw new Error("components length must be equal to the target float/vec");
    }
    // duplicate components
    if (duplicateComponents(comps)) {
        throw new Error("duplicate components not allowed on left side");
    }
    // legal components
    getcompexpr_1.checkLegalComponents(comps, vec);
}
/** @ignore */
function duplicateComponents(comps) {
    return new Set(comps.split("")).size !== comps.length;
}
/** change component expression */
class ChangeCompExpr extends expr_1.Operator {
    constructor(vec, setter, comps, op) {
        checkChangeComponents(comps, setter, vec);
        // part of name of custom function
        const operation = op === "+"
            ? "plus"
            : op === "-"
                ? "minus"
                : op === "*"
                    ? "mult"
                    : op === "/"
                        ? "div"
                        : "assign";
        const suffix = `${vec.typeString()}_${setter.typeString()}_${comps}_${operation}`;
        super(vec, { sections: [`changecomp_${suffix}(`, ", ", ")"], values: [vec, setter] }, ["uOriginal", "uNew"]);
        this.originalVec = vec;
        this.newVal = setter;
        this.externalFuncs = [
            getChangeFunc(vec.typeString(), suffix, setter, comps, op),
        ];
    }
    /** set the original vector */
    setOriginal(originalVec) {
        this.setUniform("uOriginal" + this.id, originalVec);
        this.originalVec = originalVec;
    }
    /** set the neww vector */
    setNew(newVal) {
        this.setUniform("uNew" + this.id, newVal);
        this.newVal = expr_1.wrapInValue(newVal);
    }
}
exports.ChangeCompExpr = ChangeCompExpr;
/**
 * change the components of a vector
 * @param vec the vector to augment components of
 * @param setter the vector (or float, if only one component is changed) for
 * how to change the components
 * @param comps string representing the components to change (e.g. `"xy"` or
 * `"r"` or `"stpq"`.)
 * @param op optionally perform an operation on the original component
 * (defaults to no operation, just assigning that component to a new value)
 */
function changecomp(vec, setter, comps, op) {
    return new ChangeCompExpr(vec, expr_1.wrapInValue(setter), comps, op);
}
exports.changecomp = changecomp;

},{"./expr":47,"./getcompexpr":52}],41:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.channel = exports.ChannelSampleExpr = void 0;
const codebuilder_1 = require("../codebuilder");
const expr_1 = require("./expr");
const normfragcoordexpr_1 = require("./normfragcoordexpr");
const glslfunctions_1 = require("../glslfunctions");
/** @ignore */
function genChannelSampleSource(buf, coord) {
    return {
        sections: ["channel(", `, ${codebuilder_1.channelSamplerName(buf)})`],
        values: [coord],
    };
}
// TODO create a way to sample but not clamp by region
/** channel sample expression */
class ChannelSampleExpr extends expr_1.ExprVec4 {
    constructor(buf, coord = normfragcoordexpr_1.pos()) {
        super(genChannelSampleSource(buf, coord), ["uVec"]);
        this.coord = coord;
        this.externalFuncs = [glslfunctions_1.glslFuncs.channel];
        if (buf !== -1)
            this.needs.extraBuffers = new Set([buf]);
        else
            this.needs.neighborSample = true;
    }
    setCoord(coord) {
        this.setUniform("uVec", coord);
        this.coord = coord;
    }
}
exports.ChannelSampleExpr = ChannelSampleExpr;
/**
 * creates an expression that samples from one of the user-defined channels.
 * don't sample from the same channel that you are using [[target]] on in a
 * loop, just use [[fcolor]]
 * @param channel which channel to sample from
 * @param vec where to sample the channel texture (defaults to the normalized
 * frag coord)
 */
function channel(channel, vec) {
    return new ChannelSampleExpr(channel, vec);
}
exports.channel = channel;

},{"../codebuilder":33,"../glslfunctions":83,"./expr":47,"./normfragcoordexpr":63}],42:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contrast = exports.ContrastExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
const fragcolorexpr_1 = require("./fragcolorexpr");
class ContrastExpr extends expr_1.ExprVec4 {
    constructor(contrast, col = fragcolorexpr_1.fcolor()) {
        super(expr_1.tag `contrast(${contrast}, ${col})`, ["uVal", "uCol"]);
        this.contrast = contrast;
        this.externalFuncs = [glslfunctions_1.glslFuncs.contrast];
    }
    /** sets the contrast */
    setContrast(contrast) {
        this.setUniform("uContrast" + this.id, contrast);
        this.contrast = expr_1.wrapInValue(contrast);
    }
}
exports.ContrastExpr = ContrastExpr;
/**
 * changes the contrast of a color
 * @param val float for how much to change the contrast by (should probably be
 * between -1 and 1)
 * @param col the color to increase the contrast of (defaults to current
 * fragment color)
 */
function contrast(val, col) {
    return new ContrastExpr(expr_1.wrapInValue(val), col);
}
exports.contrast = contrast;

},{"../glslfunctions":83,"./expr":47,"./fragcolorexpr":48}],43:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.depth2occlusion = exports.DepthToOcclusionExpr = void 0;
const channelsampleexpr_1 = require("./channelsampleexpr");
const expr_1 = require("./expr");
const vecexprs_1 = require("./vecexprs");
/** depth info to occlussion info expression */
class DepthToOcclusionExpr extends expr_1.ExprVec4 {
    constructor(depthCol = channelsampleexpr_1.channel(0), newCol = expr_1.mut(vecexprs_1.pvec4(1, 1, 1, 1)), threshold = expr_1.mut(expr_1.pfloat(0.01))) {
        super(expr_1.tag `depth2occlusion(${depthCol}, ${newCol}, ${threshold})`, [
            "uDepth",
            "uNewCol",
            "uThreshold",
        ]);
        this.depthCol = depthCol;
        this.newCol = newCol;
        this.threshold = threshold;
    }
    setDepthColor(depthCol) {
        this.setUniform("uDepth" + this.id, depthCol);
        this.depthCol = depthCol;
    }
    setNewColor(newCol) {
        this.setUniform("uNewCol" + this.id, newCol);
        this.newCol = newCol;
    }
    setThreshold(threshold) {
        this.setUniform("uThreshold" + this.id, threshold);
        this.threshold = expr_1.wrapInValue(threshold);
    }
}
exports.DepthToOcclusionExpr = DepthToOcclusionExpr;
/**
 * converts a `1 / distance` depth texture to an occlusion texture, with all
 * occluded geometry being rendered as black
 * @param depthCol the color representing the inverse depth (defaults to
 * sampling from channel 0)
 * @param newCol the color to replace unoccluded areas by (defaults to white
 * and is mutable by default)
 * @param threshold values below this are not occluded (set to something low,
 * like 0.1 or lower; defaults to 0.01 and is mutable by default)
 */
function depth2occlusion(depthCol, newCol, threshold) {
    return new DepthToOcclusionExpr(depthCol, newCol, expr_1.wrapInValue(threshold));
}
exports.depth2occlusion = depth2occlusion;

},{"./channelsampleexpr":41,"./expr":47,"./vecexprs":81}],44:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dof = exports.DoFLoop = void 0;
const mergepass_1 = require("../mergepass");
const arity2_1 = require("./arity2");
const blurexpr_1 = require("./blurexpr");
const channelsampleexpr_1 = require("./channelsampleexpr");
const expr_1 = require("./expr");
const gaussianexpr_1 = require("./gaussianexpr");
const getcompexpr_1 = require("./getcompexpr");
const opexpr_1 = require("./opexpr");
const vecexprs_1 = require("./vecexprs");
class DoFLoop extends mergepass_1.EffectLoop {
    constructor(depth = expr_1.mut(expr_1.pfloat(0.3)), rad = expr_1.mut(expr_1.pfloat(0.01)), depthInfo = getcompexpr_1.getcomp(channelsampleexpr_1.channel(0), "r"), reps = 2, taps = 13) {
        let guassianExpr = gaussianexpr_1.gaussian(depthInfo, depth, rad);
        const side = blurexpr_1.gauss(vecexprs_1.vec2(arity2_1.a2("pow", opexpr_1.op(1, "-", guassianExpr), 4), 0), taps);
        const up = blurexpr_1.gauss(vecexprs_1.vec2(0, arity2_1.a2("pow", opexpr_1.op(1, "-", guassianExpr), 4)), taps);
        super([side, up], { num: reps });
        this.gaussian = guassianExpr;
    }
    setDepth(depth) {
        // this translates the gaussian curve to the side
        this.gaussian.setA(depth);
    }
    setRadius(radius) {
        // this scales the gaussian curve to focus on a larger band of depth
        this.gaussian.setB(radius);
    }
}
exports.DoFLoop = DoFLoop;
/**
 * creates depth of field expression; all values are mutable by default
 * @param depth float for what inverse depth to focus on (1 on top of the
 * camera; 0 is infinity)
 * @param rad float for how deep the band of in-focus geometry is (a value
 * between 0.01 and 0.1 is reasonable)
 * @param depthInfo float the expression that represents the inverse depth
 * (defaults to sampling the red component from channel 0)
 * @param reps how many times to repeat the gaussian blur
 */
function dof(depth, rad, depthInfo, reps) {
    return new DoFLoop(expr_1.wrapInValue(depth), expr_1.wrapInValue(rad), expr_1.wrapInValue(depthInfo), reps);
}
exports.dof = dof;

},{"../mergepass":85,"./arity2":35,"./blurexpr":38,"./channelsampleexpr":41,"./expr":47,"./gaussianexpr":51,"./getcompexpr":52,"./opexpr":65,"./vecexprs":81}],45:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.edgecolor = exports.EdgeColorExpr = void 0;
const arity2_1 = require("./arity2");
const expr_1 = require("./expr");
const fragcolorexpr_1 = require("./fragcolorexpr");
const monochromeexpr_1 = require("./monochromeexpr");
const sobelexpr_1 = require("./sobelexpr");
const vecexprs_1 = require("./vecexprs");
/** edge color expression */
class EdgeColorExpr extends expr_1.WrappedExpr {
    constructor(color, samplerNum, stepped = true) {
        const expr = stepped
            ? expr_1.cvec4(expr_1.tag `mix(${color}, ${fragcolorexpr_1.fcolor()}, ${monochromeexpr_1.monochrome(arity2_1.a2("step", vecexprs_1.vec4(0.5, 0.5, 0.5, 0.0), sobelexpr_1.sobel(samplerNum)))})`)
            : expr_1.cvec4(expr_1.tag `mix(${color}, ${fragcolorexpr_1.fcolor()}, ${monochromeexpr_1.monochrome(sobelexpr_1.sobel(samplerNum))})`);
        super(expr);
        this.color = color;
        this.expr = expr;
    }
    setColor(color) {
        this.expr.setUniform("uCustomName0" + this.expr.id, color);
        this.color = color;
    }
}
exports.EdgeColorExpr = EdgeColorExpr;
/**
 * creates a colored edge detection expression
 * @param color what color to make the edge
 * @param samplerNum where to sample from
 * @param stepped whether to round the result of sobel edge detection (defaults
 * to true)
 */
function edgecolor(color, samplerNum, stepped) {
    return new EdgeColorExpr(color, samplerNum, stepped);
}
exports.edgecolor = edgecolor;

},{"./arity2":35,"./expr":47,"./fragcolorexpr":48,"./monochromeexpr":58,"./sobelexpr":76,"./vecexprs":81}],46:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.edge = exports.EdgeExpr = void 0;
const brightnessexpr_1 = require("./brightnessexpr");
const expr_1 = require("./expr");
const getcompexpr_1 = require("./getcompexpr");
const invertexpr_1 = require("./invertexpr");
const monochromeexpr_1 = require("./monochromeexpr");
const opexpr_1 = require("./opexpr");
const sobelexpr_1 = require("./sobelexpr");
class EdgeExpr extends expr_1.WrappedExpr {
    constructor(mult = expr_1.mut(-1.0), samplerNum) {
        const operator = opexpr_1.op(getcompexpr_1.getcomp(invertexpr_1.invert(monochromeexpr_1.monochrome(sobelexpr_1.sobel(samplerNum))), "r"), "*", mult);
        super(brightnessexpr_1.brightness(operator));
        this.mult = mult;
        this.operator = operator;
    }
    setMult(mult) {
        this.operator.setRight(mult);
        this.mult = expr_1.wrapInValue(mult);
    }
}
exports.EdgeExpr = EdgeExpr;
/**
 * returns an expression highlights edges where they appear
 * @param style `"dark"` for dark edges and `"light"` for light edges, or a
 * custom number or expression (between -1 and 1) for a more gray style of edge
 * @param samplerNum where to sample from
 */
function edge(style, samplerNum) {
    const mult = style === "dark" ? -1 : style === "light" ? 1 : style;
    return new EdgeExpr(expr_1.wrapInValue(mult), samplerNum);
}
exports.edge = edge;

},{"./brightnessexpr":39,"./expr":47,"./getcompexpr":52,"./invertexpr":56,"./monochromeexpr":58,"./opexpr":65,"./sobelexpr":76}],47:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tag = exports.wrapInValue = exports.pfloat = exports.Operator = exports.WrappedExpr = exports.ExprVec4 = exports.ExprVec3 = exports.ExprVec2 = exports.float = exports.ExprFloat = exports.BasicFloat = exports.ExprVec = exports.BasicVec4 = exports.BasicVec3 = exports.BasicVec2 = exports.BasicVec = exports.PrimitiveVec4 = exports.PrimitiveVec3 = exports.PrimitiveVec2 = exports.PrimitiveVec = exports.PrimitiveFloat = exports.Primitive = exports.mut = exports.Mutable = exports.cvec4 = exports.cvec3 = exports.cvec2 = exports.cfloat = exports.Expr = void 0;
const mergepass_1 = require("../mergepass");
const webglprogramloop_1 = require("../webglprogramloop");
const utils_1 = require("../utils");
/**
 * adds a `.` after a number if needed (e.g converts `1` to `"1."` but leaves
 * `1.2` as `"1.2"`)
 * @param num number to convert
 */
function toGLSLFloatString(num) {
    let str = "" + num;
    if (!str.includes("."))
        str += ".";
    return str;
}
class Expr {
    constructor(sourceLists, defaultNames) {
        // update me on change to needs
        this.needs = {
            neighborSample: false,
            centerSample: false,
            sceneBuffer: false,
            timeUniform: false,
            mouseUniform: false,
            passCount: false,
            extraBuffers: new Set(),
        };
        this.uniformValChangeMap = {};
        this.defaultNameMap = {};
        this.externalFuncs = [];
        this.sourceCode = "";
        this.funcIndex = 0;
        this.regionBranded = false;
        this.id = "_id_" + Expr.count;
        Expr.count++;
        if (sourceLists.sections.length - sourceLists.values.length !== 1) {
            // this cannot happen if you use `tag` to destructure a template string
            throw new Error("wrong lengths for source and values");
        }
        if (sourceLists.values.length !== defaultNames.length) {
            console.log(sourceLists);
            console.log(defaultNames);
            throw new Error("default names list length doesn't match values list length");
        }
        this.sourceLists = sourceLists;
        this.defaultNames = defaultNames;
    }
    applyUniforms(gl, uniformLocs) {
        for (const name in this.uniformValChangeMap) {
            const loc = uniformLocs[name];
            if (this.uniformValChangeMap[name].changed) {
                //this.uniformValChangeMap[name].changed = false;
                this.uniformValChangeMap[name].val.applyUniform(gl, loc.locs[loc.counter]);
            }
            // increment and reset the counter to wrap back around to first location
            loc.counter++;
            loc.counter %= loc.locs.length;
            // once we have wrapped then we know all uniforms have been changed
            if (loc.counter === 0) {
                this.uniformValChangeMap[name].changed = false;
            }
        }
    }
    getSampleNum(mult = 1) {
        return this.needs.neighborSample
            ? mult
            : this.sourceLists.values
                .map((v) => v.getSampleNum())
                .reduce((acc, curr) => acc + curr, 0) > 0
                ? mult
                : 0;
    }
    /**
     * set a uniform by name directly
     * @param name uniform name in the source code
     * @param newVal value to set the uniform to
     */
    setUniform(name, newVal) {
        var _a, _b;
        newVal = wrapInValue(newVal);
        const originalName = name;
        if (typeof newVal === "number") {
            newVal = wrapInValue(newVal);
        }
        if (!(newVal instanceof Primitive)) {
            throw new Error("cannot set a non-primitive");
        }
        // if name does not exist, try mapping default name to new name
        if (((_a = this.uniformValChangeMap[name]) === null || _a === void 0 ? void 0 : _a.val) === undefined) {
            name = this.defaultNameMap[name];
        }
        const oldVal = (_b = this.uniformValChangeMap[name]) === null || _b === void 0 ? void 0 : _b.val;
        if (oldVal === undefined) {
            throw new Error("tried to set uniform " +
                name +
                " which doesn't exist. original name: " +
                originalName);
        }
        if (oldVal.typeString() !== newVal.typeString()) {
            throw new Error("tried to set uniform " + name + " to a new type");
        }
        this.uniformValChangeMap[name].val = newVal;
        this.uniformValChangeMap[name].changed = true;
    }
    /**
     * parses this expression into a string, adding info as it recurses into
     * nested expressions
     */
    parse(buildInfo) {
        this.sourceCode = "";
        buildInfo.exprs.push(this);
        buildInfo.needs = webglprogramloop_1.updateNeeds(buildInfo.needs, this.needs);
        // add each of the external funcs to the builder
        this.externalFuncs.forEach((func) => buildInfo.externalFuncs.add(func));
        // put all of the values between all of the source sections
        for (let i = 0; i < this.sourceLists.values.length; i++) {
            this.sourceCode +=
                this.sourceLists.sections[i] +
                    this.sourceLists.values[i].parse(buildInfo, this.defaultNames[i], this);
        }
        // TODO does sourceCode have to be a member?
        this.sourceCode += this.sourceLists.sections[this.sourceLists.sections.length - 1];
        return this.sourceCode;
    }
    addFuncs(funcs) {
        this.externalFuncs.push(...funcs);
        return this;
    }
    brandExprWithChannel(funcIndex, samplerNum) {
        utils_1.brandWithChannel(this.sourceLists, this.externalFuncs, this.needs, funcIndex, samplerNum);
        return this;
    }
    brandExprWithRegion(space) {
        utils_1.brandWithRegion(this, this.funcIndex, space);
        for (const v of this.sourceLists.values) {
            v.brandExprWithRegion(space);
        }
        return this;
    }
}
exports.Expr = Expr;
/**
 * increments for each expression created; used to uniquely id each expression
 */
Expr.count = 0;
function genCustomNames(sourceLists) {
    const names = [];
    for (let i = 0; i < sourceLists.values.length; i++) {
        names.push("uCustomName" + i);
    }
    return names;
}
/** create a custom float function (use with [[tag]]) */
function cfloat(sourceLists, externalFuncs = []) {
    return new ExprFloat(sourceLists, genCustomNames(sourceLists)).addFuncs(externalFuncs);
}
exports.cfloat = cfloat;
/** create a custom vec2 function (use with [[tag]]) */
function cvec2(sourceLists, externalFuncs = []) {
    return new ExprVec2(sourceLists, genCustomNames(sourceLists)).addFuncs(externalFuncs);
}
exports.cvec2 = cvec2;
/** create a custom vec3 function (use with [[tag]]) */
function cvec3(sourceLists, externalFuncs = []) {
    return new ExprVec3(sourceLists, genCustomNames(sourceLists)).addFuncs(externalFuncs);
}
exports.cvec3 = cvec3;
/** create a custom vec4 function (use with [[tag]]) */
function cvec4(sourceLists, externalFuncs = []) {
    return new ExprVec4(sourceLists, genCustomNames(sourceLists)).addFuncs(externalFuncs);
}
exports.cvec4 = cvec4;
class Mutable {
    constructor(primitive, name) {
        this.primitive = primitive;
        this.name = name;
    }
    parse(buildInfo, defaultName, enc) {
        if (enc === undefined) {
            throw new Error("tried to put a mutable expression at the top level");
        }
        // accept the default name if given no name
        if (this.name === undefined)
            this.name = defaultName + enc.id;
        // set to true so they are set to their default values on first draw
        buildInfo.uniformTypes[this.name] = this.primitive.typeString();
        // add the name mapping
        enc.uniformValChangeMap[this.name] = {
            val: this.primitive,
            changed: true,
        };
        // add the new type to the map
        enc.defaultNameMap[defaultName + enc.id] = this.name;
        return this.name;
    }
    applyUniform(gl, loc) {
        this.primitive.applyUniform(gl, loc);
    }
    typeString() {
        return this.primitive.typeString();
    }
    getSampleNum() {
        return 0;
    }
    brandExprWithRegion(space) {
        return this;
    }
}
exports.Mutable = Mutable;
/**
 * makes a primitive value mutable. wrapping a [[PrimitiveVec]] or
 * [[PrimitiveFloat]] in [[mut]] before passing it into an expression will
 * allow you to use the setters on that expression to change those values at
 * runtime
 * @param val the primitive float or primitive vec to make mutable
 * @param name the optional name for the uniform
 */
function mut(val, name) {
    const primitive = typeof val === "number" ? wrapInValue(val) : val;
    return new Mutable(primitive, name);
}
exports.mut = mut;
class Primitive {
    parse() {
        return this.toString();
    }
    getSampleNum() {
        return 0;
    }
    brandExprWithRegion(space) {
        return this;
    }
}
exports.Primitive = Primitive;
class PrimitiveFloat extends Primitive {
    constructor(num) {
        if (!isFinite(num))
            throw new Error("number not finite");
        super();
        this.value = num;
    }
    toString() {
        let str = "" + this.value;
        if (!str.includes("."))
            str += ".";
        return str;
    }
    typeString() {
        return "float";
    }
    applyUniform(gl, loc) {
        gl.uniform1f(loc, this.value);
    }
}
exports.PrimitiveFloat = PrimitiveFloat;
class PrimitiveVec extends Primitive {
    constructor(comps) {
        super();
        this.values = comps;
    }
    typeString() {
        return ("vec" + this.values.length);
    }
    toString() {
        return `${this.typeString()}(${this.values
            .map((n) => toGLSLFloatString(n))
            .join(", ")})`;
    }
}
exports.PrimitiveVec = PrimitiveVec;
class PrimitiveVec2 extends PrimitiveVec {
    applyUniform(gl, loc) {
        gl.uniform2f(loc, this.values[0], this.values[1]);
    }
}
exports.PrimitiveVec2 = PrimitiveVec2;
class PrimitiveVec3 extends PrimitiveVec {
    applyUniform(gl, loc) {
        gl.uniform3f(loc, this.values[0], this.values[1], this.values[2]);
    }
}
exports.PrimitiveVec3 = PrimitiveVec3;
class PrimitiveVec4 extends PrimitiveVec {
    applyUniform(gl, loc) {
        gl.uniform4f(loc, this.values[0], this.values[1], this.values[2], this.values[3]);
    }
}
exports.PrimitiveVec4 = PrimitiveVec4;
class BasicVec extends Expr {
    constructor(sourceLists, defaultNames) {
        super(sourceLists, defaultNames);
        // this cast is fine as long as you only instantiate these with the
        // shorthand version and not the constructor
        const values = sourceLists.values;
        this.values = values;
        this.defaultNames = defaultNames;
    }
    typeString() {
        return ("vec" + this.values.length);
    }
    /** sets a component of the vector */
    setComp(index, primitive) {
        if (index < 0 || index >= this.values.length) {
            throw new Error("out of bounds of setting component");
        }
        this.setUniform(this.defaultNames[index] + this.id, wrapInValue(primitive));
    }
}
exports.BasicVec = BasicVec;
class BasicVec2 extends BasicVec {
    constructor() {
        super(...arguments);
        this.bvec2 = undefined; // brand for nominal typing
    }
}
exports.BasicVec2 = BasicVec2;
class BasicVec3 extends BasicVec {
    constructor() {
        super(...arguments);
        this.bvec3 = undefined; // brand for nominal typing
    }
}
exports.BasicVec3 = BasicVec3;
class BasicVec4 extends BasicVec {
    constructor() {
        super(...arguments);
        this.bvec4 = undefined; // brand for nominal typing
    }
}
exports.BasicVec4 = BasicVec4;
class ExprVec extends Expr {
    constructor(sourceLists, defaultNames) {
        super(sourceLists, defaultNames);
        const values = sourceLists.values;
        this.values = values;
        this.defaultNames = defaultNames;
    }
}
exports.ExprVec = ExprVec;
class BasicFloat extends Expr {
    constructor(sourceLists, defaultNames) {
        super(sourceLists, defaultNames);
        this.float = undefined; // brand for nominal typing
    }
    setVal(primitive) {
        this.setUniform("uFloat" + this.id, wrapInValue(primitive));
    }
    typeString() {
        return "float";
    }
}
exports.BasicFloat = BasicFloat;
class ExprFloat extends Expr {
    constructor(sourceLists, defaultNames) {
        super(sourceLists, defaultNames);
        this.float = undefined; // brand for nominal typing
    }
    setVal(primitive) {
        this.setUniform("uFloat" + this.id, wrapInValue(primitive));
    }
    typeString() {
        return "float";
    }
}
exports.ExprFloat = ExprFloat;
function float(value) {
    if (typeof value === "number")
        value = wrapInValue(value);
    return new BasicFloat({ sections: ["", ""], values: [value] }, ["uFloat"]);
}
exports.float = float;
class ExprVec2 extends ExprVec {
    constructor() {
        super(...arguments);
        this.vec2 = undefined; // brand for nominal typing
    }
    typeString() {
        return "vec2";
    }
}
exports.ExprVec2 = ExprVec2;
class ExprVec3 extends ExprVec {
    constructor() {
        super(...arguments);
        this.vec3 = undefined; // brand for nominal typing
    }
    typeString() {
        return "vec3";
    }
}
exports.ExprVec3 = ExprVec3;
class ExprVec4 extends ExprVec {
    constructor() {
        super(...arguments);
        this.vec4 = undefined; // brand for nominal typing
    }
    repeat(num) {
        return new mergepass_1.EffectLoop([this], { num: num });
    }
    genPrograms(gl, vShader, uniformLocs, shaders) {
        return new mergepass_1.EffectLoop([this], { num: 1 }).genPrograms(gl, vShader, uniformLocs, shaders);
    }
    typeString() {
        return "vec4";
    }
}
exports.ExprVec4 = ExprVec4;
class WrappedExpr {
    constructor(expr) {
        this.expr = expr;
    }
    typeString() {
        return this.expr.typeString();
    }
    parse(buildInfo, defaultName, enc) {
        return this.expr.parse(buildInfo, defaultName, enc);
    }
    getSampleNum() {
        return this.expr.getSampleNum();
    }
    brandExprWithRegion(space) {
        return this.expr.brandExprWithRegion(space);
    }
}
exports.WrappedExpr = WrappedExpr;
class Operator extends Expr {
    constructor(ret, sourceLists, defaultNames) {
        super(sourceLists, defaultNames);
        this.ret = ret;
    }
    typeString() {
        return this.ret.typeString();
    }
}
exports.Operator = Operator;
/** creates a primitive float */
function pfloat(num) {
    return new PrimitiveFloat(num);
}
exports.pfloat = pfloat;
function wrapInValue(num) {
    if (num === undefined)
        return undefined;
    if (typeof num === "number")
        return pfloat(num);
    return num;
}
exports.wrapInValue = wrapInValue;
/**
 * takes a template strings array and converts it to a source list; very useful
 * for [[cfloat]], [[cvec2]], [[cvec3]] and [[cvec4]]
 */
function tag(strings, ...values) {
    return { sections: strings.concat([]), values: values };
}
exports.tag = tag;

},{"../mergepass":85,"../utils":87,"../webglprogramloop":88}],48:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fcolor = exports.FragColorExpr = void 0;
const expr_1 = require("./expr");
/** fragment color expression */
class FragColorExpr extends expr_1.ExprVec4 {
    constructor() {
        super(expr_1.tag `gl_FragColor`, []);
        this.needs.centerSample = true;
    }
}
exports.FragColorExpr = FragColorExpr;
/** creates an expression that evaluates to the fragment color */
function fcolor() {
    return new FragColorExpr();
}
exports.fcolor = fcolor;

},{"./expr":47}],49:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pixel = exports.FragCoordExpr = void 0;
const expr_1 = require("./expr");
/** frag coord expression (xy components only) */
class FragCoordExpr extends expr_1.ExprVec2 {
    constructor() {
        super(expr_1.tag `gl_FragCoord.xy`, []);
    }
}
exports.FragCoordExpr = FragCoordExpr;
/**
 * creates an expression that evaluates to the frag coord in pixels (samplers
 * take normalized coordinates, so you might want [[nfcoord]] instead)
 */
function pixel() {
    return new FragCoordExpr();
}
exports.pixel = pixel;

},{"./expr":47}],50:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fxaa = void 0;
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
/** FXAA expression */
class FXAAExpr extends expr_1.ExprVec4 {
    constructor() {
        super(expr_1.tag `fxaa()`, []);
        this.externalFuncs = [glslfunctions_1.glslFuncs.fxaa];
        this.needs.neighborSample = true;
    }
}
/** FXAA antaliasing expression */
function fxaa() {
    return new FXAAExpr();
}
exports.fxaa = fxaa;

},{"../glslfunctions":83,"./expr":47}],51:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gaussian = exports.GaussianExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
/** gaussian expression */
class GaussianExpr extends expr_1.ExprFloat {
    constructor(x, a, b) {
        super(expr_1.tag `gaussian(${x}, ${a}, ${b})`, ["uFloatX", "uFloatA", "uFloatB"]);
        this.x = x;
        this.a = a;
        this.b = b;
        this.externalFuncs = [glslfunctions_1.glslFuncs.gaussian];
    }
    setX(x) {
        this.setUniform("uFloatX" + this.id, x);
        this.x = expr_1.wrapInValue(x);
    }
    setA(a) {
        this.setUniform("uFloatA" + this.id, a);
        this.a = expr_1.wrapInValue(a);
    }
    setB(b) {
        this.setUniform("uFloatB" + this.id, b);
        this.b = expr_1.wrapInValue(b);
    }
}
exports.GaussianExpr = GaussianExpr;
/**
 * gaussian function that defaults to normal distribution
 * @param x x position in the curve
 * @param a horizontal position of peak (defaults to 0 for normal distribution)
 * @param b horizontal stretch of the curve (defaults to 1 for normal distribution)
 */
function gaussian(x, a = 0, b = 1) {
    return new GaussianExpr(expr_1.wrapInValue(x), expr_1.wrapInValue(a), expr_1.wrapInValue(b));
}
exports.gaussian = gaussian;

},{"../glslfunctions":83,"./expr":47}],52:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get4comp = exports.get3comp = exports.get2comp = exports.getcomp = exports.Get4CompExpr = exports.Get3CompExpr = exports.Get2CompExpr = exports.GetCompExpr = exports.checkLegalComponents = exports.typeStringToLength = void 0;
const expr_1 = require("./expr");
// TODO this should probably be somewhere else
/** @ignore */
function typeStringToLength(str) {
    switch (str) {
        case "float":
            return 1;
        case "vec2":
            return 2;
        case "vec3":
            return 3;
        case "vec4":
            return 4;
    }
}
exports.typeStringToLength = typeStringToLength;
/** @ignore */
function genCompSource(vec, components) {
    return {
        sections: ["", "." + components],
        values: [vec],
    };
}
/**
 * checks if components accessing a vector are legal. components can be illegal
 * if they mix sets (e.g. `v.rgzw`) or contain characters outside of any set
 * (e.g. `v.lmno`)
 * @param comps components string
 * @param vec vector being accessed
 */
function checkLegalComponents(comps, vec) {
    const check = (range, domain) => {
        let inside = 0;
        let outside = 0;
        for (const c of range) {
            domain.includes(c) ? inside++ : outside++;
        }
        return inside === inside && !outside;
    };
    const inLen = typeStringToLength(vec.typeString());
    const rgbaCheck = check(comps, "rgba".substr(0, inLen));
    const xyzwCheck = check(comps, "xyzw".substr(0, inLen));
    const stpqCheck = check(comps, "stpq".substr(0, inLen));
    if (!(rgbaCheck || xyzwCheck || stpqCheck)) {
        throw new Error("component sets are mixed or incorrect entirely");
    }
}
exports.checkLegalComponents = checkLegalComponents;
/**
 * performs all validity checks of [[checkLegalComponents]] and checks if the
 * number of accessed components does not exceed the size of the vector being
 * assigned to
 * @param comps components string
 * @param outLen length of the resultant vector
 * @param vec vector being accessed
 */
function checkGetComponents(comps, outLen, vec) {
    if (comps.length > outLen)
        throw new Error("too many components");
    checkLegalComponents(comps, vec);
}
/** get component expression */
class GetCompExpr extends expr_1.ExprFloat {
    constructor(vec, comps) {
        checkGetComponents(comps, 1, vec);
        super(genCompSource(vec, comps), ["uVec1Min"]);
        this.vec1Min = vec;
    }
    setVec(vec) {
        this.setUniform("uVec1Min", vec);
        this.vec1Min = vec;
    }
}
exports.GetCompExpr = GetCompExpr;
/** get 2 components expression */
class Get2CompExpr extends expr_1.ExprVec2 {
    constructor(vec, comps) {
        checkGetComponents(comps, 2, vec);
        super(genCompSource(vec, comps), ["uVec2Min"]);
        this.vec2Min = vec;
    }
    setVec(vec) {
        this.setUniform("uVec2Min", vec);
        this.vec2Min = vec;
    }
}
exports.Get2CompExpr = Get2CompExpr;
/** get 3 components expression */
class Get3CompExpr extends expr_1.ExprVec3 {
    constructor(vec, comps) {
        checkGetComponents(comps, 3, vec);
        super(genCompSource(vec, comps), ["uVec3Min"]);
        this.vec3Min = vec;
    }
    setVec(vec) {
        this.setUniform("uVec3Min", vec);
        this.vec3Min = vec;
    }
}
exports.Get3CompExpr = Get3CompExpr;
/** get 3 components expression */
class Get4CompExpr extends expr_1.ExprVec4 {
    constructor(vec, comps) {
        checkGetComponents(comps, 4, vec);
        super(genCompSource(vec, comps), ["uVec4Min"]);
        this.vec4Min = vec;
    }
    setVec(vec) {
        this.setUniform("uVec4Min", vec);
        this.vec4Min = vec;
    }
}
exports.Get4CompExpr = Get4CompExpr;
/**
 * creates an expression that gets 1 component from a vector
 * @param vec the vector to get components of
 * @param comps components string
 */
function getcomp(vec, comps) {
    return new GetCompExpr(vec, comps);
}
exports.getcomp = getcomp;
/**
 * creates an expression that gets 2 components from a vector
 * @param vec the vector to get components of
 * @param comps components string
 */
function get2comp(vec, comps) {
    return new Get2CompExpr(vec, comps);
}
exports.get2comp = get2comp;
/**
 * creates an expression that gets 3 components from a vector
 * @param vec the vector to get components of
 * @param comps components string
 */
function get3comp(vec, comps) {
    return new Get3CompExpr(vec, comps);
}
exports.get3comp = get3comp;
/**
 * creates an expression that gets 4 components from a vector
 * @param vec the vector to get components of
 * @param comps components string
 */
function get4comp(vec, comps) {
    return new Get4CompExpr(vec, comps);
}
exports.get4comp = get4comp;

},{"./expr":47}],53:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.godrays = exports.GodRaysExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
const fragcolorexpr_1 = require("./fragcolorexpr");
const vecexprs_1 = require("./vecexprs");
/**
 * @ignore
 * the number of samples in the source code already
 */
const DEFAULT_SAMPLES = 100;
/** godrays expression */
class GodRaysExpr extends expr_1.ExprVec4 {
    // sane godray defaults from https://github.com/Erkaman/glsl-godrays/blob/master/example/index.js
    constructor(col = fragcolorexpr_1.fcolor(), exposure = expr_1.mut(1.0), decay = expr_1.mut(1.0), density = expr_1.mut(1.0), weight = expr_1.mut(0.01), lightPos = expr_1.mut(vecexprs_1.pvec2(0.5, 0.5)), samplerNum = 0, numSamples = DEFAULT_SAMPLES, convertDepth) {
        // TODO the metaprogramming here is not so good!
        // leaving off the function call section for now (we addd it back later)
        const sourceLists = expr_1.tag `${col}, ${exposure}, ${decay}, ${density}, ${weight}, ${lightPos}, ${convertDepth !== undefined ? convertDepth.threshold : expr_1.float(0)}, ${convertDepth !== undefined ? convertDepth.newColor : vecexprs_1.vec4(0, 0, 0, 0)})`;
        // TODO make this more generic
        // append the _<num> onto the function name
        // also add _depth if this is a version of the function that uses depth buffer
        const customName = `godrays${convertDepth !== undefined ? "_depth" : ""}${numSamples !== 100 ? "_s" + numSamples : ""}(`;
        sourceLists.sections[0] = customName;
        super(sourceLists, [
            "uCol",
            "uExposure",
            "uDecay",
            "uDensity",
            "uWeight",
            "uLightPos",
            "uThreshold",
            "uNewColor",
        ]);
        this.col = col;
        this.exposure = exposure;
        this.decay = decay;
        this.density = density;
        this.weight = weight;
        this.lightPos = lightPos;
        this.threshold = convertDepth === null || convertDepth === void 0 ? void 0 : convertDepth.threshold;
        this.newColor = convertDepth === null || convertDepth === void 0 ? void 0 : convertDepth.newColor;
        // will be 1 if needs to convert depth, and 0 otherwise
        this.funcIndex = ~~(convertDepth !== undefined);
        let customGodRayFunc = glslfunctions_1.glslFuncs.godrays
            .split("godrays(")
            .join(customName)
            .replace(`NUM_SAMPLES = ${DEFAULT_SAMPLES}`, "NUM_SAMPLES = " + numSamples);
        if (convertDepth !== undefined) {
            // with regex, uncomment the line in the source code that does the
            // conversion (if you think about it that's basically what a preprocessor
            // does...)
            customGodRayFunc = customGodRayFunc.replace(/\/\/uncomment\s/g, "");
            this.externalFuncs.push(glslfunctions_1.glslFuncs.depth2occlusion);
        }
        this.externalFuncs.push(customGodRayFunc);
        this.brandExprWithChannel(this.funcIndex, samplerNum);
    }
    /** sets the light color */
    setColor(color) {
        this.setUniform("uCol" + this.id, color);
        this.col = color;
    }
    /** sets the exposure */
    setExposure(exposure) {
        this.setUniform("uExposure" + this.id, exposure);
        this.exposure = expr_1.wrapInValue(exposure);
    }
    /** sets the decay */
    setDecay(decay) {
        this.setUniform("uDecay" + this.id, decay);
        this.decay = expr_1.wrapInValue(decay);
    }
    /** sets the density */
    setDensity(density) {
        this.setUniform("uDensity" + this.id, density);
        this.density = expr_1.wrapInValue(density);
    }
    /** sets the weight */
    setWeight(weight) {
        this.setUniform("uWeight" + this.id, weight);
        this.weight = expr_1.wrapInValue(weight);
    }
    /** sets the light position */
    setLightPos(lightPos) {
        this.setUniform("uLightPos" + this.id, lightPos);
        this.lightPos = lightPos;
    }
    // these only matter when you're using a depth buffer and not an occlusion
    // buffer (although right now, you'll still be able to set them)
    setThreshold(threshold) {
        this.setUniform("uThreshold" + this.id, threshold);
        this.threshold = expr_1.wrapInValue(threshold);
    }
    setNewColor(newColor) {
        this.setUniform("uNewColor" + this.id, newColor);
        this.newColor = newColor;
    }
}
exports.GodRaysExpr = GodRaysExpr;
/**
 * create a godrays expression which requires an occlusion map; all values are
 * mutable by default
 * @param options object that defines godrays properties (has sane defaults)
 */
function godrays(options = {}) {
    return new GodRaysExpr(options.color, expr_1.wrapInValue(options.exposure), expr_1.wrapInValue(options.decay), expr_1.wrapInValue(options.density), expr_1.wrapInValue(options.weight), options.lightPos, options.samplerNum, options.numSamples, options.convertDepth === undefined
        ? undefined
        : {
            threshold: expr_1.wrapInValue(options.convertDepth.threshold),
            newColor: options.convertDepth.newColor,
        });
}
exports.godrays = godrays;

},{"../glslfunctions":83,"./expr":47,"./fragcolorexpr":48,"./vecexprs":81}],54:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.grain = exports.GrainExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
// TODO consider getting rid of this since it's easy to make your own with
// `random` and `brightness`
/** grain expression */
class GrainExpr extends expr_1.ExprVec4 {
    constructor(grain) {
        super(expr_1.tag `vec4((1.0 - ${grain} * random(gl_FragCoord.xy)) * gl_FragColor.rgb, gl_FragColor.a);`, ["uGrain"]);
        this.grain = grain;
        this.externalFuncs = [glslfunctions_1.glslFuncs.random];
        this.needs.centerSample = true;
    }
    /** sets the grain level  */
    setGrain(grain) {
        this.setUniform("uGrain" + this.id, grain);
        this.grain = expr_1.wrapInValue(grain);
    }
}
exports.GrainExpr = GrainExpr;
/**
 * creates an expression that adds random grain
 * @param val how much the grain should impact the image (0 to 1 is reasonable)
 */
function grain(val) {
    return new GrainExpr(expr_1.wrapInValue(val));
}
exports.grain = grain;

},{"../glslfunctions":83,"./expr":47}],55:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hsv2rgb = exports.HSVToRGBExpr = void 0;
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
/** HSV to RGB expression */
class HSVToRGBExpr extends expr_1.ExprVec4 {
    constructor(color) {
        super(expr_1.tag `hsv2rgb(${color})`, ["uHSVCol"]);
        this.color = color;
        this.externalFuncs = [glslfunctions_1.glslFuncs.hsv2rgb];
    }
    /** sets the color to convert */
    setColor(color) {
        this.setUniform("uHSVCol", color);
        this.color = color;
    }
}
exports.HSVToRGBExpr = HSVToRGBExpr;
/**
 * converts a color (with an alpha compoment) from hsv to rgb
 * @param col the hsva color to convert to rgba
 */
function hsv2rgb(col) {
    return new HSVToRGBExpr(col);
}
exports.hsv2rgb = hsv2rgb;

},{"../glslfunctions":83,"./expr":47}],56:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invert = exports.InvertExpr = void 0;
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
/** invert expression */
class InvertExpr extends expr_1.ExprVec4 {
    constructor(color) {
        super(expr_1.tag `invert(${color})`, ["uColor"]);
        this.externalFuncs = [glslfunctions_1.glslFuncs.invert];
        this.color = color;
    }
    /** sets the color */
    setColor(color) {
        this.setUniform("uColor", color);
        this.color = color;
    }
}
exports.InvertExpr = InvertExpr;
/**
 * creates an expression that inverts the color, keeping the original alpha
 */
function invert(col) {
    return new InvertExpr(col);
}
exports.invert = invert;

},{"../glslfunctions":83,"./expr":47}],57:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.len = exports.LenExpr = void 0;
const expr_1 = require("./expr");
/** length expression */
class LenExpr extends expr_1.ExprFloat {
    constructor(vec) {
        super(expr_1.tag `length(${vec})`, ["uVec"]);
        this.vec = vec;
    }
    setVec(vec) {
        this.setUniform("uVec" + this.id, vec);
        this.vec = vec;
    }
}
exports.LenExpr = LenExpr;
/** creates an expreession that calculates the length of a vector */
function len(vec) {
    return new LenExpr(vec);
}
exports.len = len;

},{"./expr":47}],58:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monochrome = exports.MonochromeExpr = void 0;
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
/** monochrome expression */
class MonochromeExpr extends expr_1.ExprVec4 {
    constructor(color) {
        super(expr_1.tag `monochrome(${color})`, ["uColor"]);
        this.externalFuncs = [glslfunctions_1.glslFuncs.monochrome];
        this.color = color;
    }
    /** sets the color */
    setColor(color) {
        this.setUniform("uColor", color);
        this.color = color;
    }
}
exports.MonochromeExpr = MonochromeExpr;
/**
 * creates an expression that converts a color into grayscale, keeping the
 * original alpha
 */
function monochrome(col) {
    return new MonochromeExpr(col);
}
exports.monochrome = monochrome;

},{"../glslfunctions":83,"./expr":47}],59:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.motionblur = exports.MotionBlurLoop = void 0;
const mergepass_1 = require("../mergepass");
const channelsampleexpr_1 = require("./channelsampleexpr");
const expr_1 = require("./expr");
const fragcolorexpr_1 = require("./fragcolorexpr");
const opexpr_1 = require("./opexpr");
/** frame averaging motion blur loop */
class MotionBlurLoop extends mergepass_1.EffectLoop {
    constructor(target = 0, persistence = expr_1.float(expr_1.mut(0.3))) {
        const col1 = opexpr_1.op(channelsampleexpr_1.channel(target), "*", persistence);
        const col2 = opexpr_1.op(fragcolorexpr_1.fcolor(), "*", opexpr_1.op(1, "-", persistence));
        const effects = [
            mergepass_1.loop([opexpr_1.op(col1, "+", col2)]).target(target),
            channelsampleexpr_1.channel(target),
        ];
        super(effects, { num: 1 });
        this.persistence = persistence;
    }
    /** set the persistence (keep between 0 and 1) */
    setPersistence(float) {
        if (!(this.persistence instanceof expr_1.BasicFloat))
            throw new Error("persistence expression not basic float");
        this.persistence.setVal(float);
    }
}
exports.MotionBlurLoop = MotionBlurLoop;
/**
 * creates a frame averaging motion blur effect
 * @param target the channel where your accumulation buffer is (defaults to 0,
 * which you might be using for something like the depth texture, so be sure to
 * change this to suit your needs)
 * @param persistence close to 0 is more ghostly, and close to 1 is nearly no
 * motion blur at all (defaults to 0.3)
 */
function motionblur(target, persistence) {
    return new MotionBlurLoop(target, expr_1.wrapInValue(persistence));
}
exports.motionblur = motionblur;

},{"../mergepass":85,"./channelsampleexpr":41,"./expr":47,"./fragcolorexpr":48,"./opexpr":65}],60:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mouse = exports.MouseExpr = void 0;
const expr_1 = require("./expr");
/** mouse position expression */
class MouseExpr extends expr_1.ExprVec2 {
    constructor() {
        super(expr_1.tag `uMouse`, []);
        this.needs.mouseUniform = true;
    }
}
exports.MouseExpr = MouseExpr;
/**
 * creates an expression that evaluates to a vector representing the mouse
 * position in pixels
 */
function mouse() {
    return new MouseExpr();
}
exports.mouse = mouse;

},{"./expr":47}],61:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.center = exports.NormCenterFragCoordExpr = void 0;
const expr_1 = require("./expr");
/** normalized centered frag coord expression */
class NormCenterFragCoordExpr extends expr_1.ExprVec2 {
    constructor() {
        super(expr_1.tag `(gl_FragCoord.xy / uResolution - 0.5)`, []);
    }
}
exports.NormCenterFragCoordExpr = NormCenterFragCoordExpr;
/**
 * creates an expression that calculates the normalized centered coord
 * (coordinates range from -0.5 to 0.5)
 */
function center() {
    return new NormCenterFragCoordExpr();
}
exports.center = center;

},{"./expr":47}],62:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.norm = exports.NormExpr = void 0;
const expr_1 = require("./expr");
/** normalize expression */
class NormExpr extends expr_1.Operator {
    constructor(vec) {
        super(vec, expr_1.tag `normalize(${vec})`, ["uVec"]);
        this.vec = vec;
    }
    /** sets the vec to normalize */
    setVec(vec) {
        this.setUniform("uVec" + this.id, vec);
        this.vec = vec;
    }
}
exports.NormExpr = NormExpr;
/** creates an expression that normalizes a vector */
function norm(vec) {
    return new NormExpr(vec);
}
exports.norm = norm;

},{"./expr":47}],63:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pos = exports.NormFragCoordExpr = void 0;
const expr_1 = require("./expr");
/** normalized frag coord expression */
class NormFragCoordExpr extends expr_1.ExprVec2 {
    constructor() {
        // don't remove these parens! even if you think you are being clever about
        // order of operations
        super(expr_1.tag `(gl_FragCoord.xy / uResolution)`, []);
    }
}
exports.NormFragCoordExpr = NormFragCoordExpr;
/**
 * creates an expression that calculates the normalized frag coord (coordinates
 * range from 0 to 1)
 */
function pos() {
    return new NormFragCoordExpr();
}
exports.pos = pos;

},{"./expr":47}],64:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nmouse = exports.NormMouseExpr = void 0;
const expr_1 = require("./expr");
/** normalized mouse position expression */
class NormMouseExpr extends expr_1.ExprVec2 {
    constructor() {
        super(expr_1.tag `(uMouse / uResolution.xy)`, []);
        this.needs.mouseUniform = true;
    }
}
exports.NormMouseExpr = NormMouseExpr;
/**
 * creates an expression that calculates the normalized mouse position
 * (coordinates range from 0 to 1)
 */
function nmouse() {
    return new NormMouseExpr();
}
exports.nmouse = nmouse;

},{"./expr":47}],65:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.op = exports.OpExpr = void 0;
const expr_1 = require("./expr");
function genOpSourceList(left, op, right) {
    return {
        sections: ["(", ` ${op} `, ")"],
        values: [left, right],
    };
}
class OpExpr extends expr_1.Operator {
    constructor(left, op, right) {
        super(left, genOpSourceList(left, op, right), ["uLeft", "uRight"]);
        this.left = left;
        this.right = right;
    }
    setLeft(left) {
        this.setUniform("uLeft" + this.id, left);
        this.left = expr_1.wrapInValue(left);
    }
    setRight(right) {
        this.setUniform("uRight" + this.id, right);
        this.right = expr_1.wrapInValue(right);
    }
}
exports.OpExpr = OpExpr;
// implementation
/**
 * creates an arithmetic operator expression
 * @param left expression left of operator
 * @param op string representing arithmetic operator
 * @param right expression right of operator
 */
function op(left, op, right) {
    return new OpExpr(expr_1.wrapInValue(left), op, expr_1.wrapInValue(right));
}
exports.op = op;

},{"./expr":47}],66:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fractalize = exports.perlin = exports.PerlinExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
const opexpr_1 = require("./opexpr");
/** Perlin noise expression */
class PerlinExpr extends expr_1.ExprFloat {
    // TODO include a default
    constructor(pos) {
        super(expr_1.tag `gradientnoise(${pos})`, ["uPos"]);
        this.pos = pos;
        this.externalFuncs = [glslfunctions_1.glslFuncs.random2, glslfunctions_1.glslFuncs.gradientnoise];
    }
    /** sets the position to calculate noise value of */
    setPos(pos) {
        this.setUniform("uPos", pos);
        this.pos = pos;
    }
}
exports.PerlinExpr = PerlinExpr;
/**
 * creates a perlin noise expression; values range from -1 to 1 but they tend
 * to be grayer than the [[simplex]] implementation
 * @param pos position
 */
function perlin(pos) {
    return new PerlinExpr(pos);
}
exports.perlin = perlin;
/**
 * take any function from a position to a float, and repeatedly sum calls to it
 * with doubling frequency and halving amplitude (works well with [[simplex]]
 * and [[perlin]])
 * @param pos position
 * @param octaves how many layers deep to make the fractal
 * @param func the function to fractalize
 */
function fractalize(pos, octaves, func) {
    if (octaves < 0)
        throw new Error("octaves can't be < 0");
    const recurse = (pos, size, level) => {
        if (level <= 0)
            return expr_1.pfloat(0);
        return opexpr_1.op(func(opexpr_1.op(pos, "/", size * 2)), "+", recurse(pos, size / 2, level - 1));
    };
    return recurse(pos, 0.5, octaves);
}
exports.fractalize = fractalize;

},{"../glslfunctions":83,"./expr":47,"./opexpr":65}],67:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pblur = exports.PowerBlurLoop = void 0;
const mergepass_1 = require("../mergepass");
const blurexpr_1 = require("./blurexpr");
const vecexprs_1 = require("./vecexprs");
const expr_1 = require("./expr");
const baseLog = (x, y) => Math.log(y) / Math.log(x);
// TODO consider getting rid of this, as it pretty much never looks good
/** power blur loop */
class PowerBlurLoop extends mergepass_1.EffectLoop {
    constructor(size) {
        const side = blurexpr_1.gauss(expr_1.mut(vecexprs_1.pvec2(size, 0)));
        const up = blurexpr_1.gauss(expr_1.mut(vecexprs_1.pvec2(0, size)));
        const reps = Math.ceil(baseLog(2, size));
        super([side, up], {
            num: reps + 1,
        });
        this.size = size;
        this.loopInfo.func = (i) => {
            const distance = this.size / Math.pow(2, i);
            up.setDirection(vecexprs_1.pvec2(0, distance));
            side.setDirection(vecexprs_1.pvec2(distance, 0));
        };
    }
    /** sets the size of the radius */
    setSize(size) {
        this.size = size;
        this.loopInfo.num = Math.ceil(baseLog(2, size));
    }
}
exports.PowerBlurLoop = PowerBlurLoop;
/**
 * fast approximate blur for large blur radius that might look good in some cases
 * @param size the radius of the blur
 */
function pblur(size) {
    return new PowerBlurLoop(size);
}
exports.pblur = pblur;

},{"../mergepass":85,"./blurexpr":38,"./expr":47,"./vecexprs":81}],68:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.random = exports.RandomExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
const normfragcoordexpr_1 = require("./normfragcoordexpr");
/** psuedorandom number expression */
class RandomExpr extends expr_1.ExprFloat {
    constructor(seed = normfragcoordexpr_1.pos()) {
        super(expr_1.tag `random(${seed})`, ["uSeed"]);
        this.seed = seed;
        this.externalFuncs = [glslfunctions_1.glslFuncs.random];
    }
    /** sets the seed (vary this over time to get a moving effect) */
    setSeed(seed) {
        this.setUniform("uSeed", seed);
        this.seed = seed;
    }
}
exports.RandomExpr = RandomExpr;
/**
 * creates expression that evaluates to a pseudorandom number between 0 and 1
 * @param seed vec2 to to seed the random number (defaults to the normalized
 * frag coord)
 */
function random(seed) {
    return new RandomExpr(seed);
}
exports.random = random;

},{"../glslfunctions":83,"./expr":47,"./normfragcoordexpr":63}],69:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.region = void 0;
const mergepass_1 = require("../mergepass");
const expr_1 = require("./expr");
const getcompexpr_1 = require("./getcompexpr");
const normfragcoordexpr_1 = require("./normfragcoordexpr");
const opexpr_1 = require("./opexpr");
const ternaryexpr_1 = require("./ternaryexpr");
const fragcolorexpr_1 = require("./fragcolorexpr");
// form: x1, y1, x2, y2
function createDifferenceFloats(floats) {
    const axes = "xy";
    const differences = [];
    if (floats.length !== 4) {
        throw new Error("incorrect amount of points specified for region");
    }
    for (let i = 0; i < 2; i++) {
        differences.push(opexpr_1.op(getcompexpr_1.getcomp(normfragcoordexpr_1.pos(), axes[i]), "-", floats[i]));
    }
    for (let i = 2; i < floats.length; i++) {
        differences.push(opexpr_1.op(floats[i], "-", getcompexpr_1.getcomp(normfragcoordexpr_1.pos(), axes[i - 2])));
    }
    return differences;
}
/**
 * restrict an effect to a region of the screen
 * @param space top left, top right, bottom left, bottom right corners of the
 * region, or just a number if you wish to sample from a channel as the region
 * @param success expression for being inside the region
 * @param failure expression for being outside the region
 * @param not whether to invert the region
 */
function region(space, success, failure, not = false) {
    const floats = Array.isArray(space)
        ? space.map((f) => expr_1.wrapInValue(f))
        : typeof space === "number"
            ? expr_1.wrapInValue(space)
            : space;
    if (failure instanceof mergepass_1.EffectLoop) {
        if (!(success instanceof mergepass_1.EffectLoop)) {
            [success, failure] = [failure, success]; // swap the order
            not = !not; // invert the region
        }
    }
    if (success instanceof mergepass_1.EffectLoop) {
        if (!(failure instanceof mergepass_1.EffectLoop)) {
            return success.regionWrap(floats, failure, true, not);
        }
        // double loop, so we have to do separately
        return mergepass_1.loop([
            success.regionWrap(floats, fragcolorexpr_1.fcolor(), false, not),
            failure.regionWrap(floats, fragcolorexpr_1.fcolor(), true, !not),
        ]);
    }
    return ternaryexpr_1.ternary(Array.isArray(floats) ? createDifferenceFloats(floats) : floats, success.brandExprWithRegion(floats), failure.brandExprWithRegion(floats), not);
}
exports.region = region;

},{"../mergepass":85,"./expr":47,"./fragcolorexpr":48,"./getcompexpr":52,"./normfragcoordexpr":63,"./opexpr":65,"./ternaryexpr":77}],70:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolution = exports.ResolutionExpr = void 0;
const expr_1 = require("./expr");
/** resolution expression */
class ResolutionExpr extends expr_1.ExprVec2 {
    constructor() {
        super(expr_1.tag `uResolution`, []);
    }
}
exports.ResolutionExpr = ResolutionExpr;
/** creates an expression that evaluates to a vector representing the resolution */
function resolution() {
    return new ResolutionExpr();
}
exports.resolution = resolution;

},{"./expr":47}],71:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rgb2hsv = exports.RGBToHSVExpr = void 0;
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
/** RGB to HSV expression */
class RGBToHSVExpr extends expr_1.ExprVec4 {
    constructor(color) {
        super(expr_1.tag `rgb2hsv(${color})`, ["uRGBCol"]);
        this.color = color;
        this.externalFuncs = [glslfunctions_1.glslFuncs.rgb2hsv];
    }
    /** sets the color to convert */
    setColor(color) {
        this.setUniform("uRGBCol", color);
        this.color = color;
    }
}
exports.RGBToHSVExpr = RGBToHSVExpr;
/**
 * creates an expression that converts a color (with an alpha component) from
 * rgb to hsv
 * @param col the rgba color to convert to hsva
 */
function rgb2hsv(col) {
    return new RGBToHSVExpr(col);
}
exports.rgb2hsv = rgb2hsv;

},{"../glslfunctions":83,"./expr":47}],72:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rotate = exports.RotateExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
/** rotate expression */
class RotateExpr extends expr_1.ExprVec2 {
    constructor(vec, angle) {
        super(expr_1.tag `rotate2d(${vec}, ${angle})`, ["uVec", "uAngle"]);
        this.vec = vec;
        this.angle = angle;
        this.externalFuncs = [glslfunctions_1.glslFuncs.rotate2d];
    }
    /** set the vector to rotate */
    setVec(vec) {
        this.setUniform("uVec" + this.id, vec);
        this.vec = vec;
    }
    /** set the angle to rotate by */
    setAngle(angle) {
        this.setUniform("uAngle" + this.id, angle);
        this.angle = expr_1.wrapInValue(angle);
    }
}
exports.RotateExpr = RotateExpr;
/**
 * creates an expression that rotates a vector by a given angle
 * @param vec the vector to rotate
 * @param angle radians to rotate vector by
 */
function rotate(vec, angle) {
    return new RotateExpr(vec, expr_1.wrapInValue(angle));
}
exports.rotate = rotate;

},{"../glslfunctions":83,"./expr":47}],73:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.input = exports.SceneSampleExpr = void 0;
const expr_1 = require("./expr");
const normfragcoordexpr_1 = require("./normfragcoordexpr");
/** scene sample expression */
class SceneSampleExpr extends expr_1.ExprVec4 {
    constructor(coord = normfragcoordexpr_1.pos()) {
        super(expr_1.tag `texture2D(uSceneSampler, ${coord})`, ["uCoord"]);
        this.coord = coord;
        this.needs.sceneBuffer = true;
    }
    /** sets coordinate where scene is being sampled from */
    setCoord(coord) {
        this.setUniform("uCoord", coord);
        this.coord = coord;
    }
}
exports.SceneSampleExpr = SceneSampleExpr;
/**
 * creates an expression that samples the original scene
 * @param vec where to sample the original scene texture (defaults to the
 * normalized frag coord, but change this if you want to transform the
 * coordinate space of the original image)
 */
function input(vec) {
    return new SceneSampleExpr(vec);
}
exports.input = input;

},{"./expr":47,"./normfragcoordexpr":63}],74:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetColorExpr = void 0;
const expr_1 = require("./expr");
/**
 * set fragment color expression (not needed for the user; used internally for
 * wrapping any kind of [[Vec4]] in an [[ExprVec4]])
 */
class SetColorExpr extends expr_1.ExprVec4 {
    constructor(vec) {
        super(expr_1.tag `(${vec})`, ["uVal"]);
        this.vec = vec;
    }
}
exports.SetColorExpr = SetColorExpr;

},{"./expr":47}],75:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simplex = exports.SimplexNoise = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
/** simplex noise expression */
class SimplexNoise extends expr_1.ExprFloat {
    constructor(pos) {
        super(expr_1.tag `simplexnoise(${pos})`, ["uPos"]);
        this.pos = pos;
        this.externalFuncs = [glslfunctions_1.glslFuncs.simplexhelpers, glslfunctions_1.glslFuncs.simplexnoise];
    }
    setPos(pos) {
        this.setUniform("uPos", pos);
        this.pos = pos;
    }
}
exports.SimplexNoise = SimplexNoise;
/**
 * creates a simplex noise expression; values range from -1 to 1
 * @param pos position
 */
function simplex(pos) {
    return new SimplexNoise(pos);
}
exports.simplex = simplex;

},{"../glslfunctions":83,"./expr":47}],76:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sobel = exports.SobelExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
/** Sobel edge detection expression */
class SobelExpr extends expr_1.ExprVec4 {
    constructor(samplerNum) {
        super(expr_1.tag `sobel()`, []);
        this.externalFuncs = [glslfunctions_1.glslFuncs.sobel];
        this.brandExprWithChannel(0, samplerNum);
    }
}
exports.SobelExpr = SobelExpr;
/**
 * creates a Sobel edge detection expression that outputs the raw result; for
 * more highly processed edge detection expressions, see [[edgecolor]] or
 * [[edge]]
 * @param samplerNum where to sample from
 */
function sobel(samplerNum) {
    return new SobelExpr(samplerNum);
}
exports.sobel = sobel;

},{"../glslfunctions":83,"./expr":47}],77:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ternary = exports.TernaryExpr = void 0;
const expr_1 = require("./expr");
function genTernarySourceList(floats, success, failure, not) {
    const sourceList = {
        sections: [`(${not ? "!" : ""}(`],
        values: [],
    };
    let counter = 0;
    // generate the boolean expression
    if (floats !== null) {
        for (const f of floats) {
            counter++;
            const last = counter === floats.length;
            sourceList.values.push(f);
            sourceList.sections.push(` > 0.${last ? ") ? " : " && "}`);
        }
    }
    else {
        sourceList.sections[0] += "uCount == 0) ? ";
    }
    // generate the success expression and colon
    sourceList.values.push(success);
    sourceList.sections.push(" : ");
    // generate the failure expression
    sourceList.values.push(failure);
    sourceList.sections.push(")");
    return sourceList;
}
class TernaryExpr extends expr_1.Operator {
    constructor(floats, success, failure, not) {
        super(success, genTernarySourceList(floats, success, failure, not), [
            ...(floats !== null
                ? Array.from(floats, (val, index) => "uFloat" + index)
                : []),
            "uSuccess",
            "uFailure",
        ]);
        this.success = success;
        this.failure = failure;
        this.needs.passCount = floats === null;
    }
}
exports.TernaryExpr = TernaryExpr;
/**
 * creates a ternary expression; the boolean expression is if all the floats
 * given are greater than 0
 * @param floats if all these floats (or the single float) are above 0, then
 * evaluates to success expression
 * @param success
 * @param failure
 * @param not whether to invert the ternary
 */
function ternary(floats, success, failure, not = false) {
    // TODO make this type safe (ran into a type error here)
    // wrap single float in array if need be
    if (!Array.isArray(floats) && floats !== null)
        floats = [floats].map((f) => expr_1.wrapInValue(f));
    // TODO get rid of this cast
    return new TernaryExpr(floats, expr_1.wrapInValue(success), expr_1.wrapInValue(failure), not);
}
exports.ternary = ternary;

},{"./expr":47}],78:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.time = exports.TimeExpr = void 0;
const expr_1 = require("./expr");
/** time expression */
class TimeExpr extends expr_1.ExprFloat {
    constructor() {
        super(expr_1.tag `uTime`, []);
        this.needs.timeUniform = true;
    }
}
exports.TimeExpr = TimeExpr;
/** creates a time expression that evaluates to the current time */
function time() {
    return new TimeExpr();
}
exports.time = time;

},{"./expr":47}],79:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translate = exports.TranslateExpr = void 0;
const expr_1 = require("./expr");
// really just adding two vecs together, but it might be confusing that there's
// rotate but no translate, so this is included. also it could make some
// operations more readable
/** sets the translate expression */
class TranslateExpr extends expr_1.ExprVec2 {
    constructor(vec, pos) {
        super(expr_1.tag `(${vec} + ${pos})`, ["uVec", "uPos"]);
        this.vec = vec;
        this.pos = pos;
    }
    /** sets the starting position */
    setVec(vec) {
        this.setUniform("uVec" + this.id, vec);
        this.vec = vec;
    }
    /** sets how far the vector will be translated */
    setPos(pos) {
        this.setUniform("uPos" + this.id, pos);
        this.pos = pos;
    }
}
exports.TranslateExpr = TranslateExpr;
/** translates the position of a vector by another vector */
function translate(vec, pos) {
    return new TranslateExpr(vec, pos);
}
exports.translate = translate;

},{"./expr":47}],80:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.truedepth = exports.TrueDepthExpr = void 0;
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
/** true depth expression */
class TrueDepthExpr extends expr_1.ExprFloat {
    constructor(depth) {
        super(expr_1.tag `truedepth(${depth})`, ["uDist"]);
        this.depth = depth;
        this.externalFuncs = [glslfunctions_1.glslFuncs.truedepth];
    }
    /** sets the distance to convert to the true depth */
    setDist(depth) {
        this.setUniform("uDist", depth);
        this.depth = expr_1.wrapInValue(depth);
    }
}
exports.TrueDepthExpr = TrueDepthExpr;
/** calculates the linear depth from inverse depth value `1 / distance` */
function truedepth(depth) {
    return new TrueDepthExpr(expr_1.wrapInValue(depth));
}
exports.truedepth = truedepth;

},{"../glslfunctions":83,"./expr":47}],81:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pvec4 = exports.pvec3 = exports.pvec2 = exports.vec4 = exports.vec3 = exports.vec2 = void 0;
const expr_1 = require("./expr");
/** @ignore */
function vecSourceList(...components) {
    const sections = ["vec" + components.length + "("];
    for (let i = 0; i < components.length - 1; i++) {
        sections.push(", ");
    }
    const defaultNames = [];
    for (let i = 0; i < components.length; i++) {
        defaultNames.push("uComp" + i);
    }
    sections.push(")");
    return [{ sections: sections, values: components }, defaultNames];
}
// expression vector shorthands
/** creates a basic vec2 expression */
function vec2(comp1, comp2) {
    return new expr_1.BasicVec2(...vecSourceList(...[comp1, comp2].map((c) => expr_1.wrapInValue(c))));
}
exports.vec2 = vec2;
/** creates a basic vec3 expression */
function vec3(comp1, comp2, comp3) {
    return new expr_1.BasicVec3(...vecSourceList(...[comp1, comp2, comp3].map((c) => expr_1.wrapInValue(c))));
}
exports.vec3 = vec3;
/** creates a basic vec4 expression */
function vec4(comp1, comp2, comp3, comp4) {
    return new expr_1.BasicVec4(...vecSourceList(...[comp1, comp2, comp3, comp4].map((c) => expr_1.wrapInValue(c))));
}
exports.vec4 = vec4;
// primitive vector shorthands
/** creates a primitive vec2 expression */
function pvec2(comp1, comp2) {
    return new expr_1.PrimitiveVec2([comp1, comp2]);
}
exports.pvec2 = pvec2;
/** creates a primitive vec3 expression */
function pvec3(comp1, comp2, comp3) {
    return new expr_1.PrimitiveVec3([comp1, comp2, comp3]);
}
exports.pvec3 = pvec3;
/** creates a primitive vec4 expression */
function pvec4(comp1, comp2, comp3, comp4) {
    return new expr_1.PrimitiveVec4([comp1, comp2, comp3, comp4]);
}
exports.pvec4 = pvec4;

},{"./expr":47}],82:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],83:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.glslFuncs = void 0;
// adapted from The Book of Shaders
/** glsl source code for external functions */
exports.glslFuncs = {
    // TODO bad to calculate single pixel width every time; maybe it can be a need
    texture2D_region: `vec4 texture2D_region(
  float r_x_min,
  float r_y_min,
  float r_x_max,
  float r_y_max,
  sampler2D sampler,
  vec2 uv
) {
  vec2 d = vec2(1., 1.) / uResolution; // pixel width
  return texture2D(sampler, clamp(uv, vec2(r_x_min + d.x, r_y_min + d.x), vec2(r_x_max - d.y, r_y_max - d.y)));
}`,
    // TODO replace with a better one
    // adapted from The Book of Shaders
    random: `float random(vec2 st) {
  return fract(sin(dot(st.xy / 99., vec2(12.9898, 78.233))) * 43758.5453123);
}`,
    // adapted from The Book of Shaders
    random2: `vec2 random2(vec2 st) {
  st = vec2(dot(st,vec2(127.1,311.7)), dot(st,vec2(269.5,183.3)));
  return -1.0 + 2.0*fract(sin(st)*43758.5453123);
}`,
    rotate2d: `vec2 rotate2d(vec2 v, float angle) {
  return mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * v;
}`,
    // adapted from The Book of Shaders
    hsv2rgb: `vec4 hsv2rgb(vec4 co){
  vec3 c = co.xyz;
  vec3 rgb = clamp(abs(mod(
    c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  rgb = rgb * rgb * (3.0 - 2.0 * rgb);
  vec3 hsv = c.z * mix(vec3(1.0), rgb, c.y);
  return vec4(hsv.x, hsv.y, hsv.z, co.a);
}`,
    // adapted from The Book of Shaders
    rgb2hsv: `vec4 rgb2hsv(vec4 co){
  vec3 c = co.rgb;
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec4(abs(q.z + (q.w - q.y) / (6.0 * d + e)),
              d / (q.x + e),
              q.x, co.a);
}`,
    // all gaussian blurs adapted from:
    // https://github.com/Jam3/glsl-fast-gaussian-blur/blob/master/5.glsl
    gauss5: `vec4 gauss5(vec2 dir) {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec4 col = vec4(0.0);
  vec2 off1 = vec2(1.3333333333333333) * dir;
  col += texture2D(uSampler, uv) * 0.29411764705882354;
  col += texture2D(uSampler, uv + (off1 / uResolution)) * 0.35294117647058826;
  col += texture2D(uSampler, uv - (off1 / uResolution)) * 0.35294117647058826;
  return col;
}`,
    gauss9: `vec4 gauss9(vec2 dir) {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec4 col = vec4(0.0);
  vec2 off1 = vec2(1.3846153846) * dir;
  vec2 off2 = vec2(3.2307692308) * dir;
  col += texture2D(uSampler, uv) * 0.2270270270;
  col += texture2D(uSampler, uv + (off1 / uResolution)) * 0.3162162162;
  col += texture2D(uSampler, uv - (off1 / uResolution)) * 0.3162162162;
  col += texture2D(uSampler, uv + (off2 / uResolution)) * 0.0702702703;
  col += texture2D(uSampler, uv - (off2 / uResolution)) * 0.0702702703;
  return col;
}`,
    gauss13: `vec4 gauss13(vec2 dir) {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec4 col = vec4(0.0);
  vec2 off1 = vec2(1.411764705882353) * dir;
  vec2 off2 = vec2(3.2941176470588234) * dir;
  vec2 off3 = vec2(5.176470588235294) * dir;
  col += texture2D(uSampler, uv) * 0.1964825501511404;
  col += texture2D(uSampler, uv + (off1 / uResolution)) * 0.2969069646728344;
  col += texture2D(uSampler, uv - (off1 / uResolution)) * 0.2969069646728344;
  col += texture2D(uSampler, uv + (off2 / uResolution)) * 0.09447039785044732;
  col += texture2D(uSampler, uv - (off2 / uResolution)) * 0.09447039785044732;
  col += texture2D(uSampler, uv + (off3 / uResolution)) * 0.010381362401148057;
  col += texture2D(uSampler, uv - (off3 / uResolution)) * 0.010381362401148057;
  return col;
}`,
    contrast: `vec4 contrast(float val, vec4 col) {
  col.rgb /= col.a;
  col.rgb = ((col.rgb - 0.5) * val) + 0.5;
  col.rgb *= col.a;
  return col;
}`,
    brightness: `vec4 brightness(float val, vec4 col) {
  col.rgb /= col.a;
  col.rgb += val;
  col.rgb *= col.a;
  return col;
}`,
    // adapted from https://www.shadertoy.com/view/ls3GWS which was adapted from
    // http://www.geeks3d.com/20110405/fxaa-fast-approximate-anti-aliasing-demo-glsl-opengl-test-radeon-geforce/3/
    // original algorithm created by Timothy Lottes
    fxaa: `vec4 fxaa() {
  float FXAA_SPAN_MAX = 8.0;
  float FXAA_REDUCE_MUL = 1.0 / FXAA_SPAN_MAX;
  float FXAA_REDUCE_MIN = 1.0 / 128.0;
  float FXAA_SUBPIX_SHIFT = 1.0 / 4.0;

  vec2 rcpFrame = 1. / uResolution.xy;
  vec2 t_uv = gl_FragCoord.xy / uResolution.xy; 
  vec4 uv = vec4(t_uv, t_uv - (rcpFrame * (0.5 + FXAA_SUBPIX_SHIFT)));

  vec3 rgbNW = texture2D(uSampler, uv.zw).xyz;
  vec3 rgbNE = texture2D(uSampler, uv.zw + vec2(1,0) * rcpFrame.xy).xyz;
  vec3 rgbSW = texture2D(uSampler, uv.zw + vec2(0,1) * rcpFrame.xy).xyz;
  vec3 rgbSE = texture2D(uSampler, uv.zw + vec2(1,1) * rcpFrame.xy).xyz;
  vec4 rgbMfull = texture2D(uSampler, uv.xy);
  vec3 rgbM = rgbMfull.xyz;
  float alpha = rgbMfull.a;

  vec3 luma = vec3(0.299, 0.587, 0.114);
  float lumaNW = dot(rgbNW, luma);
  float lumaNE = dot(rgbNE, luma);
  float lumaSW = dot(rgbSW, luma);
  float lumaSE = dot(rgbSE, luma);
  float lumaM = dot(rgbM,  luma);

  float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
  float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

  vec2 dir;
  dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
  dir.y = ((lumaNW + lumaSW) - (lumaNE + lumaSE));

  float dirReduce = max(
    (lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);
  float rcpDirMin = 1.0/(min(abs(dir.x), abs(dir.y)) + dirReduce);

  dir = min(vec2(FXAA_SPAN_MAX,  FXAA_SPAN_MAX),
    max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),
    dir * rcpDirMin)) * rcpFrame.xy;

  vec3 rgbA = (1.0 / 2.0) * (
    texture2D(uSampler, uv.xy + dir * (1.0 / 3.0 - 0.5)).xyz +
    texture2D(uSampler, uv.xy + dir * (2.0 / 3.0 - 0.5)).xyz);
  vec3 rgbB = rgbA * (1.0 / 2.0) + (1.0 / 4.0) * (
    texture2D(uSampler, uv.xy + dir * (0.0 / 3.0 - 0.5)).xyz +
    texture2D(uSampler, uv.xy + dir * (3.0 / 3.0 - 0.5)).xyz);

  float lumaB = dot(rgbB, luma);

  if (lumaB < lumaMin || lumaB > lumaMax) {
    return vec4(rgbA.r, rgbA.g, rgbA.b, alpha);
  }

  return vec4(rgbB.r, rgbB.g, rgbB.b, alpha);
}`,
    // normal curve is a = 0 and b = 1
    gaussian: `float gaussian(float x, float a, float b) {
  float e = 2.71828;
  return pow(e, -pow(x - a, 2.) / b);
}`,
    // for calculating the true distance from 0 to 1 depth buffer
    // the small delta is to prevent division by zero, which is undefined behavior
    truedepth: `float truedepth(float i) {
  i = max(i, 0.00000001);
  return (1. - i) / i;
}`,
    // based off of https://fabiensanglard.net/lightScattering/index.php
    godrays: `vec4 godrays(
  vec4 col,
  float exposure,
  float decay,
  float density,
  float weight,
  vec2 lightPos,
  float threshold,
  vec4 newColor
) {
  vec2 texCoord = gl_FragCoord.xy / uResolution;
  vec2 deltaTexCoord = texCoord - lightPos;

  const int NUM_SAMPLES = 100;
  deltaTexCoord *= 1. / float(NUM_SAMPLES) * density;
  float illuminationDecay = 1.0;

  for (int i=0; i < NUM_SAMPLES; i++) {
    texCoord -= deltaTexCoord;
    vec4 sample = texture2D(uSampler, texCoord);
    //uncomment sample = depth2occlusion(sample, newColor, threshold);
    sample *= illuminationDecay * weight;
    col += sample;
    illuminationDecay *= decay;
  }
  return col * exposure;
}`,
    depth2occlusion: `vec4 depth2occlusion(vec4 depthCol, vec4 newCol, float threshold) {
  float red = 1. - ceil(depthCol.r - threshold);
  return vec4(newCol.rgb * red, 1.0);
}`,
    // adapted from The Book of Shaders, which was adapted from Inigo Quilez
    // from this example: https://www.shadertoy.com/view/XdXGW8
    gradientnoise: `float gradientnoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);

  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(mix(dot(random2(i + vec2(0.0,0.0)), f - vec2(0.0, 0.0)),
                     dot(random2(i + vec2(1.0,0.0)), f - vec2(1.0, 0.0)), u.x),
             mix(dot(random2(i + vec2(0.0,1.0)), f - vec2(0.0, 1.0)),
                 dot(random2(i + vec2(1.0,1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
}`,
    // adapted from The Book of Shaders
    // https://thebookofshaders.com/edit.php#11/2d-snoise-clear.frag
    // this was adapted from this fast implementation
    // https://github.com/ashima/webgl-noise
    // simplex noise invented by Ken Perlin
    simplexnoise: `float simplexnoise(vec2 v) {
  // Precompute values for skewed triangular grid
  const vec4 C = vec4(0.211324865405187,
                      // (3.0-sqrt(3.0))/6.0
                      0.366025403784439,
                      // 0.5*(sqrt(3.0)-1.0)
                      -0.577350269189626,
                      // -1.0 + 2.0 * C.x
                      0.024390243902439);
                      // 1.0 / 41.0

  // First corner (x0)
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);

  // Other two corners (x1, x2)
  vec2 i1 = vec2(0.0);
  i1 = (x0.x > x0.y)? vec2(1.0, 0.0):vec2(0.0, 1.0);
  vec2 x1 = x0.xy + C.xx - i1;
  vec2 x2 = x0.xy + C.zz;

  // Do some permutations to avoid
  // truncation effects in permutation
  i = mod289_2(i);
  vec3 p = permute(
          permute( i.y + vec3(0.0, i1.y, 1.0))
              + i.x + vec3(0.0, i1.x, 1.0 ));

  vec3 m = max(0.5 - vec3(
                      dot(x0,x0),
                      dot(x1,x1),
                      dot(x2,x2)
                      ), 0.0);

  m = m*m ;
  m = m*m ;

  // Gradients:
  //  41 pts uniformly over a line, mapped onto a diamond
  //  The ring size 17*17 = 289 is close to a multiple
  //      of 41 (41*7 = 287)

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

  // Normalise gradients implicitly by scaling m
  // Approximation of: m *= inversesqrt(a0*a0 + h*h);
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0+h*h);

  // Compute final noise value at P
  vec3 g = vec3(0.0);
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * vec2(x1.x,x2.x) + h.yz * vec2(x1.y,x2.y);
  return 130.0 * dot(m, g);
}`,
    // only useful for simplex noise
    simplexhelpers: `vec3 mod289_3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289_2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289_3(((x*34.0)+1.0)*x); }`,
    // sobel adapted from https://gist.github.com/Hebali/6ebfc66106459aacee6a9fac029d0115
    sobel: `vec4 sobel() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec4 k[8];

  float w = 1. / uResolution.x;
  float h = 1. / uResolution.y;

  k[0] = texture2D(uSampler, uv + vec2(-w, -h));
  k[1] = texture2D(uSampler, uv + vec2(0., -h));
  k[2] = texture2D(uSampler, uv + vec2(w, -h));
  k[3] = texture2D(uSampler, uv + vec2(-w, 0.));

  k[4] = texture2D(uSampler, uv + vec2(w, 0.));
  k[5] = texture2D(uSampler, uv + vec2(-w, h));
  k[6] = texture2D(uSampler, uv + vec2(0., h));
  k[7] = texture2D(uSampler, uv + vec2(w, h));

  vec4 edge_h = k[2] + (2. * k[4]) + k[7] - (k[0] + (2. * k[3]) + k[5]);
  vec4 edge_v = k[0] + (2. * k[1]) + k[2] - (k[5] + (2. * k[6]) + k[7]);
  vec4 sob = sqrt(edge_h * edge_h + edge_v * edge_v);

  return vec4(1. - sob.rgb, 1.);
}`,
    // inlining a similar function will substitute in the full expression for
    // every component, so it's more efficient to have a function
    monochrome: `vec4 monochrome(vec4 col) {
  return vec4(vec3((col.r + col.g + col.b) / 3.), col.a);
}`,
    invert: `vec4 invert(vec4 col) {
  return vec4(vec3(1., 1., 1.) - col.rgb, col.a);
}`,
    channel: `vec4 channel(vec2 uv, sampler2D sampler) {
  return texture2D(sampler, uv);
}`,
};

},{}],84:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./mergepass"), exports);
__exportStar(require("./exprtypes"), exports);
__exportStar(require("./glslfunctions"), exports);
__exportStar(require("./settings"), exports);
__exportStar(require("./exprs/blurexpr"), exports);
__exportStar(require("./exprs/fragcolorexpr"), exports);
__exportStar(require("./exprs/vecexprs"), exports);
__exportStar(require("./exprs/opexpr"), exports);
__exportStar(require("./exprs/powerblur"), exports);
__exportStar(require("./exprs/blur2dloop"), exports);
__exportStar(require("./exprs/lenexpr"), exports);
__exportStar(require("./exprs/normexpr"), exports);
__exportStar(require("./exprs/fragcoordexpr"), exports);
__exportStar(require("./exprs/normfragcoordexpr"), exports);
__exportStar(require("./exprs/normcenterfragcoordexpr"), exports);
__exportStar(require("./exprs/scenesampleexpr"), exports);
__exportStar(require("./exprs/brightnessexpr"), exports);
__exportStar(require("./exprs/contrastexpr"), exports);
__exportStar(require("./exprs/grainexpr"), exports);
__exportStar(require("./exprs/getcompexpr"), exports);
__exportStar(require("./exprs/changecompexpr"), exports);
__exportStar(require("./exprs/rgbtohsvexpr"), exports);
__exportStar(require("./exprs/hsvtorgbexpr"), exports);
__exportStar(require("./exprs/timeexpr"), exports);
__exportStar(require("./exprs/arity1"), exports);
__exportStar(require("./exprs/arity2"), exports);
__exportStar(require("./exprs/fxaaexpr"), exports);
__exportStar(require("./exprs/channelsampleexpr"), exports);
__exportStar(require("./exprs/dofloop"), exports);
__exportStar(require("./exprs/truedepthexpr"), exports);
__exportStar(require("./exprs/godraysexpr"), exports);
__exportStar(require("./exprs/depthtoocclusionexpr"), exports);
__exportStar(require("./exprs/resolutionexpr"), exports);
__exportStar(require("./exprs/mouseexpr"), exports);
__exportStar(require("./exprs/rotateexpr"), exports);
__exportStar(require("./exprs/translateexpr"), exports);
__exportStar(require("./exprs/normmouseexpr"), exports);
__exportStar(require("./exprs/perlinexpr"), exports);
__exportStar(require("./exprs/simplexexpr"), exports);
__exportStar(require("./exprs/motionblurloop"), exports);
__exportStar(require("./exprs/randomexpr"), exports);
__exportStar(require("./exprs/sobelexpr"), exports);
__exportStar(require("./exprs/bloomloop"), exports);
__exportStar(require("./exprs/monochromeexpr"), exports);
__exportStar(require("./exprs/invertexpr"), exports);
__exportStar(require("./exprs/edgeexpr"), exports);
__exportStar(require("./exprs/edgecolorexpr"), exports);
__exportStar(require("./exprs/ternaryexpr"), exports);
__exportStar(require("./exprs/regiondecorator"), exports);
__exportStar(require("./exprs/expr"), exports);

},{"./exprs/arity1":34,"./exprs/arity2":35,"./exprs/bloomloop":36,"./exprs/blur2dloop":37,"./exprs/blurexpr":38,"./exprs/brightnessexpr":39,"./exprs/changecompexpr":40,"./exprs/channelsampleexpr":41,"./exprs/contrastexpr":42,"./exprs/depthtoocclusionexpr":43,"./exprs/dofloop":44,"./exprs/edgecolorexpr":45,"./exprs/edgeexpr":46,"./exprs/expr":47,"./exprs/fragcolorexpr":48,"./exprs/fragcoordexpr":49,"./exprs/fxaaexpr":50,"./exprs/getcompexpr":52,"./exprs/godraysexpr":53,"./exprs/grainexpr":54,"./exprs/hsvtorgbexpr":55,"./exprs/invertexpr":56,"./exprs/lenexpr":57,"./exprs/monochromeexpr":58,"./exprs/motionblurloop":59,"./exprs/mouseexpr":60,"./exprs/normcenterfragcoordexpr":61,"./exprs/normexpr":62,"./exprs/normfragcoordexpr":63,"./exprs/normmouseexpr":64,"./exprs/opexpr":65,"./exprs/perlinexpr":66,"./exprs/powerblur":67,"./exprs/randomexpr":68,"./exprs/regiondecorator":69,"./exprs/resolutionexpr":70,"./exprs/rgbtohsvexpr":71,"./exprs/rotateexpr":72,"./exprs/scenesampleexpr":73,"./exprs/simplexexpr":75,"./exprs/sobelexpr":76,"./exprs/ternaryexpr":77,"./exprs/timeexpr":78,"./exprs/translateexpr":79,"./exprs/truedepthexpr":80,"./exprs/vecexprs":81,"./exprtypes":82,"./glslfunctions":83,"./mergepass":85,"./settings":86}],85:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTexture = exports.makeTexture = exports.Merger = exports.loop = exports.EffectLoop = exports.EffectDictionary = void 0;
const codebuilder_1 = require("./codebuilder");
const expr_1 = require("./exprs/expr");
const fragcolorexpr_1 = require("./exprs/fragcolorexpr");
const regiondecorator_1 = require("./exprs/regiondecorator");
const scenesampleexpr_1 = require("./exprs/scenesampleexpr");
const setcolorexpr_1 = require("./exprs/setcolorexpr");
const ternaryexpr_1 = require("./exprs/ternaryexpr");
const settings_1 = require("./settings");
const webglprogramloop_1 = require("./webglprogramloop");
function wrapInSetColors(effects) {
    return effects.map((e) => e instanceof expr_1.ExprVec4 || e instanceof EffectLoop ? e : new setcolorexpr_1.SetColorExpr(e));
}
// should be function of loop?
function processEffectMap(eMap) {
    const result = {};
    for (const name in eMap) {
        const val = eMap[name];
        result[name] = wrapInSetColors(val);
    }
    return result;
}
class EffectDictionary {
    constructor(effectMap) {
        this.effectMap = processEffectMap(effectMap);
    }
    toProgramMap(gl, vShader, uniformLocs, fShaders) {
        const programMap = {};
        let needs = {
            neighborSample: false,
            centerSample: false,
            sceneBuffer: false,
            timeUniform: false,
            mouseUniform: false,
            passCount: false,
            extraBuffers: new Set(),
        };
        for (const name in this.effectMap) {
            const effects = this.effectMap[name];
            // wrap the given list of effects as a loop if need be
            const effectLoop = new EffectLoop(effects, { num: 1 });
            if (effectLoop.effects.length === 0) {
                throw new Error("list of effects was empty");
            }
            const programLoop = effectLoop.genPrograms(gl, vShader, uniformLocs, fShaders);
            // walk the tree to the final program
            let atBottom = false;
            let currProgramLoop = programLoop;
            while (!atBottom) {
                if (currProgramLoop.programElement instanceof webglprogramloop_1.WebGLProgramLeaf) {
                    // we traveled right and hit a program, so it must be the last
                    currProgramLoop.last = true;
                    atBottom = true;
                }
                else {
                    // set the current program loop to the last in the list
                    currProgramLoop =
                        currProgramLoop.programElement[currProgramLoop.programElement.length - 1];
                }
            }
            needs = webglprogramloop_1.updateNeeds(needs, programLoop.getTotalNeeds());
            programMap[name] = programLoop;
        }
        return { programMap, needs };
    }
}
exports.EffectDictionary = EffectDictionary;
/** effect loop, which can loop over other effects or effect loops */
class EffectLoop {
    constructor(effects, loopInfo) {
        this.effects = wrapInSetColors(effects);
        this.loopInfo = loopInfo;
    }
    /** @ignore */
    getSampleNum(mult = 1, sliceStart = 0, sliceEnd = this.effects.length) {
        mult *= this.loopInfo.num;
        let acc = 0;
        const sliced = this.effects.slice(sliceStart, sliceEnd);
        for (const e of sliced) {
            acc += e.getSampleNum(mult);
        }
        return acc;
    }
    /**
     * @ignore
     * places effects into loops broken up by sampling effects
     */
    regroup() {
        let sampleCount = 0;
        /** number of samples in all previous */
        let prevSampleCount = 0;
        let prevEffects = [];
        const regroupedEffects = [];
        let prevTarget;
        let currTarget;
        let mustBreakCounter = 0;
        const breakOff = () => {
            mustBreakCounter--;
            if (prevEffects.length > 0) {
                // break off all previous effects into their own loop
                if (prevEffects.length === 1) {
                    // this is to prevent wrapping in another effect loop
                    regroupedEffects.push(prevEffects[0]);
                }
                else {
                    regroupedEffects.push(new EffectLoop(prevEffects, { num: 1 }));
                }
                sampleCount -= prevSampleCount;
                prevEffects = [];
            }
        };
        for (const e of this.effects) {
            const sampleNum = e.getSampleNum();
            prevSampleCount = sampleCount;
            sampleCount += sampleNum;
            if (e instanceof EffectLoop) {
                currTarget = e.loopInfo.target;
                if (e.hasTargetSwitch()) {
                    mustBreakCounter = 2;
                }
            }
            else {
                // if it's not a loop it's assumed the target is that of outer loop
                currTarget = this.loopInfo.target;
            }
            if (sampleCount > 0 ||
                currTarget !== prevTarget ||
                mustBreakCounter > 0) {
                breakOff();
            }
            prevEffects.push(e);
            prevTarget = currTarget;
        }
        // push on all the straggling effects after the grouping is done
        breakOff();
        return regroupedEffects;
    }
    genPrograms(gl, vShader, uniformLocs, shaders) {
        // validate
        const fullSampleNum = this.getSampleNum() / this.loopInfo.num;
        const firstSampleNum = this.getSampleNum(undefined, 0, 1) / this.loopInfo.num;
        const restSampleNum = this.getSampleNum(undefined, 1) / this.loopInfo.num;
        if (!this.hasTargetSwitch() &&
            (fullSampleNum === 0 || (firstSampleNum === 1 && restSampleNum === 0))) {
            const codeBuilder = new codebuilder_1.CodeBuilder(this);
            const program = codeBuilder.compileProgram(gl, vShader, uniformLocs, shaders);
            return program;
        }
        // otherwise, regroup and try again on regrouped loops
        this.effects = this.regroup();
        return new webglprogramloop_1.WebGLProgramLoop(this.effects.map((e) => e.genPrograms(gl, vShader, uniformLocs, shaders)), this.loopInfo, gl);
    }
    /**
     * changes the render target of an effect loop (-1 targest the scene texture;
     * this is used internally)
     */
    target(num) {
        this.loopInfo.target = num;
        return this;
    }
    /** @ignore */
    hasTargetSwitch() {
        for (const e of this.effects) {
            if (e instanceof EffectLoop) {
                if (e.loopInfo.target !== this.loopInfo.target || e.hasTargetSwitch())
                    return true;
            }
        }
        return false;
    }
    /** @ignore */
    regionWrap(space, failure, finalPath = true, not) {
        this.effects = this.effects.map((e, index) => 
        // loops that aren't all the way to the right can't terminate the count ternery
        // don't wrap fcolors in a ternery (it's redundant)
        e instanceof EffectLoop
            ? e.regionWrap(space, failure, index === this.effects.length - 1, not)
            : new setcolorexpr_1.SetColorExpr(regiondecorator_1.region(space, e.brandExprWithRegion(space), index === this.effects.length - 1 && finalPath
                ? !(failure instanceof fragcolorexpr_1.FragColorExpr)
                    ? ternaryexpr_1.ternary(null, failure, fragcolorexpr_1.fcolor())
                    : failure
                : fragcolorexpr_1.fcolor(), not)));
        return this;
    }
}
exports.EffectLoop = EffectLoop;
/** creates an effect loop */
function loop(effects, rep = 1) {
    return new EffectLoop(effects, { num: rep });
}
exports.loop = loop;
/** @ignore */
const V_SOURCE = `attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}\n`;
/** class that can merge effects */
class Merger {
    /**
     * constructs the object that runs the effects
     * @param effects list of effects that define the final effect
     * @param source the source image or texture
     * @param gl the target rendering context
     * @param options additional options for the texture
     */
    constructor(effects, source, gl, options) {
        this.uniformLocs = {};
        /** additional channels */
        this.channels = [];
        this.fShaders = [];
        this.textureMode = source instanceof WebGLTexture;
        // set channels if provided with channels
        if ((options === null || options === void 0 ? void 0 : options.channels) !== undefined)
            this.channels = options === null || options === void 0 ? void 0 : options.channels;
        if (!(effects instanceof EffectDictionary)) {
            effects = new EffectDictionary({ default: effects });
        }
        // add the copy to scene texture if in texture mode
        if (this.textureMode) {
            if (settings_1.settings.verbosity > 1) {
                console.log("we are in texture mode!");
            }
            for (const name in effects.effectMap) {
                const list = effects.effectMap[name];
                list.unshift(loop([scenesampleexpr_1.input()]).target(-1));
            }
        }
        this.source = source;
        this.gl = gl;
        this.options = options;
        // set the viewport
        this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
        // set up the vertex buffer
        const vertexBuffer = this.gl.createBuffer();
        if (vertexBuffer === null) {
            throw new Error("problem creating vertex buffer");
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        const vertexArray = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
        const triangles = new Float32Array(vertexArray);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, triangles, this.gl.STATIC_DRAW);
        // save the vertex buffer reference just so we can delete it later
        this.vertexBuffer = vertexBuffer;
        // compile the simple vertex shader (2 big triangles)
        const vShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        if (vShader === null) {
            throw new Error("problem creating the vertex shader");
        }
        // save the vertex shader reference just so we can delete it later
        this.vShader = vShader;
        this.gl.shaderSource(vShader, V_SOURCE);
        this.gl.compileShader(vShader);
        // make textures
        this.tex = {
            // make the front texture the source if we're given a texture instead of
            // an image
            back: {
                name: "orig_back",
                tex: source instanceof WebGLTexture
                    ? source
                    : makeTexture(this.gl, this.options),
            },
            front: { name: "orig_front", tex: makeTexture(this.gl, this.options) },
            scene: undefined,
            bufTextures: [],
        };
        // create the framebuffer
        const framebuffer = gl.createFramebuffer();
        if (framebuffer === null) {
            throw new Error("problem creating the framebuffer");
        }
        this.framebuffer = framebuffer;
        const { programMap, needs } = effects.toProgramMap(this.gl, this.vShader, this.uniformLocs, this.fShaders);
        this.programMap = programMap;
        if (needs.sceneBuffer || this.textureMode) {
            // we always create a scene texture if we're in texture mode
            this.tex.scene = {
                name: "scene",
                tex: makeTexture(this.gl, this.options),
            };
        }
        if (programMap["default"] === undefined) {
            throw new Error("no default program");
        }
        this.programLoop = programMap["default"];
        // create x amount of empty textures based on buffers needed
        const channelsNeeded = Math.max(...needs.extraBuffers) + 1;
        const channelsSupplied = this.channels.length;
        if (channelsNeeded > channelsSupplied) {
            throw new Error("not enough channels supplied for this effect");
        }
        for (let i = 0; i < this.channels.length; i++) {
            const texOrImage = this.channels[i];
            if (!(texOrImage instanceof WebGLTexture)) {
                // create a new texture; we will update this with the image source every draw
                const texture = makeTexture(this.gl, this.options);
                this.tex.bufTextures.push({ name: "tex_channel_" + i, tex: texture });
            }
            else {
                // this is already a texture; the user will handle updating this
                this.tex.bufTextures.push({
                    name: "img_channel_" + i,
                    tex: texOrImage,
                });
            }
        }
        if (settings_1.settings.verbosity > 0) {
            console.log(effects);
            console.log(this.programMap);
        }
    }
    /**
     * use the source and channels to draw effect to target context; mouse
     * position (as with all positions) are stored from the bottom left corner as
     * this is how texture data is stored
     * @param timeVal number to set the time uniform to (supply this if you plan to
     * use [[time]])
     * @param mouseX the x position of the mouse (supply this if you plan to use
     * [[mouse]] or [[nmouse]])
     * @param mouseY the y position of the mouse (supply this if you plan to use
     * [[mouse]] or [[nmouse]])
     */
    draw(timeVal = 0, mouseX = 0, mouseY = 0) {
        this.gl.activeTexture(this.gl.TEXTURE0 + settings_1.settings.offset);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.tex.back.tex);
        sendTexture(this.gl, this.source);
        // TODO only do unbinding and rebinding in texture mode
        // TODO see if we need to unbind
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        // bind the scene buffer
        if (this.programLoop.getTotalNeeds().sceneBuffer &&
            this.tex.scene !== undefined) {
            this.gl.activeTexture(this.gl.TEXTURE1 + settings_1.settings.offset);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.tex.scene.tex);
            sendTexture(this.gl, this.source);
            // TODO see if we need to unbind
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        }
        // bind the additional buffers
        let counter = 0;
        for (const b of this.channels) {
            // TODO check for texture limit
            this.gl.activeTexture(this.gl.TEXTURE2 + counter + settings_1.settings.offset);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.tex.bufTextures[counter].tex);
            sendTexture(this.gl, b);
            // TODO see if we need to unbind (this gets rid of the error)
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
            counter++;
        }
        this.programLoop.run(this.gl, this.tex, this.framebuffer, this.uniformLocs, this.programLoop.last, { timeVal: timeVal, mouseX: mouseX, mouseY: mouseY });
    }
    /**
     * delete all resources created by construction of this [[Merger]]; use right before
     * intentionally losing a reference to this merger object. this is useful if you want
     * to construct another [[Merger]] to use new effects
     */
    delete() {
        // TODO do we have to do something with VertexAttribArray?
        // call bind with null on all textures
        for (let i = 0; i < 2 + this.tex.bufTextures.length; i++) {
            // this gets rid of final texture, scene texture and channels
            this.gl.activeTexture(this.gl.TEXTURE0 + i + settings_1.settings.offset);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        }
        // call bind with null on all vertex buffers (just 1)
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        // call bind with null on all frame buffers (just 1)
        // (this might be redundant because this happens at end of draw call)
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        // delete all programs
        this.programLoop.delete(this.gl);
        // delete all textures
        this.gl.deleteTexture(this.tex.front.tex);
        this.gl.deleteTexture(this.tex.back.tex);
        for (const c of this.tex.bufTextures) {
            this.gl.deleteTexture(c.tex);
        }
        // delete all vertex buffers (just 1)
        this.gl.deleteBuffer(this.vertexBuffer);
        // delete all frame buffers (just 1)
        this.gl.deleteFramebuffer(this.framebuffer);
        // delete all vertex shaders (just 1)
        this.gl.deleteShader(this.vShader);
        // delete all fragment shaders
        for (const f of this.fShaders) {
            this.gl.deleteShader(f);
        }
    }
    /**
     * changes the current program loop
     * @param str key in the program map
     */
    changeProgram(str) {
        if (this.programMap[str] === undefined) {
            throw new Error(`program "${str}" doesn't exist on this merger`);
        }
        this.programLoop = this.programMap[str];
    }
}
exports.Merger = Merger;
/** creates a texture given a context and options */
function makeTexture(gl, options) {
    const texture = gl.createTexture();
    if (texture === null) {
        throw new Error("problem creating texture");
    }
    // flip the order of the pixels, or else it displays upside down
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    // bind the texture after creating it
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const filterMode = (f) => f === undefined || f === "linear" ? gl.LINEAR : gl.NEAREST;
    // how to map texture element
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filterMode(options === null || options === void 0 ? void 0 : options.minFilterMode));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filterMode(options === null || options === void 0 ? void 0 : options.maxFilterMode));
    if ((options === null || options === void 0 ? void 0 : options.edgeMode) !== "wrap") {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    return texture;
}
exports.makeTexture = makeTexture;
/** copies onto texture */
function sendTexture(gl, src) {
    // if you are using textures instead of images, the user is responsible for
    // updating that texture, so just return
    if (src instanceof WebGLTexture || src === null)
        return;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
}
exports.sendTexture = sendTexture;

},{"./codebuilder":33,"./exprs/expr":47,"./exprs/fragcolorexpr":48,"./exprs/regiondecorator":69,"./exprs/scenesampleexpr":73,"./exprs/setcolorexpr":74,"./exprs/ternaryexpr":77,"./settings":86,"./webglprogramloop":88}],86:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settings = void 0;
exports.settings = {
    /**
     * set to 1 if you want reasonable logging for debugging, such as the
     * generated GLSL code and program tree. set to 100 if you want texture debug
     * info (you probably don't want to do this, as it logs many lines every
     * frame!)
     */
    verbosity: 0,
    /** texture offset */
    offset: 0,
};

},{}],87:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.brandWithRegion = exports.brandWithChannel = exports.captureAndAppend = void 0;
const glslfunctions_1 = require("./glslfunctions");
/** @ignore */
function captureAndAppend(str, reg, suffix) {
    const matches = str.match(reg);
    if (matches === null)
        throw new Error("no match in the given string");
    return str.replace(reg, matches[0] + suffix);
}
exports.captureAndAppend = captureAndAppend;
/** @ignore */
function nameExtractor(sourceLists, extra) {
    const origFuncName = sourceLists.sections[0];
    const ending = origFuncName[origFuncName.length - 1] === ")" ? ")" : "";
    const newFuncName = origFuncName.substr(0, origFuncName.length - 1 - ~~(ending === ")")) +
        extra +
        "(" +
        ending;
    return { origFuncName, newFuncName, ending };
}
/** @ignore */
function brandWithChannel(sourceLists, funcs, needs, funcIndex, samplerNum) {
    samplerNum === undefined || samplerNum === -1
        ? (needs.neighborSample = true)
        : (needs.extraBuffers = new Set([samplerNum]));
    if (samplerNum === undefined || samplerNum === -1)
        return;
    const { origFuncName, newFuncName, ending } = nameExtractor(sourceLists, samplerNum !== undefined ? "_" + samplerNum : "");
    sourceLists.sections[0] = sourceLists.sections[0]
        .split(origFuncName)
        .join(newFuncName);
    funcs[funcIndex] = funcs[funcIndex]
        .split(origFuncName)
        .join(newFuncName)
        .split("uSampler")
        .join("uBufferSampler" + samplerNum);
}
exports.brandWithChannel = brandWithChannel;
/** @ignore */
function brandWithRegion(expr, funcIndex, space) {
    // if it's not a rectangle region we can't do anything so just return
    if (!Array.isArray(space))
        return;
    const sourceLists = expr.sourceLists;
    const funcs = expr.externalFuncs;
    const needs = expr.needs;
    if (expr.regionBranded ||
        (!needs.neighborSample && needs.extraBuffers.size === 0))
        return;
    const { origFuncName, newFuncName, ending } = nameExtractor(sourceLists, "_region");
    const openFuncName = newFuncName.substr(0, newFuncName.length - ~~(ending === ")"));
    const newFuncDeclaration = openFuncName +
        "float r_x_min, float r_y_min, float r_x_max, float r_y_max" +
        (ending === ")" ? ")" : ", ");
    const origTextureName = "texture2D(";
    const newTextureName = "texture2D_region(r_x_min, r_y_min, r_x_max, r_y_max, ";
    // replace name in the external function and `texture2D` and sampler
    // (assumes the sampling function is the first external function)
    funcs[funcIndex] = funcs[funcIndex]
        .split(origFuncName)
        .join(newFuncDeclaration)
        .split(origTextureName)
        .join(newTextureName);
    // shift the original name off the list
    sourceLists.sections.shift();
    // add the close paren if we're opening up a function with 0 args
    if (ending === ")")
        sourceLists.sections.unshift(")");
    // add commas (one less if it is a 0 arg function call)
    for (let i = 0; i < 4 - ~~(ending === ")"); i++) {
        sourceLists.sections.unshift(", ");
    }
    // add the new name to the beginning of the list
    sourceLists.sections.unshift(newFuncName.substr(0, newFuncName.length - ~~(ending === ")")));
    // add values from region data
    sourceLists.values.unshift(...space);
    // put the texture access wrapper at the beginning
    funcs.unshift(glslfunctions_1.glslFuncs.texture2D_region);
    expr.regionBranded = true;
}
exports.brandWithRegion = brandWithRegion;

},{"./glslfunctions":83}],88:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebGLProgramLoop = exports.WebGLProgramLeaf = exports.updateNeeds = void 0;
const settings_1 = require("./settings");
// update me on change to needs
function updateNeeds(acc, curr) {
    return {
        neighborSample: acc.neighborSample || curr.neighborSample,
        centerSample: acc.centerSample || curr.centerSample,
        sceneBuffer: acc.sceneBuffer || curr.sceneBuffer,
        timeUniform: acc.timeUniform || curr.timeUniform,
        mouseUniform: acc.mouseUniform || curr.mouseUniform,
        passCount: acc.passCount || curr.passCount,
        extraBuffers: new Set([...acc.extraBuffers, ...curr.extraBuffers]),
    };
}
exports.updateNeeds = updateNeeds;
class WebGLProgramLeaf {
    constructor(program, totalNeeds, effects) {
        this.program = program;
        this.totalNeeds = totalNeeds;
        this.effects = effects;
    }
}
exports.WebGLProgramLeaf = WebGLProgramLeaf;
/** @ignore */
function getLoc(programElement, gl, name) {
    gl.useProgram(programElement.program);
    const loc = gl.getUniformLocation(programElement.program, name);
    if (loc === null) {
        throw new Error("could not get the " + name + " uniform location");
    }
    return loc;
}
/** recursive data structure of compiled programs */
class WebGLProgramLoop {
    constructor(programElement, loopInfo, gl) {
        //effects: Expr[];
        this.last = false;
        this.counter = 0;
        this.programElement = programElement;
        this.loopInfo = loopInfo;
        if (this.programElement instanceof WebGLProgramLeaf) {
            if (gl === undefined) {
                throw new Error("program element is a program but context is undefined");
            }
            if (this.programElement.totalNeeds.timeUniform) {
                this.timeLoc = getLoc(this.programElement, gl, "uTime");
            }
            if (this.programElement.totalNeeds.mouseUniform) {
                this.mouseLoc = getLoc(this.programElement, gl, "uMouse");
            }
            if (this.programElement.totalNeeds.passCount) {
                this.countLoc = getLoc(this.programElement, gl, "uCount");
            }
        }
    }
    /** get all needs from all programs */
    getTotalNeeds() {
        // go through needs of program loop
        if (!(this.programElement instanceof WebGLProgramLeaf)) {
            const allNeeds = [];
            for (const p of this.programElement) {
                allNeeds.push(p.getTotalNeeds());
            }
            return allNeeds.reduce(updateNeeds);
        }
        return this.programElement.totalNeeds;
    }
    /**
     * recursively uses all programs in the loop, binding the appropriate
     * textures and setting the appropriate uniforms; the user should only have
     * to call [[draw]] on [[Merger]] and never this function directly
     */
    run(gl, tex, framebuffer, uniformLocs, last, defaultUniforms, outerLoop) {
        let savedTexture;
        if (this.loopInfo.target !== undefined &&
            // if there is a target switch:
            (outerLoop === null || outerLoop === void 0 ? void 0 : outerLoop.loopInfo.target) !== this.loopInfo.target) {
            // swap out the back texture for the channel texture if this loop has
            // an alternate render target
            savedTexture = tex.back;
            if (this.loopInfo.target !== -1) {
                tex.back = tex.bufTextures[this.loopInfo.target];
            }
            else {
                if (tex.scene === undefined) {
                    throw new Error("tried to target -1 but scene texture was undefined");
                }
                tex.back = tex.scene;
            }
            tex.bufTextures[this.loopInfo.target] = savedTexture;
            if (settings_1.settings.verbosity > 99)
                console.log("saved texture: " + savedTexture.name);
        }
        // setup for program leaf
        if (this.programElement instanceof WebGLProgramLeaf) {
            // bind the scene texture if needed
            if (this.programElement.totalNeeds.sceneBuffer) {
                if (tex.scene === undefined) {
                    throw new Error("needs scene buffer, but scene texture is somehow undefined");
                }
                gl.activeTexture(gl.TEXTURE1 + settings_1.settings.offset);
                if (this.loopInfo.target === -1) {
                    gl.bindTexture(gl.TEXTURE_2D, savedTexture.tex);
                }
                else {
                    gl.bindTexture(gl.TEXTURE_2D, tex.scene.tex);
                }
            }
            // bind all extra channel textures if needed
            for (const n of this.programElement.totalNeeds.extraBuffers) {
                gl.activeTexture(gl.TEXTURE2 + n + settings_1.settings.offset);
                gl.bindTexture(gl.TEXTURE_2D, tex.bufTextures[n].tex);
            }
            // use the current program
            gl.useProgram(this.programElement.program);
            // apply all uniforms
            for (const effect of this.programElement.effects) {
                effect.applyUniforms(gl, uniformLocs);
            }
            // set time uniform if needed
            if (this.programElement.totalNeeds.timeUniform) {
                if (this.timeLoc === undefined ||
                    defaultUniforms.timeVal === undefined) {
                    throw new Error("time or location is undefined");
                }
                gl.uniform1f(this.timeLoc, defaultUniforms.timeVal);
            }
            // set mouse uniforms if needed
            if (this.programElement.totalNeeds.mouseUniform) {
                if (this.mouseLoc === undefined ||
                    defaultUniforms.mouseX === undefined ||
                    defaultUniforms.mouseY === undefined) {
                    throw new Error("mouse uniform or location is undefined");
                }
                gl.uniform2f(this.mouseLoc, defaultUniforms.mouseX, defaultUniforms.mouseY);
            }
            // set count uniform if needed
            if (this.programElement.totalNeeds.passCount && outerLoop !== undefined) {
                if (this.countLoc === undefined) {
                    throw new Error("count location is undefined");
                }
                if (outerLoop !== undefined) {
                    gl.uniform1i(this.countLoc, outerLoop.counter);
                }
                this.counter++;
                const mod = outerLoop === undefined ? 1 : outerLoop.loopInfo.num;
                this.counter %= mod;
            }
        }
        for (let i = 0; i < this.loopInfo.num; i++) {
            const newLast = i === this.loopInfo.num - 1;
            if (this.programElement instanceof WebGLProgramLeaf) {
                if (newLast && last && this.last) {
                    // we are on the final pass of the final loop, so draw screen by
                    // setting to the default framebuffer
                    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                }
                else {
                    // we have to bounce between two textures
                    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
                    // use the framebuffer to write to front texture
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex.front.tex, 0);
                }
                // allows us to read from `texBack`
                // default sampler is 0, so `uSampler` uniform will always sample from texture 0
                gl.activeTexture(gl.TEXTURE0 + settings_1.settings.offset);
                gl.bindTexture(gl.TEXTURE_2D, tex.back.tex);
                // use our last program as the draw program
                gl.drawArrays(gl.TRIANGLES, 0, 6);
                if (settings_1.settings.verbosity > 99) {
                    console.log("intermediate back", tex.back.name);
                    console.log("intermediate front", tex.front.name);
                }
                // swap back and front
                [tex.back, tex.front] = [tex.front, tex.back];
                // deactivate and unbind all the channel textures needed
                for (const n of this.programElement.totalNeeds.extraBuffers) {
                    gl.activeTexture(gl.TEXTURE2 + n + settings_1.settings.offset);
                    gl.bindTexture(gl.TEXTURE_2D, null);
                }
                gl.activeTexture(gl.TEXTURE1 + settings_1.settings.offset);
                gl.bindTexture(gl.TEXTURE_2D, null);
            }
            else {
                if (this.loopInfo.func !== undefined) {
                    this.loopInfo.func(i);
                }
                for (const p of this.programElement) {
                    p.run(gl, tex, framebuffer, uniformLocs, newLast, defaultUniforms, this // this is now the outer loop
                    );
                }
            }
        }
        // swap the textures back if we were temporarily using a channel texture
        if (savedTexture !== undefined) {
            const target = this.loopInfo.target;
            if (settings_1.settings.verbosity > 99) {
                console.log("pre final back", tex.back.name);
                console.log("pre final front", tex.front.name);
            }
            // back texture is really the front texture because it was just swapped
            if (this.loopInfo.target !== -1) {
                tex.bufTextures[target] = tex.back;
            }
            else {
                if (tex.scene === undefined) {
                    throw new Error("tried to replace -1 but scene texture was undefined");
                }
                tex.scene = tex.back;
            }
            tex.back = savedTexture;
            if (settings_1.settings.verbosity > 99) {
                console.log("post final back", tex.back.name);
                console.log("post final front", tex.front.name);
                console.log("channel texture", tex.bufTextures[target].name);
            }
        }
    }
    delete(gl) {
        if (this.programElement instanceof WebGLProgramLeaf) {
            gl.deleteProgram(this.programElement.program);
        }
        else {
            for (const p of this.programElement) {
                p.delete(gl);
            }
        }
    }
}
exports.WebGLProgramLoop = WebGLProgramLoop;

},{"./settings":86}],89:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],90:[function(require,module,exports){
/**
 * Bit twiddling hacks for JavaScript.
 *
 * Author: Mikola Lysenko
 *
 * Ported from Stanford bit twiddling hack library:
 *    http://graphics.stanford.edu/~seander/bithacks.html
 */

"use strict"; "use restrict";

//Number of bits in an integer
var INT_BITS = 32;

//Constants
exports.INT_BITS  = INT_BITS;
exports.INT_MAX   =  0x7fffffff;
exports.INT_MIN   = -1<<(INT_BITS-1);

//Returns -1, 0, +1 depending on sign of x
exports.sign = function(v) {
  return (v > 0) - (v < 0);
}

//Computes absolute value of integer
exports.abs = function(v) {
  var mask = v >> (INT_BITS-1);
  return (v ^ mask) - mask;
}

//Computes minimum of integers x and y
exports.min = function(x, y) {
  return y ^ ((x ^ y) & -(x < y));
}

//Computes maximum of integers x and y
exports.max = function(x, y) {
  return x ^ ((x ^ y) & -(x < y));
}

//Checks if a number is a power of two
exports.isPow2 = function(v) {
  return !(v & (v-1)) && (!!v);
}

//Computes log base 2 of v
exports.log2 = function(v) {
  var r, shift;
  r =     (v > 0xFFFF) << 4; v >>>= r;
  shift = (v > 0xFF  ) << 3; v >>>= shift; r |= shift;
  shift = (v > 0xF   ) << 2; v >>>= shift; r |= shift;
  shift = (v > 0x3   ) << 1; v >>>= shift; r |= shift;
  return r | (v >> 1);
}

//Computes log base 10 of v
exports.log10 = function(v) {
  return  (v >= 1000000000) ? 9 : (v >= 100000000) ? 8 : (v >= 10000000) ? 7 :
          (v >= 1000000) ? 6 : (v >= 100000) ? 5 : (v >= 10000) ? 4 :
          (v >= 1000) ? 3 : (v >= 100) ? 2 : (v >= 10) ? 1 : 0;
}

//Counts number of bits
exports.popCount = function(v) {
  v = v - ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return ((v + (v >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24;
}

//Counts number of trailing zeros
function countTrailingZeros(v) {
  var c = 32;
  v &= -v;
  if (v) c--;
  if (v & 0x0000FFFF) c -= 16;
  if (v & 0x00FF00FF) c -= 8;
  if (v & 0x0F0F0F0F) c -= 4;
  if (v & 0x33333333) c -= 2;
  if (v & 0x55555555) c -= 1;
  return c;
}
exports.countTrailingZeros = countTrailingZeros;

//Rounds to next power of 2
exports.nextPow2 = function(v) {
  v += v === 0;
  --v;
  v |= v >>> 1;
  v |= v >>> 2;
  v |= v >>> 4;
  v |= v >>> 8;
  v |= v >>> 16;
  return v + 1;
}

//Rounds down to previous power of 2
exports.prevPow2 = function(v) {
  v |= v >>> 1;
  v |= v >>> 2;
  v |= v >>> 4;
  v |= v >>> 8;
  v |= v >>> 16;
  return v - (v>>>1);
}

//Computes parity of word
exports.parity = function(v) {
  v ^= v >>> 16;
  v ^= v >>> 8;
  v ^= v >>> 4;
  v &= 0xf;
  return (0x6996 >>> v) & 1;
}

var REVERSE_TABLE = new Array(256);

(function(tab) {
  for(var i=0; i<256; ++i) {
    var v = i, r = i, s = 7;
    for (v >>>= 1; v; v >>>= 1) {
      r <<= 1;
      r |= v & 1;
      --s;
    }
    tab[i] = (r << s) & 0xff;
  }
})(REVERSE_TABLE);

//Reverse bits in a 32 bit word
exports.reverse = function(v) {
  return  (REVERSE_TABLE[ v         & 0xff] << 24) |
          (REVERSE_TABLE[(v >>> 8)  & 0xff] << 16) |
          (REVERSE_TABLE[(v >>> 16) & 0xff] << 8)  |
           REVERSE_TABLE[(v >>> 24) & 0xff];
}

//Interleave bits of 2 coordinates with 16 bits.  Useful for fast quadtree codes
exports.interleave2 = function(x, y) {
  x &= 0xFFFF;
  x = (x | (x << 8)) & 0x00FF00FF;
  x = (x | (x << 4)) & 0x0F0F0F0F;
  x = (x | (x << 2)) & 0x33333333;
  x = (x | (x << 1)) & 0x55555555;

  y &= 0xFFFF;
  y = (y | (y << 8)) & 0x00FF00FF;
  y = (y | (y << 4)) & 0x0F0F0F0F;
  y = (y | (y << 2)) & 0x33333333;
  y = (y | (y << 1)) & 0x55555555;

  return x | (y << 1);
}

//Extracts the nth interleaved component
exports.deinterleave2 = function(v, n) {
  v = (v >>> n) & 0x55555555;
  v = (v | (v >>> 1))  & 0x33333333;
  v = (v | (v >>> 2))  & 0x0F0F0F0F;
  v = (v | (v >>> 4))  & 0x00FF00FF;
  v = (v | (v >>> 16)) & 0x000FFFF;
  return (v << 16) >> 16;
}


//Interleave bits of 3 coordinates, each with 10 bits.  Useful for fast octree codes
exports.interleave3 = function(x, y, z) {
  x &= 0x3FF;
  x  = (x | (x<<16)) & 4278190335;
  x  = (x | (x<<8))  & 251719695;
  x  = (x | (x<<4))  & 3272356035;
  x  = (x | (x<<2))  & 1227133513;

  y &= 0x3FF;
  y  = (y | (y<<16)) & 4278190335;
  y  = (y | (y<<8))  & 251719695;
  y  = (y | (y<<4))  & 3272356035;
  y  = (y | (y<<2))  & 1227133513;
  x |= (y << 1);
  
  z &= 0x3FF;
  z  = (z | (z<<16)) & 4278190335;
  z  = (z | (z<<8))  & 251719695;
  z  = (z | (z<<4))  & 3272356035;
  z  = (z | (z<<2))  & 1227133513;
  
  return x | (z << 2);
}

//Extracts nth interleaved component of a 3-tuple
exports.deinterleave3 = function(v, n) {
  v = (v >>> n)       & 1227133513;
  v = (v | (v>>>2))   & 3272356035;
  v = (v | (v>>>4))   & 251719695;
  v = (v | (v>>>8))   & 4278190335;
  v = (v | (v>>>16))  & 0x3FF;
  return (v<<22)>>22;
}

//Computes next combination in colexicographic order (this is mistakenly called nextPermutation on the bit twiddling hacks page)
exports.nextCombination = function(v) {
  var t = v | (v - 1);
  return (t + 1) | (((~t & -~t) - 1) >>> (countTrailingZeros(v) + 1));
}


},{}],91:[function(require,module,exports){

},{}],92:[function(require,module,exports){
(function (Buffer){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var customInspectSymbol =
  (typeof Symbol === 'function' && typeof Symbol.for === 'function')
    ? Symbol.for('nodejs.util.inspect.custom')
    : null

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    var proto = { foo: function () { return 42 } }
    Object.setPrototypeOf(proto, Uint8Array.prototype)
    Object.setPrototypeOf(arr, proto)
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  Object.setPrototypeOf(buf, Buffer.prototype)
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw new TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof SharedArrayBuffer !== 'undefined' &&
      (isInstance(value, SharedArrayBuffer) ||
      (value && isInstance(value.buffer, SharedArrayBuffer)))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype)
Object.setPrototypeOf(Buffer, Uint8Array)

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(buf, Buffer.prototype)

  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}
if (customInspectSymbol) {
  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += hexSliceLookupTable[buf[i]]
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(newBuf, Buffer.prototype)

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  } else if (typeof val === 'boolean') {
    val = Number(val)
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

// Create lookup table for `toString('hex')`
// See: https://github.com/feross/buffer/issues/219
var hexSliceLookupTable = (function () {
  var alphabet = '0123456789abcdef'
  var table = new Array(256)
  for (var i = 0; i < 16; ++i) {
    var i16 = i * 16
    for (var j = 0; j < 16; ++j) {
      table[i16 + j] = alphabet[i] + alphabet[j]
    }
  }
  return table
})()

}).call(this,require("buffer").Buffer)

},{"base64-js":89,"buffer":92,"ieee754":179}],93:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.

function isArray(arg) {
  if (Array.isArray) {
    return Array.isArray(arg);
  }
  return objectToString(arg) === '[object Array]';
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = Buffer.isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

}).call(this,{"isBuffer":require("../../is-buffer/index.js")})

},{"../../is-buffer/index.js":182}],94:[function(require,module,exports){
"use strict"

var createThunk = require("./lib/thunk.js")

function Procedure() {
  this.argTypes = []
  this.shimArgs = []
  this.arrayArgs = []
  this.arrayBlockIndices = []
  this.scalarArgs = []
  this.offsetArgs = []
  this.offsetArgIndex = []
  this.indexArgs = []
  this.shapeArgs = []
  this.funcName = ""
  this.pre = null
  this.body = null
  this.post = null
  this.debug = false
}

function compileCwise(user_args) {
  //Create procedure
  var proc = new Procedure()
  
  //Parse blocks
  proc.pre    = user_args.pre
  proc.body   = user_args.body
  proc.post   = user_args.post

  //Parse arguments
  var proc_args = user_args.args.slice(0)
  proc.argTypes = proc_args
  for(var i=0; i<proc_args.length; ++i) {
    var arg_type = proc_args[i]
    if(arg_type === "array" || (typeof arg_type === "object" && arg_type.blockIndices)) {
      proc.argTypes[i] = "array"
      proc.arrayArgs.push(i)
      proc.arrayBlockIndices.push(arg_type.blockIndices ? arg_type.blockIndices : 0)
      proc.shimArgs.push("array" + i)
      if(i < proc.pre.args.length && proc.pre.args[i].count>0) {
        throw new Error("cwise: pre() block may not reference array args")
      }
      if(i < proc.post.args.length && proc.post.args[i].count>0) {
        throw new Error("cwise: post() block may not reference array args")
      }
    } else if(arg_type === "scalar") {
      proc.scalarArgs.push(i)
      proc.shimArgs.push("scalar" + i)
    } else if(arg_type === "index") {
      proc.indexArgs.push(i)
      if(i < proc.pre.args.length && proc.pre.args[i].count > 0) {
        throw new Error("cwise: pre() block may not reference array index")
      }
      if(i < proc.body.args.length && proc.body.args[i].lvalue) {
        throw new Error("cwise: body() block may not write to array index")
      }
      if(i < proc.post.args.length && proc.post.args[i].count > 0) {
        throw new Error("cwise: post() block may not reference array index")
      }
    } else if(arg_type === "shape") {
      proc.shapeArgs.push(i)
      if(i < proc.pre.args.length && proc.pre.args[i].lvalue) {
        throw new Error("cwise: pre() block may not write to array shape")
      }
      if(i < proc.body.args.length && proc.body.args[i].lvalue) {
        throw new Error("cwise: body() block may not write to array shape")
      }
      if(i < proc.post.args.length && proc.post.args[i].lvalue) {
        throw new Error("cwise: post() block may not write to array shape")
      }
    } else if(typeof arg_type === "object" && arg_type.offset) {
      proc.argTypes[i] = "offset"
      proc.offsetArgs.push({ array: arg_type.array, offset:arg_type.offset })
      proc.offsetArgIndex.push(i)
    } else {
      throw new Error("cwise: Unknown argument type " + proc_args[i])
    }
  }
  
  //Make sure at least one array argument was specified
  if(proc.arrayArgs.length <= 0) {
    throw new Error("cwise: No array arguments specified")
  }
  
  //Make sure arguments are correct
  if(proc.pre.args.length > proc_args.length) {
    throw new Error("cwise: Too many arguments in pre() block")
  }
  if(proc.body.args.length > proc_args.length) {
    throw new Error("cwise: Too many arguments in body() block")
  }
  if(proc.post.args.length > proc_args.length) {
    throw new Error("cwise: Too many arguments in post() block")
  }

  //Check debug flag
  proc.debug = !!user_args.printCode || !!user_args.debug
  
  //Retrieve name
  proc.funcName = user_args.funcName || "cwise"
  
  //Read in block size
  proc.blockSize = user_args.blockSize || 64

  return createThunk(proc)
}

module.exports = compileCwise

},{"./lib/thunk.js":96}],95:[function(require,module,exports){
"use strict"

var uniq = require("uniq")

// This function generates very simple loops analogous to how you typically traverse arrays (the outermost loop corresponds to the slowest changing index, the innermost loop to the fastest changing index)
// TODO: If two arrays have the same strides (and offsets) there is potential for decreasing the number of "pointers" and related variables. The drawback is that the type signature would become more specific and that there would thus be less potential for caching, but it might still be worth it, especially when dealing with large numbers of arguments.
function innerFill(order, proc, body) {
  var dimension = order.length
    , nargs = proc.arrayArgs.length
    , has_index = proc.indexArgs.length>0
    , code = []
    , vars = []
    , idx=0, pidx=0, i, j
  for(i=0; i<dimension; ++i) { // Iteration variables
    vars.push(["i",i,"=0"].join(""))
  }
  //Compute scan deltas
  for(j=0; j<nargs; ++j) {
    for(i=0; i<dimension; ++i) {
      pidx = idx
      idx = order[i]
      if(i === 0) { // The innermost/fastest dimension's delta is simply its stride
        vars.push(["d",j,"s",i,"=t",j,"p",idx].join(""))
      } else { // For other dimensions the delta is basically the stride minus something which essentially "rewinds" the previous (more inner) dimension
        vars.push(["d",j,"s",i,"=(t",j,"p",idx,"-s",pidx,"*t",j,"p",pidx,")"].join(""))
      }
    }
  }
  if (vars.length > 0) {
    code.push("var " + vars.join(","))
  }  
  //Scan loop
  for(i=dimension-1; i>=0; --i) { // Start at largest stride and work your way inwards
    idx = order[i]
    code.push(["for(i",i,"=0;i",i,"<s",idx,";++i",i,"){"].join(""))
  }
  //Push body of inner loop
  code.push(body)
  //Advance scan pointers
  for(i=0; i<dimension; ++i) {
    pidx = idx
    idx = order[i]
    for(j=0; j<nargs; ++j) {
      code.push(["p",j,"+=d",j,"s",i].join(""))
    }
    if(has_index) {
      if(i > 0) {
        code.push(["index[",pidx,"]-=s",pidx].join(""))
      }
      code.push(["++index[",idx,"]"].join(""))
    }
    code.push("}")
  }
  return code.join("\n")
}

// Generate "outer" loops that loop over blocks of data, applying "inner" loops to the blocks by manipulating the local variables in such a way that the inner loop only "sees" the current block.
// TODO: If this is used, then the previous declaration (done by generateCwiseOp) of s* is essentially unnecessary.
//       I believe the s* are not used elsewhere (in particular, I don't think they're used in the pre/post parts and "shape" is defined independently), so it would be possible to make defining the s* dependent on what loop method is being used.
function outerFill(matched, order, proc, body) {
  var dimension = order.length
    , nargs = proc.arrayArgs.length
    , blockSize = proc.blockSize
    , has_index = proc.indexArgs.length > 0
    , code = []
  for(var i=0; i<nargs; ++i) {
    code.push(["var offset",i,"=p",i].join(""))
  }
  //Generate loops for unmatched dimensions
  // The order in which these dimensions are traversed is fairly arbitrary (from small stride to large stride, for the first argument)
  // TODO: It would be nice if the order in which these loops are placed would also be somehow "optimal" (at the very least we should check that it really doesn't hurt us if they're not).
  for(var i=matched; i<dimension; ++i) {
    code.push(["for(var j"+i+"=SS[", order[i], "]|0;j", i, ">0;){"].join("")) // Iterate back to front
    code.push(["if(j",i,"<",blockSize,"){"].join("")) // Either decrease j by blockSize (s = blockSize), or set it to zero (after setting s = j).
    code.push(["s",order[i],"=j",i].join(""))
    code.push(["j",i,"=0"].join(""))
    code.push(["}else{s",order[i],"=",blockSize].join(""))
    code.push(["j",i,"-=",blockSize,"}"].join(""))
    if(has_index) {
      code.push(["index[",order[i],"]=j",i].join(""))
    }
  }
  for(var i=0; i<nargs; ++i) {
    var indexStr = ["offset"+i]
    for(var j=matched; j<dimension; ++j) {
      indexStr.push(["j",j,"*t",i,"p",order[j]].join(""))
    }
    code.push(["p",i,"=(",indexStr.join("+"),")"].join(""))
  }
  code.push(innerFill(order, proc, body))
  for(var i=matched; i<dimension; ++i) {
    code.push("}")
  }
  return code.join("\n")
}

//Count the number of compatible inner orders
// This is the length of the longest common prefix of the arrays in orders.
// Each array in orders lists the dimensions of the correspond ndarray in order of increasing stride.
// This is thus the maximum number of dimensions that can be efficiently traversed by simple nested loops for all arrays.
function countMatches(orders) {
  var matched = 0, dimension = orders[0].length
  while(matched < dimension) {
    for(var j=1; j<orders.length; ++j) {
      if(orders[j][matched] !== orders[0][matched]) {
        return matched
      }
    }
    ++matched
  }
  return matched
}

//Processes a block according to the given data types
// Replaces variable names by different ones, either "local" ones (that are then ferried in and out of the given array) or ones matching the arguments that the function performing the ultimate loop will accept.
function processBlock(block, proc, dtypes) {
  var code = block.body
  var pre = []
  var post = []
  for(var i=0; i<block.args.length; ++i) {
    var carg = block.args[i]
    if(carg.count <= 0) {
      continue
    }
    var re = new RegExp(carg.name, "g")
    var ptrStr = ""
    var arrNum = proc.arrayArgs.indexOf(i)
    switch(proc.argTypes[i]) {
      case "offset":
        var offArgIndex = proc.offsetArgIndex.indexOf(i)
        var offArg = proc.offsetArgs[offArgIndex]
        arrNum = offArg.array
        ptrStr = "+q" + offArgIndex // Adds offset to the "pointer" in the array
      case "array":
        ptrStr = "p" + arrNum + ptrStr
        var localStr = "l" + i
        var arrStr = "a" + arrNum
        if (proc.arrayBlockIndices[arrNum] === 0) { // Argument to body is just a single value from this array
          if(carg.count === 1) { // Argument/array used only once(?)
            if(dtypes[arrNum] === "generic") {
              if(carg.lvalue) {
                pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")) // Is this necessary if the argument is ONLY used as an lvalue? (keep in mind that we can have a += something, so we would actually need to check carg.rvalue)
                code = code.replace(re, localStr)
                post.push([arrStr, ".set(", ptrStr, ",", localStr,")"].join(""))
              } else {
                code = code.replace(re, [arrStr, ".get(", ptrStr, ")"].join(""))
              }
            } else {
              code = code.replace(re, [arrStr, "[", ptrStr, "]"].join(""))
            }
          } else if(dtypes[arrNum] === "generic") {
            pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")) // TODO: Could we optimize by checking for carg.rvalue?
            code = code.replace(re, localStr)
            if(carg.lvalue) {
              post.push([arrStr, ".set(", ptrStr, ",", localStr,")"].join(""))
            }
          } else {
            pre.push(["var ", localStr, "=", arrStr, "[", ptrStr, "]"].join("")) // TODO: Could we optimize by checking for carg.rvalue?
            code = code.replace(re, localStr)
            if(carg.lvalue) {
              post.push([arrStr, "[", ptrStr, "]=", localStr].join(""))
            }
          }
        } else { // Argument to body is a "block"
          var reStrArr = [carg.name], ptrStrArr = [ptrStr]
          for(var j=0; j<Math.abs(proc.arrayBlockIndices[arrNum]); j++) {
            reStrArr.push("\\s*\\[([^\\]]+)\\]")
            ptrStrArr.push("$" + (j+1) + "*t" + arrNum + "b" + j) // Matched index times stride
          }
          re = new RegExp(reStrArr.join(""), "g")
          ptrStr = ptrStrArr.join("+")
          if(dtypes[arrNum] === "generic") {
            /*if(carg.lvalue) {
              pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")) // Is this necessary if the argument is ONLY used as an lvalue? (keep in mind that we can have a += something, so we would actually need to check carg.rvalue)
              code = code.replace(re, localStr)
              post.push([arrStr, ".set(", ptrStr, ",", localStr,")"].join(""))
            } else {
              code = code.replace(re, [arrStr, ".get(", ptrStr, ")"].join(""))
            }*/
            throw new Error("cwise: Generic arrays not supported in combination with blocks!")
          } else {
            // This does not produce any local variables, even if variables are used multiple times. It would be possible to do so, but it would complicate things quite a bit.
            code = code.replace(re, [arrStr, "[", ptrStr, "]"].join(""))
          }
        }
      break
      case "scalar":
        code = code.replace(re, "Y" + proc.scalarArgs.indexOf(i))
      break
      case "index":
        code = code.replace(re, "index")
      break
      case "shape":
        code = code.replace(re, "shape")
      break
    }
  }
  return [pre.join("\n"), code, post.join("\n")].join("\n").trim()
}

function typeSummary(dtypes) {
  var summary = new Array(dtypes.length)
  var allEqual = true
  for(var i=0; i<dtypes.length; ++i) {
    var t = dtypes[i]
    var digits = t.match(/\d+/)
    if(!digits) {
      digits = ""
    } else {
      digits = digits[0]
    }
    if(t.charAt(0) === 0) {
      summary[i] = "u" + t.charAt(1) + digits
    } else {
      summary[i] = t.charAt(0) + digits
    }
    if(i > 0) {
      allEqual = allEqual && summary[i] === summary[i-1]
    }
  }
  if(allEqual) {
    return summary[0]
  }
  return summary.join("")
}

//Generates a cwise operator
function generateCWiseOp(proc, typesig) {

  //Compute dimension
  // Arrays get put first in typesig, and there are two entries per array (dtype and order), so this gets the number of dimensions in the first array arg.
  var dimension = (typesig[1].length - Math.abs(proc.arrayBlockIndices[0]))|0
  var orders = new Array(proc.arrayArgs.length)
  var dtypes = new Array(proc.arrayArgs.length)
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    dtypes[i] = typesig[2*i]
    orders[i] = typesig[2*i+1]
  }
  
  //Determine where block and loop indices start and end
  var blockBegin = [], blockEnd = [] // These indices are exposed as blocks
  var loopBegin = [], loopEnd = [] // These indices are iterated over
  var loopOrders = [] // orders restricted to the loop indices
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    if (proc.arrayBlockIndices[i]<0) {
      loopBegin.push(0)
      loopEnd.push(dimension)
      blockBegin.push(dimension)
      blockEnd.push(dimension+proc.arrayBlockIndices[i])
    } else {
      loopBegin.push(proc.arrayBlockIndices[i]) // Non-negative
      loopEnd.push(proc.arrayBlockIndices[i]+dimension)
      blockBegin.push(0)
      blockEnd.push(proc.arrayBlockIndices[i])
    }
    var newOrder = []
    for(var j=0; j<orders[i].length; j++) {
      if (loopBegin[i]<=orders[i][j] && orders[i][j]<loopEnd[i]) {
        newOrder.push(orders[i][j]-loopBegin[i]) // If this is a loop index, put it in newOrder, subtracting loopBegin, to make sure that all loopOrders are using a common set of indices.
      }
    }
    loopOrders.push(newOrder)
  }

  //First create arguments for procedure
  var arglist = ["SS"] // SS is the overall shape over which we iterate
  var code = ["'use strict'"]
  var vars = []
  
  for(var j=0; j<dimension; ++j) {
    vars.push(["s", j, "=SS[", j, "]"].join("")) // The limits for each dimension.
  }
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    arglist.push("a"+i) // Actual data array
    arglist.push("t"+i) // Strides
    arglist.push("p"+i) // Offset in the array at which the data starts (also used for iterating over the data)
    
    for(var j=0; j<dimension; ++j) { // Unpack the strides into vars for looping
      vars.push(["t",i,"p",j,"=t",i,"[",loopBegin[i]+j,"]"].join(""))
    }
    
    for(var j=0; j<Math.abs(proc.arrayBlockIndices[i]); ++j) { // Unpack the strides into vars for block iteration
      vars.push(["t",i,"b",j,"=t",i,"[",blockBegin[i]+j,"]"].join(""))
    }
  }
  for(var i=0; i<proc.scalarArgs.length; ++i) {
    arglist.push("Y" + i)
  }
  if(proc.shapeArgs.length > 0) {
    vars.push("shape=SS.slice(0)") // Makes the shape over which we iterate available to the user defined functions (so you can use width/height for example)
  }
  if(proc.indexArgs.length > 0) {
    // Prepare an array to keep track of the (logical) indices, initialized to dimension zeroes.
    var zeros = new Array(dimension)
    for(var i=0; i<dimension; ++i) {
      zeros[i] = "0"
    }
    vars.push(["index=[", zeros.join(","), "]"].join(""))
  }
  for(var i=0; i<proc.offsetArgs.length; ++i) { // Offset arguments used for stencil operations
    var off_arg = proc.offsetArgs[i]
    var init_string = []
    for(var j=0; j<off_arg.offset.length; ++j) {
      if(off_arg.offset[j] === 0) {
        continue
      } else if(off_arg.offset[j] === 1) {
        init_string.push(["t", off_arg.array, "p", j].join(""))      
      } else {
        init_string.push([off_arg.offset[j], "*t", off_arg.array, "p", j].join(""))
      }
    }
    if(init_string.length === 0) {
      vars.push("q" + i + "=0")
    } else {
      vars.push(["q", i, "=", init_string.join("+")].join(""))
    }
  }

  //Prepare this variables
  var thisVars = uniq([].concat(proc.pre.thisVars)
                      .concat(proc.body.thisVars)
                      .concat(proc.post.thisVars))
  vars = vars.concat(thisVars)
  if (vars.length > 0) {
    code.push("var " + vars.join(","))
  }
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    code.push("p"+i+"|=0")
  }
  
  //Inline prelude
  if(proc.pre.body.length > 3) {
    code.push(processBlock(proc.pre, proc, dtypes))
  }

  //Process body
  var body = processBlock(proc.body, proc, dtypes)
  var matched = countMatches(loopOrders)
  if(matched < dimension) {
    code.push(outerFill(matched, loopOrders[0], proc, body)) // TODO: Rather than passing loopOrders[0], it might be interesting to look at passing an order that represents the majority of the arguments for example.
  } else {
    code.push(innerFill(loopOrders[0], proc, body))
  }

  //Inline epilog
  if(proc.post.body.length > 3) {
    code.push(processBlock(proc.post, proc, dtypes))
  }
  
  if(proc.debug) {
    console.log("-----Generated cwise routine for ", typesig, ":\n" + code.join("\n") + "\n----------")
  }
  
  var loopName = [(proc.funcName||"unnamed"), "_cwise_loop_", orders[0].join("s"),"m",matched,typeSummary(dtypes)].join("")
  var f = new Function(["function ",loopName,"(", arglist.join(","),"){", code.join("\n"),"} return ", loopName].join(""))
  return f()
}
module.exports = generateCWiseOp

},{"uniq":217}],96:[function(require,module,exports){
"use strict"

// The function below is called when constructing a cwise function object, and does the following:
// A function object is constructed which accepts as argument a compilation function and returns another function.
// It is this other function that is eventually returned by createThunk, and this function is the one that actually
// checks whether a certain pattern of arguments has already been used before and compiles new loops as needed.
// The compilation passed to the first function object is used for compiling new functions.
// Once this function object is created, it is called with compile as argument, where the first argument of compile
// is bound to "proc" (essentially containing a preprocessed version of the user arguments to cwise).
// So createThunk roughly works like this:
// function createThunk(proc) {
//   var thunk = function(compileBound) {
//     var CACHED = {}
//     return function(arrays and scalars) {
//       if (dtype and order of arrays in CACHED) {
//         var func = CACHED[dtype and order of arrays]
//       } else {
//         var func = CACHED[dtype and order of arrays] = compileBound(dtype and order of arrays)
//       }
//       return func(arrays and scalars)
//     }
//   }
//   return thunk(compile.bind1(proc))
// }

var compile = require("./compile.js")

function createThunk(proc) {
  var code = ["'use strict'", "var CACHED={}"]
  var vars = []
  var thunkName = proc.funcName + "_cwise_thunk"
  
  //Build thunk
  code.push(["return function ", thunkName, "(", proc.shimArgs.join(","), "){"].join(""))
  var typesig = []
  var string_typesig = []
  var proc_args = [["array",proc.arrayArgs[0],".shape.slice(", // Slice shape so that we only retain the shape over which we iterate (which gets passed to the cwise operator as SS).
                    Math.max(0,proc.arrayBlockIndices[0]),proc.arrayBlockIndices[0]<0?(","+proc.arrayBlockIndices[0]+")"):")"].join("")]
  var shapeLengthConditions = [], shapeConditions = []
  // Process array arguments
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    var j = proc.arrayArgs[i]
    vars.push(["t", j, "=array", j, ".dtype,",
               "r", j, "=array", j, ".order"].join(""))
    typesig.push("t" + j)
    typesig.push("r" + j)
    string_typesig.push("t"+j)
    string_typesig.push("r"+j+".join()")
    proc_args.push("array" + j + ".data")
    proc_args.push("array" + j + ".stride")
    proc_args.push("array" + j + ".offset|0")
    if (i>0) { // Gather conditions to check for shape equality (ignoring block indices)
      shapeLengthConditions.push("array" + proc.arrayArgs[0] + ".shape.length===array" + j + ".shape.length+" + (Math.abs(proc.arrayBlockIndices[0])-Math.abs(proc.arrayBlockIndices[i])))
      shapeConditions.push("array" + proc.arrayArgs[0] + ".shape[shapeIndex+" + Math.max(0,proc.arrayBlockIndices[0]) + "]===array" + j + ".shape[shapeIndex+" + Math.max(0,proc.arrayBlockIndices[i]) + "]")
    }
  }
  // Check for shape equality
  if (proc.arrayArgs.length > 1) {
    code.push("if (!(" + shapeLengthConditions.join(" && ") + ")) throw new Error('cwise: Arrays do not all have the same dimensionality!')")
    code.push("for(var shapeIndex=array" + proc.arrayArgs[0] + ".shape.length-" + Math.abs(proc.arrayBlockIndices[0]) + "; shapeIndex-->0;) {")
    code.push("if (!(" + shapeConditions.join(" && ") + ")) throw new Error('cwise: Arrays do not all have the same shape!')")
    code.push("}")
  }
  // Process scalar arguments
  for(var i=0; i<proc.scalarArgs.length; ++i) {
    proc_args.push("scalar" + proc.scalarArgs[i])
  }
  // Check for cached function (and if not present, generate it)
  vars.push(["type=[", string_typesig.join(","), "].join()"].join(""))
  vars.push("proc=CACHED[type]")
  code.push("var " + vars.join(","))
  
  code.push(["if(!proc){",
             "CACHED[type]=proc=compile([", typesig.join(","), "])}",
             "return proc(", proc_args.join(","), ")}"].join(""))

  if(proc.debug) {
    console.log("-----Generated thunk:\n" + code.join("\n") + "\n----------")
  }
  
  //Compile thunk
  var thunk = new Function("compile", code.join("\n"))
  return thunk(compile.bind(undefined, proc))
}

module.exports = createThunk

},{"./compile.js":95}],97:[function(require,module,exports){
(function (Buffer){

/**
 * Module exports.
 */

module.exports = dataUriToBuffer;

/**
 * Returns a `Buffer` instance from the given data URI `uri`.
 *
 * @param {String} uri Data URI to turn into a Buffer instance
 * @return {Buffer} Buffer instance from Data URI
 * @api public
 */

function dataUriToBuffer (uri) {
  if (!/^data\:/i.test(uri)) {
    throw new TypeError('`uri` does not appear to be a Data URI (must begin with "data:")');
  }

  // strip newlines
  uri = uri.replace(/\r?\n/g, '');

  // split the URI up into the "metadata" and the "data" portions
  var firstComma = uri.indexOf(',');
  if (-1 === firstComma || firstComma <= 4) throw new TypeError('malformed data: URI');

  // remove the "data:" scheme and parse the metadata
  var meta = uri.substring(5, firstComma).split(';');

  var base64 = false;
  var charset = 'US-ASCII';
  for (var i = 0; i < meta.length; i++) {
    if ('base64' == meta[i]) {
      base64 = true;
    } else if (0 == meta[i].indexOf('charset=')) {
      charset = meta[i].substring(8);
    }
  }

  // get the encoded data portion and decode URI-encoded chars
  var data = unescape(uri.substring(firstComma + 1));

  var encoding = base64 ? 'base64' : 'ascii';
  var buffer = new Buffer(data, encoding);

  // set `.type` property to MIME type
  buffer.type = meta[0] || 'text/plain';

  // set the `.charset` property
  buffer.charset = charset;

  return buffer;
}

}).call(this,require("buffer").Buffer)

},{"buffer":92}],98:[function(require,module,exports){
"use strict"

function dupe_array(count, value, i) {
  var c = count[i]|0
  if(c <= 0) {
    return []
  }
  var result = new Array(c), j
  if(i === count.length-1) {
    for(j=0; j<c; ++j) {
      result[j] = value
    }
  } else {
    for(j=0; j<c; ++j) {
      result[j] = dupe_array(count, value, i+1)
    }
  }
  return result
}

function dupe_number(count, value) {
  var result, i
  result = new Array(count)
  for(i=0; i<count; ++i) {
    result[i] = value
  }
  return result
}

function dupe(count, value) {
  if(typeof value === "undefined") {
    value = 0
  }
  switch(typeof count) {
    case "number":
      if(count > 0) {
        return dupe_number(count|0, value)
      }
    break
    case "object":
      if(typeof (count.length) === "number") {
        return dupe_array(count, value, 0)
      }
    break
  }
  return []
}

module.exports = dupe
},{}],99:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],100:[function(require,module,exports){
(function (Buffer,process){
'use strict'

var path          = require('path')
var ndarray       = require('ndarray')
var GifReader     = require('omggif').GifReader
var pack          = require('ndarray-pack')
var through       = require('through')
var parseDataURI  = require('data-uri-to-buffer')

function defaultImage(url, cb) {
  var img = new Image()
  img.crossOrigin = "Anonymous"
  img.onload = function() {
    var canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    var context = canvas.getContext('2d')
    context.drawImage(img, 0, 0)
    var pixels = context.getImageData(0, 0, img.width, img.height)
    cb(null, ndarray(new Uint8Array(pixels.data), [img.width, img.height, 4], [4, 4*img.width, 1], 0))
  }
  img.onerror = function(err) {
    cb(err)
  }
  img.src = url
}

//Animated gif loading
function handleGif(data, cb) {
  var reader
  try {
    reader = new GifReader(data)
  } catch(err) {
    cb(err)
    return
  }
  if(reader.numFrames() > 0) {
    var nshape = [reader.numFrames(), reader.height, reader.width, 4]
    var ndata = new Uint8Array(nshape[0] * nshape[1] * nshape[2] * nshape[3])
    var result = ndarray(ndata, nshape)
    try {
      for(var i=0; i<reader.numFrames(); ++i) {
        reader.decodeAndBlitFrameRGBA(i, ndata.subarray(
          result.index(i, 0, 0, 0),
          result.index(i+1, 0, 0, 0)))
      }
    } catch(err) {
      cb(err)
      return
    }
    cb(null, result.transpose(0,2,1))
  } else {
    var nshape = [reader.height, reader.width, 4]
    var ndata = new Uint8Array(nshape[0] * nshape[1] * nshape[2])
    var result = ndarray(ndata, nshape)
    try {
      reader.decodeAndBlitFrameRGBA(0, ndata)
    } catch(err) {
      cb(err)
      return
    }
    cb(null, result.transpose(1,0))
  }
}

function httpGif(url, cb) {
  var xhr          = new XMLHttpRequest()
  xhr.open('GET', url, true)
  xhr.responseType = 'arraybuffer'
  if(xhr.overrideMimeType){
    xhr.overrideMimeType('application/binary')
  }
  xhr.onerror = function(err) {
    cb(err)
  }
  xhr.onload = function() {
    if(xhr.readyState !== 4) {
      return
    }
    var data = new Uint8Array(xhr.response)
    handleGif(data, cb)
    return
  }
  xhr.send()
}

function copyBuffer(buffer) {
  if(buffer[0] === undefined) {
    var n = buffer.length
    var result = new Uint8Array(n)
    for(var i=0; i<n; ++i) {
      result[i] = buffer.get(i)
    }
    return result
  } else {
    return new Uint8Array(buffer)
  }
}

function dataGif(url, cb) {
  process.nextTick(function() {
    try {
      var buffer = parseDataURI(url)
      if(buffer) {
        handleGif(copyBuffer(buffer), cb)
      } else {
        cb(new Error('Error parsing data URI'))
      }
    } catch(err) {
      cb(err)
    }
  })
}

module.exports = function getPixels(url, type, cb) {
  if(!cb) {
    cb = type
    type = ''
  }
  var ext = path.extname(url)
  switch(type || ext.toUpperCase()) {
    case '.GIF':
      httpGif(url, cb)
    break
    default:
      if(Buffer.isBuffer(url)) {
        url = 'data:' + type + ';base64,' + url.toString('base64')
      }
      if(url.indexOf('data:image/gif;') === 0) {
        dataGif(url, cb)
      } else {
        defaultImage(url, cb)
      }
  }
}
}).call(this,{"isBuffer":require("../is-buffer/index.js")},require('_process'))

},{"../is-buffer/index.js":182,"_process":195,"data-uri-to-buffer":97,"ndarray":188,"ndarray-pack":186,"omggif":189,"path":193,"through":214}],101:[function(require,module,exports){
module.exports = adjoint;

/**
 * Calculates the adjugate of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
function adjoint(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    out[0]  =  (a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22));
    out[1]  = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
    out[2]  =  (a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12));
    out[3]  = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
    out[4]  = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
    out[5]  =  (a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22));
    out[6]  = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
    out[7]  =  (a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12));
    out[8]  =  (a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21));
    out[9]  = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
    out[10] =  (a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11));
    out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
    out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
    out[13] =  (a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21));
    out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
    out[15] =  (a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11));
    return out;
};
},{}],102:[function(require,module,exports){
module.exports = clone;

/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {mat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */
function clone(a) {
    var out = new Float32Array(16);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};
},{}],103:[function(require,module,exports){
module.exports = copy;

/**
 * Copy the values from one mat4 to another
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
function copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};
},{}],104:[function(require,module,exports){
module.exports = create;

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */
function create() {
    var out = new Float32Array(16);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
},{}],105:[function(require,module,exports){
module.exports = determinant;

/**
 * Calculates the determinant of a mat4
 *
 * @param {mat4} a the source matrix
 * @returns {Number} determinant of a
 */
function determinant(a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32;

    // Calculate the determinant
    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
};
},{}],106:[function(require,module,exports){
module.exports = fromQuat;

/**
 * Creates a matrix from a quaternion rotation.
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @returns {mat4} out
 */
function fromQuat(out, q) {
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        yx = y * x2,
        yy = y * y2,
        zx = z * x2,
        zy = z * y2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - yy - zz;
    out[1] = yx + wz;
    out[2] = zx - wy;
    out[3] = 0;

    out[4] = yx - wz;
    out[5] = 1 - xx - zz;
    out[6] = zy + wx;
    out[7] = 0;

    out[8] = zx + wy;
    out[9] = zy - wx;
    out[10] = 1 - xx - yy;
    out[11] = 0;

    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;

    return out;
};
},{}],107:[function(require,module,exports){
module.exports = fromRotation

/**
 * Creates a matrix from a given angle around a given axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.rotate(dest, dest, rad, axis)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @param {vec3} axis the axis to rotate around
 * @returns {mat4} out
 */
function fromRotation(out, rad, axis) {
  var s, c, t
  var x = axis[0]
  var y = axis[1]
  var z = axis[2]
  var len = Math.sqrt(x * x + y * y + z * z)

  if (Math.abs(len) < 0.000001) {
    return null
  }

  len = 1 / len
  x *= len
  y *= len
  z *= len

  s = Math.sin(rad)
  c = Math.cos(rad)
  t = 1 - c

  // Perform rotation-specific matrix multiplication
  out[0] = x * x * t + c
  out[1] = y * x * t + z * s
  out[2] = z * x * t - y * s
  out[3] = 0
  out[4] = x * y * t - z * s
  out[5] = y * y * t + c
  out[6] = z * y * t + x * s
  out[7] = 0
  out[8] = x * z * t + y * s
  out[9] = y * z * t - x * s
  out[10] = z * z * t + c
  out[11] = 0
  out[12] = 0
  out[13] = 0
  out[14] = 0
  out[15] = 1
  return out
}

},{}],108:[function(require,module,exports){
module.exports = fromRotationTranslation;

/**
 * Creates a matrix from a quaternion rotation and vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     var quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {vec3} v Translation vector
 * @returns {mat4} out
 */
function fromRotationTranslation(out, q, v) {
    // Quaternion math
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    
    return out;
};
},{}],109:[function(require,module,exports){
module.exports = fromScaling

/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.scale(dest, dest, vec)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {vec3} v Scaling vector
 * @returns {mat4} out
 */
function fromScaling(out, v) {
  out[0] = v[0]
  out[1] = 0
  out[2] = 0
  out[3] = 0
  out[4] = 0
  out[5] = v[1]
  out[6] = 0
  out[7] = 0
  out[8] = 0
  out[9] = 0
  out[10] = v[2]
  out[11] = 0
  out[12] = 0
  out[13] = 0
  out[14] = 0
  out[15] = 1
  return out
}

},{}],110:[function(require,module,exports){
module.exports = fromTranslation

/**
 * Creates a matrix from a vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.translate(dest, dest, vec)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {vec3} v Translation vector
 * @returns {mat4} out
 */
function fromTranslation(out, v) {
  out[0] = 1
  out[1] = 0
  out[2] = 0
  out[3] = 0
  out[4] = 0
  out[5] = 1
  out[6] = 0
  out[7] = 0
  out[8] = 0
  out[9] = 0
  out[10] = 1
  out[11] = 0
  out[12] = v[0]
  out[13] = v[1]
  out[14] = v[2]
  out[15] = 1
  return out
}

},{}],111:[function(require,module,exports){
module.exports = fromXRotation

/**
 * Creates a matrix from the given angle around the X axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.rotateX(dest, dest, rad)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
function fromXRotation(out, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad)

    // Perform axis-specific matrix multiplication
    out[0] = 1
    out[1] = 0
    out[2] = 0
    out[3] = 0
    out[4] = 0
    out[5] = c
    out[6] = s
    out[7] = 0
    out[8] = 0
    out[9] = -s
    out[10] = c
    out[11] = 0
    out[12] = 0
    out[13] = 0
    out[14] = 0
    out[15] = 1
    return out
}
},{}],112:[function(require,module,exports){
module.exports = fromYRotation

/**
 * Creates a matrix from the given angle around the Y axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.rotateY(dest, dest, rad)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
function fromYRotation(out, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad)

    // Perform axis-specific matrix multiplication
    out[0] = c
    out[1] = 0
    out[2] = -s
    out[3] = 0
    out[4] = 0
    out[5] = 1
    out[6] = 0
    out[7] = 0
    out[8] = s
    out[9] = 0
    out[10] = c
    out[11] = 0
    out[12] = 0
    out[13] = 0
    out[14] = 0
    out[15] = 1
    return out
}
},{}],113:[function(require,module,exports){
module.exports = fromZRotation

/**
 * Creates a matrix from the given angle around the Z axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.rotateZ(dest, dest, rad)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
function fromZRotation(out, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad)

    // Perform axis-specific matrix multiplication
    out[0] = c
    out[1] = s
    out[2] = 0
    out[3] = 0
    out[4] = -s
    out[5] = c
    out[6] = 0
    out[7] = 0
    out[8] = 0
    out[9] = 0
    out[10] = 1
    out[11] = 0
    out[12] = 0
    out[13] = 0
    out[14] = 0
    out[15] = 1
    return out
}
},{}],114:[function(require,module,exports){
module.exports = frustum;

/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Number} left Left bound of the frustum
 * @param {Number} right Right bound of the frustum
 * @param {Number} bottom Bottom bound of the frustum
 * @param {Number} top Top bound of the frustum
 * @param {Number} near Near bound of the frustum
 * @param {Number} far Far bound of the frustum
 * @returns {mat4} out
 */
function frustum(out, left, right, bottom, top, near, far) {
    var rl = 1 / (right - left),
        tb = 1 / (top - bottom),
        nf = 1 / (near - far);
    out[0] = (near * 2) * rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = (near * 2) * tb;
    out[6] = 0;
    out[7] = 0;
    out[8] = (right + left) * rl;
    out[9] = (top + bottom) * tb;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (far * near * 2) * nf;
    out[15] = 0;
    return out;
};
},{}],115:[function(require,module,exports){
module.exports = identity;

/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */
function identity(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
},{}],116:[function(require,module,exports){
module.exports = {
  create: require('./create')
  , clone: require('./clone')
  , copy: require('./copy')
  , identity: require('./identity')
  , transpose: require('./transpose')
  , invert: require('./invert')
  , adjoint: require('./adjoint')
  , determinant: require('./determinant')
  , multiply: require('./multiply')
  , translate: require('./translate')
  , scale: require('./scale')
  , rotate: require('./rotate')
  , rotateX: require('./rotateX')
  , rotateY: require('./rotateY')
  , rotateZ: require('./rotateZ')
  , fromRotation: require('./fromRotation')
  , fromRotationTranslation: require('./fromRotationTranslation')
  , fromScaling: require('./fromScaling')
  , fromTranslation: require('./fromTranslation')
  , fromXRotation: require('./fromXRotation')
  , fromYRotation: require('./fromYRotation')
  , fromZRotation: require('./fromZRotation')
  , fromQuat: require('./fromQuat')
  , frustum: require('./frustum')
  , perspective: require('./perspective')
  , perspectiveFromFieldOfView: require('./perspectiveFromFieldOfView')
  , ortho: require('./ortho')
  , lookAt: require('./lookAt')
  , str: require('./str')
}

},{"./adjoint":101,"./clone":102,"./copy":103,"./create":104,"./determinant":105,"./fromQuat":106,"./fromRotation":107,"./fromRotationTranslation":108,"./fromScaling":109,"./fromTranslation":110,"./fromXRotation":111,"./fromYRotation":112,"./fromZRotation":113,"./frustum":114,"./identity":115,"./invert":117,"./lookAt":118,"./multiply":119,"./ortho":120,"./perspective":121,"./perspectiveFromFieldOfView":122,"./rotate":123,"./rotateX":124,"./rotateY":125,"./rotateZ":126,"./scale":127,"./str":128,"./translate":129,"./transpose":130}],117:[function(require,module,exports){
module.exports = invert;

/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
function invert(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
};
},{}],118:[function(require,module,exports){
var identity = require('./identity');

module.exports = lookAt;

/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {vec3} eye Position of the viewer
 * @param {vec3} center Point the viewer is looking at
 * @param {vec3} up vec3 pointing up
 * @returns {mat4} out
 */
function lookAt(out, eye, center, up) {
    var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
        eyex = eye[0],
        eyey = eye[1],
        eyez = eye[2],
        upx = up[0],
        upy = up[1],
        upz = up[2],
        centerx = center[0],
        centery = center[1],
        centerz = center[2];

    if (Math.abs(eyex - centerx) < 0.000001 &&
        Math.abs(eyey - centery) < 0.000001 &&
        Math.abs(eyez - centerz) < 0.000001) {
        return identity(out);
    }

    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;

    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
        x0 = 0;
        x1 = 0;
        x2 = 0;
    } else {
        len = 1 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
    }

    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;

    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
        y0 = 0;
        y1 = 0;
        y2 = 0;
    } else {
        len = 1 / len;
        y0 *= len;
        y1 *= len;
        y2 *= len;
    }

    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;

    return out;
};
},{"./identity":115}],119:[function(require,module,exports){
module.exports = multiply;

/**
 * Multiplies two mat4's
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @returns {mat4} out
 */
function multiply(out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    // Cache only the current line of the second matrix
    var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];  
    out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
    return out;
};
},{}],120:[function(require,module,exports){
module.exports = ortho;

/**
 * Generates a orthogonal projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
function ortho(out, left, right, bottom, top, near, far) {
    var lr = 1 / (left - right),
        bt = 1 / (bottom - top),
        nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
};
},{}],121:[function(require,module,exports){
module.exports = perspective;

/**
 * Generates a perspective projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
function perspective(out, fovy, aspect, near, far) {
    var f = 1.0 / Math.tan(fovy / 2),
        nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (2 * far * near) * nf;
    out[15] = 0;
    return out;
};
},{}],122:[function(require,module,exports){
module.exports = perspectiveFromFieldOfView;

/**
 * Generates a perspective projection matrix with the given field of view.
 * This is primarily useful for generating projection matrices to be used
 * with the still experiemental WebVR API.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
function perspectiveFromFieldOfView(out, fov, near, far) {
    var upTan = Math.tan(fov.upDegrees * Math.PI/180.0),
        downTan = Math.tan(fov.downDegrees * Math.PI/180.0),
        leftTan = Math.tan(fov.leftDegrees * Math.PI/180.0),
        rightTan = Math.tan(fov.rightDegrees * Math.PI/180.0),
        xScale = 2.0 / (leftTan + rightTan),
        yScale = 2.0 / (upTan + downTan);

    out[0] = xScale;
    out[1] = 0.0;
    out[2] = 0.0;
    out[3] = 0.0;
    out[4] = 0.0;
    out[5] = yScale;
    out[6] = 0.0;
    out[7] = 0.0;
    out[8] = -((leftTan - rightTan) * xScale * 0.5);
    out[9] = ((upTan - downTan) * yScale * 0.5);
    out[10] = far / (near - far);
    out[11] = -1.0;
    out[12] = 0.0;
    out[13] = 0.0;
    out[14] = (far * near) / (near - far);
    out[15] = 0.0;
    return out;
}


},{}],123:[function(require,module,exports){
module.exports = rotate;

/**
 * Rotates a mat4 by the given angle
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {vec3} axis the axis to rotate around
 * @returns {mat4} out
 */
function rotate(out, a, rad, axis) {
    var x = axis[0], y = axis[1], z = axis[2],
        len = Math.sqrt(x * x + y * y + z * z),
        s, c, t,
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23,
        b00, b01, b02,
        b10, b11, b12,
        b20, b21, b22;

    if (Math.abs(len) < 0.000001) { return null; }
    
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;

    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;

    a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
    a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
    a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

    // Construct the elements of the rotation matrix
    b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
    b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
    b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

    // Perform rotation-specific matrix multiplication
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }
    return out;
};
},{}],124:[function(require,module,exports){
module.exports = rotateX;

/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
function rotateX(out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[0]  = a[0];
        out[1]  = a[1];
        out[2]  = a[2];
        out[3]  = a[3];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    return out;
};
},{}],125:[function(require,module,exports){
module.exports = rotateY;

/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
function rotateY(out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[4]  = a[4];
        out[5]  = a[5];
        out[6]  = a[6];
        out[7]  = a[7];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    return out;
};
},{}],126:[function(require,module,exports){
module.exports = rotateZ;

/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
function rotateZ(out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[8]  = a[8];
        out[9]  = a[9];
        out[10] = a[10];
        out[11] = a[11];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    return out;
};
},{}],127:[function(require,module,exports){
module.exports = scale;

/**
 * Scales the mat4 by the dimensions in the given vec3
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to scale
 * @param {vec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/
function scale(out, a, v) {
    var x = v[0], y = v[1], z = v[2];

    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};
},{}],128:[function(require,module,exports){
module.exports = str;

/**
 * Returns a string representation of a mat4
 *
 * @param {mat4} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
function str(a) {
    return 'mat4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' +
                    a[4] + ', ' + a[5] + ', ' + a[6] + ', ' + a[7] + ', ' +
                    a[8] + ', ' + a[9] + ', ' + a[10] + ', ' + a[11] + ', ' + 
                    a[12] + ', ' + a[13] + ', ' + a[14] + ', ' + a[15] + ')';
};
},{}],129:[function(require,module,exports){
module.exports = translate;

/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to translate
 * @param {vec3} v vector to translate by
 * @returns {mat4} out
 */
function translate(out, a, v) {
    var x = v[0], y = v[1], z = v[2],
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23;

    if (a === out) {
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
        a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
        a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
        a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

        out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03;
        out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13;
        out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23;

        out[12] = a00 * x + a10 * y + a20 * z + a[12];
        out[13] = a01 * x + a11 * y + a21 * z + a[13];
        out[14] = a02 * x + a12 * y + a22 * z + a[14];
        out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }

    return out;
};
},{}],130:[function(require,module,exports){
module.exports = transpose;

/**
 * Transpose the values of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
function transpose(out, a) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a01 = a[1], a02 = a[2], a03 = a[3],
            a12 = a[6], a13 = a[7],
            a23 = a[11];

        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a01;
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a02;
        out[9] = a12;
        out[11] = a[14];
        out[12] = a03;
        out[13] = a13;
        out[14] = a23;
    } else {
        out[0] = a[0];
        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a[1];
        out[5] = a[5];
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a[2];
        out[9] = a[6];
        out[10] = a[10];
        out[11] = a[14];
        out[12] = a[3];
        out[13] = a[7];
        out[14] = a[11];
        out[15] = a[15];
    }
    
    return out;
};
},{}],131:[function(require,module,exports){
'use strict'

var ndarray = require('ndarray')
var ops     = require('ndarray-ops')
var pool    = require('typedarray-pool')

module.exports = createTexture2D

var linearTypes = null
var filterTypes = null
var wrapTypes   = null

function lazyInitLinearTypes(gl) {
  linearTypes = [
    gl.LINEAR,
    gl.NEAREST_MIPMAP_LINEAR,
    gl.LINEAR_MIPMAP_NEAREST,
    gl.LINEAR_MIPMAP_NEAREST
  ]
  filterTypes = [
    gl.NEAREST,
    gl.LINEAR,
    gl.NEAREST_MIPMAP_NEAREST,
    gl.NEAREST_MIPMAP_LINEAR,
    gl.LINEAR_MIPMAP_NEAREST,
    gl.LINEAR_MIPMAP_LINEAR
  ]
  wrapTypes = [
    gl.REPEAT,
    gl.CLAMP_TO_EDGE,
    gl.MIRRORED_REPEAT
  ]
}

function acceptTextureDOM (obj) {
  return (
    ('undefined' != typeof HTMLCanvasElement && obj instanceof HTMLCanvasElement) ||
    ('undefined' != typeof HTMLImageElement && obj instanceof HTMLImageElement) ||
    ('undefined' != typeof HTMLVideoElement && obj instanceof HTMLVideoElement) ||
    ('undefined' != typeof ImageData && obj instanceof ImageData))
}

var convertFloatToUint8 = function(out, inp) {
  ops.muls(out, inp, 255.0)
}

function reshapeTexture(tex, w, h) {
  var gl = tex.gl
  var maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
  if(w < 0 || w > maxSize || h < 0 || h > maxSize) {
    throw new Error('gl-texture2d: Invalid texture size')
  }
  tex._shape = [w, h]
  tex.bind()
  gl.texImage2D(gl.TEXTURE_2D, 0, tex.format, w, h, 0, tex.format, tex.type, null)
  tex._mipLevels = [0]
  return tex
}

function Texture2D(gl, handle, width, height, format, type) {
  this.gl = gl
  this.handle = handle
  this.format = format
  this.type = type
  this._shape = [width, height]
  this._mipLevels = [0]
  this._magFilter = gl.NEAREST
  this._minFilter = gl.NEAREST
  this._wrapS = gl.CLAMP_TO_EDGE
  this._wrapT = gl.CLAMP_TO_EDGE
  this._anisoSamples = 1

  var parent = this
  var wrapVector = [this._wrapS, this._wrapT]
  Object.defineProperties(wrapVector, [
    {
      get: function() {
        return parent._wrapS
      },
      set: function(v) {
        return parent.wrapS = v
      }
    },
    {
      get: function() {
        return parent._wrapT
      },
      set: function(v) {
        return parent.wrapT = v
      }
    }
  ])
  this._wrapVector = wrapVector

  var shapeVector = [this._shape[0], this._shape[1]]
  Object.defineProperties(shapeVector, [
    {
      get: function() {
        return parent._shape[0]
      },
      set: function(v) {
        return parent.width = v
      }
    },
    {
      get: function() {
        return parent._shape[1]
      },
      set: function(v) {
        return parent.height = v
      }
    }
  ])
  this._shapeVector = shapeVector
}

var proto = Texture2D.prototype

Object.defineProperties(proto, {
  minFilter: {
    get: function() {
      return this._minFilter
    },
    set: function(v) {
      this.bind()
      var gl = this.gl
      if(this.type === gl.FLOAT && linearTypes.indexOf(v) >= 0) {
        if(!gl.getExtension('OES_texture_float_linear')) {
          v = gl.NEAREST
        }
      }
      if(filterTypes.indexOf(v) < 0) {
        throw new Error('gl-texture2d: Unknown filter mode ' + v)
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, v)
      return this._minFilter = v
    }
  },
  magFilter: {
    get: function() {
      return this._magFilter
    },
    set: function(v) {
      this.bind()
      var gl = this.gl
      if(this.type === gl.FLOAT && linearTypes.indexOf(v) >= 0) {
        if(!gl.getExtension('OES_texture_float_linear')) {
          v = gl.NEAREST
        }
      }
      if(filterTypes.indexOf(v) < 0) {
        throw new Error('gl-texture2d: Unknown filter mode ' + v)
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, v)
      return this._magFilter = v
    }
  },
  mipSamples: {
    get: function() {
      return this._anisoSamples
    },
    set: function(i) {
      var psamples = this._anisoSamples
      this._anisoSamples = Math.max(i, 1)|0
      if(psamples !== this._anisoSamples) {
        var ext = this.gl.getExtension('EXT_texture_filter_anisotropic')
        if(ext) {
          this.gl.texParameterf(this.gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, this._anisoSamples)
        }
      }
      return this._anisoSamples
    }
  },
  wrapS: {
    get: function() {
      return this._wrapS
    },
    set: function(v) {
      this.bind()
      if(wrapTypes.indexOf(v) < 0) {
        throw new Error('gl-texture2d: Unknown wrap mode ' + v)
      }
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, v)
      return this._wrapS = v
    }
  },
  wrapT: {
    get: function() {
      return this._wrapT
    },
    set: function(v) {
      this.bind()
      if(wrapTypes.indexOf(v) < 0) {
        throw new Error('gl-texture2d: Unknown wrap mode ' + v)
      }
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, v)
      return this._wrapT = v
    }
  },
  wrap: {
    get: function() {
      return this._wrapVector
    },
    set: function(v) {
      if(!Array.isArray(v)) {
        v = [v,v]
      }
      if(v.length !== 2) {
        throw new Error('gl-texture2d: Must specify wrap mode for rows and columns')
      }
      for(var i=0; i<2; ++i) {
        if(wrapTypes.indexOf(v[i]) < 0) {
          throw new Error('gl-texture2d: Unknown wrap mode ' + v)
        }
      }
      this._wrapS = v[0]
      this._wrapT = v[1]

      var gl = this.gl
      this.bind()
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this._wrapS)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this._wrapT)

      return v
    }
  },
  shape: {
    get: function() {
      return this._shapeVector
    },
    set: function(x) {
      if(!Array.isArray(x)) {
        x = [x|0,x|0]
      } else {
        if(x.length !== 2) {
          throw new Error('gl-texture2d: Invalid texture shape')
        }
      }
      reshapeTexture(this, x[0]|0, x[1]|0)
      return [x[0]|0, x[1]|0]
    }
  },
  width: {
    get: function() {
      return this._shape[0]
    },
    set: function(w) {
      w = w|0
      reshapeTexture(this, w, this._shape[1])
      return w
    }
  },
  height: {
    get: function() {
      return this._shape[1]
    },
    set: function(h) {
      h = h|0
      reshapeTexture(this, this._shape[0], h)
      return h
    }
  }
})

proto.bind = function(unit) {
  var gl = this.gl
  if(unit !== undefined) {
    gl.activeTexture(gl.TEXTURE0 + (unit|0))
  }
  gl.bindTexture(gl.TEXTURE_2D, this.handle)
  if(unit !== undefined) {
    return (unit|0)
  }
  return gl.getParameter(gl.ACTIVE_TEXTURE) - gl.TEXTURE0
}

proto.dispose = function() {
  this.gl.deleteTexture(this.handle)
}

proto.generateMipmap = function() {
  this.bind()
  this.gl.generateMipmap(this.gl.TEXTURE_2D)

  //Update mip levels
  var l = Math.min(this._shape[0], this._shape[1])
  for(var i=0; l>0; ++i, l>>>=1) {
    if(this._mipLevels.indexOf(i) < 0) {
      this._mipLevels.push(i)
    }
  }
}

proto.setPixels = function(data, x_off, y_off, mip_level) {
  var gl = this.gl
  this.bind()
  if(Array.isArray(x_off)) {
    mip_level = y_off
    y_off = x_off[1]|0
    x_off = x_off[0]|0
  } else {
    x_off = x_off || 0
    y_off = y_off || 0
  }
  mip_level = mip_level || 0
  var directData = acceptTextureDOM(data) ? data : data.raw
  if(directData) {
    var needsMip = this._mipLevels.indexOf(mip_level) < 0
    if(needsMip) {
      gl.texImage2D(gl.TEXTURE_2D, 0, this.format, this.format, this.type, directData)
      this._mipLevels.push(mip_level)
    } else {
      gl.texSubImage2D(gl.TEXTURE_2D, mip_level, x_off, y_off, this.format, this.type, directData)
    }
  } else if(data.shape && data.stride && data.data) {
    if(data.shape.length < 2 ||
       x_off + data.shape[1] > this._shape[1]>>>mip_level ||
       y_off + data.shape[0] > this._shape[0]>>>mip_level ||
       x_off < 0 ||
       y_off < 0) {
      throw new Error('gl-texture2d: Texture dimensions are out of bounds')
    }
    texSubImageArray(gl, x_off, y_off, mip_level, this.format, this.type, this._mipLevels, data)
  } else {
    throw new Error('gl-texture2d: Unsupported data type')
  }
}


function isPacked(shape, stride) {
  if(shape.length === 3) {
    return  (stride[2] === 1) &&
            (stride[1] === shape[0]*shape[2]) &&
            (stride[0] === shape[2])
  }
  return  (stride[0] === 1) &&
          (stride[1] === shape[0])
}

function texSubImageArray(gl, x_off, y_off, mip_level, cformat, ctype, mipLevels, array) {
  var dtype = array.dtype
  var shape = array.shape.slice()
  if(shape.length < 2 || shape.length > 3) {
    throw new Error('gl-texture2d: Invalid ndarray, must be 2d or 3d')
  }
  var type = 0, format = 0
  var packed = isPacked(shape, array.stride.slice())
  if(dtype === 'float32') {
    type = gl.FLOAT
  } else if(dtype === 'float64') {
    type = gl.FLOAT
    packed = false
    dtype = 'float32'
  } else if(dtype === 'uint8') {
    type = gl.UNSIGNED_BYTE
  } else {
    type = gl.UNSIGNED_BYTE
    packed = false
    dtype = 'uint8'
  }
  var channels = 1
  if(shape.length === 2) {
    format = gl.LUMINANCE
    shape = [shape[0], shape[1], 1]
    array = ndarray(array.data, shape, [array.stride[0], array.stride[1], 1], array.offset)
  } else if(shape.length === 3) {
    if(shape[2] === 1) {
      format = gl.ALPHA
    } else if(shape[2] === 2) {
      format = gl.LUMINANCE_ALPHA
    } else if(shape[2] === 3) {
      format = gl.RGB
    } else if(shape[2] === 4) {
      format = gl.RGBA
    } else {
      throw new Error('gl-texture2d: Invalid shape for pixel coords')
    }
    channels = shape[2]
  } else {
    throw new Error('gl-texture2d: Invalid shape for texture')
  }
  //For 1-channel textures allow conversion between formats
  if((format  === gl.LUMINANCE || format  === gl.ALPHA) &&
     (cformat === gl.LUMINANCE || cformat === gl.ALPHA)) {
    format = cformat
  }
  if(format !== cformat) {
    throw new Error('gl-texture2d: Incompatible texture format for setPixels')
  }
  var size = array.size
  var needsMip = mipLevels.indexOf(mip_level) < 0
  if(needsMip) {
    mipLevels.push(mip_level)
  }
  if(type === ctype && packed) {
    //Array data types are compatible, can directly copy into texture
    if(array.offset === 0 && array.data.length === size) {
      if(needsMip) {
        gl.texImage2D(gl.TEXTURE_2D, mip_level, cformat, shape[0], shape[1], 0, cformat, ctype, array.data)
      } else {
        gl.texSubImage2D(gl.TEXTURE_2D, mip_level, x_off, y_off, shape[0], shape[1], cformat, ctype, array.data)
      }
    } else {
      if(needsMip) {
        gl.texImage2D(gl.TEXTURE_2D, mip_level, cformat, shape[0], shape[1], 0, cformat, ctype, array.data.subarray(array.offset, array.offset+size))
      } else {
        gl.texSubImage2D(gl.TEXTURE_2D, mip_level, x_off, y_off, shape[0], shape[1], cformat, ctype, array.data.subarray(array.offset, array.offset+size))
      }
    }
  } else {
    //Need to do type conversion to pack data into buffer
    var pack_buffer
    if(ctype === gl.FLOAT) {
      pack_buffer = pool.mallocFloat32(size)
    } else {
      pack_buffer = pool.mallocUint8(size)
    }
    var pack_view = ndarray(pack_buffer, shape, [shape[2], shape[2]*shape[0], 1])
    if(type === gl.FLOAT && ctype === gl.UNSIGNED_BYTE) {
      convertFloatToUint8(pack_view, array)
    } else {
      ops.assign(pack_view, array)
    }
    if(needsMip) {
      gl.texImage2D(gl.TEXTURE_2D, mip_level, cformat, shape[0], shape[1], 0, cformat, ctype, pack_buffer.subarray(0, size))
    } else {
      gl.texSubImage2D(gl.TEXTURE_2D, mip_level, x_off, y_off, shape[0], shape[1], cformat, ctype, pack_buffer.subarray(0, size))
    }
    if(ctype === gl.FLOAT) {
      pool.freeFloat32(pack_buffer)
    } else {
      pool.freeUint8(pack_buffer)
    }
  }
}

function initTexture(gl) {
  var tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return tex
}

function createTextureShape(gl, width, height, format, type) {
  var maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
  if(width < 0 || width > maxTextureSize || height < 0 || height  > maxTextureSize) {
    throw new Error('gl-texture2d: Invalid texture shape')
  }
  if(type === gl.FLOAT && !gl.getExtension('OES_texture_float')) {
    throw new Error('gl-texture2d: Floating point textures not supported on this platform')
  }
  var tex = initTexture(gl)
  gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, type, null)
  return new Texture2D(gl, tex, width, height, format, type)
}

function createTextureDOM(gl, directData, width, height, format, type) {
  var tex = initTexture(gl)
  gl.texImage2D(gl.TEXTURE_2D, 0, format, format, type, directData)
  return new Texture2D(gl, tex, width, height, format, type)
}

//Creates a texture from an ndarray
function createTextureArray(gl, array) {
  var dtype = array.dtype
  var shape = array.shape.slice()
  var maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
  if(shape[0] < 0 || shape[0] > maxSize || shape[1] < 0 || shape[1] > maxSize) {
    throw new Error('gl-texture2d: Invalid texture size')
  }
  var packed = isPacked(shape, array.stride.slice())
  var type = 0
  if(dtype === 'float32') {
    type = gl.FLOAT
  } else if(dtype === 'float64') {
    type = gl.FLOAT
    packed = false
    dtype = 'float32'
  } else if(dtype === 'uint8') {
    type = gl.UNSIGNED_BYTE
  } else {
    type = gl.UNSIGNED_BYTE
    packed = false
    dtype = 'uint8'
  }
  var format = 0
  if(shape.length === 2) {
    format = gl.LUMINANCE
    shape = [shape[0], shape[1], 1]
    array = ndarray(array.data, shape, [array.stride[0], array.stride[1], 1], array.offset)
  } else if(shape.length === 3) {
    if(shape[2] === 1) {
      format = gl.ALPHA
    } else if(shape[2] === 2) {
      format = gl.LUMINANCE_ALPHA
    } else if(shape[2] === 3) {
      format = gl.RGB
    } else if(shape[2] === 4) {
      format = gl.RGBA
    } else {
      throw new Error('gl-texture2d: Invalid shape for pixel coords')
    }
  } else {
    throw new Error('gl-texture2d: Invalid shape for texture')
  }
  if(type === gl.FLOAT && !gl.getExtension('OES_texture_float')) {
    type = gl.UNSIGNED_BYTE
    packed = false
  }
  var buffer, buf_store
  var size = array.size
  if(!packed) {
    var stride = [shape[2], shape[2]*shape[0], 1]
    buf_store = pool.malloc(size, dtype)
    var buf_array = ndarray(buf_store, shape, stride, 0)
    if((dtype === 'float32' || dtype === 'float64') && type === gl.UNSIGNED_BYTE) {
      convertFloatToUint8(buf_array, array)
    } else {
      ops.assign(buf_array, array)
    }
    buffer = buf_store.subarray(0, size)
  } else if (array.offset === 0 && array.data.length === size) {
    buffer = array.data
  } else {
    buffer = array.data.subarray(array.offset, array.offset + size)
  }
  var tex = initTexture(gl)
  gl.texImage2D(gl.TEXTURE_2D, 0, format, shape[0], shape[1], 0, format, type, buffer)
  if(!packed) {
    pool.free(buf_store)
  }
  return new Texture2D(gl, tex, shape[0], shape[1], format, type)
}

function createTexture2D(gl) {
  if(arguments.length <= 1) {
    throw new Error('gl-texture2d: Missing arguments for texture2d constructor')
  }
  if(!linearTypes) {
    lazyInitLinearTypes(gl)
  }
  if(typeof arguments[1] === 'number') {
    return createTextureShape(gl, arguments[1], arguments[2], arguments[3]||gl.RGBA, arguments[4]||gl.UNSIGNED_BYTE)
  }
  if(Array.isArray(arguments[1])) {
    return createTextureShape(gl, arguments[1][0]|0, arguments[1][1]|0, arguments[2]||gl.RGBA, arguments[3]||gl.UNSIGNED_BYTE)
  }
  if(typeof arguments[1] === 'object') {
    var obj = arguments[1]
    var directData = acceptTextureDOM(obj) ? obj : obj.raw
    if (directData) {
      return createTextureDOM(gl, directData, obj.width|0, obj.height|0, arguments[2]||gl.RGBA, arguments[3]||gl.UNSIGNED_BYTE)
    } else if(obj.shape && obj.data && obj.stride) {
      return createTextureArray(gl, obj)
    }
  }
  throw new Error('gl-texture2d: Invalid arguments for texture2d constructor')
}

},{"ndarray":188,"ndarray-ops":185,"typedarray-pool":216}],132:[function(require,module,exports){
module.exports = add;

/**
 * Adds two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function add(out, a, b) {
    out[0] = a[0] + b[0]
    out[1] = a[1] + b[1]
    out[2] = a[2] + b[2]
    return out
}
},{}],133:[function(require,module,exports){
module.exports = angle

var fromValues = require('./fromValues')
var normalize = require('./normalize')
var dot = require('./dot')

/**
 * Get the angle between two 3D vectors
 * @param {vec3} a The first operand
 * @param {vec3} b The second operand
 * @returns {Number} The angle in radians
 */
function angle(a, b) {
    var tempA = fromValues(a[0], a[1], a[2])
    var tempB = fromValues(b[0], b[1], b[2])
 
    normalize(tempA, tempA)
    normalize(tempB, tempB)
 
    var cosine = dot(tempA, tempB)

    if(cosine > 1.0){
        return 0
    } else {
        return Math.acos(cosine)
    }     
}

},{"./dot":143,"./fromValues":149,"./normalize":160}],134:[function(require,module,exports){
module.exports = ceil

/**
 * Math.ceil the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to ceil
 * @returns {vec3} out
 */
function ceil(out, a) {
  out[0] = Math.ceil(a[0])
  out[1] = Math.ceil(a[1])
  out[2] = Math.ceil(a[2])
  return out
}

},{}],135:[function(require,module,exports){
module.exports = clone;

/**
 * Creates a new vec3 initialized with values from an existing vector
 *
 * @param {vec3} a vector to clone
 * @returns {vec3} a new 3D vector
 */
function clone(a) {
    var out = new Float32Array(3)
    out[0] = a[0]
    out[1] = a[1]
    out[2] = a[2]
    return out
}
},{}],136:[function(require,module,exports){
module.exports = copy;

/**
 * Copy the values from one vec3 to another
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the source vector
 * @returns {vec3} out
 */
function copy(out, a) {
    out[0] = a[0]
    out[1] = a[1]
    out[2] = a[2]
    return out
}
},{}],137:[function(require,module,exports){
module.exports = create;

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */
function create() {
    var out = new Float32Array(3)
    out[0] = 0
    out[1] = 0
    out[2] = 0
    return out
}
},{}],138:[function(require,module,exports){
module.exports = cross;

/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function cross(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2],
        bx = b[0], by = b[1], bz = b[2]

    out[0] = ay * bz - az * by
    out[1] = az * bx - ax * bz
    out[2] = ax * by - ay * bx
    return out
}
},{}],139:[function(require,module,exports){
module.exports = require('./distance')

},{"./distance":140}],140:[function(require,module,exports){
module.exports = distance;

/**
 * Calculates the euclidian distance between two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} distance between a and b
 */
function distance(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2]
    return Math.sqrt(x*x + y*y + z*z)
}
},{}],141:[function(require,module,exports){
module.exports = require('./divide')

},{"./divide":142}],142:[function(require,module,exports){
module.exports = divide;

/**
 * Divides two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function divide(out, a, b) {
    out[0] = a[0] / b[0]
    out[1] = a[1] / b[1]
    out[2] = a[2] / b[2]
    return out
}
},{}],143:[function(require,module,exports){
module.exports = dot;

/**
 * Calculates the dot product of two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} dot product of a and b
 */
function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}
},{}],144:[function(require,module,exports){
module.exports = 0.000001

},{}],145:[function(require,module,exports){
module.exports = equals

var EPSILON = require('./epsilon')

/**
 * Returns whether or not the vectors have approximately the same elements in the same position.
 *
 * @param {vec3} a The first vector.
 * @param {vec3} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */
function equals(a, b) {
  var a0 = a[0]
  var a1 = a[1]
  var a2 = a[2]
  var b0 = b[0]
  var b1 = b[1]
  var b2 = b[2]
  return (Math.abs(a0 - b0) <= EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
          Math.abs(a1 - b1) <= EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) &&
          Math.abs(a2 - b2) <= EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)))
}

},{"./epsilon":144}],146:[function(require,module,exports){
module.exports = exactEquals

/**
 * Returns whether or not the vectors exactly have the same elements in the same position (when compared with ===)
 *
 * @param {vec3} a The first vector.
 * @param {vec3} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */
function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}

},{}],147:[function(require,module,exports){
module.exports = floor

/**
 * Math.floor the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to floor
 * @returns {vec3} out
 */
function floor(out, a) {
  out[0] = Math.floor(a[0])
  out[1] = Math.floor(a[1])
  out[2] = Math.floor(a[2])
  return out
}

},{}],148:[function(require,module,exports){
module.exports = forEach;

var vec = require('./create')()

/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
function forEach(a, stride, offset, count, fn, arg) {
        var i, l
        if(!stride) {
            stride = 3
        }

        if(!offset) {
            offset = 0
        }
        
        if(count) {
            l = Math.min((count * stride) + offset, a.length)
        } else {
            l = a.length
        }

        for(i = offset; i < l; i += stride) {
            vec[0] = a[i] 
            vec[1] = a[i+1] 
            vec[2] = a[i+2]
            fn(vec, vec, arg)
            a[i] = vec[0] 
            a[i+1] = vec[1] 
            a[i+2] = vec[2]
        }
        
        return a
}
},{"./create":137}],149:[function(require,module,exports){
module.exports = fromValues;

/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */
function fromValues(x, y, z) {
    var out = new Float32Array(3)
    out[0] = x
    out[1] = y
    out[2] = z
    return out
}
},{}],150:[function(require,module,exports){
module.exports = {
  EPSILON: require('./epsilon')
  , create: require('./create')
  , clone: require('./clone')
  , angle: require('./angle')
  , fromValues: require('./fromValues')
  , copy: require('./copy')
  , set: require('./set')
  , equals: require('./equals')
  , exactEquals: require('./exactEquals')
  , add: require('./add')
  , subtract: require('./subtract')
  , sub: require('./sub')
  , multiply: require('./multiply')
  , mul: require('./mul')
  , divide: require('./divide')
  , div: require('./div')
  , min: require('./min')
  , max: require('./max')
  , floor: require('./floor')
  , ceil: require('./ceil')
  , round: require('./round')
  , scale: require('./scale')
  , scaleAndAdd: require('./scaleAndAdd')
  , distance: require('./distance')
  , dist: require('./dist')
  , squaredDistance: require('./squaredDistance')
  , sqrDist: require('./sqrDist')
  , length: require('./length')
  , len: require('./len')
  , squaredLength: require('./squaredLength')
  , sqrLen: require('./sqrLen')
  , negate: require('./negate')
  , inverse: require('./inverse')
  , normalize: require('./normalize')
  , dot: require('./dot')
  , cross: require('./cross')
  , lerp: require('./lerp')
  , random: require('./random')
  , transformMat4: require('./transformMat4')
  , transformMat3: require('./transformMat3')
  , transformQuat: require('./transformQuat')
  , rotateX: require('./rotateX')
  , rotateY: require('./rotateY')
  , rotateZ: require('./rotateZ')
  , forEach: require('./forEach')
}

},{"./add":132,"./angle":133,"./ceil":134,"./clone":135,"./copy":136,"./create":137,"./cross":138,"./dist":139,"./distance":140,"./div":141,"./divide":142,"./dot":143,"./epsilon":144,"./equals":145,"./exactEquals":146,"./floor":147,"./forEach":148,"./fromValues":149,"./inverse":151,"./len":152,"./length":153,"./lerp":154,"./max":155,"./min":156,"./mul":157,"./multiply":158,"./negate":159,"./normalize":160,"./random":161,"./rotateX":162,"./rotateY":163,"./rotateZ":164,"./round":165,"./scale":166,"./scaleAndAdd":167,"./set":168,"./sqrDist":169,"./sqrLen":170,"./squaredDistance":171,"./squaredLength":172,"./sub":173,"./subtract":174,"./transformMat3":175,"./transformMat4":176,"./transformQuat":177}],151:[function(require,module,exports){
module.exports = inverse;

/**
 * Returns the inverse of the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to invert
 * @returns {vec3} out
 */
function inverse(out, a) {
  out[0] = 1.0 / a[0]
  out[1] = 1.0 / a[1]
  out[2] = 1.0 / a[2]
  return out
}
},{}],152:[function(require,module,exports){
module.exports = require('./length')

},{"./length":153}],153:[function(require,module,exports){
module.exports = length;

/**
 * Calculates the length of a vec3
 *
 * @param {vec3} a vector to calculate length of
 * @returns {Number} length of a
 */
function length(a) {
    var x = a[0],
        y = a[1],
        z = a[2]
    return Math.sqrt(x*x + y*y + z*z)
}
},{}],154:[function(require,module,exports){
module.exports = lerp;

/**
 * Performs a linear interpolation between two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec3} out
 */
function lerp(out, a, b, t) {
    var ax = a[0],
        ay = a[1],
        az = a[2]
    out[0] = ax + t * (b[0] - ax)
    out[1] = ay + t * (b[1] - ay)
    out[2] = az + t * (b[2] - az)
    return out
}
},{}],155:[function(require,module,exports){
module.exports = max;

/**
 * Returns the maximum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function max(out, a, b) {
    out[0] = Math.max(a[0], b[0])
    out[1] = Math.max(a[1], b[1])
    out[2] = Math.max(a[2], b[2])
    return out
}
},{}],156:[function(require,module,exports){
module.exports = min;

/**
 * Returns the minimum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function min(out, a, b) {
    out[0] = Math.min(a[0], b[0])
    out[1] = Math.min(a[1], b[1])
    out[2] = Math.min(a[2], b[2])
    return out
}
},{}],157:[function(require,module,exports){
module.exports = require('./multiply')

},{"./multiply":158}],158:[function(require,module,exports){
module.exports = multiply;

/**
 * Multiplies two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function multiply(out, a, b) {
    out[0] = a[0] * b[0]
    out[1] = a[1] * b[1]
    out[2] = a[2] * b[2]
    return out
}
},{}],159:[function(require,module,exports){
module.exports = negate;

/**
 * Negates the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to negate
 * @returns {vec3} out
 */
function negate(out, a) {
    out[0] = -a[0]
    out[1] = -a[1]
    out[2] = -a[2]
    return out
}
},{}],160:[function(require,module,exports){
module.exports = normalize;

/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to normalize
 * @returns {vec3} out
 */
function normalize(out, a) {
    var x = a[0],
        y = a[1],
        z = a[2]
    var len = x*x + y*y + z*z
    if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len)
        out[0] = a[0] * len
        out[1] = a[1] * len
        out[2] = a[2] * len
    }
    return out
}
},{}],161:[function(require,module,exports){
module.exports = random;

/**
 * Generates a random vector with the given scale
 *
 * @param {vec3} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec3} out
 */
function random(out, scale) {
    scale = scale || 1.0

    var r = Math.random() * 2.0 * Math.PI
    var z = (Math.random() * 2.0) - 1.0
    var zScale = Math.sqrt(1.0-z*z) * scale

    out[0] = Math.cos(r) * zScale
    out[1] = Math.sin(r) * zScale
    out[2] = z * scale
    return out
}
},{}],162:[function(require,module,exports){
module.exports = rotateX;

/**
 * Rotate a 3D vector around the x-axis
 * @param {vec3} out The receiving vec3
 * @param {vec3} a The vec3 point to rotate
 * @param {vec3} b The origin of the rotation
 * @param {Number} c The angle of rotation
 * @returns {vec3} out
 */
function rotateX(out, a, b, c){
    var by = b[1]
    var bz = b[2]

    // Translate point to the origin
    var py = a[1] - by
    var pz = a[2] - bz

    var sc = Math.sin(c)
    var cc = Math.cos(c)

    // perform rotation and translate to correct position
    out[0] = a[0]
    out[1] = by + py * cc - pz * sc
    out[2] = bz + py * sc + pz * cc

    return out
}

},{}],163:[function(require,module,exports){
module.exports = rotateY;

/**
 * Rotate a 3D vector around the y-axis
 * @param {vec3} out The receiving vec3
 * @param {vec3} a The vec3 point to rotate
 * @param {vec3} b The origin of the rotation
 * @param {Number} c The angle of rotation
 * @returns {vec3} out
 */
function rotateY(out, a, b, c){
    var bx = b[0]
    var bz = b[2]

    // translate point to the origin
    var px = a[0] - bx
    var pz = a[2] - bz
    
    var sc = Math.sin(c)
    var cc = Math.cos(c)
  
    // perform rotation and translate to correct position
    out[0] = bx + pz * sc + px * cc
    out[1] = a[1]
    out[2] = bz + pz * cc - px * sc
  
    return out
}

},{}],164:[function(require,module,exports){
module.exports = rotateZ;

/**
 * Rotate a 3D vector around the z-axis
 * @param {vec3} out The receiving vec3
 * @param {vec3} a The vec3 point to rotate
 * @param {vec3} b The origin of the rotation
 * @param {Number} c The angle of rotation
 * @returns {vec3} out
 */
function rotateZ(out, a, b, c){
    var bx = b[0]
    var by = b[1]

    //Translate point to the origin
    var px = a[0] - bx
    var py = a[1] - by
  
    var sc = Math.sin(c)
    var cc = Math.cos(c)

    // perform rotation and translate to correct position
    out[0] = bx + px * cc - py * sc
    out[1] = by + px * sc + py * cc
    out[2] = a[2]
  
    return out
}

},{}],165:[function(require,module,exports){
module.exports = round

/**
 * Math.round the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to round
 * @returns {vec3} out
 */
function round(out, a) {
  out[0] = Math.round(a[0])
  out[1] = Math.round(a[1])
  out[2] = Math.round(a[2])
  return out
}

},{}],166:[function(require,module,exports){
module.exports = scale;

/**
 * Scales a vec3 by a scalar number
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec3} out
 */
function scale(out, a, b) {
    out[0] = a[0] * b
    out[1] = a[1] * b
    out[2] = a[2] * b
    return out
}
},{}],167:[function(require,module,exports){
module.exports = scaleAndAdd;

/**
 * Adds two vec3's after scaling the second operand by a scalar value
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec3} out
 */
function scaleAndAdd(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale)
    out[1] = a[1] + (b[1] * scale)
    out[2] = a[2] + (b[2] * scale)
    return out
}
},{}],168:[function(require,module,exports){
module.exports = set;

/**
 * Set the components of a vec3 to the given values
 *
 * @param {vec3} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} out
 */
function set(out, x, y, z) {
    out[0] = x
    out[1] = y
    out[2] = z
    return out
}
},{}],169:[function(require,module,exports){
module.exports = require('./squaredDistance')

},{"./squaredDistance":171}],170:[function(require,module,exports){
module.exports = require('./squaredLength')

},{"./squaredLength":172}],171:[function(require,module,exports){
module.exports = squaredDistance;

/**
 * Calculates the squared euclidian distance between two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} squared distance between a and b
 */
function squaredDistance(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2]
    return x*x + y*y + z*z
}
},{}],172:[function(require,module,exports){
module.exports = squaredLength;

/**
 * Calculates the squared length of a vec3
 *
 * @param {vec3} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
function squaredLength(a) {
    var x = a[0],
        y = a[1],
        z = a[2]
    return x*x + y*y + z*z
}
},{}],173:[function(require,module,exports){
module.exports = require('./subtract')

},{"./subtract":174}],174:[function(require,module,exports){
module.exports = subtract;

/**
 * Subtracts vector b from vector a
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function subtract(out, a, b) {
    out[0] = a[0] - b[0]
    out[1] = a[1] - b[1]
    out[2] = a[2] - b[2]
    return out
}
},{}],175:[function(require,module,exports){
module.exports = transformMat3;

/**
 * Transforms the vec3 with a mat3.
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {mat4} m the 3x3 matrix to transform with
 * @returns {vec3} out
 */
function transformMat3(out, a, m) {
    var x = a[0], y = a[1], z = a[2]
    out[0] = x * m[0] + y * m[3] + z * m[6]
    out[1] = x * m[1] + y * m[4] + z * m[7]
    out[2] = x * m[2] + y * m[5] + z * m[8]
    return out
}
},{}],176:[function(require,module,exports){
module.exports = transformMat4;

/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec3} out
 */
function transformMat4(out, a, m) {
    var x = a[0], y = a[1], z = a[2],
        w = m[3] * x + m[7] * y + m[11] * z + m[15]
    w = w || 1.0
    out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w
    out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w
    out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w
    return out
}
},{}],177:[function(require,module,exports){
module.exports = transformQuat;

/**
 * Transforms the vec3 with a quat
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {quat} q quaternion to transform with
 * @returns {vec3} out
 */
function transformQuat(out, a, q) {
    // benchmarks: http://jsperf.com/quaternion-transform-vec3-implementations

    var x = a[0], y = a[1], z = a[2],
        qx = q[0], qy = q[1], qz = q[2], qw = q[3],

        // calculate quat * vec
        ix = qw * x + qy * z - qz * y,
        iy = qw * y + qz * x - qx * z,
        iz = qw * z + qx * y - qy * x,
        iw = -qx * x - qy * y - qz * z

    // calculate result * inverse quat
    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy
    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz
    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx
    return out
}
},{}],178:[function(require,module,exports){
module.exports = function(strings) {
  if (typeof strings === 'string') strings = [strings]
  var exprs = [].slice.call(arguments,1)
  var parts = []
  for (var i = 0; i < strings.length-1; i++) {
    parts.push(strings[i], exprs[i] || '')
  }
  parts.push(strings[i])
  return parts.join('')
}

},{}],179:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],180:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      })
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    }
  }
}

},{}],181:[function(require,module,exports){
"use strict"

function iota(n) {
  var result = new Array(n)
  for(var i=0; i<n; ++i) {
    result[i] = i
  }
  return result
}

module.exports = iota
},{}],182:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],183:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],184:[function(require,module,exports){
module.exports = Long;

/**
 * wasm optimizations, to do native i64 multiplication and divide
 */
var wasm = null;

try {
  wasm = new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array([
    0, 97, 115, 109, 1, 0, 0, 0, 1, 13, 2, 96, 0, 1, 127, 96, 4, 127, 127, 127, 127, 1, 127, 3, 7, 6, 0, 1, 1, 1, 1, 1, 6, 6, 1, 127, 1, 65, 0, 11, 7, 50, 6, 3, 109, 117, 108, 0, 1, 5, 100, 105, 118, 95, 115, 0, 2, 5, 100, 105, 118, 95, 117, 0, 3, 5, 114, 101, 109, 95, 115, 0, 4, 5, 114, 101, 109, 95, 117, 0, 5, 8, 103, 101, 116, 95, 104, 105, 103, 104, 0, 0, 10, 191, 1, 6, 4, 0, 35, 0, 11, 36, 1, 1, 126, 32, 0, 173, 32, 1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3, 173, 66, 32, 134, 132, 126, 34, 4, 66, 32, 135, 167, 36, 0, 32, 4, 167, 11, 36, 1, 1, 126, 32, 0, 173, 32, 1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3, 173, 66, 32, 134, 132, 127, 34, 4, 66, 32, 135, 167, 36, 0, 32, 4, 167, 11, 36, 1, 1, 126, 32, 0, 173, 32, 1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3, 173, 66, 32, 134, 132, 128, 34, 4, 66, 32, 135, 167, 36, 0, 32, 4, 167, 11, 36, 1, 1, 126, 32, 0, 173, 32, 1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3, 173, 66, 32, 134, 132, 129, 34, 4, 66, 32, 135, 167, 36, 0, 32, 4, 167, 11, 36, 1, 1, 126, 32, 0, 173, 32, 1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3, 173, 66, 32, 134, 132, 130, 34, 4, 66, 32, 135, 167, 36, 0, 32, 4, 167, 11
  ])), {}).exports;
} catch (e) {
  // no wasm support :(
}

/**
 * Constructs a 64 bit two's-complement integer, given its low and high 32 bit values as *signed* integers.
 *  See the from* functions below for more convenient ways of constructing Longs.
 * @exports Long
 * @class A Long class for representing a 64 bit two's-complement integer value.
 * @param {number} low The low (signed) 32 bits of the long
 * @param {number} high The high (signed) 32 bits of the long
 * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
 * @constructor
 */
function Long(low, high, unsigned) {

    /**
     * The low 32 bits as a signed value.
     * @type {number}
     */
    this.low = low | 0;

    /**
     * The high 32 bits as a signed value.
     * @type {number}
     */
    this.high = high | 0;

    /**
     * Whether unsigned or not.
     * @type {boolean}
     */
    this.unsigned = !!unsigned;
}

// The internal representation of a long is the two given signed, 32-bit values.
// We use 32-bit pieces because these are the size of integers on which
// Javascript performs bit-operations.  For operations like addition and
// multiplication, we split each number into 16 bit pieces, which can easily be
// multiplied within Javascript's floating-point representation without overflow
// or change in sign.
//
// In the algorithms below, we frequently reduce the negative case to the
// positive case by negating the input(s) and then post-processing the result.
// Note that we must ALWAYS check specially whether those values are MIN_VALUE
// (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
// a positive number, it overflows back into a negative).  Not handling this
// case would often result in infinite recursion.
//
// Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the from*
// methods on which they depend.

/**
 * An indicator used to reliably determine if an object is a Long or not.
 * @type {boolean}
 * @const
 * @private
 */
Long.prototype.__isLong__;

Object.defineProperty(Long.prototype, "__isLong__", { value: true });

/**
 * @function
 * @param {*} obj Object
 * @returns {boolean}
 * @inner
 */
function isLong(obj) {
    return (obj && obj["__isLong__"]) === true;
}

/**
 * Tests if the specified object is a Long.
 * @function
 * @param {*} obj Object
 * @returns {boolean}
 */
Long.isLong = isLong;

/**
 * A cache of the Long representations of small integer values.
 * @type {!Object}
 * @inner
 */
var INT_CACHE = {};

/**
 * A cache of the Long representations of small unsigned integer values.
 * @type {!Object}
 * @inner
 */
var UINT_CACHE = {};

/**
 * @param {number} value
 * @param {boolean=} unsigned
 * @returns {!Long}
 * @inner
 */
function fromInt(value, unsigned) {
    var obj, cachedObj, cache;
    if (unsigned) {
        value >>>= 0;
        if (cache = (0 <= value && value < 256)) {
            cachedObj = UINT_CACHE[value];
            if (cachedObj)
                return cachedObj;
        }
        obj = fromBits(value, (value | 0) < 0 ? -1 : 0, true);
        if (cache)
            UINT_CACHE[value] = obj;
        return obj;
    } else {
        value |= 0;
        if (cache = (-128 <= value && value < 128)) {
            cachedObj = INT_CACHE[value];
            if (cachedObj)
                return cachedObj;
        }
        obj = fromBits(value, value < 0 ? -1 : 0, false);
        if (cache)
            INT_CACHE[value] = obj;
        return obj;
    }
}

/**
 * Returns a Long representing the given 32 bit integer value.
 * @function
 * @param {number} value The 32 bit integer in question
 * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
 * @returns {!Long} The corresponding Long value
 */
Long.fromInt = fromInt;

/**
 * @param {number} value
 * @param {boolean=} unsigned
 * @returns {!Long}
 * @inner
 */
function fromNumber(value, unsigned) {
    if (isNaN(value))
        return unsigned ? UZERO : ZERO;
    if (unsigned) {
        if (value < 0)
            return UZERO;
        if (value >= TWO_PWR_64_DBL)
            return MAX_UNSIGNED_VALUE;
    } else {
        if (value <= -TWO_PWR_63_DBL)
            return MIN_VALUE;
        if (value + 1 >= TWO_PWR_63_DBL)
            return MAX_VALUE;
    }
    if (value < 0)
        return fromNumber(-value, unsigned).neg();
    return fromBits((value % TWO_PWR_32_DBL) | 0, (value / TWO_PWR_32_DBL) | 0, unsigned);
}

/**
 * Returns a Long representing the given value, provided that it is a finite number. Otherwise, zero is returned.
 * @function
 * @param {number} value The number in question
 * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
 * @returns {!Long} The corresponding Long value
 */
Long.fromNumber = fromNumber;

/**
 * @param {number} lowBits
 * @param {number} highBits
 * @param {boolean=} unsigned
 * @returns {!Long}
 * @inner
 */
function fromBits(lowBits, highBits, unsigned) {
    return new Long(lowBits, highBits, unsigned);
}

/**
 * Returns a Long representing the 64 bit integer that comes by concatenating the given low and high bits. Each is
 *  assumed to use 32 bits.
 * @function
 * @param {number} lowBits The low 32 bits
 * @param {number} highBits The high 32 bits
 * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
 * @returns {!Long} The corresponding Long value
 */
Long.fromBits = fromBits;

/**
 * @function
 * @param {number} base
 * @param {number} exponent
 * @returns {number}
 * @inner
 */
var pow_dbl = Math.pow; // Used 4 times (4*8 to 15+4)

/**
 * @param {string} str
 * @param {(boolean|number)=} unsigned
 * @param {number=} radix
 * @returns {!Long}
 * @inner
 */
function fromString(str, unsigned, radix) {
    if (str.length === 0)
        throw Error('empty string');
    if (str === "NaN" || str === "Infinity" || str === "+Infinity" || str === "-Infinity")
        return ZERO;
    if (typeof unsigned === 'number') {
        // For goog.math.long compatibility
        radix = unsigned,
        unsigned = false;
    } else {
        unsigned = !! unsigned;
    }
    radix = radix || 10;
    if (radix < 2 || 36 < radix)
        throw RangeError('radix');

    var p;
    if ((p = str.indexOf('-')) > 0)
        throw Error('interior hyphen');
    else if (p === 0) {
        return fromString(str.substring(1), unsigned, radix).neg();
    }

    // Do several (8) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = fromNumber(pow_dbl(radix, 8));

    var result = ZERO;
    for (var i = 0; i < str.length; i += 8) {
        var size = Math.min(8, str.length - i),
            value = parseInt(str.substring(i, i + size), radix);
        if (size < 8) {
            var power = fromNumber(pow_dbl(radix, size));
            result = result.mul(power).add(fromNumber(value));
        } else {
            result = result.mul(radixToPower);
            result = result.add(fromNumber(value));
        }
    }
    result.unsigned = unsigned;
    return result;
}

/**
 * Returns a Long representation of the given string, written using the specified radix.
 * @function
 * @param {string} str The textual representation of the Long
 * @param {(boolean|number)=} unsigned Whether unsigned or not, defaults to signed
 * @param {number=} radix The radix in which the text is written (2-36), defaults to 10
 * @returns {!Long} The corresponding Long value
 */
Long.fromString = fromString;

/**
 * @function
 * @param {!Long|number|string|!{low: number, high: number, unsigned: boolean}} val
 * @param {boolean=} unsigned
 * @returns {!Long}
 * @inner
 */
function fromValue(val, unsigned) {
    if (typeof val === 'number')
        return fromNumber(val, unsigned);
    if (typeof val === 'string')
        return fromString(val, unsigned);
    // Throws for non-objects, converts non-instanceof Long:
    return fromBits(val.low, val.high, typeof unsigned === 'boolean' ? unsigned : val.unsigned);
}

/**
 * Converts the specified value to a Long using the appropriate from* function for its type.
 * @function
 * @param {!Long|number|string|!{low: number, high: number, unsigned: boolean}} val Value
 * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
 * @returns {!Long}
 */
Long.fromValue = fromValue;

// NOTE: the compiler should inline these constant values below and then remove these variables, so there should be
// no runtime penalty for these.

/**
 * @type {number}
 * @const
 * @inner
 */
var TWO_PWR_16_DBL = 1 << 16;

/**
 * @type {number}
 * @const
 * @inner
 */
var TWO_PWR_24_DBL = 1 << 24;

/**
 * @type {number}
 * @const
 * @inner
 */
var TWO_PWR_32_DBL = TWO_PWR_16_DBL * TWO_PWR_16_DBL;

/**
 * @type {number}
 * @const
 * @inner
 */
var TWO_PWR_64_DBL = TWO_PWR_32_DBL * TWO_PWR_32_DBL;

/**
 * @type {number}
 * @const
 * @inner
 */
var TWO_PWR_63_DBL = TWO_PWR_64_DBL / 2;

/**
 * @type {!Long}
 * @const
 * @inner
 */
var TWO_PWR_24 = fromInt(TWO_PWR_24_DBL);

/**
 * @type {!Long}
 * @inner
 */
var ZERO = fromInt(0);

/**
 * Signed zero.
 * @type {!Long}
 */
Long.ZERO = ZERO;

/**
 * @type {!Long}
 * @inner
 */
var UZERO = fromInt(0, true);

/**
 * Unsigned zero.
 * @type {!Long}
 */
Long.UZERO = UZERO;

/**
 * @type {!Long}
 * @inner
 */
var ONE = fromInt(1);

/**
 * Signed one.
 * @type {!Long}
 */
Long.ONE = ONE;

/**
 * @type {!Long}
 * @inner
 */
var UONE = fromInt(1, true);

/**
 * Unsigned one.
 * @type {!Long}
 */
Long.UONE = UONE;

/**
 * @type {!Long}
 * @inner
 */
var NEG_ONE = fromInt(-1);

/**
 * Signed negative one.
 * @type {!Long}
 */
Long.NEG_ONE = NEG_ONE;

/**
 * @type {!Long}
 * @inner
 */
var MAX_VALUE = fromBits(0xFFFFFFFF|0, 0x7FFFFFFF|0, false);

/**
 * Maximum signed value.
 * @type {!Long}
 */
Long.MAX_VALUE = MAX_VALUE;

/**
 * @type {!Long}
 * @inner
 */
var MAX_UNSIGNED_VALUE = fromBits(0xFFFFFFFF|0, 0xFFFFFFFF|0, true);

/**
 * Maximum unsigned value.
 * @type {!Long}
 */
Long.MAX_UNSIGNED_VALUE = MAX_UNSIGNED_VALUE;

/**
 * @type {!Long}
 * @inner
 */
var MIN_VALUE = fromBits(0, 0x80000000|0, false);

/**
 * Minimum signed value.
 * @type {!Long}
 */
Long.MIN_VALUE = MIN_VALUE;

/**
 * @alias Long.prototype
 * @inner
 */
var LongPrototype = Long.prototype;

/**
 * Converts the Long to a 32 bit integer, assuming it is a 32 bit integer.
 * @returns {number}
 */
LongPrototype.toInt = function toInt() {
    return this.unsigned ? this.low >>> 0 : this.low;
};

/**
 * Converts the Long to a the nearest floating-point representation of this value (double, 53 bit mantissa).
 * @returns {number}
 */
LongPrototype.toNumber = function toNumber() {
    if (this.unsigned)
        return ((this.high >>> 0) * TWO_PWR_32_DBL) + (this.low >>> 0);
    return this.high * TWO_PWR_32_DBL + (this.low >>> 0);
};

/**
 * Converts the Long to a string written in the specified radix.
 * @param {number=} radix Radix (2-36), defaults to 10
 * @returns {string}
 * @override
 * @throws {RangeError} If `radix` is out of range
 */
LongPrototype.toString = function toString(radix) {
    radix = radix || 10;
    if (radix < 2 || 36 < radix)
        throw RangeError('radix');
    if (this.isZero())
        return '0';
    if (this.isNegative()) { // Unsigned Longs are never negative
        if (this.eq(MIN_VALUE)) {
            // We need to change the Long value before it can be negated, so we remove
            // the bottom-most digit in this base and then recurse to do the rest.
            var radixLong = fromNumber(radix),
                div = this.div(radixLong),
                rem1 = div.mul(radixLong).sub(this);
            return div.toString(radix) + rem1.toInt().toString(radix);
        } else
            return '-' + this.neg().toString(radix);
    }

    // Do several (6) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = fromNumber(pow_dbl(radix, 6), this.unsigned),
        rem = this;
    var result = '';
    while (true) {
        var remDiv = rem.div(radixToPower),
            intval = rem.sub(remDiv.mul(radixToPower)).toInt() >>> 0,
            digits = intval.toString(radix);
        rem = remDiv;
        if (rem.isZero())
            return digits + result;
        else {
            while (digits.length < 6)
                digits = '0' + digits;
            result = '' + digits + result;
        }
    }
};

/**
 * Gets the high 32 bits as a signed integer.
 * @returns {number} Signed high bits
 */
LongPrototype.getHighBits = function getHighBits() {
    return this.high;
};

/**
 * Gets the high 32 bits as an unsigned integer.
 * @returns {number} Unsigned high bits
 */
LongPrototype.getHighBitsUnsigned = function getHighBitsUnsigned() {
    return this.high >>> 0;
};

/**
 * Gets the low 32 bits as a signed integer.
 * @returns {number} Signed low bits
 */
LongPrototype.getLowBits = function getLowBits() {
    return this.low;
};

/**
 * Gets the low 32 bits as an unsigned integer.
 * @returns {number} Unsigned low bits
 */
LongPrototype.getLowBitsUnsigned = function getLowBitsUnsigned() {
    return this.low >>> 0;
};

/**
 * Gets the number of bits needed to represent the absolute value of this Long.
 * @returns {number}
 */
LongPrototype.getNumBitsAbs = function getNumBitsAbs() {
    if (this.isNegative()) // Unsigned Longs are never negative
        return this.eq(MIN_VALUE) ? 64 : this.neg().getNumBitsAbs();
    var val = this.high != 0 ? this.high : this.low;
    for (var bit = 31; bit > 0; bit--)
        if ((val & (1 << bit)) != 0)
            break;
    return this.high != 0 ? bit + 33 : bit + 1;
};

/**
 * Tests if this Long's value equals zero.
 * @returns {boolean}
 */
LongPrototype.isZero = function isZero() {
    return this.high === 0 && this.low === 0;
};

/**
 * Tests if this Long's value equals zero. This is an alias of {@link Long#isZero}.
 * @returns {boolean}
 */
LongPrototype.eqz = LongPrototype.isZero;

/**
 * Tests if this Long's value is negative.
 * @returns {boolean}
 */
LongPrototype.isNegative = function isNegative() {
    return !this.unsigned && this.high < 0;
};

/**
 * Tests if this Long's value is positive.
 * @returns {boolean}
 */
LongPrototype.isPositive = function isPositive() {
    return this.unsigned || this.high >= 0;
};

/**
 * Tests if this Long's value is odd.
 * @returns {boolean}
 */
LongPrototype.isOdd = function isOdd() {
    return (this.low & 1) === 1;
};

/**
 * Tests if this Long's value is even.
 * @returns {boolean}
 */
LongPrototype.isEven = function isEven() {
    return (this.low & 1) === 0;
};

/**
 * Tests if this Long's value equals the specified's.
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.equals = function equals(other) {
    if (!isLong(other))
        other = fromValue(other);
    if (this.unsigned !== other.unsigned && (this.high >>> 31) === 1 && (other.high >>> 31) === 1)
        return false;
    return this.high === other.high && this.low === other.low;
};

/**
 * Tests if this Long's value equals the specified's. This is an alias of {@link Long#equals}.
 * @function
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.eq = LongPrototype.equals;

/**
 * Tests if this Long's value differs from the specified's.
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.notEquals = function notEquals(other) {
    return !this.eq(/* validates */ other);
};

/**
 * Tests if this Long's value differs from the specified's. This is an alias of {@link Long#notEquals}.
 * @function
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.neq = LongPrototype.notEquals;

/**
 * Tests if this Long's value differs from the specified's. This is an alias of {@link Long#notEquals}.
 * @function
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.ne = LongPrototype.notEquals;

/**
 * Tests if this Long's value is less than the specified's.
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.lessThan = function lessThan(other) {
    return this.comp(/* validates */ other) < 0;
};

/**
 * Tests if this Long's value is less than the specified's. This is an alias of {@link Long#lessThan}.
 * @function
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.lt = LongPrototype.lessThan;

/**
 * Tests if this Long's value is less than or equal the specified's.
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.lessThanOrEqual = function lessThanOrEqual(other) {
    return this.comp(/* validates */ other) <= 0;
};

/**
 * Tests if this Long's value is less than or equal the specified's. This is an alias of {@link Long#lessThanOrEqual}.
 * @function
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.lte = LongPrototype.lessThanOrEqual;

/**
 * Tests if this Long's value is less than or equal the specified's. This is an alias of {@link Long#lessThanOrEqual}.
 * @function
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.le = LongPrototype.lessThanOrEqual;

/**
 * Tests if this Long's value is greater than the specified's.
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.greaterThan = function greaterThan(other) {
    return this.comp(/* validates */ other) > 0;
};

/**
 * Tests if this Long's value is greater than the specified's. This is an alias of {@link Long#greaterThan}.
 * @function
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.gt = LongPrototype.greaterThan;

/**
 * Tests if this Long's value is greater than or equal the specified's.
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.greaterThanOrEqual = function greaterThanOrEqual(other) {
    return this.comp(/* validates */ other) >= 0;
};

/**
 * Tests if this Long's value is greater than or equal the specified's. This is an alias of {@link Long#greaterThanOrEqual}.
 * @function
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.gte = LongPrototype.greaterThanOrEqual;

/**
 * Tests if this Long's value is greater than or equal the specified's. This is an alias of {@link Long#greaterThanOrEqual}.
 * @function
 * @param {!Long|number|string} other Other value
 * @returns {boolean}
 */
LongPrototype.ge = LongPrototype.greaterThanOrEqual;

/**
 * Compares this Long's value with the specified's.
 * @param {!Long|number|string} other Other value
 * @returns {number} 0 if they are the same, 1 if the this is greater and -1
 *  if the given one is greater
 */
LongPrototype.compare = function compare(other) {
    if (!isLong(other))
        other = fromValue(other);
    if (this.eq(other))
        return 0;
    var thisNeg = this.isNegative(),
        otherNeg = other.isNegative();
    if (thisNeg && !otherNeg)
        return -1;
    if (!thisNeg && otherNeg)
        return 1;
    // At this point the sign bits are the same
    if (!this.unsigned)
        return this.sub(other).isNegative() ? -1 : 1;
    // Both are positive if at least one is unsigned
    return (other.high >>> 0) > (this.high >>> 0) || (other.high === this.high && (other.low >>> 0) > (this.low >>> 0)) ? -1 : 1;
};

/**
 * Compares this Long's value with the specified's. This is an alias of {@link Long#compare}.
 * @function
 * @param {!Long|number|string} other Other value
 * @returns {number} 0 if they are the same, 1 if the this is greater and -1
 *  if the given one is greater
 */
LongPrototype.comp = LongPrototype.compare;

/**
 * Negates this Long's value.
 * @returns {!Long} Negated Long
 */
LongPrototype.negate = function negate() {
    if (!this.unsigned && this.eq(MIN_VALUE))
        return MIN_VALUE;
    return this.not().add(ONE);
};

/**
 * Negates this Long's value. This is an alias of {@link Long#negate}.
 * @function
 * @returns {!Long} Negated Long
 */
LongPrototype.neg = LongPrototype.negate;

/**
 * Returns the sum of this and the specified Long.
 * @param {!Long|number|string} addend Addend
 * @returns {!Long} Sum
 */
LongPrototype.add = function add(addend) {
    if (!isLong(addend))
        addend = fromValue(addend);

    // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

    var a48 = this.high >>> 16;
    var a32 = this.high & 0xFFFF;
    var a16 = this.low >>> 16;
    var a00 = this.low & 0xFFFF;

    var b48 = addend.high >>> 16;
    var b32 = addend.high & 0xFFFF;
    var b16 = addend.low >>> 16;
    var b00 = addend.low & 0xFFFF;

    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 + b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 + b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 + b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 + b48;
    c48 &= 0xFFFF;
    return fromBits((c16 << 16) | c00, (c48 << 16) | c32, this.unsigned);
};

/**
 * Returns the difference of this and the specified Long.
 * @param {!Long|number|string} subtrahend Subtrahend
 * @returns {!Long} Difference
 */
LongPrototype.subtract = function subtract(subtrahend) {
    if (!isLong(subtrahend))
        subtrahend = fromValue(subtrahend);
    return this.add(subtrahend.neg());
};

/**
 * Returns the difference of this and the specified Long. This is an alias of {@link Long#subtract}.
 * @function
 * @param {!Long|number|string} subtrahend Subtrahend
 * @returns {!Long} Difference
 */
LongPrototype.sub = LongPrototype.subtract;

/**
 * Returns the product of this and the specified Long.
 * @param {!Long|number|string} multiplier Multiplier
 * @returns {!Long} Product
 */
LongPrototype.multiply = function multiply(multiplier) {
    if (this.isZero())
        return ZERO;
    if (!isLong(multiplier))
        multiplier = fromValue(multiplier);

    // use wasm support if present
    if (wasm) {
        var low = wasm.mul(this.low,
                           this.high,
                           multiplier.low,
                           multiplier.high);
        return fromBits(low, wasm.get_high(), this.unsigned);
    }

    if (multiplier.isZero())
        return ZERO;
    if (this.eq(MIN_VALUE))
        return multiplier.isOdd() ? MIN_VALUE : ZERO;
    if (multiplier.eq(MIN_VALUE))
        return this.isOdd() ? MIN_VALUE : ZERO;

    if (this.isNegative()) {
        if (multiplier.isNegative())
            return this.neg().mul(multiplier.neg());
        else
            return this.neg().mul(multiplier).neg();
    } else if (multiplier.isNegative())
        return this.mul(multiplier.neg()).neg();

    // If both longs are small, use float multiplication
    if (this.lt(TWO_PWR_24) && multiplier.lt(TWO_PWR_24))
        return fromNumber(this.toNumber() * multiplier.toNumber(), this.unsigned);

    // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
    // We can skip products that would overflow.

    var a48 = this.high >>> 16;
    var a32 = this.high & 0xFFFF;
    var a16 = this.low >>> 16;
    var a00 = this.low & 0xFFFF;

    var b48 = multiplier.high >>> 16;
    var b32 = multiplier.high & 0xFFFF;
    var b16 = multiplier.low >>> 16;
    var b00 = multiplier.low & 0xFFFF;

    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 * b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 * b00;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c16 += a00 * b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 * b00;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a16 * b16;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a00 * b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
    c48 &= 0xFFFF;
    return fromBits((c16 << 16) | c00, (c48 << 16) | c32, this.unsigned);
};

/**
 * Returns the product of this and the specified Long. This is an alias of {@link Long#multiply}.
 * @function
 * @param {!Long|number|string} multiplier Multiplier
 * @returns {!Long} Product
 */
LongPrototype.mul = LongPrototype.multiply;

/**
 * Returns this Long divided by the specified. The result is signed if this Long is signed or
 *  unsigned if this Long is unsigned.
 * @param {!Long|number|string} divisor Divisor
 * @returns {!Long} Quotient
 */
LongPrototype.divide = function divide(divisor) {
    if (!isLong(divisor))
        divisor = fromValue(divisor);
    if (divisor.isZero())
        throw Error('division by zero');

    // use wasm support if present
    if (wasm) {
        // guard against signed division overflow: the largest
        // negative number / -1 would be 1 larger than the largest
        // positive number, due to two's complement.
        if (!this.unsigned &&
            this.high === -0x80000000 &&
            divisor.low === -1 && divisor.high === -1) {
            // be consistent with non-wasm code path
            return this;
        }
        var low = (this.unsigned ? wasm.div_u : wasm.div_s)(
            this.low,
            this.high,
            divisor.low,
            divisor.high
        );
        return fromBits(low, wasm.get_high(), this.unsigned);
    }

    if (this.isZero())
        return this.unsigned ? UZERO : ZERO;
    var approx, rem, res;
    if (!this.unsigned) {
        // This section is only relevant for signed longs and is derived from the
        // closure library as a whole.
        if (this.eq(MIN_VALUE)) {
            if (divisor.eq(ONE) || divisor.eq(NEG_ONE))
                return MIN_VALUE;  // recall that -MIN_VALUE == MIN_VALUE
            else if (divisor.eq(MIN_VALUE))
                return ONE;
            else {
                // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
                var halfThis = this.shr(1);
                approx = halfThis.div(divisor).shl(1);
                if (approx.eq(ZERO)) {
                    return divisor.isNegative() ? ONE : NEG_ONE;
                } else {
                    rem = this.sub(divisor.mul(approx));
                    res = approx.add(rem.div(divisor));
                    return res;
                }
            }
        } else if (divisor.eq(MIN_VALUE))
            return this.unsigned ? UZERO : ZERO;
        if (this.isNegative()) {
            if (divisor.isNegative())
                return this.neg().div(divisor.neg());
            return this.neg().div(divisor).neg();
        } else if (divisor.isNegative())
            return this.div(divisor.neg()).neg();
        res = ZERO;
    } else {
        // The algorithm below has not been made for unsigned longs. It's therefore
        // required to take special care of the MSB prior to running it.
        if (!divisor.unsigned)
            divisor = divisor.toUnsigned();
        if (divisor.gt(this))
            return UZERO;
        if (divisor.gt(this.shru(1))) // 15 >>> 1 = 7 ; with divisor = 8 ; true
            return UONE;
        res = UZERO;
    }

    // Repeat the following until the remainder is less than other:  find a
    // floating-point that approximates remainder / other *from below*, add this
    // into the result, and subtract it from the remainder.  It is critical that
    // the approximate value is less than or equal to the real value so that the
    // remainder never becomes negative.
    rem = this;
    while (rem.gte(divisor)) {
        // Approximate the result of division. This may be a little greater or
        // smaller than the actual value.
        approx = Math.max(1, Math.floor(rem.toNumber() / divisor.toNumber()));

        // We will tweak the approximate result by changing it in the 48-th digit or
        // the smallest non-fractional digit, whichever is larger.
        var log2 = Math.ceil(Math.log(approx) / Math.LN2),
            delta = (log2 <= 48) ? 1 : pow_dbl(2, log2 - 48),

        // Decrease the approximation until it is smaller than the remainder.  Note
        // that if it is too large, the product overflows and is negative.
            approxRes = fromNumber(approx),
            approxRem = approxRes.mul(divisor);
        while (approxRem.isNegative() || approxRem.gt(rem)) {
            approx -= delta;
            approxRes = fromNumber(approx, this.unsigned);
            approxRem = approxRes.mul(divisor);
        }

        // We know the answer can't be zero... and actually, zero would cause
        // infinite recursion since we would make no progress.
        if (approxRes.isZero())
            approxRes = ONE;

        res = res.add(approxRes);
        rem = rem.sub(approxRem);
    }
    return res;
};

/**
 * Returns this Long divided by the specified. This is an alias of {@link Long#divide}.
 * @function
 * @param {!Long|number|string} divisor Divisor
 * @returns {!Long} Quotient
 */
LongPrototype.div = LongPrototype.divide;

/**
 * Returns this Long modulo the specified.
 * @param {!Long|number|string} divisor Divisor
 * @returns {!Long} Remainder
 */
LongPrototype.modulo = function modulo(divisor) {
    if (!isLong(divisor))
        divisor = fromValue(divisor);

    // use wasm support if present
    if (wasm) {
        var low = (this.unsigned ? wasm.rem_u : wasm.rem_s)(
            this.low,
            this.high,
            divisor.low,
            divisor.high
        );
        return fromBits(low, wasm.get_high(), this.unsigned);
    }

    return this.sub(this.div(divisor).mul(divisor));
};

/**
 * Returns this Long modulo the specified. This is an alias of {@link Long#modulo}.
 * @function
 * @param {!Long|number|string} divisor Divisor
 * @returns {!Long} Remainder
 */
LongPrototype.mod = LongPrototype.modulo;

/**
 * Returns this Long modulo the specified. This is an alias of {@link Long#modulo}.
 * @function
 * @param {!Long|number|string} divisor Divisor
 * @returns {!Long} Remainder
 */
LongPrototype.rem = LongPrototype.modulo;

/**
 * Returns the bitwise NOT of this Long.
 * @returns {!Long}
 */
LongPrototype.not = function not() {
    return fromBits(~this.low, ~this.high, this.unsigned);
};

/**
 * Returns the bitwise AND of this Long and the specified.
 * @param {!Long|number|string} other Other Long
 * @returns {!Long}
 */
LongPrototype.and = function and(other) {
    if (!isLong(other))
        other = fromValue(other);
    return fromBits(this.low & other.low, this.high & other.high, this.unsigned);
};

/**
 * Returns the bitwise OR of this Long and the specified.
 * @param {!Long|number|string} other Other Long
 * @returns {!Long}
 */
LongPrototype.or = function or(other) {
    if (!isLong(other))
        other = fromValue(other);
    return fromBits(this.low | other.low, this.high | other.high, this.unsigned);
};

/**
 * Returns the bitwise XOR of this Long and the given one.
 * @param {!Long|number|string} other Other Long
 * @returns {!Long}
 */
LongPrototype.xor = function xor(other) {
    if (!isLong(other))
        other = fromValue(other);
    return fromBits(this.low ^ other.low, this.high ^ other.high, this.unsigned);
};

/**
 * Returns this Long with bits shifted to the left by the given amount.
 * @param {number|!Long} numBits Number of bits
 * @returns {!Long} Shifted Long
 */
LongPrototype.shiftLeft = function shiftLeft(numBits) {
    if (isLong(numBits))
        numBits = numBits.toInt();
    if ((numBits &= 63) === 0)
        return this;
    else if (numBits < 32)
        return fromBits(this.low << numBits, (this.high << numBits) | (this.low >>> (32 - numBits)), this.unsigned);
    else
        return fromBits(0, this.low << (numBits - 32), this.unsigned);
};

/**
 * Returns this Long with bits shifted to the left by the given amount. This is an alias of {@link Long#shiftLeft}.
 * @function
 * @param {number|!Long} numBits Number of bits
 * @returns {!Long} Shifted Long
 */
LongPrototype.shl = LongPrototype.shiftLeft;

/**
 * Returns this Long with bits arithmetically shifted to the right by the given amount.
 * @param {number|!Long} numBits Number of bits
 * @returns {!Long} Shifted Long
 */
LongPrototype.shiftRight = function shiftRight(numBits) {
    if (isLong(numBits))
        numBits = numBits.toInt();
    if ((numBits &= 63) === 0)
        return this;
    else if (numBits < 32)
        return fromBits((this.low >>> numBits) | (this.high << (32 - numBits)), this.high >> numBits, this.unsigned);
    else
        return fromBits(this.high >> (numBits - 32), this.high >= 0 ? 0 : -1, this.unsigned);
};

/**
 * Returns this Long with bits arithmetically shifted to the right by the given amount. This is an alias of {@link Long#shiftRight}.
 * @function
 * @param {number|!Long} numBits Number of bits
 * @returns {!Long} Shifted Long
 */
LongPrototype.shr = LongPrototype.shiftRight;

/**
 * Returns this Long with bits logically shifted to the right by the given amount.
 * @param {number|!Long} numBits Number of bits
 * @returns {!Long} Shifted Long
 */
LongPrototype.shiftRightUnsigned = function shiftRightUnsigned(numBits) {
    if (isLong(numBits))
        numBits = numBits.toInt();
    numBits &= 63;
    if (numBits === 0)
        return this;
    else {
        var high = this.high;
        if (numBits < 32) {
            var low = this.low;
            return fromBits((low >>> numBits) | (high << (32 - numBits)), high >>> numBits, this.unsigned);
        } else if (numBits === 32)
            return fromBits(high, 0, this.unsigned);
        else
            return fromBits(high >>> (numBits - 32), 0, this.unsigned);
    }
};

/**
 * Returns this Long with bits logically shifted to the right by the given amount. This is an alias of {@link Long#shiftRightUnsigned}.
 * @function
 * @param {number|!Long} numBits Number of bits
 * @returns {!Long} Shifted Long
 */
LongPrototype.shru = LongPrototype.shiftRightUnsigned;

/**
 * Returns this Long with bits logically shifted to the right by the given amount. This is an alias of {@link Long#shiftRightUnsigned}.
 * @function
 * @param {number|!Long} numBits Number of bits
 * @returns {!Long} Shifted Long
 */
LongPrototype.shr_u = LongPrototype.shiftRightUnsigned;

/**
 * Converts this Long to signed.
 * @returns {!Long} Signed long
 */
LongPrototype.toSigned = function toSigned() {
    if (!this.unsigned)
        return this;
    return fromBits(this.low, this.high, false);
};

/**
 * Converts this Long to unsigned.
 * @returns {!Long} Unsigned long
 */
LongPrototype.toUnsigned = function toUnsigned() {
    if (this.unsigned)
        return this;
    return fromBits(this.low, this.high, true);
};

/**
 * Converts this Long to its byte representation.
 * @param {boolean=} le Whether little or big endian, defaults to big endian
 * @returns {!Array.<number>} Byte representation
 */
LongPrototype.toBytes = function toBytes(le) {
    return le ? this.toBytesLE() : this.toBytesBE();
};

/**
 * Converts this Long to its little endian byte representation.
 * @returns {!Array.<number>} Little endian byte representation
 */
LongPrototype.toBytesLE = function toBytesLE() {
    var hi = this.high,
        lo = this.low;
    return [
        lo        & 0xff,
        lo >>>  8 & 0xff,
        lo >>> 16 & 0xff,
        lo >>> 24       ,
        hi        & 0xff,
        hi >>>  8 & 0xff,
        hi >>> 16 & 0xff,
        hi >>> 24
    ];
};

/**
 * Converts this Long to its big endian byte representation.
 * @returns {!Array.<number>} Big endian byte representation
 */
LongPrototype.toBytesBE = function toBytesBE() {
    var hi = this.high,
        lo = this.low;
    return [
        hi >>> 24       ,
        hi >>> 16 & 0xff,
        hi >>>  8 & 0xff,
        hi        & 0xff,
        lo >>> 24       ,
        lo >>> 16 & 0xff,
        lo >>>  8 & 0xff,
        lo        & 0xff
    ];
};

/**
 * Creates a Long from its byte representation.
 * @param {!Array.<number>} bytes Byte representation
 * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
 * @param {boolean=} le Whether little or big endian, defaults to big endian
 * @returns {Long} The corresponding Long value
 */
Long.fromBytes = function fromBytes(bytes, unsigned, le) {
    return le ? Long.fromBytesLE(bytes, unsigned) : Long.fromBytesBE(bytes, unsigned);
};

/**
 * Creates a Long from its little endian byte representation.
 * @param {!Array.<number>} bytes Little endian byte representation
 * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
 * @returns {Long} The corresponding Long value
 */
Long.fromBytesLE = function fromBytesLE(bytes, unsigned) {
    return new Long(
        bytes[0]       |
        bytes[1] <<  8 |
        bytes[2] << 16 |
        bytes[3] << 24,
        bytes[4]       |
        bytes[5] <<  8 |
        bytes[6] << 16 |
        bytes[7] << 24,
        unsigned
    );
};

/**
 * Creates a Long from its big endian byte representation.
 * @param {!Array.<number>} bytes Big endian byte representation
 * @param {boolean=} unsigned Whether unsigned or not, defaults to signed
 * @returns {Long} The corresponding Long value
 */
Long.fromBytesBE = function fromBytesBE(bytes, unsigned) {
    return new Long(
        bytes[4] << 24 |
        bytes[5] << 16 |
        bytes[6] <<  8 |
        bytes[7],
        bytes[0] << 24 |
        bytes[1] << 16 |
        bytes[2] <<  8 |
        bytes[3],
        unsigned
    );
};

},{}],185:[function(require,module,exports){
"use strict"

var compile = require("cwise-compiler")

var EmptyProc = {
  body: "",
  args: [],
  thisVars: [],
  localVars: []
}

function fixup(x) {
  if(!x) {
    return EmptyProc
  }
  for(var i=0; i<x.args.length; ++i) {
    var a = x.args[i]
    if(i === 0) {
      x.args[i] = {name: a, lvalue:true, rvalue: !!x.rvalue, count:x.count||1 }
    } else {
      x.args[i] = {name: a, lvalue:false, rvalue:true, count: 1}
    }
  }
  if(!x.thisVars) {
    x.thisVars = []
  }
  if(!x.localVars) {
    x.localVars = []
  }
  return x
}

function pcompile(user_args) {
  return compile({
    args:     user_args.args,
    pre:      fixup(user_args.pre),
    body:     fixup(user_args.body),
    post:     fixup(user_args.proc),
    funcName: user_args.funcName
  })
}

function makeOp(user_args) {
  var args = []
  for(var i=0; i<user_args.args.length; ++i) {
    args.push("a"+i)
  }
  var wrapper = new Function("P", [
    "return function ", user_args.funcName, "_ndarrayops(", args.join(","), ") {P(", args.join(","), ");return a0}"
  ].join(""))
  return wrapper(pcompile(user_args))
}

var assign_ops = {
  add:  "+",
  sub:  "-",
  mul:  "*",
  div:  "/",
  mod:  "%",
  band: "&",
  bor:  "|",
  bxor: "^",
  lshift: "<<",
  rshift: ">>",
  rrshift: ">>>"
}
;(function(){
  for(var id in assign_ops) {
    var op = assign_ops[id]
    exports[id] = makeOp({
      args: ["array","array","array"],
      body: {args:["a","b","c"],
             body: "a=b"+op+"c"},
      funcName: id
    })
    exports[id+"eq"] = makeOp({
      args: ["array","array"],
      body: {args:["a","b"],
             body:"a"+op+"=b"},
      rvalue: true,
      funcName: id+"eq"
    })
    exports[id+"s"] = makeOp({
      args: ["array", "array", "scalar"],
      body: {args:["a","b","s"],
             body:"a=b"+op+"s"},
      funcName: id+"s"
    })
    exports[id+"seq"] = makeOp({
      args: ["array","scalar"],
      body: {args:["a","s"],
             body:"a"+op+"=s"},
      rvalue: true,
      funcName: id+"seq"
    })
  }
})();

var unary_ops = {
  not: "!",
  bnot: "~",
  neg: "-",
  recip: "1.0/"
}
;(function(){
  for(var id in unary_ops) {
    var op = unary_ops[id]
    exports[id] = makeOp({
      args: ["array", "array"],
      body: {args:["a","b"],
             body:"a="+op+"b"},
      funcName: id
    })
    exports[id+"eq"] = makeOp({
      args: ["array"],
      body: {args:["a"],
             body:"a="+op+"a"},
      rvalue: true,
      count: 2,
      funcName: id+"eq"
    })
  }
})();

var binary_ops = {
  and: "&&",
  or: "||",
  eq: "===",
  neq: "!==",
  lt: "<",
  gt: ">",
  leq: "<=",
  geq: ">="
}
;(function() {
  for(var id in binary_ops) {
    var op = binary_ops[id]
    exports[id] = makeOp({
      args: ["array","array","array"],
      body: {args:["a", "b", "c"],
             body:"a=b"+op+"c"},
      funcName: id
    })
    exports[id+"s"] = makeOp({
      args: ["array","array","scalar"],
      body: {args:["a", "b", "s"],
             body:"a=b"+op+"s"},
      funcName: id+"s"
    })
    exports[id+"eq"] = makeOp({
      args: ["array", "array"],
      body: {args:["a", "b"],
             body:"a=a"+op+"b"},
      rvalue:true,
      count:2,
      funcName: id+"eq"
    })
    exports[id+"seq"] = makeOp({
      args: ["array", "scalar"],
      body: {args:["a","s"],
             body:"a=a"+op+"s"},
      rvalue:true,
      count:2,
      funcName: id+"seq"
    })
  }
})();

var math_unary = [
  "abs",
  "acos",
  "asin",
  "atan",
  "ceil",
  "cos",
  "exp",
  "floor",
  "log",
  "round",
  "sin",
  "sqrt",
  "tan"
]
;(function() {
  for(var i=0; i<math_unary.length; ++i) {
    var f = math_unary[i]
    exports[f] = makeOp({
                    args: ["array", "array"],
                    pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                    body: {args:["a","b"], body:"a=this_f(b)", thisVars:["this_f"]},
                    funcName: f
                  })
    exports[f+"eq"] = makeOp({
                      args: ["array"],
                      pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                      body: {args: ["a"], body:"a=this_f(a)", thisVars:["this_f"]},
                      rvalue: true,
                      count: 2,
                      funcName: f+"eq"
                    })
  }
})();

var math_comm = [
  "max",
  "min",
  "atan2",
  "pow"
]
;(function(){
  for(var i=0; i<math_comm.length; ++i) {
    var f= math_comm[i]
    exports[f] = makeOp({
                  args:["array", "array", "array"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b","c"], body:"a=this_f(b,c)", thisVars:["this_f"]},
                  funcName: f
                })
    exports[f+"s"] = makeOp({
                  args:["array", "array", "scalar"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b","c"], body:"a=this_f(b,c)", thisVars:["this_f"]},
                  funcName: f+"s"
                  })
    exports[f+"eq"] = makeOp({ args:["array", "array"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b"], body:"a=this_f(a,b)", thisVars:["this_f"]},
                  rvalue: true,
                  count: 2,
                  funcName: f+"eq"
                  })
    exports[f+"seq"] = makeOp({ args:["array", "scalar"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b"], body:"a=this_f(a,b)", thisVars:["this_f"]},
                  rvalue:true,
                  count:2,
                  funcName: f+"seq"
                  })
  }
})();

var math_noncomm = [
  "atan2",
  "pow"
]
;(function(){
  for(var i=0; i<math_noncomm.length; ++i) {
    var f= math_noncomm[i]
    exports[f+"op"] = makeOp({
                  args:["array", "array", "array"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b","c"], body:"a=this_f(c,b)", thisVars:["this_f"]},
                  funcName: f+"op"
                })
    exports[f+"ops"] = makeOp({
                  args:["array", "array", "scalar"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b","c"], body:"a=this_f(c,b)", thisVars:["this_f"]},
                  funcName: f+"ops"
                  })
    exports[f+"opeq"] = makeOp({ args:["array", "array"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b"], body:"a=this_f(b,a)", thisVars:["this_f"]},
                  rvalue: true,
                  count: 2,
                  funcName: f+"opeq"
                  })
    exports[f+"opseq"] = makeOp({ args:["array", "scalar"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b"], body:"a=this_f(b,a)", thisVars:["this_f"]},
                  rvalue:true,
                  count:2,
                  funcName: f+"opseq"
                  })
  }
})();

exports.any = compile({
  args:["array"],
  pre: EmptyProc,
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:1}], body: "if(a){return true}", localVars: [], thisVars: []},
  post: {args:[], localVars:[], thisVars:[], body:"return false"},
  funcName: "any"
})

exports.all = compile({
  args:["array"],
  pre: EmptyProc,
  body: {args:[{name:"x", lvalue:false, rvalue:true, count:1}], body: "if(!x){return false}", localVars: [], thisVars: []},
  post: {args:[], localVars:[], thisVars:[], body:"return true"},
  funcName: "all"
})

exports.sum = compile({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:1}], body: "this_s+=a", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
  funcName: "sum"
})

exports.prod = compile({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=1"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:1}], body: "this_s*=a", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
  funcName: "prod"
})

exports.norm2squared = compile({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:2}], body: "this_s+=a*a", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
  funcName: "norm2squared"
})
  
exports.norm2 = compile({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:2}], body: "this_s+=a*a", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return Math.sqrt(this_s)"},
  funcName: "norm2"
})
  

exports.norminf = compile({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:4}], body:"if(-a>this_s){this_s=-a}else if(a>this_s){this_s=a}", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
  funcName: "norminf"
})

exports.norm1 = compile({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:3}], body: "this_s+=a<0?-a:a", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
  funcName: "norm1"
})

exports.sup = compile({
  args: [ "array" ],
  pre:
   { body: "this_h=-Infinity",
     args: [],
     thisVars: [ "this_h" ],
     localVars: [] },
  body:
   { body: "if(_inline_1_arg0_>this_h)this_h=_inline_1_arg0_",
     args: [{"name":"_inline_1_arg0_","lvalue":false,"rvalue":true,"count":2} ],
     thisVars: [ "this_h" ],
     localVars: [] },
  post:
   { body: "return this_h",
     args: [],
     thisVars: [ "this_h" ],
     localVars: [] }
 })

exports.inf = compile({
  args: [ "array" ],
  pre:
   { body: "this_h=Infinity",
     args: [],
     thisVars: [ "this_h" ],
     localVars: [] },
  body:
   { body: "if(_inline_1_arg0_<this_h)this_h=_inline_1_arg0_",
     args: [{"name":"_inline_1_arg0_","lvalue":false,"rvalue":true,"count":2} ],
     thisVars: [ "this_h" ],
     localVars: [] },
  post:
   { body: "return this_h",
     args: [],
     thisVars: [ "this_h" ],
     localVars: [] }
 })

exports.argmin = compile({
  args:["index","array","shape"],
  pre:{
    body:"{this_v=Infinity;this_i=_inline_0_arg2_.slice(0)}",
    args:[
      {name:"_inline_0_arg0_",lvalue:false,rvalue:false,count:0},
      {name:"_inline_0_arg1_",lvalue:false,rvalue:false,count:0},
      {name:"_inline_0_arg2_",lvalue:false,rvalue:true,count:1}
      ],
    thisVars:["this_i","this_v"],
    localVars:[]},
  body:{
    body:"{if(_inline_1_arg1_<this_v){this_v=_inline_1_arg1_;for(var _inline_1_k=0;_inline_1_k<_inline_1_arg0_.length;++_inline_1_k){this_i[_inline_1_k]=_inline_1_arg0_[_inline_1_k]}}}",
    args:[
      {name:"_inline_1_arg0_",lvalue:false,rvalue:true,count:2},
      {name:"_inline_1_arg1_",lvalue:false,rvalue:true,count:2}],
    thisVars:["this_i","this_v"],
    localVars:["_inline_1_k"]},
  post:{
    body:"{return this_i}",
    args:[],
    thisVars:["this_i"],
    localVars:[]}
})

exports.argmax = compile({
  args:["index","array","shape"],
  pre:{
    body:"{this_v=-Infinity;this_i=_inline_0_arg2_.slice(0)}",
    args:[
      {name:"_inline_0_arg0_",lvalue:false,rvalue:false,count:0},
      {name:"_inline_0_arg1_",lvalue:false,rvalue:false,count:0},
      {name:"_inline_0_arg2_",lvalue:false,rvalue:true,count:1}
      ],
    thisVars:["this_i","this_v"],
    localVars:[]},
  body:{
    body:"{if(_inline_1_arg1_>this_v){this_v=_inline_1_arg1_;for(var _inline_1_k=0;_inline_1_k<_inline_1_arg0_.length;++_inline_1_k){this_i[_inline_1_k]=_inline_1_arg0_[_inline_1_k]}}}",
    args:[
      {name:"_inline_1_arg0_",lvalue:false,rvalue:true,count:2},
      {name:"_inline_1_arg1_",lvalue:false,rvalue:true,count:2}],
    thisVars:["this_i","this_v"],
    localVars:["_inline_1_k"]},
  post:{
    body:"{return this_i}",
    args:[],
    thisVars:["this_i"],
    localVars:[]}
})  

exports.random = makeOp({
  args: ["array"],
  pre: {args:[], body:"this_f=Math.random", thisVars:["this_f"]},
  body: {args: ["a"], body:"a=this_f()", thisVars:["this_f"]},
  funcName: "random"
})

exports.assign = makeOp({
  args:["array", "array"],
  body: {args:["a", "b"], body:"a=b"},
  funcName: "assign" })

exports.assigns = makeOp({
  args:["array", "scalar"],
  body: {args:["a", "b"], body:"a=b"},
  funcName: "assigns" })


exports.equals = compile({
  args:["array", "array"],
  pre: EmptyProc,
  body: {args:[{name:"x", lvalue:false, rvalue:true, count:1},
               {name:"y", lvalue:false, rvalue:true, count:1}], 
        body: "if(x!==y){return false}", 
        localVars: [], 
        thisVars: []},
  post: {args:[], localVars:[], thisVars:[], body:"return true"},
  funcName: "equals"
})



},{"cwise-compiler":94}],186:[function(require,module,exports){
"use strict"

var ndarray = require("ndarray")
var do_convert = require("./doConvert.js")

module.exports = function convert(arr, result) {
  var shape = [], c = arr, sz = 1
  while(Array.isArray(c)) {
    shape.push(c.length)
    sz *= c.length
    c = c[0]
  }
  if(shape.length === 0) {
    return ndarray()
  }
  if(!result) {
    result = ndarray(new Float64Array(sz), shape)
  }
  do_convert(result, arr)
  return result
}

},{"./doConvert.js":187,"ndarray":188}],187:[function(require,module,exports){
module.exports=require('cwise-compiler')({"args":["array","scalar","index"],"pre":{"body":"{}","args":[],"thisVars":[],"localVars":[]},"body":{"body":"{\nvar _inline_1_v=_inline_1_arg1_,_inline_1_i\nfor(_inline_1_i=0;_inline_1_i<_inline_1_arg2_.length-1;++_inline_1_i) {\n_inline_1_v=_inline_1_v[_inline_1_arg2_[_inline_1_i]]\n}\n_inline_1_arg0_=_inline_1_v[_inline_1_arg2_[_inline_1_arg2_.length-1]]\n}","args":[{"name":"_inline_1_arg0_","lvalue":true,"rvalue":false,"count":1},{"name":"_inline_1_arg1_","lvalue":false,"rvalue":true,"count":1},{"name":"_inline_1_arg2_","lvalue":false,"rvalue":true,"count":4}],"thisVars":[],"localVars":["_inline_1_i","_inline_1_v"]},"post":{"body":"{}","args":[],"thisVars":[],"localVars":[]},"funcName":"convert","blockSize":64})

},{"cwise-compiler":94}],188:[function(require,module,exports){
var iota = require("iota-array")
var isBuffer = require("is-buffer")

var hasTypedArrays  = ((typeof Float64Array) !== "undefined")

function compare1st(a, b) {
  return a[0] - b[0]
}

function order() {
  var stride = this.stride
  var terms = new Array(stride.length)
  var i
  for(i=0; i<terms.length; ++i) {
    terms[i] = [Math.abs(stride[i]), i]
  }
  terms.sort(compare1st)
  var result = new Array(terms.length)
  for(i=0; i<result.length; ++i) {
    result[i] = terms[i][1]
  }
  return result
}

function compileConstructor(dtype, dimension) {
  var className = ["View", dimension, "d", dtype].join("")
  if(dimension < 0) {
    className = "View_Nil" + dtype
  }
  var useGetters = (dtype === "generic")

  if(dimension === -1) {
    //Special case for trivial arrays
    var code =
      "function "+className+"(a){this.data=a;};\
var proto="+className+".prototype;\
proto.dtype='"+dtype+"';\
proto.index=function(){return -1};\
proto.size=0;\
proto.dimension=-1;\
proto.shape=proto.stride=proto.order=[];\
proto.lo=proto.hi=proto.transpose=proto.step=\
function(){return new "+className+"(this.data);};\
proto.get=proto.set=function(){};\
proto.pick=function(){return null};\
return function construct_"+className+"(a){return new "+className+"(a);}"
    var procedure = new Function(code)
    return procedure()
  } else if(dimension === 0) {
    //Special case for 0d arrays
    var code =
      "function "+className+"(a,d) {\
this.data = a;\
this.offset = d\
};\
var proto="+className+".prototype;\
proto.dtype='"+dtype+"';\
proto.index=function(){return this.offset};\
proto.dimension=0;\
proto.size=1;\
proto.shape=\
proto.stride=\
proto.order=[];\
proto.lo=\
proto.hi=\
proto.transpose=\
proto.step=function "+className+"_copy() {\
return new "+className+"(this.data,this.offset)\
};\
proto.pick=function "+className+"_pick(){\
return TrivialArray(this.data);\
};\
proto.valueOf=proto.get=function "+className+"_get(){\
return "+(useGetters ? "this.data.get(this.offset)" : "this.data[this.offset]")+
"};\
proto.set=function "+className+"_set(v){\
return "+(useGetters ? "this.data.set(this.offset,v)" : "this.data[this.offset]=v")+"\
};\
return function construct_"+className+"(a,b,c,d){return new "+className+"(a,d)}"
    var procedure = new Function("TrivialArray", code)
    return procedure(CACHED_CONSTRUCTORS[dtype][0])
  }

  var code = ["'use strict'"]

  //Create constructor for view
  var indices = iota(dimension)
  var args = indices.map(function(i) { return "i"+i })
  var index_str = "this.offset+" + indices.map(function(i) {
        return "this.stride[" + i + "]*i" + i
      }).join("+")
  var shapeArg = indices.map(function(i) {
      return "b"+i
    }).join(",")
  var strideArg = indices.map(function(i) {
      return "c"+i
    }).join(",")
  code.push(
    "function "+className+"(a," + shapeArg + "," + strideArg + ",d){this.data=a",
      "this.shape=[" + shapeArg + "]",
      "this.stride=[" + strideArg + "]",
      "this.offset=d|0}",
    "var proto="+className+".prototype",
    "proto.dtype='"+dtype+"'",
    "proto.dimension="+dimension)

  //view.size:
  code.push("Object.defineProperty(proto,'size',{get:function "+className+"_size(){\
return "+indices.map(function(i) { return "this.shape["+i+"]" }).join("*"),
"}})")

  //view.order:
  if(dimension === 1) {
    code.push("proto.order=[0]")
  } else {
    code.push("Object.defineProperty(proto,'order',{get:")
    if(dimension < 4) {
      code.push("function "+className+"_order(){")
      if(dimension === 2) {
        code.push("return (Math.abs(this.stride[0])>Math.abs(this.stride[1]))?[1,0]:[0,1]}})")
      } else if(dimension === 3) {
        code.push(
"var s0=Math.abs(this.stride[0]),s1=Math.abs(this.stride[1]),s2=Math.abs(this.stride[2]);\
if(s0>s1){\
if(s1>s2){\
return [2,1,0];\
}else if(s0>s2){\
return [1,2,0];\
}else{\
return [1,0,2];\
}\
}else if(s0>s2){\
return [2,0,1];\
}else if(s2>s1){\
return [0,1,2];\
}else{\
return [0,2,1];\
}}})")
      }
    } else {
      code.push("ORDER})")
    }
  }

  //view.set(i0, ..., v):
  code.push(
"proto.set=function "+className+"_set("+args.join(",")+",v){")
  if(useGetters) {
    code.push("return this.data.set("+index_str+",v)}")
  } else {
    code.push("return this.data["+index_str+"]=v}")
  }

  //view.get(i0, ...):
  code.push("proto.get=function "+className+"_get("+args.join(",")+"){")
  if(useGetters) {
    code.push("return this.data.get("+index_str+")}")
  } else {
    code.push("return this.data["+index_str+"]}")
  }

  //view.index:
  code.push(
    "proto.index=function "+className+"_index(", args.join(), "){return "+index_str+"}")

  //view.hi():
  code.push("proto.hi=function "+className+"_hi("+args.join(",")+"){return new "+className+"(this.data,"+
    indices.map(function(i) {
      return ["(typeof i",i,"!=='number'||i",i,"<0)?this.shape[", i, "]:i", i,"|0"].join("")
    }).join(",")+","+
    indices.map(function(i) {
      return "this.stride["+i + "]"
    }).join(",")+",this.offset)}")

  //view.lo():
  var a_vars = indices.map(function(i) { return "a"+i+"=this.shape["+i+"]" })
  var c_vars = indices.map(function(i) { return "c"+i+"=this.stride["+i+"]" })
  code.push("proto.lo=function "+className+"_lo("+args.join(",")+"){var b=this.offset,d=0,"+a_vars.join(",")+","+c_vars.join(","))
  for(var i=0; i<dimension; ++i) {
    code.push(
"if(typeof i"+i+"==='number'&&i"+i+">=0){\
d=i"+i+"|0;\
b+=c"+i+"*d;\
a"+i+"-=d}")
  }
  code.push("return new "+className+"(this.data,"+
    indices.map(function(i) {
      return "a"+i
    }).join(",")+","+
    indices.map(function(i) {
      return "c"+i
    }).join(",")+",b)}")

  //view.step():
  code.push("proto.step=function "+className+"_step("+args.join(",")+"){var "+
    indices.map(function(i) {
      return "a"+i+"=this.shape["+i+"]"
    }).join(",")+","+
    indices.map(function(i) {
      return "b"+i+"=this.stride["+i+"]"
    }).join(",")+",c=this.offset,d=0,ceil=Math.ceil")
  for(var i=0; i<dimension; ++i) {
    code.push(
"if(typeof i"+i+"==='number'){\
d=i"+i+"|0;\
if(d<0){\
c+=b"+i+"*(a"+i+"-1);\
a"+i+"=ceil(-a"+i+"/d)\
}else{\
a"+i+"=ceil(a"+i+"/d)\
}\
b"+i+"*=d\
}")
  }
  code.push("return new "+className+"(this.data,"+
    indices.map(function(i) {
      return "a" + i
    }).join(",")+","+
    indices.map(function(i) {
      return "b" + i
    }).join(",")+",c)}")

  //view.transpose():
  var tShape = new Array(dimension)
  var tStride = new Array(dimension)
  for(var i=0; i<dimension; ++i) {
    tShape[i] = "a[i"+i+"]"
    tStride[i] = "b[i"+i+"]"
  }
  code.push("proto.transpose=function "+className+"_transpose("+args+"){"+
    args.map(function(n,idx) { return n + "=(" + n + "===undefined?" + idx + ":" + n + "|0)"}).join(";"),
    "var a=this.shape,b=this.stride;return new "+className+"(this.data,"+tShape.join(",")+","+tStride.join(",")+",this.offset)}")

  //view.pick():
  code.push("proto.pick=function "+className+"_pick("+args+"){var a=[],b=[],c=this.offset")
  for(var i=0; i<dimension; ++i) {
    code.push("if(typeof i"+i+"==='number'&&i"+i+">=0){c=(c+this.stride["+i+"]*i"+i+")|0}else{a.push(this.shape["+i+"]);b.push(this.stride["+i+"])}")
  }
  code.push("var ctor=CTOR_LIST[a.length+1];return ctor(this.data,a,b,c)}")

  //Add return statement
  code.push("return function construct_"+className+"(data,shape,stride,offset){return new "+className+"(data,"+
    indices.map(function(i) {
      return "shape["+i+"]"
    }).join(",")+","+
    indices.map(function(i) {
      return "stride["+i+"]"
    }).join(",")+",offset)}")

  //Compile procedure
  var procedure = new Function("CTOR_LIST", "ORDER", code.join("\n"))
  return procedure(CACHED_CONSTRUCTORS[dtype], order)
}

function arrayDType(data) {
  if(isBuffer(data)) {
    return "buffer"
  }
  if(hasTypedArrays) {
    switch(Object.prototype.toString.call(data)) {
      case "[object Float64Array]":
        return "float64"
      case "[object Float32Array]":
        return "float32"
      case "[object Int8Array]":
        return "int8"
      case "[object Int16Array]":
        return "int16"
      case "[object Int32Array]":
        return "int32"
      case "[object Uint8Array]":
        return "uint8"
      case "[object Uint16Array]":
        return "uint16"
      case "[object Uint32Array]":
        return "uint32"
      case "[object Uint8ClampedArray]":
        return "uint8_clamped"
      case "[object BigInt64Array]":
        return "bigint64"
      case "[object BigUint64Array]":
        return "biguint64"
    }
  }
  if(Array.isArray(data)) {
    return "array"
  }
  return "generic"
}

var CACHED_CONSTRUCTORS = {
  "float32":[],
  "float64":[],
  "int8":[],
  "int16":[],
  "int32":[],
  "uint8":[],
  "uint16":[],
  "uint32":[],
  "array":[],
  "uint8_clamped":[],
  "bigint64": [],
  "biguint64": [],
  "buffer":[],
  "generic":[]
}

;(function() {
  for(var id in CACHED_CONSTRUCTORS) {
    CACHED_CONSTRUCTORS[id].push(compileConstructor(id, -1))
  }
});

function wrappedNDArrayCtor(data, shape, stride, offset) {
  if(data === undefined) {
    var ctor = CACHED_CONSTRUCTORS.array[0]
    return ctor([])
  } else if(typeof data === "number") {
    data = [data]
  }
  if(shape === undefined) {
    shape = [ data.length ]
  }
  var d = shape.length
  if(stride === undefined) {
    stride = new Array(d)
    for(var i=d-1, sz=1; i>=0; --i) {
      stride[i] = sz
      sz *= shape[i]
    }
  }
  if(offset === undefined) {
    offset = 0
    for(var i=0; i<d; ++i) {
      if(stride[i] < 0) {
        offset -= (shape[i]-1)*stride[i]
      }
    }
  }
  var dtype = arrayDType(data)
  var ctor_list = CACHED_CONSTRUCTORS[dtype]
  while(ctor_list.length <= d+1) {
    ctor_list.push(compileConstructor(dtype, ctor_list.length-1))
  }
  var ctor = ctor_list[d+1]
  return ctor(data, shape, stride, offset)
}

module.exports = wrappedNDArrayCtor

},{"iota-array":181,"is-buffer":182}],189:[function(require,module,exports){
// (c) Dean McNamee <dean@gmail.com>, 2013.
//
// https://github.com/deanm/omggif
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.
//
// omggif is a JavaScript implementation of a GIF 89a encoder and decoder,
// including animation and compression.  It does not rely on any specific
// underlying system, so should run in the browser, Node, or Plask.

"use strict";

function GifWriter(buf, width, height, gopts) {
  var p = 0;

  var gopts = gopts === undefined ? { } : gopts;
  var loop_count = gopts.loop === undefined ? null : gopts.loop;
  var global_palette = gopts.palette === undefined ? null : gopts.palette;

  if (width <= 0 || height <= 0 || width > 65535 || height > 65535)
    throw new Error("Width/Height invalid.");

  function check_palette_and_num_colors(palette) {
    var num_colors = palette.length;
    if (num_colors < 2 || num_colors > 256 ||  num_colors & (num_colors-1)) {
      throw new Error(
          "Invalid code/color length, must be power of 2 and 2 .. 256.");
    }
    return num_colors;
  }

  // - Header.
  buf[p++] = 0x47; buf[p++] = 0x49; buf[p++] = 0x46;  // GIF
  buf[p++] = 0x38; buf[p++] = 0x39; buf[p++] = 0x61;  // 89a

  // Handling of Global Color Table (palette) and background index.
  var gp_num_colors_pow2 = 0;
  var background = 0;
  if (global_palette !== null) {
    var gp_num_colors = check_palette_and_num_colors(global_palette);
    while (gp_num_colors >>= 1) ++gp_num_colors_pow2;
    gp_num_colors = 1 << gp_num_colors_pow2;
    --gp_num_colors_pow2;
    if (gopts.background !== undefined) {
      background = gopts.background;
      if (background >= gp_num_colors)
        throw new Error("Background index out of range.");
      // The GIF spec states that a background index of 0 should be ignored, so
      // this is probably a mistake and you really want to set it to another
      // slot in the palette.  But actually in the end most browsers, etc end
      // up ignoring this almost completely (including for dispose background).
      if (background === 0)
        throw new Error("Background index explicitly passed as 0.");
    }
  }

  // - Logical Screen Descriptor.
  // NOTE(deanm): w/h apparently ignored by implementations, but set anyway.
  buf[p++] = width & 0xff; buf[p++] = width >> 8 & 0xff;
  buf[p++] = height & 0xff; buf[p++] = height >> 8 & 0xff;
  // NOTE: Indicates 0-bpp original color resolution (unused?).
  buf[p++] = (global_palette !== null ? 0x80 : 0) |  // Global Color Table Flag.
             gp_num_colors_pow2;  // NOTE: No sort flag (unused?).
  buf[p++] = background;  // Background Color Index.
  buf[p++] = 0;  // Pixel aspect ratio (unused?).

  // - Global Color Table
  if (global_palette !== null) {
    for (var i = 0, il = global_palette.length; i < il; ++i) {
      var rgb = global_palette[i];
      buf[p++] = rgb >> 16 & 0xff;
      buf[p++] = rgb >> 8 & 0xff;
      buf[p++] = rgb & 0xff;
    }
  }

  if (loop_count !== null) {  // Netscape block for looping.
    if (loop_count < 0 || loop_count > 65535)
      throw new Error("Loop count invalid.")
    // Extension code, label, and length.
    buf[p++] = 0x21; buf[p++] = 0xff; buf[p++] = 0x0b;
    // NETSCAPE2.0
    buf[p++] = 0x4e; buf[p++] = 0x45; buf[p++] = 0x54; buf[p++] = 0x53;
    buf[p++] = 0x43; buf[p++] = 0x41; buf[p++] = 0x50; buf[p++] = 0x45;
    buf[p++] = 0x32; buf[p++] = 0x2e; buf[p++] = 0x30;
    // Sub-block
    buf[p++] = 0x03; buf[p++] = 0x01;
    buf[p++] = loop_count & 0xff; buf[p++] = loop_count >> 8 & 0xff;
    buf[p++] = 0x00;  // Terminator.
  }


  var ended = false;

  this.addFrame = function(x, y, w, h, indexed_pixels, opts) {
    if (ended === true) { --p; ended = false; }  // Un-end.

    opts = opts === undefined ? { } : opts;

    // TODO(deanm): Bounds check x, y.  Do they need to be within the virtual
    // canvas width/height, I imagine?
    if (x < 0 || y < 0 || x > 65535 || y > 65535)
      throw new Error("x/y invalid.")

    if (w <= 0 || h <= 0 || w > 65535 || h > 65535)
      throw new Error("Width/Height invalid.")

    if (indexed_pixels.length < w * h)
      throw new Error("Not enough pixels for the frame size.");

    var using_local_palette = true;
    var palette = opts.palette;
    if (palette === undefined || palette === null) {
      using_local_palette = false;
      palette = global_palette;
    }

    if (palette === undefined || palette === null)
      throw new Error("Must supply either a local or global palette.");

    var num_colors = check_palette_and_num_colors(palette);

    // Compute the min_code_size (power of 2), destroying num_colors.
    var min_code_size = 0;
    while (num_colors >>= 1) ++min_code_size;
    num_colors = 1 << min_code_size;  // Now we can easily get it back.

    var delay = opts.delay === undefined ? 0 : opts.delay;

    // From the spec:
    //     0 -   No disposal specified. The decoder is
    //           not required to take any action.
    //     1 -   Do not dispose. The graphic is to be left
    //           in place.
    //     2 -   Restore to background color. The area used by the
    //           graphic must be restored to the background color.
    //     3 -   Restore to previous. The decoder is required to
    //           restore the area overwritten by the graphic with
    //           what was there prior to rendering the graphic.
    //  4-7 -    To be defined.
    // NOTE(deanm): Dispose background doesn't really work, apparently most
    // browsers ignore the background palette index and clear to transparency.
    var disposal = opts.disposal === undefined ? 0 : opts.disposal;
    if (disposal < 0 || disposal > 3)  // 4-7 is reserved.
      throw new Error("Disposal out of range.");

    var use_transparency = false;
    var transparent_index = 0;
    if (opts.transparent !== undefined && opts.transparent !== null) {
      use_transparency = true;
      transparent_index = opts.transparent;
      if (transparent_index < 0 || transparent_index >= num_colors)
        throw new Error("Transparent color index.");
    }

    if (disposal !== 0 || use_transparency || delay !== 0) {
      // - Graphics Control Extension
      buf[p++] = 0x21; buf[p++] = 0xf9;  // Extension / Label.
      buf[p++] = 4;  // Byte size.

      buf[p++] = disposal << 2 | (use_transparency === true ? 1 : 0);
      buf[p++] = delay & 0xff; buf[p++] = delay >> 8 & 0xff;
      buf[p++] = transparent_index;  // Transparent color index.
      buf[p++] = 0;  // Block Terminator.
    }

    // - Image Descriptor
    buf[p++] = 0x2c;  // Image Seperator.
    buf[p++] = x & 0xff; buf[p++] = x >> 8 & 0xff;  // Left.
    buf[p++] = y & 0xff; buf[p++] = y >> 8 & 0xff;  // Top.
    buf[p++] = w & 0xff; buf[p++] = w >> 8 & 0xff;
    buf[p++] = h & 0xff; buf[p++] = h >> 8 & 0xff;
    // NOTE: No sort flag (unused?).
    // TODO(deanm): Support interlace.
    buf[p++] = using_local_palette === true ? (0x80 | (min_code_size-1)) : 0;

    // - Local Color Table
    if (using_local_palette === true) {
      for (var i = 0, il = palette.length; i < il; ++i) {
        var rgb = palette[i];
        buf[p++] = rgb >> 16 & 0xff;
        buf[p++] = rgb >> 8 & 0xff;
        buf[p++] = rgb & 0xff;
      }
    }

    p = GifWriterOutputLZWCodeStream(
            buf, p, min_code_size < 2 ? 2 : min_code_size, indexed_pixels);

    return p;
  };

  this.end = function() {
    if (ended === false) {
      buf[p++] = 0x3b;  // Trailer.
      ended = true;
    }
    return p;
  };

  this.getOutputBuffer = function() { return buf; };
  this.setOutputBuffer = function(v) { buf = v; };
  this.getOutputBufferPosition = function() { return p; };
  this.setOutputBufferPosition = function(v) { p = v; };
}

// Main compression routine, palette indexes -> LZW code stream.
// |index_stream| must have at least one entry.
function GifWriterOutputLZWCodeStream(buf, p, min_code_size, index_stream) {
  buf[p++] = min_code_size;
  var cur_subblock = p++;  // Pointing at the length field.

  var clear_code = 1 << min_code_size;
  var code_mask = clear_code - 1;
  var eoi_code = clear_code + 1;
  var next_code = eoi_code + 1;

  var cur_code_size = min_code_size + 1;  // Number of bits per code.
  var cur_shift = 0;
  // We have at most 12-bit codes, so we should have to hold a max of 19
  // bits here (and then we would write out).
  var cur = 0;

  function emit_bytes_to_buffer(bit_block_size) {
    while (cur_shift >= bit_block_size) {
      buf[p++] = cur & 0xff;
      cur >>= 8; cur_shift -= 8;
      if (p === cur_subblock + 256) {  // Finished a subblock.
        buf[cur_subblock] = 255;
        cur_subblock = p++;
      }
    }
  }

  function emit_code(c) {
    cur |= c << cur_shift;
    cur_shift += cur_code_size;
    emit_bytes_to_buffer(8);
  }

  // I am not an expert on the topic, and I don't want to write a thesis.
  // However, it is good to outline here the basic algorithm and the few data
  // structures and optimizations here that make this implementation fast.
  // The basic idea behind LZW is to build a table of previously seen runs
  // addressed by a short id (herein called output code).  All data is
  // referenced by a code, which represents one or more values from the
  // original input stream.  All input bytes can be referenced as the same
  // value as an output code.  So if you didn't want any compression, you
  // could more or less just output the original bytes as codes (there are
  // some details to this, but it is the idea).  In order to achieve
  // compression, values greater then the input range (codes can be up to
  // 12-bit while input only 8-bit) represent a sequence of previously seen
  // inputs.  The decompressor is able to build the same mapping while
  // decoding, so there is always a shared common knowledge between the
  // encoding and decoder, which is also important for "timing" aspects like
  // how to handle variable bit width code encoding.
  //
  // One obvious but very important consequence of the table system is there
  // is always a unique id (at most 12-bits) to map the runs.  'A' might be
  // 4, then 'AA' might be 10, 'AAA' 11, 'AAAA' 12, etc.  This relationship
  // can be used for an effecient lookup strategy for the code mapping.  We
  // need to know if a run has been seen before, and be able to map that run
  // to the output code.  Since we start with known unique ids (input bytes),
  // and then from those build more unique ids (table entries), we can
  // continue this chain (almost like a linked list) to always have small
  // integer values that represent the current byte chains in the encoder.
  // This means instead of tracking the input bytes (AAAABCD) to know our
  // current state, we can track the table entry for AAAABC (it is guaranteed
  // to exist by the nature of the algorithm) and the next character D.
  // Therefor the tuple of (table_entry, byte) is guaranteed to also be
  // unique.  This allows us to create a simple lookup key for mapping input
  // sequences to codes (table indices) without having to store or search
  // any of the code sequences.  So if 'AAAA' has a table entry of 12, the
  // tuple of ('AAAA', K) for any input byte K will be unique, and can be our
  // key.  This leads to a integer value at most 20-bits, which can always
  // fit in an SMI value and be used as a fast sparse array / object key.

  // Output code for the current contents of the index buffer.
  var ib_code = index_stream[0] & code_mask;  // Load first input index.
  var code_table = { };  // Key'd on our 20-bit "tuple".

  emit_code(clear_code);  // Spec says first code should be a clear code.

  // First index already loaded, process the rest of the stream.
  for (var i = 1, il = index_stream.length; i < il; ++i) {
    var k = index_stream[i] & code_mask;
    var cur_key = ib_code << 8 | k;  // (prev, k) unique tuple.
    var cur_code = code_table[cur_key];  // buffer + k.

    // Check if we have to create a new code table entry.
    if (cur_code === undefined) {  // We don't have buffer + k.
      // Emit index buffer (without k).
      // This is an inline version of emit_code, because this is the core
      // writing routine of the compressor (and V8 cannot inline emit_code
      // because it is a closure here in a different context).  Additionally
      // we can call emit_byte_to_buffer less often, because we can have
      // 30-bits (from our 31-bit signed SMI), and we know our codes will only
      // be 12-bits, so can safely have 18-bits there without overflow.
      // emit_code(ib_code);
      cur |= ib_code << cur_shift;
      cur_shift += cur_code_size;
      while (cur_shift >= 8) {
        buf[p++] = cur & 0xff;
        cur >>= 8; cur_shift -= 8;
        if (p === cur_subblock + 256) {  // Finished a subblock.
          buf[cur_subblock] = 255;
          cur_subblock = p++;
        }
      }

      if (next_code === 4096) {  // Table full, need a clear.
        emit_code(clear_code);
        next_code = eoi_code + 1;
        cur_code_size = min_code_size + 1;
        code_table = { };
      } else {  // Table not full, insert a new entry.
        // Increase our variable bit code sizes if necessary.  This is a bit
        // tricky as it is based on "timing" between the encoding and
        // decoder.  From the encoders perspective this should happen after
        // we've already emitted the index buffer and are about to create the
        // first table entry that would overflow our current code bit size.
        if (next_code >= (1 << cur_code_size)) ++cur_code_size;
        code_table[cur_key] = next_code++;  // Insert into code table.
      }

      ib_code = k;  // Index buffer to single input k.
    } else {
      ib_code = cur_code;  // Index buffer to sequence in code table.
    }
  }

  emit_code(ib_code);  // There will still be something in the index buffer.
  emit_code(eoi_code);  // End Of Information.

  // Flush / finalize the sub-blocks stream to the buffer.
  emit_bytes_to_buffer(1);

  // Finish the sub-blocks, writing out any unfinished lengths and
  // terminating with a sub-block of length 0.  If we have already started
  // but not yet used a sub-block it can just become the terminator.
  if (cur_subblock + 1 === p) {  // Started but unused.
    buf[cur_subblock] = 0;
  } else {  // Started and used, write length and additional terminator block.
    buf[cur_subblock] = p - cur_subblock - 1;
    buf[p++] = 0;
  }
  return p;
}

function GifReader(buf) {
  var p = 0;

  // - Header (GIF87a or GIF89a).
  if (buf[p++] !== 0x47 ||            buf[p++] !== 0x49 || buf[p++] !== 0x46 ||
      buf[p++] !== 0x38 || (buf[p++]+1 & 0xfd) !== 0x38 || buf[p++] !== 0x61) {
    throw new Error("Invalid GIF 87a/89a header.");
  }

  // - Logical Screen Descriptor.
  var width = buf[p++] | buf[p++] << 8;
  var height = buf[p++] | buf[p++] << 8;
  var pf0 = buf[p++];  // <Packed Fields>.
  var global_palette_flag = pf0 >> 7;
  var num_global_colors_pow2 = pf0 & 0x7;
  var num_global_colors = 1 << (num_global_colors_pow2 + 1);
  var background = buf[p++];
  buf[p++];  // Pixel aspect ratio (unused?).

  var global_palette_offset = null;
  var global_palette_size   = null;

  if (global_palette_flag) {
    global_palette_offset = p;
    global_palette_size = num_global_colors;
    p += num_global_colors * 3;  // Seek past palette.
  }

  var no_eof = true;

  var frames = [ ];

  var delay = 0;
  var transparent_index = null;
  var disposal = 0;  // 0 - No disposal specified.
  var loop_count = null;

  this.width = width;
  this.height = height;

  while (no_eof && p < buf.length) {
    switch (buf[p++]) {
      case 0x21:  // Graphics Control Extension Block
        switch (buf[p++]) {
          case 0xff:  // Application specific block
            // Try if it's a Netscape block (with animation loop counter).
            if (buf[p   ] !== 0x0b ||  // 21 FF already read, check block size.
                // NETSCAPE2.0
                buf[p+1 ] == 0x4e && buf[p+2 ] == 0x45 && buf[p+3 ] == 0x54 &&
                buf[p+4 ] == 0x53 && buf[p+5 ] == 0x43 && buf[p+6 ] == 0x41 &&
                buf[p+7 ] == 0x50 && buf[p+8 ] == 0x45 && buf[p+9 ] == 0x32 &&
                buf[p+10] == 0x2e && buf[p+11] == 0x30 &&
                // Sub-block
                buf[p+12] == 0x03 && buf[p+13] == 0x01 && buf[p+16] == 0) {
              p += 14;
              loop_count = buf[p++] | buf[p++] << 8;
              p++;  // Skip terminator.
            } else {  // We don't know what it is, just try to get past it.
              p += 12;
              while (true) {  // Seek through subblocks.
                var block_size = buf[p++];
                // Bad block size (ex: undefined from an out of bounds read).
                if (!(block_size >= 0)) throw Error("Invalid block size");
                if (block_size === 0) break;  // 0 size is terminator
                p += block_size;
              }
            }
            break;

          case 0xf9:  // Graphics Control Extension
            if (buf[p++] !== 0x4 || buf[p+4] !== 0)
              throw new Error("Invalid graphics extension block.");
            var pf1 = buf[p++];
            delay = buf[p++] | buf[p++] << 8;
            transparent_index = buf[p++];
            if ((pf1 & 1) === 0) transparent_index = null;
            disposal = pf1 >> 2 & 0x7;
            p++;  // Skip terminator.
            break;

          case 0xfe:  // Comment Extension.
            while (true) {  // Seek through subblocks.
              var block_size = buf[p++];
              // Bad block size (ex: undefined from an out of bounds read).
              if (!(block_size >= 0)) throw Error("Invalid block size");
              if (block_size === 0) break;  // 0 size is terminator
              // console.log(buf.slice(p, p+block_size).toString('ascii'));
              p += block_size;
            }
            break;

          default:
            throw new Error(
                "Unknown graphic control label: 0x" + buf[p-1].toString(16));
        }
        break;

      case 0x2c:  // Image Descriptor.
        var x = buf[p++] | buf[p++] << 8;
        var y = buf[p++] | buf[p++] << 8;
        var w = buf[p++] | buf[p++] << 8;
        var h = buf[p++] | buf[p++] << 8;
        var pf2 = buf[p++];
        var local_palette_flag = pf2 >> 7;
        var interlace_flag = pf2 >> 6 & 1;
        var num_local_colors_pow2 = pf2 & 0x7;
        var num_local_colors = 1 << (num_local_colors_pow2 + 1);
        var palette_offset = global_palette_offset;
        var palette_size = global_palette_size;
        var has_local_palette = false;
        if (local_palette_flag) {
          var has_local_palette = true;
          palette_offset = p;  // Override with local palette.
          palette_size = num_local_colors;
          p += num_local_colors * 3;  // Seek past palette.
        }

        var data_offset = p;

        p++;  // codesize
        while (true) {
          var block_size = buf[p++];
          // Bad block size (ex: undefined from an out of bounds read).
          if (!(block_size >= 0)) throw Error("Invalid block size");
          if (block_size === 0) break;  // 0 size is terminator
          p += block_size;
        }

        frames.push({x: x, y: y, width: w, height: h,
                     has_local_palette: has_local_palette,
                     palette_offset: palette_offset,
                     palette_size: palette_size,
                     data_offset: data_offset,
                     data_length: p - data_offset,
                     transparent_index: transparent_index,
                     interlaced: !!interlace_flag,
                     delay: delay,
                     disposal: disposal});
        break;

      case 0x3b:  // Trailer Marker (end of file).
        no_eof = false;
        break;

      default:
        throw new Error("Unknown gif block: 0x" + buf[p-1].toString(16));
        break;
    }
  }

  this.numFrames = function() {
    return frames.length;
  };

  this.loopCount = function() {
    return loop_count;
  };

  this.frameInfo = function(frame_num) {
    if (frame_num < 0 || frame_num >= frames.length)
      throw new Error("Frame index out of range.");
    return frames[frame_num];
  }

  this.decodeAndBlitFrameBGRA = function(frame_num, pixels) {
    var frame = this.frameInfo(frame_num);
    var num_pixels = frame.width * frame.height;
    var index_stream = new Uint8Array(num_pixels);  // At most 8-bit indices.
    GifReaderLZWOutputIndexStream(
        buf, frame.data_offset, index_stream, num_pixels);
    var palette_offset = frame.palette_offset;

    // NOTE(deanm): It seems to be much faster to compare index to 256 than
    // to === null.  Not sure why, but CompareStub_EQ_STRICT shows up high in
    // the profile, not sure if it's related to using a Uint8Array.
    var trans = frame.transparent_index;
    if (trans === null) trans = 256;

    // We are possibly just blitting to a portion of the entire frame.
    // That is a subrect within the framerect, so the additional pixels
    // must be skipped over after we finished a scanline.
    var framewidth  = frame.width;
    var framestride = width - framewidth;
    var xleft       = framewidth;  // Number of subrect pixels left in scanline.

    // Output indicies of the top left and bottom right corners of the subrect.
    var opbeg = ((frame.y * width) + frame.x) * 4;
    var opend = ((frame.y + frame.height) * width + frame.x) * 4;
    var op    = opbeg;

    var scanstride = framestride * 4;

    // Use scanstride to skip past the rows when interlacing.  This is skipping
    // 7 rows for the first two passes, then 3 then 1.
    if (frame.interlaced === true) {
      scanstride += width * 4 * 7;  // Pass 1.
    }

    var interlaceskip = 8;  // Tracking the row interval in the current pass.

    for (var i = 0, il = index_stream.length; i < il; ++i) {
      var index = index_stream[i];

      if (xleft === 0) {  // Beginning of new scan line
        op += scanstride;
        xleft = framewidth;
        if (op >= opend) { // Catch the wrap to switch passes when interlacing.
          scanstride = framestride * 4 + width * 4 * (interlaceskip-1);
          // interlaceskip / 2 * 4 is interlaceskip << 1.
          op = opbeg + (framewidth + framestride) * (interlaceskip << 1);
          interlaceskip >>= 1;
        }
      }

      if (index === trans) {
        op += 4;
      } else {
        var r = buf[palette_offset + index * 3];
        var g = buf[palette_offset + index * 3 + 1];
        var b = buf[palette_offset + index * 3 + 2];
        pixels[op++] = b;
        pixels[op++] = g;
        pixels[op++] = r;
        pixels[op++] = 255;
      }
      --xleft;
    }
  };

  // I will go to copy and paste hell one day...
  this.decodeAndBlitFrameRGBA = function(frame_num, pixels) {
    var frame = this.frameInfo(frame_num);
    var num_pixels = frame.width * frame.height;
    var index_stream = new Uint8Array(num_pixels);  // At most 8-bit indices.
    GifReaderLZWOutputIndexStream(
        buf, frame.data_offset, index_stream, num_pixels);
    var palette_offset = frame.palette_offset;

    // NOTE(deanm): It seems to be much faster to compare index to 256 than
    // to === null.  Not sure why, but CompareStub_EQ_STRICT shows up high in
    // the profile, not sure if it's related to using a Uint8Array.
    var trans = frame.transparent_index;
    if (trans === null) trans = 256;

    // We are possibly just blitting to a portion of the entire frame.
    // That is a subrect within the framerect, so the additional pixels
    // must be skipped over after we finished a scanline.
    var framewidth  = frame.width;
    var framestride = width - framewidth;
    var xleft       = framewidth;  // Number of subrect pixels left in scanline.

    // Output indicies of the top left and bottom right corners of the subrect.
    var opbeg = ((frame.y * width) + frame.x) * 4;
    var opend = ((frame.y + frame.height) * width + frame.x) * 4;
    var op    = opbeg;

    var scanstride = framestride * 4;

    // Use scanstride to skip past the rows when interlacing.  This is skipping
    // 7 rows for the first two passes, then 3 then 1.
    if (frame.interlaced === true) {
      scanstride += width * 4 * 7;  // Pass 1.
    }

    var interlaceskip = 8;  // Tracking the row interval in the current pass.

    for (var i = 0, il = index_stream.length; i < il; ++i) {
      var index = index_stream[i];

      if (xleft === 0) {  // Beginning of new scan line
        op += scanstride;
        xleft = framewidth;
        if (op >= opend) { // Catch the wrap to switch passes when interlacing.
          scanstride = framestride * 4 + width * 4 * (interlaceskip-1);
          // interlaceskip / 2 * 4 is interlaceskip << 1.
          op = opbeg + (framewidth + framestride) * (interlaceskip << 1);
          interlaceskip >>= 1;
        }
      }

      if (index === trans) {
        op += 4;
      } else {
        var r = buf[palette_offset + index * 3];
        var g = buf[palette_offset + index * 3 + 1];
        var b = buf[palette_offset + index * 3 + 2];
        pixels[op++] = r;
        pixels[op++] = g;
        pixels[op++] = b;
        pixels[op++] = 255;
      }
      --xleft;
    }
  };
}

function GifReaderLZWOutputIndexStream(code_stream, p, output, output_length) {
  var min_code_size = code_stream[p++];

  var clear_code = 1 << min_code_size;
  var eoi_code = clear_code + 1;
  var next_code = eoi_code + 1;

  var cur_code_size = min_code_size + 1;  // Number of bits per code.
  // NOTE: This shares the same name as the encoder, but has a different
  // meaning here.  Here this masks each code coming from the code stream.
  var code_mask = (1 << cur_code_size) - 1;
  var cur_shift = 0;
  var cur = 0;

  var op = 0;  // Output pointer.

  var subblock_size = code_stream[p++];

  // TODO(deanm): Would using a TypedArray be any faster?  At least it would
  // solve the fast mode / backing store uncertainty.
  // var code_table = Array(4096);
  var code_table = new Int32Array(4096);  // Can be signed, we only use 20 bits.

  var prev_code = null;  // Track code-1.

  while (true) {
    // Read up to two bytes, making sure we always 12-bits for max sized code.
    while (cur_shift < 16) {
      if (subblock_size === 0) break;  // No more data to be read.

      cur |= code_stream[p++] << cur_shift;
      cur_shift += 8;

      if (subblock_size === 1) {  // Never let it get to 0 to hold logic above.
        subblock_size = code_stream[p++];  // Next subblock.
      } else {
        --subblock_size;
      }
    }

    // TODO(deanm): We should never really get here, we should have received
    // and EOI.
    if (cur_shift < cur_code_size)
      break;

    var code = cur & code_mask;
    cur >>= cur_code_size;
    cur_shift -= cur_code_size;

    // TODO(deanm): Maybe should check that the first code was a clear code,
    // at least this is what you're supposed to do.  But actually our encoder
    // now doesn't emit a clear code first anyway.
    if (code === clear_code) {
      // We don't actually have to clear the table.  This could be a good idea
      // for greater error checking, but we don't really do any anyway.  We
      // will just track it with next_code and overwrite old entries.

      next_code = eoi_code + 1;
      cur_code_size = min_code_size + 1;
      code_mask = (1 << cur_code_size) - 1;

      // Don't update prev_code ?
      prev_code = null;
      continue;
    } else if (code === eoi_code) {
      break;
    }

    // We have a similar situation as the decoder, where we want to store
    // variable length entries (code table entries), but we want to do in a
    // faster manner than an array of arrays.  The code below stores sort of a
    // linked list within the code table, and then "chases" through it to
    // construct the dictionary entries.  When a new entry is created, just the
    // last byte is stored, and the rest (prefix) of the entry is only
    // referenced by its table entry.  Then the code chases through the
    // prefixes until it reaches a single byte code.  We have to chase twice,
    // first to compute the length, and then to actually copy the data to the
    // output (backwards, since we know the length).  The alternative would be
    // storing something in an intermediate stack, but that doesn't make any
    // more sense.  I implemented an approach where it also stored the length
    // in the code table, although it's a bit tricky because you run out of
    // bits (12 + 12 + 8), but I didn't measure much improvements (the table
    // entries are generally not the long).  Even when I created benchmarks for
    // very long table entries the complexity did not seem worth it.
    // The code table stores the prefix entry in 12 bits and then the suffix
    // byte in 8 bits, so each entry is 20 bits.

    var chase_code = code < next_code ? code : prev_code;

    // Chase what we will output, either {CODE} or {CODE-1}.
    var chase_length = 0;
    var chase = chase_code;
    while (chase > clear_code) {
      chase = code_table[chase] >> 8;
      ++chase_length;
    }

    var k = chase;

    var op_end = op + chase_length + (chase_code !== code ? 1 : 0);
    if (op_end > output_length) {
      console.log("Warning, gif stream longer than expected.");
      return;
    }

    // Already have the first byte from the chase, might as well write it fast.
    output[op++] = k;

    op += chase_length;
    var b = op;  // Track pointer, writing backwards.

    if (chase_code !== code)  // The case of emitting {CODE-1} + k.
      output[op++] = k;

    chase = chase_code;
    while (chase_length--) {
      chase = code_table[chase];
      output[--b] = chase & 0xff;  // Write backwards.
      chase >>= 8;  // Pull down to the prefix code.
    }

    if (prev_code !== null && next_code < 4096) {
      code_table[next_code++] = prev_code << 8 | k;
      // TODO(deanm): Figure out this clearing vs code growth logic better.  I
      // have an feeling that it should just happen somewhere else, for now it
      // is awkward between when we grow past the max and then hit a clear code.
      // For now just check if we hit the max 12-bits (then a clear code should
      // follow, also of course encoded in 12-bits).
      if (next_code >= code_mask+1 && cur_code_size < 12) {
        ++cur_code_size;
        code_mask = code_mask << 1 | 1;
      }
    }

    prev_code = code;
  }

  if (op !== output_length) {
    console.log("Warning, gif stream shorter than expected.");
  }

  return output;
}

// CommonJS.
try { exports.GifWriter = GifWriter; exports.GifReader = GifReader } catch(e) {}

},{}],190:[function(require,module,exports){
(function (process,Buffer){
/*! osc.js 2.4.1, Copyright 2021 Colin Clark | github.com/colinbdclark/osc.js */

/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * Copyright 2014-2016, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/* global require, module, process, Buffer, Long, util */

var osc = osc || {};

(function () {

    "use strict";

    osc.SECS_70YRS = 2208988800;
    osc.TWO_32 = 4294967296;

    osc.defaults = {
        metadata: false,
        unpackSingleArgs: true
    };

    // Unsupported, non-API property.
    osc.isCommonJS = typeof module !== "undefined" && module.exports ? true : false;

    // Unsupported, non-API property.
    osc.isNode = osc.isCommonJS && typeof window === "undefined";

    // Unsupported, non-API property.
    osc.isElectron = typeof process !== "undefined" &&
        process.versions && process.versions.electron ? true : false;

    // Unsupported, non-API property.
    osc.isBufferEnv = osc.isNode || osc.isElectron;

    // Unsupported, non-API function.
    osc.isArray = function (obj) {
        return obj && Object.prototype.toString.call(obj) === "[object Array]";
    };

    // Unsupported, non-API function.
    osc.isTypedArrayView = function (obj) {
        return obj.buffer && obj.buffer instanceof ArrayBuffer;
    };

    // Unsupported, non-API function.
    osc.isBuffer = function (obj) {
        return osc.isBufferEnv && obj instanceof Buffer;
    };

    // Unsupported, non-API member.
    osc.Long = typeof Long !== "undefined" ? Long :
        osc.isNode ? require("long") : undefined;

    // Unsupported, non-API member. Can be removed when supported versions
    // of Node.js expose TextDecoder as a global, as in the browser.
    osc.TextDecoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8") :
        typeof util !== "undefined" && typeof (util.TextDecoder !== "undefined") ? new util.TextDecoder("utf-8") : undefined;

    osc.TextEncoder = typeof TextEncoder !== "undefined" ? new TextEncoder("utf-8") :
        typeof util !== "undefined" && typeof (util.TextEncoder !== "undefined") ? new util.TextEncoder("utf-8") : undefined;

    /**
     * Wraps the specified object in a DataView.
     *
     * @param {Array-like} obj the object to wrap in a DataView instance
     * @return {DataView} the DataView object
     */
    // Unsupported, non-API function.
    osc.dataView = function (obj, offset, length) {
        if (obj.buffer) {
            return new DataView(obj.buffer, offset, length);
        }

        if (obj instanceof ArrayBuffer) {
            return new DataView(obj, offset, length);
        }

        return new DataView(new Uint8Array(obj), offset, length);
    };

    /**
     * Takes an ArrayBuffer, TypedArray, DataView, Buffer, or array-like object
     * and returns a Uint8Array view of it.
     *
     * Throws an error if the object isn't suitably array-like.
     *
     * @param {Array-like or Array-wrapping} obj an array-like or array-wrapping object
     * @returns {Uint8Array} a typed array of octets
     */
    // Unsupported, non-API function.
    osc.byteArray = function (obj) {
        if (obj instanceof Uint8Array) {
            return obj;
        }

        var buf = obj.buffer ? obj.buffer : obj;

        if (!(buf instanceof ArrayBuffer) && (typeof buf.length === "undefined" || typeof buf === "string")) {
            throw new Error("Can't wrap a non-array-like object as Uint8Array. Object was: " +
                JSON.stringify(obj, null, 2));
        }


        // TODO gh-39: This is a potentially unsafe algorithm;
        // if we're getting anything other than a TypedArrayView (such as a DataView),
        // we really need to determine the range of the view it is viewing.
        return new Uint8Array(buf);
    };

    /**
     * Takes an ArrayBuffer, TypedArray, DataView, or array-like object
     * and returns a native buffer object
     * (i.e. in Node.js, a Buffer object and in the browser, a Uint8Array).
     *
     * Throws an error if the object isn't suitably array-like.
     *
     * @param {Array-like or Array-wrapping} obj an array-like or array-wrapping object
     * @returns {Buffer|Uint8Array} a buffer object
     */
    // Unsupported, non-API function.
    osc.nativeBuffer = function (obj) {
        if (osc.isBufferEnv) {
            return osc.isBuffer(obj) ? obj :
                Buffer.from(obj.buffer ? obj : new Uint8Array(obj));
        }

        return osc.isTypedArrayView(obj) ? obj : new Uint8Array(obj);
    };

    // Unsupported, non-API function
    osc.copyByteArray = function (source, target, offset) {
        if (osc.isTypedArrayView(source) && osc.isTypedArrayView(target)) {
            target.set(source, offset);
        } else {
            var start = offset === undefined ? 0 : offset,
                len = Math.min(target.length - offset, source.length);

            for (var i = 0, j = start; i < len; i++, j++) {
                target[j] = source[i];
            }
        }

        return target;
    };

    /**
     * Reads an OSC-formatted string.
     *
     * @param {DataView} dv a DataView containing the raw bytes of the OSC string
     * @param {Object} offsetState an offsetState object used to store the current offset index
     * @return {String} the JavaScript String that was read
     */
    osc.readString = function (dv, offsetState) {
        var charCodes = [],
            idx = offsetState.idx;

        for (; idx < dv.byteLength; idx++) {
            var charCode = dv.getUint8(idx);
            if (charCode !== 0) {
                charCodes.push(charCode);
            } else {
                idx++;
                break;
            }
        }

        // Round to the nearest 4-byte block.
        idx = (idx + 3) & ~0x03;
        offsetState.idx = idx;

        var decoder = osc.isBufferEnv ? osc.readString.withBuffer :
            osc.TextDecoder ? osc.readString.withTextDecoder : osc.readString.raw;

        return decoder(charCodes);
    };

    osc.readString.raw = function (charCodes) {
        // If no Buffer or TextDecoder, resort to fromCharCode
        // This does not properly decode multi-byte Unicode characters.
        var str = "";
        var sliceSize = 10000;

        // Processing the array in chunks so as not to exceed argument
        // limit, see https://bugs.webkit.org/show_bug.cgi?id=80797
        for (var i = 0; i < charCodes.length; i += sliceSize) {
            str += String.fromCharCode.apply(null, charCodes.slice(i, i + sliceSize));
        }

        return str;
    };

    osc.readString.withTextDecoder = function (charCodes) {
        var data = new Int8Array(charCodes);
        return osc.TextDecoder.decode(data);
    };

    osc.readString.withBuffer = function (charCodes) {
        return Buffer.from(charCodes).toString("utf-8");
    };

    /**
     * Writes a JavaScript string as an OSC-formatted string.
     *
     * @param {String} str the string to write
     * @return {Uint8Array} a buffer containing the OSC-formatted string
     */
    osc.writeString = function (str) {
        var terminated = str + "\u0000",
            len = terminated.length,
            paddedLen = (len + 3) & ~0x03,
            arr = new Uint8Array(paddedLen);

        var encoder = osc.isBufferEnv ? osc.writeString.withBuffer :
            osc.TextEncoder ? osc.writeString.withTextEncoder : null,
            encodedStr;

        if (encoder) {
            encodedStr = encoder(terminated);
        }

        for (var i = 0; i < terminated.length; i++) {
            var charCode = encoder ? encodedStr[i] : terminated.charCodeAt(i);
            arr[i] = charCode;
        }

        return arr;
    };

    osc.writeString.withTextEncoder = function (str) {
        return osc.TextEncoder.encode(str);
    };

    osc.writeString.withBuffer = function (str) {
        return Buffer.from(str);
    };

    // Unsupported, non-API function.
    osc.readPrimitive = function (dv, readerName, numBytes, offsetState) {
        var val = dv[readerName](offsetState.idx, false);
        offsetState.idx += numBytes;

        return val;
    };

    // Unsupported, non-API function.
    osc.writePrimitive = function (val, dv, writerName, numBytes, offset) {
        offset = offset === undefined ? 0 : offset;

        var arr;
        if (!dv) {
            arr = new Uint8Array(numBytes);
            dv = new DataView(arr.buffer);
        } else {
            arr = new Uint8Array(dv.buffer);
        }

        dv[writerName](offset, val, false);

        return arr;
    };

    /**
     * Reads an OSC int32 ("i") value.
     *
     * @param {DataView} dv a DataView containing the raw bytes
     * @param {Object} offsetState an offsetState object used to store the current offset index into dv
     * @return {Number} the number that was read
     */
    osc.readInt32 = function (dv, offsetState) {
        return osc.readPrimitive(dv, "getInt32", 4, offsetState);
    };

    /**
     * Writes an OSC int32 ("i") value.
     *
     * @param {Number} val the number to write
     * @param {DataView} [dv] a DataView instance to write the number into
     * @param {Number} [offset] an offset into dv
     */
    osc.writeInt32 = function (val, dv, offset) {
        return osc.writePrimitive(val, dv, "setInt32", 4, offset);
    };

    /**
     * Reads an OSC int64 ("h") value.
     *
     * @param {DataView} dv a DataView containing the raw bytes
     * @param {Object} offsetState an offsetState object used to store the current offset index into dv
     * @return {Number} the number that was read
     */
    osc.readInt64 = function (dv, offsetState) {
        var high = osc.readPrimitive(dv, "getInt32", 4, offsetState),
            low = osc.readPrimitive(dv, "getInt32", 4, offsetState);

        if (osc.Long) {
            return new osc.Long(low, high);
        } else {
            return {
                high: high,
                low: low,
                unsigned: false
            };
        }
    };

    /**
     * Writes an OSC int64 ("h") value.
     *
     * @param {Number} val the number to write
     * @param {DataView} [dv] a DataView instance to write the number into
     * @param {Number} [offset] an offset into dv
     */
    osc.writeInt64 = function (val, dv, offset) {
        var arr = new Uint8Array(8);
        arr.set(osc.writePrimitive(val.high, dv, "setInt32", 4, offset), 0);
        arr.set(osc.writePrimitive(val.low,  dv, "setInt32", 4, offset + 4), 4);
        return arr;
    };

    /**
     * Reads an OSC float32 ("f") value.
     *
     * @param {DataView} dv a DataView containing the raw bytes
     * @param {Object} offsetState an offsetState object used to store the current offset index into dv
     * @return {Number} the number that was read
     */
    osc.readFloat32 = function (dv, offsetState) {
        return osc.readPrimitive(dv, "getFloat32", 4, offsetState);
    };

    /**
     * Writes an OSC float32 ("f") value.
     *
     * @param {Number} val the number to write
     * @param {DataView} [dv] a DataView instance to write the number into
     * @param {Number} [offset] an offset into dv
     */
    osc.writeFloat32 = function (val, dv, offset) {
        return osc.writePrimitive(val, dv, "setFloat32", 4, offset);
    };

    /**
     * Reads an OSC float64 ("d") value.
     *
     * @param {DataView} dv a DataView containing the raw bytes
     * @param {Object} offsetState an offsetState object used to store the current offset index into dv
     * @return {Number} the number that was read
     */
    osc.readFloat64 = function (dv, offsetState) {
        return osc.readPrimitive(dv, "getFloat64", 8, offsetState);
    };

    /**
     * Writes an OSC float64 ("d") value.
     *
     * @param {Number} val the number to write
     * @param {DataView} [dv] a DataView instance to write the number into
     * @param {Number} [offset] an offset into dv
     */
    osc.writeFloat64 = function (val, dv, offset) {
        return osc.writePrimitive(val, dv, "setFloat64", 8, offset);
    };

    /**
     * Reads an OSC 32-bit ASCII character ("c") value.
     *
     * @param {DataView} dv a DataView containing the raw bytes
     * @param {Object} offsetState an offsetState object used to store the current offset index into dv
     * @return {String} a string containing the read character
     */
    osc.readChar32 = function (dv, offsetState) {
        var charCode = osc.readPrimitive(dv, "getUint32", 4, offsetState);
        return String.fromCharCode(charCode);
    };

    /**
     * Writes an OSC 32-bit ASCII character ("c") value.
     *
     * @param {String} str the string from which the first character will be written
     * @param {DataView} [dv] a DataView instance to write the character into
     * @param {Number} [offset] an offset into dv
     * @return {String} a string containing the read character
     */
    osc.writeChar32 = function (str, dv, offset) {
        var charCode = str.charCodeAt(0);
        if (charCode === undefined || charCode < -1) {
            return undefined;
        }

        return osc.writePrimitive(charCode, dv, "setUint32", 4, offset);
    };

    /**
     * Reads an OSC blob ("b") (i.e. a Uint8Array).
     *
     * @param {DataView} dv a DataView instance to read from
     * @param {Object} offsetState an offsetState object used to store the current offset index into dv
     * @return {Uint8Array} the data that was read
     */
    osc.readBlob = function (dv, offsetState) {
        var len = osc.readInt32(dv, offsetState),
            paddedLen = (len + 3) & ~0x03,
            blob = new Uint8Array(dv.buffer, offsetState.idx, len);

        offsetState.idx += paddedLen;

        return blob;
    };

    /**
     * Writes a raw collection of bytes to a new ArrayBuffer.
     *
     * @param {Array-like} data a collection of octets
     * @return {ArrayBuffer} a buffer containing the OSC-formatted blob
     */
    osc.writeBlob = function (data) {
        data = osc.byteArray(data);

        var len = data.byteLength,
            paddedLen = (len + 3) & ~0x03,
            offset = 4, // Extra 4 bytes is for the size.
            blobLen = paddedLen + offset,
            arr = new Uint8Array(blobLen),
            dv = new DataView(arr.buffer);

        // Write the size.
        osc.writeInt32(len, dv);

        // Since we're writing to a real ArrayBuffer,
        // we don't need to pad the remaining bytes.
        arr.set(data, offset);

        return arr;
    };

    /**
     * Reads an OSC 4-byte MIDI message.
     *
     * @param {DataView} dv the DataView instance to read from
     * @param {Object} offsetState an offsetState object used to store the current offset index into dv
     * @return {Uint8Array} an array containing (in order) the port ID, status, data1 and data1 bytes
     */
    osc.readMIDIBytes = function (dv, offsetState) {
        var midi = new Uint8Array(dv.buffer, offsetState.idx, 4);
        offsetState.idx += 4;

        return midi;
    };

    /**
     * Writes an OSC 4-byte MIDI message.
     *
     * @param {Array-like} bytes a 4-element array consisting of the port ID, status, data1 and data1 bytes
     * @return {Uint8Array} the written message
     */
    osc.writeMIDIBytes = function (bytes) {
        bytes = osc.byteArray(bytes);

        var arr = new Uint8Array(4);
        arr.set(bytes);

        return arr;
    };

    /**
     * Reads an OSC RGBA colour value.
     *
     * @param {DataView} dv the DataView instance to read from
     * @param {Object} offsetState an offsetState object used to store the current offset index into dv
     * @return {Object} a colour object containing r, g, b, and a properties
     */
    osc.readColor = function (dv, offsetState) {
        var bytes = new Uint8Array(dv.buffer, offsetState.idx, 4),
            alpha = bytes[3] / 255;

        offsetState.idx += 4;

        return {
            r: bytes[0],
            g: bytes[1],
            b: bytes[2],
            a: alpha
        };
    };

    /**
     * Writes an OSC RGBA colour value.
     *
     * @param {Object} color a colour object containing r, g, b, and a properties
     * @return {Uint8Array} a byte array containing the written color
     */
    osc.writeColor = function (color) {
        var alpha = Math.round(color.a * 255),
            arr = new Uint8Array([color.r, color.g, color.b, alpha]);

        return arr;
    };

    /**
     * Reads an OSC true ("T") value by directly returning the JavaScript Boolean "true".
     */
    osc.readTrue = function () {
        return true;
    };

    /**
     * Reads an OSC false ("F") value by directly returning the JavaScript Boolean "false".
     */
    osc.readFalse = function () {
        return false;
    };

    /**
     * Reads an OSC nil ("N") value by directly returning the JavaScript "null" value.
     */
    osc.readNull = function () {
        return null;
    };

    /**
     * Reads an OSC impulse/bang/infinitum ("I") value by directly returning 1.0.
     */
    osc.readImpulse = function () {
        return 1.0;
    };

    /**
     * Reads an OSC time tag ("t").
     *
     * @param {DataView} dv the DataView instance to read from
     * @param {Object} offsetState an offset state object containing the current index into dv
     * @param {Object} a time tag object containing both the raw NTP as well as the converted native (i.e. JS/UNIX) time
     */
    osc.readTimeTag = function (dv, offsetState) {
        var secs1900 = osc.readPrimitive(dv, "getUint32", 4, offsetState),
            frac = osc.readPrimitive(dv, "getUint32", 4, offsetState),
            native = (secs1900 === 0 && frac === 1) ? Date.now() : osc.ntpToJSTime(secs1900, frac);

        return {
            raw: [secs1900, frac],
            native: native
        };
    };

    /**
     * Writes an OSC time tag ("t").
     *
     * Takes, as its argument, a time tag object containing either a "raw" or "native property."
     * The raw timestamp must conform to the NTP standard representation, consisting of two unsigned int32
     * values. The first represents the number of seconds since January 1, 1900; the second, fractions of a second.
     * "Native" JavaScript timestamps are specified as a Number representing milliseconds since January 1, 1970.
     *
     * @param {Object} timeTag time tag object containing either a native JS timestamp (in ms) or a NTP timestamp pair
     * @return {Uint8Array} raw bytes for the written time tag
     */
    osc.writeTimeTag = function (timeTag) {
        var raw = timeTag.raw ? timeTag.raw : osc.jsToNTPTime(timeTag.native),
            arr = new Uint8Array(8), // Two Unit32s.
            dv = new DataView(arr.buffer);

        osc.writeInt32(raw[0], dv, 0);
        osc.writeInt32(raw[1], dv, 4);

        return arr;
    };

    /**
     * Produces a time tag containing a raw NTP timestamp
     * relative to now by the specified number of seconds.
     *
     * @param {Number} secs the number of seconds relative to now (i.e. + for the future, - for the past)
     * @param {Number} now the number of milliseconds since epoch to use as the current time. Defaults to Date.now()
     * @return {Object} the time tag
     */
    osc.timeTag = function (secs, now) {
        secs = secs || 0;
        now = now || Date.now();

        var nowSecs = now / 1000,
            nowWhole = Math.floor(nowSecs),
            nowFracs = nowSecs - nowWhole,
            secsWhole = Math.floor(secs),
            secsFracs = secs - secsWhole,
            fracs = nowFracs + secsFracs;

        if (fracs > 1) {
            var fracsWhole = Math.floor(fracs),
                fracsFracs = fracs - fracsWhole;

            secsWhole += fracsWhole;
            fracs = fracsFracs;
        }

        var ntpSecs = nowWhole + secsWhole + osc.SECS_70YRS,
            ntpFracs = Math.round(osc.TWO_32 * fracs);

        return {
            raw: [ntpSecs, ntpFracs]
        };
    };

    /**
     * Converts OSC's standard time tag representation (which is the NTP format)
     * into the JavaScript/UNIX format in milliseconds.
     *
     * @param {Number} secs1900 the number of seconds since 1900
     * @param {Number} frac the number of fractions of a second (between 0 and 2^32)
     * @return {Number} a JavaScript-compatible timestamp in milliseconds
     */
    osc.ntpToJSTime = function (secs1900, frac) {
        var secs1970 = secs1900 - osc.SECS_70YRS,
            decimals = frac / osc.TWO_32,
            msTime = (secs1970 + decimals) * 1000;

        return msTime;
    };

    osc.jsToNTPTime = function (jsTime) {
        var secs = jsTime / 1000,
            secsWhole = Math.floor(secs),
            secsFrac = secs - secsWhole,
            ntpSecs = secsWhole + osc.SECS_70YRS,
            ntpFracs = Math.round(osc.TWO_32 * secsFrac);

        return [ntpSecs, ntpFracs];
    };

    /**
     * Reads the argument portion of an OSC message.
     *
     * @param {DataView} dv a DataView instance to read from
     * @param {Object} offsetState the offsetState object that stores the current offset into dv
     * @param {Object} [options] read options
     * @return {Array} an array of the OSC arguments that were read
     */
    osc.readArguments = function (dv, options, offsetState) {
        var typeTagString = osc.readString(dv, offsetState);
        if (typeTagString.indexOf(",") !== 0) {
            // Despite what the OSC 1.0 spec says,
            // it just doesn't make sense to handle messages without type tags.
            // scsynth appears to read such messages as if they have a single
            // Uint8 argument. sclang throws an error if the type tag is omitted.
            throw new Error("A malformed type tag string was found while reading " +
                "the arguments of an OSC message. String was: " +
                typeTagString, " at offset: " + offsetState.idx);
        }

        var argTypes = typeTagString.substring(1).split(""),
            args = [];

        osc.readArgumentsIntoArray(args, argTypes, typeTagString, dv, options, offsetState);

        return args;
    };

    // Unsupported, non-API function.
    osc.readArgument = function (argType, typeTagString, dv, options, offsetState) {
        var typeSpec = osc.argumentTypes[argType];
        if (!typeSpec) {
            throw new Error("'" + argType + "' is not a valid OSC type tag. Type tag string was: " + typeTagString);
        }

        var argReader = typeSpec.reader,
            arg = osc[argReader](dv, offsetState);

        if (options.metadata) {
            arg = {
                type: argType,
                value: arg
            };
        }

        return arg;
    };

    // Unsupported, non-API function.
    osc.readArgumentsIntoArray = function (arr, argTypes, typeTagString, dv, options, offsetState) {
        var i = 0;

        while (i < argTypes.length) {
            var argType = argTypes[i],
                arg;

            if (argType === "[") {
                var fromArrayOpen = argTypes.slice(i + 1),
                    endArrayIdx = fromArrayOpen.indexOf("]");

                if (endArrayIdx < 0) {
                    throw new Error("Invalid argument type tag: an open array type tag ('[') was found " +
                        "without a matching close array tag ('[]'). Type tag was: " + typeTagString);
                }

                var typesInArray = fromArrayOpen.slice(0, endArrayIdx);
                arg = osc.readArgumentsIntoArray([], typesInArray, typeTagString, dv, options, offsetState);
                i += endArrayIdx + 2;
            } else {
                arg = osc.readArgument(argType, typeTagString, dv, options, offsetState);
                i++;
            }

            arr.push(arg);
        }

        return arr;
    };

    /**
     * Writes the specified arguments.
     *
     * @param {Array} args an array of arguments
     * @param {Object} options options for writing
     * @return {Uint8Array} a buffer containing the OSC-formatted argument type tag and values
     */
    osc.writeArguments = function (args, options) {
        var argCollection = osc.collectArguments(args, options);
        return osc.joinParts(argCollection);
    };

    // Unsupported, non-API function.
    osc.joinParts = function (dataCollection) {
        var buf = new Uint8Array(dataCollection.byteLength),
            parts = dataCollection.parts,
            offset = 0;

        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            osc.copyByteArray(part, buf, offset);
            offset += part.length;
        }

        return buf;
    };

    // Unsupported, non-API function.
    osc.addDataPart = function (dataPart, dataCollection) {
        dataCollection.parts.push(dataPart);
        dataCollection.byteLength += dataPart.length;
    };

    osc.writeArrayArguments = function (args, dataCollection) {
        var typeTag = "[";

        for (var i = 0; i < args.length; i++) {
            var arg = args[i];
            typeTag += osc.writeArgument(arg, dataCollection);
        }

        typeTag += "]";

        return typeTag;
    };

    osc.writeArgument = function (arg, dataCollection) {
        if (osc.isArray(arg)) {
            return osc.writeArrayArguments(arg, dataCollection);
        }

        var type = arg.type,
            writer = osc.argumentTypes[type].writer;

        if (writer) {
            var data = osc[writer](arg.value);
            osc.addDataPart(data, dataCollection);
        }

        return arg.type;
    };

    // Unsupported, non-API function.
    osc.collectArguments = function (args, options, dataCollection) {
        if (!osc.isArray(args)) {
            args = typeof args === "undefined" ? [] : [args];
        }

        dataCollection = dataCollection || {
            byteLength: 0,
            parts: []
        };

        if (!options.metadata) {
            args = osc.annotateArguments(args);
        }

        var typeTagString = ",",
            currPartIdx = dataCollection.parts.length;

        for (var i = 0; i < args.length; i++) {
            var arg = args[i];
            typeTagString += osc.writeArgument(arg, dataCollection);
        }

        var typeData = osc.writeString(typeTagString);
        dataCollection.byteLength += typeData.byteLength;
        dataCollection.parts.splice(currPartIdx, 0, typeData);

        return dataCollection;
    };

    /**
     * Reads an OSC message.
     *
     * @param {Array-like} data an array of bytes to read from
     * @param {Object} [options] read options
     * @param {Object} [offsetState] an offsetState object that stores the current offset into dv
     * @return {Object} the OSC message, formatted as a JavaScript object containing "address" and "args" properties
     */
    osc.readMessage = function (data, options, offsetState) {
        options = options || osc.defaults;

        var dv = osc.dataView(data, data.byteOffset, data.byteLength);
        offsetState = offsetState || {
            idx: 0
        };

        var address = osc.readString(dv, offsetState);
        return osc.readMessageContents(address, dv, options, offsetState);
    };

    // Unsupported, non-API function.
    osc.readMessageContents = function (address, dv, options, offsetState) {
        if (address.indexOf("/") !== 0) {
            throw new Error("A malformed OSC address was found while reading " +
                "an OSC message. String was: " + address);
        }

        var args = osc.readArguments(dv, options, offsetState);

        return {
            address: address,
            args: args.length === 1 && options.unpackSingleArgs ? args[0] : args
        };
    };

    // Unsupported, non-API function.
    osc.collectMessageParts = function (msg, options, dataCollection) {
        dataCollection = dataCollection || {
            byteLength: 0,
            parts: []
        };

        osc.addDataPart(osc.writeString(msg.address), dataCollection);
        return osc.collectArguments(msg.args, options, dataCollection);
    };

    /**
     * Writes an OSC message.
     *
     * @param {Object} msg a message object containing "address" and "args" properties
     * @param {Object} [options] write options
     * @return {Uint8Array} an array of bytes containing the OSC message
     */
    osc.writeMessage = function (msg, options) {
        options = options || osc.defaults;

        if (!osc.isValidMessage(msg)) {
            throw new Error("An OSC message must contain a valid address. Message was: " +
                JSON.stringify(msg, null, 2));
        }

        var msgCollection = osc.collectMessageParts(msg, options);
        return osc.joinParts(msgCollection);
    };

    osc.isValidMessage = function (msg) {
        return msg.address && msg.address.indexOf("/") === 0;
    };

    /**
     * Reads an OSC bundle.
     *
     * @param {DataView} dv the DataView instance to read from
     * @param {Object} [options] read optoins
     * @param {Object} [offsetState] an offsetState object that stores the current offset into dv
     * @return {Object} the bundle or message object that was read
     */
    osc.readBundle = function (dv, options, offsetState) {
        return osc.readPacket(dv, options, offsetState);
    };

    // Unsupported, non-API function.
    osc.collectBundlePackets = function (bundle, options, dataCollection) {
        dataCollection = dataCollection || {
            byteLength: 0,
            parts: []
        };

        osc.addDataPart(osc.writeString("#bundle"), dataCollection);
        osc.addDataPart(osc.writeTimeTag(bundle.timeTag), dataCollection);

        for (var i = 0; i < bundle.packets.length; i++) {
            var packet = bundle.packets[i],
                collector = packet.address ? osc.collectMessageParts : osc.collectBundlePackets,
                packetCollection = collector(packet, options);

            dataCollection.byteLength += packetCollection.byteLength;
            osc.addDataPart(osc.writeInt32(packetCollection.byteLength), dataCollection);
            dataCollection.parts = dataCollection.parts.concat(packetCollection.parts);
        }

        return dataCollection;
    };

    /**
     * Writes an OSC bundle.
     *
     * @param {Object} a bundle object containing "timeTag" and "packets" properties
     * @param {object} [options] write options
     * @return {Uint8Array} an array of bytes containing the message
     */
    osc.writeBundle = function (bundle, options) {
        if (!osc.isValidBundle(bundle)) {
            throw new Error("An OSC bundle must contain 'timeTag' and 'packets' properties. " +
                "Bundle was: " + JSON.stringify(bundle, null, 2));
        }

        options = options || osc.defaults;
        var bundleCollection = osc.collectBundlePackets(bundle, options);

        return osc.joinParts(bundleCollection);
    };

    osc.isValidBundle = function (bundle) {
        return bundle.timeTag !== undefined && bundle.packets !== undefined;
    };

    // Unsupported, non-API function.
    osc.readBundleContents = function (dv, options, offsetState, len) {
        var timeTag = osc.readTimeTag(dv, offsetState),
            packets = [];

        while (offsetState.idx < len) {
            var packetSize = osc.readInt32(dv, offsetState),
                packetLen = offsetState.idx + packetSize,
                packet = osc.readPacket(dv, options, offsetState, packetLen);

            packets.push(packet);
        }

        return {
            timeTag: timeTag,
            packets: packets
        };
    };

    /**
     * Reads an OSC packet, which may consist of either a bundle or a message.
     *
     * @param {Array-like} data an array of bytes to read from
     * @param {Object} [options] read options
     * @return {Object} a bundle or message object
     */
    osc.readPacket = function (data, options, offsetState, len) {
        var dv = osc.dataView(data, data.byteOffset, data.byteLength);

        len = len === undefined ? dv.byteLength : len;
        offsetState = offsetState || {
            idx: 0
        };

        var header = osc.readString(dv, offsetState),
            firstChar = header[0];

        if (firstChar === "#") {
            return osc.readBundleContents(dv, options, offsetState, len);
        } else if (firstChar === "/") {
            return osc.readMessageContents(header, dv, options, offsetState);
        }

        throw new Error("The header of an OSC packet didn't contain an OSC address or a #bundle string." +
            " Header was: " + header);
    };

    /**
     * Writes an OSC packet, which may consist of either of a bundle or a message.
     *
     * @param {Object} a bundle or message object
     * @param {Object} [options] write options
     * @return {Uint8Array} an array of bytes containing the message
     */
    osc.writePacket = function (packet, options) {
        if (osc.isValidMessage(packet)) {
            return osc.writeMessage(packet, options);
        } else if (osc.isValidBundle(packet)) {
            return osc.writeBundle(packet, options);
        } else {
            throw new Error("The specified packet was not recognized as a valid OSC message or bundle." +
                " Packet was: " + JSON.stringify(packet, null, 2));
        }
    };

    // Unsupported, non-API.
    osc.argumentTypes = {
        i: {
            reader: "readInt32",
            writer: "writeInt32"
        },
        h: {
            reader: "readInt64",
            writer: "writeInt64"
        },
        f: {
            reader: "readFloat32",
            writer: "writeFloat32"
        },
        s: {
            reader: "readString",
            writer: "writeString"
        },
        S: {
            reader: "readString",
            writer: "writeString"
        },
        b: {
            reader: "readBlob",
            writer: "writeBlob"
        },
        t: {
            reader: "readTimeTag",
            writer: "writeTimeTag"
        },
        T: {
            reader: "readTrue"
        },
        F: {
            reader: "readFalse"
        },
        N: {
            reader: "readNull"
        },
        I: {
            reader: "readImpulse"
        },
        d: {
            reader: "readFloat64",
            writer: "writeFloat64"
        },
        c: {
            reader: "readChar32",
            writer: "writeChar32"
        },
        r: {
            reader: "readColor",
            writer: "writeColor"
        },
        m: {
            reader: "readMIDIBytes",
            writer: "writeMIDIBytes"
        },
        // [] are special cased within read/writeArguments()
    };

    // Unsupported, non-API function.
    osc.inferTypeForArgument = function (arg) {
        var type = typeof arg;

        // TODO: This is freaking hideous.
        switch (type) {
            case "boolean":
                return arg ? "T" : "F";
            case "string":
                return "s";
            case "number":
                return "f";
            case "undefined":
                return "N";
            case "object":
                if (arg === null) {
                    return "N";
                } else if (arg instanceof Uint8Array ||
                    arg instanceof ArrayBuffer) {
                    return "b";
                } else if (typeof arg.high === "number" && typeof arg.low === "number") {
                    return "h";
                }
                break;
        }

        throw new Error("Can't infer OSC argument type for value: " +
            JSON.stringify(arg, null, 2));
    };

    // Unsupported, non-API function.
    osc.annotateArguments = function (args) {
        var annotated = [];

        for (var i = 0; i < args.length; i++) {
            var arg = args[i],
                msgArg;

            if (typeof (arg) === "object" && arg.type && arg.value !== undefined) {
                // We've got an explicitly typed argument.
                msgArg = arg;
            } else if (osc.isArray(arg)) {
                // We've got an array of arguments,
                // so they each need to be inferred and expanded.
                msgArg = osc.annotateArguments(arg);
            } else {
                var oscType = osc.inferTypeForArgument(arg);
                msgArg = {
                    type: oscType,
                    value: arg
                };
            }

            annotated.push(msgArg);
        }

        return annotated;
    };

    if (osc.isCommonJS) {
        module.exports = osc;
    }
}());
;
!function(t,i){"object"==typeof exports&&"object"==typeof module?module.exports=i():"function"==typeof define&&define.amd?define([],i):"object"==typeof exports?exports.Long=i():t.Long=i()}("undefined"!=typeof self?self:this,function(){return function(t){function i(e){if(n[e])return n[e].exports;var r=n[e]={i:e,l:!1,exports:{}};return t[e].call(r.exports,r,r.exports,i),r.l=!0,r.exports}var n={};return i.m=t,i.c=n,i.d=function(t,n,e){i.o(t,n)||Object.defineProperty(t,n,{configurable:!1,enumerable:!0,get:e})},i.n=function(t){var n=t&&t.__esModule?function(){return t.default}:function(){return t};return i.d(n,"a",n),n},i.o=function(t,i){return Object.prototype.hasOwnProperty.call(t,i)},i.p="",i(i.s=0)}([function(t,i){function n(t,i,n){this.low=0|t,this.high=0|i,this.unsigned=!!n}function e(t){return!0===(t&&t.__isLong__)}function r(t,i){var n,e,r;return i?(t>>>=0,(r=0<=t&&t<256)&&(e=l[t])?e:(n=h(t,(0|t)<0?-1:0,!0),r&&(l[t]=n),n)):(t|=0,(r=-128<=t&&t<128)&&(e=f[t])?e:(n=h(t,t<0?-1:0,!1),r&&(f[t]=n),n))}function s(t,i){if(isNaN(t))return i?p:m;if(i){if(t<0)return p;if(t>=c)return q}else{if(t<=-v)return _;if(t+1>=v)return E}return t<0?s(-t,i).neg():h(t%d|0,t/d|0,i)}function h(t,i,e){return new n(t,i,e)}function u(t,i,n){if(0===t.length)throw Error("empty string");if("NaN"===t||"Infinity"===t||"+Infinity"===t||"-Infinity"===t)return m;if("number"==typeof i?(n=i,i=!1):i=!!i,(n=n||10)<2||36<n)throw RangeError("radix");var e;if((e=t.indexOf("-"))>0)throw Error("interior hyphen");if(0===e)return u(t.substring(1),i,n).neg();for(var r=s(a(n,8)),h=m,o=0;o<t.length;o+=8){var g=Math.min(8,t.length-o),f=parseInt(t.substring(o,o+g),n);if(g<8){var l=s(a(n,g));h=h.mul(l).add(s(f))}else h=h.mul(r),h=h.add(s(f))}return h.unsigned=i,h}function o(t,i){return"number"==typeof t?s(t,i):"string"==typeof t?u(t,i):h(t.low,t.high,"boolean"==typeof i?i:t.unsigned)}t.exports=n;var g=null;try{g=new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array([0,97,115,109,1,0,0,0,1,13,2,96,0,1,127,96,4,127,127,127,127,1,127,3,7,6,0,1,1,1,1,1,6,6,1,127,1,65,0,11,7,50,6,3,109,117,108,0,1,5,100,105,118,95,115,0,2,5,100,105,118,95,117,0,3,5,114,101,109,95,115,0,4,5,114,101,109,95,117,0,5,8,103,101,116,95,104,105,103,104,0,0,10,191,1,6,4,0,35,0,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,126,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,127,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,128,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,129,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,130,34,4,66,32,135,167,36,0,32,4,167,11])),{}).exports}catch(t){}n.prototype.__isLong__,Object.defineProperty(n.prototype,"__isLong__",{value:!0}),n.isLong=e;var f={},l={};n.fromInt=r,n.fromNumber=s,n.fromBits=h;var a=Math.pow;n.fromString=u,n.fromValue=o;var d=4294967296,c=d*d,v=c/2,w=r(1<<24),m=r(0);n.ZERO=m;var p=r(0,!0);n.UZERO=p;var y=r(1);n.ONE=y;var b=r(1,!0);n.UONE=b;var N=r(-1);n.NEG_ONE=N;var E=h(-1,2147483647,!1);n.MAX_VALUE=E;var q=h(-1,-1,!0);n.MAX_UNSIGNED_VALUE=q;var _=h(0,-2147483648,!1);n.MIN_VALUE=_;var B=n.prototype;B.toInt=function(){return this.unsigned?this.low>>>0:this.low},B.toNumber=function(){return this.unsigned?(this.high>>>0)*d+(this.low>>>0):this.high*d+(this.low>>>0)},B.toString=function(t){if((t=t||10)<2||36<t)throw RangeError("radix");if(this.isZero())return"0";if(this.isNegative()){if(this.eq(_)){var i=s(t),n=this.div(i),e=n.mul(i).sub(this);return n.toString(t)+e.toInt().toString(t)}return"-"+this.neg().toString(t)}for(var r=s(a(t,6),this.unsigned),h=this,u="";;){var o=h.div(r),g=h.sub(o.mul(r)).toInt()>>>0,f=g.toString(t);if(h=o,h.isZero())return f+u;for(;f.length<6;)f="0"+f;u=""+f+u}},B.getHighBits=function(){return this.high},B.getHighBitsUnsigned=function(){return this.high>>>0},B.getLowBits=function(){return this.low},B.getLowBitsUnsigned=function(){return this.low>>>0},B.getNumBitsAbs=function(){if(this.isNegative())return this.eq(_)?64:this.neg().getNumBitsAbs();for(var t=0!=this.high?this.high:this.low,i=31;i>0&&0==(t&1<<i);i--);return 0!=this.high?i+33:i+1},B.isZero=function(){return 0===this.high&&0===this.low},B.eqz=B.isZero,B.isNegative=function(){return!this.unsigned&&this.high<0},B.isPositive=function(){return this.unsigned||this.high>=0},B.isOdd=function(){return 1==(1&this.low)},B.isEven=function(){return 0==(1&this.low)},B.equals=function(t){return e(t)||(t=o(t)),(this.unsigned===t.unsigned||this.high>>>31!=1||t.high>>>31!=1)&&(this.high===t.high&&this.low===t.low)},B.eq=B.equals,B.notEquals=function(t){return!this.eq(t)},B.neq=B.notEquals,B.ne=B.notEquals,B.lessThan=function(t){return this.comp(t)<0},B.lt=B.lessThan,B.lessThanOrEqual=function(t){return this.comp(t)<=0},B.lte=B.lessThanOrEqual,B.le=B.lessThanOrEqual,B.greaterThan=function(t){return this.comp(t)>0},B.gt=B.greaterThan,B.greaterThanOrEqual=function(t){return this.comp(t)>=0},B.gte=B.greaterThanOrEqual,B.ge=B.greaterThanOrEqual,B.compare=function(t){if(e(t)||(t=o(t)),this.eq(t))return 0;var i=this.isNegative(),n=t.isNegative();return i&&!n?-1:!i&&n?1:this.unsigned?t.high>>>0>this.high>>>0||t.high===this.high&&t.low>>>0>this.low>>>0?-1:1:this.sub(t).isNegative()?-1:1},B.comp=B.compare,B.negate=function(){return!this.unsigned&&this.eq(_)?_:this.not().add(y)},B.neg=B.negate,B.add=function(t){e(t)||(t=o(t));var i=this.high>>>16,n=65535&this.high,r=this.low>>>16,s=65535&this.low,u=t.high>>>16,g=65535&t.high,f=t.low>>>16,l=65535&t.low,a=0,d=0,c=0,v=0;return v+=s+l,c+=v>>>16,v&=65535,c+=r+f,d+=c>>>16,c&=65535,d+=n+g,a+=d>>>16,d&=65535,a+=i+u,a&=65535,h(c<<16|v,a<<16|d,this.unsigned)},B.subtract=function(t){return e(t)||(t=o(t)),this.add(t.neg())},B.sub=B.subtract,B.multiply=function(t){if(this.isZero())return m;if(e(t)||(t=o(t)),g){return h(g.mul(this.low,this.high,t.low,t.high),g.get_high(),this.unsigned)}if(t.isZero())return m;if(this.eq(_))return t.isOdd()?_:m;if(t.eq(_))return this.isOdd()?_:m;if(this.isNegative())return t.isNegative()?this.neg().mul(t.neg()):this.neg().mul(t).neg();if(t.isNegative())return this.mul(t.neg()).neg();if(this.lt(w)&&t.lt(w))return s(this.toNumber()*t.toNumber(),this.unsigned);var i=this.high>>>16,n=65535&this.high,r=this.low>>>16,u=65535&this.low,f=t.high>>>16,l=65535&t.high,a=t.low>>>16,d=65535&t.low,c=0,v=0,p=0,y=0;return y+=u*d,p+=y>>>16,y&=65535,p+=r*d,v+=p>>>16,p&=65535,p+=u*a,v+=p>>>16,p&=65535,v+=n*d,c+=v>>>16,v&=65535,v+=r*a,c+=v>>>16,v&=65535,v+=u*l,c+=v>>>16,v&=65535,c+=i*d+n*a+r*l+u*f,c&=65535,h(p<<16|y,c<<16|v,this.unsigned)},B.mul=B.multiply,B.divide=function(t){if(e(t)||(t=o(t)),t.isZero())throw Error("division by zero");if(g){if(!this.unsigned&&-2147483648===this.high&&-1===t.low&&-1===t.high)return this;return h((this.unsigned?g.div_u:g.div_s)(this.low,this.high,t.low,t.high),g.get_high(),this.unsigned)}if(this.isZero())return this.unsigned?p:m;var i,n,r;if(this.unsigned){if(t.unsigned||(t=t.toUnsigned()),t.gt(this))return p;if(t.gt(this.shru(1)))return b;r=p}else{if(this.eq(_)){if(t.eq(y)||t.eq(N))return _;if(t.eq(_))return y;return i=this.shr(1).div(t).shl(1),i.eq(m)?t.isNegative()?y:N:(n=this.sub(t.mul(i)),r=i.add(n.div(t)))}if(t.eq(_))return this.unsigned?p:m;if(this.isNegative())return t.isNegative()?this.neg().div(t.neg()):this.neg().div(t).neg();if(t.isNegative())return this.div(t.neg()).neg();r=m}for(n=this;n.gte(t);){i=Math.max(1,Math.floor(n.toNumber()/t.toNumber()));for(var u=Math.ceil(Math.log(i)/Math.LN2),f=u<=48?1:a(2,u-48),l=s(i),d=l.mul(t);d.isNegative()||d.gt(n);)i-=f,l=s(i,this.unsigned),d=l.mul(t);l.isZero()&&(l=y),r=r.add(l),n=n.sub(d)}return r},B.div=B.divide,B.modulo=function(t){if(e(t)||(t=o(t)),g){return h((this.unsigned?g.rem_u:g.rem_s)(this.low,this.high,t.low,t.high),g.get_high(),this.unsigned)}return this.sub(this.div(t).mul(t))},B.mod=B.modulo,B.rem=B.modulo,B.not=function(){return h(~this.low,~this.high,this.unsigned)},B.and=function(t){return e(t)||(t=o(t)),h(this.low&t.low,this.high&t.high,this.unsigned)},B.or=function(t){return e(t)||(t=o(t)),h(this.low|t.low,this.high|t.high,this.unsigned)},B.xor=function(t){return e(t)||(t=o(t)),h(this.low^t.low,this.high^t.high,this.unsigned)},B.shiftLeft=function(t){return e(t)&&(t=t.toInt()),0==(t&=63)?this:t<32?h(this.low<<t,this.high<<t|this.low>>>32-t,this.unsigned):h(0,this.low<<t-32,this.unsigned)},B.shl=B.shiftLeft,B.shiftRight=function(t){return e(t)&&(t=t.toInt()),0==(t&=63)?this:t<32?h(this.low>>>t|this.high<<32-t,this.high>>t,this.unsigned):h(this.high>>t-32,this.high>=0?0:-1,this.unsigned)},B.shr=B.shiftRight,B.shiftRightUnsigned=function(t){if(e(t)&&(t=t.toInt()),0===(t&=63))return this;var i=this.high;if(t<32){return h(this.low>>>t|i<<32-t,i>>>t,this.unsigned)}return 32===t?h(i,0,this.unsigned):h(i>>>t-32,0,this.unsigned)},B.shru=B.shiftRightUnsigned,B.shr_u=B.shiftRightUnsigned,B.toSigned=function(){return this.unsigned?h(this.low,this.high,!1):this},B.toUnsigned=function(){return this.unsigned?this:h(this.low,this.high,!0)},B.toBytes=function(t){return t?this.toBytesLE():this.toBytesBE()},B.toBytesLE=function(){var t=this.high,i=this.low;return[255&i,i>>>8&255,i>>>16&255,i>>>24,255&t,t>>>8&255,t>>>16&255,t>>>24]},B.toBytesBE=function(){var t=this.high,i=this.low;return[t>>>24,t>>>16&255,t>>>8&255,255&t,i>>>24,i>>>16&255,i>>>8&255,255&i]},n.fromBytes=function(t,i,e){return e?n.fromBytesLE(t,i):n.fromBytesBE(t,i)},n.fromBytesLE=function(t,i){return new n(t[0]|t[1]<<8|t[2]<<16|t[3]<<24,t[4]|t[5]<<8|t[6]<<16|t[7]<<24,i)},n.fromBytesBE=function(t,i){return new n(t[4]<<24|t[5]<<16|t[6]<<8|t[7],t[0]<<24|t[1]<<16|t[2]<<8|t[3],i)}}])});

/*
 * slip.js: A plain JavaScript SLIP implementation that works in both the browser and Node.js
 *
 * Copyright 2014, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/*global exports, define*/
(function (root, factory) {
    "use strict";

    if (typeof exports === "object") {
        // We're in a CommonJS-style loader.
        root.slip = exports;
        factory(exports);
    } else if (typeof define === "function" && define.amd) {
        // We're in an AMD-style loader.
        define(["exports"], function (exports) {
            root.slip = exports;
            return (root.slip, factory(exports));
        });
    } else {
        // Plain old browser.
        root.slip = {};
        factory(root.slip);
    }
}(this, function (exports) {

    "use strict";

    var slip = exports;

    slip.END = 192;
    slip.ESC = 219;
    slip.ESC_END = 220;
    slip.ESC_ESC = 221;

    slip.byteArray = function (data, offset, length) {
        return data instanceof ArrayBuffer ? new Uint8Array(data, offset, length) : data;
    };

    slip.expandByteArray = function (arr) {
        var expanded = new Uint8Array(arr.length * 2);
        expanded.set(arr);

        return expanded;
    };

    slip.sliceByteArray = function (arr, start, end) {
        var sliced = arr.buffer.slice ? arr.buffer.slice(start, end) : arr.subarray(start, end);
        return new Uint8Array(sliced);
    };

    /**
     * SLIP encodes a byte array.
     *
     * @param {Array-like} data a Uint8Array, Node.js Buffer, ArrayBuffer, or [] containing raw bytes
     * @param {Object} options encoder options
     * @return {Uint8Array} the encoded copy of the data
     */
    slip.encode = function (data, o) {
        o = o || {};
        o.bufferPadding = o.bufferPadding || 4; // Will be rounded to the nearest 4 bytes.
        data = slip.byteArray(data, o.offset, o.byteLength);

        var bufLen = (data.length + o.bufferPadding + 3) & ~0x03,
            encoded = new Uint8Array(bufLen),
            j = 1;

        encoded[0] = slip.END;

        for (var i = 0; i < data.length; i++) {
            // We always need enough space for two value bytes plus a trailing END.
            if (j > encoded.length - 3) {
                encoded = slip.expandByteArray(encoded);
            }

            var val = data[i];
            if (val === slip.END) {
                encoded[j++] = slip.ESC;
                val = slip.ESC_END;
            } else if (val === slip.ESC) {
                encoded[j++] = slip.ESC;
                val = slip.ESC_ESC;
            }

            encoded[j++] = val;
        }

        encoded[j] = slip.END;
        return slip.sliceByteArray(encoded, 0, j + 1);
    };

    /**
     * Creates a new SLIP Decoder.
     * @constructor
     *
     * @param {Function} onMessage a callback function that will be invoked when a message has been fully decoded
     * @param {Number} maxBufferSize the maximum size of a incoming message; larger messages will throw an error
     */
    slip.Decoder = function (o) {
        o = typeof o !== "function" ? o || {} : {
            onMessage: o
        };

        this.maxMessageSize = o.maxMessageSize || 10485760; // Defaults to 10 MB.
        this.bufferSize = o.bufferSize || 1024; // Message buffer defaults to 1 KB.
        this.msgBuffer = new Uint8Array(this.bufferSize);
        this.msgBufferIdx = 0;
        this.onMessage = o.onMessage;
        this.onError = o.onError;
        this.escape = false;
    };

    var p = slip.Decoder.prototype;

    /**
     * Decodes a SLIP data packet.
     * The onMessage callback will be invoked when a complete message has been decoded.
     *
     * @param {Array-like} data an incoming stream of bytes
     */
    p.decode = function (data) {
        data = slip.byteArray(data);

        var msg;
        for (var i = 0; i < data.length; i++) {
            var val = data[i];

            if (this.escape) {
                if (val === slip.ESC_ESC) {
                    val = slip.ESC;
                } else if (val === slip.ESC_END) {
                    val = slip.END;
                }
            } else {
                if (val === slip.ESC) {
                    this.escape = true;
                    continue;
                }

                if (val === slip.END) {
                    msg = this.handleEnd();
                    continue;
                }
            }

            var more = this.addByte(val);
            if (!more) {
                this.handleMessageMaxError();
            }
        }

        return msg;
    };

    p.handleMessageMaxError = function () {
        if (this.onError) {
            this.onError(this.msgBuffer.subarray(0),
                "The message is too large; the maximum message size is " +
                this.maxMessageSize / 1024 + "KB. Use a larger maxMessageSize if necessary.");
        }

        // Reset everything and carry on.
        this.msgBufferIdx = 0;
        this.escape = false;
    };

    // Unsupported, non-API method.
    p.addByte = function (val) {
        if (this.msgBufferIdx > this.msgBuffer.length - 1) {
            this.msgBuffer = slip.expandByteArray(this.msgBuffer);
        }

        this.msgBuffer[this.msgBufferIdx++] = val;
        this.escape = false;

        return this.msgBuffer.length < this.maxMessageSize;
    };

    // Unsupported, non-API method.
    p.handleEnd = function () {
        if (this.msgBufferIdx === 0) {
            return; // Toss opening END byte and carry on.
        }

        var msg = slip.sliceByteArray(this.msgBuffer, 0, this.msgBufferIdx);
        if (this.onMessage) {
            this.onMessage(msg);
        }

        // Clear our pointer into the message buffer.
        this.msgBufferIdx = 0;

        return msg;
    };

    return slip;
}));
;
/*!
 * EventEmitter v5.2.9 - git.io/ee
 * Unlicense - http://unlicense.org/
 * Oliver Caldwell - https://oli.me.uk/
 * @preserve
 */

;(function (exports) {
    'use strict';

    /**
     * Class for managing events.
     * Can be extended to provide event functionality in other classes.
     *
     * @class EventEmitter Manages event registering and emitting.
     */
    function EventEmitter() {}

    // Shortcuts to improve speed and size
    var proto = EventEmitter.prototype;
    var originalGlobalValue = exports.EventEmitter;

    /**
     * Finds the index of the listener for the event in its storage array.
     *
     * @param {Function[]} listeners Array of listeners to search through.
     * @param {Function} listener Method to look for.
     * @return {Number} Index of the specified listener, -1 if not found
     * @api private
     */
    function indexOfListener(listeners, listener) {
        var i = listeners.length;
        while (i--) {
            if (listeners[i].listener === listener) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Alias a method while keeping the context correct, to allow for overwriting of target method.
     *
     * @param {String} name The name of the target method.
     * @return {Function} The aliased method
     * @api private
     */
    function alias(name) {
        return function aliasClosure() {
            return this[name].apply(this, arguments);
        };
    }

    /**
     * Returns the listener array for the specified event.
     * Will initialise the event object and listener arrays if required.
     * Will return an object if you use a regex search. The object contains keys for each matched event. So /ba[rz]/ might return an object containing bar and baz. But only if you have either defined them with defineEvent or added some listeners to them.
     * Each property in the object response is an array of listener functions.
     *
     * @param {String|RegExp} evt Name of the event to return the listeners from.
     * @return {Function[]|Object} All listener functions for the event.
     */
    proto.getListeners = function getListeners(evt) {
        var events = this._getEvents();
        var response;
        var key;

        // Return a concatenated array of all matching events if
        // the selector is a regular expression.
        if (evt instanceof RegExp) {
            response = {};
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    response[key] = events[key];
                }
            }
        }
        else {
            response = events[evt] || (events[evt] = []);
        }

        return response;
    };

    /**
     * Takes a list of listener objects and flattens it into a list of listener functions.
     *
     * @param {Object[]} listeners Raw listener objects.
     * @return {Function[]} Just the listener functions.
     */
    proto.flattenListeners = function flattenListeners(listeners) {
        var flatListeners = [];
        var i;

        for (i = 0; i < listeners.length; i += 1) {
            flatListeners.push(listeners[i].listener);
        }

        return flatListeners;
    };

    /**
     * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
     *
     * @param {String|RegExp} evt Name of the event to return the listeners from.
     * @return {Object} All listener functions for an event in an object.
     */
    proto.getListenersAsObject = function getListenersAsObject(evt) {
        var listeners = this.getListeners(evt);
        var response;

        if (listeners instanceof Array) {
            response = {};
            response[evt] = listeners;
        }

        return response || listeners;
    };

    function isValidListener (listener) {
        if (typeof listener === 'function' || listener instanceof RegExp) {
            return true
        } else if (listener && typeof listener === 'object') {
            return isValidListener(listener.listener)
        } else {
            return false
        }
    }

    /**
     * Adds a listener function to the specified event.
     * The listener will not be added if it is a duplicate.
     * If the listener returns true then it will be removed after it is called.
     * If you pass a regular expression as the event name then the listener will be added to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to attach the listener to.
     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addListener = function addListener(evt, listener) {
        if (!isValidListener(listener)) {
            throw new TypeError('listener must be a function');
        }

        var listeners = this.getListenersAsObject(evt);
        var listenerIsWrapped = typeof listener === 'object';
        var key;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
                listeners[key].push(listenerIsWrapped ? listener : {
                    listener: listener,
                    once: false
                });
            }
        }

        return this;
    };

    /**
     * Alias of addListener
     */
    proto.on = alias('addListener');

    /**
     * Semi-alias of addListener. It will add a listener that will be
     * automatically removed after its first execution.
     *
     * @param {String|RegExp} evt Name of the event to attach the listener to.
     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addOnceListener = function addOnceListener(evt, listener) {
        return this.addListener(evt, {
            listener: listener,
            once: true
        });
    };

    /**
     * Alias of addOnceListener.
     */
    proto.once = alias('addOnceListener');

    /**
     * Defines an event name. This is required if you want to use a regex to add a listener to multiple events at once. If you don't do this then how do you expect it to know what event to add to? Should it just add to every possible match for a regex? No. That is scary and bad.
     * You need to tell it what event names should be matched by a regex.
     *
     * @param {String} evt Name of the event to create.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.defineEvent = function defineEvent(evt) {
        this.getListeners(evt);
        return this;
    };

    /**
     * Uses defineEvent to define multiple events.
     *
     * @param {String[]} evts An array of event names to define.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.defineEvents = function defineEvents(evts) {
        for (var i = 0; i < evts.length; i += 1) {
            this.defineEvent(evts[i]);
        }
        return this;
    };

    /**
     * Removes a listener function from the specified event.
     * When passed a regular expression as the event name, it will remove the listener from all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to remove the listener from.
     * @param {Function} listener Method to remove from the event.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeListener = function removeListener(evt, listener) {
        var listeners = this.getListenersAsObject(evt);
        var index;
        var key;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key)) {
                index = indexOfListener(listeners[key], listener);

                if (index !== -1) {
                    listeners[key].splice(index, 1);
                }
            }
        }

        return this;
    };

    /**
     * Alias of removeListener
     */
    proto.off = alias('removeListener');

    /**
     * Adds listeners in bulk using the manipulateListeners method.
     * If you pass an object as the first argument you can add to multiple events at once. The object should contain key value pairs of events and listeners or listener arrays. You can also pass it an event name and an array of listeners to be added.
     * You can also pass it a regular expression to add the array of listeners to all events that match it.
     * Yeah, this function does quite a bit. That's probably a bad thing.
     *
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add to multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to add.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addListeners = function addListeners(evt, listeners) {
        // Pass through to manipulateListeners
        return this.manipulateListeners(false, evt, listeners);
    };

    /**
     * Removes listeners in bulk using the manipulateListeners method.
     * If you pass an object as the first argument you can remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
     * You can also pass it an event name and an array of listeners to be removed.
     * You can also pass it a regular expression to remove the listeners from all events that match it.
     *
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to remove from multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to remove.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeListeners = function removeListeners(evt, listeners) {
        // Pass through to manipulateListeners
        return this.manipulateListeners(true, evt, listeners);
    };

    /**
     * Edits listeners in bulk. The addListeners and removeListeners methods both use this to do their job. You should really use those instead, this is a little lower level.
     * The first argument will determine if the listeners are removed (true) or added (false).
     * If you pass an object as the second argument you can add/remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
     * You can also pass it an event name and an array of listeners to be added/removed.
     * You can also pass it a regular expression to manipulate the listeners of all events that match it.
     *
     * @param {Boolean} remove True if you want to remove listeners, false if you want to add.
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add/remove from multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to add/remove.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
        var i;
        var value;
        var single = remove ? this.removeListener : this.addListener;
        var multiple = remove ? this.removeListeners : this.addListeners;

        // If evt is an object then pass each of its properties to this method
        if (typeof evt === 'object' && !(evt instanceof RegExp)) {
            for (i in evt) {
                if (evt.hasOwnProperty(i) && (value = evt[i])) {
                    // Pass the single listener straight through to the singular method
                    if (typeof value === 'function') {
                        single.call(this, i, value);
                    }
                    else {
                        // Otherwise pass back to the multiple function
                        multiple.call(this, i, value);
                    }
                }
            }
        }
        else {
            // So evt must be a string
            // And listeners must be an array of listeners
            // Loop over it and pass each one to the multiple method
            i = listeners.length;
            while (i--) {
                single.call(this, evt, listeners[i]);
            }
        }

        return this;
    };

    /**
     * Removes all listeners from a specified event.
     * If you do not specify an event then all listeners will be removed.
     * That means every event will be emptied.
     * You can also pass a regex to remove all events that match it.
     *
     * @param {String|RegExp} [evt] Optional name of the event to remove all listeners for. Will remove from every event if not passed.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeEvent = function removeEvent(evt) {
        var type = typeof evt;
        var events = this._getEvents();
        var key;

        // Remove different things depending on the state of evt
        if (type === 'string') {
            // Remove all listeners for the specified event
            delete events[evt];
        }
        else if (evt instanceof RegExp) {
            // Remove all events matching the regex.
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    delete events[key];
                }
            }
        }
        else {
            // Remove all listeners in all events
            delete this._events;
        }

        return this;
    };

    /**
     * Alias of removeEvent.
     *
     * Added to mirror the node API.
     */
    proto.removeAllListeners = alias('removeEvent');

    /**
     * Emits an event of your choice.
     * When emitted, every listener attached to that event will be executed.
     * If you pass the optional argument array then those arguments will be passed to every listener upon execution.
     * Because it uses `apply`, your array of arguments will be passed as if you wrote them out separately.
     * So they will not arrive within the array on the other side, they will be separate.
     * You can also pass a regular expression to emit to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
     * @param {Array} [args] Optional array of arguments to be passed to each listener.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.emitEvent = function emitEvent(evt, args) {
        var listenersMap = this.getListenersAsObject(evt);
        var listeners;
        var listener;
        var i;
        var key;
        var response;

        for (key in listenersMap) {
            if (listenersMap.hasOwnProperty(key)) {
                listeners = listenersMap[key].slice(0);

                for (i = 0; i < listeners.length; i++) {
                    // If the listener returns true then it shall be removed from the event
                    // The function is executed either with a basic call or an apply if there is an args array
                    listener = listeners[i];

                    if (listener.once === true) {
                        this.removeListener(evt, listener.listener);
                    }

                    response = listener.listener.apply(this, args || []);

                    if (response === this._getOnceReturnValue()) {
                        this.removeListener(evt, listener.listener);
                    }
                }
            }
        }

        return this;
    };

    /**
     * Alias of emitEvent
     */
    proto.trigger = alias('emitEvent');

    /**
     * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
     * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
     * @param {...*} Optional additional arguments to be passed to each listener.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.emit = function emit(evt) {
        var args = Array.prototype.slice.call(arguments, 1);
        return this.emitEvent(evt, args);
    };

    /**
     * Sets the current value to check against when executing listeners. If a
     * listeners return value matches the one set here then it will be removed
     * after execution. This value defaults to true.
     *
     * @param {*} value The new value to check for when executing listeners.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.setOnceReturnValue = function setOnceReturnValue(value) {
        this._onceReturnValue = value;
        return this;
    };

    /**
     * Fetches the current value to check against when executing listeners. If
     * the listeners return value matches this one then it should be removed
     * automatically. It will return true by default.
     *
     * @return {*|Boolean} The current value to check for or the default, true.
     * @api private
     */
    proto._getOnceReturnValue = function _getOnceReturnValue() {
        if (this.hasOwnProperty('_onceReturnValue')) {
            return this._onceReturnValue;
        }
        else {
            return true;
        }
    };

    /**
     * Fetches the events object and creates one if required.
     *
     * @return {Object} The events storage object.
     * @api private
     */
    proto._getEvents = function _getEvents() {
        return this._events || (this._events = {});
    };

    /**
     * Reverts the global {@link EventEmitter} to its previous value and returns a reference to this version.
     *
     * @return {Function} Non conflicting EventEmitter class.
     */
    EventEmitter.noConflict = function noConflict() {
        exports.EventEmitter = originalGlobalValue;
        return EventEmitter;
    };

    // Expose the class either via AMD, CommonJS or the global object
    if (typeof define === 'function' && define.amd) {
        define(function () {
            return EventEmitter;
        });
    }
    else if (typeof module === 'object' && module.exports){
        module.exports = EventEmitter;
    }
    else {
        exports.EventEmitter = EventEmitter;
    }
}(typeof window !== 'undefined' ? window : this || {}));
;
/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * Cross-platform base transport library for osc.js.
 *
 * Copyright 2014-2016, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/* global require, module */

var osc = osc || require("./osc.js"),
    slip = slip || require("slip"),
    EventEmitter = EventEmitter || require("events").EventEmitter;

(function () {

    "use strict";

    osc.supportsSerial = false;

    // Unsupported, non-API function.
    osc.firePacketEvents = function (port, packet, timeTag, packetInfo) {
        if (packet.address) {
            port.emit("message", packet, timeTag, packetInfo);
        } else {
            osc.fireBundleEvents(port, packet, timeTag, packetInfo);
        }
    };

    // Unsupported, non-API function.
    osc.fireBundleEvents = function (port, bundle, timeTag, packetInfo) {
        port.emit("bundle", bundle, timeTag, packetInfo);
        for (var i = 0; i < bundle.packets.length; i++) {
            var packet = bundle.packets[i];
            osc.firePacketEvents(port, packet, bundle.timeTag, packetInfo);
        }
    };

    osc.fireClosedPortSendError = function (port, msg) {
        msg = msg || "Can't send packets on a closed osc.Port object. Please open (or reopen) this Port by calling open().";

        port.emit("error", msg);
    };

    osc.Port = function (options) {
        this.options = options || {};
        this.on("data", this.decodeOSC.bind(this));
    };

    var p = osc.Port.prototype = Object.create(EventEmitter.prototype);
    p.constructor = osc.Port;

    p.send = function (oscPacket) {
        var args = Array.prototype.slice.call(arguments),
            encoded = this.encodeOSC(oscPacket),
            buf = osc.nativeBuffer(encoded);

        args[0] = buf;
        this.sendRaw.apply(this, args);
    };

    p.encodeOSC = function (packet) {
        // TODO gh-39: This is unsafe; we should only access the underlying
        // buffer within the range of its view.
        packet = packet.buffer ? packet.buffer : packet;
        var encoded;

        try {
            encoded = osc.writePacket(packet, this.options);
        } catch (err) {
            this.emit("error", err);
        }

        return encoded;
    };

    p.decodeOSC = function (data, packetInfo) {
        data = osc.byteArray(data);
        this.emit("raw", data, packetInfo);

        try {
            var packet = osc.readPacket(data, this.options);
            this.emit("osc", packet, packetInfo);
            osc.firePacketEvents(this, packet, undefined, packetInfo);
        } catch (err) {
            this.emit("error", err);
        }
    };


    osc.SLIPPort = function (options) {
        var that = this;
        var o = this.options = options || {};
        o.useSLIP = o.useSLIP === undefined ? true : o.useSLIP;

        this.decoder = new slip.Decoder({
            onMessage: this.decodeOSC.bind(this),
            onError: function (err) {
                that.emit("error", err);
            }
        });

        var decodeHandler = o.useSLIP ? this.decodeSLIPData : this.decodeOSC;
        this.on("data", decodeHandler.bind(this));
    };

    p = osc.SLIPPort.prototype = Object.create(osc.Port.prototype);
    p.constructor = osc.SLIPPort;

    p.encodeOSC = function (packet) {
        // TODO gh-39: This is unsafe; we should only access the underlying
        // buffer within the range of its view.
        packet = packet.buffer ? packet.buffer : packet;
        var framed;

        try {
            var encoded = osc.writePacket(packet, this.options);
            framed = slip.encode(encoded);
        } catch (err) {
            this.emit("error", err);
        }

        return framed;
    };

    p.decodeSLIPData = function (data, packetInfo) {
        // TODO: Get packetInfo through SLIP decoder.
        this.decoder.decode(data, packetInfo);
    };


    // Unsupported, non-API function.
    osc.relay = function (from, to, eventName, sendFnName, transformFn, sendArgs) {
        eventName = eventName || "message";
        sendFnName = sendFnName || "send";
        transformFn = transformFn || function () {};
        sendArgs = sendArgs ? [null].concat(sendArgs) : [];

        var listener = function (data) {
            sendArgs[0] = data;
            data = transformFn(data);
            to[sendFnName].apply(to, sendArgs);
        };

        from.on(eventName, listener);

        return {
            eventName: eventName,
            listener: listener
        };
    };

    // Unsupported, non-API function.
    osc.relayPorts = function (from, to, o) {
        var eventName = o.raw ? "raw" : "osc",
            sendFnName = o.raw ? "sendRaw" : "send";

        return osc.relay(from, to, eventName, sendFnName, o.transform);
    };

    // Unsupported, non-API function.
    osc.stopRelaying = function (from, relaySpec) {
        from.removeListener(relaySpec.eventName, relaySpec.listener);
    };


    /**
     * A Relay connects two sources of OSC data together,
     * relaying all OSC messages received by each port to the other.
     * @constructor
     *
     * @param {osc.Port} port1 the first port to relay
     * @param {osc.Port} port2 the second port to relay
     * @param {Object} options the configuration options for this relay
     */
    osc.Relay = function (port1, port2, options) {
        var o = this.options = options || {};
        o.raw = false;

        this.port1 = port1;
        this.port2 = port2;

        this.listen();
    };

    p = osc.Relay.prototype = Object.create(EventEmitter.prototype);
    p.constructor = osc.Relay;

    p.open = function () {
        this.port1.open();
        this.port2.open();
    };

    p.listen = function () {
        if (this.port1Spec && this.port2Spec) {
            this.close();
        }

        this.port1Spec = osc.relayPorts(this.port1, this.port2, this.options);
        this.port2Spec = osc.relayPorts(this.port2, this.port1, this.options);

        // Bind port close listeners to ensure that the relay
        // will stop forwarding messages if one of its ports close.
        // Users are still responsible for closing the underlying ports
        // if necessary.
        var closeListener = this.close.bind(this);
        this.port1.on("close", closeListener);
        this.port2.on("close", closeListener);
    };

    p.close = function () {
        osc.stopRelaying(this.port1, this.port1Spec);
        osc.stopRelaying(this.port2, this.port2Spec);
        this.emit("close", this.port1, this.port2);
    };


    // If we're in a require-compatible environment, export ourselves.
    if (typeof module !== "undefined" && module.exports) {
        module.exports = osc;
    }
}());
;
/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * Cross-Platform Web Socket client transport for osc.js.
 *
 * Copyright 2014-2016, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/*global WebSocket, require*/

var osc = osc || require("./osc.js");

(function () {

    "use strict";

    osc.WebSocket = typeof WebSocket !== "undefined" ? WebSocket : require ("ws");

    osc.WebSocketPort = function (options) {
        osc.Port.call(this, options);
        this.on("open", this.listen.bind(this));

        this.socket = options.socket;
        if (this.socket) {
            if (this.socket.readyState === 1) {
                osc.WebSocketPort.setupSocketForBinary(this.socket);
                this.emit("open", this.socket);
            } else {
                this.open();
            }
        }
    };

    var p = osc.WebSocketPort.prototype = Object.create(osc.Port.prototype);
    p.constructor = osc.WebSocketPort;

    p.open = function () {
        if (!this.socket || this.socket.readyState > 1) {
            this.socket = new osc.WebSocket(this.options.url);
        }

        osc.WebSocketPort.setupSocketForBinary(this.socket);

        var that = this;
        this.socket.onopen = function () {
            that.emit("open", that.socket);
        };

        this.socket.onerror = function (err) {
            that.emit("error", err);
        };
    };

    p.listen = function () {
        var that = this;
        this.socket.onmessage = function (e) {
            that.emit("data", e.data, e);
        };

        this.socket.onclose = function (e) {
            that.emit("close", e);
        };

        that.emit("ready");
    };

    p.sendRaw = function (encoded) {
        if (!this.socket || this.socket.readyState !== 1) {
            osc.fireClosedPortSendError(this);
            return;
        }

        this.socket.send(encoded);
    };

    p.close = function (code, reason) {
        this.socket.close(code, reason);
    };

    osc.WebSocketPort.setupSocketForBinary = function (socket) {
        socket.binaryType = osc.isNode ? "nodebuffer" : "arraybuffer";
    };

}());

}).call(this,require('_process'),require("buffer").Buffer)

},{"./osc.js":191,"_process":195,"buffer":92,"events":99,"long":184,"slip":210,"ws":192}],191:[function(require,module,exports){
(function (process,Buffer){
/*! osc.js 2.4.1, Copyright 2021 Colin Clark | github.com/colinbdclark/osc.js */

/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * Copyright 2014-2016, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/* global require, module, process, Buffer, Long, util */

var osc = osc || {};

(function () {

    "use strict";

    osc.SECS_70YRS = 2208988800;
    osc.TWO_32 = 4294967296;

    osc.defaults = {
        metadata: false,
        unpackSingleArgs: true
    };

    // Unsupported, non-API property.
    osc.isCommonJS = typeof module !== "undefined" && module.exports ? true : false;

    // Unsupported, non-API property.
    osc.isNode = osc.isCommonJS && typeof window === "undefined";

    // Unsupported, non-API property.
    osc.isElectron = typeof process !== "undefined" &&
        process.versions && process.versions.electron ? true : false;

    // Unsupported, non-API property.
    osc.isBufferEnv = osc.isNode || osc.isElectron;

    // Unsupported, non-API function.
    osc.isArray = function (obj) {
        return obj && Object.prototype.toString.call(obj) === "[object Array]";
    };

    // Unsupported, non-API function.
    osc.isTypedArrayView = function (obj) {
        return obj.buffer && obj.buffer instanceof ArrayBuffer;
    };

    // Unsupported, non-API function.
    osc.isBuffer = function (obj) {
        return osc.isBufferEnv && obj instanceof Buffer;
    };

    // Unsupported, non-API member.
    osc.Long = typeof Long !== "undefined" ? Long :
        osc.isNode ? require("long") : undefined;

    // Unsupported, non-API member. Can be removed when supported versions
    // of Node.js expose TextDecoder as a global, as in the browser.
    osc.TextDecoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8") :
        typeof util !== "undefined" && typeof (util.TextDecoder !== "undefined") ? new util.TextDecoder("utf-8") : undefined;

    osc.TextEncoder = typeof TextEncoder !== "undefined" ? new TextEncoder("utf-8") :
        typeof util !== "undefined" && typeof (util.TextEncoder !== "undefined") ? new util.TextEncoder("utf-8") : undefined;

    /**
     * Wraps the specified object in a DataView.
     *
     * @param {Array-like} obj the object to wrap in a DataView instance
     * @return {DataView} the DataView object
     */
    // Unsupported, non-API function.
    osc.dataView = function (obj, offset, length) {
        if (obj.buffer) {
            return new DataView(obj.buffer, offset, length);
        }

        if (obj instanceof ArrayBuffer) {
            return new DataView(obj, offset, length);
        }

        return new DataView(new Uint8Array(obj), offset, length);
    };

    /**
     * Takes an ArrayBuffer, TypedArray, DataView, Buffer, or array-like object
     * and returns a Uint8Array view of it.
     *
     * Throws an error if the object isn't suitably array-like.
     *
     * @param {Array-like or Array-wrapping} obj an array-like or array-wrapping object
     * @returns {Uint8Array} a typed array of octets
     */
    // Unsupported, non-API function.
    osc.byteArray = function (obj) {
        if (obj instanceof Uint8Array) {
            return obj;
        }

        var buf = obj.buffer ? obj.buffer : obj;

        if (!(buf instanceof ArrayBuffer) && (typeof buf.length === "undefined" || typeof buf === "string")) {
            throw new Error("Can't wrap a non-array-like object as Uint8Array. Object was: " +
                JSON.stringify(obj, null, 2));
        }


        // TODO gh-39: This is a potentially unsafe algorithm;
        // if we're getting anything other than a TypedArrayView (such as a DataView),
        // we really need to determine the range of the view it is viewing.
        return new Uint8Array(buf);
    };

    /**
     * Takes an ArrayBuffer, TypedArray, DataView, or array-like object
     * and returns a native buffer object
     * (i.e. in Node.js, a Buffer object and in the browser, a Uint8Array).
     *
     * Throws an error if the object isn't suitably array-like.
     *
     * @param {Array-like or Array-wrapping} obj an array-like or array-wrapping object
     * @returns {Buffer|Uint8Array} a buffer object
     */
    // Unsupported, non-API function.
    osc.nativeBuffer = function (obj) {
        if (osc.isBufferEnv) {
            return osc.isBuffer(obj) ? obj :
                Buffer.from(obj.buffer ? obj : new Uint8Array(obj));
        }

        return osc.isTypedArrayView(obj) ? obj : new Uint8Array(obj);
    };

    // Unsupported, non-API function
    osc.copyByteArray = function (source, target, offset) {
        if (osc.isTypedArrayView(source) && osc.isTypedArrayView(target)) {
            target.set(source, offset);
        } else {
            var start = offset === undefined ? 0 : offset,
                len = Math.min(target.length - offset, source.length);

            for (var i = 0, j = start; i < len; i++, j++) {
                target[j] = source[i];
            }
        }

        return target;
    };

    /**
     * Reads an OSC-formatted string.
     *
     * @param {DataView} dv a DataView containing the raw bytes of the OSC string
     * @param {Object} offsetState an offsetState object used to store the current offset index
     * @return {String} the JavaScript String that was read
     */
    osc.readString = function (dv, offsetState) {
        var charCodes = [],
            idx = offsetState.idx;

        for (; idx < dv.byteLength; idx++) {
            var charCode = dv.getUint8(idx);
            if (charCode !== 0) {
                charCodes.push(charCode);
            } else {
                idx++;
                break;
            }
        }

        // Round to the nearest 4-byte block.
        idx = (idx + 3) & ~0x03;
        offsetState.idx = idx;

        var decoder = osc.isBufferEnv ? osc.readString.withBuffer :
            osc.TextDecoder ? osc.readString.withTextDecoder : osc.readString.raw;

        return decoder(charCodes);
    };

    osc.readString.raw = function (charCodes) {
        // If no Buffer or TextDecoder, resort to fromCharCode
        // This does not properly decode multi-byte Unicode characters.
        var str = "";
        var sliceSize = 10000;

        // Processing the array in chunks so as not to exceed argument
        // limit, see https://bugs.webkit.org/show_bug.cgi?id=80797
        for (var i = 0; i < charCodes.length; i += sliceSize) {
            str += String.fromCharCode.apply(null, charCodes.slice(i, i + sliceSize));
        }

        return str;
    };

    osc.readString.withTextDecoder = function (charCodes) {
        var data = new Int8Array(charCodes);
        return osc.TextDecoder.decode(data);
    };

    osc.readString.withBuffer = function (charCodes) {
        return Buffer.from(charCodes).toString("utf-8");
    };

    /**
     * Writes a JavaScript string as an OSC-formatted string.
     *
     * @param {String} str the string to write
     * @return {Uint8Array} a buffer containing the OSC-formatted string
     */
    osc.writeString = function (str) {
        var terminated = str + "\u0000",
            len = terminated.length,
            paddedLen = (len + 3) & ~0x03,
            arr = new Uint8Array(paddedLen);

        var encoder = osc.isBufferEnv ? osc.writeString.withBuffer :
            osc.TextEncoder ? osc.writeString.withTextEncoder : null,
            encodedStr;

        if (encoder) {
            encodedStr = encoder(terminated);
        }

        for (var i = 0; i < terminated.length; i++) {
            var charCode = encoder ? encodedStr[i] : terminated.charCodeAt(i);
            arr[i] = charCode;
        }

        return arr;
    };

    osc.writeString.withTextEncoder = function (str) {
        return osc.TextEncoder.encode(str);
    };

    osc.writeString.withBuffer = function (str) {
        return Buffer.from(str);
    };

    // Unsupported, non-API function.
    osc.readPrimitive = function (dv, readerName, numBytes, offsetState) {
        var val = dv[readerName](offsetState.idx, false);
        offsetState.idx += numBytes;

        return val;
    };

    // Unsupported, non-API function.
    osc.writePrimitive = function (val, dv, writerName, numBytes, offset) {
        offset = offset === undefined ? 0 : offset;

        var arr;
        if (!dv) {
            arr = new Uint8Array(numBytes);
            dv = new DataView(arr.buffer);
        } else {
            arr = new Uint8Array(dv.buffer);
        }

        dv[writerName](offset, val, false);

        return arr;
    };

    /**
     * Reads an OSC int32 ("i") value.
     *
     * @param {DataView} dv a DataView containing the raw bytes
     * @param {Object} offsetState an offsetState object used to store the current offset index into dv
     * @return {Number} the number that was read
     */
    osc.readInt32 = function (dv, offsetState) {
        return osc.readPrimitive(dv, "getInt32", 4, offsetState);
    };

    /**
     * Writes an OSC int32 ("i") value.
     *
     * @param {Number} val the number to write
     * @param {DataView} [dv] a DataView instance to write the number into
     * @param {Number} [offset] an offset into dv
     */
    osc.writeInt32 = function (val, dv, offset) {
        return osc.writePrimitive(val, dv, "setInt32", 4, offset);
    };

    /**
     * Reads an OSC int64 ("h") value.
     *
     * @param {DataView} dv a DataView containing the raw bytes
     * @param {Object} offsetState an offsetState object used to store the current offset index into dv
     * @return {Number} the number that was read
     */
    osc.readInt64 = function (dv, offsetState) {
        var high = osc.readPrimitive(dv, "getInt32", 4, offsetState),
            low = osc.readPrimitive(dv, "getInt32", 4, offsetState);

        if (osc.Long) {
            return new osc.Long(low, high);
        } else {
            return {
                high: high,
                low: low,
                unsigned: false
            };
        }
    };

    /**
     * Writes an OSC int64 ("h") value.
     *
     * @param {Number} val the number to write
     * @param {DataView} [dv] a DataView instance to write the number into
     * @param {Number} [offset] an offset into dv
     */
    osc.writeInt64 = function (val, dv, offset) {
        var arr = new Uint8Array(8);
        arr.set(osc.writePrimitive(val.high, dv, "setInt32", 4, offset), 0);
        arr.set(osc.writePrimitive(val.low,  dv, "setInt32", 4, offset + 4), 4);
        return arr;
    };

    /**
     * Reads an OSC float32 ("f") value.
     *
     * @param {DataView} dv a DataView containing the raw bytes
     * @param {Object} offsetState an offsetState object used to store the current offset index into dv
     * @return {Number} the number that was read
     */
    osc.readFloat32 = function (dv, offsetState) {
        return osc.readPrimitive(dv, "getFloat32", 4, offsetState);
    };

    /**
     * Writes an OSC float32 ("f") value.
     *
     * @param {Number} val the number to write
     * @param {DataView} [dv] a DataView instance to write the number into
     * @param {Number} [offset] an offset into dv
     */
    osc.writeFloat32 = function (val, dv, offset) {
        return osc.writePrimitive(val, dv, "setFloat32", 4, offset);
    };

    /**
     * Reads an OSC float64 ("d") value.
     *
     * @param {DataView} dv a DataView containing the raw bytes
     * @param {Object} offsetState an offsetState object used to store the current offset index into dv
     * @return {Number} the number that was read
     */
    osc.readFloat64 = function (dv, offsetState) {
        return osc.readPrimitive(dv, "getFloat64", 8, offsetState);
    };

    /**
     * Writes an OSC float64 ("d") value.
     *
     * @param {Number} val the number to write
     * @param {DataView} [dv] a DataView instance to write the number into
     * @param {Number} [offset] an offset into dv
     */
    osc.writeFloat64 = function (val, dv, offset) {
        return osc.writePrimitive(val, dv, "setFloat64", 8, offset);
    };

    /**
     * Reads an OSC 32-bit ASCII character ("c") value.
     *
     * @param {DataView} dv a DataView containing the raw bytes
     * @param {Object} offsetState an offsetState object used to store the current offset index into dv
     * @return {String} a string containing the read character
     */
    osc.readChar32 = function (dv, offsetState) {
        var charCode = osc.readPrimitive(dv, "getUint32", 4, offsetState);
        return String.fromCharCode(charCode);
    };

    /**
     * Writes an OSC 32-bit ASCII character ("c") value.
     *
     * @param {String} str the string from which the first character will be written
     * @param {DataView} [dv] a DataView instance to write the character into
     * @param {Number} [offset] an offset into dv
     * @return {String} a string containing the read character
     */
    osc.writeChar32 = function (str, dv, offset) {
        var charCode = str.charCodeAt(0);
        if (charCode === undefined || charCode < -1) {
            return undefined;
        }

        return osc.writePrimitive(charCode, dv, "setUint32", 4, offset);
    };

    /**
     * Reads an OSC blob ("b") (i.e. a Uint8Array).
     *
     * @param {DataView} dv a DataView instance to read from
     * @param {Object} offsetState an offsetState object used to store the current offset index into dv
     * @return {Uint8Array} the data that was read
     */
    osc.readBlob = function (dv, offsetState) {
        var len = osc.readInt32(dv, offsetState),
            paddedLen = (len + 3) & ~0x03,
            blob = new Uint8Array(dv.buffer, offsetState.idx, len);

        offsetState.idx += paddedLen;

        return blob;
    };

    /**
     * Writes a raw collection of bytes to a new ArrayBuffer.
     *
     * @param {Array-like} data a collection of octets
     * @return {ArrayBuffer} a buffer containing the OSC-formatted blob
     */
    osc.writeBlob = function (data) {
        data = osc.byteArray(data);

        var len = data.byteLength,
            paddedLen = (len + 3) & ~0x03,
            offset = 4, // Extra 4 bytes is for the size.
            blobLen = paddedLen + offset,
            arr = new Uint8Array(blobLen),
            dv = new DataView(arr.buffer);

        // Write the size.
        osc.writeInt32(len, dv);

        // Since we're writing to a real ArrayBuffer,
        // we don't need to pad the remaining bytes.
        arr.set(data, offset);

        return arr;
    };

    /**
     * Reads an OSC 4-byte MIDI message.
     *
     * @param {DataView} dv the DataView instance to read from
     * @param {Object} offsetState an offsetState object used to store the current offset index into dv
     * @return {Uint8Array} an array containing (in order) the port ID, status, data1 and data1 bytes
     */
    osc.readMIDIBytes = function (dv, offsetState) {
        var midi = new Uint8Array(dv.buffer, offsetState.idx, 4);
        offsetState.idx += 4;

        return midi;
    };

    /**
     * Writes an OSC 4-byte MIDI message.
     *
     * @param {Array-like} bytes a 4-element array consisting of the port ID, status, data1 and data1 bytes
     * @return {Uint8Array} the written message
     */
    osc.writeMIDIBytes = function (bytes) {
        bytes = osc.byteArray(bytes);

        var arr = new Uint8Array(4);
        arr.set(bytes);

        return arr;
    };

    /**
     * Reads an OSC RGBA colour value.
     *
     * @param {DataView} dv the DataView instance to read from
     * @param {Object} offsetState an offsetState object used to store the current offset index into dv
     * @return {Object} a colour object containing r, g, b, and a properties
     */
    osc.readColor = function (dv, offsetState) {
        var bytes = new Uint8Array(dv.buffer, offsetState.idx, 4),
            alpha = bytes[3] / 255;

        offsetState.idx += 4;

        return {
            r: bytes[0],
            g: bytes[1],
            b: bytes[2],
            a: alpha
        };
    };

    /**
     * Writes an OSC RGBA colour value.
     *
     * @param {Object} color a colour object containing r, g, b, and a properties
     * @return {Uint8Array} a byte array containing the written color
     */
    osc.writeColor = function (color) {
        var alpha = Math.round(color.a * 255),
            arr = new Uint8Array([color.r, color.g, color.b, alpha]);

        return arr;
    };

    /**
     * Reads an OSC true ("T") value by directly returning the JavaScript Boolean "true".
     */
    osc.readTrue = function () {
        return true;
    };

    /**
     * Reads an OSC false ("F") value by directly returning the JavaScript Boolean "false".
     */
    osc.readFalse = function () {
        return false;
    };

    /**
     * Reads an OSC nil ("N") value by directly returning the JavaScript "null" value.
     */
    osc.readNull = function () {
        return null;
    };

    /**
     * Reads an OSC impulse/bang/infinitum ("I") value by directly returning 1.0.
     */
    osc.readImpulse = function () {
        return 1.0;
    };

    /**
     * Reads an OSC time tag ("t").
     *
     * @param {DataView} dv the DataView instance to read from
     * @param {Object} offsetState an offset state object containing the current index into dv
     * @param {Object} a time tag object containing both the raw NTP as well as the converted native (i.e. JS/UNIX) time
     */
    osc.readTimeTag = function (dv, offsetState) {
        var secs1900 = osc.readPrimitive(dv, "getUint32", 4, offsetState),
            frac = osc.readPrimitive(dv, "getUint32", 4, offsetState),
            native = (secs1900 === 0 && frac === 1) ? Date.now() : osc.ntpToJSTime(secs1900, frac);

        return {
            raw: [secs1900, frac],
            native: native
        };
    };

    /**
     * Writes an OSC time tag ("t").
     *
     * Takes, as its argument, a time tag object containing either a "raw" or "native property."
     * The raw timestamp must conform to the NTP standard representation, consisting of two unsigned int32
     * values. The first represents the number of seconds since January 1, 1900; the second, fractions of a second.
     * "Native" JavaScript timestamps are specified as a Number representing milliseconds since January 1, 1970.
     *
     * @param {Object} timeTag time tag object containing either a native JS timestamp (in ms) or a NTP timestamp pair
     * @return {Uint8Array} raw bytes for the written time tag
     */
    osc.writeTimeTag = function (timeTag) {
        var raw = timeTag.raw ? timeTag.raw : osc.jsToNTPTime(timeTag.native),
            arr = new Uint8Array(8), // Two Unit32s.
            dv = new DataView(arr.buffer);

        osc.writeInt32(raw[0], dv, 0);
        osc.writeInt32(raw[1], dv, 4);

        return arr;
    };

    /**
     * Produces a time tag containing a raw NTP timestamp
     * relative to now by the specified number of seconds.
     *
     * @param {Number} secs the number of seconds relative to now (i.e. + for the future, - for the past)
     * @param {Number} now the number of milliseconds since epoch to use as the current time. Defaults to Date.now()
     * @return {Object} the time tag
     */
    osc.timeTag = function (secs, now) {
        secs = secs || 0;
        now = now || Date.now();

        var nowSecs = now / 1000,
            nowWhole = Math.floor(nowSecs),
            nowFracs = nowSecs - nowWhole,
            secsWhole = Math.floor(secs),
            secsFracs = secs - secsWhole,
            fracs = nowFracs + secsFracs;

        if (fracs > 1) {
            var fracsWhole = Math.floor(fracs),
                fracsFracs = fracs - fracsWhole;

            secsWhole += fracsWhole;
            fracs = fracsFracs;
        }

        var ntpSecs = nowWhole + secsWhole + osc.SECS_70YRS,
            ntpFracs = Math.round(osc.TWO_32 * fracs);

        return {
            raw: [ntpSecs, ntpFracs]
        };
    };

    /**
     * Converts OSC's standard time tag representation (which is the NTP format)
     * into the JavaScript/UNIX format in milliseconds.
     *
     * @param {Number} secs1900 the number of seconds since 1900
     * @param {Number} frac the number of fractions of a second (between 0 and 2^32)
     * @return {Number} a JavaScript-compatible timestamp in milliseconds
     */
    osc.ntpToJSTime = function (secs1900, frac) {
        var secs1970 = secs1900 - osc.SECS_70YRS,
            decimals = frac / osc.TWO_32,
            msTime = (secs1970 + decimals) * 1000;

        return msTime;
    };

    osc.jsToNTPTime = function (jsTime) {
        var secs = jsTime / 1000,
            secsWhole = Math.floor(secs),
            secsFrac = secs - secsWhole,
            ntpSecs = secsWhole + osc.SECS_70YRS,
            ntpFracs = Math.round(osc.TWO_32 * secsFrac);

        return [ntpSecs, ntpFracs];
    };

    /**
     * Reads the argument portion of an OSC message.
     *
     * @param {DataView} dv a DataView instance to read from
     * @param {Object} offsetState the offsetState object that stores the current offset into dv
     * @param {Object} [options] read options
     * @return {Array} an array of the OSC arguments that were read
     */
    osc.readArguments = function (dv, options, offsetState) {
        var typeTagString = osc.readString(dv, offsetState);
        if (typeTagString.indexOf(",") !== 0) {
            // Despite what the OSC 1.0 spec says,
            // it just doesn't make sense to handle messages without type tags.
            // scsynth appears to read such messages as if they have a single
            // Uint8 argument. sclang throws an error if the type tag is omitted.
            throw new Error("A malformed type tag string was found while reading " +
                "the arguments of an OSC message. String was: " +
                typeTagString, " at offset: " + offsetState.idx);
        }

        var argTypes = typeTagString.substring(1).split(""),
            args = [];

        osc.readArgumentsIntoArray(args, argTypes, typeTagString, dv, options, offsetState);

        return args;
    };

    // Unsupported, non-API function.
    osc.readArgument = function (argType, typeTagString, dv, options, offsetState) {
        var typeSpec = osc.argumentTypes[argType];
        if (!typeSpec) {
            throw new Error("'" + argType + "' is not a valid OSC type tag. Type tag string was: " + typeTagString);
        }

        var argReader = typeSpec.reader,
            arg = osc[argReader](dv, offsetState);

        if (options.metadata) {
            arg = {
                type: argType,
                value: arg
            };
        }

        return arg;
    };

    // Unsupported, non-API function.
    osc.readArgumentsIntoArray = function (arr, argTypes, typeTagString, dv, options, offsetState) {
        var i = 0;

        while (i < argTypes.length) {
            var argType = argTypes[i],
                arg;

            if (argType === "[") {
                var fromArrayOpen = argTypes.slice(i + 1),
                    endArrayIdx = fromArrayOpen.indexOf("]");

                if (endArrayIdx < 0) {
                    throw new Error("Invalid argument type tag: an open array type tag ('[') was found " +
                        "without a matching close array tag ('[]'). Type tag was: " + typeTagString);
                }

                var typesInArray = fromArrayOpen.slice(0, endArrayIdx);
                arg = osc.readArgumentsIntoArray([], typesInArray, typeTagString, dv, options, offsetState);
                i += endArrayIdx + 2;
            } else {
                arg = osc.readArgument(argType, typeTagString, dv, options, offsetState);
                i++;
            }

            arr.push(arg);
        }

        return arr;
    };

    /**
     * Writes the specified arguments.
     *
     * @param {Array} args an array of arguments
     * @param {Object} options options for writing
     * @return {Uint8Array} a buffer containing the OSC-formatted argument type tag and values
     */
    osc.writeArguments = function (args, options) {
        var argCollection = osc.collectArguments(args, options);
        return osc.joinParts(argCollection);
    };

    // Unsupported, non-API function.
    osc.joinParts = function (dataCollection) {
        var buf = new Uint8Array(dataCollection.byteLength),
            parts = dataCollection.parts,
            offset = 0;

        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            osc.copyByteArray(part, buf, offset);
            offset += part.length;
        }

        return buf;
    };

    // Unsupported, non-API function.
    osc.addDataPart = function (dataPart, dataCollection) {
        dataCollection.parts.push(dataPart);
        dataCollection.byteLength += dataPart.length;
    };

    osc.writeArrayArguments = function (args, dataCollection) {
        var typeTag = "[";

        for (var i = 0; i < args.length; i++) {
            var arg = args[i];
            typeTag += osc.writeArgument(arg, dataCollection);
        }

        typeTag += "]";

        return typeTag;
    };

    osc.writeArgument = function (arg, dataCollection) {
        if (osc.isArray(arg)) {
            return osc.writeArrayArguments(arg, dataCollection);
        }

        var type = arg.type,
            writer = osc.argumentTypes[type].writer;

        if (writer) {
            var data = osc[writer](arg.value);
            osc.addDataPart(data, dataCollection);
        }

        return arg.type;
    };

    // Unsupported, non-API function.
    osc.collectArguments = function (args, options, dataCollection) {
        if (!osc.isArray(args)) {
            args = typeof args === "undefined" ? [] : [args];
        }

        dataCollection = dataCollection || {
            byteLength: 0,
            parts: []
        };

        if (!options.metadata) {
            args = osc.annotateArguments(args);
        }

        var typeTagString = ",",
            currPartIdx = dataCollection.parts.length;

        for (var i = 0; i < args.length; i++) {
            var arg = args[i];
            typeTagString += osc.writeArgument(arg, dataCollection);
        }

        var typeData = osc.writeString(typeTagString);
        dataCollection.byteLength += typeData.byteLength;
        dataCollection.parts.splice(currPartIdx, 0, typeData);

        return dataCollection;
    };

    /**
     * Reads an OSC message.
     *
     * @param {Array-like} data an array of bytes to read from
     * @param {Object} [options] read options
     * @param {Object} [offsetState] an offsetState object that stores the current offset into dv
     * @return {Object} the OSC message, formatted as a JavaScript object containing "address" and "args" properties
     */
    osc.readMessage = function (data, options, offsetState) {
        options = options || osc.defaults;

        var dv = osc.dataView(data, data.byteOffset, data.byteLength);
        offsetState = offsetState || {
            idx: 0
        };

        var address = osc.readString(dv, offsetState);
        return osc.readMessageContents(address, dv, options, offsetState);
    };

    // Unsupported, non-API function.
    osc.readMessageContents = function (address, dv, options, offsetState) {
        if (address.indexOf("/") !== 0) {
            throw new Error("A malformed OSC address was found while reading " +
                "an OSC message. String was: " + address);
        }

        var args = osc.readArguments(dv, options, offsetState);

        return {
            address: address,
            args: args.length === 1 && options.unpackSingleArgs ? args[0] : args
        };
    };

    // Unsupported, non-API function.
    osc.collectMessageParts = function (msg, options, dataCollection) {
        dataCollection = dataCollection || {
            byteLength: 0,
            parts: []
        };

        osc.addDataPart(osc.writeString(msg.address), dataCollection);
        return osc.collectArguments(msg.args, options, dataCollection);
    };

    /**
     * Writes an OSC message.
     *
     * @param {Object} msg a message object containing "address" and "args" properties
     * @param {Object} [options] write options
     * @return {Uint8Array} an array of bytes containing the OSC message
     */
    osc.writeMessage = function (msg, options) {
        options = options || osc.defaults;

        if (!osc.isValidMessage(msg)) {
            throw new Error("An OSC message must contain a valid address. Message was: " +
                JSON.stringify(msg, null, 2));
        }

        var msgCollection = osc.collectMessageParts(msg, options);
        return osc.joinParts(msgCollection);
    };

    osc.isValidMessage = function (msg) {
        return msg.address && msg.address.indexOf("/") === 0;
    };

    /**
     * Reads an OSC bundle.
     *
     * @param {DataView} dv the DataView instance to read from
     * @param {Object} [options] read optoins
     * @param {Object} [offsetState] an offsetState object that stores the current offset into dv
     * @return {Object} the bundle or message object that was read
     */
    osc.readBundle = function (dv, options, offsetState) {
        return osc.readPacket(dv, options, offsetState);
    };

    // Unsupported, non-API function.
    osc.collectBundlePackets = function (bundle, options, dataCollection) {
        dataCollection = dataCollection || {
            byteLength: 0,
            parts: []
        };

        osc.addDataPart(osc.writeString("#bundle"), dataCollection);
        osc.addDataPart(osc.writeTimeTag(bundle.timeTag), dataCollection);

        for (var i = 0; i < bundle.packets.length; i++) {
            var packet = bundle.packets[i],
                collector = packet.address ? osc.collectMessageParts : osc.collectBundlePackets,
                packetCollection = collector(packet, options);

            dataCollection.byteLength += packetCollection.byteLength;
            osc.addDataPart(osc.writeInt32(packetCollection.byteLength), dataCollection);
            dataCollection.parts = dataCollection.parts.concat(packetCollection.parts);
        }

        return dataCollection;
    };

    /**
     * Writes an OSC bundle.
     *
     * @param {Object} a bundle object containing "timeTag" and "packets" properties
     * @param {object} [options] write options
     * @return {Uint8Array} an array of bytes containing the message
     */
    osc.writeBundle = function (bundle, options) {
        if (!osc.isValidBundle(bundle)) {
            throw new Error("An OSC bundle must contain 'timeTag' and 'packets' properties. " +
                "Bundle was: " + JSON.stringify(bundle, null, 2));
        }

        options = options || osc.defaults;
        var bundleCollection = osc.collectBundlePackets(bundle, options);

        return osc.joinParts(bundleCollection);
    };

    osc.isValidBundle = function (bundle) {
        return bundle.timeTag !== undefined && bundle.packets !== undefined;
    };

    // Unsupported, non-API function.
    osc.readBundleContents = function (dv, options, offsetState, len) {
        var timeTag = osc.readTimeTag(dv, offsetState),
            packets = [];

        while (offsetState.idx < len) {
            var packetSize = osc.readInt32(dv, offsetState),
                packetLen = offsetState.idx + packetSize,
                packet = osc.readPacket(dv, options, offsetState, packetLen);

            packets.push(packet);
        }

        return {
            timeTag: timeTag,
            packets: packets
        };
    };

    /**
     * Reads an OSC packet, which may consist of either a bundle or a message.
     *
     * @param {Array-like} data an array of bytes to read from
     * @param {Object} [options] read options
     * @return {Object} a bundle or message object
     */
    osc.readPacket = function (data, options, offsetState, len) {
        var dv = osc.dataView(data, data.byteOffset, data.byteLength);

        len = len === undefined ? dv.byteLength : len;
        offsetState = offsetState || {
            idx: 0
        };

        var header = osc.readString(dv, offsetState),
            firstChar = header[0];

        if (firstChar === "#") {
            return osc.readBundleContents(dv, options, offsetState, len);
        } else if (firstChar === "/") {
            return osc.readMessageContents(header, dv, options, offsetState);
        }

        throw new Error("The header of an OSC packet didn't contain an OSC address or a #bundle string." +
            " Header was: " + header);
    };

    /**
     * Writes an OSC packet, which may consist of either of a bundle or a message.
     *
     * @param {Object} a bundle or message object
     * @param {Object} [options] write options
     * @return {Uint8Array} an array of bytes containing the message
     */
    osc.writePacket = function (packet, options) {
        if (osc.isValidMessage(packet)) {
            return osc.writeMessage(packet, options);
        } else if (osc.isValidBundle(packet)) {
            return osc.writeBundle(packet, options);
        } else {
            throw new Error("The specified packet was not recognized as a valid OSC message or bundle." +
                " Packet was: " + JSON.stringify(packet, null, 2));
        }
    };

    // Unsupported, non-API.
    osc.argumentTypes = {
        i: {
            reader: "readInt32",
            writer: "writeInt32"
        },
        h: {
            reader: "readInt64",
            writer: "writeInt64"
        },
        f: {
            reader: "readFloat32",
            writer: "writeFloat32"
        },
        s: {
            reader: "readString",
            writer: "writeString"
        },
        S: {
            reader: "readString",
            writer: "writeString"
        },
        b: {
            reader: "readBlob",
            writer: "writeBlob"
        },
        t: {
            reader: "readTimeTag",
            writer: "writeTimeTag"
        },
        T: {
            reader: "readTrue"
        },
        F: {
            reader: "readFalse"
        },
        N: {
            reader: "readNull"
        },
        I: {
            reader: "readImpulse"
        },
        d: {
            reader: "readFloat64",
            writer: "writeFloat64"
        },
        c: {
            reader: "readChar32",
            writer: "writeChar32"
        },
        r: {
            reader: "readColor",
            writer: "writeColor"
        },
        m: {
            reader: "readMIDIBytes",
            writer: "writeMIDIBytes"
        },
        // [] are special cased within read/writeArguments()
    };

    // Unsupported, non-API function.
    osc.inferTypeForArgument = function (arg) {
        var type = typeof arg;

        // TODO: This is freaking hideous.
        switch (type) {
            case "boolean":
                return arg ? "T" : "F";
            case "string":
                return "s";
            case "number":
                return "f";
            case "undefined":
                return "N";
            case "object":
                if (arg === null) {
                    return "N";
                } else if (arg instanceof Uint8Array ||
                    arg instanceof ArrayBuffer) {
                    return "b";
                } else if (typeof arg.high === "number" && typeof arg.low === "number") {
                    return "h";
                }
                break;
        }

        throw new Error("Can't infer OSC argument type for value: " +
            JSON.stringify(arg, null, 2));
    };

    // Unsupported, non-API function.
    osc.annotateArguments = function (args) {
        var annotated = [];

        for (var i = 0; i < args.length; i++) {
            var arg = args[i],
                msgArg;

            if (typeof (arg) === "object" && arg.type && arg.value !== undefined) {
                // We've got an explicitly typed argument.
                msgArg = arg;
            } else if (osc.isArray(arg)) {
                // We've got an array of arguments,
                // so they each need to be inferred and expanded.
                msgArg = osc.annotateArguments(arg);
            } else {
                var oscType = osc.inferTypeForArgument(arg);
                msgArg = {
                    type: oscType,
                    value: arg
                };
            }

            annotated.push(msgArg);
        }

        return annotated;
    };

    if (osc.isCommonJS) {
        module.exports = osc;
    }
}());

}).call(this,require('_process'),require("buffer").Buffer)

},{"_process":195,"buffer":92,"long":184}],192:[function(require,module,exports){
'use strict';

module.exports = function () {
  throw new Error(
    'ws does not work in the browser. Browser clients must use the native ' +
      'WebSocket object'
  );
};

},{}],193:[function(require,module,exports){
(function (process){
// .dirname, .basename, and .extname methods are extracted from Node.js v8.11.1,
// backported and transplited with Babel, with backwards-compat fixes

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function (path) {
  if (typeof path !== 'string') path = path + '';
  if (path.length === 0) return '.';
  var code = path.charCodeAt(0);
  var hasRoot = code === 47 /*/*/;
  var end = -1;
  var matchedSlash = true;
  for (var i = path.length - 1; i >= 1; --i) {
    code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
      // We saw the first non-path separator
      matchedSlash = false;
    }
  }

  if (end === -1) return hasRoot ? '/' : '.';
  if (hasRoot && end === 1) {
    // return '//';
    // Backwards-compat fix:
    return '/';
  }
  return path.slice(0, end);
};

function basename(path) {
  if (typeof path !== 'string') path = path + '';

  var start = 0;
  var end = -1;
  var matchedSlash = true;
  var i;

  for (i = path.length - 1; i >= 0; --i) {
    if (path.charCodeAt(i) === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // path component
      matchedSlash = false;
      end = i + 1;
    }
  }

  if (end === -1) return '';
  return path.slice(start, end);
}

// Uses a mixed approach for backwards-compatibility, as ext behavior changed
// in new Node.js versions, so only basename() above is backported here
exports.basename = function (path, ext) {
  var f = basename(path);
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};

exports.extname = function (path) {
  if (typeof path !== 'string') path = path + '';
  var startDot = -1;
  var startPart = 0;
  var end = -1;
  var matchedSlash = true;
  // Track the state of characters (if any) we see before our first dot and
  // after any path separator we find
  var preDotState = 0;
  for (var i = path.length - 1; i >= 0; --i) {
    var code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
    if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // extension
      matchedSlash = false;
      end = i + 1;
    }
    if (code === 46 /*.*/) {
        // If this is our first dot, mark it as the start of our extension
        if (startDot === -1)
          startDot = i;
        else if (preDotState !== 1)
          preDotState = 1;
    } else if (startDot !== -1) {
      // We saw a non-dot and non-path separator before our dot, so we should
      // have a good chance at having a non-empty extension
      preDotState = -1;
    }
  }

  if (startDot === -1 || end === -1 ||
      // We saw a non-dot character immediately before the dot
      preDotState === 0 ||
      // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    return '';
  }
  return path.slice(startDot, end);
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))

},{"_process":195}],194:[function(require,module,exports){
(function (process){
'use strict';

if (typeof process === 'undefined' ||
    !process.version ||
    process.version.indexOf('v0.') === 0 ||
    process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
  module.exports = { nextTick: nextTick };
} else {
  module.exports = process
}

function nextTick(fn, arg1, arg2, arg3) {
  if (typeof fn !== 'function') {
    throw new TypeError('"callback" argument must be a function');
  }
  var len = arguments.length;
  var args, i;
  switch (len) {
  case 0:
  case 1:
    return process.nextTick(fn);
  case 2:
    return process.nextTick(function afterTickOne() {
      fn.call(null, arg1);
    });
  case 3:
    return process.nextTick(function afterTickTwo() {
      fn.call(null, arg1, arg2);
    });
  case 4:
    return process.nextTick(function afterTickThree() {
      fn.call(null, arg1, arg2, arg3);
    });
  default:
    args = new Array(len - 1);
    i = 0;
    while (i < args.length) {
      args[i++] = arguments[i];
    }
    return process.nextTick(function afterTick() {
      fn.apply(null, args);
    });
  }
}


}).call(this,require('_process'))

},{"_process":195}],195:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],196:[function(require,module,exports){
module.exports = require('./lib/_stream_duplex.js');

},{"./lib/_stream_duplex.js":197}],197:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    keys.push(key);
  }return keys;
};
/*</replacement>*/

module.exports = Duplex;

/*<replacement>*/
var util = Object.create(require('core-util-is'));
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

{
  // avoid scope creep, the keys array can then be collected
  var keys = objectKeys(Writable.prototype);
  for (var v = 0; v < keys.length; v++) {
    var method = keys[v];
    if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
  }
}

function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false) this.readable = false;

  if (options && options.writable === false) this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

  this.once('end', onend);
}

Object.defineProperty(Duplex.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function () {
    return this._writableState.highWaterMark;
  }
});

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended) return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  pna.nextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

Object.defineProperty(Duplex.prototype, 'destroyed', {
  get: function () {
    if (this._readableState === undefined || this._writableState === undefined) {
      return false;
    }
    return this._readableState.destroyed && this._writableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (this._readableState === undefined || this._writableState === undefined) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
    this._writableState.destroyed = value;
  }
});

Duplex.prototype._destroy = function (err, cb) {
  this.push(null);
  this.end();

  pna.nextTick(cb, err);
};
},{"./_stream_readable":199,"./_stream_writable":201,"core-util-is":93,"inherits":180,"process-nextick-args":194}],198:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

'use strict';

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = Object.create(require('core-util-is'));
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};
},{"./_stream_transform":200,"core-util-is":93,"inherits":180}],199:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Readable.ReadableState = ReadableState;

/*<replacement>*/
var EE = require('events').EventEmitter;

var EElistenerCount = function (emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

/*<replacement>*/

var Buffer = require('safe-buffer').Buffer;
var OurUint8Array = global.Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

/*</replacement>*/

/*<replacement>*/
var util = Object.create(require('core-util-is'));
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var debugUtil = require('util');
var debug = void 0;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/

var BufferList = require('./internal/streams/BufferList');
var destroyImpl = require('./internal/streams/destroy');
var StringDecoder;

util.inherits(Readable, Stream);

var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];

function prependListener(emitter, event, fn) {
  // Sadly this is not cacheable as some libraries bundle their own
  // event emitter implementation with them.
  if (typeof emitter.prependListener === 'function') return emitter.prependListener(event, fn);

  // This is a hack to make sure that our error handler is attached before any
  // userland ones.  NEVER DO THIS. This is here only because this code needs
  // to continue to work with older versions of Node.js that do not include
  // the prependListener() method. The goal is to eventually remove this hack.
  if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
}

function ReadableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.
  var isDuplex = stream instanceof Duplex;

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (isDuplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var readableHwm = options.readableHighWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;

  if (hwm || hwm === 0) this.highWaterMark = hwm;else if (isDuplex && (readableHwm || readableHwm === 0)) this.highWaterMark = readableHwm;else this.highWaterMark = defaultHwm;

  // cast to ints.
  this.highWaterMark = Math.floor(this.highWaterMark);

  // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()
  this.buffer = new BufferList();
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the event 'readable'/'data' is emitted
  // immediately, or on a later tick.  We set this to true at first, because
  // any actions that shouldn't happen until "later" should generally also
  // not happen before the first read call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;

  // has it been destroyed
  this.destroyed = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  if (!(this instanceof Readable)) return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  if (options) {
    if (typeof options.read === 'function') this._read = options.read;

    if (typeof options.destroy === 'function') this._destroy = options.destroy;
  }

  Stream.call(this);
}

Object.defineProperty(Readable.prototype, 'destroyed', {
  get: function () {
    if (this._readableState === undefined) {
      return false;
    }
    return this._readableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._readableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
  }
});

Readable.prototype.destroy = destroyImpl.destroy;
Readable.prototype._undestroy = destroyImpl.undestroy;
Readable.prototype._destroy = function (err, cb) {
  this.push(null);
  cb(err);
};

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;
  var skipChunkCheck;

  if (!state.objectMode) {
    if (typeof chunk === 'string') {
      encoding = encoding || state.defaultEncoding;
      if (encoding !== state.encoding) {
        chunk = Buffer.from(chunk, encoding);
        encoding = '';
      }
      skipChunkCheck = true;
    }
  } else {
    skipChunkCheck = true;
  }

  return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
  return readableAddChunk(this, chunk, null, true, false);
};

function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
  var state = stream._readableState;
  if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else {
    var er;
    if (!skipChunkCheck) er = chunkInvalid(state, chunk);
    if (er) {
      stream.emit('error', er);
    } else if (state.objectMode || chunk && chunk.length > 0) {
      if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
        chunk = _uint8ArrayToBuffer(chunk);
      }

      if (addToFront) {
        if (state.endEmitted) stream.emit('error', new Error('stream.unshift() after end event'));else addChunk(stream, state, chunk, true);
      } else if (state.ended) {
        stream.emit('error', new Error('stream.push() after EOF'));
      } else {
        state.reading = false;
        if (state.decoder && !encoding) {
          chunk = state.decoder.write(chunk);
          if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);else maybeReadMore(stream, state);
        } else {
          addChunk(stream, state, chunk, false);
        }
      }
    } else if (!addToFront) {
      state.reading = false;
    }
  }

  return needMoreData(state);
}

function addChunk(stream, state, chunk, addToFront) {
  if (state.flowing && state.length === 0 && !state.sync) {
    stream.emit('data', chunk);
    stream.read(0);
  } else {
    // update the buffer info.
    state.length += state.objectMode ? 1 : chunk.length;
    if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

    if (state.needReadable) emitReadable(stream);
  }
  maybeReadMore(stream, state);
}

function chunkInvalid(state, chunk) {
  var er;
  if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}

// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
}

Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
};

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 8MB
var MAX_HWM = 0x800000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function howMuchToRead(n, state) {
  if (n <= 0 || state.length === 0 && state.ended) return 0;
  if (state.objectMode) return 1;
  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
  }
  // If we're asking for more than the current hwm, then raise the hwm.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
  if (n <= state.length) return n;
  // Don't have enough
  if (!state.ended) {
    state.needReadable = true;
    return 0;
  }
  return state.length;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n);
  n = parseInt(n, 10);
  var state = this._readableState;
  var nOrig = n;

  if (n !== 0) state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
    // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.
    if (!state.reading) n = howMuchToRead(nOrig, state);
  }

  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  } else {
    state.length -= n;
  }

  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true;

    // If we tried to read() past the EOF, then emit end on the next tick.
    if (nOrig !== n && state.ended) endReadable(this);
  }

  if (ret !== null) this.emit('data', ret);

  return ret;
};

function onEofChunk(stream, state) {
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync) pna.nextTick(emitReadable_, stream);else emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    pna.nextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;else len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  this.emit('error', new Error('_read() is not implemented'));
};

Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;

  var endFn = doEnd ? onend : unpipe;
  if (state.endEmitted) pna.nextTick(endFn);else src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable, unpipeInfo) {
    debug('onunpipe');
    if (readable === src) {
      if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
        unpipeInfo.hasUnpiped = true;
        cleanup();
      }
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', unpipe);
    src.removeListener('data', ondata);

    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }

  // If the user pushes more data while we're writing to dest then we'll end up
  // in ondata again. However, we only want to increase awaitDrain once because
  // dest will only emit one 'drain' event for the multiple writes.
  // => Introduce a guard on increasing awaitDrain.
  var increasedAwaitDrain = false;
  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    increasedAwaitDrain = false;
    var ret = dest.write(chunk);
    if (false === ret && !increasedAwaitDrain) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', src._readableState.awaitDrain);
        src._readableState.awaitDrain++;
        increasedAwaitDrain = true;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) dest.emit('error', er);
  }

  // Make sure our error handler is attached before userland ones.
  prependListener(dest, 'error', onerror);

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function () {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}

Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;
  var unpipeInfo = { hasUnpiped: false };

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0) return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;

    if (!dest) dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this, unpipeInfo);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++) {
      dests[i].emit('unpipe', this, unpipeInfo);
    }return this;
  }

  // try to find the right one.
  var index = indexOf(state.pipes, dest);
  if (index === -1) return this;

  state.pipes.splice(index, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];

  dest.emit('unpipe', this, unpipeInfo);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data') {
    // Start flowing on next tick if stream isn't explicitly paused
    if (this._readableState.flowing !== false) this.resume();
  } else if (ev === 'readable') {
    var state = this._readableState;
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.emittedReadable = false;
      if (!state.reading) {
        pna.nextTick(nReadingNextTick, this);
      } else if (state.length) {
        emitReadable(this);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    pna.nextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  if (!state.reading) {
    debug('resume read 0');
    stream.read(0);
  }

  state.resumeScheduled = false;
  state.awaitDrain = 0;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}

Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  while (state.flowing && stream.read() !== null) {}
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  var _this = this;

  var state = this._readableState;
  var paused = false;

  stream.on('end', function () {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) _this.push(chunk);
    }

    _this.push(null);
  });

  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

    var ret = _this.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function (method) {
        return function () {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  }

  // proxy certain important events.
  for (var n = 0; n < kProxyEvents.length; n++) {
    stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
  }

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  this._read = function (n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return this;
};

Object.defineProperty(Readable.prototype, 'readableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function () {
    return this._readableState.highWaterMark;
  }
});

// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromList(n, state) {
  // nothing buffered
  if (state.length === 0) return null;

  var ret;
  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
    // read it all, truncate the list
    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
    state.buffer.clear();
  } else {
    // read part of list
    ret = fromListPartial(n, state.buffer, state.decoder);
  }

  return ret;
}

// Extracts only enough buffered data to satisfy the amount requested.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromListPartial(n, list, hasStrings) {
  var ret;
  if (n < list.head.data.length) {
    // slice is the same for buffers and strings
    ret = list.head.data.slice(0, n);
    list.head.data = list.head.data.slice(n);
  } else if (n === list.head.data.length) {
    // first chunk is a perfect match
    ret = list.shift();
  } else {
    // result spans more than one buffer
    ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
  }
  return ret;
}

// Copies a specified amount of characters from the list of buffered data
// chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBufferString(n, list) {
  var p = list.head;
  var c = 1;
  var ret = p.data;
  n -= ret.length;
  while (p = p.next) {
    var str = p.data;
    var nb = n > str.length ? str.length : n;
    if (nb === str.length) ret += str;else ret += str.slice(0, n);
    n -= nb;
    if (n === 0) {
      if (nb === str.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = str.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

// Copies a specified amount of bytes from the list of buffered data chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBuffer(n, list) {
  var ret = Buffer.allocUnsafe(n);
  var p = list.head;
  var c = 1;
  p.data.copy(ret);
  n -= p.data.length;
  while (p = p.next) {
    var buf = p.data;
    var nb = n > buf.length ? buf.length : n;
    buf.copy(ret, ret.length - n, 0, nb);
    n -= nb;
    if (n === 0) {
      if (nb === buf.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = buf.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    pna.nextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
  }
}

function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./_stream_duplex":197,"./internal/streams/BufferList":202,"./internal/streams/destroy":203,"./internal/streams/stream":204,"_process":195,"core-util-is":93,"events":99,"inherits":180,"isarray":183,"process-nextick-args":194,"safe-buffer":205,"string_decoder/":212,"util":91}],200:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = Object.create(require('core-util-is'));
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);

function afterTransform(er, data) {
  var ts = this._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb) {
    return this.emit('error', new Error('write callback called multiple times'));
  }

  ts.writechunk = null;
  ts.writecb = null;

  if (data != null) // single equals check for both `null` and `undefined`
    this.push(data);

  cb(er);

  var rs = this._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    this._read(rs.highWaterMark);
  }
}

function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);

  Duplex.call(this, options);

  this._transformState = {
    afterTransform: afterTransform.bind(this),
    needTransform: false,
    transforming: false,
    writecb: null,
    writechunk: null,
    writeencoding: null
  };

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;

    if (typeof options.flush === 'function') this._flush = options.flush;
  }

  // When the writable side finishes, then flush out anything remaining.
  this.on('prefinish', prefinish);
}

function prefinish() {
  var _this = this;

  if (typeof this._flush === 'function') {
    this._flush(function (er, data) {
      done(_this, er, data);
    });
  } else {
    done(this, null, null);
  }
}

Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
  throw new Error('_transform() is not implemented');
};

Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};

Transform.prototype._destroy = function (err, cb) {
  var _this2 = this;

  Duplex.prototype._destroy.call(this, err, function (err2) {
    cb(err2);
    _this2.emit('close');
  });
};

function done(stream, er, data) {
  if (er) return stream.emit('error', er);

  if (data != null) // single equals check for both `null` and `undefined`
    stream.push(data);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  if (stream._writableState.length) throw new Error('Calling transform done when ws.length != 0');

  if (stream._transformState.transforming) throw new Error('Calling transform done when still transforming');

  return stream.push(null);
}
},{"./_stream_duplex":197,"core-util-is":93,"inherits":180}],201:[function(require,module,exports){
(function (process,global,setImmediate){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

module.exports = Writable;

/* <replacement> */
function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
  var _this = this;

  this.next = null;
  this.entry = null;
  this.finish = function () {
    onCorkedFinish(_this, state);
  };
}
/* </replacement> */

/*<replacement>*/
var asyncWrite = !process.browser && ['v0.10', 'v0.9.'].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : pna.nextTick;
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var util = Object.create(require('core-util-is'));
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var internalUtil = {
  deprecate: require('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

/*<replacement>*/

var Buffer = require('safe-buffer').Buffer;
var OurUint8Array = global.Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

/*</replacement>*/

var destroyImpl = require('./internal/streams/destroy');

util.inherits(Writable, Stream);

function nop() {}

function WritableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.
  var isDuplex = stream instanceof Duplex;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (isDuplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var writableHwm = options.writableHighWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;

  if (hwm || hwm === 0) this.highWaterMark = hwm;else if (isDuplex && (writableHwm || writableHwm === 0)) this.highWaterMark = writableHwm;else this.highWaterMark = defaultHwm;

  // cast to ints.
  this.highWaterMark = Math.floor(this.highWaterMark);

  // if _final has been called
  this.finalCalled = false;

  // drain event flag.
  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // has it been destroyed
  this.destroyed = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function (er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;

  // count buffered requests
  this.bufferedRequestCount = 0;

  // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two
  this.corkedRequestsFree = new CorkedRequest(this);
}

WritableState.prototype.getBuffer = function getBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};

(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function () {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
    });
  } catch (_) {}
})();

// Test _writableState for inheritance to account for Duplex streams,
// whose prototype chain only points to Readable.
var realHasInstance;
if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
  realHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(Writable, Symbol.hasInstance, {
    value: function (object) {
      if (realHasInstance.call(this, object)) return true;
      if (this !== Writable) return false;

      return object && object._writableState instanceof WritableState;
    }
  });
} else {
  realHasInstance = function (object) {
    return object instanceof this;
  };
}

function Writable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, too.
  // `realHasInstance` is necessary because using plain `instanceof`
  // would return false, as no `_writableState` property is attached.

  // Trying to use the custom `instanceof` for Writable here will also break the
  // Node.js LazyTransform implementation, which has a non-trivial getter for
  // `_writableState` that would lead to infinite recursion.
  if (!realHasInstance.call(Writable, this) && !(this instanceof Duplex)) {
    return new Writable(options);
  }

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  if (options) {
    if (typeof options.write === 'function') this._write = options.write;

    if (typeof options.writev === 'function') this._writev = options.writev;

    if (typeof options.destroy === 'function') this._destroy = options.destroy;

    if (typeof options.final === 'function') this._final = options.final;
  }

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  this.emit('error', new Error('Cannot pipe, not readable'));
};

function writeAfterEnd(stream, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  pna.nextTick(cb, er);
}

// Checks that a user-supplied chunk is valid, especially for the particular
// mode the stream is in. Currently this means that `null` is never accepted
// and undefined/non-string values are only allowed in object mode.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  var er = false;

  if (chunk === null) {
    er = new TypeError('May not write null values to stream');
  } else if (typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  if (er) {
    stream.emit('error', er);
    pna.nextTick(cb, er);
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;
  var isBuf = !state.objectMode && _isUint8Array(chunk);

  if (isBuf && !Buffer.isBuffer(chunk)) {
    chunk = _uint8ArrayToBuffer(chunk);
  }

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

  if (typeof cb !== 'function') cb = nop;

  if (state.ended) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function () {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function () {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = Buffer.from(chunk, encoding);
  }
  return chunk;
}

Object.defineProperty(Writable.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function () {
    return this._writableState.highWaterMark;
  }
});

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
  if (!isBuf) {
    var newChunk = decodeChunk(state, chunk, encoding);
    if (chunk !== newChunk) {
      isBuf = true;
      encoding = 'buffer';
      chunk = newChunk;
    }
  }
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = {
      chunk: chunk,
      encoding: encoding,
      isBuf: isBuf,
      callback: cb,
      next: null
    };
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;

  if (sync) {
    // defer the callback if we are being called synchronously
    // to avoid piling up things on the stack
    pna.nextTick(cb, er);
    // this can emit finish, and it will always happen
    // after error
    pna.nextTick(finishMaybe, stream, state);
    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
  } else {
    // the caller expect this to happen before if
    // it is async
    cb(er);
    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
    // this can emit finish, but finish must
    // always follow error
    finishMaybe(stream, state);
  }
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state);

    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      /*<replacement>*/
      asyncWrite(afterWrite, stream, state, finished, cb);
      /*</replacement>*/
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;

    var count = 0;
    var allBuffers = true;
    while (entry) {
      buffer[count] = entry;
      if (!entry.isBuf) allBuffers = false;
      entry = entry.next;
      count += 1;
    }
    buffer.allBuffers = allBuffers;

    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

    // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite
    state.pendingcb++;
    state.lastBufferedRequest = null;
    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }
    state.bufferedRequestCount = 0;
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      state.bufferedRequestCount--;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }

    if (entry === null) state.lastBufferedRequest = null;
  }

  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new Error('_write() is not implemented'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished) endWritable(this, state, cb);
};

function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}
function callFinal(stream, state) {
  stream._final(function (err) {
    state.pendingcb--;
    if (err) {
      stream.emit('error', err);
    }
    state.prefinished = true;
    stream.emit('prefinish');
    finishMaybe(stream, state);
  });
}
function prefinish(stream, state) {
  if (!state.prefinished && !state.finalCalled) {
    if (typeof stream._final === 'function') {
      state.pendingcb++;
      state.finalCalled = true;
      pna.nextTick(callFinal, stream, state);
    } else {
      state.prefinished = true;
      stream.emit('prefinish');
    }
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    prefinish(stream, state);
    if (state.pendingcb === 0) {
      state.finished = true;
      stream.emit('finish');
    }
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished) pna.nextTick(cb);else stream.once('finish', cb);
  }
  state.ended = true;
  stream.writable = false;
}

function onCorkedFinish(corkReq, state, err) {
  var entry = corkReq.entry;
  corkReq.entry = null;
  while (entry) {
    var cb = entry.callback;
    state.pendingcb--;
    cb(err);
    entry = entry.next;
  }
  if (state.corkedRequestsFree) {
    state.corkedRequestsFree.next = corkReq;
  } else {
    state.corkedRequestsFree = corkReq;
  }
}

Object.defineProperty(Writable.prototype, 'destroyed', {
  get: function () {
    if (this._writableState === undefined) {
      return false;
    }
    return this._writableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._writableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._writableState.destroyed = value;
  }
});

Writable.prototype.destroy = destroyImpl.destroy;
Writable.prototype._undestroy = destroyImpl.undestroy;
Writable.prototype._destroy = function (err, cb) {
  this.end();
  cb(err);
};
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("timers").setImmediate)

},{"./_stream_duplex":197,"./internal/streams/destroy":203,"./internal/streams/stream":204,"_process":195,"core-util-is":93,"inherits":180,"process-nextick-args":194,"safe-buffer":205,"timers":215,"util-deprecate":218}],202:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Buffer = require('safe-buffer').Buffer;
var util = require('util');

function copyBuffer(src, target, offset) {
  src.copy(target, offset);
}

module.exports = function () {
  function BufferList() {
    _classCallCheck(this, BufferList);

    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  BufferList.prototype.push = function push(v) {
    var entry = { data: v, next: null };
    if (this.length > 0) this.tail.next = entry;else this.head = entry;
    this.tail = entry;
    ++this.length;
  };

  BufferList.prototype.unshift = function unshift(v) {
    var entry = { data: v, next: this.head };
    if (this.length === 0) this.tail = entry;
    this.head = entry;
    ++this.length;
  };

  BufferList.prototype.shift = function shift() {
    if (this.length === 0) return;
    var ret = this.head.data;
    if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
    --this.length;
    return ret;
  };

  BufferList.prototype.clear = function clear() {
    this.head = this.tail = null;
    this.length = 0;
  };

  BufferList.prototype.join = function join(s) {
    if (this.length === 0) return '';
    var p = this.head;
    var ret = '' + p.data;
    while (p = p.next) {
      ret += s + p.data;
    }return ret;
  };

  BufferList.prototype.concat = function concat(n) {
    if (this.length === 0) return Buffer.alloc(0);
    if (this.length === 1) return this.head.data;
    var ret = Buffer.allocUnsafe(n >>> 0);
    var p = this.head;
    var i = 0;
    while (p) {
      copyBuffer(p.data, ret, i);
      i += p.data.length;
      p = p.next;
    }
    return ret;
  };

  return BufferList;
}();

if (util && util.inspect && util.inspect.custom) {
  module.exports.prototype[util.inspect.custom] = function () {
    var obj = util.inspect({ length: this.length });
    return this.constructor.name + ' ' + obj;
  };
}
},{"safe-buffer":205,"util":91}],203:[function(require,module,exports){
'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

// undocumented cb() API, needed for core, not for public API
function destroy(err, cb) {
  var _this = this;

  var readableDestroyed = this._readableState && this._readableState.destroyed;
  var writableDestroyed = this._writableState && this._writableState.destroyed;

  if (readableDestroyed || writableDestroyed) {
    if (cb) {
      cb(err);
    } else if (err && (!this._writableState || !this._writableState.errorEmitted)) {
      pna.nextTick(emitErrorNT, this, err);
    }
    return this;
  }

  // we set destroyed to true before firing error callbacks in order
  // to make it re-entrance safe in case destroy() is called within callbacks

  if (this._readableState) {
    this._readableState.destroyed = true;
  }

  // if this is a duplex stream mark the writable part as destroyed as well
  if (this._writableState) {
    this._writableState.destroyed = true;
  }

  this._destroy(err || null, function (err) {
    if (!cb && err) {
      pna.nextTick(emitErrorNT, _this, err);
      if (_this._writableState) {
        _this._writableState.errorEmitted = true;
      }
    } else if (cb) {
      cb(err);
    }
  });

  return this;
}

function undestroy() {
  if (this._readableState) {
    this._readableState.destroyed = false;
    this._readableState.reading = false;
    this._readableState.ended = false;
    this._readableState.endEmitted = false;
  }

  if (this._writableState) {
    this._writableState.destroyed = false;
    this._writableState.ended = false;
    this._writableState.ending = false;
    this._writableState.finished = false;
    this._writableState.errorEmitted = false;
  }
}

function emitErrorNT(self, err) {
  self.emit('error', err);
}

module.exports = {
  destroy: destroy,
  undestroy: undestroy
};
},{"process-nextick-args":194}],204:[function(require,module,exports){
module.exports = require('events').EventEmitter;

},{"events":99}],205:[function(require,module,exports){
/* eslint-disable node/no-deprecated-api */
var buffer = require('buffer')
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}

},{"buffer":92}],206:[function(require,module,exports){
module.exports = require('./readable').PassThrough

},{"./readable":207}],207:[function(require,module,exports){
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = exports;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":197,"./lib/_stream_passthrough.js":198,"./lib/_stream_readable.js":199,"./lib/_stream_transform.js":200,"./lib/_stream_writable.js":201}],208:[function(require,module,exports){
module.exports = require('./readable').Transform

},{"./readable":207}],209:[function(require,module,exports){
module.exports = require('./lib/_stream_writable.js');

},{"./lib/_stream_writable.js":201}],210:[function(require,module,exports){
/*
 * slip.js: A plain JavaScript SLIP implementation that works in both the browser and Node.js
 *
 * Copyright 2014, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/*global exports, define*/
(function (root, factory) {
    "use strict";

    if (typeof exports === "object") {
        // We're in a CommonJS-style loader.
        root.slip = exports;
        factory(exports);
    } else if (typeof define === "function" && define.amd) {
        // We're in an AMD-style loader.
        define(["exports"], function (exports) {
            root.slip = exports;
            return (root.slip, factory(exports));
        });
    } else {
        // Plain old browser.
        root.slip = {};
        factory(root.slip);
    }
}(this, function (exports) {

    "use strict";

    var slip = exports;

    slip.END = 192;
    slip.ESC = 219;
    slip.ESC_END = 220;
    slip.ESC_ESC = 221;

    slip.byteArray = function (data, offset, length) {
        return data instanceof ArrayBuffer ? new Uint8Array(data, offset, length) : data;
    };

    slip.expandByteArray = function (arr) {
        var expanded = new Uint8Array(arr.length * 2);
        expanded.set(arr);

        return expanded;
    };

    slip.sliceByteArray = function (arr, start, end) {
        var sliced = arr.buffer.slice ? arr.buffer.slice(start, end) : arr.subarray(start, end);
        return new Uint8Array(sliced);
    };

    /**
     * SLIP encodes a byte array.
     *
     * @param {Array-like} data a Uint8Array, Node.js Buffer, ArrayBuffer, or [] containing raw bytes
     * @param {Object} options encoder options
     * @return {Uint8Array} the encoded copy of the data
     */
    slip.encode = function (data, o) {
        o = o || {};
        o.bufferPadding = o.bufferPadding || 4; // Will be rounded to the nearest 4 bytes.
        data = slip.byteArray(data, o.offset, o.byteLength);

        var bufLen = (data.length + o.bufferPadding + 3) & ~0x03,
            encoded = new Uint8Array(bufLen),
            j = 1;

        encoded[0] = slip.END;

        for (var i = 0; i < data.length; i++) {
            // We always need enough space for two value bytes plus a trailing END.
            if (j > encoded.length - 3) {
                encoded = slip.expandByteArray(encoded);
            }

            var val = data[i];
            if (val === slip.END) {
                encoded[j++] = slip.ESC;
                val = slip.ESC_END;
            } else if (val === slip.ESC) {
                encoded[j++] = slip.ESC;
                val = slip.ESC_ESC;
            }

            encoded[j++] = val;
        }

        encoded[j] = slip.END;
        return slip.sliceByteArray(encoded, 0, j + 1);
    };

    /**
     * Creates a new SLIP Decoder.
     * @constructor
     *
     * @param {Function} onMessage a callback function that will be invoked when a message has been fully decoded
     * @param {Number} maxBufferSize the maximum size of a incoming message; larger messages will throw an error
     */
    slip.Decoder = function (o) {
        o = typeof o !== "function" ? o || {} : {
            onMessage: o
        };

        this.maxMessageSize = o.maxMessageSize || 10485760; // Defaults to 10 MB.
        this.bufferSize = o.bufferSize || 1024; // Message buffer defaults to 1 KB.
        this.msgBuffer = new Uint8Array(this.bufferSize);
        this.msgBufferIdx = 0;
        this.onMessage = o.onMessage;
        this.onError = o.onError;
        this.escape = false;
    };

    var p = slip.Decoder.prototype;

    /**
     * Decodes a SLIP data packet.
     * The onMessage callback will be invoked when a complete message has been decoded.
     *
     * @param {Array-like} data an incoming stream of bytes
     */
    p.decode = function (data) {
        data = slip.byteArray(data);

        var msg;
        for (var i = 0; i < data.length; i++) {
            var val = data[i];

            if (this.escape) {
                if (val === slip.ESC_ESC) {
                    val = slip.ESC;
                } else if (val === slip.ESC_END) {
                    val = slip.END;
                }
            } else {
                if (val === slip.ESC) {
                    this.escape = true;
                    continue;
                }

                if (val === slip.END) {
                    msg = this.handleEnd();
                    continue;
                }
            }

            var more = this.addByte(val);
            if (!more) {
                this.handleMessageMaxError();
            }
        }

        return msg;
    };

    p.handleMessageMaxError = function () {
        if (this.onError) {
            this.onError(this.msgBuffer.subarray(0),
                "The message is too large; the maximum message size is " +
                this.maxMessageSize / 1024 + "KB. Use a larger maxMessageSize if necessary.");
        }

        // Reset everything and carry on.
        this.msgBufferIdx = 0;
        this.escape = false;
    };

    // Unsupported, non-API method.
    p.addByte = function (val) {
        if (this.msgBufferIdx > this.msgBuffer.length - 1) {
            this.msgBuffer = slip.expandByteArray(this.msgBuffer);
        }

        this.msgBuffer[this.msgBufferIdx++] = val;
        this.escape = false;

        return this.msgBuffer.length < this.maxMessageSize;
    };

    // Unsupported, non-API method.
    p.handleEnd = function () {
        if (this.msgBufferIdx === 0) {
            return; // Toss opening END byte and carry on.
        }

        var msg = slip.sliceByteArray(this.msgBuffer, 0, this.msgBufferIdx);
        if (this.onMessage) {
            this.onMessage(msg);
        }

        // Clear our pointer into the message buffer.
        this.msgBufferIdx = 0;

        return msg;
    };

    return slip;
}));

},{}],211:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":99,"inherits":180,"readable-stream/duplex.js":196,"readable-stream/passthrough.js":206,"readable-stream/readable.js":207,"readable-stream/transform.js":208,"readable-stream/writable.js":209}],212:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

/*<replacement>*/

var Buffer = require('safe-buffer').Buffer;
/*</replacement>*/

var isEncoding = Buffer.isEncoding || function (encoding) {
  encoding = '' + encoding;
  switch (encoding && encoding.toLowerCase()) {
    case 'hex':case 'utf8':case 'utf-8':case 'ascii':case 'binary':case 'base64':case 'ucs2':case 'ucs-2':case 'utf16le':case 'utf-16le':case 'raw':
      return true;
    default:
      return false;
  }
};

function _normalizeEncoding(enc) {
  if (!enc) return 'utf8';
  var retried;
  while (true) {
    switch (enc) {
      case 'utf8':
      case 'utf-8':
        return 'utf8';
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return 'utf16le';
      case 'latin1':
      case 'binary':
        return 'latin1';
      case 'base64':
      case 'ascii':
      case 'hex':
        return enc;
      default:
        if (retried) return; // undefined
        enc = ('' + enc).toLowerCase();
        retried = true;
    }
  }
};

// Do not cache `Buffer.isEncoding` when checking encoding names as some
// modules monkey-patch it to support additional encodings
function normalizeEncoding(enc) {
  var nenc = _normalizeEncoding(enc);
  if (typeof nenc !== 'string' && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
  return nenc || enc;
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters.
exports.StringDecoder = StringDecoder;
function StringDecoder(encoding) {
  this.encoding = normalizeEncoding(encoding);
  var nb;
  switch (this.encoding) {
    case 'utf16le':
      this.text = utf16Text;
      this.end = utf16End;
      nb = 4;
      break;
    case 'utf8':
      this.fillLast = utf8FillLast;
      nb = 4;
      break;
    case 'base64':
      this.text = base64Text;
      this.end = base64End;
      nb = 3;
      break;
    default:
      this.write = simpleWrite;
      this.end = simpleEnd;
      return;
  }
  this.lastNeed = 0;
  this.lastTotal = 0;
  this.lastChar = Buffer.allocUnsafe(nb);
}

StringDecoder.prototype.write = function (buf) {
  if (buf.length === 0) return '';
  var r;
  var i;
  if (this.lastNeed) {
    r = this.fillLast(buf);
    if (r === undefined) return '';
    i = this.lastNeed;
    this.lastNeed = 0;
  } else {
    i = 0;
  }
  if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
  return r || '';
};

StringDecoder.prototype.end = utf8End;

// Returns only complete characters in a Buffer
StringDecoder.prototype.text = utf8Text;

// Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
StringDecoder.prototype.fillLast = function (buf) {
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
  this.lastNeed -= buf.length;
};

// Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
// continuation byte. If an invalid byte is detected, -2 is returned.
function utf8CheckByte(byte) {
  if (byte <= 0x7F) return 0;else if (byte >> 5 === 0x06) return 2;else if (byte >> 4 === 0x0E) return 3;else if (byte >> 3 === 0x1E) return 4;
  return byte >> 6 === 0x02 ? -1 : -2;
}

// Checks at most 3 bytes at the end of a Buffer in order to detect an
// incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
// needed to complete the UTF-8 character (if applicable) are returned.
function utf8CheckIncomplete(self, buf, i) {
  var j = buf.length - 1;
  if (j < i) return 0;
  var nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 1;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 2;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) {
      if (nb === 2) nb = 0;else self.lastNeed = nb - 3;
    }
    return nb;
  }
  return 0;
}

// Validates as many continuation bytes for a multi-byte UTF-8 character as
// needed or are available. If we see a non-continuation byte where we expect
// one, we "replace" the validated continuation bytes we've seen so far with
// a single UTF-8 replacement character ('\ufffd'), to match v8's UTF-8 decoding
// behavior. The continuation byte check is included three times in the case
// where all of the continuation bytes for a character exist in the same buffer.
// It is also done this way as a slight performance increase instead of using a
// loop.
function utf8CheckExtraBytes(self, buf, p) {
  if ((buf[0] & 0xC0) !== 0x80) {
    self.lastNeed = 0;
    return '\ufffd';
  }
  if (self.lastNeed > 1 && buf.length > 1) {
    if ((buf[1] & 0xC0) !== 0x80) {
      self.lastNeed = 1;
      return '\ufffd';
    }
    if (self.lastNeed > 2 && buf.length > 2) {
      if ((buf[2] & 0xC0) !== 0x80) {
        self.lastNeed = 2;
        return '\ufffd';
      }
    }
  }
}

// Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
function utf8FillLast(buf) {
  var p = this.lastTotal - this.lastNeed;
  var r = utf8CheckExtraBytes(this, buf, p);
  if (r !== undefined) return r;
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, p, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, p, 0, buf.length);
  this.lastNeed -= buf.length;
}

// Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
// partial character, the character's bytes are buffered until the required
// number of bytes are available.
function utf8Text(buf, i) {
  var total = utf8CheckIncomplete(this, buf, i);
  if (!this.lastNeed) return buf.toString('utf8', i);
  this.lastTotal = total;
  var end = buf.length - (total - this.lastNeed);
  buf.copy(this.lastChar, 0, end);
  return buf.toString('utf8', i, end);
}

// For UTF-8, a replacement character is added when ending on a partial
// character.
function utf8End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + '\ufffd';
  return r;
}

// UTF-16LE typically needs two bytes per character, but even if we have an even
// number of bytes available, we need to check if we end on a leading/high
// surrogate. In that case, we need to wait for the next two bytes in order to
// decode the last character properly.
function utf16Text(buf, i) {
  if ((buf.length - i) % 2 === 0) {
    var r = buf.toString('utf16le', i);
    if (r) {
      var c = r.charCodeAt(r.length - 1);
      if (c >= 0xD800 && c <= 0xDBFF) {
        this.lastNeed = 2;
        this.lastTotal = 4;
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
        return r.slice(0, -1);
      }
    }
    return r;
  }
  this.lastNeed = 1;
  this.lastTotal = 2;
  this.lastChar[0] = buf[buf.length - 1];
  return buf.toString('utf16le', i, buf.length - 1);
}

// For UTF-16LE we do not explicitly append special replacement characters if we
// end on a partial character, we simply let v8 handle that.
function utf16End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) {
    var end = this.lastTotal - this.lastNeed;
    return r + this.lastChar.toString('utf16le', 0, end);
  }
  return r;
}

function base64Text(buf, i) {
  var n = (buf.length - i) % 3;
  if (n === 0) return buf.toString('base64', i);
  this.lastNeed = 3 - n;
  this.lastTotal = 3;
  if (n === 1) {
    this.lastChar[0] = buf[buf.length - 1];
  } else {
    this.lastChar[0] = buf[buf.length - 2];
    this.lastChar[1] = buf[buf.length - 1];
  }
  return buf.toString('base64', i, buf.length - n);
}

function base64End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
  return r;
}

// Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
function simpleWrite(buf) {
  return buf.toString(this.encoding);
}

function simpleEnd(buf) {
  return buf && buf.length ? this.write(buf) : '';
}
},{"safe-buffer":213}],213:[function(require,module,exports){
arguments[4][205][0].apply(exports,arguments)
},{"buffer":92,"dup":205}],214:[function(require,module,exports){
(function (process){
var Stream = require('stream')

// through
//
// a stream that does nothing but re-emit the input.
// useful for aggregating a series of changing but not ending streams into one stream)

exports = module.exports = through
through.through = through

//create a readable writable stream.

function through (write, end, opts) {
  write = write || function (data) { this.queue(data) }
  end = end || function () { this.queue(null) }

  var ended = false, destroyed = false, buffer = [], _ended = false
  var stream = new Stream()
  stream.readable = stream.writable = true
  stream.paused = false

//  stream.autoPause   = !(opts && opts.autoPause   === false)
  stream.autoDestroy = !(opts && opts.autoDestroy === false)

  stream.write = function (data) {
    write.call(this, data)
    return !stream.paused
  }

  function drain() {
    while(buffer.length && !stream.paused) {
      var data = buffer.shift()
      if(null === data)
        return stream.emit('end')
      else
        stream.emit('data', data)
    }
  }

  stream.queue = stream.push = function (data) {
//    console.error(ended)
    if(_ended) return stream
    if(data === null) _ended = true
    buffer.push(data)
    drain()
    return stream
  }

  //this will be registered as the first 'end' listener
  //must call destroy next tick, to make sure we're after any
  //stream piped from here.
  //this is only a problem if end is not emitted synchronously.
  //a nicer way to do this is to make sure this is the last listener for 'end'

  stream.on('end', function () {
    stream.readable = false
    if(!stream.writable && stream.autoDestroy)
      process.nextTick(function () {
        stream.destroy()
      })
  })

  function _end () {
    stream.writable = false
    end.call(stream)
    if(!stream.readable && stream.autoDestroy)
      stream.destroy()
  }

  stream.end = function (data) {
    if(ended) return
    ended = true
    if(arguments.length) stream.write(data)
    _end() // will emit or queue
    return stream
  }

  stream.destroy = function () {
    if(destroyed) return
    destroyed = true
    ended = true
    buffer.length = 0
    stream.writable = stream.readable = false
    stream.emit('close')
    return stream
  }

  stream.pause = function () {
    if(stream.paused) return
    stream.paused = true
    return stream
  }

  stream.resume = function () {
    if(stream.paused) {
      stream.paused = false
      stream.emit('resume')
    }
    drain()
    //may have become paused again,
    //as drain emits 'data'.
    if(!stream.paused)
      stream.emit('drain')
    return stream
  }
  return stream
}


}).call(this,require('_process'))

},{"_process":195,"stream":211}],215:[function(require,module,exports){
(function (setImmediate,clearImmediate){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this,require("timers").setImmediate,require("timers").clearImmediate)

},{"process/browser.js":195,"timers":215}],216:[function(require,module,exports){
(function (global){
'use strict'

var bits = require('bit-twiddle')
var dup = require('dup')
var Buffer = require('buffer').Buffer

//Legacy pool support
if(!global.__TYPEDARRAY_POOL) {
  global.__TYPEDARRAY_POOL = {
      UINT8     : dup([32, 0])
    , UINT16    : dup([32, 0])
    , UINT32    : dup([32, 0])
    , BIGUINT64 : dup([32, 0])
    , INT8      : dup([32, 0])
    , INT16     : dup([32, 0])
    , INT32     : dup([32, 0])
    , BIGINT64  : dup([32, 0])
    , FLOAT     : dup([32, 0])
    , DOUBLE    : dup([32, 0])
    , DATA      : dup([32, 0])
    , UINT8C    : dup([32, 0])
    , BUFFER    : dup([32, 0])
  }
}

var hasUint8C = (typeof Uint8ClampedArray) !== 'undefined'
var hasBigUint64 = (typeof BigUint64Array) !== 'undefined'
var hasBigInt64 = (typeof BigInt64Array) !== 'undefined'
var POOL = global.__TYPEDARRAY_POOL

//Upgrade pool
if(!POOL.UINT8C) {
  POOL.UINT8C = dup([32, 0])
}
if(!POOL.BIGUINT64) {
  POOL.BIGUINT64 = dup([32, 0])
}
if(!POOL.BIGINT64) {
  POOL.BIGINT64 = dup([32, 0])
}
if(!POOL.BUFFER) {
  POOL.BUFFER = dup([32, 0])
}

//New technique: Only allocate from ArrayBufferView and Buffer
var DATA    = POOL.DATA
  , BUFFER  = POOL.BUFFER

exports.free = function free(array) {
  if(Buffer.isBuffer(array)) {
    BUFFER[bits.log2(array.length)].push(array)
  } else {
    if(Object.prototype.toString.call(array) !== '[object ArrayBuffer]') {
      array = array.buffer
    }
    if(!array) {
      return
    }
    var n = array.length || array.byteLength
    var log_n = bits.log2(n)|0
    DATA[log_n].push(array)
  }
}

function freeArrayBuffer(buffer) {
  if(!buffer) {
    return
  }
  var n = buffer.length || buffer.byteLength
  var log_n = bits.log2(n)
  DATA[log_n].push(buffer)
}

function freeTypedArray(array) {
  freeArrayBuffer(array.buffer)
}

exports.freeUint8 =
exports.freeUint16 =
exports.freeUint32 =
exports.freeBigUint64 =
exports.freeInt8 =
exports.freeInt16 =
exports.freeInt32 =
exports.freeBigInt64 =
exports.freeFloat32 = 
exports.freeFloat =
exports.freeFloat64 = 
exports.freeDouble = 
exports.freeUint8Clamped = 
exports.freeDataView = freeTypedArray

exports.freeArrayBuffer = freeArrayBuffer

exports.freeBuffer = function freeBuffer(array) {
  BUFFER[bits.log2(array.length)].push(array)
}

exports.malloc = function malloc(n, dtype) {
  if(dtype === undefined || dtype === 'arraybuffer') {
    return mallocArrayBuffer(n)
  } else {
    switch(dtype) {
      case 'uint8':
        return mallocUint8(n)
      case 'uint16':
        return mallocUint16(n)
      case 'uint32':
        return mallocUint32(n)
      case 'int8':
        return mallocInt8(n)
      case 'int16':
        return mallocInt16(n)
      case 'int32':
        return mallocInt32(n)
      case 'float':
      case 'float32':
        return mallocFloat(n)
      case 'double':
      case 'float64':
        return mallocDouble(n)
      case 'uint8_clamped':
        return mallocUint8Clamped(n)
      case 'bigint64':
        return mallocBigInt64(n)
      case 'biguint64':
        return mallocBigUint64(n)
      case 'buffer':
        return mallocBuffer(n)
      case 'data':
      case 'dataview':
        return mallocDataView(n)

      default:
        return null
    }
  }
  return null
}

function mallocArrayBuffer(n) {
  var n = bits.nextPow2(n)
  var log_n = bits.log2(n)
  var d = DATA[log_n]
  if(d.length > 0) {
    return d.pop()
  }
  return new ArrayBuffer(n)
}
exports.mallocArrayBuffer = mallocArrayBuffer

function mallocUint8(n) {
  return new Uint8Array(mallocArrayBuffer(n), 0, n)
}
exports.mallocUint8 = mallocUint8

function mallocUint16(n) {
  return new Uint16Array(mallocArrayBuffer(2*n), 0, n)
}
exports.mallocUint16 = mallocUint16

function mallocUint32(n) {
  return new Uint32Array(mallocArrayBuffer(4*n), 0, n)
}
exports.mallocUint32 = mallocUint32

function mallocInt8(n) {
  return new Int8Array(mallocArrayBuffer(n), 0, n)
}
exports.mallocInt8 = mallocInt8

function mallocInt16(n) {
  return new Int16Array(mallocArrayBuffer(2*n), 0, n)
}
exports.mallocInt16 = mallocInt16

function mallocInt32(n) {
  return new Int32Array(mallocArrayBuffer(4*n), 0, n)
}
exports.mallocInt32 = mallocInt32

function mallocFloat(n) {
  return new Float32Array(mallocArrayBuffer(4*n), 0, n)
}
exports.mallocFloat32 = exports.mallocFloat = mallocFloat

function mallocDouble(n) {
  return new Float64Array(mallocArrayBuffer(8*n), 0, n)
}
exports.mallocFloat64 = exports.mallocDouble = mallocDouble

function mallocUint8Clamped(n) {
  if(hasUint8C) {
    return new Uint8ClampedArray(mallocArrayBuffer(n), 0, n)
  } else {
    return mallocUint8(n)
  }
}
exports.mallocUint8Clamped = mallocUint8Clamped

function mallocBigUint64(n) {
  if(hasBigUint64) {
    return new BigUint64Array(mallocArrayBuffer(8*n), 0, n)
  } else {
    return null;
  }
}
exports.mallocBigUint64 = mallocBigUint64

function mallocBigInt64(n) {
  if (hasBigInt64) {
    return new BigInt64Array(mallocArrayBuffer(8*n), 0, n)
  } else {
    return null;
  }
}
exports.mallocBigInt64 = mallocBigInt64

function mallocDataView(n) {
  return new DataView(mallocArrayBuffer(n), 0, n)
}
exports.mallocDataView = mallocDataView

function mallocBuffer(n) {
  n = bits.nextPow2(n)
  var log_n = bits.log2(n)
  var cache = BUFFER[log_n]
  if(cache.length > 0) {
    return cache.pop()
  }
  return new Buffer(n)
}
exports.mallocBuffer = mallocBuffer

exports.clearCache = function clearCache() {
  for(var i=0; i<32; ++i) {
    POOL.UINT8[i].length = 0
    POOL.UINT16[i].length = 0
    POOL.UINT32[i].length = 0
    POOL.INT8[i].length = 0
    POOL.INT16[i].length = 0
    POOL.INT32[i].length = 0
    POOL.FLOAT[i].length = 0
    POOL.DOUBLE[i].length = 0
    POOL.BIGUINT64[i].length = 0
    POOL.BIGINT64[i].length = 0
    POOL.UINT8C[i].length = 0
    DATA[i].length = 0
    BUFFER[i].length = 0
  }
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"bit-twiddle":90,"buffer":92,"dup":98}],217:[function(require,module,exports){
"use strict"

function unique_pred(list, compare) {
  var ptr = 1
    , len = list.length
    , a=list[0], b=list[0]
  for(var i=1; i<len; ++i) {
    b = a
    a = list[i]
    if(compare(a, b)) {
      if(i === ptr) {
        ptr++
        continue
      }
      list[ptr++] = a
    }
  }
  list.length = ptr
  return list
}

function unique_eq(list) {
  var ptr = 1
    , len = list.length
    , a=list[0], b = list[0]
  for(var i=1; i<len; ++i, b=a) {
    b = a
    a = list[i]
    if(a !== b) {
      if(i === ptr) {
        ptr++
        continue
      }
      list[ptr++] = a
    }
  }
  list.length = ptr
  return list
}

function unique(list, compare, sorted) {
  if(list.length === 0) {
    return list
  }
  if(compare) {
    if(!sorted) {
      list.sort(compare)
    }
    return unique_pred(list, compare)
  }
  if(!sorted) {
    list.sort()
  }
  return unique_eq(list)
}

module.exports = unique

},{}],218:[function(require,module,exports){
(function (global){

/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!global.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = global.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[12])

