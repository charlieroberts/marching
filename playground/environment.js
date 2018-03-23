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
  ['abusing the pipe operator']: require( './demos/pipe.js' ),
  ['twist deformation']: require( './demos/twist.js' ),
  ['constructive solid geometry']: require( './demos/csg.js' ),
  ['geometry catalog']: require( './demos/geometries.js' ),
}

window.onload = function() {
  const ta = document.querySelector( '#cm' )

  const SDF = window.Marching

  SDF.init( document.querySelector('canvas'), 1 )
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
    'Ctrl-H'() { toggleGUI() },
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
    }else{
      cm.getWrapperElement().style.display = 'block'
      document.querySelector('select').style.display = 'block'
      document.querySelector('button').style.display = 'block'
    }

    hidden = !hidden
  }
  // have to bind to window for when editor is hidden
  Mousetrap.bind('ctrl+h', toggleGUI )

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

  let panel = null
  const btn = document.querySelector( 'button' )
  btn.onclick = ()=> {
    addPanel('bottom')
  }
  function makePanel( where ) {
    var node = document.createElement("div");
    var widget, close, label;

    node.id = 'panel-helo'
    node.className = "panel " + where;
    close = node.appendChild(document.createElement("a"));
    close.setAttribute("title", "Remove me!");
    close.setAttribute("class", "remove-panel");
    close.textContent = "✖";
    CodeMirror.on(close, "click", function() {
      panel.clear();
    });
    const help = document.createElement( 'div' )
    help.innerHTML = `thanks to <a href="https://github.com/shenchi">Chi Shen</a> for his work on this.<br>

            <ul><li><strong>scene([ objs ], numSteps, minEdge, maxDistance )</strong> - The first argument is an array of SDF objects to render (Box, Sphere, Capsule, RoundBox etc.); the SDFs are combined via Union operations. The second argument determines the number of steps (default=50) taken by the raycaster for each pixel. The third argument (default .001) is the minimum closeness a sample must be to an object to register a collision. The last argument determines that maximum distance (default 20). You can improve performance (and create weird glitch effects) by decreasing the number of steps / maximum distance, or by increasing the minimum precision. The inverse behaviors will improve rendering quality.</li>

            <li><strong>Sphere( (float)radius, (Vec3)center )</strong> - a sphere.</li>
            <li><strong>Box( (Vec3)center, (Vec3)dimensions )</strong> - a box.</li>

            <li><strong>Substraction( (SDF)shape1, (SDF)shape2 )</strong> - Substract one element from another.</li>
            <li><strong>Union( (SDF)shape1, (SDF)shape2 )</strong> - Combine two shapes wihout smoothing. </li>
            <li><strong>SmoothUnion( (SDF)shape1, (SDF)shape2, (float)blend)</strong> - Blend two shapes together.</li>
            <li><strong>Intersection( (SDF)shape1, (SDF)shape2 )</strong> - Return the intersection of two elements.</li>
            <li><strong>Repeat( (SDF)shape, (Vec3)spacing )</strong> - repeat an element. if a given spacing value is 0, the shape arugment will not be repeated in that direction.</li>     
            <li><strong>Rotation( (SDF)shape, (Vec3)axis, (float)angle )</strong> - rotate an element about an axis.</li>
            <li><strong>camera</strong> - The camera has .pos and .dir Vec3 properties that can be used to move and point it.</li>
            <li><strong>Noise( (float)strength=.25, (float)bias=1, (float)timeMod=1 )</strong> - Noise can be used as an input(s) to another SDF. timeMod determines the speed at which the perlin noise progresses, while strength and bias combine to determine the range of outputted values.</li>
            <li><strong>Vec3( (float)x, (float)y, (float)z ))</strong> - Creates a three-field vector. If only one argument is given, all fields will be set to the passed argument. If no arguments are provided, the Vec3 will be initialized with zeroes in each field.</li>
            </ul>`


    node.appendChild( help )

    return node;
  }

  const sel = document.querySelector('select')
  for( let key in demos ) {
    const demoCode = demos[ key ]

    const opt = document.createElement( 'option' )
    opt.innerText = key

    sel.appendChild( opt )
  }
  
  sel.onchange = e => {

    code = demos[ e.target.selectedOptions[0].innerText ]
    SDF.clear()
    eval( code )

    //switch( e.target.selectedOptions[0].innerText ) {
    //  case 'tutorial':
    //    code = tutorialCode
    //    SDF.main.clear()
    //    break;
    //  case 'noise & displace':
    //    code = displaceCode
    //    SDF.main.clear()
    //    break
    //   case 'unions & smooth unions':
    //    code = unionCode
    //    SDF.main.clear()
    //    break
    //  default:
    //    code = introCode
    //    eval( code )
    //}

    cm.setValue( code )
  }

  function addPanel(where) {

    if( panel === null ) {
      var node = makePanel(where);
      panel = cm.addPanel(node, {position: where, stable: true});
    }else{
      panel.clear()
      panel = null
    }
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
