module.exports = `Marching.lighting.mode = 'orenn'
 
march(
  SmoothUnion(
    rot = Rotation( 
      pipe = PipeUnion(
        Box(),
        sphere = Sphere(2.5, null, Material.blue),
        .5
      ),
      Vec3(1,.5,.5)
    ),
    Plane( Vec3(0,1,.75), 2.25 ),
    .125
  )
)
.light( 
  Light( Vec3(0,5,0), Vec3(0,.25,1), .05 )
)
.background( Vec3(.1) )
.shadow( 8 )
.render(3, true)
.camera( 0,0,7 )
 
callbacks.push( time => {
  pipe.c = .8 + Math.abs(Math.sin(time/2)) / 4
  rot.angle = time
  sphere.radius = 2 + Math.abs( Math.sin(time/4))
})`
