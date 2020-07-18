module.exports = `/* __--__--__--__--__--__--__--____
                                    
Marching.js wraps the mergepass lib
for performing post-processing:     
                                    
https://tinyurl.com/y4zxayey       
                                    
There's a bunch of presets that make
fun effects. These effects are called
"post" processing because they are
applied to the marching.js scene after
it has been rendered... think of them
as filters in Photoshop.          
                                   
All post-proccessing effects are  
applied through the .post() method.
                                  
** __--__--__--__--__--__--__--__*/

// simple but fun---godrays

march(
  i = Intersection(
    Box(1.5),
    Repeat( Sphere(.125), .5 )
  )
)
.post( rays = Godrays() )
.render('med')
 
onframe = t => i.rotate( t*10, 1,.5,.25 )

// try below one line at a time
rays.color = [1,0,1]
rays.decay = 1.01
// change z position of rays to put
// them in the box
rays.threshold = .25


// __--__--__--__--__--__--__--____
// ok, let's try and example based
// on simulating a depth-of-field effect.
// this will blur areas out of focus.

march(
  Repeat(
    Box().texture('dots').scale(.25),
    1.5
  )
)
.post( f = Focus() )
.fog( .15, Vec3(0) )
.render('med')
 
onframe = t => camera.pos.z = t/3

// change depth target
f.depth = .15
// change width of focus
f.radius = .05


// __--__--__--__--__--__--__--____
// last but not least, let's combine
// a bunch of options. look in the reference
// for more post-processing effects to layer!

march(
  ri = RoundIntersection(
    s = Sphere(2).material('green').texture('dots', { scale:75 }),
    r = Repeat(
      Box().scale(.1).material('green').texture('dots', { scale:10 }),
      .5
    )
  )
)
.post(
  bloom = Bloom(.25,8),
  g = Godrays(),
  Edge()
)
.render('med')
  
z = 0
onframe = t => {
  z += abs( sin(t/2) * .02 )
  r.translate( 0,0,z )
  ri.rotate( t*15,1,.5,.25 )
}
 
g.decay = 1.01`
