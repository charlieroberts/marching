const glsl = require( 'glslify' )

module.exports = function( variables, scene, preface, geometries, lighting, postprocessing, steps=90, minDistance=.001, maxDistance=20 ) {
    const fs_source = glsl`     #version 300 es
      precision highp float;
     
      float PI = 3.141592653589793;
      // Materials should have: color, diffuseColor, specularColor, specularCoefficient, fresnelBias, fresnelPower, fresnelScale

      in vec2 v_uv;

      struct Fresnel {
        float bias;
        float scale;
        float power;
      };

      struct Light {
        vec3 position;
        vec3 color;
        float attenuation;
      };

      struct Material {
        vec3 ambient;
        vec3 diffuse;
        vec3 specular;
        float shininess;
        Fresnel fresnel;
      };     

      uniform float time;
      uniform vec2 resolution;
      uniform float matTexSize;
      uniform sampler2D uMatSampler;
      uniform vec3 camera_pos;
      uniform vec3 camera_normal;

      ${variables}

      // must be before geometries!
      float length8( vec2 p ) { 
        return float( pow( pow(p.x,8.)+pow(p.y,8.), 1./8. ) ); 
      }

      /* GEOMETRIES */
      ${geometries}

      vec2 scene(vec3 p);

      #pragma glslify: raytrace = require( 'glsl-raytrace', map = scene, steps = ${steps} )
      #pragma glslify: getNormal = require( 'glsl-sdf-normal', map = scene )
      #pragma glslify: camera = require( 'glsl-camera-ray' )
      #pragma glslify: smin = require( 'glsl-smooth-min' )

      // OPS
      #pragma glslify: opUnion = require( 'glsl-sdf-ops/union' )


      float opI( float d1, float d2 ) {
        return max(d1,d2);
      }

      vec2 opI( vec2 d1, vec2 d2 ) {
        return ( d1.x > d2.x ) ? d1 : d2; //max(d1,d2);
      }

      /* ******** from http://mercury.sexy/hg_sdf/ ********* */

      float fOpUnionStairs(float a, float b, float r, float n) {
        float s = r/n;
        float u = b-r;
        return min(min(a,b), 0.5 * (u + a + abs ((mod (u - a + s, 2. * s)) - s)));
      }
      vec2 fOpUnionStairs(vec2 a, vec2 b, float r, float n) {
        float s = r/n;
        float u = b.x-r;
        return vec2( min(min(a.x,b.x), 0.5 * (u + a.x + abs ((mod (u - a.x + s, 2. * s)) - s))), a.y );
      }

      // We can just call Union since stairs are symmetric.
      float fOpIntersectionStairs(float a, float b, float r, float n) {
        return -fOpUnionStairs(-a, -b, r, n);
      }

      float fOpSubstractionStairs(float a, float b, float r, float n) {
        return -fOpUnionStairs(-a, b, r, n);
      }

      vec2 fOpIntersectionStairs(vec2 a, vec2 b, float r, float n) {
        return vec2( -fOpUnionStairs(-a.x, -b.x, r, n), a.y );
      }

      vec2 fOpSubstractionStairs(vec2 a, vec2 b, float r, float n) {
        return vec2( -fOpUnionStairs(-a.x, b.x, r, n), a.y );
      }

      float fOpUnionRound(float a, float b, float r) {
        vec2 u = max(vec2(r - a,r - b), vec2(0));
        return max(r, min (a, b)) - length(u);
      }

      float fOpIntersectionRound(float a, float b, float r) {
        vec2 u = max(vec2(r + a,r + b), vec2(0));
        return min(-r, max (a, b)) + length(u);
      }

      float fOpDifferenceRound (float a, float b, float r) {
        return fOpIntersectionRound(a, -b, r);
      }

      vec2 fOpUnionRound( vec2 a, vec2 b, float r ) {
        return vec2( fOpUnionRound( a.x, b.x, r ), a.y );
      }
      vec2 fOpIntersectionRound( vec2 a, vec2 b, float r ) {
        return vec2( fOpIntersectionRound( a.x, b.x, r ), a.y );
      }
      vec2 fOpDifferenceRound( vec2 a, vec2 b, float r ) {
        return vec2( fOpDifferenceRound( a.x, b.x, r ), a.y );
      }

      float fOpUnionChamfer(float a, float b, float r) {
        return min(min(a, b), (a - r + b)*sqrt(0.5));
      }

      float fOpIntersectionChamfer(float a, float b, float r) {
        return max(max(a, b), (a + r + b)*sqrt(0.5));
      }

      float fOpDifferenceChamfer (float a, float b, float r) {
        return fOpIntersectionChamfer(a, -b, r);
      }
      vec2 fOpUnionChamfer( vec2 a, vec2 b, float r ) {
        return vec2( fOpUnionChamfer( a.x, b.x, r ), a.y );
      }
      vec2 fOpIntersectionChamfer( vec2 a, vec2 b, float r ) {
        return vec2( fOpIntersectionChamfer( a.x, b.x, r ), a.y );
      }
      vec2 fOpDifferenceChamfer( vec2 a, vec2 b, float r ) {
        return vec2( fOpDifferenceChamfer( a.x, b.x, r ), a.y );
      }

      float fOpPipe(float a, float b, float r) {
        return length(vec2(a, b)) - r;
      }


      float fOpEngrave(float a, float b, float r) {
        return max(a, (a + r - abs(b))*sqrt(0.5));
      }

      float fOpGroove(float a, float b, float ra, float rb) {
        return max(a, min(a + ra, rb - abs(b)));
      }
      float fOpTongue(float a, float b, float ra, float rb) {
        return min(a, max(a - ra, abs(b) - rb));
      }

      vec2 fOpPipe( vec2 a, vec2 b, float r ) { return vec2( fOpPipe( a.x, b.x, r ), a.y ); }
      vec2 fOpEngrave( vec2 a, vec2 b, float r ) { return vec2( fOpEngrave( a.x, b.x, r ), a.y ); }
      vec2 fOpGroove( vec2 a, vec2 b, float ra, float rb ) { return vec2( fOpGroove( a.x, b.x, ra, rb ), a.y ); }
      vec2 fOpTongue( vec2 a, vec2 b, float ra, float rb ) { return vec2( fOpTongue( a.x, b.x, ra, rb ), a.y ); }

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

        for( int i = 0; i < 16; i++ ) {
          float h = scene( ro + rd * t ).x;
          res = min( res, k * h / t );
          t += clamp( h, 0.02, 0.10 );
          if( h<0.001 || t>tmax ) break;
        }

        return clamp( res, 0.0, 1.0 );
      }

      vec2 smin( vec2 a, vec2 b, float k) {
        float startx = clamp( 0.5 + 0.5 * ( b.x - a.x ) / k, 0.0, 1.0 );
        float hx = mix( b.x, a.x, startx ) - k * startx * ( 1.0 - startx );


        // material blending... i am proud.
        float starty = clamp( (b.x - a.x) / k, 0., 1. );
        float hy = 1. - (a.y + ( b.y - a.y ) * starty); 

        return vec2( hx, hy ); 
      }

      float opS( float d1, float d2 ) { return max(-d1,d2); }
      vec2  opS( vec2 d1, vec2 d2 ) {
        return -d1.x > d2.x ? vec2( -1. * d1.x, d1.y ) : d2;
      }

      float opSmoothUnion( float a, float b, float k) {
        return smin( a, b, k );
      }

      vec2 opSmoothUnion( vec2 a, vec2 b, float k) {
        return smin( a, b, k);
      }

${lighting}

      vec3 colorFromInt( in float _color ) {
        int color = int( _color );
        int r = clamp( color >> 16, 0, 255 );
        int g = clamp( (color & 65280) >> 8, 0, 255 );
        int b = clamp( color & 255, 0, 255 );

        return vec3( float(r)/255., float(g)/255., float(b)/255.);
      }

      vec2 scene(vec3 p) {
${preface}
        return ${scene};
      }

      out vec4 col;

      void main() {
        vec2 pos = v_uv * 2.0 - 1.0;
        pos.x *= ( resolution.x / resolution.y );
        vec3 color = bg; 
        vec3 ro = camera_pos;
        vec3 rd = camera( ro, camera_normal, pos, 2.0 );

        vec2 t = raytrace( ro, rd, ${maxDistance}, ${minDistance} );
        if( t.x > -0.5 ) {
          vec3 pos = ro + rd * t.x;
          vec3 nor = getNormal( pos );

          color = lighting( pos, nor, ro, rd, t.y ); //;* colorFromInt( t.y );
        }

        ${postprocessing}
        

        col = vec4( color, 1.0 );
      }`

    return fs_source
  }
