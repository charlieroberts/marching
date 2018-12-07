module.exports = `mat1 = Material( 'phong', Vec3(.0),Vec3(.5,0,0),Vec3(1), 32, Vec3(0) )
 
march(
  ry = Rotation(
    Intersection(
      Box( Vec3(1) ),
      m = Mandelbulb(.5, Vec3(0), mat1 )
    ),
    Vec3(1,0,0),
    Math.PI / 2.01
  )   
)
.light( 
  Light( Vec3(0,0,4), Vec3(1), .25 )
)
.render(3, true)
.camera( 0,0,3 )
 
callbacks[1] = t => m.a = 7 + Math.sin( t / 4 ) * 4`
