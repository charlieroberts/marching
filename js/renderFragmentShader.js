const glsl = require( 'glslify' )

module.exports = function( variables, scene, preface, geometries, lighting, postprocessing, steps=90, minDistance=.001, maxDistance=20, ops ) {
    const fs_source = glsl`     #version 300 es
      precision highp float;

      float PI = 3.141592653589793;

      in vec2 v_uv;

      struct Light {
        vec3 position;
        vec3 color;
        float attenuation;
      };

      int rotationCount = 1;

      mat4 rotations[4] = mat4[4](
        mat4(0.), mat4(0.), mat4(0.), mat4(0.)
      );

      struct Material {
        int  mode;
        vec3 ambient;
        vec3 diffuse;
        vec3 specular;
        float shininess;
        vec3 fresnel;
        int textureID;
      };     

      struct SDF {
        int materialID;
        mat4 transform;
        int textureID;
      };

      struct opOut {
        float x;
        float y;
        mat4  transform;
        vec3  repeat;
      };

      uniform float time;
      uniform vec2 resolution;
      uniform vec3 camera_pos;
      uniform vec3 camera_normal;
      uniform float camera_rot;

      ${variables}

      // must be before geometries!
      float length8( vec2 p ) { 
        return float( pow( pow(p.x,8.)+pow(p.y,8.), 1./8. ) ); 
      }

      ${ops}

      /* GEOMETRIES */
      ${geometries}

      opOut scene(vec3 p);

      
      // Adapted from from https://www.shadertoy.com/view/ldfSWs

      opOut calcRayIntersection( vec3 rayOrigin, vec3 rayDir, float maxd, float precis ) {
        float latest = precis * 2.0;
        float dist   = +0.0;
        float type   = -1.0;
        opOut result;
        opOut res = opOut( -1., -1., mat4(1.), vec3(0.) );

        for (int i = 0; i < ${steps} ; i++) {
          if (latest < precis || dist > maxd) break;

          result = scene(rayOrigin + rayDir * dist );

          latest = result.x;
          type   = result.y;
          dist  += latest;
        }

        if( dist < maxd ) {
          result.x= dist;
          res = result;
        }

        return res;
      }

      opOut calcRayIntersection(vec3 rayOrigin, vec3 rayDir) {
        return calcRayIntersection(rayOrigin, rayDir, 20.0, 0.001);
      }

      // adapted from https://www.shadertoy.com/view/ldfSWs
      vec3 calcNormal(vec3 pos, float eps) {
        const vec3 v1 = vec3( 1.0,-1.0,-1.0);
        const vec3 v2 = vec3(-1.0,-1.0, 1.0);
        const vec3 v3 = vec3(-1.0, 1.0,-1.0);
        const vec3 v4 = vec3( 1.0, 1.0, 1.0);

        return normalize( v1 * scene ( pos + v1*eps ).x+
                          v2 * scene ( pos + v2*eps ).x+
                          v3 * scene ( pos + v3*eps ).x+
                          v4 * scene ( pos + v4*eps ).x);
      }

      vec3 calcNormal(vec3 pos) {
        return calcNormal(pos, 0.002);
      }

      mat3 calcLookAtMatrix(vec3 origin, vec3 target, float roll) {
        vec3 rr = vec3(sin(roll), cos(roll), 0.0);
        vec3 ww = normalize(target - origin);
        vec3 uu = normalize(cross(ww, rr));
        vec3 vv = normalize(cross(uu, ww));

        return mat3(uu, vv, ww);
      }

      vec3 getRay(mat3 camMat, vec2 screenPos, float lensLength) {
        return normalize(camMat * vec3(screenPos, lensLength));
      }

      vec3 getRay(vec3 origin, vec3 target, vec2 screenPos, float lensLength) {
        mat3 camMat = calcLookAtMatrix(origin, target, 0.0);
        return getRay(camMat, screenPos, lensLength);
      }

      vec2 squareFrame(vec2 screenSize) {
        vec2 position = 2.0 * (gl_FragCoord.xy / screenSize.xy) - 1.0;
        position.x *= screenSize.x / screenSize.y;
        return position;
      }

      vec2 squareFrame(vec2 screenSize, vec2 coord) {
        vec2 position = 2.0 * (coord.xy / screenSize.xy) - 1.0;
        position.x *= screenSize.x / screenSize.y;
        return position;
      }

      void orbitCamera(
        in float camAngle,
        in float camHeight,
        in float camDistance,
        in vec2 screenResolution,
        out vec3 rayOrigin,
        out vec3 rayDirection
      ) {
        vec2 screenPos = squareFrame(screenResolution);
        vec3 rayTarget = vec3(0.0);

        rayOrigin = vec3(
          camDistance * sin(camAngle),
          camHeight,
          camDistance * cos(camAngle)
        );

        rayDirection = getRay(rayOrigin, rayTarget, screenPos, 2.0);
      }

      vec4 opElongate( in vec3 p, in vec3 h ) {
        //return vec4( p-clamp(p,-h,h), 0.0 ); // faster, but produces zero in the interior elongated box
        
        vec3 q = abs(p)-h;
        return vec4( max(q,0.0), min(max(q.x,max(q.y,q.z)),0.0) );
      }

      vec3 polarRepeat(vec3 p, float repetitions) {
        float angle = 2.*PI/repetitions;
        float a = atan(p.z, p.x) + angle/2.;
        float r = length(p.xz);
        float c = floor(a/angle);
        a = mod(a,angle) - angle/2.;
        vec3 _p = vec3( cos(a) * r, p.y,  sin(a) * r );
        // For an odd number of repetitions, fix cell index of the cell in -x direction
        // (cell index would be e.g. -5 and 5 in the two halves of the cell):
        if (abs(c) >= (repetitions/2.)) c = abs(c);
        return _p;
      }

      /* ******************************************************* */

      // added k value to glsl-sdf-ops/soft-shadow
      float softshadow( in vec3 ro, in vec3 rd, in float mint, in float tmax, in float k ){
        float res = 1.0;
        float t = mint;

        for( int i = 0; i < 12; i++ ) {
          float h = scene( ro + rd * t ).x;
          res = min( res, k * h / t );
          t += clamp( h, 0.02, 0.10 );
          if( h<0.001 || t>tmax ) break;
        }

        return clamp( res, 0.0, 1.0 );
      }

${lighting}

      opOut scene(vec3 _p ) {
        vec4 p = vec4( _p, 1. );
${preface}
        return ${scene};
      }
 


      out vec4 col;

      void main() {
        vec2 pos = v_uv * 2.0 - 1.0;
        pos.x *= ( resolution.x / resolution.y );
        vec3 color = bg; 
        vec3 ro = camera_pos;
        vec3 rd = camera_normal;

        orbitCamera( camera_rot, ro.y, ro.z, resolution, ro, rd );
        
        opOut t = calcRayIntersection( ro, rd, ${maxDistance}, ${minDistance} );
 
        if( t.x > -0.5 ) {
          vec3 pos = ro + rd * t.x;
          vec3 nor = calcNormal( pos );

          color = lighting( pos, nor, ro, rd, t.y, t.transform, t.repeat ); 
        }

        ${postprocessing}
        
        col = vec4( color, 1.0 );
      }`

    return fs_source
  }
