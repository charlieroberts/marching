module.exports = `Marching.lighting.mode = 'directional'

T = Translate, R = Rotation, v3 = Vec3, v2 = Vec2

mat1 = Material(v3(.05),v3(1),v3(.5))
// Torus: Vec2 radius(outer,inner), center, material
torus   = T( R( Torus( v2(.5,.05), v3(0), mat1 ),  v3(1,0,0,), Math.PI / 2 ), v3(-2,1.5,0) )
  
// Torus82: Vec2 radius, center, material
torus82 = T( R( Torus82(null,null,mat1), v3(1,0,0,), Math.PI / 2 ), v3(-.75,1.5,0) )
  
// Torus88: Vec2 radius, center, material
torus88 = T( R( Torus88(null,null,mat1), v3(1,0,0,), Math.PI / 2 ), v3(.5,1.5,0) )
  
// Sphere: float radius, center, material
sphere  = Sphere(.65, v3(2,1.5,0), mat1 )
 
 
 
// Box: Vec3 size, center, material
box     = Box( v3(.5), v3(-2,0,0), mat1 )
 
// Cylinder: Vec2( radius, height ), center, material
cylinder = Cylinder( v2(.35,.5), v3(-.75,0,0), mat1 )
 
// Cone: Vec3 dimensions, center, material
cone    = Cone( v3(.1, .075, .825) , v3(.5,.3,0), mat1 )
 
// Capsule: Vec3 start, Vec3 end, float radius, material
capsule = T( Capsule( v3( 0, -.45, 0), v3(0,.45,0), .15, mat1 ), v3(2,0,0) )
 
 
 
// HexPrism: Vec2 size(radius, depth), center, material
hexPrism = HexPrism( v2(.6,.45), v3(-2,-1.5,0), mat1 )
 
// TriPrism: Vec2 size(radius, depth), center, material
triPrism = TriPrism( v2(.85,.3), v3(-.75,-1.75,0), mat1 )
 
// RoundBox: Vec3 size, roundness, center, material
roundBox = RoundBox( v3(.45), .15 ,v3(1,-1.5,0), mat1 )
 
// Octahedron: float size, center, material
octahedron = Octahedron( .65 , v3(2.75,-2.25,0), mat1 )
 
 
 
mat = Material( v3(0), v3(.1), v3(.25) )
// Plane: Vec3 normal, float distance, material
plane = Plane( v3(0,0,1), 1, mat )
 
march(
  torus, torus82, torus88, sphere,
  box, cylinder, cone, capsule,
  octahedron, hexPrism, triPrism, roundBox,
  plane
)
.light( 
  Light( Vec3(0,0,5), Vec3(1), .2 ),
  //Light( Vec3(2,0,5), Vec3(1,1,1), .25 )  
) 
.render()
.camera( 0,0, 6 )`
