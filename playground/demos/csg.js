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
