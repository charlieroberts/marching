module.exports = `mat = Material( Vec3(.0), Vec3(.1,0,0), Vec3(1), 2, Vec3(0,.25, 2) )

march(
  Intersection(
    Sphere(3),
    Repeat( 
      Sphere(.25, Vec3(0), mat ), 
      Vec3( .5,.5,.5 ) 
    )
  )
)
.light( 
  Light( Vec3(0), Vec3(4,0,0), .25 ),
  Light( Vec3(0,0,5), Vec3(4,4,0), 1 )
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
