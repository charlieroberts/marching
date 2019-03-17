module.exports =`// inspired by http://roy.red/folding-the-koch-snowflake-.html
// this is still under development
march(
  r = Rotation(
    // number of iterations, fold amount, radius, threshold, scale, center, material
    k = KIFS( 6,.25,.01,.01, 2, null, Material.white ),
    Vec3( 1 )
  )
)
.render( 3,true )
.camera( 0,0,3 )

onframe = t=> {
  k.fold  = -.1 + sin( t ) * .5
  r.angle = t/4
}`
