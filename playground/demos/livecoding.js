module.exports = `/* __--__--__--__--__--__--__--____
Live Coding

There are a couple of techniques 
that can make live coding a bit 
easier in marching.js. First, if
you're doing any audio-reactive
visuals, be sure to check out the
audio / FFT tutorial.

You'll notice that many demos
and tutorials use a pattern where
we name objects in our graph for
subsequent manipulations. This is
an important step to get used to
when you're setting up your graph.
__--__--__--__--__--__--__--____ */

march(
  rpt = Repeat(
    s = Sphere(.125),
    Vec3(.5)
  )
).render( 3, true )

// now we can change the distance later...
rpt.distance.x = 1

/* __--__--__--__--__--__--__--____
Easy enough. But there's an odd
behavior when we do this. If you
try changing the distance, and then
re-execute the graph (without selecting
the line that changes the distance)
you'll notice that the value you set
the distance to is preserved upon 
re-execution.

Whenever you create an object in
the global namespace, a 'proxy' is
created. IF you reassign a new
object to this proxy, the proxy
will copy all the properties of
the previous object to the new one.
This enables you to re-execute
the graph while maintaining state,
and makes it much easier to acheive
continuity when live coding.
__--__--__--__--__--__--__--____ */

/* __--__--__--__--__--__--__--____
Another useful technique, that relies
on assigning names to objects, is
to "fade", or transition gradually,
to a new state in objects. 
__--__--__--__--__--__--__--____ */

march( s = Sphere(0) ).render( 3, true )
fade( 's','radius', 2, 10 )

/* __--__--__--__--__--__--__--____
In the example above, we give the 
name of the object we want to manipulate,
the name of the property, the value
we want to transition to, and the
length in seconds of the transition.
There is quadratic easing on the fade.

By using dot notation in the property
string, we can fade individual vector
members.
__--__--__--__--__--__--__--____ */


march( b = Box() ).render( 3, true )
fade( 'b','size.x', 2, 10 )

/* __--__--__--__--__--__--__--____
it's also worth noting we can
fade a whole vector by simply
leaving out the dot notation. The
example below fades the size on
the x,y,and z axis in one line of
code. Note we have to use a new name
to avoid the proxy effect!
__--__--__--__--__--__--__--____ */

march( b2 = Box() ).render( 3, true )
fade( 'b2','size', 1.5, 10 )

/* __--__--__--__--__--__--__--____
We can use the same vector shortcut when 
manipulate animation at the frame level.
__--__--__--__--__--__--__--____ */

march(
  rpt2 = Repeat(
    b3 = Box(),
    Vec3(1)
  )
)
.fog( .25, Vec3(0) )
.render( 3, true )
 
onframe = t => {
  // manipulate one vector member
  rpt2.distance.x = .5 + Math.sin( t/3 ) * .125
  
  // manipulate entire vector at once
  b3.size = .1 + Math.cos( t/2 ) * .075
}

/* __--__--__--__--__--__--__--____
Hopefully this is enough to get you
started live coding. Between the use of
onframe, fade, the fft, and proxies, there's
a number of tools to get started.
__--__--__--__--__--__--__--____ */`
