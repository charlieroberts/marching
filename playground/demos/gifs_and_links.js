module.exports=`/* __--__--__--__--__--__--__--____
                                    
Marching.js lets you both download 
animated gifs and generate links.   
Together, you can post a short clip
on social media alongside a link    
that enables people to easily      
experiment with your code.          
                                   
Links can be generated at any time  
but creating gifs requires a tiny  
bit of extra wok. Both are described
below.                             
                                    
If you remember, please use       
#marchingjs when you post online!   
                                   
** __--__--__--__--__--__--__--__*/

// First let's generate a link to this code.
// delete the long block comment above, then
// run the line below by highlighting it and
// hitting control+enter
getlink('text for link blah')

// You'll notice there's a short link, for
// copying and pasting into an email, pdf
// or other document that suppots rich text.
// Most browsers will also let you copy the
// generated URL if you control-click on the
// link. As shown above, you can specify the
// text you'd like to use for your link. Also,
// if your call to getlink() is on the last
// line of your sketch, it won't appear in the
// geneated link. So, you should probably always
// run it at the bottom of your sketch. Finally,
// the code in the link will automatically run
// in the playground.

// IMPORTANT: There's a maximum length in most
// browsers for URLs. Make sure your link works
// the way you expect it to before posting it!

// OK, now let's make an animated gif. First,
// we have to load an additional library. Run
// the line of code below with control+enter:

use('gif')

// You'll see a notification when the library
// has loaded. Now we can add a call to .gif,
// and pass in:
// width - default 600
// height - default 335
// length (in frames) - default 60
// quality (1-10) - default 5
// interframe delay (in ms) - default 17 (for 60 fps)
// filename - default 'marching.gif'

// Here's an example of what should be a "perfect" 
// 400x400 loop for one second (make sure you 
// ran use('gif') before trying this):

march(
  j = Julia().scale(1.5) 
)
.gif( 400,400,59 )
.render( 'fractal.high' )
  
let fc = 0
onframe = time => {
  j.fold = 3.5 + sin(fc)
  fc += (Math.PI*2)/60
}

// last but not least, when you make a call
// to .use(), it will take a bit to download the
// requested libraries. You can just wait for
// a notification to appear that the library has
// been loaded before running additional code, 
// but if you'd like to publish a link that runs
// everyhing automatically this becomes problematic.
// use() returns a promise that will resolve when
// the library is loaded, so you can delay execution
// as follows:

use('hydra').then( ()=> {
  h = Hydra()
  osc( 50,.15,.25 ).modulate( noise(15) ).out()
  
  march(
    m = Box().texture( h.texture() )
  )
  .render('med')
  .camera(0,0,4)
  
  onframe = t => m.rotate(t*5, .5,1,.5 )
  
  h.texture.strength = .5
})`