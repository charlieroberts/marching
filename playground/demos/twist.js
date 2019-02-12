module.exports =`m = march(
  StairsUnion(
    Repeat(
      t = Twist(
        Rotation(
          PolarRepeat(
            Cylinder( Vec2(.025,2.75) ),
            10,
            .25
          ),
          Vec3(1,0,0),
          Math.PI / 2
        ),
        Vec3(0)
      ),
      Vec3(2.5,0,0)
    ),
    Plane(),
    .35
  )
)
.light( Light( Vec3(.4), Vec3(.5) ) )
.background( Vec3(.5,.6,.7) )
.render(3, true )
.camera( 2, 0, 6 )
 
onframe = time => {
  t.amount = Math.sin(time/4)*5
}`
