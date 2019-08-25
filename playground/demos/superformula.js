module.exports = `// a 3D superformula essentially two 2D supershapes,
// first six coefficients govern one, second
// six coefficients govern the other.

mat1 = Material( 'phong', Vec3(.0),Vec3(0),Vec3(1), 16, Vec3(0,.25,4) )
 
m = march(
  s = SuperFormula(
    1, 1, 16, 1, 1, 1,
    1, 1, 16, 1, 1, 1
  )
  .translate( 0, .5, .85 )
  .material( mat1 )
  .texture( 'truchet', { color:.125, scale:30 } ),
 
  Plane( Vec3(0,1,0), 1 ).material( Material('phong', Vec3(.15), Vec3(1) ) )
)
.light( 
  Light( Vec3(0,5,0), Vec3(.25,.25,.5), .5 ),
  Light( Vec3(3,3,0), Vec3(.5), .5 )
)
.fog( .25, Vec3(0) )
.render( 2, true )
.camera( 0,0,5 )
 
onframe = time => {
  t = 12
  s.n1_1 = Math.PI + Math.sin( time )
  s.n1_2 = Math.PI + Math.cos( time )
  s.m_1 = Math.sin( time / 2 ) * t
  s.m_2 = Math.cos( time / 2 ) * t
  s.rotate( time * 10, 0,1,0 )
}

// thanks to https://github.com/Softwave/glsl-superformula`
