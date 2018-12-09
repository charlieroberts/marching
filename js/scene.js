const getFog = require( './fog.js' )
const { param_wrap, MaterialID } = require( './utils.js' )
const __lighting = require( './lighting.js' )
const { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen, int_var_gen, VarAlloc } = require('./var.js')

const getScene = function( SDF ) {

  Scene = function( objs, canvas, steps=100, minDistance=.001, maxDistance=40, size=2, shouldAnimate=false ) {
    const scene  = Object.create( Scene.prototype )

    MaterialID.clear()
    //VarAlloc.clear()

    SDF.lighting.lights = []
    SDF.materials.materials = SDF.materials.__materials.slice(0)

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
      this.farPlane( quality * 20 )
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

      SDF.materials.__materials = []

      this.useQuality = true

      return this
    },

  }

  return Scene

}

module.exports = getScene 
