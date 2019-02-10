(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc } = require( './var.js' )

const Color = function( __r=0, __g=0, __b=0 ) {
  let __value = (__r << 16) + (__g << 8) + __b 
  const name = 'color' + VarAlloc.alloc()

  let __var  = float_var_gen( __value, name )()

  Object.defineProperty( __var, 'r', {
    get()  { return __r },
    set(v) { __r = v; __var.set(  __r * 255 * 255 + __g * 255 + __b ) }
  }) 
  Object.defineProperty( __var, 'g', {
    get()  { return __g },
    set(v) { __g = v; __var.set(  __r * 255 * 255 + __g * 255 + __b ) }
  }) 
  Object.defineProperty( __var, 'b', {
    get()  { return __b },
    set(v) { __b = v; __var.set(  __r * 255 * 255 + __g * 255 + __b ) }
  })

  return __var
}

module.exports = Color

},{"./sceneNode.js":22,"./utils.js":23,"./var.js":24}],2:[function(require,module,exports){
const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen } = require( './var.js' )

const ops = { 
  Onion: {
    func( sdf,thickness ) { return `vec2( opOnion( ${sdf}.x, ${thickness} ), ${sdf}.y )` },
    variables:[['thickness', 'float', .03]]
  },
  Halve: {
    func( sdf, direction ) { return `vec2( opHalve( ${sdf}.x, p, ${direction} ), ${sdf}.y )` },
    variables:[['direction','int',0]]
  },
  Round: {
    func( sdf, amount ) { return `vec2( ${sdf}.x - ${amount}, ${sdf}.y )` },
    variables:[['amount','float',.1]]
  }
}


const Alterations= {}

for( let name in ops ) {

  // get codegen function
  let op = ops[ name ]

  // create constructor
  Alterations[ name ] = function( sdf, ...args ) {
    const __op = Object.create( Alterations[ name ].prototype )
    __op.sdf = sdf
    __op.variables = []

    for( let i = 0; i < op.variables.length; i++ ) {
      const propArray = op.variables[ i ]
      const propName = propArray[ 0 ]
      const propType = propArray[ 1 ]
      const propValue = args[ i ] === undefined ? propArray[ 2 ] : args[ i ]

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

},{"./sceneNode.js":22,"./utils.js":23,"./var.js":24}],3:[function(require,module,exports){
const Audio = {
  __hasInput: false,
  ctx: null,

  start() {
    if( Audio.__hasInput === false ) {
      Audio.ctx = new AudioContext()
      Audio.createInput().then( input => {
        Audio.createFFT()
        input.connect( Audio.FFT )

        Audio.interval = setInterval( Audio.fftCallback, 1000/60 )
        //window.FFT = Audio.FFT
      })
    }
    Audio.__hasInput = true
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
  }
}

module.exports = Audio

},{}],4:[function(require,module,exports){
const SceneNode = require( './sceneNode.js' ),
      { param_wrap, MaterialID } = require( './utils.js' ),
      { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen } = require( './var.js' )

const BG = function( Scene, SDF ) {

  const Background = function( color ) {
    if( SDF.memo.background === undefined ) {
      const bg = Object.create( Background.prototype )

      const __color = param_wrap( color, vec3_var_gen( 0,0,0, 'bg' ), 'bg' )  
      
      Object.defineProperty( bg, 'color', {
        get() { return __color },
        set( v ) {
          __color.var.set( v )
        }
      })
      
      // this refers to the current scene via implicit binding in scene.js
      this.postprocessing.push( bg )

      SDF.memo.background = true
    }
    return this
  }

  Background.prototype = SceneNode()
 
  Object.assign( Background.prototype, {
    emit() {
      return ''//this.color.emit()
    },
   
    emit_decl() {
      let str = this.color.emit_decl()
      SDF.memo.background = true

      return str
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

},{"./sceneNode.js":22,"./utils.js":23,"./var.js":24}],5:[function(require,module,exports){
const Camera = {
  init( gl, program, handler ) {
    const camera_pos = gl.getUniformLocation( program, 'camera_pos' )
    const camera_normal = gl.getUniformLocation( program, 'camera_normal' )

    this.pos = { dirty:false }
    this.dir = { dirty:true }
    
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
    gl.uniform3f( camera_pos, this.pos.x, this.pos.y, this.pos.z )
    gl.uniform3f( camera_normal, this.dir.x, this.dir.y, this.dir.z )

    handler( ()=> {
      if( this.pos.dirty === true ) {
        gl.uniform3f( camera_pos, this.pos.x, this.pos.y, this.pos.z )
        this.pos.dirty = false
      }
      if( this.dir.dirty === true ) {
        gl.uniform3f( camera_normal, this.dir.x, this.dir.y, this.dir.z )
        this.dir.dirty = false
      }
    })

  }
}

module.exports = Camera

},{}],6:[function(require,module,exports){
arguments[4][1][0].apply(exports,arguments)
},{"./sceneNode.js":22,"./utils.js":23,"./var.js":24,"dup":1}],7:[function(require,module,exports){
const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc } = require( './var.js' )

const ops = { 
  Displace( __name ) {
    let name = __name === undefined ? 'p' : __name
    const sdf = this.sdf.emit( name );

    const sdfStr = `float d1${this.id} = ${sdf.out}.x;\n`

    let displaceString = `float d2${this.id} = sin( ${this.amount.emit()}.x * ${name}.x ) * `  
    displaceString += `sin( ${this.amount.emit()}.y * ${name}.y ) * `
    displaceString += `sin( ${this.amount.emit()}.z * ${name}.z );\n`

    const output = {
      out: `vec2((d1${this.id} + d2${this.id}*${this.scale.emit()})*.5, ${sdf.out}.y)`, 
      preface: sdf.preface + sdfStr + displaceString 
    }

    return output
  },

  Bend( __name ) {
    let name = __name === undefined ? 'p' : __name
    const sdf = this.sdf.emit( 'q'+this.id );

    let preface=`        float c${this.id} = cos( ${this.amount.emit()}.x * ${name}.y );
        float s${this.id} = sin( ${this.amount.emit()}.y * ${name}.y );
        mat2  m${this.id} = mat2( c${this.id},-s${this.id},s${this.id},c${this.id} );
        vec3  q${this.id} = vec3( m${this.id} * ${name}.xy, ${name}.z );\n`

    if( typeof sdf.preface === 'string' ) {
      preface += sdf.preface
    }

    return { preface, out:sdf.out }
  },

  Twist( __name ) {
    let name = __name === undefined ? 'p' : __name
    const sdf = this.sdf.emit( 'q'+this.id );

    let preface=`        float c${this.id} = cos( ${this.amount.emit()}.x * ${name}.y );
        float s${this.id} = sin( ${this.amount.emit()}.y * ${name}.y );
        mat2  m${this.id} = mat2( c${this.id},-s${this.id},s${this.id},c${this.id} );
        vec3  q${this.id} = vec3( m${this.id} * ${name}.xz, ${name}.y );\n`

    if( typeof sdf.preface === 'string' ) {
      preface += sdf.preface
    }

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

    const defaultValues = [.5,.5,.5]

    op.id = VarAlloc.alloc()
    const isArray = true 

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

    if( name === 'Displace' ) {
      let __var2 =  param_wrap( 
        c, 
        float_var_gen( .03 ) 
      )
      Object.defineProperty( op, 'scale', {
        get() { return __var2 },
        set(v) {
          __var2.set( v )
          __var2.dirty = true
        }
      })

      op.params.push({ name:'scale' })
    }
    return op
  } 

  DistanceOps[ name ].prototype = SceneNode()

  //DistanceOps[ name ].prototype.emit = function ( __name ) {
  //  let name = __name === undefined ? 'p' : __name
  //  const sdf = this.sdf.emit( name );

  //  const sdfStr = `float d1 = ${sdf.out}.x;\n`

  //  const displaceString = `float d2 = sin( ${this.amount.emit()}.x * ${name}.x ) * sin( ${this.amount.emit()}.y * ${name}.y ) * sin( ${this.amount.emit()}.z * ${name}.z );\n`

  //  const output = {
  //    out: `vec2(d1 + d2, ${sdf.out}.y)`, 
  //    preface: sdf.preface + sdfStr + displaceString 
  //  }

  //  return output
  //}

  DistanceOps[name].prototype.emit_decl = function () {
    let str =  this.sdf.emit_decl() + this.amount.emit_decl()
    if( this.name === 'Displace' ) str += this.scale.emit_decl()  

    return str
  };

  DistanceOps[name].prototype.update_location = function(gl, program) {
    this.sdf.update_location( gl, program )
    this.amount.update_location( gl, program )
    if( this.name === 'Displace' ) this.scale.update_location( gl, program ) 
  }

  DistanceOps[name].prototype.upload_data = function(gl) {
    this.sdf.upload_data( gl )
    this.amount.upload_data( gl )
    if( this.name === 'Displace' ) this.scale.upload_data( gl )
  }
}

module.exports = DistanceOps


},{"./sceneNode.js":22,"./utils.js":23,"./var.js":24}],8:[function(require,module,exports){
const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen } = require( './var.js' )

const ops = { 
  Union( a,b )        { return `opU( ${a}, ${b} )` },
  SmoothUnion(  a,b,c) { return `opSmoothUnion( ${a}, ${b}, ${c} )` },
  Intersection( a,b ) { return `opI( ${a}, ${b} )` },
  SmoothIntersection( a,b,c ) { return `opSmoothIntersection( ${a}, ${b}, ${c} )` },  
  Difference( a,b ) { return `opS( ${a}, ${b} )` },  
  SmoothDifference( a,b,c ) { return `opSmoothSubtraction( ${b}, ${a}, ${c} )` },  
  StairsUnion(  a,b,c,d ) { return `fOpUnionStairs( ${a}, ${b}, ${c}, ${d} )` },
  StairsIntersection( a,b,c,d ) { return `fOpIntersectionStairs( ${a}, ${b}, ${c}, ${d} )` },
  StairsDifference( a,b,c,d ) { return `fOpSubstractionStairs( ${a}, ${b}, ${c}, ${d} )` },
  RoundUnion( a,b,c ) { return `fOpUnionRound( ${a}, ${b}, ${c} )` },
  RoundDifference( a,b,c ) { return `fOpDifferenceRound( ${a}, ${b}, ${c} )` },
  RoundIntersection( a,b,c ) { return `fOpIntersectionRound( ${a}, ${b}, ${c} )` },
  ChamferUnion( a,b,c ) { return `fOpUnionChamfer( ${a}, ${b}, ${c} )` },
  ChamferDifference( a,b,c ) { return `fOpDifferenceChamfer( ${a}, ${b}, ${c} )` },
  ChamferIntersection( a,b,c ) { return `fOpIntersectionChamfer( ${a}, ${b}, ${c} )` },
  Pipe( a,b,c ) { return `fOpPipe( ${a}, ${b}, ${c} )` },
  Engrave( a,b,c ) { return `fOpEngrave( ${a}, ${b}, ${c} )` },
  Groove( a,b,c,d ) { return `fOpGroove( ${a}, ${b}, ${c}, ${d} )` },
  Tongue( a,b,c,d ) { return `fOpTongue( ${a}, ${b}, ${c}, ${d} )` },
  Onion( a,b ) { return `opOnion( ${a}, ${b} )` },
  Switch( a,b,c ) { return `( ${c} < .5 ? ${a} : ${b} )` }
}

const DistanceOps = {}

for( let name in ops ) {

  // get codegen function
  let op = ops[ name ]

  // create constructor
  DistanceOps[ name ] = function( a,b,c,d ) {
    const op = Object.create( DistanceOps[ name ].prototype )
    op.a = a
    op.b = b

    let __c = param_wrap( c, float_var_gen(.3) )

    Object.defineProperty( op, 'c', {
      get() { return __c },
      set(v) {
        __c.set( v )
      }
    })

    let __d = param_wrap( d, float_var_gen(4) )

    Object.defineProperty( op, 'd', {
      get() { return __d },
      set(v) {
        __d.set( v )
      }
    })

    op.matId = MaterialID.alloc()

    op.params = [{name:'c'},{ name:'d'}]

    return op
  } 

  DistanceOps[ name ].prototype = SceneNode()

  DistanceOps[ name ].prototype.emit = function ( __name ) {
    const emitterA = this.a.emit( __name )
    const emitterB = this.b.emit( __name )
    const emitterC = this.c !== undefined ? this.c.emit() : null
    const emitterD = this.d !== undefined ? this.d.emit() : null

    const output = {
      out: op( emitterA.out, emitterB.out, emitterC, emitterD ), 
      preface: (emitterA.preface || '') + (emitterB.preface || '')
    }

    return output
  }

  DistanceOps[name].prototype.emit_decl = function () {
    let str =  this.a.emit_decl() + this.b.emit_decl()
    if( this.c !== undefined ) str += this.c.emit_decl()
    if( this.d !== undefined ) str += this.d.emit_decl()

    if( ops[ name ].code !== undefined ) {
      //str += ops[ name ].code
      if( Marching.requiredOps.indexOf( ops[ name ].code ) === - 1 ) {
        Marching.requiredOps.push( ops[ name ].code )
      }
    }

    return str
  };

  DistanceOps[name].prototype.update_location = function(gl, program) {
    this.a.update_location( gl, program )
    this.b.update_location( gl, program )
    if( this.c !== undefined ) this.c.update_location( gl, program )
    if( this.d !== undefined ) this.d.update_location( gl, program )
  }

  DistanceOps[name].prototype.upload_data = function(gl) {
    this.a.upload_data( gl )
    this.b.upload_data( gl )
    if( this.c !== undefined ) this.c.upload_data( gl )
    if( this.d !== undefined ) this.d.upload_data( gl )
    
  }
}

DistanceOps.Union2 = function( ...args ) {
  const u = args.reduce( (state,next) => DistanceOps.Union( state, next ) )

  return u
}

DistanceOps.SmoothUnion2 = function( ...args ) {
  // accepts unlimited arguments, but the last one could be a blending coefficient
  let blend = .8, u

  if( typeof args[ args.length - 1 ] === 'number' ) {
    blend = args.pop()
    u = args.reduce( (state,next) => DistanceOps.SmoothUnion( state, next, blend ) )
  }else{
    u = args.reduce( (state,next) => DistanceOps.SmoothUnion( state, next ) )
  }

  return u
}

DistanceOps.RoundUnion2 = function( ...args ) {
  // accepts unlimited arguments, but the last one could be a blending coefficient
  let blend = .25, u

  if( typeof args[ args.length - 1 ] === 'number' ) {
    blend = args.pop()
    u = args.reduce( (state,next) => DistanceOps.RoundUnion( state, next, blend ) )
  }else{
    u = args.reduce( (state,next) => DistanceOps.RoundUnion( state, next ) )
  }

  return u
}

ops.SmoothDifference.code = `      float opSmoothSubtraction( float d1, float d2, float k ) {
        float h = clamp( 0.5 - 0.5*(d2+d1)/k, 0.0, 1.0 );
        return mix( d2, -d1, h ) + k*h*(1.0-h); 
      }
      vec2 opSmoothSubtraction( vec2 d1, vec2 d2, float k ) {
        float h = clamp( 0.5 - 0.5*(d2.x+d1.x)/k, 0.0, 1.0 );
        return vec2( mix( d2.x, -d1.x, h ) + k*h*(1.0-h), mix( d2.y, d1.y, h ) );
      }
`

ops.SmoothIntersection.code = `      float opSmoothIntersection( float d1, float d2, float k ) {
        float h = clamp( 0.5 - 0.5*(d2-d1)/k, 0.0, 1.0 );
        return mix( d2, d1, h ) + k*h*(1.0-h); 
      }
      vec2  opSmoothIntersection( vec2 d1, vec2 d2, float k ) {
        float h = clamp( 0.5 - 0.5*(d2.x-d1.x)/k, 0.0, 1.0 );
        return vec2( mix( d2.x, d1.x, h ) + k*h*(1.0-h), mix( d2.y, d1.y, h ) ); 
      }
`      

ops.SmoothUnion.code = `      vec2 smin( vec2 a, vec2 b, float k) {
        float startx = clamp( 0.5 + 0.5 * ( b.x - a.x ) / k, 0.0, 1.0 );
        float hx = mix( b.x, a.x, startx ) - k * startx * ( 1.0 - startx );


        // material blending... i am proud.
        float starty = clamp( (b.x - a.x) / k, 0., 1. );
        float hy = 1. - (a.y + ( b.y - a.y ) * starty); 

        return vec2( hx, hy ); 
      }
      float smin(float a, float b, float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(b, a, h) - k * h * (1.0 - h);
      }
      //float opS( float d1, float d2 ) { return max(d1,-d2); }
      //vec2  opS( vec2 d1, vec2 d2 ) {
      //  return d1.x >= -d2.x ? vec2( d1.x, d1.y ) : vec2(-d2.x, d2.y);
      //}

      float opSmoothUnion( float a, float b, float k) {
        return smin( a, b, k );
      }

      vec2 opSmoothUnion( vec2 a, vec2 b, float k) {
        return smin( a, b, k);
      }
`
module.exports = DistanceOps


},{"./sceneNode.js":22,"./utils.js":23,"./var.js":24}],9:[function(require,module,exports){
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc } = require( './var.js' )
const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )


const getDomainOps = function( SDF ) {
  
const Elongation = function( sdf, distance ) {
  const repeat = Object.create( Elongation.prototype )

  // XXX make this DRY
  const __var =  param_wrap( 
    distance, 
    param_wrap( distance, vec3_var_gen( 1,1,5 ) )    
  )

  Object.defineProperty( repeat, 'distance', {
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

  repeat.sdf = sdf
  repeat.params = [{ name:'distance' }]

  return repeat 
}

Elongation.prototype = SceneNode()

Elongation.prototype.emit = function ( name='p' ) {
  const pId = this.getID()
  const pName = 'p' + pId

  let preface =
`        vec4 ${pName}_xyzw = opElongate( ${name}, ${this.distance.emit()} );\n
        vec3 ${pName} = ${pName}_xyzw.xyz;\n`


  const sdf = this.sdf.emit( pName )

  if( typeof sdf.preface === 'string' ) preface += sdf.preface 

  return { out:`vec2(${pName}_xyzw.w + ${sdf.out}.x, ${sdf.out}.y)`, preface }
}

Elongation.prototype.emit_decl = function () {
	return this.distance.emit_decl() + this.sdf.emit_decl()
};

Elongation.prototype.update_location = function( gl, program ) {
  this.distance.update_location( gl, program )
  this.sdf.update_location( gl, program )
}

Elongation.prototype.upload_data = function( gl ) {
  this.distance.upload_data( gl )
  this.sdf.upload_data( gl )
}


const Repetition = function( sdf, distance ) {
  const repeat = Object.create( Repetition.prototype )

  // XXX make this DRY
  const __var =  param_wrap( 
    distance, 
    param_wrap( distance, vec3_var_gen( 1,1,5 ) )    
  )

  Object.defineProperty( repeat, 'distance', {
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

  repeat.sdf = sdf
  repeat.params = [{ name:'distance' }]

  return repeat 
}

Repetition.prototype = SceneNode()

Repetition.prototype.emit = function ( name='p' ) {
  const pId = this.sdf.matId
  const pName = 'p' + pId

  let preface =
`        vec3 ${pName} = mod( ${name}, ${this.distance.emit()} ) - .5 * ${this.distance.emit() };\n`


  const sdf = this.sdf.emit( pName )

  if( typeof sdf.preface === 'string' ) preface += sdf.preface 

  return { out:sdf.out, preface }
}

Repetition.prototype.emit_decl = function () {
	return this.distance.emit_decl() + this.sdf.emit_decl()
};

Repetition.prototype.update_location = function( gl, program ) {
  this.distance.update_location( gl, program )
  this.sdf.update_location( gl, program )
}

Repetition.prototype.upload_data = function( gl ) {
  this.distance.upload_data( gl )
  this.sdf.upload_data( gl )
}

const PolarRepetition = function( sdf, count, distance ) {
  const repeat = Object.create( PolarRepetition.prototype )
  //repeat.count = param_wrap( count, float_var_gen( 7 ) )
  repeat.distance = param_wrap( distance, float_var_gen( 1 ) )
  repeat.sdf = sdf 

  const __var =  param_wrap( 
    count, 
    param_wrap( count, float_var_gen( 7 ) )    
  )

  Object.defineProperty( repeat, 'count', {
    get() { return __var },
    set(v) {
      __var.set( v ) 
    }
  }) 

  const __var2 =  param_wrap( 
    distance, 
    param_wrap( distance, float_var_gen( 1 ) )    
  )

  Object.defineProperty( repeat, 'distance', {
    get() { return __var2 },
    set(v) {
      __var2.set( v ) 
    }
  }) 

  repeat.params = [{ name:'distance' }, { name:'count' }]
  return repeat 
}

PolarRepetition.prototype = SceneNode()

PolarRepetition.prototype.emit = function ( name='p' ) {
  const pId = VarAlloc.alloc()
  const pName = 'p' + pId

  let preface =`        vec3 ${pName} = polarRepeat( ${name}, ${this.count.emit() } ); 
        ${pName} -= vec3(${this.distance.emit()},0.,0.);\n`
//`//mod( ${name}, ${this.distance.emit()} ) - .5 * ${this.distance.emit() };\n`


  const sdf = this.sdf.emit( pName )

  if( typeof sdf.preface === 'string' ) preface += sdf.preface

  return { out:sdf.out, preface }
}

PolarRepetition.prototype.emit_decl = function () {
	return this.distance.emit_decl() + this.count.emit_decl() + this.sdf.emit_decl()
};

PolarRepetition.prototype.update_location = function( gl, program ) {
  this.count.update_location( gl, program )
  this.sdf.update_location( gl, program )
  this.distance.update_location( gl, program )
}

PolarRepetition.prototype.upload_data = function( gl ) {
  this.count.upload_data( gl )
  this.sdf.upload_data( gl )
  this.distance.upload_data( gl )
}
const Rotation = function( sdf, axis, angle=0 ) {
  const rotate = Object.create( Rotation.prototype )
  
  rotate.sdf = sdf
  rotate.matId = VarAlloc.alloc()

  let __var =  param_wrap( 
    axis, 
    param_wrap( axis, vec3_var_gen( 0,0,0 ) )    
  )

  Object.defineProperty( rotate, 'axis', {
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

  let __angle  = param_wrap( 
    angle, 
    param_wrap( angle, float_var_gen( Math.PI/4 ) )
  )

  Object.defineProperty( rotate, 'angle', {
    get() { return __angle },
    set(v) {
      __angle.set( v )
    }
  })

  rotate.params = [{ name:'axis' }, { name:'angle' }]
  return rotate 
}


Rotation.prototype = SceneNode()

Rotation.prototype.emit = function ( name='p' ) {
  const pId = this.matId
  const pName = 'q'+pId

  let preface =`        mat4 m${pName} = rotationMatrix(${this.axis.emit()}, -${this.angle.emit()});`
  const center = this.getCenter()

  preface += center !== undefined
    ? `        vec3 ${pName} = ( m${pName} * vec4(${name} - ${center.emit()}, 1.) ).xyz + ${center.emit()};`
    : `        vec3 ${pName} = ( m${pName} * vec4(${name}, 1.) ).xyz;`


  const sdf = this.sdf.emit( pName )
  let out = sdf.out

  if( typeof sdf.preface === 'string' )
    preface += sdf.preface

  return { out, preface }
}

Rotation.prototype.emit_decl = function () {
  let str = this.axis.emit_decl() + this.angle.emit_decl() + this.sdf.emit_decl()

  if( SDF.memo.rotation === undefined ) {
    str += Rotation.prototype.glsl
    SDF.memo.rotation = true
  }

  return str
};

Rotation.prototype.update_location = function( gl, program ) {
  this.axis.update_location( gl, program )
  this.angle.update_location( gl, program )
  this.sdf.update_location( gl, program )
}

Rotation.prototype.upload_data = function( gl ) {
  this.axis.upload_data( gl )
  this.angle.upload_data( gl )
  this.sdf.upload_data( gl )
}

Rotation.prototype.glsl = `   mat4 rotationMatrix(vec3 axis, float angle) {
    vec3 a = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    float sx = s * a.x;
    float sy = s * a.y;
    float sz = s * a.z;
    float ocx = oc * a.x;
    float ocy = oc * a.y;
    float ocz = oc * a.z;
    float ocxx = ocx * a.x;
    float ocxy = ocx * a.y;
    float ocxz = ocx * a.z;
    float ocyy = ocy * a.y;
    float ocyz = ocy * a.z;
    float oczz = ocz * a.z;
    mat4 m = mat4(
      vec4(ocxx + c, ocxy - sz, ocxz + sy, 0.0),
      vec4(ocxy + sz, ocyy + c, ocyz - sx, 0.0),
      vec4(ocxz - sy, ocyz + sx, oczz + c, 0.0),
      vec4( 0.0, 0.0, 0.0, 1.0)
    );

    return m;
  }
`


const Translate = function( sdf, amount ) {
  const rotate = Object.create( Translate.prototype )
  
  rotate.sdf = sdf
  rotate.matId = MaterialID.alloc()

  let __var =  param_wrap( 
    amount, 
    param_wrap( amount, vec3_var_gen( 0,0,0 ) )    
  )

  Object.defineProperty( rotate, 'amount', {
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

  rotate.params = [{ name:'amount' }]
  return rotate 
}
Translate.prototype = SceneNode()

Translate.prototype.emit = function( name='p' ) {
  const pId = this.matId
  const pName = name+pId

  let preface = `vec3 ${pName} = ${name} - ${this.amount.emit()};\n`

  const sdf = this.sdf.emit( pName )
  let out = sdf.out

  if( typeof sdf.preface === 'string' )
    preface += sdf.preface

  return { out, preface }
}

Translate.prototype.emit_decl = function () {
	return this.amount.emit_decl() + this.sdf.emit_decl()
};

Translate.prototype.update_location = function( gl, program ) {
  this.amount.update_location( gl, program )
  this.sdf.update_location( gl, program )
}

Translate.prototype.upload_data = function( gl ) {
  this.amount.upload_data( gl )
  this.sdf.upload_data( gl )
}

const Scale = function( sdf,amount ) {
  const scale = Object.create( Scale.prototype )
  
  scale.sdf = sdf
  scale.matId = MaterialID.alloc()

  let __var =  param_wrap( 
    amount, 
    param_wrap( amount, vec3_var_gen( 1,1,1 ) )    
  )

  Object.defineProperty( scale, 'amount', {
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

  scale.params = [{ name:'amount' }]
  return scale 
}

Scale.prototype.emit = function ( name='p' ) {
  const pId = 'scale'+this.matId
  const pname = name+pId

  let preface =`  vec3 ${pname} = ${name}/${this.amount.emit()};\n `

  const sdf = this.sdf.emit( pname )
  let out = sdf.out + ' * ' + this.amount.emit()

  if( typeof sdf.preface === 'string' )
    preface += sdf.preface

  return { out, preface }
}

Scale.prototype.emit_decl = function () {
	return this.amount.emit_decl() + this.sdf.emit_decl()
};

Scale.prototype.update_location = function( gl, program ) {
  this.amount.update_location( gl, program )
  this.sdf.update_location( gl, program )
}

Scale.prototype.upload_data = function( gl ) {
  this.amount.upload_data( gl )
  this.sdf.upload_data( gl )
}

return { Repeat:Repetition, Scale, Rotation, Translate, PolarRepeat:PolarRepetition, Elongation }

}

module.exports = getDomainOps

},{"./sceneNode.js":22,"./utils.js":23,"./var.js":24}],10:[function(require,module,exports){
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

const Fogger = function( Scene, SDF ) {

  const Fog = function( amount=0.055, color ) {
    const fog = Object.create( Fog.prototype )
    const __amount = param_wrap( amount, float_var_gen( amount ) )  
    
    Object.defineProperty( fog, 'amount', {
      get() { return __amount },
      set( v ) {
        __amount.var.set( v )
      }
    })

    const __color = param_wrap( color, vec3_var_gen( .5,.6,.7 ) )  
    
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
      return `  color = applyFog( color, t.x, ${this.amount.emit()} );`
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

},{"./sceneNode.js":22,"./utils.js":23,"./var.js":24}],12:[function(require,module,exports){
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
        Material( 0, vec3( 1. ), vec3(0.,0.,0.), vec3(1.), 8., Fresnel( 0., 1., 2.) ),
        Material( 0, vec3( 1. ), vec3(1.,0.,0.), vec3(1.), 8., Fresnel( 0., 1., 2.) )
      );
    `,

    light( pos=Vec3(2,2,3), color=Vec3(0,0,1), attenuation=1, intensity=1 ) {
      const light = { 
        pos: param_wrap( pos, vec3_var_gen(2,2,3) ), 
        color: param_wrap( color, vec3_var_gen( 0,0,1 ) ),
        __attenuation: param_wrap( attenuation, float_var_gen( 1 ) ),
        intensity 
      }

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

    gen( shadows=8 ) {
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

      const lighting = this.shell( this.lights.length || 2, this.emit_lights(), SDF.materials.emit_materials(), shadows )

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
      '    vec3 global( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, Material mat, Light lights[MAX_LIGHTS] ) { return vec3(0.); }',
      '    vec3 normal( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, Material mat, Light lights[MAX_LIGHTS] ) { return vec3(0.); }',
      '    vec3 directional( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, Material mat, Light lights[MAX_LIGHTS] ) { return vec3(0.); }',
      '    vec3 orenn( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, Material mat, Light lights[MAX_LIGHTS] ) { return vec3(0.); }',
    ],

    shell( numlights, lights, materials, shadow=0 ) {
      const __shadow = shadow > 0
        ? `diffuseCoefficient *= softshadow( surfacePosition, normalize( light.position ), 0.02, 2.5, ${shadow.toFixed(1)} );` 
        : ''


      let preface = glsl(["#define GLSLIFY 1\n  int MAX_LIGHTS = ",";\n    float ao( in vec3 pos, in vec3 nor )\n{\n\tfloat occ = 0.0;\n    float sca = 1.0;\n    for( int i=0; i<5; i++ )\n    {\n        float hr = 0.01 + 0.12 * float( i ) / 4.0;\n        vec3 aopos =  nor * hr + pos;\n        float dd = scene ( aopos ).x;\n        occ += -(dd-hr)*sca;\n        sca *= 0.95;\n    }\n    return clamp( 1.0 - 3.0*occ, 0.0, 1.0 );    \n}\n\n    ",""],numlights)

      let func = `
    vec3 lighting( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, float materialID ) {
      // applies to all lights (actually, not 'normal' mode... TODO)
      //float occlusion = calcAO( surfacePosition, normal );

      ${materials}
      Material mat = materials[ int(materialID) ];

      int MAX_LIGHTS = ${numlights};     

      ${lights}
      vec3 clr;
      switch( mat.mode ) {
        case 0: clr = global( surfacePosition, normal, rayOrigin, rayDirection, mat, lights ); break;
        case 1: clr = normal; break;
        case 2: clr = directional( surfacePosition, normal, rayOrigin, rayDirection, mat, lights ); break;
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

        const str = glsl(["#define GLSLIFY 1\n\n\n        vec3 global( vec3 pos, vec3 nor, vec3 ro, vec3 rd, Material mat, Light lights[MAX_LIGHTS] ) {\n          Light light = lights[ 0 ];\n          vec3  ref = reflect( rd, nor ); // reflection angle\n          float occ = ao( pos, nor );\n          vec3  lig = normalize( light.position ); // light position\n          float amb = clamp( 0.5 + 0.5 * nor.y, 0.0, 1.0 );\n          float dif = clamp( dot( nor, lig ), 0.0, 1.0 );\n\n          // simulated backlight\n          float bac = clamp( dot( nor, normalize( vec3( -lig.x, 0.0 , -lig.z ))), 0.0, 1.0 ) * clamp( 1.0-pos.y, 0.0 ,1.0 );\n\n          // simulated skydome light\n          float dom = smoothstep( -0.1, 0.1, ref.y );\n          float fre = pow( clamp( 1.0 + dot( nor,rd ),0.0,1.0 ), 3.0);\n          float spe = pow( clamp( dot( ref, lig ), 0.0, 1.0 ), 8.0 );\n\n          dif *= softshadow( pos, lig, 0.02, 2.5, "," );\n          dom *= softshadow( pos, ref, 0.02, 2.5, "," );\n\n          vec3 brdf = vec3( 0.0 );\n          brdf += 1.20 * dif * vec3( 1.00,0.90,0.60 ) * mat.diffuse * light.color;\n          brdf += 2.20 * spe * vec3( 1.00,0.90,0.60 ) * dif * mat.specular * light.color;\n          brdf += 0.30 * amb * vec3( 0.50,0.70,1.00 ) * occ * mat.ambient * light.color;\n          brdf += 0.40 * dom * vec3( 0.50,0.70,1.00 );\n          brdf += 0.70 * bac * vec3( 0.25 );\n          brdf += 0.40 * (fre * light.color);\n\n          return brdf;\n        }\n        ",""],shadow.toFixed(1),shadow.toFixed(1))

        return str
      },

      phong( numlights, lights, materials ) {
        const shadow = SDF.__scene.__shadow

        const __shadow = shadow > 0
          ? `diffuseCoefficient *= softshadow( surfacePosition, normalize( light.position ), 0.02, 2.5, ${shadow.toFixed(1)} );` 
          : ''

        const str = glsl(["#define GLSLIFY 1\n  \n        vec3 directional( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, Material mat, Light lights[MAX_LIGHTS] ) {\n          vec3  outputColor   = vec3( 0. );\n   \n          // applies to all lights\n          float occlusion = ao( surfacePosition, normal );\n\n          for( int i = 0; i < 20000; i++ ) {\n            if( i >= MAX_LIGHTS ) break;\n\n            Light light = lights[ i ];\n\n            vec3 surfaceToLightDirection = normalize( light.position - surfacePosition );\n            \n            // get similarity between normal and direction to light\n            float diffuseCoefficient = dot( normal, surfaceToLightDirection ); \n\n            // get reflection angle for light striking surface\n            vec3 angleOfReflection = reflect( -surfaceToLightDirection, normal );\n\n            // see if reflected light travels to camera and generate coefficient accordingly\n            float specularAngle = clamp( dot( angleOfReflection, -rayDirection ), 0., 1. );\n            float specularCoefficient = pow( specularAngle, mat.shininess );\n\n            // lights should have an attenuation factor\n            float attenuation = 1. / ( light.attenuation * pow( length( light.position - surfacePosition ), 2. ) ); \n\n            // bias, scale, power\n            float fresnel = mat.fresnel.x + mat.fresnel.y * pow( 1.0 + dot( rayDirection, normal ), mat.fresnel.z ); \n\n            ","\n\n            vec3 color = vec3( 0. );\n            color += 1.2 * diffuseCoefficient * mat.diffuse * light.color;\n            color += 2.2 * specularCoefficient * mat.specular * light.color;\n            color += 0.3 * (mat.ambient * light.color) * occlusion;\n            color += (fresnel * light.color);\n\n            // gamma correction must occur before light attenuation\n            // which means it must be applied on a per-light basis unfortunately\n            vec3 gammaCorrectedColor = pow( color, vec3( 1./2.2 ) );\n            vec3 attenuatedColor = 2. * gammaCorrectedColor * attenuation; \n\n            outputColor += attenuatedColor;\n          }\n\n          return outputColor;\n        }\n        ",""],__shadow)

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


      global_save( numlights, lights, materials, shadow='' ) {
        const str = glsl(["#define GLSLIFY 1\n\n        float ao( in vec3 pos, in vec3 nor )\n{\n\tfloat occ = 0.0;\n    float sca = 1.0;\n    for( int i=0; i<5; i++ )\n    {\n        float hr = 0.01 + 0.12 * float( i ) / 4.0;\n        vec3 aopos =  nor * hr + pos;\n        float dd = scene ( aopos ).x;\n        occ += -(dd-hr)*sca;\n        sca *= 0.95;\n    }\n    return clamp( 1.0 - 3.0*occ, 0.0, 1.0 );    \n}\n\n        ","\n\n        ","\n\n        vec3 lighting( vec3 pos, vec3 nor, vec3 ro, vec3 rd, float materialID ) {\n          Light light = lights[ 0 ];\n          vec3  ref = reflect( rd, nor ); // reflection angle\n          float occ = ao( pos, nor );\n          vec3  lig = normalize( light.position ); // light position\n          float amb = clamp( 0.5 + 0.5 * nor.y, 0.0, 1.0 );\n          float dif = clamp( dot( nor, lig ), 0.0, 1.0 );\n\n          // simulated backlight\n          float bac = clamp( dot( nor, normalize( vec3( -lig.x, 0.0 , -lig.z ))), 0.0, 1.0 ) * clamp( 1.0-pos.y, 0.0 ,1.0 );\n\n          // simulated skydome light\n          float dom = smoothstep( -0.1, 0.1, ref.y );\n          float fre = pow( clamp( 1.0 + dot( nor,rd ),0.0,1.0 ), 2.0 );\n          float spe = pow( clamp( dot( ref, lig ), 0.0, 1.0 ), 8.0 );\n\n          dif *= softshadow( pos, lig, 0.02, 2.5, 8. );\n          dom *= softshadow( pos, ref, 0.02, 2.5, 8. );\n\n          Material mat = materials[ int(materialID) ];\n\n          vec3 brdf = vec3( 0.0 );\n          brdf += 1.20 * dif * vec3( 1.00,0.90,0.60 ) * mat.diffuse * light.color;\n          brdf += 2.20 * spe * vec3( 1.00,0.90,0.60 ) * dif * mat.specular * light.color;\n          brdf += 0.30 * amb * vec3( 0.50,0.70,1.00 ) * occ * mat.ambient * light.color;\n          brdf += 0.40 * dom * vec3( 0.50,0.70,1.00 ) * occ;\n          brdf += 0.70 * bac * vec3( 0.25 ) * occ;\n          brdf += 0.40 * (fre * light.color) * occ;\n\n          return brdf;\n        }",""],materials,lights)

        return str

      },

      normal() { return '' }
    },
  }

  return Light
}

module.exports = Lights

// old lighting
/*
*/

},{"./sceneNode.js":22,"./utils.js":23,"./var.js":24,"./vec.js":25,"glslify":26}],15:[function(require,module,exports){
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
  Var:              require( './var.js' ).Var,
  Color:            require( './color.js' ),
  FFT:              require( './audio.js' ),

  // a function that generates the fragment shader
  renderFragmentShader: require( './renderFragmentShader.js' ),

  // additional callbacks that are run once per frame
  callbacks: [],

  // the main drawing callback
  render: null,

  // the scene is a chain of Unions combining all elements together
  scene:  null,

  // a speed of 1 corresponds to 60 fps.
  delay: 0,

  defaultVertexSource:`    #version 300 es
    in vec3 a_pos;
		in vec2 a_uv;
		out vec2 v_uv;

		void main() {
			v_uv = a_uv;
			gl_Position = vec4(a_pos, 1.0);
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
      this.alterations
    )

    obj.Light = this.Light
    obj.Material = this.Material
    obj.Color = this.Color
    obj.camera = this.camera
    obj.callbacks = this.callbacks // XXX remove once API stops using callbacks
    obj.FFT = this.FFT
  },

  init( canvas ) {
    this.primitives = this.__primitives( this )
    this.Scene      = this.__scene( this )
    this.domainOps  = this.__domainOps( this )
    this.noisee     = this.__noise( this )
    this.export( this )
    this.canvas = canvas 

    this.lighting   = this.__lighting( this )
    this.Light = this.lighting.light
    this.materials  = this.__materials( this )
    this.Material = this.materials.material

    //this.canvas.width = window.innerWidth * size
    //this.canvas.height = window.innerHeight * size
    this.gl = this.canvas.getContext( 'webgl2', { antialias:true, alpha:false })

    this.initBuffers()
  },

  initBuffers() {
    const gl = this.gl
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 )
    gl.clear(gl.COLOR_BUFFER_BIT)

    const vbo = gl.createBuffer()

    const vertices = new Float32Array([
      -1.0, -1.0, 0.0, 0.0, 0.0,
      1.0, -1.0, 0.0, 1.0, 0.0,
      -1.0, 1.0, 0.0, 0.0, 1.0,
      1.0, 1.0, 0.0, 1.0, 1.0
    ])

    gl.bindBuffer (gl.ARRAY_BUFFER, vbo )
    gl.bufferData( gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW )

    const ibo = gl.createBuffer()

    const indices = new Uint16Array( [0, 1, 2, 2, 1, 3] )

    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, ibo )
    gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW )
  },

  // generate shaders, initialize camera, start rendering loop 
  createScene( ...args ) {
    const scene = this.Scene( args, this.canvas )

    this.requiredGeometries = []
    this.requiredOps = []
    this.memo = {}
    //this.materials.__materials = this.materials.__materials.slice(0,2)

    return scene
  },

  start( fs, width, height, shouldAnimate ) {
    if( this.render !== null ) this.render.running = false

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
    scene.output.emit = ()=> {
      const emitted = scene.output.__emit()
      const output = {
        out:`  vec2( _out.x, _out.y )`,

        preface: (emitted.preface || '') + `        vec2 _out = ${emitted.out};\n`
      }

      return output 
    }

    this.scene = scene.output

    let variablesDeclaration = scene.output.emit_decl()
    const sceneRendering = scene.output.emit()

    // fog etc. maybe msaa?
    let pp = ''
    for( let processor of __scene.postprocessing ) {
      pp += processor.emit()
      variablesDeclaration += processor.emit_decl()
    }

    variablesDeclaration += this.materials.emit_decl() 
    variablesDeclaration += this.lighting.emit_decl() 

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

		return program
  },

  clear() {
    this.callbacks.length = 0
    this.render.running = false
  },

  initWebGL( vs_source, fs_source, width, height,shouldAnimate=false ) {
    const gl = this.gl

	  const program = this.program = this.createProgram( vs_source, fs_source )
	  gl.useProgram(program);

    const loc_a_pos = gl.getAttribLocation(program, "a_pos");
    const loc_a_uv = gl.getAttribLocation(program, "a_uv");

    const loc_u_time = gl.getUniformLocation(program, "time");
    const loc_u_resolution = gl.getUniformLocation(program, "resolution" )

    this.postprocessing.forEach( pp => { 
      pp.update_location( gl, program ) 
    })
    this.scene.update_location( gl, program )
    this.materials.update_location( gl, program )
    this.lighting.update_location( gl, program )

    gl.enableVertexAttribArray(loc_a_pos)
    gl.enableVertexAttribArray(loc_a_uv)

    gl.vertexAttribPointer(loc_a_pos, 3, gl.FLOAT, false, 20, 0)
    gl.vertexAttribPointer(loc_a_uv, 2, gl.FLOAT, false, 20, 12)

    gl.viewport( 0,0,width,height )
    gl.uniform2f( loc_u_resolution, width, height )

    let total_time = 0.0;

    function clamp255(v) {
      return Math.min( Math.max( 0, v * 255 ), 255 )
    }


    let frameCount = 0
    const render = function( timestamp ){
      if( render.running === true && shouldAnimate === true ) {
        window.requestAnimationFrame( render )
      }else if( render.running === false ) {
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT )
        return
      }
      
      if( this.delay !== 0 && this.delay >= frameCount ) {
        frameCount++
        return
      }else if( this.delay !== 0 ) {
        frameCount = 0
      }

      total_time = timestamp / 1000.0
      gl.uniform1f( loc_u_time, total_time )

      this.callbacks.forEach( cb => cb( total_time ) )

      if( typeof window.onframe === 'function' ) {
        window.onframe( total_time )
      }

      this.materials.upload_data( gl )
      this.scene.upload_data( gl )
      this.lighting.upload_data( gl )
      this.postprocessing.forEach( pp => pp.upload_data( gl ) )

      gl.drawElements( gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0 )

    }.bind( SDF )

    render.running = true

    return render    
  }
}

module.exports = SDF

},{"./alterations.js":2,"./audio.js":3,"./camera.js":5,"./color.js":6,"./distanceDeformations.js":7,"./distanceOperations.js":8,"./domainOperations.js":9,"./lighting.js":14,"./material.js":16,"./noise.js":17,"./primitives.js":19,"./renderFragmentShader.js":20,"./scene.js":21,"./var.js":24,"./vec.js":25}],16:[function(require,module,exports){
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
      'orenn'
    ],

    default: 'global',

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

    material( mode='global', __ambient, __diffuse, __specular, __shininess, __fresnel ){
      let modeIdx = Materials.modeConstants.indexOf( mode )
      if( modeIdx === -1 ) {
        console.warn( `There is no material type named ${mode}. Using the default material, ${Materials.default}, instead.` )
        mode = Materials.default
        modeIdx = Materials.modeConstants.indexOf( mode )
      }

      const ambient = param_wrap( __ambient, vec3_var_gen(.1,.1,.1) )
      const diffuse = param_wrap( __diffuse, vec3_var_gen(0,0,1) )
      const specular = param_wrap( __specular, vec3_var_gen(1,1,1) )
      const shininess = param_wrap( __shininess, float_var_gen(8) )
      const fresnel   = param_wrap( __fresnel, vec3_var_gen(0,1,2) )

      const mat = { mode, ambient, diffuse, specular, shininess, fresnel, id:MaterialID.alloc() }
      
      return mat 
    },

    dirty( mat ) {
      mat.ambient.dirty = true
      mat.diffuse.dirty = true
      mat.specular.dirty = true
      mat.shininess.dirty = true
      mat.fresnel.dirty = true
    },
   
    emit_materials() {
      if( this.materials.length === 0 ) return this.defaultMaterials

      let str = `Material materials[${this.materials.length}] = Material[${this.materials.length}](`

      this.materials.sort( (a,b) => a.id > b.id ? 1 : -1 ) 

      for( let mat of this.materials ) {
        const fresnel = `Fresnel( ${f(mat.fresnel.x)}, ${f(mat.fresnel.y)}, ${f(mat.fresnel.z)} )`

        str += `\n        Material( ${this.modeConstants.indexOf( mat.mode )}, ${mat.ambient.emit()}, ${mat.diffuse.emit()}, ${mat.specular.emit()}, ${mat.shininess.emit()}, ${mat.fresnel.emit()} ),` 
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

    normal  : Materials.material( 'normal' )
  })

  return Materials
}

module.exports = __Materials

},{"./sceneNode.js":22,"./utils.js":23,"./var.js":24,"./vec.js":25,"glslify":26}],17:[function(require,module,exports){
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

  const out = `(${this.bias.emit()} + snoise( vec4( p, time * ${this.timeMod.emit()} )) * ${this.strength.emit()})`  

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

},{"./sceneNode.js":22,"./utils.js":23,"./var.js":24,"glslify":26}],18:[function(require,module,exports){

const glsl = require( 'glslify' )
const Color = require( './Color' )

module.exports = {
  Box: {
    parameters:[
      { name:'size', type:'vec3', default:[1,1,1] },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
	    return `sdBox( ${pName} - ${this.center.emit()}, ${this.size.emit()} )`;
    },

    glslify:glsl(["#define GLSLIFY 1\n    float sdBox( vec3 p, vec3 b )\n{\n  vec3 d = abs(p) - b;\n  return min(max(d.x,max(d.y,d.z)),0.0) +\n         length(max(d,0.0));\n}\n\n"])
  }, 

  // XXX we should normalize dimensions in the shader... 
  Cone: {
    parameters:[
      { name:'dimensions', type:'vec3', default:[.8,.6,.3] },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `sdCone( ${pName} - ${this.center.emit()}, ${this.dimensions.emit()} )`
    },
    glslify:glsl(["#define GLSLIFY 1\n    float sdCone( in vec3 p, in vec3 c )\n{\n    vec2 q = vec2( length(p.xz), p.y );\n    float d1 = -p.y-c.z;\n    float d2 = max( dot(q,c.xy), p.y);\n    return length(max(vec2(d1,d2),0.0)) + min(max(d1,d2), 0.);\n}\n\n"])
  }, 

	Cylinder: {
    parameters:[
      { name:'dimensions', type:'vec2', default:[.8,.6] },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `sdCappedCylinder( ${pName} - ${this.center.emit()}, ${this.dimensions.emit()} )`
    },

    glslify:`    float sdCappedCylinder( vec3 p, vec2 h ) {
    vec2 d = abs(vec2(length(p.xz),p.y)) - h;
    return min(max(d.x,d.y),0.0) + length(max(d,0.0));
  }`
  }, 

  Capsule: {	
    parameters:[
      { name:'start', type:'vec3', default:[0,0,0] },
      { name:'end', type:'vec3', default:[.8,1,0] },
      { name:'radius', type:'float', default:.5 },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `sdCapsule( ${pName},  ${this.start.emit()}, ${this.end.emit()}, ${this.radius.emit()} )`
    },
    glslify:glsl(["#define GLSLIFY 1\n      float sdCapsule( vec3 p, vec3 a, vec3 b, float r )\n{\n    vec3 pa = p - a, ba = b - a;\n    float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );\n    return length( pa - ba*h ) - r;\n}\n\n"])

  },

  // XXX No cylinder description
  //` #pragma glslify: sdCylinder	= require('glsl-sdf-primitives/sdCylinder')`
 	HexPrism: {
    parameters:[
      { name:'dimensions', type:'vec2', default:[.8,.6] },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `sdHexPrism( ${pName} - ${this.center.emit()}, ${this.dimensions.emit()} )`
    },
    glslify:glsl(["#define GLSLIFY 1\n      float sdHexPrism( vec3 p, vec2 h )\n{\n    vec3 q = abs(p);\n    return max(q.z-h.y,max((q.x*0.866025+q.y*0.5),q.y)-h.x);\n}\n\n"])
  },

  Julia: {
    parameters:[
      { name:'atime', type:'float', default:0 },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `julia( ${pName} - ${this.center.emit()}, ${this.atime.emit()} )`
    },

    // https://www.shadertoy.com/view/MsfGRr
    glslify:glsl(["#define GLSLIFY 1\n  vec4 qsqr( in vec4 a ) {\n    return vec4( a.x*a.x - a.y*a.y - a.z*a.z - a.w*a.w,\n                 2.0*a.x*a.y,\n                 2.0*a.x*a.z,\n                 2.0*a.x*a.w );\n  }\n\n  float julia( in vec3 p, float atime ){\n    vec4 c = 0.45*cos( vec4(0.5,3.9,1.4,1.1) + atime*vec4(1.2,1.7,1.3,2.5) ) - vec4(0.3,0.0,0.0,0.0);\n    vec4 z = vec4(p,0.);\n    float md2 = 1.0;\n    float mz2 = dot(z,z);\n\n    for( int i=0; i<11; i++ ){\n      md2 *= 4.0*mz2;   \n      // dz -> 2·z·dz, meaning |dz| -> 2·|z|·|dz| (can take the 4 out of the loop and do an exp2() afterwards)\n      z = qsqr(z) + c;  // z  -> z^2 + c\n\n      mz2 = dot(z,z);\n      if(mz2>4.0) break;\n    }\n    \n    return 0.25*sqrt(mz2/md2)*log(mz2);  // d = 0.5·|z|·log|z| / |dz|\n  }",""]),
  },

  Mandelbulb: {
    parameters:[
      { name:'a', type:'float', default:8 },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `mandelbulb( ${pName} - ${this.center.emit()}, ${this.a.emit()} )`
    },

    // adapted from: https://www.shadertoy.com/view/ltfSWn
    glslify:glsl(["#define GLSLIFY 1\n      float mandelbulb( in vec3 p, in float aa ){\n        vec3 w = p;\n        float m = dot(w,w);\n\n        vec4 trap = vec4(abs(w),m);\n        float dz = 1.0;\n                \n        for( int i=0; i<4; i++ ) {\n          dz = aa*pow(sqrt(m),aa - 1.)*dz + 1.0;\n\n          float r = length(w);\n          float b = aa*acos( w.y /r);\n          float a = aa*atan( w.x, w.z );\n          w = p + pow(r,aa) * vec3( sin(b)*sin(a), cos(b), sin(b)*cos(a) );\n\n          trap = min( trap, vec4(abs(w),m) );\n\n          m = dot(w,w);\n          if( m > 256.0 ) {\n            break;\n          }\n        }\n\n        return 0.25*log(m)*sqrt(m)/dz;\n      }\n    ",""]),
  },

	Octahedron: {
    parameters:[
      { name:'size', type:'float', default:1 },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `sdOctahedron( ${pName} - ${this.center.emit()}, ${this.size.emit()} )`
    },

    glslify:`    float sdOctahedron(vec3 p, float h) {
    vec2 d = .5*(abs(p.xz)+p.y) - min(h,p.y);
    return length(max(d,0.)) + min(max(d.x,d.y), 0.);
  }`
  }, 

 	Plane: {
    parameters:[
      { name:'normal', type:'vec3', default:[0,1,0] },
      { name:'distance', type:'float', default:1 },
      { name:'material', type:'mat', default:null }
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
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `udQuad( ${pName} - ${this.center.emit()}, ${this.v1.emit()}, ${this.v2.emit()}, ${this.v3.emit()}, ${this.v4.emit()} )`
    },
    glslify:glsl(["#define GLSLIFY 1\n    float dot2( in vec3 v ) { return dot(v,v); }\nfloat udQuad( vec3 p, vec3 a, vec3 b, vec3 c, vec3 d )\n{\n    vec3 ba = b - a; vec3 pa = p - a;\n    vec3 cb = c - b; vec3 pb = p - b;\n    vec3 dc = d - c; vec3 pc = p - c;\n    vec3 ad = a - d; vec3 pd = p - d;\n    vec3 nor = cross( ba, ad );\n\n    return sqrt(\n    (sign(dot(cross(ba,nor),pa)) +\n     sign(dot(cross(cb,nor),pb)) +\n     sign(dot(cross(dc,nor),pc)) +\n     sign(dot(cross(ad,nor),pd))<3.0)\n     ?\n     min( min( min(\n     dot2(ba*clamp(dot(ba,pa)/dot2(ba),0.0,1.0)-pa),\n     dot2(cb*clamp(dot(cb,pb)/dot2(cb),0.0,1.0)-pb) ),\n     dot2(dc*clamp(dot(dc,pc)/dot2(dc),0.0,1.0)-pc) ),\n     dot2(ad*clamp(dot(ad,pd)/dot2(ad),0.0,1.0)-pd) )\n     :\n     dot(nor,pa)*dot(nor,pa)/dot2(nor) );\n}\n\n"])
  }, 
  RoundBox: {
    parameters:[
      { name:'size', type:'vec3', default:[1,1,1] },
      { name:'radius', type:'float', default:1 },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `udRoundBox( ${pName} -${this.center.emit()}, ${this.size.emit()},  ${this.radius.emit()} )`
    }, 
    glslify:glsl(["#define GLSLIFY 1\n    float udRoundBox( vec3 p, vec3 b, float r )\n{\n  return length(max(abs(p)-b,0.0))-r;\n}\n\n"])
  }, 
  Sphere:{
    parameters:[
      { name:'radius', type:'float', default:1 },
      { name:'center', type:'vec3', default:[0,0,0] },
      //{ name:'color', type:'float', default:Color(0,0,255) }
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `sdSphere( ${pName} - ${this.center.emit()}, ${this.radius.emit()} )`
    },
    glslify:glsl(["#define GLSLIFY 1\n    float sdSphere( vec3 p, float s )\n{\n  return length( p ) - s;\n}\n\n"])
  },
  // phi, m, n1, n2, n3, a, b
  SuperFormula:{
    parameters:[
      { name:'m_1', type:'float', default:1 },
      { name:'n1_1', type:'float', default:1 },
      { name:'n2_1', type:'float', default:1 },
      { name:'n3_1', type:'float', default:1 },
      { name:'a_1', type:'float', default:1 },
      { name:'b_1', type:'float', default:1 },
      { name:'m_2', type:'float', default:1 },
      { name:'n1_2', type:'float', default:1 },
      { name:'n2_2', type:'float', default:1 },
      { name:'n3_2', type:'float', default:1 },
      { name:'a_2', type:'float', default:1 },
      { name:'b_2', type:'float', default:1 },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `superformula( ${pName} - ${this.center.emit()}, ${this.m_1.emit()}, ${this.n1_1.emit()},${this.n2_1.emit()},${this.n3_1.emit()},${this.a_1.emit()},${this.b_1.emit()}, ${this.m_2.emit()}, ${this.n1_2.emit()},${this.n2_2.emit()},${this.n3_2.emit()},${this.a_2.emit()},${this.b_2.emit()} )`
    },
    glslify:glsl(["#define GLSLIFY 1\n    float SuperFormula( float phi, float m, float n1, float n2, float n3, float a, float b ){\n\t\n\tfloat t1 = abs((1.0 / a) * cos(m * phi / 4.0));\n\tt1 = pow(t1, n2);\n\n\tfloat t2 = abs((a / b) * sin(m * phi / 4.0));\n\tt2 = pow(t2, n3);\n\n\tfloat t3 = t1 + t2;\n\n\tfloat r = pow(t3, -1.0 / n1);\n\n\treturn r;\n}\n\n float superformula( vec3 p, float m_1, float n1_1, float n2_1, float n3_1, float a_1, float b_1, float m_2, float n1_2, float n2_2, float n3_2, float a_2, float b_2 ) {\n    float d = length( p );\n    float theta = atan(p.y / p.x);\n    float phi = asin(p.z / d);\n    float r1 = SuperFormula( theta, m_1, n1_1, n2_1, n3_1, a_1, b_1 );\n    float r2 = SuperFormula( phi, m_2, n1_2, n2_2, n3_2, a_2, b_2 );\n    vec3 q = r2 * vec3(r1 * cos(theta) * cos(phi), r1 * sin(theta) * cos(phi), sin(phi));\n    d = d - length(q);\n\n    return d;\n  }    \n",""]) },

  Torus:{
    parameters:[
      { name:'radii',  type:'vec2', default:[.5,.1] },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `sdTorus( ${pName} - ${this.center.emit()}, ${this.radii.emit()} )`
    },
    glslify:glsl(["#define GLSLIFY 1\n    float sdTorus( vec3 p, vec2 t )\n{\n  vec2 q = vec2(length(p.xz)-t.x,p.y);\n  return length(q)-t.y;\n}\n\n"])

  },  
  Torus88:{
    parameters:[
      { name:'radii',  type:'vec2', default:[.5,.1] },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `sdTorus88( ${pName} - ${this.center.emit()}, ${this.radii.emit()} )`
    },
    glslify:`float sdTorus88( vec3 p, vec2 t ) {
        vec2 q = vec2( length8( p.xz ) - t.x, p.y );
        return length8( q ) - t.y;
      }\n`,
  },
  Torus82:{
    parameters:[
      { name:'radii',  type:'vec2', default:[.5,.1] },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `sdTorus82( ${pName} - ${this.center.emit()}, ${this.radii.emit()} )`
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
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `udTriangle( ${pName} - ${this.center.emit()}, ${this.v1.emit()}, ${this.v2.emit()}, ${this.v3.emit()} )`
    },
    glslify:glsl(["#define GLSLIFY 1\n    float dot2( in vec3 v ) { return dot(v,v); }\nfloat udTriangle( vec3 p, vec3 a, vec3 b, vec3 c )\n{\n    vec3 ba = b - a; vec3 pa = p - a;\n    vec3 cb = c - b; vec3 pb = p - b;\n    vec3 ac = a - c; vec3 pc = p - c;\n    vec3 nor = cross( ba, ac );\n\n    return sqrt(\n    (sign(dot(cross(ba,nor),pa)) +\n     sign(dot(cross(cb,nor),pb)) +\n     sign(dot(cross(ac,nor),pc))<2.0)\n     ?\n     min( min(\n     dot2(ba*clamp(dot(ba,pa)/dot2(ba),0.0,1.0)-pa),\n     dot2(cb*clamp(dot(cb,pb)/dot2(cb),0.0,1.0)-pb) ),\n     dot2(ac*clamp(dot(ac,pc)/dot2(ac),0.0,1.0)-pc) )\n     :\n     dot(nor,pa)*dot(nor,pa)/dot2(nor) );\n}\n\n"])
  }, 

  TriPrism: {
    parameters:[
      { name:'dimensions', type:'vec2', default:[.5,.5] },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `sdTriPrism( ${pName} - ${this.center.emit()}, ${this.dimensions.emit()})`
    },
    glslify:glsl(["#define GLSLIFY 1\n      float sdTriPrism( vec3 p, vec2 h )\n{\n    vec3 q = abs(p);\n    return max(q.z-h.y,max(q.x*0.866025+p.y*0.5,-p.y)-h.x*0.5);\n}\n\n"])

  }, 
  VoxelSphere:{
    parameters:[
      { name:'radius', type:'float', default:1 },
      { name:'resolution', type:'float', default:20 },
      { name:'center', type:'vec3', default:[0,0,0] },
      { name:'material', type:'mat', default:null }
    ],

    primitiveString( pName ) { 
      return `VoxelSphere( ${pName} - ${this.center.emit()}, ${this.radius.emit()}, ${this.resolution.emit()} )`
    },
    glslify:glsl(["#define GLSLIFY 1\nfloat sdBox( vec3 p, vec3 b ){\n        vec3 d = abs(p) - b;\n        return min(max(d.x,max(d.y,d.z)),0.0) +\n               length(max(d,0.0));\n      }\n      float VoxelSphere( vec3 p, float radius, float resolution ) {\n        //vec3 ref = p * resolution;\n        //ref = round( ref );\n        //return ( length( ref ) - resolution * radius ) / resolution;\n\n        float dist = round( length( p ) - radius * resolution) / resolution;\n        //if( dist < resolution ) {\n        //  dist = sdBox( vec3(0.), vec3(resolution) );\n        //}\n\n        return dist; \n    }",""])
  },

}

},{"./Color":1,"glslify":26}],19:[function(require,module,exports){
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc }  = require( './var.js' )
const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const Color = require( './color.js' )

const createPrimitives = function( SDF ) {

  const gens = { 
    int:   int_var_gen,
    float: float_var_gen,
    vec2: vec2_var_gen,
    vec3: vec3_var_gen,
    vec4: vec4_var_gen,
    color: Color 
  }

  // load descriptions of all primtives
  const descriptions = require( './primitiveDescriptions.js' )

  const Primitives = {
    descriptions
  }

  for( let name in descriptions ) {
    const desc = descriptions[ name ]
    const params = desc.parameters

    // create constructor
    Primitives[ name ] = function( ...args ) {
      const p = Object.create( Primitives[ name ].prototype )
      p.params = params

      let count = 0

      // wrap each param in a Var object for codegen
      for( let param of params ) {
        if( param.name === 'color' ) {
          p.color = args[ count ] === undefined ? param.default : args[ count++ ]
          continue
        }else if( param.name === 'material' ) {
          p.material = args[ count++ ] 
          p.material = SDF.materials.addMaterial( p.material )
          //if( SDF.materials.materials.indexOf( p.material ) === -1 ) {
          //  console.log( 'pushing material' )
          //  p.material.id = MaterialID.alloc()
          //  SDF.materials.materials.push( p.material )
          //}
          continue
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
          let __var =  param_wrap( 
            args[ count++ ], 
            gens[ param.type ]( ...defaultValues ) 
          )

          // for assigning entire new vectors to property
          Object.defineProperty( p, param.name, {
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
            args[ count++ ], 
            gens[ param.type ]( defaultValues ) 
          )

          //__var.set( defaultValues )
          Object.defineProperty( p, param.name, {
            get() { return __var },
            set(v) {
              __var.set( v )
            }
          })
        }
      }

      // id used for sdf code
      p.id = VarAlloc.alloc()
      //p.color = Color( 255,0,255 )

      // holds operations like scale, rotate, repeat etc.
      p.domainOperations = []

      return p
    }

    // define prototype to use
    Primitives[ name ].prototype = SceneNode()

    // create codegen string
    Primitives[ name ].prototype.emit = function ( __name ) {
      let shaderCode = desc.glslify.indexOf('#') > -1 ? desc.glslify.slice(18) : desc.glslify
      if( SDF.requiredGeometries.indexOf( shaderCode ) === - 1 ) {
        SDF.requiredGeometries.push( shaderCode )
      } 

      if( SDF.memo[ this.id ] !== undefined ) {
        return { preface:'', out:name+this.matId }
      }

      const pname = __name === undefined ? 'p' : __name

      const id = SDF.materials.__materials.indexOf( this.material )

      const primitive = `        vec2 ${name}${this.id} = vec2(${desc.primitiveString.call( this, pname )}, ${id} );\n`

      SDF.memo[ this.id ] = name + this.id

      return { preface:primitive, out:name+this.id  }
    }
    
    // declare any uniform variables
    Primitives[ name ].prototype.emit_decl = function() {
      let decl = ''
      for( let param of params ) {
        if( param.name !== 'material' )
          decl += this[ param.name ].emit_decl()
      }
      //decl += this.color.emit_decl()

      return decl
    }

    Primitives[ name ].prototype.update_location = function( gl, program ) {
      for( let param of params ) {
        if( param.type !== 'obj' ) {
          if( param.name !== 'material' ) 
            this[ param.name ].update_location( gl,program )
        }
      }

      //this.color.update_location( gl, program )
    }

    Primitives[ name ].prototype.upload_data = function( gl ) {
      for( let param of params ) {
        if( param.type !== 'obj' && param.name !== 'material' )
          this[ param.name ].upload_data( gl )
      }

      //this.color.upload_data( gl )
    }

  }

  return Primitives
   
}

module.exports = createPrimitives

},{"./color.js":6,"./primitiveDescriptions.js":18,"./sceneNode.js":22,"./utils.js":23,"./var.js":24}],20:[function(require,module,exports){
const glsl = require( 'glslify' )

module.exports = function( variables, scene, preface, geometries, lighting, postprocessing, steps=90, minDistance=.001, maxDistance=20 ) {
    const fs_source = glsl(["     #version 300 es\n      precision highp float;\n#define GLSLIFY 1\n\n\n      float PI = 3.141592653589793;\n\n      in vec2 v_uv;\n\n      struct Light {\n        vec3 position;\n        vec3 color;\n        float attenuation;\n      };\n\n      struct Material {\n        int  mode;\n        vec3 ambient;\n        vec3 diffuse;\n        vec3 specular;\n        float shininess;\n        vec3 fresnel;\n      };     \n\n      uniform float time;\n      uniform vec2 resolution;\n      uniform vec3 camera_pos;\n      uniform vec3 camera_normal;\n\n      ","\n\n      // must be before geometries!\n      float length8( vec2 p ) { \n        return float( pow( pow(p.x,8.)+pow(p.y,8.), 1./8. ) ); \n      }\n\n      /* GEOMETRIES */\n      ","\n\n      vec2 scene(vec3 p);\n\n      // Originally sourced from https://www.shadertoy.com/view/ldfSWs\n// Thank you Iñigo :)\n\nvec2 calcRayIntersection(vec3 rayOrigin, vec3 rayDir, float maxd, float precis) {\n  float latest = precis * 2.0;\n  float dist   = +0.0;\n  float type   = -1.0;\n  vec2  res    = vec2(-1.0, -1.0);\n\n  for (int i = 0; i < "," ; i++) {\n    if (latest < precis || dist > maxd) break;\n\n    vec2 result = scene(rayOrigin + rayDir * dist);\n\n    latest = result.x;\n    type   = result.y;\n    dist  += latest;\n  }\n\n  if (dist < maxd) {\n    res = vec2(dist, type);\n  }\n\n  return res;\n}\n\nvec2 calcRayIntersection(vec3 rayOrigin, vec3 rayDir) {\n  return calcRayIntersection(rayOrigin, rayDir, 20.0, 0.001);\n}\n\n      // Originally sourced from https://www.shadertoy.com/view/ldfSWs\n// Thank you Iñigo :)\n\nvec3 calcNormal(vec3 pos, float eps) {\n  const vec3 v1 = vec3( 1.0,-1.0,-1.0);\n  const vec3 v2 = vec3(-1.0,-1.0, 1.0);\n  const vec3 v3 = vec3(-1.0, 1.0,-1.0);\n  const vec3 v4 = vec3( 1.0, 1.0, 1.0);\n\n  return normalize( v1 * scene ( pos + v1*eps ).x +\n                    v2 * scene ( pos + v2*eps ).x +\n                    v3 * scene ( pos + v3*eps ).x +\n                    v4 * scene ( pos + v4*eps ).x );\n}\n\nvec3 calcNormal(vec3 pos) {\n  return calcNormal(pos, 0.002);\n}\n\n      mat3 calcLookAtMatrix(vec3 origin, vec3 target, float roll) {\n  vec3 rr = vec3(sin(roll), cos(roll), 0.0);\n  vec3 ww = normalize(target - origin);\n  vec3 uu = normalize(cross(ww, rr));\n  vec3 vv = normalize(cross(uu, ww));\n\n  return mat3(uu, vv, ww);\n}\n\nvec3 getRay(mat3 camMat, vec2 screenPos, float lensLength) {\n  return normalize(camMat * vec3(screenPos, lensLength));\n}\n\nvec3 getRay(vec3 origin, vec3 target, vec2 screenPos, float lensLength) {\n  mat3 camMat = calcLookAtMatrix(origin, target, 0.0);\n  return getRay(camMat, screenPos, lensLength);\n}\n\n      //#pragma glslify: worley3D = require(glsl-worley/worley3D.glsl)\n\n      // OPS\n      float opU( float d1, float d2 )\n{\n    return min(d1,d2);\n}\n\nvec2 opU( vec2 d1, vec2 d2 ){\n\treturn ( d1.x < d2.x ) ? d1 : d2;\n}\n\n      float opI( float d1, float d2 ) {\n        return max(d1,d2);\n      }\n\n      vec2 opI( vec2 d1, vec2 d2 ) {\n        return ( d1.x > d2.x ) ? d1 : d2; //max(d1,d2);\n      }\n\n      float opS( float d1, float d2 ) { return max(d1,-d2); }\n      vec2  opS( vec2 d1, vec2 d2 ) {\n        return d1.x >= -d2.x ? vec2( d1.x, d1.y ) : vec2(-d2.x, d2.y);\n      }\n\n      /* ******** from http://mercury.sexy/hg_sdf/ ********* */\n\n      float fOpUnionStairs(float a, float b, float r, float n) {\n        float s = r/n;\n        float u = b-r;\n        return min(min(a,b), 0.5 * (u + a + abs ((mod (u - a + s, 2. * s)) - s)));\n      }\n      vec2 fOpUnionStairs(vec2 a, vec2 b, float r, float n) {\n        float s = r/n;\n        float u = b.x-r;\n        return vec2( min(min(a.x,b.x), 0.5 * (u + a.x + abs ((mod (u - a.x + s, 2. * s)) - s))), a.y );\n      }\n\n      // We can just call Union since stairs are symmetric.\n      float fOpIntersectionStairs(float a, float b, float r, float n) {\n        return -fOpUnionStairs(-a, -b, r, n);\n      }\n\n      float fOpSubstractionStairs(float a, float b, float r, float n) {\n        return -fOpUnionStairs(-a, b, r, n);\n      }\n\n      vec2 fOpIntersectionStairs(vec2 a, vec2 b, float r, float n) {\n        return vec2( -fOpUnionStairs(-a.x, -b.x, r, n), a.y );\n      }\n\n      vec2 fOpSubstractionStairs(vec2 a, vec2 b, float r, float n) {\n        return vec2( -fOpUnionStairs(-a.x, b.x, r, n), a.y );\n      }\n\n      float fOpUnionRound(float a, float b, float r) {\n        vec2 u = max(vec2(r - a,r - b), vec2(0));\n        return max(r, min (a, b)) - length(u);\n      }\n\n      float fOpIntersectionRound(float a, float b, float r) {\n        vec2 u = max(vec2(r + a,r + b), vec2(0));\n        return min(-r, max (a, b)) + length(u);\n      }\n\n      float fOpDifferenceRound (float a, float b, float r) {\n        return fOpIntersectionRound(a, -b, r);\n      }\n\n      vec2 fOpUnionRound( vec2 a, vec2 b, float r ) {\n        return vec2( fOpUnionRound( a.x, b.x, r ), a.y );\n      }\n      vec2 fOpIntersectionRound( vec2 a, vec2 b, float r ) {\n        return vec2( fOpIntersectionRound( a.x, b.x, r ), a.y );\n      }\n      vec2 fOpDifferenceRound( vec2 a, vec2 b, float r ) {\n        return vec2( fOpDifferenceRound( a.x, b.x, r ), a.y );\n      }\n\n      float fOpUnionChamfer(float a, float b, float r) {\n        return min(min(a, b), (a - r + b)*sqrt(0.5));\n      }\n\n      float fOpIntersectionChamfer(float a, float b, float r) {\n        return max(max(a, b), (a + r + b)*sqrt(0.5));\n      }\n\n      float fOpDifferenceChamfer (float a, float b, float r) {\n        return fOpIntersectionChamfer(a, -b, r);\n      }\n      vec2 fOpUnionChamfer( vec2 a, vec2 b, float r ) {\n        return vec2( fOpUnionChamfer( a.x, b.x, r ), a.y );\n      }\n      vec2 fOpIntersectionChamfer( vec2 a, vec2 b, float r ) {\n        return vec2( fOpIntersectionChamfer( a.x, b.x, r ), a.y );\n      }\n      vec2 fOpDifferenceChamfer( vec2 a, vec2 b, float r ) {\n        return vec2( fOpDifferenceChamfer( a.x, b.x, r ), a.y );\n      }\n\n      float fOpPipe(float a, float b, float r) {\n        return length(vec2(a, b)) - r;\n      }\n      float fOpEngrave(float a, float b, float r) {\n        return max(a, (a + r - abs(b))*sqrt(0.5));\n      }\n\n      float fOpGroove(float a, float b, float ra, float rb) {\n        return max(a, min(a + ra, rb - abs(b)));\n      }\n      float fOpTongue(float a, float b, float ra, float rb) {\n        return min(a, max(a - ra, abs(b) - rb));\n      }\n\n      vec2 fOpPipe( vec2 a, vec2 b, float r ) { return vec2( fOpPipe( a.x, b.x, r ), a.y ); }\n      vec2 fOpEngrave( vec2 a, vec2 b, float r ) { return vec2( fOpEngrave( a.x, b.x, r ), a.y ); }\n      vec2 fOpGroove( vec2 a, vec2 b, float ra, float rb ) { return vec2( fOpGroove( a.x, b.x, ra, rb ), a.y ); }\n      vec2 fOpTongue( vec2 a, vec2 b, float ra, float rb ) { return vec2( fOpTongue( a.x, b.x, ra, rb ), a.y ); }\n\n      float opOnion( in float sdf, in float thickness ){\n        return abs(sdf)-thickness;\n      }\n\n      float opHalve( in float sdf, vec3 p, in int dir ){\n        float _out = 0.;\n        switch( dir ) {\n          case 0:  \n            _out = max( sdf, p.y );\n            break;\n          case 1:\n            _out = max( sdf, -p.y );\n            break;\n          case 2:\n            _out = max( sdf, p.x );\n            break;\n          case 3:\n            _out = max( sdf, -p.x );\n            break;\n        }\n\n        return _out;\n      }\n\n      vec4 opElongate( in vec3 p, in vec3 h ) {\n        //return vec4( p-clamp(p,-h,h), 0.0 ); // faster, but produces zero in the interior elongated box\n        \n        vec3 q = abs(p)-h;\n        return vec4( max(q,0.0), min(max(q.x,max(q.y,q.z)),0.0) );\n      }\n\n      vec3 polarRepeat(vec3 p, float repetitions) {\n        float angle = 2.*PI/repetitions;\n        float a = atan(p.z, p.x) + angle/2.;\n        float r = length(p.xz);\n        float c = floor(a/angle);\n        a = mod(a,angle) - angle/2.;\n        vec3 _p = vec3( cos(a) * r, p.y,  sin(a) * r );\n        // For an odd number of repetitions, fix cell index of the cell in -x direction\n        // (cell index would be e.g. -5 and 5 in the two halves of the cell):\n        if (abs(c) >= (repetitions/2.)) c = abs(c);\n        return _p;\n      }\n\n      /* ******************************************************* */\n\n      // added k value to glsl-sdf-ops/soft-shadow\n      float softshadow( in vec3 ro, in vec3 rd, in float mint, in float tmax, in float k ){\n        float res = 1.0;\n        float t = mint;\n\n        for( int i = 0; i < 16; i++ ) {\n          float h = scene( ro + rd * t ).x;\n          res = min( res, k * h / t );\n          t += clamp( h, 0.02, 0.10 );\n          if( h<0.001 || t>tmax ) break;\n        }\n\n        return clamp( res, 0.0, 1.0 );\n      }\n\n","\n\n      vec2 scene(vec3 p) {\n","\n        return ",";\n      }\n \n\n      out vec4 col;\n\n      void main() {\n        vec2 pos = v_uv * 2.0 - 1.0;\n        pos.x *= ( resolution.x / resolution.y );\n        vec3 color = bg; \n        vec3 ro = camera_pos;\n\n        //float cameraAngle  = 0.8 * time;\n        //vec3  rayOrigin    = vec3(3.5 * sin(cameraAngle), 3.0, 3.5 * cos(cameraAngle));\n\n        vec3 rd = getRay( ro, camera_normal, pos, 2.0 );\n\n        vec2 t = calcRayIntersection( ro, rd, ",", "," );\n        if( t.x > -0.5 ) {\n          vec3 pos = ro + rd * t.x;\n          vec3 nor = calcNormal( pos );\n\n          color = lighting( pos, nor, ro, rd, t.y ); \n        }\n\n        ","\n        \n\n        col = vec4( color, 1.0 );\n      }",""],variables,geometries,steps,lighting,preface,scene,maxDistance,minDistance,postprocessing)

    return fs_source
  }

},{"glslify":26}],21:[function(require,module,exports){
const getFog = require( './fog.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const __lighting = require( './lighting.js' )
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc } = require('./var.js')

const getScene = function( SDF ) {

  Scene = function( objs, canvas, steps=100, minDistance=.001, maxDistance=40, size=2, shouldAnimate=false ) {
    const scene  = Object.create( Scene.prototype )

    MaterialID.clear()

    SDF.lighting.lights = []

    Object.assign( scene, { 
      objs, 
      canvas,
      postprocessing:[],
      __shadow:8
    })

    scene.animate( shouldAnimate )
      .steps( steps )
      .threshold( minDistance )
      .farPlane( maxDistance )
      .resolution( size )

    scene.useQuality = true

    SDF.__scene = scene

    return scene
  }

  Scene.prototype = {
    animate( v ) { this.__animate = v; return this },  
    resolution( v ) { 
      this.width = this.canvas.width = window.innerWidth * v
      this.height = this.canvas.height = window.innerHeight * v
      
      this.__resolution = v;
      this.useQuality = false
      return this 
    },  
    threshold( v ) { this.__threshold = v; this.useQuality = false; return this },  
    steps( v ) { this.__steps = v; this.useQuality = false; return this },  
    farPlane( v ) { this.__farPlane = v; this.useQuality = false;  return this },  
    camera( x=0, y=0, z=5 ) {
      Object.assign( SDF.camera.pos, { x,y,z })
      return this
    },
    shadow( k=0 ) {
      this.__shadow = k;
      return this;
    },
    quality( quality=10 ) {
      this.threshold( .1 / (quality * quality * quality ) )
      this.steps( quality * 20 )
      this.farPlane( quality * 5 )
      this.resolution( .2 * quality )

      return this
    },
    light( ...lights ) {
      SDF.lighting.lights = SDF.lighting.lights.concat( lights )
      return this
    },
    fog: getFog( Scene, SDF ),
    background: require( './background.js' )( Scene, SDF ),

    render( quality=10, animate=false ) {
      this.background() // adds default if none has been specified
      if( this.useQuality === true ) {
        this.quality( quality )
      }
      this.animate( animate )

      const lighting = SDF.lighting.gen( this.__shadow )

      const [ variablesDeclaration, sceneRendering, postprocessing ] = SDF.generateSDF( this )

      this.fs = SDF.renderFragmentShader( 
        variablesDeclaration, 
        sceneRendering.out, 
        sceneRendering.preface,
        SDF.requiredGeometries.join('\n') + SDF.requiredOps.join('\n'),
        lighting,
        postprocessing, 
        this.__steps, this.__threshold, this.__farPlane.toFixed(1)
      )

      SDF.start( this.fs, this.width, this.height, this.__animate )

      //SDF.materials.materials.length = 0

      this.useQuality = true

      return this
    },

  }

  return Scene

}

module.exports = getScene 

},{"./background.js":4,"./fog.js":11,"./lighting.js":14,"./utils.js":23,"./var.js":24}],22:[function(require,module,exports){
// SceneNode

let SceneNode = ()=> Object.create( SceneNode.prototype )

SceneNode.prototype = {
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
      center = this.sdf.getCenter()
    }

    return center
  }
}

module.exports = SceneNode

},{}],23:[function(require,module,exports){
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

},{"./var.js":24}],24:[function(require,module,exports){
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

},{"./float.js":10,"./int.js":13,"./vec.js":25}],25:[function(require,module,exports){
const float = require( './float.js' )

const Vec2 = function (x=0, y=0) {
  const v = Object.create( Vec2.prototype )
  v.x = x; v.y = y

  return v
}

Vec2.prototype = {
  type: 'vec2',
	emit() { return "vec2(" + this.x + "," + this.y + ")" },
	emit_decl() { return ""; }
}

const Vec3 = function (x=0, y, z) {
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
  })

  if( y === undefined && z === undefined) {
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
  }

}

const Vec4 = function (x=0, y, z) {
  const v = Object.create( Vec4.prototype )

  if( y === undefined && z === undefined) {
    v.x = v.y = v.z = x
  }else{
    v.x = x; v.y = y; v.z = z;
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

},{"./float.js":10}],26:[function(require,module,exports){
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

},{}]},{},[12]);
