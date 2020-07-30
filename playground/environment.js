const CodeMirror = require( 'codemirror' ),
      Toastr     = require( 'toastr' )

require( '../node_modules/codemirror/mode/javascript/javascript.js' )
require( '../node_modules/codemirror/addon/edit/matchbrackets.js' )
require( '../node_modules/codemirror/addon/edit/closebrackets.js' )
require( '../node_modules/codemirror/addon/hint/show-hint.js' )
require( '../node_modules/codemirror/addon/hint/javascript-hint.js' )
require( '../node_modules/codemirror/addon/display/fullscreen.js' )
require( '../node_modules/codemirror/addon/selection/active-line.js' )
require( '../node_modules/codemirror/addon/display/panel.js' )
require( '../node_modules/mousetrap/mousetrap.min.js' )

const Tweakpane = require('tweakpane')

const demos = {
  introduction: require( './demos/intro.js' ),
  ['textured transformations']: require('./demos/texture_transforms.js'),
  //['the superformula']: require('./demos/superformula.js' ),
  ['mandelbulb fractal']: require( './demos/mandelbulb.js' ),
  ['julia fractal']: require( './demos/julia.js' ),
  ['voxels and edges']: require( './demos/voxels_and_edges.js' ),
  ['alien portal']: require( './demos/alien_portal.js' ),
  ["i've got a light inside of me"]: require( './demos/let_it_shine.js' ),
  ['snare and sticks']: require( './demos/snare.js' ),
  //['kaleidoscopic fractals']: require( './demos/kifs.js' ),
  //['alien portal #2']: require( './demos/portal2.js' ),
  //['twist deformation']: require( './demos/twist.js' ),
  ['geometry catalog']: require( './demos/geometries.js' ),
  ['textures catalog']: require( './demos/textures.js' ),
}

const tutorials = {
  ['start here']: require( './demos/tutorial_1.js' ),
  ['constructive solid geometry']: require( './demos/csg.js' ),
  ['lighting and materials']: require( './demos/lighting.js' ),
  ['texturing']: require( './demos/textures_tutorial.js' ),
  ['texturing with hydra']: require( './demos/hydra.js' ),
  ['texturing with p5.js']: require( './demos/p5.js' ),
  ['post-processing effects']: require( './demos/postprocessing.js' ),
  ['exporting gifs and links']: require( './demos/gifs_and_links.js' ),
  ['audio input / fft']: require( './demos/audio.js' ),
  ['live coding']: require( './demos/livecoding.js' ),
  ['defining your own GLSL shapes']: require( './demos/constructors.js' ),
  ['defining procedural textures']: require( './demos/procedural_textures.js' )
}

Math.export = ()=> {
  const arr = Object.getOwnPropertyNames( Math )
  arr.forEach( el => window[el] = Math[el] )
}

