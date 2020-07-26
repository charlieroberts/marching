module.exports = `/* __--__--__--__--__--__--__--__--
                                    
It's **highly** recommended that you
complete the "texturing" tutorial
before beginning this one.

Marching.js can use Hydra as a 
texture generator for its 3D forms.
Once you've created a texture using
Hydra, you can live code with it
in a similar fashion to any other
Hydra sketch.

If you've never tried Hydra before,
go here for more info + tons of fun: 
http://hydra.ojack.xyz
                                   
** __--__--__--__--__--__--__--__*/

// the first step is to load Hydra,
// which isn't included in marching.js
// by default. The use() function lets
// us do this. Run the code below by
// hitting ctrl+enter
use('hydra')

// you should see a notification appear
// at the bottom of your screen when
// hydra is ready to go. Use the Hydra()
// constructor to make a new hydra object.
// When you make calls to hydra functions
// they will draw to a canvas stored in
// this hydra object.
hydra = Hydra()
osc(50, .05, 10).modulate( noise(15) ).out()

// ok, next we need to texture a marching.js
// object with the hydra object we created.

march( 
  box = Box(1.5).texture( hydra.texture() ) 
).render('med')
 
onframe = t => box.rotate(t*5,1,1,1)

// note that you can easily live code
// the texture by simply re-running the
// osc().modulate().out() line after
// making changes. or here's a different
// idea from Hydra creator @_ojack_ (slightly modded).
// you can run the whole block by placing
// your cursor in it and hitting alt+enter

pattern = () => osc(150, 0).kaleid(200).scale(1, 0.4)
pattern()
  .scrollX(0.5, 0.05)
  .mult(pattern())
  .out()

// ok, let's use this in a more complex scene. Again,
// you can execute the
hydra = Hydra()
pattern = () => osc(50, 0).kaleid(200).scale(1, 0.4)
pattern()
  .scrollX(0.5, 0.05)
  .mult(pattern())
  .out()
 
march(
  rpt = Repeat(
    box = Box(.35).texture( hydra.texture() ),
    2
  )
)
.fog(.1,Vec3(0))
.render('med')
 
onframe = t => {
  box.rotate(t*5,1,1,1)
  rpt.distance = 1.5+ sin(t)*.35
}

// from the texture tutorial, we know
// we can scale the texture

box.tex.scale = 3

// or...

box.tex.scale = .5

// and we can also change the strength
// of the texture, which determines
// how much it overrides the default
// lighting of the material
box.tex.strength = .25

/* finally, fractals + hydra === _ _ 
                                ( v )
                                 \\ / 
                                  v  
*/
 
hydra = Hydra()
osc(50, .05, .5).modulate( noise(15) ).out()
 
march( 
  m = Mandelbox(1.25,1.1,3).texture( hydra.texture() ).scale(.5)
).render('fractal.med')
 
m.tex.strength = .5
m.tex.wrap = Texture.mirror
m.tex.scale = 4
 
onframe = t => { 
  m.rotate(t*15,1,1,1) 
  m.size = 1 + sin(t/2) * .125
}`