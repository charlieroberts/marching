module.exports=`/* __--__--__--__--__--__--__--____

Note: this tutorial is only for people
who know GLSL and want to incorporate
their own shader code into marching.js

If you know some GLSL, it's not too
hard to add your own forms to
marching.js. The process consists of:

1. Defining all the interactive
properties of your form.

2. Defining a shader function that
will create your form when the proper
arguments are passed. This function
will only be added to the shader once.

3. Defining a call to your shader
function that passes the correct
arguments; this function call will
be inserted into the shader wherever
an instance of your form is placed
in the scene graph.

** __--__--__--__--__--__--__--__*/

mySphereDesc = {
  // define our points of interaction. the 
  // material properties should always be the
  // the final property in the list; the correct
  // lighting will be applied automatically by
  // marching.js. By convention, the center 
  // property (the location of the object) is
  // always the second to last argument.
  
  // types are float, int, vec2, vec3, and vec4
  parameters:[
    { name:'radius', type:'float', default:1 },
    { name:'center', type:'vec3', default:[0,0,0] },
    { name:'material', type:'mat', default:null }
  ],
 
  // this is the primary signed distance function
  // used by your form.
  glslify:
    \`float mySphere( vec3 p, float r ) {
      return length(p) - r;
    }\`,
  
  // this is a function that will insert a call
  // to distance function whenever your form is
  // placed in a graph. It is passed the name of
  // the point (of type vec3) that is being sampled
  // by the ray marcher. You will usually want to 
  // subtract your center position from this point to
  // create the appropritate offset.
  primitiveString( pName ) { 
    return \`mySphere( \${pName} - \${this.center.emit()}, \${this.radius.emit()} )\`
  }  
}
 
// create and store resulting constructor in a global variable
MySphere = Marching.primitives.create( 'MySphere', mySphereDesc )
 
march( MySphere( .5, null, Material.glue ) ).render()


/* __--__--__--__--__--__--__--____
                                   
OK, let's do something a bit more complex

** __--__--__--__--__--__--__--__*/

kifs2 = {
  parameters:[
    { name:'count', type:'float', default:8 },
    { name:'fold', type:'float', default:0 },
    { name:'radius', type:'float', default:.01 },
    { name:'threshold', type:'float', default:.004 },
    { name:'scale', type:'float', default:2 },
    { name:'center', type:'vec3', default:[0,0,0] },
    { name:'material', type:'mat', default:null }
  ],
 
  primitiveString( pName ) { 
    return \`kifs( \${pName} - \${this.center.emit()}, \${this.count.emit()}, \${this.fold.emit()}, \${this.radius.emit()}, \${this.threshold.emit()}, \${this.scale.emit()} )\`
  },
 
  // adapted from http://roy.red/folding-the-koch-snowflake-.html
  // try adding more folds. or whatever.
  glslify:\`               
  vec2 fold(vec2 p, float ang){    
      vec2 n=vec2(cos(-ang),sin(-ang));
      p-=2.*min(0.,dot(p,n))*n;
      return p;
  }
  #define KPI 3.14159
  vec3 tri_fold(vec3 pt, float foldamt) {
      pt.xy = fold(pt.xy,KPI/3. + foldamt );
      pt.xy = fold(pt.xy,-KPI/3. + foldamt );
      pt.yz = fold(pt.yz,KPI/6.+.7 + foldamt );
      pt.yz = fold(pt.yz,-KPI/6. + foldamt );
      return pt;
  }
  vec3 tri_curve(vec3 pt, float iter, float fold, float scale ) {
      int count = int(iter);
      for(int i=0;i<count;i++){
          pt*=scale;
          pt.x-=4.6;
          pt=tri_fold(pt,fold);
      }
      return pt;
  }
  float kifs(in vec3 p, float a, float fold, float radius, float thresh, float scale ){
      p.x+=1.5;
      p=tri_curve(p,a,fold,scale);
      return (length( p*thresh ) - radius );
  }
\`
}
 
KIFS2 = Marching.primitives.create( 'KIFS2', kifs2 )
 
march( 
  k = KIFS2( 4, 0, .0125, .01, 2, Vec3(-1.15,0,0),  Material.glue ) 
).render( 3, true )
 
onframe = t => {
  k.fold = -.15 + sin(t/2) * .5 
}`

