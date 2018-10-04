module.exports = `march(
  Julia( 1.45 ),
  Plane( Vec3(0,1,0), .75 )
)
.light( Light( Vec3(0,3,3), Vec3(1) ) )
.background( Vec3(0) )
.fog( .25, Vec3(0,0,0) )
.render()
.camera( 0,0,2.25 )`
