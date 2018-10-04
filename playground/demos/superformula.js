module.exports = `mat1 = Material( 'phong', Vec3(.05),Vec3(1),Vec3(2), 16, Vec3(0,2,.125) )
 
m = march(
  r = Rotation(
 
    // a 3D superformula essentially two 2D supershapes,
    // first six coefficients govern one, second
    // six coefficients govern the other. In this example
    // the two supershapes are the same.
 
    s = SuperFormula(
      1, 1, 16, 1, 1, 1,
      1, 1, 16, 1, 1, 1,
      Vec3(0,.35,0),
      mat1
    ),
    Vec3(0,.5,0)
  ),
  Plane( Vec3(0,1,0), 1, Material('phong', Vec3(.15), Vec3(1) ) )
)
.light( 
  Light( Vec3(0,5,0), Vec3(1,1,2), .25 ),
  Light( Vec3(3,3,0), Vec3(0,0,1), .5 )
)
.fog( .25, Vec3(1) )
.shadow(8)
.background( Vec3(1) )
.render( 2, true )
.camera( 0,0,4 )
 
callbacks.push( time => {
  t = 12
  s.n1_1 = Math.PI + Math.sin( time )
  s.n1_2 = Math.PI + Math.cos( time )
  s.m_1 = Math.sin( time / 2 ) * t
  s.m_2 = Math.cos( time / 2 ) * t
  r.angle = time / 4
})

// thanks to https://github.com/Softwave/glsl-superformula`
