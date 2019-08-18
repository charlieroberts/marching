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
  Box( .775 ).material( 'red' ),
  Sphere( 1 ).material( 'blue' )
)
 
march( roundedSphere ).render()

/* __--__--__--__--__--__--__--__--

it's a little tricky to get a feel
for it viewing it straight on, so
let's rotate it along two axes.

** __--__--__--__--__--__--__--__*/

roundedSphere = Intersection(
  Box( .775 ).material( 'red' ),
  Sphere( 1 ).material( 'blue' )
)
 
// rotate() takes an angle followed by
// x,y, and z axis for rotation
roundedSphere.rotate( 45, 1,1,0 )
 
march( roundedSphere ).render()

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
dimensions = Vec2(crossRadius, crossHeight )
 
cross = Union2(
  Cylinder( dimensions ).material( 'green' ),
  Cylinder( dimensions )
    .material( 'green' )
    .rotate( 270, 0,0,1 ),
  Cylinder( dimensions )
    .material( 'green' )
    .rotate( 270, 1,0,0 )
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
  Box( .775 ).material( 'red' ),
  Sphere( 1 ).material( 'blue' )
)
 
crossRadius = .5
crossHeight = 1
dimensions = Vec2(crossRadius, crossHeight )
  
cross = Union2(
  Cylinder( dimensions ).material( 'green' ),
  Cylinder( dimensions )
    .material( 'green' )
    .rotate( 270, 0,0,1 ),
  Cylinder( dimensions )
    .material( 'green' )
    .rotate( 270, 1,0,0 )
)
 
march(
  obj = Difference(
    roundedSphere,
    cross
  ).rotate( 45, 1,.5,0 )
)
.render( 3, true )
 
callbacks.push( t => obj.rotate( t * 25 ) )`
