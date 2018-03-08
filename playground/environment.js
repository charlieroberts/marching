window.onload = function() {
  const ta = document.querySelector( '#cm' )

  const introCodeOld = `// place cursor on line of code or highlight
// block and hit ctrl+enter to execute
// ctrl+. (period) will clear the screen and all callbacks 
// ctrl+h will toggle hiding the code editor
// click the ? button in the upper right corner for help or
// select the tutorial from the dropdown menu.

// create a sphere and save a reference
sphere1 = Sphere(.35)
// repeat sphere to make a field of them
repeater = Repeat( sphere1, Vec3( 2,2,1 ) ) 

// substract a sphere from a box...
sub = Substraction(
  Sphere( .95 ),
  Box( null, Vec3( 0.75 ) )
)
// ... and rotate the result on all thre axes
rotate = Rotation( sub, Vec3( 1,1,1 ), 0 )

// generate our scene (compile the shader) by passing
// in an array of objects to render
march( 
  // repeat our rotating hollow box along the z-axis
  Repeat(
    rotate,
    Vec3( 0,0,4 ) 
  ),
  // display repeated field of spheres
  repeater
).render( 3, true )

// create animation callback functions that accept
// the current time
callbacks.push( 
  // move the camera backwards
  time => camera.pos.z = time / 4,
  // change repeated sphere radius
  time => sphere1.radius = .35 + Math.sin( time ) * .25,
  // change horizontal distance between repeated spheres
  time => repeater.distance.x = 1 + Math.sin( time * .85 ) * .8,
  // rotate our hollow boxes
  time => rotate.angle = time
)`

  const liquidCode =`// place cursor on line of code or highlight
// block and hit ctrl+enter to execute
// ctrl+. (period) will clear the screen and all callbacks 
// ctrl+h will toggle hiding the code editor
// click the ? button in the upper right corner for help or
// select the tutorial from the dropdown menu.

// march() compiles a shader using a provided graph
march( 
  SmoothUnion2(
    Repeat(
      Sphere( 1, Vec3(0, Noise(.55,1.35,.75), 6) ),
      Vec3(.15,0,0)
    ),
    Repeat(
      Sphere( 1, Vec3(0, Noise(.55,-1.35,.75), 6) ),
      Vec3(.15,0,0)
    ),
    Plane(),
    .9995
  )
)
.render 3, true )		   // start rendering
.camera( 0,3,13 )  // set camera position, must be called after .render()`


const introCode2i =
`m = march(
  Substraction(
    Repeat(
      Box( Vec3( .115 ), Vec3(0), Color(96,96,192) ),
      Vec3( .35 )
    ),
    Sphere( 15, Vec3(0), Color(96,96,192) )
  )
)
.render()
.camera( -5, 25, 25 )



/* __--__--__--__--__--__--__--____
                                   
select code and hit ctrl+enter to  
execute. ctrl+h toggles hiding the 
code/gui. try the other demos using
the menu in the upper left corner, 
or click the ? button for help.    
                                   
** __--__--__--__--__--__--__--__*/`

const introCode = `march( Sphere(2) ).render()`

const introCodeC = `march(
  Substraction(
    Repeat(
      Box( Vec3( .015 ), Vec3(0), Color(96,127,192) ),
      Vec3( .05 )
    ),
    Sphere( 2, Vec3(0), Color(96,127,192) )
  )
)
.render()`

const tutorialCode = `/* __--__--__--__--__--__--__--__--
                                    
let's start by making a simple     
scene with one sphere.  highlight   
the lines below and hit ctrl+enter 
to run them. make sure not to high- 
light these instructions or the    
fancy borders :)                    
                                   
** __--__--__--__--__--__--__--__*/

sphere1 = Sphere()
 
march([ sphere1 ])
  .resolution( .25 )
  .animate( true )
  .render()

/* __--__--__--__--__--__--__--__--
                                    
the scene() method accepts an array
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
.animate(true) is called with our  
marcher. Depending on how nice a    
computer you use, you probably will
want to turn the resolution down    
when animating the scene.          
                                    
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

march([ 
  Substraction( 
    Sphere(1.35), Box() 
  )
])
.render()

/* __--__--__--__--__--__--__--__--
                                    
we can animate this as well. we'll 
turn down the resolution first...   
try turning it back up and see if  
your computer can handle it.        
                                   
** __--__--__--__--__--__--__--__*/

sphere1 = Sphere( 1.35 )
box1 = Box()
 
march([ 
  Substraction( sphere1, box1 )
])
.resolution(.5)
.animate(true)
.render()
 
callbacks.push( time => 
  sphere1.radius = 1.25 + Math.sin( time ) * .1 
)

/* __--__--__--__--__--__--__--__--
                                    
One fun transform we can do is to  
repeat a shape throughout our scene,
We can define how coarse/fine these
repetitions are.                    
                                   
** __--__--__--__--__--__--__--__*/

march([ 
  Repeat( 
    Sphere(.25), 
    Vec3( 2,2,2) 
  ) 
])
.farPlane( 100 )
.steps( 150 )
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
box1 = Box( null, Vec3(.35) )
sphereBox = SmoothUnion( sphere1, box1, .9 )
 
march([ 
  Repeat( sphereBox, Vec3( 2,2,2 ) )
])
.animate( true )
.resolution(.25)
.render()
 
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

march([ 
  Sphere( Noise() )
])
.resolution(.5)
.steps(1)
.farPlane(10)
.threshold(.1)
.animate(true)
.render()`

const displaceCode =
`// Noise() can be used in place of any float or Vector member.

march([ 
  // noisy radius
  Sphere( Noise(), Vec3(-2,0,0) ),
  
  // noisy y-size
  Box( Vec3(2,0,0), Vec3( 1, Noise(.25,1), 0 ) ) 
]).render()

// Noise( (float)strength=.25, (float)bias=1, (float)timeMod=1 )

march([ Sphere( Noise() ) ]).render()
march([ Sphere( Noise(.5) ) ]).render()
march([ Sphere( Noise(.25,2,.5) ) ]).render()


// Displace() works a bit differently, in that it
// takes the output of a distance function and alters
// it, rather than providing an input to a distance 
// function (like Noise()).

// displace the rays colliding with our box
d = Displace( Box( Vec3(0), Vec3(2,4,2)), Vec3(1) )

// rotate the displacement on the x and z axes
r = Rotation( d, Vec3(1,0,1), 0 )

// compile the shader
march([ r ]).resolution(.5).animate(true).render()

callbacks.push( 
  // change rotattion
  time => r.angle = time,
  // change displacement
  time => d.displacement.x = 1 + Math.sin(time/4) % 1
)

// move the camera back to see the whole scene
camera.pos.z = 10`

const unionCode = `// unions and smooth unions can be used to
// combine two geometries together. a Union
// creates boundaries with reasonably well-defined
// edges.

scene([
  Union( 
    Sphere(),
    TriPrism( null, Vec2(2) )
  )
], 90 )


// smooth union blends these edges together,
// at an adjustable amount
scene([
  s = SmoothUnion( 
    Sphere(),
    TriPrism( null, Vec2(2) ),
    .5
  )
], 90 )
 
callbacks.push( time => s.blend = (time/4) % 1 )


// add some noise for fun...
scene([
  r = Rotation(
    SmoothUnion( 
      Sphere( Noise(.25, 1.5 ) ),
      TriPrism( null, Vec2(3) )
    ),
    Vec3(1,0,0),
    1.5
  )
])

callbacks.push( time => r.angle = time )`


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
  value:introCode,
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
sel.onchange = e => {
  switch( e.target.selectedOptions[0].innerText ) {
    case 'tutorial':
      code = tutorialCode
      SDF.main.clear()
      break;
    case 'noise & displace':
      code = displaceCode
      SDF.main.clear()
      break
     case 'unions & smooth unions':
      code = unionCode
      SDF.main.clear()
      break
    default:
      code = introCode
      eval( code )
  }

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
eval( introCode )
}
