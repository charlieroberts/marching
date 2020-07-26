module.exports=`/* __--__--__--__--__--__--__--__--
                                    
It's **highly** recommended that you
complete the "texturing" tutorial
before beginning this one.

Marching.js can use p5.js as a 
texture generator for its 3D forms.
Once you've created a texture using
p5, you can use live code what is
drawn to it by changing the onframe()
method, which is equivalent to draw()
in p5.js.

Never played with p5.js before?
https://p5js.org/
                                   
** __--__--__--__--__--__--__--__*/

// the first step is to load p5,
// which isn't included in marching.js
// by default. The use() function lets
// us do this. Run the code below by
// hitting ctrl+enter
use('p5')

// you should see a notification appear
// at the bottom of your screen when
// p5 is ready to go. Use the P5()
// constructor to make a new p5 object.
// All the p5 drawing functions will then
// be found in ths object, we'll use them
// to create a red/white texture;
pfive = P5()
pfive.background(255,255,255)
pfive.fill(255,0,0)
pfive.rect(0,0,pfive.width/2,pfive.height)

// ok, next we need to texture a marching.js
// object with the p5 object we created.

march( 
  box = Box(1.5).texture( pfive.texture() ) 
).render('med')
 
onframe = t => box.rotate(t*5,1,1,1)

// we can make this more fun by animating
// inside of our onframe() method:

onframe = t => {
  pfive.background(255,255,255)
  pfive.rect(0,0,(.5+sin(t)*.5)*pfive.width,pfive.height)
  box.rotate(t*5,1,1,1)
}

// scale the texture
box.tex.scale = 4

// we can load external p5 libraries from 
// content delivery networks like jsdelivr. Let's
// load p5.Polar by Liz Peng (https://github.com/liz-peng/p5.Polar)
// which is a fun library for creating circular patterns 
// using polar coordinates.

use( 'https://cdn.jsdelivr.net/gh/liz-peng/p5.Polar/p5.Polar.js' )

// you should see a notification appear at the bottom
// once the library has loaded. We can now run some drawing
// code... doing it outside of onframe() would be roughly
// the same as doing it in setup() in a normal p5 sketch:
pfive = P5(600,600) 
pfive.setCenter( pfive.width/2, pfive.height/2)
pfive.stroke( 255,255,255,64 )
pfive.colorMode( pfive.HSB, 255 )
 
// we'll create a more complex scene below. The use of
// the 'blackhole' material causes the spheres to ignore
// much of the lighting information in the scene in favor
// of the p5 texture.
march(
  rpt = Repeat(
    box = Sphere(1).material('blackhole').texture( pfive.texture() ),
    3
  )
)
.fog(.1,Vec3(0))
.render('repeat.med')
 
onframe = t => {
  box.rotate(t*5,1,1,1)
  pfive.background(0)
  for( let i = 0; i < 10; i++ ) {
    pfive.fill( pfive.color( i * 25, i * 25, 255, 32 ) )
    pfive.polarEllipses( 
      i*6, 80 - i*6.5, 80-i*6.5, 30 * i * (.85 +(sin(t) * .15)),
       (...args) => {
        args[1] = (t*2)/(i+1)
        return args
      }
    )
  }
}

// we can also change the strength
// of the texture, which determines
// how much it overrides the default
// lighting of the material
box.tex.strength = .5`