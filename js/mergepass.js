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
