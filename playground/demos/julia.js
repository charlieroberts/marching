module.exports=`mat1 = Material( 'phong', Vec3(.0),Vec3(.5),Vec3(1), 32, Vec3(0,.25,1) )
tex  = Texture(  'cellular', { strength:.15, scale:20 })  
 
march(
  Julia(1.5)
    .material( mat1 )
    .texture( tex )
    .bump( tex, .05 )
)
.light( 
  Light( Vec3(5,5,8), Vec3(1), .025 ) 
)
.fog( 1, Vec3(0) )
.render()
.camera(0,0,1.75)
`
