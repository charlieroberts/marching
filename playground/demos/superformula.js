module.exports = `
Marching.lighting.mode = 'directional'
 
mat1 = Material( 0, Vec3(.05),Vec3(1),Vec3(2), 32, Vec3(2,2,.125) )
 
march(
  r = Rotation(
      
    // a 3D superformula essentially two 2D supershapes,
    // first six coefficients govern one, second
    // six coefficients govern the other. In this example
    // the two supershapes are the same. 
        
    s = SuperFormula(
      1, 1, 16, 1, 1, 1,
      1, 1, 16, 1, 1, 1,
      Vec3(0),
      mat1
    ),
    Vec3(1,1,1)
  )
)
.light( Light( Vec3(0,0,5), Vec3(1,1,2), .12 ) )
.fog( .5, Vec3(0) )
.shadow( 0 )
.background( Vec3(0) )
.render( 2, true )
.camera( 2,0,3 )
 
callbacks.push( time => {
  t = 15
  s.n1_1 = Math.PI + Math.sin( time )
  s.n1_2 = Math.PI + Math.cos( time )
  s.m_1 = Math.sin( time / 2 ) * t
  s.m_2 = Math.cos( time / 2 ) * t
  r.angle = time / 4
})

// thanks to https://github.com/Softwave/glsl-superformula`
