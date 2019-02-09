module.exports =`m = march(
  Repeat(
    t = Twist(
      Rotation(
        PolarRepeat(
          Cylinder( Vec2(.05,4.5), Vec3(0,2,0) ),
          5,
          .25
        ),
        Vec3(1,0,0),
        Math.PI / 2
      ),
      Vec3(0)
    ),
    Vec3(2,0,0)
  )
)
.background( Vec3(.5,.6,.7) )
.render(3, true )
.camera( 0, 4.5, 3.5 )
 
onframe = time => t.amount = Vec3( time % 4 )`
