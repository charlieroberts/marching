module.exports = `mat1 = Material( 'phong', Vec3(.05), Vec3(1), Vec3(3), 64, Vec3( 0,4,4 ) )
 
m = march(
  StairsUnion(
    PolarRepeat(
      PolarRepeat(
        Torus82().material( mat1 ),
        20,
        2.75
      ).rotate(90, 1,0,0 ),
      25,
      2
    ),
    Plane( Vec3(0,.5,0) )
      .material( mat1 )
      .texture('noise', { strength:.15, scale:20 }),
    .25
  )
)
.fog( .15, Vec3(0) )
.light( Light( Vec3(0,.65,0), Vec3(1), .25 ) )
.render()
.camera( 0, 0, 10 )`
