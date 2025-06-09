module.exports = {
  Union:{
    float:`
      float opU( float d1, float d2 ) {
        return min(d1,d2);
      }
      `,
    vec2:`
      vec2 opU( vec2 d1, vec2 d2 ) {
        vec2 o;

        if( d1.x < d2.x ) {
          o = d1;
        }else{
          o = d2; 
        }

        return o;
      }
      `
  },
  Intersection:{
    float:`
      float opI( float d1, float d2 ) {
        return max(d1,d2);
      }
      `,
    vec2:`
      vec2 opI( vec2 d1, vec2 d2  ) {
        vec2 o;

        if( d1.x > d2.x ) {
          o = d1; 
        }else{
          o = d2; 
        }

        return o;
      }
      `
  },

  Difference:{
    float:`
      float opS( float d1, float d2 ) { return max(d1,-d2); }
      `,
    vec2:`
      vec2 opS( vec2 d1, vec2 d2  ) {
        vec2 o;

        if( d1.x >= -d2.x ) {
          o = d1; 
        }else{
          d2.x *= -1.;
          o = d2;
        }

        return o;
      }
      `
  },

  StairsUnion:{
    float:`
      float fOpUnionStairs(float a, float b, float r, float n) {
        float s = r/n;
        float u = b-r;
        return min(min(a,b), 0.5 * (u + a + abs ((mod (u - a + s, 2. * s)) - s)));
      }`,
    vec2:`
      vec2 fOpUnionStairs( vec2 d1, vec2 d2, float r, float n  ) {
        vec2 o = vec2( 0., d1.y ); 

        if( d1.x <= d2.x ) {
          o.y = d1.y; 
        }else{
          o.y = d2.y; 
        }

        o.x = fOpUnionStairs( d1.x, d2.x, r, n );

        return o;
      }
      `
  },
  StairsIntersection:{
    dependencies: ['StairsUnion'],
    float:`
      // We can just call Union since stairs are symmetric.
      float fOpIntersectionStairs(float a, float b, float r, float n) {
        return -fOpUnionStairs(-a, -b, r, n);
      }
      `,
    vec2:`
      vec2 fOpIntersectionStairs( vec2 d1, vec2 d2, float r, float n  ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = -fOpUnionStairs( -d1.x, -d2.x, r, n );

        if( -d1.x <= -d2.x ) {
          o.y = d1.y;
        }else{
          o.y = d2.y;
        }

        return o;
      }
      `
  },
  StairsDifference:{
    dependencies: ['StairsUnion'],
    float:`
      float fOpSubstractionStairs(float a, float b, float r, float n) {
        return -fOpUnionStairs(-a, b, r, n);
      }`,
    vec2:`
      vec2 fOpSubstractionStairs( vec2 d1, vec2 d2, float r, float n  ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = -fOpUnionStairs( -d1.x, d2.x, r, n );

        if( -d1.x <= d2.x ) {
          o.y = d1.y;
        }else{
          o.y = d2.y;
        }

        return o;
      }
      `
  },

  RoundUnion:{
    float:`
      float fOpUnionRound(float a, float b, float r) {
        vec2 u = max(vec2(r - a,r - b), vec2(0));
        return max(r, min (a, b)) - length(u);
      }`,

    vec2:`
      vec2 fOpUnionRound( vec2 d1, vec2 d2, float r  ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = fOpUnionRound( d1.x, d2.x, r );

        if( d1.x <= d2.x ) {
          o.y = d1.y;
        }else{
          o.y = d2.y;
        }

        return o;
      }
      `
  },
  RoundIntersection:{
    float:`
      float fOpIntersectionRound(float a, float b, float r) {
        vec2 u = max(vec2(r + a,r + b), vec2(0));
        return min(-r, max (a, b)) + length(u);
      }`,
    vec2:`
      vec2 fOpIntersectionRound( vec2 d1, vec2 d2, float r  ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = fOpIntersectionRound( d1.x, d2.x, r );

        if( d1.x >= d2.x ) {
          o.y = d1.y;
        }else{
          o.y = d2.y;
        }

        return o;
      }
      `
  },

  RoundDifference:{
    dependencies: ['RoundIntersection'],
    float:`
      float fOpDifferenceRound (float a, float b, float r) {
        return fOpIntersectionRound(a, -b, r);
      }`,
    vec2:`
      vec2 fOpDifferenceRound( vec2 d1, vec2 d2, float r  ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = fOpDifferenceRound( d1.x, d2.x, r );

        if( d1.x >= -d2.x ) {
          o.y = d1.y; 
        }else{
          o.y = d2.y;
        }

        return o;
      }
      `
  },
  // TODO: has some discontinuities
  ColumnsUnion:{
    float:`
      float fOpUnionColumns(float a, float b, float r, float n) {
        if ((a < r) && (b < r)) {
          vec2 p = vec2(a, b);
          float columnradius = r*sqrt(2.)/((n-1.)*2.+sqrt(2.));

          //pR45(p);
          p = (p + vec2(p.y, -p.x))*sqrt(0.5);

          p.x -= sqrt(2.)/2.*r;
          p.x += columnradius*sqrt(2.);
          if( mod(n,2.) == 0. ) {
            p.y += columnradius;
          }

          // At this point, we have turned 45 degrees and moved at a point on the
          // diagonal that we want to pylace the columns on.
          // Now, repeat the domain along this direction and place a circle.
          // pMod1(p.y, columnradius*2);
          float size = columnradius*2.;
          float halfsize = columnradius;
	        p.y = mod(p.y + halfsize, size) - halfsize;

          float result = length(p) - columnradius;
          result = min(result, p.x);
          result = min(result, a);
          return min(result, b);
        } else {
          return min(a, b);
        }
      }`,
    vec2:`
      vec2 fOpUnionColumns( vec2 d1, vec2 d2, float r, float n  ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = fOpUnionColumns( d1.x, d2.x, r,n );


        if( d1.x <= d2.x ) {
          o.y = d1.y;
        }else{
          o.y = d2.y;
        }

        return o;
      }
      `
  },
  ColumnsIntersection:{
    dependencies:['ColumnsDifference'],
    float:`
      float fOpIntersectionColumns(float a, float b, float r, float n) {
        return fOpDifferenceColumns(a,-b,r, n);
      }`,
    vec2:`
      vec2 fOpIntersectionColumns( vec2 d1, vec2 d2, float r, float n   ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = fOpIntersectionColumns( d1.x, d2.x, r,n );

        if( d1.x >= d2.x ) {
          o.y = d1.y;
        }else{
          o.y = d2.y;
        }

        return o;
      }
      `
  },

  ColumnsDifference:{
    float:`
      float fOpDifferenceColumns(float a, float b, float r, float n) {
        a = -a;
        float m = min(a, b);
        //avoid the expensive computation where not needed (produces discontinuity though)
        if ((a < r) && (b < r)) {
          vec2 p = vec2(a, b);
          float columnradius = r*sqrt(2.)/n/2.0;
          columnradius = r*sqrt(2.)/((n-1.)*2.+sqrt(2.));

          //pR45(p);
          p = (p + vec2(p.y, -p.x))*sqrt(0.5);
          
          p.y += columnradius;
          p.x -= sqrt(2.)/2.*r;
          p.x += -columnradius*sqrt(2.)/2.;

          if (mod(n,2.) == 1.) {
            p.y += columnradius;
          }

          //pMod1(p.y,columnradius*2.);
          float size = columnradius*2.;
          float halfsize = size*0.5;
					//float c = floor((p + halfsize)/size);
	        p = mod(p + halfsize, size) - halfsize;

          float result = -length(p) + columnradius;
          result = max(result, p.x);
          result = min(result, a);
          return -min(result, b);
        } else {
          return -m;
        }
      }`,
    vec2:`
      vec2 fOpDifferenceColumns( vec2 d1, vec2 d2, float r, float n  ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = fOpDifferenceColumns( d1.x, d2.x, r, n );

        if( d1.x >= -d2.x ) {
          o.y = d1.y;
        }else{
          o.y = d2.y;
        }

        return o;
      }
      `
  },

  ChamferUnion:{
    float:`
      float fOpUnionChamfer(float a, float b, float r) {
        return min(min(a, b), (a - r + b)*sqrt(0.5));
      }`,
    vec2:`
      vec2 fOpUnionChamfer( vec2 d1, vec2 d2, float r  ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = fOpUnionChamfer( d1.x, d2.x, r );

        if( d1.x <= d2.x ) {
          o.y = d1.y;
        }else{
          o.y = d2.y;
        }

        return o;
      }
      `
  },
  ChamferIntersection:{
    float:`
      float fOpIntersectionChamfer(float a, float b, float r) {
        return max(max(a, b), (a + r + b)*sqrt(0.5));
      }`,
    vec2:`
      vec2 fOpIntersectionChamfer( vec2 d1, vec2 d2, float r   ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = fOpIntersectionChamfer( d1.x, d2.x, r );

        if( d1.x >= d2.x ) {
          o.y = d1.y;
        }else{
          o.y = d2.y;
        }

        return o;
      }
      `
  },

  ChamferDifference:{
    dependencies:['ChamferIntersection'],
    float:`
      float fOpDifferenceChamfer (float a, float b, float r) {
        return fOpIntersectionChamfer(a, -b, r);
      }`,
    vec2:`
      vec2 fOpDifferenceChamfer( vec2 d1, vec2 d2, float r  ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = fOpDifferenceChamfer( d1.x, d2.x, r );

        if( d1.x >= -d2.x ) {
          o.y = d1.y;
        }else{
          o.y = d2.y;
        }

        return o;
      }
      `
  },
  Pipe:`
      float fOpPipe(float a, float b, float r) {
        return length(vec2(a, b)) - r;
      }
      vec2 fOpPipe( vec2 d1, vec2 d2, float r   ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = fOpPipe( d1.x, d2.x, r );

        return o;
      }
      `,

  Engrave:`
      float fOpEngrave(float a, float b, float r) {
        return max(a, (a + r - abs(b))*sqrt(0.5));
      }
      vec2 fOpEngrave( vec2 d1, vec2 d2, float r  ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = fOpEngrave( d1.x, d2.x, r );

        return o;
      }
      `,
  Groove:`
      float fOpGroove(float a, float b, float ra, float rb) {
        return max(a, min(a + ra, rb - abs(b)));
      }
      vec2 fOpGroove( vec2 d1, vec2 d2, float r, float n  ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = fOpGroove( d1.x, d2.x, r, n );

        return o;
      }
      `,

  Tongue:`
      float fOpTongue(float a, float b, float ra, float rb) {
        return min(a, max(a - ra, abs(b) - rb));
      }
      vec2 fOpTongue( vec2 d1, vec2 d2, float r, float n  ) {
        vec2 o = vec2( 0., d1.y ); 
        o.x = fOpTongue( d1.x, d2.x, r, n );

        return o;
      }
      `,
  Onion:`
      float opOnion( float sdf, float thickness ){
        return abs(sdf)-thickness;
      }
      vec2 opOnion( vec2 sdf, float thickness ) {
        float x = 0.;

        sdf.x = opOnion( sdf.x, thickness );

        return sdf;
      }  
      `,
  Halve:`
      float opHalve( in float sdf, vec4 p, in int dir ){
        float _out = 0.;
        switch( dir ) {
          case 0:  
            _out = max( sdf, p.y );
            break;
          case 1:
            _out = max( sdf, -p.y );
            break;
          case 2:
            _out = max( sdf, p.x );
            break;
          case 3:
            _out = max( sdf, -p.x );
            break;
        }

        return _out;
      }

      vec2 opHalve( vec2 sdf, vec4 p, int dir ) {
        float x = 0.;

        x = opHalve( sdf.x, p, dir );

        sdf.x = x;

        return sdf;
      } 
  `,

  Switch:`
      vec2 opSwitch( vec2 a, vec2 b, float c ) {
        if( c < .5 ) {
          return a;
        }else{
          return b;
        } 
      }
      `
}