window.onload = function() {
  const ta = document.querySelector( '#cm' )

  const SDF = window.Marching

  SDF.init( document.querySelector('canvas') )
  SDF.export( window )
  SDF.keys = {
    w:0,
    a:0,
    s:0,
    d:0,
    alt:0
  }

  Math.export()
  SDF.useProxies = false

  let hidden = false
  let fontSize = .95
  SDF.cameraEnabled = false

  //document.querySelector('#cameratoggle').onclick = e => {
  //  SDF.cameraEnabled = e.target.checked
  //}

  CodeMirror.keyMap.playground =  {
    fallthrough:'default',

    'Ctrl-Enter'( cm ) {
      try {
        const selectedCode = getSelectionCodeColumn( cm, false )

        flash( cm, selectedCode.selection )

        const code = selectedCode.code

        const func = new Function( code )
        
        if( SDF.useProxies === true ) {
          const preWindowMembers = Object.keys( window )
          func()
          const postWindowMembers = Object.keys( window )

          if( preWindowMembers.length !== postWindowMembers.length ) {
            createProxies( preWindowMembers, postWindowMembers, window )
          }
        }else{
          func()
        }
      } catch (e) {
        console.log( e )
      }
    },
    'Shift-Ctrl-H'() { 
      toggleGUI() 
    },
    'Shift-Ctrl-G'() { 
      toggleGUI() 
    },
    'Shift-Ctrl-C'() { 
      toggleCamera() 
    },
    'Alt-W'( cm ) {
      SDF.keys.w = 1
    },
    'Alt-A'( cm ) {
      SDF.keys.a = 1
    },
    'Alt-S'( cm ) {
      SDF.keys.s = 1
    },
    'Alt-D'( cm ) {
      SDF.keys.d = 1
    },
    'Alt-Enter'( cm ) {
      try {
        var selectedCode = getSelectionCodeColumn( cm, true )

        flash( cm, selectedCode.selection )

        var code = selectedCode.code

        var func = new Function( code )

        if( SDF.useProxies === true ) {
          const preWindowMembers = Object.keys( window )
          func()
          const postWindowMembers = Object.keys( window )

          if( preWindowMembers.length !== postWindowMembers.length ) {
            createProxies( preWindowMembers, postWindowMembers, window )
          }
        }else{
          func()
        }
      } catch (e) {
        console.log( e )
      }
    },
    'Ctrl-.'( cm ) {
      SDF.clear() 
      guis.forEach( g => { if( g.containerElem_ !== null ) { g.dispose() } } )
      guis.length = 0
      proxies.length = 0
    },
    "Shift-Ctrl-=": function(cm) {
      fontSize += .1
      document.querySelector('.CodeMirror-lines').style.fontSize= fontSize + 'em'
      cm.refresh()
    },
    
    "Shift-Ctrl--": function(cm) {
      fontSize -= .1
      document.querySelector('.CodeMirror-lines').style.fontSize = fontSize + 'em'
      cm.refresh()
    }
  }

  const toggleToolbar = function() {
    if( hidden === false ) {
      document.querySelector('select').style.display = 'none'
      document.querySelector('#help').style.display = 'none'
      document.querySelector('#source').style.display = 'none'
    }else{
      document.querySelector('select').style.display = 'inline-block'
      document.querySelector('#help').style.display = 'inline-block'
      document.querySelector('#source').style.display = 'inline-block'
    }
  }

  const toggleGUI = function() {
    if( hidden === false ) {
      cm.getWrapperElement().style.display = 'none'
      toggleToolbar() 
    }else{
      cm.getWrapperElement().style.display = 'block'
      toggleToolbar()
    }

    hidden = !hidden
  }

  window.toggleCamera = function( shouldToggleGUI=true) {
    Marching.cameraEnabled = !Marching.cameraEnabled
    //document.querySelector('#cameratoggle').checked = Marching.cameraEnabled
    if( shouldToggleGUI ) toggleGUI()
    Marching.camera.on()
  }

  // have to bind to window for when editor is hidden
  Mousetrap.bind('ctrl+shift+g', toggleGUI )
  Mousetrap.bind('ctrl+shift+c', e => {
    toggleCamera()
  })

  delete CodeMirror.keyMap.default[ 'Ctrl-H' ]

  const cm = CodeMirror( document.body, { 
    value:demos.introduction,
    mode:'javascript',
    fullScreen:true,
    keyMap:'playground',
    styleActiveLine:true,
    autofocus:true,
    matchBrackets:true,
    autoCloseBrackets:true,

  })
  cm.setOption('fullScreen', true )


  cm.on('keyup', (cm, event) => {
    if( SDF.cameraEnabled ) {
      const code = event.key//.code.slice(3).toLowerCase()
      SDF.keys[ code ] = 0
    }else if( event.key === 'Alt' ) {
      for( let key in SDF.keys ) {
        SDF.keys[ key ] = 0
      }
    } 
  })

  cm.on('keydown', (cm,event) => {
    if( SDF.cameraEnabled ) {
      SDF.keys[ event.key ] = 1
      event.codemirrorIgnore = 1
      event.preventDefault()
    }
  })

  delete CodeMirror.keyMap.default[ 'Ctrl-H' ]

  window.addEventListener( 'keydown', e => {
    if( e.key === 'h' && e.ctrlKey === true ) {
      toggleGUI()
    }else if( e.key === '.' && e.ctrlKey === true && e.shiftKey === true ) {
      SDF.pause()
    }else if( SDF.cameraEnabled ) {
      SDF.keys[ e.key ] = 1
    }
  })
  window.addEventListener( 'keyup', e => {
    if( SDF.cameraEnabled ) {
      SDF.keys[ e.key ] = 0
    }
  })



  const sel = document.querySelector('select')
  const demoGroup = document.createElement('optgroup')
  demoGroup.setAttribute( 'label', '----- demos -----' )
  const tutorialGroup = document.createElement('optgroup')
  tutorialGroup.setAttribute( 'label', '----- tutorials -----' )

  for( let key in demos ) {
    const opt = document.createElement( 'option' )
    opt.innerText = key

    demoGroup.appendChild( opt )
  }
  sel.appendChild( demoGroup )

  for( let key in tutorials ) {
    const opt = document.createElement( 'option' )
    opt.innerText = key

    tutorialGroup.appendChild( opt )
  }
  sel.appendChild( tutorialGroup )

  sel.onchange = e => {
    let isDemo = true
    code = demos[ e.target.selectedOptions[0].innerText ]
    if( code === undefined ) {
      isDemo = false
      code = tutorials[ e.target.selectedOptions[0].innerText ]
    }

    SDF.clear()
    window.onframe = null
    if( isDemo === true ) {
      eval( code )
    }

    cm.setValue( code )
  }

  var getSelectionCodeColumn = function( cm, findBlock ) {
    var pos = cm.getCursor(), 
      text = null

    if( !findBlock ) {
      text = cm.getDoc().getSelection()

      if ( text === "") {
        text = cm.getLine( pos.line )
      }else{
        pos = { start: cm.getCursor('start'), end: cm.getCursor('end') }
        //pos = null
      }
    }else{
      var startline = pos.line, 
        endline = pos.line,
        pos1, pos2, sel

      while ( startline > 0 && cm.getLine( startline ) !== "" ) { startline-- }
      while ( endline < cm.lineCount() && cm.getLine( endline ) !== "" ) { endline++ }

      pos1 = { line: startline, ch: 0 }
      pos2 = { line: endline, ch: 0 }

      text = cm.getRange( pos1, pos2 )

      pos = { start: pos1, end: pos2 }
    }

    if( pos.start === undefined ) {
      var lineNumber = pos.line,
        start = 0,
        end = text.length

      pos = { start:{ line:lineNumber, ch:start }, end:{ line:lineNumber, ch: end } }
    }

    return { selection: pos, code: text }
  }

  const flash = function(cm, pos) {
    let sel
    const cb = function() { sel.clear() }

    if (pos !== null) {
      if( pos.start ) { // if called from a findBlock keymap
        sel = cm.markText( pos.start, pos.end, { className:"CodeMirror-highlight" } );
      }else{ // called with single line
        sel = cm.markText( { line: pos.line, ch:0 }, { line: pos.line, ch:null }, { className: "CodeMirror-highlight" } )
      }
    }else{ // called with selected block
      sel = cm.markText( cm.getCursor(true), cm.getCursor(false), { className: "CodeMirror-highlight" } );
    }

    window.setTimeout( cb, 250 )
  
  }

  let __mute = false
  window.mute = function() {
    __mute = !__mute
  }
  const msg = function( msg, title ) {
    if( __mute === false ) {
      Toastr.options = {
        "closeButton": false,
        "debug": false,
        "newestOnTop": false,
        "progressBar": false,
        "positionClass": "toast-bottom-center",
        "preventDuplicates": false,
        "onclick": null,
        "showDuration": "300",
        "hideDuration": "1000",
        "timeOut": "4000",
        "extendedTimeOut": "1000",
        "showEasing": "swing",
        "hideEasing": "linear",
        "showMethod": "fadeIn",
        "hideMethod": "fadeOut"
      }

      Toastr.info( msg, title )
    }
  }
  //https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.1.9/p5.min.js
  const libs = {}

  window.use = function( ...libs ) {
    if( libs.length === 1 ) { 
      return window.__use( libs[0] ) 
    }else{
      return Promise.all( libs.map( l => window.__use( l ) ) )
    }
  }

  window.__use = function( lib ) {
    const p = new Promise( (res,rej) => {
      if( lib === 'dwitter' ) {
        window.Dwitter = function( draw, __props ) {
          const props = Object.assign( {}, { width:1920, height:1080, scale:1, mirror:Texture.repeat }, __props )
          const tex = Texture( 'canvas', props )
          window.c = tex.canvas
          window.x = tex.ctx
          window.C = Math.cos
          window.S = Math.sin
          window.T = Math.tan
          window.R = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;

          Marching.postrendercallbacks.push( t => { draw( t ); tex.update() })

          return tex
        }

        res()
      } else if( lib.indexOf('http') > -1 ) {
        const p5script = document.createElement( 'script' )
        p5script.src = lib

        document.querySelector( 'head' ).appendChild( p5script )

        p5script.onload = function() {
          msg( `${lib} has been loaded.`, 'new module loaded' )
          res()
        }
      }else if( lib === 'p5' ) {
        if( libs.P5 !== undefined ) { res( libs.P5 ); return }

        const p5script = document.createElement( 'script' )
        p5script.src = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.1.9/p5.min.js'

        document.querySelector( 'head' ).appendChild( p5script )

        p5script.onload = function() {
          msg( 'p5 is ready to texture', 'new module loaded' )
          const __p5 = p5

          window.P5 = function( w=500,h=500 ) {
            const canvas = document.createElement('div')
            canvas.setAttribute('id','container')
            canvas.width  = w
            canvas.height = h
            const sketch = function(p) {
              p.setup = function(){
                p.createCanvas( w,h )
                p.background(0)
              }
            }
            const p = new p5( sketch, 'container' ) 

            p.texture = ()=> {
              const t = Texture('canvas', { canvas:p.canvas })
              Marching.postrendercallbacks.push( ()=> t.update() )
              p.texture = t
              return t
            }
            
            return p
          }

          libs.P5 = p5

          res( p5 )
        } 
      } else if( lib === 'hydra' ) {
        if( libs.Hydra !== undefined ) { res( libs.Hydra ); return }

        const hydrascript = document.createElement( 'script' )
        hydrascript.src = 'https://cdn.jsdelivr.net/npm/hydra-synth@1.3.0/dist/hydra-synth.js'
        document.querySelector( 'head' ).appendChild( hydrascript )

        hydrascript.onload = function() {
          msg( 'hydra is ready to texture', 'new module loaded' )
          const Hydrasynth = Hydra
          let __hydra = null

          window.Hydra = function( w=500,h=500 ) {
            const canvas = document.createElement('canvas')
            canvas.width = w
            canvas.height = h
            const hydra = __hydra === null ?  new Hydrasynth({ canvas, global:false, detectAudio:false }) : __hydra
            //hydra.setResolution(w,h)

            if( __hydra === null ) {
              hydra.synth.canvas = canvas
            }

            hydra.synth.texture = ()=> {
              const t = Texture('canvas', { canvas:hydra.synth.canvas })
              Marching.postrendercallbacks.push( ()=> t.update() )
              hydra.synth.texture = t
              return t
            }
            
            __hydra = hydra

            return hydra.synth
          }
          libs.Hydra = Hydra

          res( Hydra )
        } 
      } else if( lib === 'gif' ){ 
        if( libs.GIF !== undefined ) { res( libs.GIF ); return }

        // first load actual script
        const script = document.createElement( 'script' )
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js'
        document.querySelector( 'head' ).appendChild( script )
        const p1 = new Promise( (_res, rej) => {
          script.onload = _res
        })

        // then load worker as text to create blob
        // since you can't pass link to non-origin for worker
        const p2 = fetch( 'https://cdn.jsdelivr.net/gh/jnordberg/gif.js/dist/gif.worker.js' )
          .then( t => t.text() )

        Promise.all([ p1, p2 ]).then( values => {
          msg( 'gifs can now be exported', 'new module loaded' )
          const workerBlob = new Blob([ values[1] ])
          const workerURL  = window.URL.createObjectURL( workerBlob )

          Marching.Scene.prototype.gif = function( width=600, height=335, length=60, quality=5, delay=17, filename='marching.gif' ) {
            const gif = new GIF({
              quality, width, height,
              workers:2,
              workerScript: workerURL
            })

            this.setdim( width,height )

            let framecount = 0
            Marching.postrendercallbacks.push( ()=> {
              gif.addFrame( Marching.canvas, { copy:true, delay }) 
              if( framecount++ === length-1 ) {
                gif.render()
              }
            })

            let finished = false
            gif.on( 'finished', blob => {
              // prevent chrome double finish event
              if( finished === false ) {
                const link = window.document.createElement('a')
                link.href = URL.createObjectURL( blob )
                link.download = filename

                var click = new MouseEvent('click', {
                  'view': window,
                  'bubbles': true,
                  'cancelable': true
                });

                link.dispatchEvent(click)

                finished = true
                msg( '', 'download complete' )
              }
            })

            return this
          }

          libs.GIF = GIF

          res( GIF ) 
        })
      }
    })

    return p
  }

  const ease = t => t < .5 ? 2*t*t : -1+(4-2*t)*t

  window.fade = ( objname, propname, target, seconds ) => {
    const objsplit = objname.indexOf('.') === -1 ? null : objname.split('.')
    const split = propname.indexOf('.') === -1 ? null : propname.split('.')
    const startValue = [], diff = []
    const inc  = 1 / ( seconds * 60 )   
    let obj
    if( objsplit === null ) {
      obj = window[ objname ]
    }else{
      obj = window
      objsplit.forEach( v => obj = obj[ v ] )
    }
    const isVec = split === null && obj[ propname ].type.indexOf( 'vec' ) !== -1

    let vecCount = isVec === true ? parseInt( obj[ propname ].type.slice(3) ) : null
    let t = 0

 
    if( isVec ) {
      startValue[0] = obj[ propname ].x 
      startValue[1] = obj[ propname ].y
      if( vecCount > 2 ) startValue[2] = obj[ propname ].z

      diff[0] = target - startValue[0] 
      diff[1] = target - startValue[1]
      if( vecCount > 2 ) diff[2] = target - startValue[2]
    }else{
      if( split === null ) { 
        startValue[0] = obj[ propname ].value 
      }else{
        for( let i = 0; i < split.length; i++ ) {
          //split.forEach( (v,i) => obj = isVec ? : obj[ v ] )
          obj = obj[ split[ i ] ] 
        }
        startValue[0] = obj 
      }

      diff[ 0 ] = target - startValue[ 0 ]
    }

    const fnc = () => {
      const easeValue = ease( t )
      if( split === null ) {
        if( isVec === false ) {
          obj[ propname ]   = startValue[0] + easeValue * diff[0]
        }else{
          obj[ propname ].x = startValue[0] + easeValue * diff[0]
          obj[ propname ].y = startValue[1] + easeValue * diff[1]

          if( vecCount > 2 ) {
            obj[ propname ].z = startValue[2] + easeValue * diff[2]
          }
        }
      }else{
        for( let i = 0; i < split.length - 1; i++ ) {
          //split.forEach( (v,i) => obj = isVec ? : obj[ v ] )
          obj = obj[ split[ i ] ] 
        }
        obj[ split[ split.length - 1 ] ]= startValue[0] + easeValue * diff[0]
      }
      t += inc
      if( t >= 1 ) {
        if( split !== null ) {
          obj[ split[ split.length - 1 ] ] = target 
        }else{
          obj[ propname ] = target
        }

        fnc.cancel()
      }
    }
    
    callbacks.push( fnc )
    
    fnc.cancel = ()=> {
      const idx = callbacks.indexOf( fnc )
      callbacks.splice( idx, 1 )
    }
    
    return fnc
  }

  const proxies = []

  const createProxies = function( pre, post, proxiedObj ) {
    const newProps = post.filter( prop => pre.indexOf( prop ) === -1 )

    for( let prop of newProps ) {
      let obj = proxiedObj[ prop ]
      if( obj.params !== undefined ) {
        Object.defineProperty( proxiedObj, prop, {
          get() { return obj },
          set(value) {

            if( obj !== undefined && value !== undefined) {
              
              for( let param of obj.params ) {
                if( param.name !== 'material' ) {
                  value[ param.name ] = obj[ param.name ].value
                }
              }
            }

            obj = value
          }
        })

        proxies.push( prop )
      }
    }
  }

  let guielement = null
  const guis = []

  const processParams = function( obj, pane, params ) {
    params.forEach( param => {
      if( param.type === 'float' ) { 
        const guiparam = {
          get [param.name]() { return obj[ param.name ].value.x },
          set [param.name](v){ obj[ param.name ].value.x = v; obj[ param.name ].dirty = true }
        }
        const min = param.min || 0, max = param.max || 3, step = param.step
        pane.addInput( guiparam, param.name, { min, max, step })
      }else if( param.type === 'vec3' ) {
        if( param.name.search( 'color' ) === -1 ) {
          const guiparam = {
            [param.name]:{
              get x() { return obj[ param.name ].value.x },
              set x(v){ obj[ param.name ].value.x = v; obj[ param.name ].dirty = true },
              get y() { return obj[ param.name ].value.y },
              set y(v){ obj[ param.name ].value.y = v; obj[ param.name ].dirty = true },
              get z() { return obj[ param.name ].value.z },
              set z(v){ obj[ param.name ].value.z = v; obj[ param.name ].dirty = true }
            }
          }
          const min = param.min || 0, max = param.max || 3, step = param.step
          pane.addInput( guiparam[ param.name ], 'x', { min, max, label:param.name + ' X' })
          pane.addInput( guiparam[ param.name ], 'y', { min, max, label:param.name + ' Y' })
          pane.addInput( guiparam[ param.name ], 'z', { min, max, label:param.name + ' Z' })
        }else{
          const guiparam = { [param.name]:{r:0,g:0,b:0} }
          pane.addInput( guiparam, param.name, { input:'color' })
            .on( 'change', v => {
              const rgb = v.toRgbObject()
              obj[ param.name ].value.x = rgb.r / 255 
              obj[ param.name ].value.y = rgb.g / 255
              obj[ param.name ].value.z = rgb.b / 255
              obj[ param.name ].dirty = true
            }) 
        }
      }
    })
  }

  const guiForObject = function( ) {
    const obj = this

    const pane = new Tweakpane({ container: document.querySelector('#menu'), title:this.name })
    guis.push( pane )

    const params = obj.params || obj.parameters
    processParams( obj, pane, params )

    const transform = {
      get tx() { return obj.transform.translation.x },
      set tx(v){ obj.transform.translation.x = v },
      get ty() { return obj.transform.translation.y },
      set ty(v){ obj.transform.translation.y = v },
      get tz() { return obj.transform.translation.z },
      set tz(v){ obj.transform.translation.z = v },
      get rx() { return obj.transform.rotation.axis.x },
      set rx(v){ obj.transform.rotation.axis.x = v },
      get ry() { return obj.transform.rotation.axis.y },
      set ry(v){ obj.transform.rotation.axis.y = v },
      get rz() { return obj.transform.rotation.axis.z },
      set rz(v){ obj.transform.rotation.axis.z = v },
      get ra() { return obj.transform.rotation.angle },
      set ra(v){ obj.transform.rotation.angle = v },
      get scale() { return obj.transform.scale },
      set scale(v){ obj.transform.scale = v },
    }

    const transformFolder = pane.addFolder({ title:'Transform' })
    transformFolder.addInput( transform, 'tx', { label:'Translate X', min:-5, max:5 })
    transformFolder.addInput( transform, 'ty', { label:'Translate y', min:-5, max:5 })
    transformFolder.addInput( transform, 'tz', { label:'Translate z', min:-5, max:5 })
    transformFolder.addInput( transform, 'rx', { label:'Rotation Axis X', min:0, max:1 })
    transformFolder.addInput( transform, 'ry', { label:'Rotation Axis Y', min:0, max:1 })
    transformFolder.addInput( transform, 'rz', { label:'Rotation Axis Z', min:0, max:1 })
    transformFolder.addInput( transform, 'ra', { label:'Rotation Angle', min:-360, max:360 })
    transformFolder.addInput( transform, 'scale', { label:'Scale', min:0.001, max:5, presetKey:'transformScale' })

    if( this.__textureObj !== undefined ) {
      const textureFolder = pane.addFolder({ title:'Texture' })
      processParams( this.__textureObj.__target, textureFolder, this.__textureObj.parameters )   
    }

    this.__gui = pane
    this.__gui.__target = obj
    this.gui.applyPreset = p => applyPreset.call( this, p )
    this.gui.export = pane.exportPreset.bind( pane )

    return this
  }

  const applyPreset = function( presetObj ){
    const keys = Object.keys( presetObj ),
          transformStartIdx = keys.indexOf('tx'),
          textureStartIdx = transformStartIdx + 8
    
    for( let i = 0; i < transformStartIdx; i++ ) {
      const key = keys[ i ]
      this[ key ].value.x = presetObj[ key ]
    }

    this.transform.translation.x = presetObj.tx
    this.transform.translation.y = presetObj.ty
    this.transform.translation.z = presetObj.tz
    this.transform.rotation.x = presetObj.rx
    this.transform.rotation.y = presetObj.ry
    this.transform.rotation.z = presetObj.rz
    this.transform.rotation.angle = presetObj.ra
    this.transform.scale = presetObj.transformScale

    if( this.__textureObj !== undefined ) {
      for( let i = textureStartIdx; i < keys.length; i++ ) {
        const key = keys[ i ]
        this.__textureObj.__target[ key ].value.x = presetObj[ key ]
        this.__textureObj.__target[ key ].dirty = true 
      }
    }

    this.__gui.dispose()
    guiForObject.call( this )

  }

  window.gui = function() {
    if( guielement !== null ) {
      guielement.dispose()
    }
    const scene = Marching.scene

    
    guielement = pane
  }

  const _____s = SDF.Sphere()
  _____s.__proto__.__proto__.gui = guiForObject

  window.cm = cm
  
  window.getlink = function( name='link' ) {
    const lines = cm.getValue().split('\n')
    if( lines[ lines.length - 1].indexOf('getlink') > -1 ) {
      lines.pop()
    }

    const code = btoa( lines.join('\n' ) )
    const link = `https://charlieroberts.github.io/marching/playground/index.htm?${code}`

    Toastr.options = {
      "closeButton": true,
      "debug": false,
      "newestOnTop": false,
      "progressBar": false,
      "positionClass": "toast-bottom-center",
      "preventDuplicates": false,
      "onclick": null,
      "showDuration": "300",
      "hideDuration": "1000",
      "timeOut": 0,
      "extendedTimeOut": 0,
      "showEasing": "swing",
      "hideEasing": "linear",
      "showMethod": "fadeIn",
      "hideMethod": "fadeOut",
      "tapToDismiss": false
    }

    Toastr["info"](`<a href="${link}">${name}</a>`, "Your sketch link:")

    return link
  }



  if( window.location.search !== '' ) {
    // use slice to get rid of ?
    const val = atob( window.location.search.slice(1) )
    cm.setValue(val)
    eval( val )
  }else{
    eval( demos.introduction )
  }

}
