module.exports = `// because, like, marching.js, snare drums, marching...
 
const white = Material( 'phong', Vec3(0), Vec3(50), Vec3(1), 8, Vec3(0,50,2) ),
      grey =  Material( 'phong', Vec3(0), Vec3(3), Vec3(2), 32, Vec3(0,0,2) )
      a = .45, b = .25 // for side bands on drum
 
stick = ()=> {
  return Union(
    Groove(
      Cylinder( Vec2(.2,2.5), Vec3(.5,4.5,-.5), grey ),     
      Capsule( Vec3(.5, 2,-.5), Vec3(.5,2.25,-.5), 1 ),
      .08
    ),
    Capsule( Vec3(.5, 2,-.5), Vec3(.5,2.25,-.5), .175, grey )
  )
}
  
stickL = Translate(
  Rotation(
    stick(),
    Vec3(0,0,1),
    Math.PI / 3
  ),
  Vec3(-1.5,.25,0)
)
 
stickR = Translate(
  Rotation(
    stick(),
    Vec3(0,.75,.5),
    Math.PI / 3
  ),
  Vec3(-2.05,.0,-.5)
)
 
drum = RoundUnion(
  Union2(
    ChamferDifference(
      Cylinder( Vec2(2.25, .45), null, grey ),
      Cylinder( Vec2(2,.4), null, grey ),
      .1
    ),
    Cylinder( Vec2(2,.3), null, white )
  ),
  PolarRepeat(
    Quad( Vec3(0,-a,-b), Vec3(0,-a,0), Vec3(0,a,b), Vec3(0,a,0), Vec3(0) ),
    15,
    2.25
  ),
  .05
)
 
march(
  Rotation(
    drum,   
    Vec3(1,1,0),
    -1
  ),
  stickL,
  stickR
)
.background(Vec3(0))
.shadow(.75)
.light( Light( Vec3(2,5,8), Vec3(1), .125 ) )
.render()
.camera( 0,0,7 )`
