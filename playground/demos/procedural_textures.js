module.exports = `/* Marching.js lets you define your own
procedural textures; this is a very
similar process to defining your own
GLSL geometries, covered in another
tutorial. You give your texture a name,
define a set of parameters you would
like to expose for control, and then
write a snippet of GLSL that generates
a color based on the current pixel position,
the normal of that pixel on the geometry,
and the values of the various parameters
you defined.

Below is the 'dots' texture included 
in Marching.js in use; we'll be
extending it to enable some different
control parameters to get a feel for the
process of defining a texture.*/

march( s = Sphere(1.5).texture('dots') )
.fog( .15, Vec3(0))
.render( 3, true )
 
onframe = t => s.rotate(t*10, 1,0,0 )

/* Below is the code for 'dots', renamed
to 'dots2', and put into action. One
important aspect to notice is that the
'name' property of the definition must 
match the name of the GLSL function that
you define.*/

def = {
  // define the name for our texture
  name:'dots2',
  // define parameters for interaction
  parameters: [
    { name:'scale', type:'float', default:5 },
    { name:'color', type:'vec3', default:[1,1,1] }
  ],
  // define our GLSL function, which must output a
  // RGB color in a vec3, and must be named the same
  // as our definition's 'name' property.
  glsl:\`          
    vec3 dots2( vec3 pos, vec3 nor, float count, vec3 color ) {
      vec3 tex;
      tex = vec3( color - smoothstep(0.3, 0.32, length(fract(pos*(round(count/2.)+.5)) -.5 )) );
      return tex;
    }\` 
}
 
// To create a function, call Texture.create
// and pass a defintion.
 
Texture.create( def )
 
// use it
march( s = Sphere(1.5).texture('dots2') )
.fog( .15, Vec3(0))
.render( 3, true )

// That should look the same as the original
// texture in this tutorial. Let's add a couple
// new parameters: the first will control the
// base radius of our circles, while the second
// will control the softness of the circle edges.
// Larger values for softness will generate
// larger circles with soft edges. Both these
// parameters will be used in the call to 
// smoothstep in our GLSL code.

def =  {
  name:'dots2',
  parameters: [
    { name:'scale', type:'float', default:10 },
    { name:'radius', type:'float', default:.35 },    
    { name:'spread', type:'float', default:.02 },    
    { name:'color', type:'vec3', default:[1,1,1] }
  ],
  glsl:\`vec3 dots2( vec3 pos, vec3 nor, float scale, float radius, float spread, vec3 color ) {
    vec3 tex;
    tex = vec3( color - smoothstep(radius, radius+spread, length(fract(pos*(round(scale/2.)+.5)) -.5 )) );
    return tex;
  }\` ,
}
 
Texture.create( def )
 
march( s = Sphere(1.5).texture('dots2', { radius:.05 }) ).render(5, true)
 
// animate our parameters
onframe = t => {
  s.rotate(t*10,1,0,0)
  s.texture.color.x = sin(t)
  s.texture.color.y = cos(t/3)
  s.texture.spread = t % .5
  s.texture.scale = t % 10
}`
