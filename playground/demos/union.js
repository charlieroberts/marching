module.exports = `// unions and smooth unions can be used to
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
