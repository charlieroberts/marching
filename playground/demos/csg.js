module.exports = `// https://en.wikipedia.org/wiki/Constructive_solid_geometry

Marching.lighting.mode = 'directional'
 
roundedSphere = Intersection(
  Sphere(1.25, Vec3(0), Material.blue ),
  Box(Vec3(1),Vec3(0), Material.red )
)
 
crossRadius = .65
crossHeight = 2
cross = SmoothUnion2(
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
.light( 
  Light( Vec3(0,3,4), Vec3(1), .15 ) 
)
.render( 3, true )
 
callbacks.push( time => r.angle = time )`
