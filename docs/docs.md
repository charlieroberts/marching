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

**quality** &nbsp; *int* &nbsp; Default = 10. This value determines many aspects of how the scene renders, including the maximum number of steps for each ray, the maximum length each ray will travel, and the resolution of the final image in full scene renders. Lower values are useful for scenes that will be animated, while higher values are useful for screenshots and experimentation. 

### scene.shadow ###
Adds shadows to the scene.

**diffuseness** &nbsp; *int* &nbsp; Default = 8. A term used as an exponent to determine the diffuseness of shadows that are used. Higher numbers result in harder shadows. Providing a value of `0` when `Marching.lighting.mode='directional'` will remove shadows from the scene, which can be useful in scenarios where shadows would do not properly render due to errors in signed distance functions. 

# Prototypes

Operation
----
All volumes, combinators, and domain modifiers use the `Operation` prototype, which provides the ability to transform each operation in various ways.

#### Methods ####

### translate ###
Move the operation on each axis.

**x** &nbsp; *float* &nbsp; Movement on the x-axis.  
**y** &nbsp; *float* &nbsp; Movement on the y-axis.  
**z** &nbsp; *float* &nbsp; Movement on the z-axis.  

### rotate ###
Rotate the operation along a defined axis.

**angle** &nbsp; *float* &nbsp; The rotation angle in degrees.  
**x** &nbsp; *float* &nbsp; The x-axis for the rotation angle.  
**y** &nbsp; *float* &nbsp; The y-axis for the rotation angle.  
**z** &nbsp; *float* &nbsp; The z-axis for the rotation angle.  

### scale ###
Scale the operation. Because non-uniform scaling can cause irregularities in some signed distance functions, a single value controls uniform scaling on all three axes.

**amount** &nbsp; *float* &nbsp; A scale to assign to the operation.

Volume
----

