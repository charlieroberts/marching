module.exports = `// Noise() can be used in place of any float or Vector member.

march(  
  // noisy radius
  Sphere( Noise(), Vec3(-2,0,0) ),
  
  // noisy y-size
  Box( Vec3(2,0,0), Vec3( 1, Noise(.25,1), 0 ) ) 
).render() 

// Noise( (float)strength=.25, (float)bias=1, (float)timeMod=1 )

march( Sphere( Noise() ) ).render()  
march( Sphere( Noise(.5) ) ).render()  
march( Sphere( Noise(.25,2,.5) ) ).render()  

// Displace() works a bit differently, in that it
// takes the output of a distance function and alters
// it, rather than providing an input to a distance 
// function (like Noise()).

// displace the rays colliding with our box
d = Displace( Box( Vec3(0), Vec3(2,4,2)), Vec3(1) )

// rotate the displacement on the x and z axes
r = Rotation( d, Vec3(1,0,1), 0 )

// compile the shader
march( r ).render( )  3, true )

callbacks.push( 
  // change rotattion
  time => r.angle = time,
  // change displacement
  time => d.displacement.x = 1 + Math.sin(time/4) % 1
)

// move the camera back to see the whole scene
camera.pos.z = 10`
