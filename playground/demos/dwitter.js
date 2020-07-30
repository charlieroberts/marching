module.exports = `/* __--__--__--__--__--__--__--__--
                                    
It's **highly** recommended that you
complete the "texturing" tutorial
before beginning this one.

Marching.js can use dwitter dweets 
as textures for its 3D forms.

If you've never explored dwitter before,
go here for more info + tons of fun: 
https://dwiter.net
                                   
** __--__--__--__--__--__--__--__*/

// the first step is to initialized
// a small chunk of code used to access
// and interpret dweets; this
// isn't included in marching.js
// by default. The use() function lets
// us do this. Run the code below by
// hitting ctrl+enter with your cursor
// on the line:
use('dwitter')

// you should see a notification appear
// at the bottom of your screen when
// hydra is ready to go. Use the Dwitter()
// constructor to make a texture from either
// a draw function from dwitter or an
// identifying sketch number. We'll show
// examples of both.

// first, let's load a dweet using its id #.
// this tweet is from @bandaloo on dwitter,
// who is also the author of the post-processing
// lilbrary used in marching.js. You can see all
// his tweets at https://www.dwitter.net/u/bandaloo

// highlight all the code below and hit ctrl+enter,
// or place your cursor inside of it and hit alt+enter:
Dwitter( 19544, { scale:2, wrap:Texture.mirror })
  .then( tex => {
 
  march(
    Repeat(
      box = Box(.5).texture( tex ),
      2
    )
  )
  .fog( .2, Vec3(0) )
  .post( Edge(), Invert(1), b = Bloom(.5,4) )
  .render('repeat.low')
 
  onframe = t => {
    box.rotate(t*10,1,1,1)
  }
  
})

// When you pass it an id # as the first
// arugment, the Dwitter() function returns a 
// JavaScript promise that resolves to a texture
// when the dweet has been downloaded. You can
// then use that texture with marching.js objects.

// Alternatively, if you want play around with the
// functtions used by dwitter, you can instead pass
// such a function as the first argument:

tex = Dwitter( t => {
  for(let i=2e3; i--; x.fillStyle=\`hsl(\${i/9+99*C(t)},90%,\${20*~~(1+S(i/20)+T(t+S(t+i/99)))}%\`) {
    x.fillRect(i, 0,1,1)
  }
  x.drawImage(c,0,1)
},
{
  scale:2,
  wrap:Texture.mirror
})
 
march(
  Sphere(1.5).texture( tex ) 
)
.post( Antialias(2) )
.render('med')

// you can execute the above code by hitting
// alt+return with your cursor anywhere in
// the code block. Thihs makes it easy to
// change the dwitter draw function and quickly
// see the results... try changing some of the numbers! 
// In the above example I've
// added some antialiasing to smooth out the
// texturing... trying comenting out that line
// and re-evaluating the code to see the difference
// this makes. You can also try changing the render
// preset from 'med' to 'high' to get better
// rendering quality.`
