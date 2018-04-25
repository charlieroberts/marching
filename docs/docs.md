# Marching.js 

# Marching

The `Marching` object is responsible for creating [Scene](#scene) objects in marching.js, in addition to a number of important global properties. When you you call the `march` method of the `Marching` object,, you pass a set of signed-distance fields; if needed the scene constructor will combine geometries / transformations you pass into a single Union. Once the raymarcher is initialized, you can then define lighting, camera placement etc. Finally, you can render the scene with a call to `scene.render()`. In the marching.js playground the scene constructor is aliased to `window.march`. 

#### Methods ####
### marching.export ###
The `export` method takes all the various geometries and domain operations of marching.js and creates pointers to them in a separate target object that is passed as a parameter. For example, this method is used to place all constructors into the global namespace in the marching.js playground.

**target** &nbsp; *object* &nbsp; Pointers to the various constructors found in the [Marching](#marching) object will be placed into this target object. 

### marching.init ###
The `init` method initializes marching.js and assigns it a `<canvas>` element to use as a 3D WebGL context for drawing. This method should typically only be called once per page load.

**canvas** &nbsp; *Canvas DOM Element* &nbsp; Pass in the canvas element you'd like to use to render the ray marcher. 

### marching.march ###

**SDFs** &nbsp; *object* &nbsp; When calling march you pass as many SDF objects as you like; these will be combined using a Union object; to instead use a SmoothUnion, simply place all the objects in your scene in a SmoothUnion and then pass that single object to the raymarcher constrctur.   

### Properties ###
### marching.callbacks ###

*array* &nbsp; An array of callbacks that will be called once per frame; by default the array is empty. Each function is passed a *time* value, giving a current time in the scene. In order to use callbacks correctly, you must be sure to specify that the scene rendering should be animated. An example is given below:

```js
march(
  r = Rotation(
    Box(),
    Vec3(1,1,0)
  )
)
.render( 3, true )

callbacks.push( time => r.angle = time )

``` 


# Scene 

A `scene` object is creatd by a call to `Marching.march` (aliased to simply `march` in the marching.js playground). You can render a `scene` to a fullscreen quad, and eventually will also be able to render them to individual geometries. 

#### Methods ####
### scene.background ###
The background color for the scene.

**red** &nbsp; *object* &nbsp; Optional, default = 0.  
**green** &nbsp; *object* &nbsp; Optional, default = 0.  
**blue** &nbsp; *object* &nbsp; Optional, default = 0.   

### scene.camera ###
This will move and the camera used by the scene. Currently the camera always is oriented towards the center of the scene; this will be fixed in a future release.

**x** &nbsp; *object* &nbsp; Optional, default = 0. The x position of the camera.   
**y** &nbsp; *object* &nbsp; Optional, default = 0. The y position of the camera.  
**z** &nbsp; *object* &nbsp; Optional, default = 5. The z position of the camera.  

### scene.fog ###
This recreates the class OpenGL 'fog' effect, which adds fog color to objects as they get further from the camera, making them gradually vanish.

**strength** &nbsp; *float* &nbsp; Default = 0. The strength of the fog effect. 
**color** &nbsp; *Vec3* &nbsp; Default = {0,0,0}. The color of the fog effect. 

### scene.light ###
In conjunction with the `Marching.lighting.mode` property and various `Material` objects used by the SDFs, this determines the lighting for the scene. The `.light` function accepts an arbitrary number of `Light` objects.

**lights** &nbsp; *object* &nbsp; Optional. A comma-separated list of `Light` objects that are used to light the scene. Their functionality is dependent on the lighting mode being used, as determined by the `Marching.lighting.mode` property; in some modes only one light can be specified, while in others an arbitrary number of lights can be used. 

### scene.render ###
The render method renders its scene to the screen or to a vertex-based geometry.

**qualtiy** &nbsp; *int* &nbsp; Default = 10. This value determines many aspects of how the scene renders, including the maximum number of steps for each ray, the maximum length each ray will travel, and the resolution of the final image in full scene renders. Lower values are useful for scenes that will be animated, while higher values are useful for screenshots and experimentation. 

### scene.shadow ###
Adds shadows to the scene.

**diffuseness** &nbsp; *int* &nbsp; Default = 8. A term used as an exponent to determine the diffuseness of shadows that are used. Higher numbers result in harder shadows. Providing a value of `0` when `Marching.lighting.mode='directional'` will remove shadows from the scene, which can be useful in scenarios where shadows would do not properly render due to errors in signed distance functions. 

# Distance Operations 

Distance Operations are used to combine multiple signed distance fields together. The simplest example is the [Union](#distance-operations-union), which combines to SDFs together with hard edges; there are a variety of additional options that combine distance fields in more interesting and unique ways. Other important operations include various flavors of [Differrnce(#distance-opeations=difference) (removing one geometry from another) and [Intersection](#distance-operations-intersection) (calculating the shared space occupied by two objects).

ChamferDifference
----
This distance operation creates a rounded, yet discretely identifiable, border at the point where one geometry is subtracted from another..  

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.   
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**size** &nbsp; *float* &nbsp; Default = .8; The size of the rounded border to be generated between the objects.

ChamferIntersection
----
This distance operation creates a rounded, yet discretely identifiable, border around the shared surfaces of two SDFs. 

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.   
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**size** &nbsp; *float* &nbsp; Default = .8; The size of the rounded border to be generated between the objects.

ChamferUnion
----
This distance operation creates a rounded, yet discretely identifiable, border at the intersection between two SDFs.  

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.   
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**size** &nbsp; *float* &nbsp; Default = .8; The size of the rounded border to be generated between the objects. 

Difference
----
This distance operation subtracts one signed distance field from the other and returns the result. 

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined. 

Engrave
----
This takes the intersection of two SDFs and includes a lowered, angled, border between them.

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**angle** &nbsp; *float* &nbsp; The depth of the angled border. 

Groove
----
This takes the intersection of two SDFs and includes a lowered, non-angled, border between them.

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**angle** &nbsp; *float* &nbsp; The depth of the border. 

Pipe
----
This takes the intersection of two SDFs and *only* includes the border in the form of a cylindrical pipe. 

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**angle** &nbsp; *float* &nbsp; The depth of the pipe.

RoundDifference
----
This distance operation creates a smoothly rounded border where one geometry is subtracted from another.  

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.   
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**size** &nbsp; *float* &nbsp; Default = .3; The amount of the rounded border to be generated between the objects.

RoundIntersection
----
This distance operation creates a smoothly rounded border around the intersection of two sdfs. 

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.   
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**size** &nbsp; *float* &nbsp; Default = .3; The size of the rounded border to be generated between the objects.

RoundUnion
----
This distance operation creates a smoothly rounded border at the intersection between two SDFs. It is similar to [SmoothUnion](#distance-operations-smoothunion) but generates results that are more optimal mathematically in many situations.

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.   
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**size** &nbsp; *float* &nbsp; Default = .3; The amount of smoothing to be generated between the objects.

SmoothUnion
---
This distance operation creates a smoothly transition between two SDFs. 

#### Constructor ####
**a** &nbsp; *sdf* &nbsp; A signed distance field to be combined.   
**b** &nbsp; *sdf* &nbsp; A signed distance field to be combined.  
**c** &nbsp; *float* &nbsp; Default = .3; The amount of smoothing to be generated between the objects. High values can cause relatively large distances between SDFs to be bridged to form a continuous surface.

```js
// make a peanut by smoothing gap between two spheres.
march(
  SmoothUnion(
    Sphere(1, Vec3(-1,0,0) ),
    Sphere(1, Vec3(1,0,0) ),
    1
  )
).render()
```
SmoothUnion2
---
This distance operation creates a smoothly transition between an unlimited number of SDFs. The last parameter passed to the constructor will determine the amount of smoothing used.

#### Constructor ####
**...sdfs** &nbsp; *sdf* &nbsp; A list of signed distance fields to be combined.   
**c** &nbsp; *float* &nbsp; Default = .3; The amount of smoothing to be generated between the objects. High values can cause relatively large distances between SDFs to be bridged to form a continuous surface.

```js
// makie a 3D jumping jack. 
march(
  r = Rotation(
    SmoothUnion2(
      Sphere(1, Vec3(-2,0,0) ),
      Sphere(1, Vec3(2,0,0) ),
      Sphere(1, Vec3(0,0,0) ),
      Sphere(1, Vec3(0,2,0) ),
      Sphere(1, Vec3(0,-2,0) ),
      Sphere(1, Vec3(0,0,-2) ),
      Sphere(1, Vec3(0,0,2) ),
      .5 // smoothing value
    ),
    Vec3(1)
  )
)
.render(4, true )
  
callbacks.push( time => r.angle = time )
```

StairsDifference
----
This distance operation creates a smoothly rounded border where one geometry is subtracted from another.  

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.   
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**radius** &nbsp; *float* &nbsp; Default = .3; The radius of the stepped border to be generated between the objects.
**number** &nbsp; *float* &nbsp; Default = 4; The number of steps along the border to be generated 

StairsIntersection
----
This distance operation creates a smoothly rounded border around the intersection of two sdfs. 

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.   
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**size** &nbsp; *float* &nbsp; Default = .3; The size of the rounded border to be generated between the objects.

StairsUnion
----
This distance operation creates a smoothly rounded border at the intersection between two SDFs. It is similar to [SmoothUnion](#distance-operations-smoothunion) but generates results that are more optimal mathematically in many situations.

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.   
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**size** &nbsp; *float* &nbsp; Default = .3; The amount of smoothing to be generated between the objects.

Tongue
----
This takes the intersection of two SDFs and includes a raised, non-angled, border between them.

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**angle** &nbsp; *float* &nbsp; The depth of the border.

Union
----
This distance operation combines two signed distance functions using hard edges. 

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  

Union2
----
Combine an arbitrary number of SDFs. 

#### Constructor ####
**...sdfs** &nbsp; *object* &nbsp; A comma-separated list of SDFs to combine.

```js
// the following two SDFs are equivalent:

sdf1 = Union(
  Sphere( .5 ),
  Union(
    Box(),
    Union(
      Capsule(),
      Octahedron()
    )
  ) 
) 

sdf2 = Union2(
  Sphere(),
  Box(),
  Capsule(),
  Octahedron() 
)
```

# Geometries 

These are the core geometric primitives available in marching.js. Most constructors for primitives begin with properties that are unique to each geometry, and then end with optional `center` and `material` properties. 

Box
----

#### Constructor/Properties ####
**size** &nbsp; *[Vec3](#other-vec3)* &nbsp; The size of the box on the x,y, and z axes. Defaults to 1,1,1 (cube).  
**center** &nbsp; *[Vec3](#other-vec3)* &nbsp; The center position of the geometry. Defaults to 0,0,0.  
**material** &nbsp; *[Material](#other-material)* &nbsp; The material used to render the object.  


Capsule
----

#### Constructor/Properties ####
**start** &nbsp; *[Vec3](#other-vec3)* &nbsp; The starting coordinates (x,y,z) of the capsule. 
**end** &nbsp; *[Vec3](#other-vec3)* &nbsp; The ending coordinates (x,y,z) of the capsule 
**radius** &nbsp; *float* &nbsp; The radius of the capsule. 
**center** &nbsp; *[Vec3](#other-vec3)* &nbsp; The center position of the geometry. Defaults to 0,0,0.  
**material** &nbsp; *[Material](#other-material)* &nbsp; The material used to render the geometry.  

Cone
----

#### Constructor/Properties ####
**dimensions** &nbsp; *[Vec3](#other-vec3)* &nbsp; Dimensions of the cone.
**center** &nbsp; *[Vec3](#other-vec3)* &nbsp; The center position of the geometry. Defaults to 0,0,0.  
**material** &nbsp; *[Material](#other-material)* &nbsp; The material used to render the geometry.  

Cylinder
----

#### Constructor/Properties ####
**dimensions** &nbsp; *[Vec2](#other-vec2)* &nbsp; Dimensions of the cylinder (radius, length).
**center** &nbsp; *[Vec3](#other-vec3)* &nbsp; The center position of the geometry. Defaults to 0,0,0.  
**material** &nbsp; *[Material](#other-material)* &nbsp; The material used to render the geometry.  

HexPrism
----

#### Constructor/Properties ####
**dimensions** &nbsp; *[Vec2](#other-vec2)* &nbsp; Dimensions of the prism (radius, length).
**center** &nbsp; *[Vec3](#other-vec3)* &nbsp; The center position of the geometry. Defaults to 0,0,0.  
**material** &nbsp; *[Material](#other-material)* &nbsp; The material used to render the geometry.  

Octahedron
----

#### Constructor/Properties ####
**size** &nbsp; *float* &nbsp; The size of the octahedron (think spherical radius).
**center** &nbsp; *[Vec3](#other-vec3)* &nbsp; The center position of the geoemtry. Defaults to 0,0,0.  
**material** &nbsp; *[Material](#other-material)* &nbsp; The material used to render the object.  

Plane
----

A flat plane that extends infinitely perpendicular to its normal.

#### Constructor/Properties ####
**normal** &nbsp; *[Vec3](#other-vec3)* &nbsp; The angle, along all three axes, that the plane faces. 
**distance** &nbsp; *float* &nbsp; Distance from the origin along the normal axis. 
**material** &nbsp; *[Material](#other-material)* &nbsp; The material used to render the object.  

Quad
----

A four-sided shape, with vertices determined by giving on offset from the center position of the geometry.

#### Constructor/Properties ####
**v1** &nbsp; *[Vec3](#other-vec3)* &nbsp; A vertex defining one corner of the quad.  
**v2** &nbsp; *[Vec3](#other-vec3)* &nbsp; A vertex defining one corner of the quad.  
**v3** &nbsp; *[Vec3](#other-vec3)* &nbsp; A vertex defining one corner of the quad.  
**v4** &nbsp; *[Vec3](#other-vec3)* &nbsp; A vertex defining one corner of the quad.   
**center** &nbsp; *[Vec3](#other-vec3)* &nbsp; The center position of the geoemtry. Defaults to 0,0,0.  
**material** &nbsp; *[Material](#other-material)* &nbsp; The material used to render the object.  

RoundBox
----

A box with rounded corners.

#### Constructor/Properties ####
**size** &nbsp; *[Vec3](#other-vec3)* &nbsp; The size of the box on the x,y, and z axes. Defaults to 1,1,1 (cube).  
**radius** &nbsp; *float* &nbsp; The amount of rounding applied to the corners of the box. 
**center** &nbsp; *[Vec3](#other-vec3)* &nbsp; The center position of the geoemtry. Defaults to 0,0,0.  
**material** &nbsp; *[Material](#other-material)* &nbsp; The material used to render the object.  

Sphere
----

#### Constructor/Properties ####
**radius** &nbsp; *float* &nbsp; The radius of the sphere. 
**center** &nbsp; *[Vec3](#other-vec3)* &nbsp; The center position of the geometry. Defaults to 0,0,0.  
**material** &nbsp; *[Material](#other-material)* &nbsp; The material used to render the object.  

Torus
----

By default, this geometry lies flat along the z-plane; you need to rotate it with a [Rotation](#domain-operations-rotation) to see the ring, or move the camera position on the y-axis.

#### Constructor/Properties ####
**radii** &nbsp; *[Vec2](#other-vec2)* &nbsp; Assuming the geometry is not rotated, the first radius determines the radius on the z-plane. The second radius determines the tubular radis on the y-axis. 
**center** &nbsp; *[Vec3](#other-vec3)* &nbsp; The center position of the geoemtry. Defaults to 0,0,0.  
**material** &nbsp; *[Material](#other-material)* &nbsp; The material used to render the object.  

Torus88
----

A "squared" torus that is not tubular; the second member of the `radii` property effectively determines height. By default, this geometry lies flat along the z-plane; you need to rotate it with a [Rotation](#domain-operations-rotation) to see the ring, or move the camera position on the y-axis.

#### Constructor/Properties ####
**radii** &nbsp; *[Vec2](#other-vec2)* &nbsp; Assuming the geometry is not rotated, the first radius determines the radius on the z-plane. The second radius determines the height on the y-axis. 
**center** &nbsp; *[Vec3](#other-vec3)* &nbsp; The center position of the geoemtry. Defaults to 0,0,0.  
**material** &nbsp; *[Material](#other-material)* &nbsp; The material used to render the object. 

Torus82
----

A circular torus that is not tubular; the second member of the `radii` property effectively determines height. By default, this geometry lies flat along the z-plane; you need to rotate it with a [Rotation](#domain-operations-rotation) to see the ring, or move the camera position on the y-axis.

#### Constructor/Properties ####
**radii** &nbsp; *[Vec2](#other-vec2)* &nbsp; Assuming the geometry is not rotated, the first radius determines the radius on the z-plane. The second radius determines the height on the y-axis. 
**center** &nbsp; *[Vec3](#other-vec3)* &nbsp; The center position of the geoemtry. Defaults to 0,0,0.  
**material** &nbsp; *[Material](#other-material)* &nbsp; The material used to render the object. 

Triangle
----

A three-sided shape, with vertices determined by giving on offset from the center position of the geometry.

#### Constructor/Properties ####
**v1** &nbsp; *[Vec3](#other-vec3)* &nbsp; A vertex defining one corner of the triangle.  
**v2** &nbsp; *[Vec3](#other-vec3)* &nbsp; A vertex defining one corner of the triangle.  
**v3** &nbsp; *[Vec3](#other-vec3)* &nbsp; A vertex defining one corner of the triangle.  
**center** &nbsp; *[Vec3](#other-vec3)* &nbsp; The center position of the geoemtry. Defaults to 0,0,0.  
**material** &nbsp; *[Material](#other-material)* &nbsp; The material used to render the object.  

TriPrism
----

#### Constructor/Properties ####
**dimensions** &nbsp; *[Vec3](#other-vec3)* &nbsp; The radius and depth of the prism. 
**center** &nbsp; *[Vec3](#other-vec3)* &nbsp; The center position of the geoemtry. Defaults to 0,0,0.  
**material** &nbsp; *[Material](#other-material)* &nbsp; The material used to render the object.  

# Domain Operations 

This library works via ray marching, where a line is drawn from the camera through every pixel in the scene; that line (called a ray) continues through the scene until it hits an object. If an object is hit, the color of the object, after applying lighting, is applied to the pixel that the ray traveled through.

At each step of the ray we use the current position of the ray to determine if any geometries in our scene have been 'hit'. However, by mathmatically altering the position of each step we can change the geometries in a variety of ways: twisting them, repeating them, scaling them, bending them etc. The domain operations found here accept a point in three-dimensional space as an argument and then transform it in various ways to create these types of effects.

Each of these effects is designed to operate on a distance field, which is typically the first argument passed to constructors; this could also be multiple geometries joined by a union operator, for example. Subsequent constructor parameters / properties determine the nature of the effect being applied.

PolarRepeat
----
This operation repeats a distance field in a circle. 

#### Constructor ####
**sdf** &nbsp; *object* &nbsp; A signed distance field to be repeated.
**count** &nbsp; *int* &nbsp; The number of radial repetitions. 
**distance** &nbsp; *float* &nbsp; The spacing between radial repetitions. 

Repeat
----
This operation repeats a distance field infinitely across 3D space at a specified rate.

#### Constructor ####
**sdf** &nbsp; *object* &nbsp; A signed distance field to be repeated.   
**distance** &nbsp; *[Vec3](#other-vec3)* &nbsp; The spacing between repetitions of the sdf along the x,y, and z axes. Passing a value of 0 to any of these vector members means the SDF will not be repeated along that axis. 

Rotation
----
This operation rotates an SDF along a provided axis.

#### Constructor ####
**sdf** &nbsp; *object* &nbsp; A signed distance field to be repeated.   
**axis** &nbsp; *[Vec3](#other-vec3)* &nbsp; The axis for rotation. 
**angle** &nbsp; *float* &nbsp; The angle of rotation, measured in radians.
 
Scale
----
This operation scales a distance field along three axes. 

#### Constructor ####
**sdf** &nbsp; *object* &nbsp; A signed distance field to be repeated.   
**amount** &nbsp; *[Vec3](#other-vec3)* &nbsp; The amount to scale the distance field by on each axis. 

Translate
----
This operation moves the position of a distance field along three axes. 

#### Constructor ####
**sdf** &nbsp; *object* &nbsp; A signed distance field to be repeated.   
**amount** &nbsp; *[Vec3](#other-vec3)* &nbsp; The amount to translate the distance field by on each axis. 

# Distance Deformations 

Deformations are operations that can quite easily create irrgularities in distance fields, leading to visual artifacts. However, if used deliberately and with care they can create a variety of interesting effects.

Bend
----
This operation bends a distance field.

#### Constructor ####
**sdf** &nbsp; *object* &nbsp; A signed distance field to be bent.
**amount** &nbsp; *[Vec2](#other-vec2)* &nbsp; Two coefficients that determine the amount of bending. 

Twist
----
This operation twists a distance field.

#### Constructor ####
**sdf** &nbsp; *object* &nbsp; A signed distance field to be twist.
**amount** &nbsp; *[Vec3](#other-vec3)* &nbsp; Two coefficients that determine the amount of twisting. 

Displace
----
This operation displaces a distance field. This really isn't very useful at the moment.

#### Constructor ####
**sdf** &nbsp; *object* &nbsp; A signed distance field to be displaced.
**amount** &nbsp; *[Vec3](#other-vec3)* &nbsp; Two coefficients that determine the amount of displacing. 

# Other

Vec2
----

**x** &nbsp; *object* &nbsp; Optional, default = 0.  
**y** &nbsp; *object* &nbsp; Optional, default = 0.  

Vec3
----

**x** &nbsp; *object* &nbsp; Optional, default = 0.  
**y** &nbsp; *object* &nbsp; Optional, default = 0.  
**z** &nbsp; *object* &nbsp; Optional, default = 0.  

Material
----
**ambient** &nbsp; *[Vec3](#other-vec3)* &nbsp; The amount of red, green, and blue ambient light reflected by the material.  
**diffuse** &nbsp; *[Vec3](#other-vec3)* &nbsp; The amount of red, green, and blue diffuse light reflected by the material.  
**specular** &nbsp; *[Vec3](#other-vec3)* &nbsp; The amount of red, green, and blue specular light reflected by the material.   
**specularCoefficient** &nbsp; *float* &nbsp; The specular coefficient; higher numbers result in more focused specular reflections.  
**fresnel** &nbsp; *[Vec3](#other-vec3)* &nbsp; Coefficients governing the fresnel effect for the material. The first number is an offset that is added to the final fresnel value, while the second number is a multiplier. The third number is the fresnel power exponent.   

Light
----
**pos** &nbsp; *[Vec3](#other-vec3)* &nbsp; The position of the light in the 3D scene.  
**color** &nbsp; *[Vec3](#other-vec3)* &nbsp; The amount of red, green, and blue light emitted.  
**attenuation** &nbsp; *[Vec3](#other-vec3)* &nbsp; A coefficient determining the attenutation of the light as a geometry gets further away from it.

