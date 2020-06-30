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

  initBuffers( width, height ) {
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

    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, ibo )
    gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW )
    
    return { vbo, ibo, vertices, indices }
  },

  initWebGL( vs_source, fs_source, width, height,shouldAnimate=false ) {
    const gl = this.gl
    //if( shouldInit === true ) this.initBuffers()
    
    // XXX clean all this up!
    const colorTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, colorTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    const depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    const lenExpr = MP.op(MP.len(MP.ncfcoord()), "*", 3);
    //const merger = new MP.Merger([MP.blur2d(lenExpr, lenExpr, 6)], sourceCanvas, gl);
    window.MP = MP
    window.fl = MP.float(MP.mut(1));
    window.fl2 = MP.float(MP.mut(1));
    window.dof = MP.dof()
    const m = new MP.Merger([

      dof
      //MP.blur2d(lenExpr, lenExpr, 2)     
      //MP.fxaa()
      //MP.blur2d(fl, fl2)
      //MP.hsv2rgb((c = MP.changecomp(MP.rgb2hsv(MP.fcolor()), MP.mut(0.5), "r", "+")))
      //MP.hsv2rgb(MP.changecomp(MP.rgb2hsv(MP.fcolor()), MP.op(MP.time(), '/', 5), "r", "+"))
    ], colorTexture, this.gl, { channels: [depthTexture] });
    
    const programs = this.createProgram( vs_source, fs_source )
    const program = this.program = programs[0]
    gl.useProgram( this.program )

    const { vbo, ibo, vertices, indices } = this.initBuffers( width, height )

    const framebuffer = gl.createFramebuffer()
 
    const loc_a_pos = gl.getAttribLocation(program, "a_pos");
    const loc_a_uv = gl.getAttribLocation(program, "a_uv");

    const loc_u_time = gl.getUniformLocation(program, "time");
    const loc_u_resolution = gl.getUniformLocation(program, "resolution" )

    this.postprocessing.forEach( pp => pp.update_location( gl, program ) )

    this.scene.update_location( gl, program )
    this.textures.update_location( gl, program )
    this.materials.update_location( gl, program )
    this.lighting.update_location( gl, program )

    //gl.enableVertexAttribArray(loc_a_pos)
    //gl.enableVertexAttribArray(loc_a_uv)

    //gl.vertexAttribPointer(loc_a_pos, 3, gl.FLOAT, false, 20, 0)
    //gl.vertexAttribPointer(loc_a_uv, 2, gl.FLOAT, false, 20, 12)

    gl.viewport( 0,0,width,height )
    gl.uniform2f( loc_u_resolution, width, height )

    let total_time = 0.0;

    let frameCount = 0
    const render = function( timestamp ){
      gl.useProgram( this.program )
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, depthTexture, 0);

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
        gl.uniform1f( loc_u_time, total_time )

        this.callbacks.forEach( cb => cb( total_time, this.currentTime ) )

        if( typeof window.onframe === 'function' ) {
          window.onframe( total_time )
        }
      }

      this.materials.upload_data( gl )
      this.textures.upload_data( gl )
      this.scene.upload_data( gl )
      this.lighting.upload_data( gl )
      this.postprocessing.forEach( pp => pp.upload_data( gl ) )

      gl.bindBuffer (gl.ARRAY_BUFFER, vbo )
      gl.bufferData( gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW )
      gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, ibo )
      gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW )
      gl.enableVertexAttribArray(loc_a_pos)
      gl.enableVertexAttribArray(loc_a_uv)

      gl.vertexAttribPointer(loc_a_pos, 3, gl.FLOAT, false, 20, 0)
      gl.vertexAttribPointer(loc_a_uv, 2, gl.FLOAT, false, 20, 12)

      gl.drawBuffers([
        gl.COLOR_ATTACHMENT0,
        gl.COLOR_ATTACHMENT1 
      ])
      // Create a color texture
      gl.drawElements( gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0 )

      //gl.bindBuffer (gl.ARRAY_BUFFER, null )
      //gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null )
      gl.bindFramebuffer(gl.FRAMEBUFFER, null );
      //gl.viewport(0, 0, width, height )

      gl.activeTexture( gl.TEXTURE0 )
      gl.bindTexture( gl.TEXTURE_2D, colorTexture )
      gl.useProgram( programs[1] )
      //gl.vertexAttribPointer(loc_a_pos, 3, gl.FLOAT, false, 20, 0)
      //gl.vertexAttribPointer(loc_a_uv, 2, gl.FLOAT, false, 20, 12)
      ////this.initBuffers()
      const u_resolution = gl.getUniformLocation(programs[1], "resolution" )
      gl.uniform2f( u_resolution, width, height )
      gl.drawElements( gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0 )

      //gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);
      m.draw( total_time )
    }.bind( SDF )

    render.running = true

    return render    
  }
}

module.exports = SDF
