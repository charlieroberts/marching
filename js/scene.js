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
      __followLight:null
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
      this.useQuality = false
      return this 
    },  
    voxel( v = .1 ) { 
      this.useVoxels = true
      this.__voxelSize = v
      return this
    },
    threshold( v ) { this.__threshold = v; this.useQuality = false; return this },  
    steps( v ) { this.__steps = v; this.useQuality = false; return this },  
    farPlane( v ) { this.__farPlane = v; this.useQuality = false;  return this },  
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
      this.threshold( .1 / (quality * quality * quality ) )
      this.steps( quality * 20 )
      this.farPlane( quality * 5 )
      if( this.donotuseresolution === undefined ) this.resolution( Math.min( .2 * quality, 2 ) )

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

      return preset.animated
    },

    post( ...fx ) {
      SDF.fx.post( ...fx )
      return this
    },

    render( quality=10, animate=false, useQuality=true ) {
      // adds default if none has been specified
      this.background() 

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

      this.fs = SDF.renderFragmentShader( 
        variablesDeclaration, 
        sceneRendering.out, 
        sceneRendering.preface,
        SDF.requiredGeometries.join('\n') + SDF.requiredOps.join('\n'),
        lighting,
        postprocessing, 
        this.__steps, this.__threshold, this.__farPlane.toFixed(1),
        SDF.distanceOps.__getGLSL() + SDF.alterations.__getGLSL(),
        this.useVoxels ? this.__voxelSize : 0
      )

      if( this.width === undefined ) this.width = window.innerWidth
      if( this.height === undefined ) this.height = window.innerHeight
      SDF.start( this.fs, this.width, this.height, this.__animate )

      //SDF.materials.materials.length = 0

      this.useQuality = true

      return this
    },

  }

  return Scene

}

module.exports = getScene 
