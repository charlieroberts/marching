module.exports=`Material.default = Material.grey
 
march(
  Julia( 1.5 ),
  Plane( Vec3(0,1,0), .75 )
)
.light( Light( Vec3(0,3,3), Vec3(1) ) )
.fog( .25, Vec3(0,0,0) )
.render()
.camera( 0,0,2.25 )`
