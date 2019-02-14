module.exports = `repeatedSpheres = Repeat( 
  Sphere( .14 ), 
  Vec3( .25 ) 
)
 
march(
  Intersection(
    Sphere(2),
	repeatedSpheres
  )
)
.light( Light( Vec3(0), Vec3(2) ) )
.render()

/* __--__--__--__--__--__--__--____
                                   
select code and hit ctrl+enter to  
execute. alt+enter (option+enter on
a mac) executes a block of code. 
ctrl+shift+h toggles hiding
the code/gui. try the other demos  
using the menu in the upper left    
corner. when you're ready to start 
coding go through the tutorials     
found in the same menu. Click on   
the ? button for a reference.       
                                   
For a nice intro on ray marching and
signed distance functions, which are
the techniques used by marching.js,
see:                                
                                   
https://bit.ly/2qRMrpe              
                                   
** __--__--__--__--__--__--__--__*/`
