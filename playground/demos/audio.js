module.exports=`/* __--__--__--__--__--__--__--____
Audio-Reactive Visuals

marching.js will perform an FFT analysis
of any sound/music fed to the browser. When
you first start the FFT, you'll be asked to
choose an audio device to listen to. You can
later change this in Chrome by clicking on
the camera icon in the browser window's location
bar.

By using software like SoundFlower or JACK you
can virtually route audio from your favorite music 
software into marching.js... or you can simply use a 
microphone / standard audio input.
__--__--__--__--__--__--__--____ */

// create a scene to play with
march(
  si = StairsIntersection(
    Sphere(2).material( 'white' ),
    repeat = Repeat(
      sphere = Sphere(.125),
      Vec3(.5)
    ),
    .125
  )
).render( 4, true )
 
// start our FFT
FFT.start()
 
// animate
onframe = time => {
  si.rotate( time * 15 )
  
  // our FFT object has low,mid, and high
  // properties that we can assign to elements
  // of our ray marching scene
  repeat.distance.x = FFT.low
  repeat.distance.y = FFT.mid
  repeat.distance.z = FFT.high
  sphere.radius = FFT.mid * FFT.high
}

si.d = 4
si.c = .5

/* __--__--__--__--__--__--__--____
increasing the window size (how many samples 
of audio the FFT looks at) will result in
less hectic animations. The window size must
be a power of 2; doubling and halving it is
an easy way to experiment with different sizes.
__--__--__--__--__--__--__--____ */

// run multiple times for greater effect
FFT.windowSize *= 2

/* __--__--__--__--__--__--__--____
One fun combinator use with the FFT is
Switch, which enables you to alternate
between two geometries depending on whether
or not an input exceeds a certain threshold.
__--__--__--__--__--__--__--____ */

// super-simple Switch example
march(
  s = Switch(
    Sphere(),
    Box()
  )
).render( 3, true )
 
// the threshold property is unhelpfully
// named 'c' for now...
onframe = t => s.c = t/2 % 1  


// extending our first example with Switch...
march(
  si = StairsIntersection(
    swt = Switch( 
      s = Sphere(2).material('red'),
      b = Box(1.75).material('white')
    ),
    repeat = Repeat(
      sphere = Sphere(.125),
      Vec3(.25)
    ),
    .125/2
  ),
  Plane( Vec3(0,1,0), 1.35 )
)
.fog(.25, Vec3(0) )
.render( 4, true )
 
onframe = t => {
  si.rotate( t * 15 )
  // try scaling the FFT results
  // by different values to control
  // the switch effect
  swt.c = FFT.low * 1
  
  repeat.distance.x = FFT.mid * FFT.low
  fft = (FFT.low + FFT.mid + FFT.high)
  
  // scale both our sphere and our box on every
  // frame, since we don't know which will be active
  s.radius = fft
  b.size = fft * .75
  
  sphere.radius = FFT.high / 2 
}`
