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
  Onion( a,b ) { return `opOnion( ${a}, ${b} )` }
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
      float opS( float d1, float d2 ) { return max(d1,-d2); }
      vec2  opS( vec2 d1, vec2 d2 ) {
        return d1.x >= -d2.x ? vec2( d1.x, d1.y ) : vec2(-d2.x, d2.y);
      }

      float opSmoothUnion( float a, float b, float k) {
        return smin( a, b, k );
      }

      vec2 opSmoothUnion( vec2 a, vec2 b, float k) {
        return smin( a, b, k);
      }
`
module.exports = DistanceOps

