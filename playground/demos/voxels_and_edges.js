module.exports = `// this uses a voxelized scene with
// a procedural texture generated by hydra
// alongside of various post-processing effects,
// inclulding edge detection and depth-of-field.

// hit alt+c to hide the code editor
// and take control of the camera using the WASD
// and arrow keys. if your graphics card can handle
// it, try changing the quality variable to 'med' or
// 'high' and then re-executing all the code below.

quality = 'low'

use('hydra').then( ()=> {
 
  hydra = Hydra()
  hydra.osc(10,.1,10).out()
 
  march(
    Repeat(
      sphere = Sphere(.75).texture( hydra.texture() ),
      2
    )
  )
  .voxel(.05)
  .fog( .5, Vec3(0) )
  .post( Edge(), Invert(1), f = Focus(.15) )
  .render( 'voxel.'+quality )
  
  sphere.tex.scale = 8
  
  onframe = time => sphere.radius = .65 + sin( time/5 ) * .15
 
})`
