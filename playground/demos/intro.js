module.exports = `Marching.lighting.mode = 'global'

march(
  Intersection(
    Sphere(3),
    Repeat( 
      Sphere( .25 ), 
      Vec3( .5 ) 
    )
  )
)
.light( 
  Light( Vec3(0), Vec3(4,0,0), .25 )
)
.background( Vec3(0) )
.render()
.camera( 0,0,7 )


/* __--__--__--__--__--__--__--____
                                   
select code and hit ctrl+enter to  
execute. ctrl+h toggles hiding the 
code/gui. try the other demos using
the menu in the upper left corner, 
or click the ? button for help.    
                                   
** __--__--__--__--__--__--__--__*/`
