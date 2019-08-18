module.exports=`/* __--__--__--__--__--__--__--____

Note: this tutorial is only for people
who know GLSL and want to incorporate
their own shader code into marching.js

If you know some GLSL, it's not too
hard to add your own forms to
marching.js. The process consists of:

1. Defining all the interactive
properties of your form.

2. Defining a shader function that
will create your form when the proper
arguments are passed. This function
will only be added to the shader once.

3. Defining a call to your shader
function that passes the correct
arguments; this function call will
be inserted into the shader wherever
an instance of your form is placed
in the scene graph.

** __--__--__--__--__--__--__--__*/

spongeDesc = {
  // 'parameters' define our points of interaction.
  // types are float, int, vec2, vec3, and vec4
  parameters:[
    { name:'frequency', type:'float', default:5 }
  ],
 
  // this is the primary signed distance function
  // used by your form. The first argument should 
  // always be a point you're testing, subsequent
  // arguments are your parameters.
  glslify:
   \`float sineSponge( vec3 p, float frequency ) {
      p *= frequency;
      return (sin(p.x) + sin(p.y) + sin( p.z )) / 3. / frequency;
    }\`,
 
  // this is a function that will insert code calling
  // to your distance function wherever your form is
  // placed in a graph. It is passed the name of
  // the point (of type vec3) that is being sampled
  // by the ray marcher. Following passing 
  // the point, you will pass each of the input parameters
  // to your signed distance function (in this case, only frequency)
  primitiveString( pName ) { 
    return \`sineSponge( \${pName}, \${this.frequency.emit()} )\`
  }  
}
 
// create and store resulting constructor in a global variable
Sponge = Marching.primitives.create( 'Sponge', spongeDesc )
 
march( 
  obj = RoundDifference( 
    Sphere(2).material('glue'),
    s = Sponge( 5 ).material('glue'),
    .125   
  )
)
.light(
  Light( Vec3(0,5,5), Vec3(1), .5 )
)
.background( Vec3(.125) )
.render(3,true).camera(0,0,5)
 
onframe = t => {
  obj.rotate( t*10 )
  s.frequency = 10 + sin(t/2) * 5
}`
