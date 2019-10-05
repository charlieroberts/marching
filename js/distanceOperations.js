const SceneNode = require( './sceneNode.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc } = require( './var.js' )
const Transform = require( './transform.js' )
const glslops = require( './distanceOperationsGLSL.js' )

const opslen = { 
  Union:5,
  SmoothUnion:6,
  Intersection:5,
  SmoothIntersection:6,
  Difference:5,
  SmoothDifference:6,
  StairsUnion:7,
  StairsIntersection:7,
  StairsDifference:7,
  RoundUnion:6,
  RoundDifference:6,
  RoundIntersection:6,
  ChamferUnion:6,
  ChamferDifference:6,
  ChamferIntersection:6,
  Pipe:6,
  Engrave:6,
  Groove:7,
  Tongue:7,
  
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
  Onion( a,b ) { return `opOnion( ${a}, ${b} )` },
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


for( let name in ops ) {

  // get codegen function
  let op = ops[ name ]
  const name2 = name + '2'

  // create constructor
  DistanceOps[ name ] = function( a,b,c,d ) {
    const op = Object.create( DistanceOps[ name ].prototype )
    op.a = a
    op.b = b
    op.transform = Transform( false )
    op.id = VarAlloc.alloc()
    op.type = 'domain_op'

    let __c = param_wrap( c, float_var_gen(.3) )

    op.__len = opslen[ name ]
    if( op.__len > 5 ) {
      Object.defineProperty( op, 'c', {
        get() { return __c },
        set(v) {
          __c.set( v )
        }
      })
      
      if( op.__len > 6 ) {
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
    this.b.texture( this.__textureObj )

    return this
  }
  DistanceOps[ name ].prototype.material = function( ...args ) {
    this.__setMaterial( ...args )
    this.a.material( this.__material )
    this.b.material( this.__material )

    return this
  }

  DistanceOps[ name ].prototype.emit = function ( pname='p', shouldRepeat=true, transform = null, shouldApplyTransform=true, repeat=null ){
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
      if( DistanceOps.__glsl.indexOf( glslobj.opOut ) === -1 ) {
        DistanceOps.__glsl.push( glslobj.opOut )
      }
    }

    const tname = `transformDO${this.id}`
    const prequel = `        vec4 ${tname} = ${pname} * ${this.transform.emit()};\n`
    
    // up to seven arguments... sdfa, sdfb, arg1 | sdfa.transform, arg2 | sdfb.transform, op.transform etc.
    // first two are fixed, rest are variable
    let emitters = []
    const a = this.a.emit( tname, false, this.transform, true, repeat ), 
          b = this.b.emit( tname, false, this.transform, true, repeat ) 

    emitters[0] = a.out
    emitters[1] = b.out
    emitters[2] = this.c !== undefined ? this.c.emit() : this.a.type === 'domain_op' ? 'do'+this.a.id+'.transform': this.a.transform.emit()
    emitters[3] = this.d !== undefined 
      ? this.d.emit() 
      : this.__len === 5 
        ? this.b.type === 'domain_op' ? 'do'+this.b.id+'.transform': this.b.transform.emit() 
        : this.a.type === 'domain_op' ? 'do'+this.a.id+'.transform': this.a.transform.emit()

    emitters[4] = this.__len <= 5 
      ? this.transform.emit() 
      : this.__len === 6 
        ? this.b.type === 'domain_op' ? 'do'+this.b.id+'.transform': this.b.transform.emit()
        : this.a.type === 'domain_op' ? 'do'+this.a.id+'.transform': this.a.transform.emit()

    emitters[5] = this.__len <= 5 
      ? null 
      : this.__len === 6 
        ? this.transform.emit() 
        : this.b.type === 'domain_op' ? 'do'+this.b.id+'.transform': this.b.transform.emit()
 
    emitters[6] = this.__len <= 6 ? null : this.transform.emit()

    emitters = emitters.filter( e => e !== null )

    emitters.push( repeat===null ? 'vec3(0.)' : repeat ) 

    const body = `
        opOut do${this.id} = ${op( ...emitters )};
        do${this.id}.x *= ${this.transform.emit()}_scale;
    `

    const output = {
      out: 'do'+this.id,
      preface: prequel + (a.preface || '') + (b.preface || '') + body
    }

    return output
  }

  DistanceOps[name].prototype.emit_decl = function () {
    let str =  this.transform.emit_decl() + this.a.emit_decl() + this.b.emit_decl()
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
    this.transform.update_location( gl, program )
    this.b.update_location( gl, program )
    if( this.c !== undefined ) this.c.update_location( gl, program )
    if( this.d !== undefined ) this.d.update_location( gl, program )
  }

  DistanceOps[name].prototype.upload_data = function(gl) {
    this.transform.upload_data( gl )
    this.a.upload_data( gl )
    this.b.upload_data( gl )
    if( this.c !== undefined ) this.c.upload_data( gl )
    if( this.d !== undefined ) this.d.upload_data( gl )
    
  }
}

//DistanceOps.Union2 = function( ...args ) {
//  const u = args.reduce( (state,next) => DistanceOps.Union( state, next ) )

//  return u
//}

//DistanceOps.SmoothUnion2 = function( ...args ) {
//  // accepts unlimited arguments, but the last one could be a blending coefficient
//  let blend = .8, u

//  if( typeof args[ args.length - 1 ] === 'number' ) {
//    blend = args.pop()
//    u = args.reduce( (state,next) => DistanceOps.SmoothUnion( state, next, blend ) )
//  }else{
//    u = args.reduce( (state,next) => DistanceOps.SmoothUnion( state, next ) )
//  }

//  return u
//}

//DistanceOps.RoundUnion2 = function( ...args ) {
//  // accepts unlimited arguments, but the last one could be a blending coefficient
//  let blend = .25, u

//  if( typeof args[ args.length - 1 ] === 'number' ) {
//    blend = args.pop()
//    u = args.reduce( (state,next) => DistanceOps.RoundUnion( state, next, blend ) )
//  }else{
//    u = args.reduce( (state,next) => DistanceOps.RoundUnion( state, next ) )
//  }

//  return u
//}

//ops.SmoothDifference.code = `      float opSmoothSubtraction( float d1, float d2, float k ) {
//        float h = clamp( 0.5 - 0.5*(d2+d1)/k, 0.0, 1.0 );
//        return mix( d2, -d1, h ) + k*h*(1.0-h); 
//      }
//      vec2 opSmoothSubtraction( vec2 d1, vec2 d2, float k ) {
//        float h = clamp( 0.5 - 0.5*(d2.x+d1.x)/k, 0.0, 1.0 );
//        return vec2( mix( d2.x, -d1.x, h ) + k*h*(1.0-h), mix( d2.y, d1.y, h ) );
//      }
//`

//ops.SmoothIntersection.code = `      float opSmoothIntersection( float d1, float d2, float k ) {
//        float h = clamp( 0.5 - 0.5*(d2-d1)/k, 0.0, 1.0 );
//        return mix( d2, d1, h ) + k*h*(1.0-h); 
//      }
//      vec2  opSmoothIntersection( vec2 d1, vec2 d2, float k ) {
//        float h = clamp( 0.5 - 0.5*(d2.x-d1.x)/k, 0.0, 1.0 );
//        return vec2( mix( d2.x, d1.x, h ) + k*h*(1.0-h), mix( d2.y, d1.y, h ) ); 
//      }
//`      

//ops.SmoothUnion.code = `      vec2 smin( vec2 a, vec2 b, float k) {
//        float startx = clamp( 0.5 + 0.5 * ( b.x - a.x ) / k, 0.0, 1.0 );
//        float hx = mix( b.x, a.x, startx ) - k * startx * ( 1.0 - startx );


//        // material blending... i am proud.
//        float starty = clamp( (b.x - a.x) / k, 0., 1. );
//        float hy = 1. - (a.y + ( b.y - a.y ) * starty); 

//        return vec2( hx, hy ); 
//      }
//      float smin(float a, float b, float k) {
//        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
//        return mix(b, a, h) - k * h * (1.0 - h);
//      }
//      //float opS( float d1, float d2 ) { return max(d1,-d2); }
//      //vec2  opS( vec2 d1, vec2 d2 ) {
//      //  return d1.x >= -d2.x ? vec2( d1.x, d1.y ) : vec2(-d2.x, d2.y);
//      //}

//      float opSmoothUnion( float a, float b, float k) {
//        return smin( a, b, k );
//      }

//      vec2 opSmoothUnion( vec2 a, vec2 b, float k) {
//        return smin( a, b, k);
//      }
//`
module.exports = DistanceOps

