module.exports = `
    // p = point on surface, p0 = object center
    vec2 getUVCubic(vec3 p ){
      vec3 absp = abs(p);
        
      // First conditional: If the point is in one of the sextants to the 
      // left or right of the x-axis, the uv cordinate will be (0.5*p.zy)/(p.x).
      // If you trace a line out to a zy plane that is 0.5 units from the zero origin,  
      // (0.5*p.xyz)/(p.x) will be the result, and
      // the yz components will be our uv coordinates, hence (0.5*p.zy)/(p.x).

      vec2 uv = ((absp.x>=absp.y)&&(absp.x>=absp.z)) 
        ? (0.5*p.zy)/(p.x) 
        : ((absp.y>=absp.z)&&(absp.y>=absp.x)) ? (0.5*p.xz)/(p.y) : (-0.5*p.xy)/(p.z);

      //We still need to determine which side our uv cordinates are on so
      //that the texture orients the right way. Note that there's some 
      // redundancy there, which I'll fix at some stage. For now, it works, so I'm not touching it. :)
      if( ((p.x<0.)&&(absp.x>=absp.y)&&(absp.x>=absp.z)) 
       || ((p.y<0.)&&(absp.y>=absp.z)&&(absp.y>=absp.x)) 
       || ((p.z>0.)&&(absp.z>=absp.x)&&(absp.z>=absp.y)) ) uv.y*=-1.;
             
      // Mapping the uv range from [-0.5, 0.5] to [0.0, 1.0].
      return (uv+0.5);
    }
    `
/*
module.exports = `vec3 t3(sampler2D tex, vec3 p, vec3 n)
{
  mat3 R = mat3(vec3(cos(T),sin(T),0),vec3(-sin(T),cos(T),0),vec3(0,0,-1));
  p *= R/8.0;
  n *= R;
  #ifdef Smooth
  return  (texture(tex,p.xy).rgb*n.z*n.z
    +texture(tex,p.zy).rgb*n.x*n.x
    +texture(tex,p.xz).rgb*n.y*n.y);
  #else
    return (texture(tex,p.xy).rgb
      +texture(tex,p.zy).rgb
      +texture(tex,p.xz).rgb)/3.0;
    #endif
    }`
    */
