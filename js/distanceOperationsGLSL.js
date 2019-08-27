module.exports = {
  Union:{
    float:`
      float opU( float d1, float d2 ) {
        return min(d1,d2);
      }
      `,
    opOut:`
      opOut opU( opOut d1, opOut d2, mat4 t1, mat4 t2, mat4 top ) {
        opOut o;

        if( d1.x < d2.x ) {
          o = opOut( d1.x, d1.y, t1 * top );
        }else{
          o = opOut( d2.x, d2.y, t2 * top );
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
    opOut:`
      opOut opI( opOut d1, opOut d2, mat4 t1, mat4 t2, mat4 top ) {
        opOut o;

        if( d1.x > d2.x ) {
          o = opOut( d1.x, d1.y, t1 * top );
        }else{
          o = opOut( d2.x, d2.y, t2 * top );
        }

        return o;
      }
      `
  },

  Difference:{
    float:`
      float opS( float d1, float d2 ) { return max(d1,-d2); }
      `,
    opOut:`
      opOut opS( opOut d1, opOut d2, mat4 t1, mat4 t2, mat4 top ) {
        opOut o;

        if( d1.x >= -d2.x ) {
          o = opOut( d1.x, d1.y, t1 * top );
        }else{
          o = opOut( -d2.x, d2.y, t2 * top );
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
    opOut:`
      opOut fOpUnionStairs( opOut d1, opOut d2, float r, float n, mat4 t1, mat4 t2, mat4 top ) {
        opOut o = opOut(-1., -1., mat4(1.));

        if( d1.x <= d2.x ) {
          o.y = d1.y; 
          o.transform = t1 * top;
        }else{
          o.y = d2.y; 
          o.transform = t2 * top;
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
    opOut:`
      opOut fOpIntersectionStairs( opOut d1, opOut d2, float r, float n, mat4 t1, mat4 t2, mat4 top ) {
        opOut o = opOut( -1., -1., mat4(1.));
        o.x = -fOpUnionStairs( -d1.x, -d2.x, r, n );

        if( -d1.x <= -d2.x ) {
          o.y = d1.y;
          o.transform = t1 * top;
        }else{
          o.y = d2.y;
          o.transform = t2 * top;
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
    opOut:`
      opOut fOpSubstractionStairs( opOut d1, opOut d2, float r, float n, mat4 t1, mat4 t2, mat4 top ) {
        opOut o = opOut( -1., -1., mat4(1.));
        o.x = -fOpUnionStairs( -d1.x, d2.x, r, n );

        if( -d1.x <= d2.x ) {
          o.y = d1.y;
          o.transform = t1 * top;
        }else{
          o.y = d2.y;
          o.transform = t2 * top;
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

    opOut:`
      opOut fOpUnionRound( opOut d1, opOut d2, float r, mat4 t1, mat4 t2, mat4 top ) {
        opOut o = opOut( -1., -1., mat4(1.));
        o.x = fOpUnionRound( d1.x, d2.x, r );

        if( d1.x <= d2.x ) {
          o.y = d1.y;
          o.transform = t1 * top;
        }else{
          o.y = d2.y;
          o.transform = t2 * top;
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
    opOut:`
      opOut fOpIntersectionRound( opOut d1, opOut d2, float r, mat4 t1, mat4 t2, mat4 top ) {
        opOut o = opOut( -1., -1., mat4(1.));
        o.x = fOpIntersectionRound( d1.x, d2.x, r );

        if( d1.x >= d2.x ) {
          o.y = d1.y;
          o.transform = t1 * top;
        }else{
          o.y = d2.y;
          o.transform = t2 * top;
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
    opOut:`
      opOut fOpDifferenceRound( opOut d1, opOut d2, float r, mat4 t1, mat4 t2, mat4 top ) {
        opOut o = opOut( -1., -1., mat4(1.));
        o.x = fOpDifferenceRound( d1.x, d2.x, r );

        if( d1.x >= -d2.x ) {
          o.y = d1.y;
          o.transform = t1 * top;
        }else{
          o.y = d2.y;
          o.transform = t2 * top;
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
    opOut:`
      opOut fOpUnionChamfer( opOut d1, opOut d2, float r, mat4 t1, mat4 t2, mat4 top ) {
        opOut o = opOut( -1., -1., mat4(1.));
        o.x = fOpUnionChamfer( d1.x, d2.x, r );

        if( d1.x <= d2.x ) {
          o.y = d1.y;
          o.transform = t1 * top;
        }else{
          o.y = d2.y;
          o.transform = t2 * top;
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
    opOut:`
      opOut fOpIntersectionChamfer( opOut d1, opOut d2, float r, mat4 t1, mat4 t2, mat4 top ) {
        opOut o = opOut( -1., -1., mat4(1.));
        o.x = fOpIntersectionChamfer( d1.x, d2.x, r );

        if( d1.x >= d2.x ) {
          o.y = d1.y;
          o.transform = t1 * top;
        }else{
          o.y = d2.y;
          o.transform = t2 * top;
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
    opOut:`
      opOut fOpDifferenceChamfer( opOut d1, opOut d2, float r, mat4 t1, mat4 t2, mat4 top ) {
        opOut o = opOut( -1., -1., mat4(1.));
        o.x = fOpDifferenceChamfer( d1.x, d2.x, r );

        if( d1.x >= -d2.x ) {
          o.y = d1.y;
          o.transform = t1 * top;
        }else{
          o.y = d2.y;
          o.transform = t2 * top;
        }

        return o;
      }
      `
  },
  Pipe:`
      float fOpPipe(float a, float b, float r) {
        return length(vec2(a, b)) - r;
      }
      opOut fOpPipe( opOut d1, opOut d2, float r, mat4 t1, mat4 t2, mat4 top ) {
        opOut o = opOut( -1., -1., mat4(1.));
        o.x = fOpPipe( d1.x, d2.x, r );

        o.y = d1.y;
        o.transform = t1 * top;

        return o;
      }
      `,

  Engrave:`
      float fOpEngrave(float a, float b, float r) {
        return max(a, (a + r - abs(b))*sqrt(0.5));
      }
      opOut fOpEngrave( opOut d1, opOut d2, float r, mat4 t1, mat4 t2, mat4 top ) {
        opOut o = opOut( -1., -1., mat4(1.));
        o.x = fOpEngrave( d1.x, d2.x, r );

        o.y = d1.y;
        o.transform = t1 * top;

        return o;
      }
      `,
  Groove:`
      float fOpGroove(float a, float b, float ra, float rb) {
        return max(a, min(a + ra, rb - abs(b)));
      }
      opOut fOpGroove( opOut d1, opOut d2, float r, float n, mat4 t1, mat4 t2, mat4 top ) {
        opOut o = opOut( -1., -1., mat4(1.));
        o.x = fOpGroove( d1.x, d2.x, r, n );

        o.y = d1.y;
        o.transform = t1 * top;

        return o;
      }
      `,

  Tongue:`
      float fOpTongue(float a, float b, float ra, float rb) {
        return min(a, max(a - ra, abs(b) - rb));
      }
      opOut fOpTongue( opOut d1, opOut d2, float r, float n, mat4 t1, mat4 t2, mat4 top ) {
        opOut o = opOut( -1., -1., mat4(1.));
        o.x = fOpTongue( d1.x, d2.x, r, n );

        o.y = d1.y;
        o.transform = t1 * top;

        return o;
      }
      `,
  Onion:`
      float opOnion( in float sdf, in float thickness ){
        return abs(sdf)-thickness;
      }

      float opHalve( in float sdf, vec3 p, in int dir ){
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
      `,

  Switch:`
      opOut opSwitch( opOut a, opOut b, float c ) {
        if( c < .5 ) {
          return a;
        }else{
          return b;
        } 
      }
      `
}