*prototype*: [Operation](#prototypes-operation)

Volumes are the rendered, 3D geometries used in marching.js. They inherit tranlate, rotate, and scale methods from the Operation prototype, and add two additional methods controling texture and material.

### material ###
Assign a material to the volume.

**material** &nbsp; *Material* or *presetName* &nbsp; The `Material` object to assign to the volume, controlling how its surface interacts with light. If you pass a string to this method marching.js will assume it's the name of a material preset to apply.

### texture ###
Assign a [Texture](#other-texture) to the volume.

**texture** &nbsp; *textureName* &nbsp; This argument determines which procedural texture is assigned to the volume.  
**properties** &nbsp; *object* &nbsp; This set of key value pairs can be used to initialize texture properties. 

# Geometries 


These are the core geometric primitives available in marching.js, and the starting points for creating the signed distance functions used for rendering by marching.js. Most constructors for primitives begin with properties that are unique to each geometry, and then end with optional `center` and `material` properties. 

Box
----

*prototype*: [Volume](#prototypes-volume)

#### Constructor/Properties ####
**size** &nbsp; *[Vec3](#other-vec3)* &nbsp; The size of the box on the x,y, and z axes. Defaults to 1,1,1 (cube).  


Capsule
----

*prototype*: [Volume](#prototypes-volume)

#### Constructor/Properties ####
**start** &nbsp; *[Vec3](#other-vec3)* &nbsp; The starting coordinates (x,y,z) of the capsule.  
**end** &nbsp; *[Vec3](#other-vec3)* &nbsp; The ending coordinates (x,y,z) of the capsule.  
**radius** &nbsp; *float* &nbsp; The radius of the capsule.  

Cone
----

*prototype*: [Volume](#prototypes-volume)

#### Constructor/Properties ####
**dimensions** &nbsp; *[Vec3](#other-vec3)* &nbsp; Dimensions of the cone.   

Cylinder
----

*prototype*: [Volume](#prototypes-volume)

#### Constructor/Properties ####
**dimensions** &nbsp; *[Vec2](#other-vec2)* &nbsp; Dimensions of the cylinder (radius, length). 

HexPrism
----

*prototype*: [Volume](#prototypes-volume)

#### Constructor/Properties ####
**dimensions** &nbsp; *[Vec2](#other-vec2)* &nbsp; Dimensions of the prism (radius, length). 

Julia
----

*prototype*: [Volume](#prototypes-volume)

A three-dimensional rendering of the Julia set of a quaternion function.

#### Constructor/Properties ####
**fold** &nbsp; *float* &nbsp; A coefficient for the equation. 

Mandelbulb
----

*prototype*: [Volume](#prototypes-volume)

#### Constructor/Properties ####
**fold** &nbsp; *float* &nbsp; A coefficient that affects variouus exponents in the Mandulbulb equation. Higher values yield the appearance of greater recursion / complexity.
 
Mandelbox
----

*prototype*: [Volume](#prototypes-volume)

#### Constructor/Properties ####
**fold** &nbsp; *float* &nbsp; A coefficient that controls the amount of spherical folding in the mandelbox.  
**size** &nbsp; *float* &nbsp; A coefficient that controls the scaling in the mandelbox equation. Note that this is different from `.scale()` which controls the overall size of the mandelbox. 
**iterations** &nbsp; *float* &nbsp; default 5. The number of times the mandelbox equation is run per frame. This number greatly influences the complexity of the final output, but higher values are computationally expensive. 

Octahedron
----

*prototype*: [Volume](#prototypes-volume)

#### Constructor/Properties ####
**size** &nbsp; *float* &nbsp; The size of the octahedron (think spherical radius). 

Plane
----

*prototype*: [Volume](#prototypes-volume)

A flat plane that extends infinitely perpendicular to its normal.

#### Constructor/Properties ####
**normal** &nbsp; *[Vec3](#other-vec3)* &nbsp; The angle, along all three axes, that the plane faces.   
**distance** &nbsp; *float* &nbsp; Distance from the origin along the normal axis.  

Quad
----

*prototype*: [Volume](#prototypes-volume)

A four-sided shape, with vertices determined by giving on offset from the center position of the geometry.

#### Constructor/Properties ####
**v1** &nbsp; *[Vec3](#other-vec3)* &nbsp; A vertex defining one corner of the quad.  
**v2** &nbsp; *[Vec3](#other-vec3)* &nbsp; A vertex defining one corner of the quad.  
**v3** &nbsp; *[Vec3](#other-vec3)* &nbsp; A vertex defining one corner of the quad.  
**v4** &nbsp; *[Vec3](#other-vec3)* &nbsp; A vertex defining one corner of the quad.   

RoundBox
----

*prototype*: [Volume](#prototypes-volume)

A box with rounded corners.

#### Constructor/Properties ####
**size** &nbsp; *[Vec3](#other-vec3)* &nbsp; The size of the box on the x,y, and z axes. Defaults to 1,1,1 (cube).  
**radius** &nbsp; *float* &nbsp; The amount of rounding applied to the corners of the box.  

Sphere
----

*prototype*: [Volume](#prototypes-volume)

#### Constructor/Properties ####
**radius** &nbsp; *float* &nbsp; The radius of the sphere.  

Torus
----

*prototype*: [Volume](#prototypes-volume)

By default, this geometry lies flat along the z-plane; you need to rotate it with a [Rotation](#domain-operations-rotation) to see the ring, or move the camera position on the y-axis.

#### Constructor/Properties ####
**radii** &nbsp; *[Vec2](#other-vec2)* &nbsp; Assuming the geometry is not rotated, the first radius determines the radius on the z-plane. The second radius determines the tubular radis on the y-axis.   

Torus88
----

*prototype*: [Volume](#prototypes-volume)

A "squared" torus that is not tubular; the second member of the `radii` property effectively determines height. By default, this geometry lies flat along the z-plane; you need to rotate it with a [Rotation](#domain-operations-rotation) to see the ring, or move the camera position on the y-axis.

#### Constructor/Properties ####
**radii** &nbsp; *[Vec2](#other-vec2)* &nbsp; Assuming the geometry is not rotated, the first radius determines the radius on the z-plane. The second radius determines the height on the y-axis.   

Torus82
----

*prototype*: [Volume](#prototypes-volume)

A circular torus that is not tubular; the second member of the `radii` property effectively determines height. By default, this geometry lies flat along the z-plane; you need to rotate it with a [Rotation](#domain-operations-rotation) to see the ring, or move the camera position on the y-axis.

#### Constructor/Properties ####
**radii** &nbsp; *[Vec2](#other-vec2)* &nbsp; Assuming the geometry is not rotated, the first radius determines the radius on the z-plane. The second radius determines the height on the y-axis.   

Triangle
----

*prototype*: [Volume](#prototypes-volume)

A three-sided shape, with vertices determined by giving on offset from the center position of the geometry.

#### Constructor/Properties ####
**v1** &nbsp; *[Vec3](#other-vec3)* &nbsp; A vertex defining one corner of the triangle.  
**v2** &nbsp; *[Vec3](#other-vec3)* &nbsp; A vertex defining one corner of the triangle.  
**v3** &nbsp; *[Vec3](#other-vec3)* &nbsp; A vertex defining one corner of the triangle.  

TriPrism
----

*prototype*: [Volume](#prototypes-volume)

#### Constructor/Properties ####
**dimensions** &nbsp; *[Vec3](#other-vec3)* &nbsp; The radius and depth of the prism.   

# Combinators 

Combinators are used to combine multiple signed distance fields together to create a new SDF. The simplest example is the [Union](#combinators-union), which combines two SDFs together with hard edges; there are a variety of additional options that combine distance fields in more interesting and unique ways. Other important operations include various flavors of [Difference](#combinators-difference) (removing one geometry from another) and [Intersection](#combinators-intersection) (calculating the shared space occupied by two objects).

ChamferDifference
----

*prototype*: [Operation](#prototypes-operation)

This combinator creates a rounded, yet discretely identifiable, border at the point where one geometry is subtracted from another..  

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.   
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**size** &nbsp; *float* &nbsp; Default = .8; The size of the rounded border to be generated between the objects.

ChamferIntersection
----

*prototype*: [Operation](#prototypes-operation)

This combinator creates a rounded, yet discretely identifiable, border around the shared surfaces of two SDFs. 

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.   
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**size** &nbsp; *float* &nbsp; Default = .8; The size of the rounded border to be generated between the objects.

ChamferUnion
----

*prototype*: [Operation](#prototypes-operation)

This combinator creates a rounded, yet discretely identifiable, border at the intersection between two SDFs.  

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.   
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**size** &nbsp; *float* &nbsp; Default = .8; The size of the rounded border to be generated between the objects. 

Difference
----

*prototype*: [Operation](#prototypes-operation)

This combinator subtracts one signed distance field from the other and returns the result. 

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined. 

Engrave
----

*prototype*: [Operation](#prototypes-operation)

This takes the intersection of two SDFs and includes a lowered, angled, border between them.

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**angle** &nbsp; *float* &nbsp; The depth of the angled border. 

Groove
----

*prototype*: [Operation](#prototypes-operation)

This takes the intersection of two SDFs and includes a lowered, non-angled, border between them.

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**angle** &nbsp; *float* &nbsp; The depth of the border. 

Intersection
----

*prototype*: [Operation](#prototypes-operation)

This combinator creates a SDF containing the shared area of two SDF inputs. 

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.   
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  

Pipe
----

*prototype*: [Operation](#prototypes-operation)

This takes the intersection of two SDFs and *only* includes the border in the form of a cylindrical pipe. 

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**angle** &nbsp; *float* &nbsp; The depth of the pipe.

RoundDifference
----

*prototype*: [Operation](#prototypes-operation)

This combinator creates a smoothly rounded border where one geometry is subtracted from another.  

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.   
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**size** &nbsp; *float* &nbsp; Default = .3; The amount of the rounded border to be generated between the objects.

RoundIntersection
----

*prototype*: [Operation](#prototypes-operation)

This combinator creates a smoothly rounded border around the intersection of two sdfs. 

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.   
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**size** &nbsp; *float* &nbsp; Default = .3; The size of the rounded border to be generated between the objects.

RoundUnion
----

*prototype*: [Operation](#prototypes-operation)

This combinator creates a smoothly rounded border at the intersection between two SDFs. It is similar to [SmoothUnion](#distance-operations-smoothunion) but generates results that are more optimal mathematically in many situations.

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.   
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**size** &nbsp; *float* &nbsp; Default = .3; The amount of smoothing to be generated between the objects.

Switch
----

*prototype*: [Operation](#prototypes-operation)

This combinator alternates between two SDFs based on the value of its `c` property. When `c` is below .5, the first SDF is displayed, when above, the second one is displayed. One nice effect is to assign FFT analysis results to the `c` property, so that when the audio exceeds a certain threshold a different geometry is displayed.

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.   
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**size** &nbsp; *float* &nbsp; Default = .3; The amount of smoothing to be generated between the objects.

```js
// from the audio input / fft tutorial
// super-simple Switch example
march(
  s = Switch(
    Sphere(),
    Box()
  )
).render( 3, true )
 
// the threshold property is unhelpfully
// named 'c' for now...
onframe = t => s.c = t/2 % 1  
```

SmoothUnion
---

*prototype*: [Operation](#prototypes-operation)

This combinator creates a smoothly transition between two SDFs. 

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

*prototype*: [Operation](#prototypes-operation)

This combinator creates a smoothly transition between an unlimited number of SDFs. The last parameter passed to the constructor will determine the amount of smoothing used.

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

*prototype*: [Operation](#prototypes-operation)

This combinator creates a smoothly rounded border where one geometry is subtracted from another.  

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.   
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**radius** &nbsp; *float* &nbsp; Default = .3; The radius of the stepped border to be generated between the objects. 
**number** &nbsp; *float* &nbsp; Default = 4; The number of steps along the border to be generated 

StairsIntersection
----

*prototype*: [Operation](#prototypes-operation)

This combinator creates a smoothly rounded border around the intersection of two sdfs. 

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.   
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**size** &nbsp; *float* &nbsp; Default = .3; The size of the rounded border to be generated between the objects. 

StairsUnion
----

*prototype*: [Operation](#prototypes-operation)

This combinator creates a smoothly rounded border at the intersection between two SDFs. It is similar to [SmoothUnion](#distance-operations-smoothunion) but generates results that are more optimal mathematically in many situations.

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.   
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**size** &nbsp; *float* &nbsp; Default = .3; The amount of smoothing to be generated between the objects. 

Tongue
----

*prototype*: [Operation](#prototypes-operation)

This takes the intersection of two SDFs and includes a raised, non-angled, border between them.

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**angle** &nbsp; *float* &nbsp; The depth of the border. 

Union
----

*prototype*: [Operation](#prototypes-operation)

This combinator combines two signed distance functions using hard edges. 

#### Constructor ####
**sdf1** &nbsp; *object* &nbsp; A signed distance field to be combined.  
**sdf2** &nbsp; *object* &nbsp; A signed distance field to be combined.  

Union2
----

*prototype*: [Operation](#prototypes-operation)

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

# Positioning

This library works via ray marching, where a line is drawn from the camera through every pixel in the scene; that line (called a ray) continues through the scene until it hits an object. If an object is hit, the color of the object, after applying lighting, is applied to the pixel that the ray traveled through.

At each step of the ray we use the current position of the ray to determine if any geometries in our scene have been 'hit'. However, by mathmatically altering the position of each step we can change the geometries in a variety of ways: twisting them, repeating them, scaling them, bending them etc. The domain operations found here accept a point in three-dimensional space as an argument and then transform it in various ways to create these types of effects.

Each of these effects is designed to operate on a distance field, which is typically the first argument passed to constructors; this could also be multiple geometries joined by a union operator, for example. Subsequent constructor parameters / properties determine the nature of the effect being applied.

Bump
----
This operation moves a distance field by an amount determined by sampling a texture (commonly known as bump mapping).

#### Constructor ####
**sdf** &nbsp; *object* &nbsp; A signed distance field to be displaced.  
**texture** &nbsp; *[Texture](#other-texture)* &nbsp; A texture that is sampled to determine the amount of displacement. 
**size** &nbsp; *float* &nbsp; A scalar to adjust the strength of the bump effect. Negative values will flip the direction of the bumps. 

PolarRepeat
----

*prototype*: [Operation](#prototypes-operation)

This operation repeats a distance field in a circle. 

#### Constructor ####
**sdf** &nbsp; *object* &nbsp; A signed distance field to be repeated.  
**count** &nbsp; *int* &nbsp; The number of radial repetitions.  
**distance** &nbsp; *float* &nbsp; The spacing between radial repetitions.  

Repeat
----

*prototype*: [Operation](#prototypes-operation)

This operation repeats a distance field infinitely across 3D space at a specified rate.

#### Constructor ####
**sdf** &nbsp; *object* &nbsp; A signed distance field to be repeated.   
**distance** &nbsp; *[Vec3](#other-vec3)* &nbsp; The spacing between repetitions of the sdf along the x,y, and z axes. Passing a value of 0 to any of these vector members means the SDF will not be repeated along that axis.  

Rotation
----
This operation rotates an SDF along a provided axis. \*\***Deprecated**\*\*, instead use the `.rotate` method of the [Operator](#prototypes-operator) protoype to rotate operations.

#### Constructor ####
**sdf** &nbsp; *object* &nbsp; A signed distance field to be repeated.   
**axis** &nbsp; *[Vec3](#other-vec3)* &nbsp; The axis for rotation.  
**angle** &nbsp; *float* &nbsp; The angle of rotation, measured in radians.  
 
Scale
----
This operation scales a distance field along three axes. \*\***Deprecated**\*\*, instead use the `.rotate` method of the [Operator](#prototypes-operator) protoype to scale operations.

#### Constructor ####
**sdf** &nbsp; *object* &nbsp; A signed distance field to be repeated.   
**amount** &nbsp; *[Vec3](#other-vec3)* &nbsp; The amount to scale the distance field by on each axis. 

Translate
----
This operation moves the position of a distance field along three axes. \*\***Deprecated**\*\*, instead use the `.rotate` method of the [Operator](#prototypes-operator) protoype to translate operations.

#### Constructor ####
**sdf** &nbsp; *object* &nbsp; A signed distance field to be repeated.   
**amount** &nbsp; *[Vec3](#other-vec3)* &nbsp; The amount to translate the distance field by on each axis. 

Bend
----

*prototype*: [Operation](#prototypes-operation)

This operation bends a distance field.

#### Constructor ####
**sdf** &nbsp; *object* &nbsp; A signed distance field to be bent.  
**amount** &nbsp; *[Vec2](#other-vec2)* &nbsp; Two coefficients that determine the amount of bending. 

Twist
----

*prototype*: [Operation](#prototypes-operation)

This operation twists a distance field.

#### Constructor ####
**sdf** &nbsp; *object* &nbsp; A signed distance field to be twist.   
**amount** &nbsp; *[Vec3](#other-vec3)* &nbsp; Two coefficients that determine the amount of twisting. 

# Displacement / Deformation

The positioning operations work by changing the location of points that we feed into signed distance functions. Alternatively, we can say that positioning operations modify *inputs* to our signed distance functions. In contrast, displacement operations work by modifying *outputs*, and can quite easily create irrgularities in distance fields, leading to visual artifacts. However, if used deliberately and with care they can create a variety of interesting effects.

Displace
----
This operation displaces a distance field using sine and cosine operations. This really isn't very useful at the moment.

#### Constructor ####
**sdf** &nbsp; *object* &nbsp; A signed distance field to be displaced.  
**amount** &nbsp; *[Vec2](#other-vec2)* &nbsp; Two coefficients that determine the amount of displacing. 

Halve
----
This operation cuts a distance field in half. Because the operation is applied *after* the SDF is calculated, manipulating the results further (such as with rotation or translation) will often create significant artifacts.

#### Constructor ####
**sdf** &nbsp; *object* &nbsp; A signed distance field to be displaced.  
**direction** &nbsp; *int* &nbsp; An integer indicating how to 'cut' the object in halve. The following values can be used:   
Halve.UP (0): Cut off the upper half of the SDF.   
Halve.DOWN (1): Cut off the lower half of the SDF.   
Halve.LEFT (2): Cut off the left half of the SDF.   
Halve.RIGHT (3): Cut off the right half of the SDF.    

Mirror
----
This operation mirrors a distance field around the world's origin. Mirroring centered objects will create any effect, however, mirroring objects that are translated and rotated will create duplicates of the object along each axis where translation occurs. Mirroring is one of the "funnest" transformations in marching.js and should definitely be explored. [See this demo for an example of using Mirror procedurally](https://gist.github.com/charlieroberts/5518b0f99af48c27bdc015502a89137c). 

#### Constructor ####
**sdf** &nbsp; *object* &nbsp; A signed distance field to be mirrored. 

#### Example ####
```js
march(
  m = Mirror(
    Mirror(
      Mirror(
        Box().scale(.275).translate(.5,.25,.35)
      ).rotate(45,1,.5,.25).translate(.5,.5,.5)
    ).rotate(45,.25,.5,1).translate(.25,.25,.25)
  )
).render('med')

onframe = t => m.rotate(t*20,1,1,1)
```

Onion
----
This operation 'hollows out' a signed distance fields, letting you choose the width of the outer wall. Note that you'll need to view the inside of the SDF (either by moving the camera inside of it or by cutting the SDF in half using Halve) in order to see the effects.

#### Constructor ####
**sdf** &nbsp; *object* &nbsp; A signed distance field to be displaced.   
**thickness** &nbsp; *float* &nbsp; Default:.1. An amount to subtract from the computed signed distance field.

#### Example ####
```js
march(
  Halve(
    Onion(
      Onion(
        Onion(
          Sphere().material('normal'),
          .1
        ),
        .05
      ),
      .025
    ),
    Halve.UP
  )
)
.render()
.camera( 0,.75,3 )
```

Round
----
This operation subtracts a fixed amount from a computer signed distance fields, which has the effect of rounding corners.

#### Constructor ####
**sdf** &nbsp; *object* &nbsp; A signed distance field to be displaced.   
**amount** &nbsp; *float* &nbsp; Default:.1. An amount to subtract from the computed signed distance field.

# Post-Processing Effects
Post-processing effects operate on the entire frame of video that the ray marcher outputs. In some cases effects use additional information, like the depth that was sampled from each pixel, in others they operate based on color alone. All post-processing effects are added using the `.post()` method of the scene.

#### Example ####
In the example below, the specular highlights in the scene receive the glow effect because they are above the threshold brightness level of .5.

```js
march(
  Sphere()
)
.post(
  Bloom(.5,4)
)
.render('med')
```

Bloom
----
The Bloom effect creates blurred glow effects in areas of the scene that are brighter than a specific *threshold* property.

#### Constructor ####
**threshold** &nbsp; *float* &nbsp; Default:0. Pixels with a brightness value above the threshold property will be spread their brightness to adjacent pixels, creating a glow effect. 
**amount** &nbsp; *float* &nbsp; Default:.01. The amount to boost the brightness of pixels that this effect operates on. High values (above 2) will result in blurred offsets that create duplicate images. 

Blur
----
The Blur effect... blurs the final image on both axes. This operation can be repeated multiple times via the `.repetitions` argument to the constructor, and the number of samples used in the blur can also be increased in the constructor. Increasing these values will create a higher quality blur at an increased computational expense. The blur can cheaply be expanded by simply using the `.amount` property, which can be freely modified at runtime.

#### Constructor ####
**amount** &nbsp; *float* &nbsp; Default:.3. The strength of the blur effect. 
**repetitions** &nbsp; *float* &nbsp; Default: 2. How many times to apply the blur effect. This property can *only be set in the constructor; it is not runtime editable.* 
**taps** &nbsp; *float* &nbsp; Default: 5. The number of neighboring pixels that are sampled to genereate the blur. The available options are 5,9, and 13. This property can *only be set in the constructor; it is not runtime editable.* 

#### Example ####
```js
// high-quality blur
march( Sphere() )
  .post( Blur(5,10,13) )
  .render()

// comparable blur amount but lower quality
march( Sphere() )
  .post( Blur(15,3,5) )
  .render()
```

Brightness
----
The `Brightness` effect increases/decreases the overall brightness of the scene based on the `.amount` property.

#### Constructor ####
**amount** &nbsp; *float* &nbsp; Default:.25. Values above 0 increase the original brightness of the scene, values below 0 decrease it. 

Contrast
----
The `Contrast` effect increases/decreases the overall contrast of the scene based on the `.amount` property.

#### Constructor ####
**amount** &nbsp; *float* &nbsp; Default:.5. Values below 1 decrease the original contrast of the scene.

Edge
----
The `Edge` effect finds the edges of images using the [sobel operator](https://en.wikipedia.org/wiki/Sobel_operator), potentially resulting in a stylized, cartoonish effect result.

#### Constructor ####
The constructor for `Edge` takes no arguments, and there are no properties available for modification.

Focus
----
`Focus` is used to create a depth-of-field effect, where parts of the image that are currently in focus (according to the value of the `.depth` property) will appear crisp, while the rest of the image is blurred. 

#### Constructor ####
**depth** &nbsp; *float* &nbsp; Default:0. Given a value of 0, objects far from the camera will be blurred. Given a value of 1, objects close to the camera will be blurred.
**radius** &nbsp; *float* &nbsp; Default:.01. How much of the image is in focus. Larger areas will result in mmore of the image being crisp at the specified depth level.

```js
// the front of the image shold be in focus, according to
// the depth of .15, while the back should be blurred
march( Julia( 3 ).scale( 2.5 ) )
  .post( Focus( .15,.001 ) )
  .render( 4 )
```

Godrays
----
`Godrays` uses depth information about objects to create the effect of light shining through holes in a scene.  

#### Constructor ####
**decay** &nbsp; *float* &nbsp; Default:1. How fast the light fades. Values higher than `1` will create a feedback that can quickly overwhelm a scene. 
**weight** &nbsp; *float* &nbsp; Default:.01. Multiplies the original background colors (XXX clarify this). 
**density** &nbsp; *float* &nbsp; Default:1. How close samples are together.
**threshold** &nbsp; *float* &nbsp; Default:.9. At what depth do rays begin. 

```js
march(
  ri = RoundIntersection(
    s = Sphere(2).material('red'),
    r = Repeat(
      Box().scale(.1).material('red'),
      .5
    )
  )
)
.post(
  g = Godrays( 1, .02 )
)
.render('high')

onframe = t => {
  ri.rotate( t*15,1,.5,.25 )
}
```
Hue
----
The `Hue` effect shifts the hue of objects below a provided depth threshold. Using the default threshold value of .99 the scene will be inverted while the background retains its original color. With a threshold value of 1 the background color will also be changed.

#### Constructor ####
**shift** &nbsp; *float* &nbsp; Default:`.5`. The amount to shift the hue in the HSV color space.   
**threshold** &nbsp; *float* &nbsp; Default:`.99`. Object fragments with a depth below this number (where depth is normalized to be between 0–1) will have their color inverted, other parts of the scene will be unaffected. 

#### Example ####
```js
march(
  Sphere()
)
.post( h = Hue() )
.render('med')

onframe = t => {
  h.shift = t/5
}
```

Invert
----
The `Invert` effect inverts the color of objects below a provided depth threshold. Using the default threshold value of .99 (really, any value lower than 1) the scene will be inverted while the background retains its original color. With a threshold value of 1 the background color will also be changed.



#### Constructor ####
**threshold** &nbsp; *float* &nbsp; Default:.99. Object fragments with a depth below this number (where depth is normalized to be between 0–1) will have their color inverted, other parts of the scene will be unaffected. 

MotionBlur
----
The `MotionBlur` effect can be used to create everything from subtle blurring based on movement in the scene (similiar to the blurring created by 'real-life' movement) to trippy feedback fun.

#### Constructor ####
**amount** &nbsp; *float* &nbsp; Default:.7. The amount of feedback used to create the blur effect. Values above `.9` can be quite fun and experimental, while lower values can be used to create realistic blurring around moving objectts.  

# Other
FFT
----
The `FFT` object is a singleton that analyzes an incoming audio stream for the magnitude of frequency content after calling `FFT.start()`. The magnitudes are stored in three averaged bins, `FFT.low`, `FFT.mid`, and `FFT.high`. See the audio input / fft tutorial for more information. 

**low** &nbsp; *float* &nbsp; Read-only, float. The low frequency content of the analyzed audio (up to 150 Hz).  
**mid** &nbsp; *float* &nbsp; Read-only, float. The mid frequency content of the analyzed audio (150--1400 Hz).  
**high** &nbsp; *float* &nbsp; Read-only, float. The high frequency content of the analyzed audio (1400 Hz and higher).  
**windowSize** &nbsp; *int* &nbsp; int, default 4096. The number of samples analyzed each time the FFT runs. This number must be a power of two.  
**start** &nbsp; This method only needs to be called once per page load; calling it additional times will have no affect. The method starts the FFT analysis

Vec2
----

**x** &nbsp; *float* &nbsp; Optional, default = 0.  
**y** &nbsp; *float* &nbsp; Optional, default = 0.  

Vec3
----

**x** &nbsp; *float* &nbsp; Optional, default = 0.  
**y** &nbsp; *float* &nbsp; Optional, default = 0.  
**z** &nbsp; *float* &nbsp; Optional, default = 0.  

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

Texture
----
Textures are typically made by calling the `.texture()` method of a marching.js primitive. However, they can also be created as standalone objects, whichis useful when you want to use the same texture for multiple primitives, or when you want to use it for both texturing and [Bump](#positioning-bump) mapping.


#### Constructor ####
**presetName** &nbsp; *string* &nbsp; The name of a procedural texture to use. Current possibilities include `cellular`, `checkers`, `dots`, `noise`, `truchet`, `stripes`, and `zigzag`; see the "textures catalog" demo to get an idea what these look like. You can also define your own texture presets; there is a tutorial on how to do this in the marching.js playground.   
  
**properties** &nbsp; *object* &nbsp; A set of key/value pairs to intialize texture properties with. These vary according to the texture preset you're using; more documentation on this is forthcoming. 
