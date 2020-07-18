module.exports = `march(  
  int = Intersection(
    Sphere( 2 ).material(),
    box = Mandelbox( .3,2.5,7 ).material( 'red' )
  )
)
.background( 
  Vec3(.125,0,.125) 
)
.light( 
  Light( Vec3(5), Vec3(1,0,1), .1)
)
.post( 
  Focus( .575 ), 
  rays = Godrays( 1.01,.01,1,.65 ) 
)
.fog(
  .2, Vec3(.125,0,.125) 
)
.render( 'fractal.low' )
.camera( 0,0,3.5 )

onframe = t => {
  box.scale = 2.4 + sin(t) * .15
  box.fold = .3 + cos(t/2) * .1
  int.rotate(t*10,.5,.5,sin(t/5))
} 

rays.color = [1,.5,1]`
