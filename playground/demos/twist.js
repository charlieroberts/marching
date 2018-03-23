module.exports = `Marching.lighting.mode = 'global'
 
m = march(
  Repeat(
    t = Twist(
      Rotation(
        PolarRepeat(
          Cylinder( Vec2(.1,4.5), Vec3(0,2,0)  ),
          8,
          .35
        ),
        Vec3(1,0,0),
        Math.PI / 2
      ),
      Vec3(0)
    ),
    Vec3(2,0,0)
  )
)
.render(3, true )
.camera( 0, 5, 3 )
 
callbacks.push( time => t.point = Vec3( time % 4 ) )`
