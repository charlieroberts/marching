module.exports = `mat1 = Material( 'phong', Vec3(.0),Vec3(.5),Vec3(1), 32, Vec3(0) )
 
march(
  Mandelbulb( 6.5 )
    .rotate( 270, 1,0,0 )
  	.translate( 0,0,.5 )
    .material( mat1 ),
 
  Plane( Vec3(0,0,1), .5 ).material( 'white glow')
)
.light( 
  Light( Vec3(-3,2,4), Vec3(1), .25 ),
  Light( Vec3(0,0,4), Vec3(1), .95 )
)
.render()
.camera( 0,0,3 )`
