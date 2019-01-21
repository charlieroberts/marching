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
  //['tutorial #1']: require( './demos/tutorial_1.js' ),
  ['the superformula']: require('./demos/superformula.js' ),
  ['snare and sticks']: require( './demos/snare.js' ),
  ['mandelbulb fractal']: require( './demos/mandelbulb.js' ),
  ['julia fractal']: require( './demos/julia.js' ),
  ['alien portal']: require( './demos/alien_portal.js' ),
  //['alien portal #2']: require( './demos/portal2.js' ),
  ['twist deformation']: require( './demos/twist.js' ),
  ['geometry catalog']: require( './demos/geometries.js' ),
}

const tutorials = {
  ['start here']: require( './demos/tutorial_1.js' ),
  ['constructive solid geometry']: require( './demos/csg.js' ),
  ['lighting and materials']: require( './demos/lighting.js' ),
  ['audio input / fft']: require( './demos/audio.js' )
}

window.onload = function() {
  const ta = document.querySelector( '#cm' )

  const SDF = window.Marching

  SDF.init( document.querySelector('canvas') )
  SDF.export( window )

  let hidden = false
  let fontSize = .95
  CodeMirror.keyMap.playground =  {
    fallthrough:'default',

    'Ctrl-Enter'( cm ) {
      try {
        var selectedCode = getSelectionCodeColumn( cm, false )

        flash( cm, selectedCode.selection )

        var code = selectedCode.code

        var func = new Function( code )

        func()
      } catch (e) {
        console.log( e )
      }
    },
    'Shift-Ctrl-H'() { toggleGUI() },
    'Alt-Enter'( cm ) {
      try {
        var selectedCode = getSelectionCodeColumn( cm, true )

        var code = selectedCode.code

        var func = new Function( code )

        func()
      } catch (e) {
        console.log( e )
      }
    },
    'Ctrl-.'( cm ) {
      SDF.clear() 
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

  const toggleGUI = function() {
    if( hidden === false ) {
      cm.getWrapperElement().style.display = 'none'
      document.querySelector('select').style.display = 'none'
      document.querySelector('button').style.display = 'none'
      document.querySelector('img').style.display = 'none'
    }else{
      cm.getWrapperElement().style.display = 'block'
      document.querySelector('select').style.display = 'block'
      document.querySelector('button').style.display = 'block'
      document.querySelector('img').style.display = 'block'
    }

    hidden = !hidden
  }
  // have to bind to window for when editor is hidden
  Mousetrap.bind('ctrl+shift+h', toggleGUI )

  delete CodeMirror.keyMap.default[ 'Ctrl-H' ]

  const cm = CodeMirror( document.body, { 
    value:demos.introduction,
    mode:'javascript',
    fullScreen:true,
    keyMap:'playground',
    styleActiveLine:true,
    autofocus:true,
    matchBrackets:true,
    autoCloseBrackets:true
  })
  cm.setOption('fullScreen', true )

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
  eval( demos.introduction )
}
