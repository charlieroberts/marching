(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = `// https://en.wikipedia.org/wiki/Constructive_solid_geometry

green = Material( Vec3(0,.25,0), Vec3(0,1,0), Vec3(0), 2, Vec3(0) )
red   = Material( Vec3(.25,0,0), Vec3(1,0,0), Vec3(0), 2, Vec3(0) )
blue  = Material( Vec3(0,0,.25), Vec3(0,0,1), Vec3(0), 2, Vec3(0) )
 
roundedSphere = Intersection(
  Sphere(1.25, Vec3(0), blue ),
  Box(Vec3(1),Vec3(0), red )
)
 
crossRadius = .65
crossHeight = 2
cross = SmoothUnion2(
  Cylinder( Vec2(crossRadius,crossHeight), Vec3(0), green ),
  Rotation(
    Cylinder( Vec2(crossRadius,crossHeight), Vec3(0), green ),
    Vec3(0,0,1),
    Math.PI / 2
  ),
  Rotation(
    Cylinder( Vec2(crossRadius,crossHeight), Vec3(0), green ),
    Vec3(1,0,0 ),
    Math.PI / 2
  ),
  .05
)
 
march( 
  r = Rotation(
    Substraction( cross, roundedSphere ),
    Vec3(-.75,1,.25),
    Math.PI / 4
  )
)
.light( Light(Vec3(0,3,4), Vec3(1,1,1 ), .1 ) )
.render( 4, true )
 
callbacks.push( time => r.angle = time )`

},{}],2:[function(require,module,exports){
module.exports = `T = Translate, R = Rotation, v3 = Vec3, v2 = Vec2
 
// Torus: Vec2 radius(outer,inner), center, material
torus   = T( R( Torus( v2(.5,.05) ),  v3(1,0,0,), Math.PI / 2 ), v3(-2,1.5,0) )
  
// Torus82: Vec2 radius, center, material
torus82 = T( R( Torus82(), v3(1,0,0,), Math.PI / 2 ), v3(-.75,1.5,0) )
  
// Torus88: Vec2 radius, center, material
torus88 = T( R( Torus88(), v3(1,0,0,), Math.PI / 2 ), v3(.5,1.5,0) )
  
// Sphere: float radius, center, material
sphere  = Sphere(.65, v3(2,1.5,0) )
 
 
 
// Box: Vec3 size, center, material
box     = Box( v3(.5), v3(-2,0,0) )
 
// Cylinder: Vec2( radius, height ), center, material
cylinder = Cylinder( v2(.35,.5), v3(-.75,0,0) )
 
// Cone: Vec3 dimensions, center, material
cone    = Cone( v3(.1, .075, .825) , v3(.5,.3,0) )
 
// Capsule: Vec3 start, Vec3 end, float radius, material
capsule = T( Capsule( v3( 0, -.45, 0), v3(0,.45,0), .15 ), v3(2,0,0) )
 
 
 
// HexPrism: Vec2 size(radius, depth), center, material
hexPrism = HexPrism( v2(.6,.45), v3(-2,-1.5,0) )
 
// TriPrism: Vec2 size(radius, depth), center, material
triPrism = TriPrism( v2(.85,.3), v3(-.75,-1.75,0) )
 
// RoundBox: Vec3 size, roundness, center, material
roundBox = RoundBox( v3(.45), .15 ,v3(1,-1.5,0) )
 
// Octahedron: float size, center, material
octahedron = Octahedron( .65 , v3(2.75,-2.25,0) )
 
 
 
mat = Material( v3(1), v3(1), v3(1) )
// Plane: Vec3 normal, float distance, material
plane = Plane( v3(0,0,1), 1, mat )
 
march(
  torus, torus82, torus88, sphere,
  box, cylinder, cone, capsule,
  octahedron, hexPrism, triPrism, roundBox,
  plane
)
.light( 
  Light( Vec3(-2,0,5), Vec3(1), .25 ),
  Light( Vec3(2,0,5), Vec3(1,0,0), .25 )  
) 
.render()
.camera( 0,0, 6 )`

},{}],3:[function(require,module,exports){
module.exports = `mat = Material( Vec3(.0), Vec3(.1,0,0), Vec3(1), 2, Vec3(0,.25, 2) )

march(
  Intersection(
    Sphere(3),
    Repeat( 
      Sphere(.25, Vec3(0), mat ), 
      Vec3( .5,.5,.5 ) 
    )
  )
)
.light( 
  Light( Vec3(0), Vec3(4,0,0), .25 ),
  Light( Vec3(0,0,5), Vec3(4,4,0), 1 )
)
.background( Vec3(0) )
.render()
.camera( 0,0,7 )


/* __--__--__--__--__--__--__--____
                                   
select code and hit ctrl+enter to  
execute. ctrl+h toggles hiding the 
code/gui. try the other demos using
the menu in the upper left corner, 
or click the ? button for help.    
                                   
** __--__--__--__--__--__--__--__*/`

},{}],4:[function(require,module,exports){
module.exports = `/* __--__--__--__--__--__--__--__--
                                    
let's start by making a simple     
scene with one sphere.  highlight   
the lines below and hit ctrl+enter 
to run them. make sure not to high- 
light these instructions or the    
fancy borders :)                    
                                   
** __--__--__--__--__--__--__--__*/

sphere1 = Sphere()
 
march( sphere1 )
  .render( 3, true )

/* __--__--__--__--__--__--__--__--
                                    
the march() method accepts an array
of objects that can be geometric    
primitives or transformations. we  
can now change the radius of our    
sphere:                            
                                    
** __--__--__--__--__--__--__--__*/

sphere1.radius = 1.25

/* __--__--__--__--__--__--__--__--
                                    
or its center point...note that the
center point is a three-item vector 
(for x,y, and z position), whereas 
radius was a single float.          
                                   
** __--__--__--__--__--__--__--__*/

sphere1.center.x = .5
sphere1.center.y = -.5

/* __--__--__--__--__--__--__--__--
                                    
note that we can only make these   
changes after the initial render if 
a value of true is passed to our   
render function as its second       
parameter. Depending on the        
computer you use, you probably will 
want to turn the resolution down   
(the first arg) when animating the  
scene.                             
                                    
we can also register a callback to 
change properties over time. these  
run once per video frame, and are  
passed the current time. here we'll 
use the time to change the sphere's
position.                           
                                   
** __--__--__--__--__--__--__--__*/

callbacks.push( time => {
  sphere1.center.z = -10 + Math.sin( time ) * 10
  sphere1.center.x = Math.sin( time * 2.5 ) * 4
})

/* __--__--__--__--__--__--__--__--
                                    
this library uses signed distance  
functions (SDFs) to render geometry 
and perform transformations. You   
can do fun stuff with SDFs. Below   
we'll render a box, but substract  
(I know, the spelling, right?) a    
sphere from its center.            
                                    
** __--__--__--__--__--__--__--__*/

march( 
  Substraction( 
    Sphere(1.35), Box() 
  )
)
.render()

/* __--__--__--__--__--__--__--__--
                                    
we can animate this as well. we'll 
turn down the quality first...      
try turning it back up and see if  
your computer can handle it.        
                                   
** __--__--__--__--__--__--__--__*/

sphere1 = Sphere( 1.35 )
box1 = Box()
 
march(
  Substraction( sphere1, box1 )
)
.render( 3, true )
 
callbacks.push( time => 
  sphere1.radius = 1.25 + Math.sin( time ) * .1 
)

/* __--__--__--__--__--__--__--__--
                                    
One fun transform we can do is to  
repeat a shape throughout our scene,
We can define how coarse/fine these
repetitions are.                    
                                   
** __--__--__--__--__--__--__--__*/

march(  
  Repeat( 
    Sphere( .25 ),
    Vec3( 1 )
  ) 
) 
.render()

/* __--__--__--__--__--__--__--__--
                                    
The vector we pass as the second   
argument to repeat determines the   
spacing; higher numbers yield fewer
repeats. What if we want to take two
shapes and repeat them? In order to
do that we need to create a union.  
                                   
** __--__--__--__--__--__--__--__*/

sphere1 = Sphere( .35 )
box1 = Box( Vec3( .35 ) ) 
sphereBox = SmoothUnion( sphere1, box1, .9 )
 
march(  
  Repeat( sphereBox, Vec3( 2,2,2 ) )
) 
.render( 3, true )
 
callbacks.push( time => sphere1.radius = Math.sin( time ) * .75 )

/* __--__--__--__--__--__--__--__--
                                    
Hopefully your computer can handle 
that, but if not, you can always    
lower the resolution further or    
shrink your browser window. In      
addition to improving efficiency,  
we can also change the performance  
of our raymarcher to get fun glitch
effects.                            
                                   
** __--__--__--__--__--__--__--__*/

march(  
  Sphere( Noise() )
) 
.resolution(.5)
.steps(1)
.farPlane(10)
.threshold(.1)
.render(null, true)`

},{}],5:[function(require,module,exports){
const demos = {
  introduction: require( './demos/intro.js' ),
  ['tutorial #1']: require( './demos/tutorial_1.js' ),
  ['constructive solid geomeotry']: require( './demos/csg.js' ),
  ['geometry catalog']: require( './demos/geometries.js' ),
}

window.onload = function() {
  const ta = document.querySelector( '#cm' )

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
      SDF.main.clear() 
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
    SDF.main.clear()

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

},{"./demos/csg.js":1,"./demos/geometries.js":2,"./demos/intro.js":3,"./demos/tutorial_1.js":4}]},{},[5]);
