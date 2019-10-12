module.exports = `v3 = Vec3, v2 = Vec2

mat1 = Material( 'phong', .05, 1, .5 )

// Torus: Vec2 radius(outer,inner)
torus = Torus( v2(.5,.1) )
  .move( -2.25,1.5  )
  .rotate( 90, 1,0,0 )
  .material( mat1 )
  
// Torus82: Vec2 radius
torus82 = Torus82()
  .move( -.75,1.5,0 )
  .rotate( 90, 1,0,0 )
  .material( mat1 )
  
// Torus88: Vec2 radius
torus88 = Torus88()
  .move( .6,1.5,0 )
  .rotate( 90, 1,0,0 )
  .material( mat1 )
  
// Sphere: float radius
sphere  = Sphere(.65)
  .move( 2.25,1.5,0 )
  .material( mat1 )
 
// Box: Vec3 size
box = Box( .5 )
  .move( -2,0,0 )
  .material( mat1 )
 
// Cylinder: Vec2( radius, height )
cylinder = Cylinder( v2(.35,.5) )
  .move( -.75,0,0 )
  .material( mat1 )
 
// Cone: Vec3 dimensions
cone = Cone( v3(.1, .075, .925) )
  .move( .6,.45,0 )
  .material( mat1 )
 
// Octahedron: float size
octahedron = Octahedron( .65 )
  .move(2.25,0,0)
  .material( mat1 )
 
// HexPrism: Vec2 size(radius, depth)
hexPrism = HexPrism( v2(.6,.45) )
  .move( -2,-1.5,0 )
  .material( mat1 )
 
// TriPrism: Vec2 size(radius, depth)
triPrism = TriPrism( v2(.85,.3) )
  .move( -.5,-1.75,0 )
  .material( mat1 )
 
// RoundBox: Vec3 size, roundness
roundBox = RoundBox( v3(.45), .15 )
  .move( 1.15,-1.5,0 )
  .material( mat1 )
 
// Capsule: Vec3 start, Vec3 end, float radius
capsule = Capsule( v3( 0, -.55, 0), v3(0,.4,0), .25 )
  .move( 2.5,-1.5, 0 )
  .material( mat1 )
 
mat = Material( 'phong', v3(0), v3(.1), v3(.25) )
// Plane: Vec3 normal, float distance
plane = Plane( v3(0,0,1), 1).material( mat )
 
march(
  torus, torus82, torus88, sphere,
  box, cylinder, cone, capsule,
  octahedron, hexPrism, triPrism, roundBox,
  plane
)
.light( 
  Light( Vec3(2,0,5), Vec3(1), .2 )
) 
.render()
.camera( 0,0, 6 )`
