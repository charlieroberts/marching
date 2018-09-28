module.exports = `

// The mandelbulb fractal with mouse-driven rotation.
Marching.lighting.mode = 'directional'
  
mat1 = Material( Vec3(.05),Vec3(4,0,2),Vec3(1), 64, Vec3(2,2,.25) )
 
march(
  ry = Rotation(
    rx = Rotation(
      Intersection(
        Box( Vec3(1.5) ),
        m = Mandelbulb(.5, Vec3(0), mat1 )
      ),
      Vec3(0,1,0)
    ),
    Vec3(1,0,0)
  )   
)
.light( 
  Light( Vec3(0), Vec3(.5), .5 )
)
.fog( 1, Vec3(0) )
.background( Vec3(0) )
.render( 3, true )
.camera( 0,0,3 )
 
x = 0
y = 0
window.onmousemove = e => {
  x = e.clientX / window.innerWidth
  y = e.clientY / window.innerHeight
}
 
callbacks[1] = time => {
  ry.angle = y * 6.28
  rx.angle = x * 6.28
  m.a = 2 + time % 14
}`
