module.exports =`// In this demo the important point 
// to note is that transformations can be applied to
// most functions, not just geometries. Here, a
// rotation is applied to a Union while translation
// is applied to the domain created by Repeat().
//
// Note that the quality argument in the call to
// .render() is set quite low; if you have
// a nice graphics card try raising this
// value to obtain prettier results.
 
march(
  rpt = Repeat(
    union = Union2(
      cyl = Cylinder(Vec2(1,1.5))
        .texture('dots', {scale:2}),
      cyl2 = Cylinder(Vec2(.95,1.5))
        .rotate(90,0,0,1)    
        .texture('stripes', {scale:1}),
      cyl3 = Cylinder(Vec2(.95,1.5))
        .rotate(90,1,0,0)
        .texture('checkers', {scale:5})
    )
    .scale(.15),
    .75
  )
)
.background( Vec3( .85,.85,.8 ) )
.fog( .5, Vec3( .85,.85,.8 ) )
.render( 2,true )

onframe = time => {
  union.rotate( time*65,1,.5,.5 )
  rpt.translate( 0,0,time/3 )
}`
