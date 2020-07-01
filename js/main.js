const MP   = require( '../node_modules/merge-pass/dist/index.js' )
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

  // a function that generates the fragment shader
  renderFragmentShader: require( './renderFragmentShader.js' ),

  // additional callbacks that are run once per frame
  callbacks: [],
  geometries: [],

  // the main drawing callback
  render: null,

  // the scene is a chain of Unions combining all elements together
  scene:  null,

  // a speed of 1 corresponds to 60 fps.
  delay: 0,
  __isPaused:false,

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
    obj.Texture  = this.Texture
    obj.camera = this.camera
    obj.callbacks = this.callbacks // XXX remove once API stops using callbacks
    obj.FFT = this.FFT
  },

  init( canvas, shouldInit = false ) {
    this.primitives = this.__primitives( this )
    this.Scene      = this.__scene( this )
    this.domainOps  = this.__domainOps( this )
    this.noise     = this.__noise( this )
    this.export( this )

    this.canvas = canvas//document.createElement('canvas')
    this.canvasMP = canvas

    this.lighting   = this.__lighting( this )
    this.Light = this.lighting.light
    this.materials  = this.__materials( this )
    this.Material = this.materials.material
    this.textures = this.__textures( this )
    this.Texture = this.textures.texture

    this.canvas.width = this.canvasMP.width = window.innerWidth 
    this.canvas.height = this.canvasMP.height = window.innerHeight
    this.gl = this.canvas.getContext( 'webgl2', { antialias:true, alpha:true })
    //this.glMP = this.canvasMP.getContext( 'webgl2', { antialias:true, alpha:true })
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

    // fog etc. maybe msaa?
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
    if( this.render !== null ) this.render.running = false
    this.geometries.length = 0

    const gl = this.gl
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT )
  },

  pause() {
    this.__isPaused = !this.__isPaused
  },

  initBuffers( width, height, colorTexture, depthTexture ) {
    const gl = this.gl
    gl.clearColor( 0.0, 0.0, 0.0, 0.0 )
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

    const framebuffer = gl.createFramebuffer()
 
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, ibo )
    gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW )
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.drawBuffers([
      gl.COLOR_ATTACHMENT0,
      gl.COLOR_ATTACHMENT1 
    ])
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, depthTexture, 0);

    return { vbo, ibo, vertices, indices, framebuffer }
  },

  initUniforms( gl, program ) {
    const aPos = this.gl.getAttribLocation( this.program, "a_pos" )
    const aUV = this.gl.getAttribLocation( this.program, "a_uv" )

    const uTime= this.gl.getUniformLocation( this.program, "time" )
    const uResolution = this.gl.getUniformLocation( this.program, "resolution" )

    return { aPos, aUV, uTime, uResolution } 
  },

  initTextures( gl, width, height ) {
    const colorTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, colorTexture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.myColorTexture = colorTexture

    const depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthTexture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)

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

  uploadVertices( gl, aPos, aUV, vertices, indices ) {
    gl.bufferData( gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW )
    gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW )

    gl.enableVertexAttribArray( aPos )
    gl.enableVertexAttribArray( aUV )

    gl.vertexAttribPointer( aPos, 3, gl.FLOAT, false, 20, 0)
    gl.vertexAttribPointer( aUV, 2, gl.FLOAT, false, 20, 12)
  },

  initMergePass( colorTexture, depthTexture ) {
    const lenExpr = MP.op(MP.len(MP.ncfcoord()), "*", 3);
    //const merger = new MP.Merger([MP.blur2d(lenExpr, lenExpr, 6)], sourceCanvas, gl);

    window.MP = MP
    window.fl = MP.float( MP.mut(1) )
    window.fl2 = MP.float( MP.mut(1) )
    window.dof = MP.dof()
    const m = new MP.Merger([

      //dof
      //MP.blur2d(lenExpr, lenExpr, 2)     
      //MP.fxaa()
      //MP.blur2d(fl, fl2)
      MP.hsv2rgb((c = MP.changecomp(MP.rgb2hsv(MP.fcolor()), MP.mut(0.5), "r", "+")))
      //MP.hsv2rgb(MP.changecomp(MP.rgb2hsv(MP.fcolor()), MP.op(MP.time(), '/', 5), "r", "+"))
    ], colorTexture, this.gl, { channels: [ depthTexture ] })

    return m
  },

  initWebGL( vs, fs, width, height,shouldAnimate=false ) {
    const gl                                = this.gl,
          programs                          = this.initShaderProgram( vs, fs, gl ),
          { colorTexture, depthTexture }    = this.initTextures( gl, width, height ),
          { aPos, aUV, uTime, uResolution } = this.initUniforms( gl, programs[0] ),
          merger                            = this.initMergePass( colorTexture, depthTexture ),
          { vbo, ibo, vertices, indices, framebuffer } = this.initBuffers( width, height, colorTexture, depthTexture )
 
    let total_time = 0.0,
        frameCount = 0

    gl.useProgram( this.program )
    this.updateLocations( gl, this.program )
    this.uploadVertices( gl, aPos, aUV, vertices, indices )

    gl.viewport( 0,0,width,height )
    gl.uniform2f( uResolution, width, height )
 
    const render = function( timestamp ){
      gl.useProgram( this.program )
      gl.bindFramebuffer( gl.FRAMEBUFFER, framebuffer )

      if( render.running === true && shouldAnimate === true ) {
        window.requestAnimationFrame( render )
      }else if( render.running === false ) {
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT )
        return
      }

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

      // transfer all data associated with uniforms in marching.js
      this.uploadData( gl )

      // draw to color and depth texturese
      gl.drawElements( gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0 )

      /********* UNCOMMENT THIS LINE TO CHECK MARCHING.JS COLOR OUPTUT ***************/
      this.runCopyShader( gl, width, height, aPos, aUV, programs, colorTexture )
      
      /********* UNCOMMENT THIS LINE TO CHECK MARCHING.JS DEPTH OUPTUT ***************/
      //this.runCopyShader( gl, width, height, aPos, aUV, programs, depthTexture )
 
      // disable to avoid warning in mergepass rendering
      gl.disableVertexAttribArray( aPos )
      gl.disableVertexAttribArray( aUV )

      // mergepass render
      merger.draw( total_time )

    }.bind( SDF )

    render.running = true

    return render    
  },

  runCopyShader( gl, width, height, loc_a_pos, loc_a_uv, programs, colorTexture ) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null )

    gl.bindTexture(gl.TEXTURE_2D, colorTexture)
    gl.viewport(0, 0, width, height )

    gl.useProgram( programs[1] )
    gl.vertexAttribPointer(loc_a_pos, 3, gl.FLOAT, false, 20, 0)
    gl.vertexAttribPointer(loc_a_uv, 2, gl.FLOAT, false, 20, 12)
    const u_resolution = gl.getUniformLocation(programs[1], "resolution" )
    gl.uniform2f( u_resolution, width, height )
    gl.drawElements( gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0 )

  }
}

module.exports = SDF
