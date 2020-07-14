const MP   = require( '@bandaloo/merge-pass' )

const FX = {
  merger:null,
  chain: [],
  MP,
  clear() {
    if( this.merger !== null ) {
       this.merger.delete()
       this.merger = null
    }

    this.chain.length = 0
  },

  init( colorTexture, depthTexture, gl ) {
    this.merger = new MP.Merger( 
      this.chain,
      colorTexture, 
      gl, 
      { channels: [ depthTexture ] }
    )
  }, 

  run( time ) {
    merger.draw( time )
  },

  post( ...fx ) {
    FX.chain = fx.map( v => v.__wrapped__ )
  },

  export( obj ) {
    obj.Blur = FX.Blur
    obj.Bokeh = FX.Bokeh
    obj.Godrays = FX.Godrays
    obj.Antialias = FX.Antialias
  },

  wrapProperty( obj, name, __value ) {
    const primitive = MP.float( MP.mut( __value ) )
    
    let value = __value
    Object.defineProperty( obj, name, {
      get() { return value },
      set(v) {
        value = v
        primitive.setVal( value )
      }
    })
   
    return primitive
  },

  Blur( amount=.5, reps=2, taps=5 ) {
    const fx = {}

    const __amount = FX.wrapProperty( fx, 'amount', amount )
    fx.__wrapped__ = MP.blur2d( __amount, __amount, reps, taps )

    return fx 
  },

  Bokeh( __depth=0, __radius=.01 ) {
    const fx = {},
          depth  = FX.wrapProperty( fx, 'depth',  __depth  ),
          radius = FX.wrapProperty( fx, 'radius', __radius ) 

    fx.__wrapped__ = MP.dof( depth, radius ) 

    return fx
  },

  Godrays( __decay=1, __weight=.01, __density=1 ) {
    const fx = {},
          decay   = FX.wrapProperty( fx, 'decay',   __decay   ),
          weight  = FX.wrapProperty( fx, 'weight',  __weight  ),
          density = FX.wrapProperty( fx, 'density', __density )

    fx.__wrapped__ = MP.godrays({ 
      decay, weight, density,
      threshold: -0.2,
      newColor: MP.vec4(.5,.15,0,1),
    })

    return fx
  },

  Antialias( mult=1 ) {
    return MP.loop([ MP.fxaa() ], mult )
  }
}

module.exports = FX
