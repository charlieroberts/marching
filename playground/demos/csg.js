module.exports = `/* __--__--__--__--__--__--__--__--
                                    
"constructive solid geometry (CSG)"
is the name given to techniques for
combining various geometries in
different ways. in this tutorial, 
we'll re-create the example shown 
on the wikipedia page for CSG:

https://bit.ly/2Fs2GV6
                                   
our first step will be to create
a rounded box, by taking the 
intersection of a box and a sphere.
we'll go ahead and render it to see
what it looks like.

** __--__--__--__--__--__--__--__*/

roundedSphere = Intersection(
  Box( Vec3(.775), Vec3(0), Material.red ),
  Sphere( 1, Vec3(0), Material.blue )
)
 
march( roundedSphere ).render()

/* __--__--__--__--__--__--__--__--

it's a little tricky to get a feel
for it viewing it straight on, so
let's rotate it along two axes.

** __--__--__--__--__--__--__--__*/

roundedSphere = Intersection(
  Box( Vec3(.775), Vec3(0), Material.red ),
  Sphere( 1, Vec3(0), Material.blue )
)
 
march(
  Rotation(
    roundedSphere,
    Vec3(1,1,0),
    Math.PI / -4
  )
).render()

/* __--__--__--__--__--__--__--__--

great. next we want to make a cross
that we'll subtract from our rounded
sphere. We can do this by combining
three cylinders. We'll rotate one
on the z-axis and one on the x-axis.
The Union2 operator is a shortcut
to combine as many objects as we
want (regular Union only lets us
combine two).

** __--__--__--__--__--__--__--__*/

crossRadius = .5
crossHeight = 1
 
cross = Union2(
  Cylinder( Vec2(crossRadius,crossHeight), Vec3(0), Material.green ),
  Rotation(
    Cylinder( Vec2(crossRadius,crossHeight), Vec3(0), Material.green ),
    Vec3(0,0,1),
    Math.PI / 2
  ),
  Rotation(
    Cylinder( Vec2(crossRadius,crossHeight), Vec3(0), Material.green ),
    Vec3(1,0,0 ),
    Math.PI / 2
  )
)
 
march( cross ).render()

/* __--__--__--__--__--__--__--__--

OK, now we put it all together by
subtracting the cross from our 
rounded sphere. we will animate the
rotation of ourfinal geometry to 
get a good view from a bunch of 
angles. 

** __--__--__--__--__--__--__--__*/

roundedSphere = Intersection(
  Box( Vec3(.775), Vec3(0), Material.red ),
  Sphere( 1, Vec3(0), Material.blue )
)
 
crossRadius = .5
crossHeight = 1
  
cross = Union2(
  Cylinder( Vec2(crossRadius,crossHeight), Vec3(0), Material.green ),
  Rotation(
    Cylinder( Vec2(crossRadius,crossHeight), Vec3(0), Material.green ),
    Vec3(0,0,1),
    Math.PI / 2
  ),
  Rotation(
    Cylinder( Vec2(crossRadius,crossHeight), Vec3(0), Material.green ),
    Vec3(1,0,0 ),
    Math.PI / 2
  )
)
 
march(
  r = Rotation(
    Difference(
      roundedSphere,
      cross
    ),
    Vec3(1,.5,0),
    Math.PI / 4
  )
)
.render( 3, true )
 
callbacks.push( t => r.angle = t )`
