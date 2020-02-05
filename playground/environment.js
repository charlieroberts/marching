const CodeMirror = require( 'codemirror' )

require( '../node_modules/codemirror/mode/javascript/javascript.js' )
require( '../node_modules/codemirror/addon/edit/matchbrackets.js' )
require( '../node_modules/codemirror/addon/edit/closebrackets.js' )
require( '../node_modules/codemirror/addon/hint/show-hint.js' )
require( '../node_modules/codemirror/addon/hint/javascript-hint.js' )
require( '../node_modules/codemirror/addon/display/fullscreen.js' )
require( '../node_modules/codemirror/addon/selection/active-line.js' )
require( '../node_modules/codemirror/addon/display/panel.js' )
require( '../node_modules/mousetrap/mousetrap.min.js' )

const demos = {
  introduction: require( './demos/intro.js' ),
  ['textured transformations']: require('./demos/texture_transforms.js'),
  ['the superformula']: require('./demos/superformula.js' ),
  ['mandelbulb fractal']: require( './demos/mandelbulb.js' ),
  ['julia fractal']: require( './demos/julia.js' ),
  ['alien portal']: require( './demos/alien_portal.js' ),
  ['snare and sticks']: require( './demos/snare.js' ),
  //['kaleidoscopic fractals']: require( './demos/kifs.js' ),
  //['alien portal #2']: require( './demos/portal2.js' ),
  ['twist deformation']: require( './demos/twist.js' ),
  ['geometry catalog']: require( './demos/geometries.js' ),
  ['textures catalog']: require( './demos/textures.js' ),
}

const tutorials = {
  ['start here']: require( './demos/tutorial_1.js' ),
  ['constructive solid geometry']: require( './demos/csg.js' ),
  ['lighting and materials']: require( './demos/lighting.js' ),
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
    d:0
  }
  Math.export()
  SDF.useProxies = false

  SDF.camera.speed = .01
  SDF.camera.go = function() {
    camera.pos.x += camera.dir.x * SDF.keys.w
    camera.pos.y += camera.dir.y * SDF.keys.w
    camera.pos.z += camera.dir.z * SDF.keys.w
  }

  let hidden = false
  let fontSize = .95
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
  // have to bind to window for when editor is hidden
  Mousetrap.bind('ctrl+shift+g', toggleGUI )

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
    if( event.altKey === true ) {
      const code = event.code.slice(3).toLowerCase()
      SDF.keys[ code ] = 0
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

  const ease = t => t < .5 ? 2*t*t : -1+(4-2*t)*t

  window.fade = ( objname, propname, target, seconds ) => {
    const split = propname.indexOf('.') === -1 ? null : propname.split('.')
    const startValue = [], diff = []
    const inc  = 1 / ( seconds * 60 )   
    const isVec = split === null && window[ objname ][ propname ].type.indexOf( 'vec' ) !== -1

    let vecCount = isVec === true ? parseInt( window[ objname ][ propname ].type.slice(3) ) : null
    let t = 0

    if( isVec ) {
      startValue[0] = window[ objname ][ propname ].x 
      startValue[1] = window[ objname ][ propname ].y
      if( vecCount > 2 ) startValue[2] = window[ objname ][ propname ].z

      diff[0] = target - startValue[0] 
      diff[1] = target - startValue[1]
      if( vecCount > 2 ) diff[2] = target - startValue[2]
    }else{
      startValue[ 0 ] = split === null 
        ? window[ objname ][ propname ].value 
        : window[ objname ][ split[0] ][ split[1] ]

      diff[ 0 ] = target - startValue[ 0 ]
    }

    const fnc = () => {
      const easeValue = ease( t )
      if( split === null ) {
        if( isVec === false ) {
          window[ objname ][ propname ] = startValue[0] + easeValue * diff[0]
        }else{
          window[ objname ][ propname ].x = startValue[0] + easeValue * diff[0]
          window[ objname ][ propname ].y = startValue[1] + easeValue * diff[1]

          if( vecCount > 2 ) {
            window[ objname ][ propname ].z = startValue[2] + easeValue * diff[2]
          }
        }
      }else{
        window[ objname ][ split[0] ][ split[1] ] = startValue[0] + easeValue * diff[0]
      }
      
      t += inc
      if( t >= 1 ) {
        if( split !== null ) {
          window[ objname ][ split[0] ][ split[1] ] = target 
        }else{
          window[ objname ][ propname ] = target
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

  eval( demos.introduction )
}
