module.exports=`/* __--__--__--__--__--__--__--__--
                                    
Marching.js provides a variety of
ways to create procedural textures.
In order of increasing complexity,
they are:

1. Using texture presets
2. Using HTML <canvas> objects
3. Using Hydra, another live coding
   system for 2D visual chaos
4. Writing your own shaders

#4 is covered in the "defining
procedural textures" tutorial, we'll
cover thhe rest here.
                                   
** __--__--__--__--__--__--__--__*/

// marching.js comes with a number 
// of texture presets that share
// some properties; you can see most
// of them in theh "textures catalog"
// demo. Let's look at "truchet" to get
// a sense for how these presets work.

tex = Texture( 'truchet' )
march( Box().texture( tex ) ).render() 

// calling Texture() makes a new texture
// object that can be passed to the 
// .texture() method of any geometry or
// combinator. If you call .texture() 
// on a combinator, the texture will be
// applied to all it's members.

tex = Texture( 'checkers' )
march( 
  StairsUnion(
    Box(),
    Box( Vec3(.5,2,.5) )
  )
  .texture( tex )
  .rotate(45,1,1,1)
).render()

// while some properties are unique
// to specific textures, others can
// be found on all of them: scale,
// strength, and uv. Examples of each
// are shown below. Here we'll call
// the .texture() method and pass in
// names of presets instead of passing
// in a texture object. When you do this,
// you can also pass a dictionary of property
// setters.

// the scale property scales texture coordinates
march( 
  Sphere().translate(1,0,0).texture( 'checkers', { scale:5 }),
  Sphere().translate(-1,0,0).texture( 'checkers', { scale:15 })
).render()

// you can also provide coordinate offset using
// uv property. When you want to refer to the texture
// of an object, you can do so with the following form:
//
// objvariable.texture.propertyname = value

march( 
  s1 = Sphere().translate(1,0,0).texture( 'checkers', { scale:5 }),
  s2= Sphere().translate(-1,0,0).texture( 'checkers', { scale:15 })
).render( 'med' )
 
onframe = t => {
  s1.texture.uv.x = t/5
  s2.texture.uv.y = t/5
}

// last but not least, many textures (but possiibly not all)
// have a "strength" property that blends the texture with
// the non-textured lighting.

march( 
  Box(.5).translate(-1.1,0,0).texture( 'rainbow', { strength:0, scale:10 }),
  Box(.5).translate(0,0,0).texture( 'rainbow', { strength:.25, scale:10 }),
  Box(.5).translate(1.1,0,0).texture( 'rainbow', { strength:1, scale:10 })
).render()

// there's one additional preset, 'feedback', that is a special case.
// it creates a texture of the entire scene, that you can then
// use to texture individual objects. Try running this one twice if you
// don't get full feedback... there's a bug I need to fix in there.

t = Texture( 'feedback' )
 
march(
  RoundUnion(
    b = Box(1).texture( t ),
    c = Sphere().texture('dots').translate(2,0,0)
  ),
  Plane( Vec3(0,0,1) ).texture('stripes')
)
.render('low')
.camera(0,0,3.5)
 
onframe = time => {
  t.update()
  b.rotate(time*5, 1,.5,.25 )
  c.rotate(time*4, .5,1,.25 )
}`
