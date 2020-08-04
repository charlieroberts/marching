module.exports=`/* __--__--__--__--__--__--__--__--
                                    
Ray marching is typically pretty 
hard on your graphics card. This 
tutorial goes through how to get
the tune the performance of your
marching.js sketches and make sure
they run smoothly.

This is a long tutorial but is really
important if you're going to use
marching.js with any frequency. Quick
tip up front... if you're animating,
make your browser window smaller or
decrease the resolution of your screen
or projector for better performance.

For referenec, The render presets are:
low, med, high
fractal.low, fractal.med, fractal.high
repeat.low, repeat.med, repeat.high
voxel.low, voxel.med, voxel.high

These are all discussed further below.
                                   
** __--__--__--__--__--__--__--__*/

// first and foremost, if you're 
// rendering a static image, there's
// no need to worry about render
// quality. Just call .render()
// with no arguments and a single
// frame will be rendered at
// maximum quality.

march(
  Julia(3.25).material('red').scale(2.5),
  Plane().material('red').texture('noise')
)
.background(Vec3(.125,0,0))
.fog(.125, Vec3(.125,0,0))
.render()

// ok, let's try this same code, but using
// the 'low', 'med', and 'high' realtime
// presets. We'll also add a bit of animation.
march(
  j = Julia(3.25).material('red').scale(2.5),
  Plane().material('red').texture('noise')
)
.background(Vec3(.125,0,0))
.fog(.125, Vec3(.125,0,0))
.render('low')
 
onframe = t => j.fold = 3.25 + sin(t/3) *.5 

// ok, you should see a pretty big difference
// between 'low' and 'high', both in 
// quality and, depending on your graphics
// card, frame rate. So what's being controlled
// by these presets?

/* 1. resolution - the program that marching.js
**    generates runs once per pixel, meaning fewer
**	  pixels = better performance.
** 2. depth of rendering - for each pixel, marching
**    checks along a line (aka ray) to see if a geometry
**    virtually intersects with the pixel. Eventually, if
**    it doesn't find a geometry, it gives up. The max distance
**    it will check (aka the far plane) is directly related to 
**    to the performance of the shader program, along with...
** 3. number of steps - this determines how often we check along
**    each ray as it moves towards the far plane. more steps =
**    better render quality = worse performance
*/

// There are a couple of other properties the
// render presets control but these three are the big ones.
// For rendering fractals, typically we want to be close
// to the object and not render things off in the distance.
// There are 'fractal.low', 'fractal.med', and 'fractal.high'
// presets that optimize for this.

// Luckily, there's a specific
// render presets for fractals that can render
// objects close to the camera at higher quality.

march(
  j = Julia(3.25).material('red').scale(2.5),
  Plane().material('red').texture('noise')
)
.background(Vec3(.125,0,0))
.fog(.125, Vec3(.125,0,0))
.render('fractal.low')
 
onframe = t => j.fold = 3.25 + sin(t/3) *.5 

// here you'll notice that both the fractal
// and the plane get cutoff. Let's make the 
// fractal smaller and move the camera closer in
// so that they the fractal isn't past the far plane.

march(
  j = Julia(3.25).material('red').scale(.25),
  Plane( Vec3(0,1,0),.5).material('red').texture('noise', { scale:10 })
)
.background(Vec3(.125,0,0))
.fog(.85, Vec3(.125,0,0))
.render('fractal.med')
.camera(0,0,.5)
 
onframe = t => j.fold = 3.25 + sin(t/3) *.5 

// OK, so there I changed the scale of the fractal from 2.5
// to .5, moved the camera from z=5 to z=.5. We're able to 
// get much better performnace now and still see the fractal.
// Remember to try 'fractal.med' and 'fractal.high' as well!

// Now is a good time for a reminder that the size of your browser
// window affects the resolution of the image, which affects
// the performance. For live performances, I usually turn the
// resolution of my screen / projector down as far as possible, 
// This is particularly important for retina / hidpi displays.

// So, if we want to be close up for rendering fractals, are there
// times when we want to render things far away? Repeated fields
// of objects are one such time, and there are render presets
// designed for infinitely repeated fields. Compare the two
// sketches below:

march(
  Repeat( Sphere(), 4 )
).render('low')

// vs.

march(
  Repeat( Sphere(), 4 )
).render('repeat.low')

// You'll notice you get more spheres, as the
// far plane is twice as far away. However, you'll
// also notice that the visual quality deteriorates and
// there are more jagged edges. We can improve this by 
// adding some post-processing

march(
  Repeat( Sphere(), 4 )
)
.post( Antialias(2) )
.render('repeat.low')

// try commenting out the call to .post() and
// re-executing to compare. Use higher values
// in the call to Antialias() to reduce jagged edges,
// with the tradeoff that it the image will become blurry.

// Similar to what we did with fractals, we can also get more
// spheres by keeping the far plane the same distance but making
// the spheres and the repeat distance smaller.

march(
  Repeat( Sphere(.1), .4 )
)
.post( Antialias(2) )
.render('repeat.low')

// so, that's prety much spheres as far as the eye
// can see. Some fog stops it from becoming too messy:

march(
  Repeat( Sphere(.1), .4 )
)
.fog( .25, Vec3(0) )
.post( Antialias(2) )
.render('repeat.low')

// Next up, marching.js has a 
// "voxel" mode that gives shapes a minecraft-like
// appearance. This requires some special values for
// farPlane / number of steps etc, so it's best to use
// these presets whenever doing this style of rendering.

march(
  Sphere().texture('rainbow')
)
.voxel(.1)
.render('voxel.low')
.camera(0,.5,3)

// when lower values are passed to voxel(), this
// results in higher numbers of small subdivisions, which
// is more difficult to render. So in addition to watching
// your voxel.low vs. voxel.high preset, you also have to 
// be careful with the values you pass to voxel() to get
// a high framerate. Try changing the .05 value above to
// see how it affects the sphere. And if you hit shift+ctrl+c,
// you can get WASD+arrow camera controls to fly around the sphere
// and check it out.

// Last but not least, you can always explictly
// override rendering properties to experiment.

march(
  m = Mandelbox().texture('cellular', { scale:2, strength:.5 }).scale(.5)
)
.resolution(.25)
.render('high')
 
onframe = t => m.rotate( t*10, 1,1,1 )

// in the example above, the low resolution value
// overrides what is typically found in the 'high'
// preset. Try experimenting with the value passed
// to resolution to see how it affects performance.
`
