module.exports = `mat1 = Material( 'phong', Vec3(.05), Vec3(1), Vec3(3), 64, Vec3( 0,4,4 ) )
 
m = march(
  StairsUnion(
    PolarRepeat(
      Rotation(
        PolarRepeat(
          Torus82(null,null,mat1),
          20,
          2.75
        ),
        Vec3( 1,0,0 ),
        Math.PI / 2
      ),
      25,
      2
    ),
    Plane( Vec3(0,.5,0), null, mat1 ),
    .25
  )
)
.fog( .15, Vec3(0) )
.light( Light( Vec3(0,.65,0), Vec3(1), .25 ) )
.render()
.camera( 0, 0, 10 )`
