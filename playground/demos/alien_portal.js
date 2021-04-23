module.exports = `mat = Material( 'phong', Vec3(.05), Vec3(1), Vec3(3), 64, Vec3( 0,6,4) )
 
m = march(
  StairsUnion(
    Plane( Vec3(0,.5,0) ).material( mat ),
    PolarRepeat(
      PolarRepeat(
        Torus82().material( mat ),
        20,
        2.75
      ).rotate(90, 1,0,0 ),
      25,
      2
    ),
    .25
  ),
  Plane( Vec3(0,.5,0) )
    .bump( Texture('noise', { strength:1.5, scale:13 }) )
)
.fog( .15, Vec3(0) )
.light( Light( Vec3(0,.25,0), Vec3(1,.5,.25), .125 ) )
.post( Antialias(2), Bloom(.35,1.2,4,4), Focus(.05, .005 ))
.resolution(1)
.render()
.camera( 0, 0, 10 )`
