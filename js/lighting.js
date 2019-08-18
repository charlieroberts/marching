const SceneNode = require( './sceneNode.js' ),
      { param_wrap, MaterialID } = require( './utils.js' ),
      { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen } = require( './var.js' ),
      { Vec2, Vec3, Vec4 } = require( './vec.js' )

const glsl = require( 'glslify' )

const Lights = function( SDF ) {

  const Light = {
    lights:[],
    materials:[],

    defaultLights:`
      Light lights[2] = Light[2](
        Light( vec3( 2.,2.,3. ),  vec3(0.25,0.25,.25), 1. ),
        Light( vec3( -2.,2.,3. ), vec3(.25,0.25,0.25), 1. )
      );
    `,

    defaultMaterials:`
      Material materials[2] = Material[2](
        Material( 0, vec3( 1. ), vec3(0.,0.,0.), vec3(1.), 8., Fresnel( 0., 1., 2.), 0 ),
        Material( 0, vec3( 1. ), vec3(1.,0.,0.), vec3(1.), 8., Fresnel( 0., 1., 2.), 0 )
      );
    `,

    light( __pos=Vec3(2,2,3), __color=Vec3(0,0,1), attenuation=1 ) {
      const light = { 
        __attenuation: param_wrap( attenuation, float_var_gen( 1 ) ),
      }

      pos = typeof __pos === 'number' ? Vec3( __pos ) : __pos

      const __varpos = param_wrap( 
        pos, 
        vec3_var_gen( [2,2,3] )
      )

      Object.defineProperty( light, 'pos', {
        get() { return __varpos },
        set(v) {
          if( typeof v === 'object' ) {
            __varpos.set( v )
          }else{
            __varpos.value.x = v
            __varpos.value.y = v
            __varpos.value.z = v
            __varpos.dirty = true
          }
        }
      })  

      color = typeof __color === 'number' ? Vec3( __color ) : __color

      const __varcol = param_wrap( 
        color, 
        vec3_var_gen( [0,0,1] )
      )

      Object.defineProperty( light, 'color', {
        get() { return __varcol },
        set(v) {
          if( typeof v === 'object' ) {
            __varcol.set( v )
          }else{
            __varcol.value.x = v
            __varcol.value.y = v
            __varcol.value.z = v
            __varcol.dirty = true
          }
        }
      })  

      Object.defineProperty( light, 'attenuation', {
        get() { return light.__attenuation.value },
        set(v){
          light.__attenuation.value = v
          light.__attenuation.dirty = true
        }
      })

      return light
    },

    emit_lights() {
      if( this.lights.length === 0 ) return this.defaultLights

      let str = `Light lights[${this.lights.length}] = Light[${this.lights.length}](`

      for( let light of this.lights ) {
        str += `\n        Light( ${light.pos.emit()}, ${light.color.emit()}, ${light.__attenuation.emit()}),` 
      }
      
      str = str.slice(0,-1) // remove trailing comma

      str += '\n      );'

      return str
    },

    mode:'global',

    gen( shadows=8 ) {
      //const str = this.modes[ this.mode ]( this.lights.length || 2, this.emit_lights(), SDF.materials.emit_materials(), shadows )
   
      const modeConstants = SDF.materials.modeConstants
      this.modesEmployed.length = 0

      let lightingFunctions = []

      // loop through all materials used and add corresponding lighting functions as needed
      for( let mat of SDF.materials.materials ) {
        if( this.modesEmployed.indexOf( mat.mode ) === -1 ) {
          lightingFunctions.push( this.modes[ mat.mode ]() )  

          this.modesEmployed.push( mat.mode )
        }
      }

      // check all modes to see if they're lighting function has been added to the shader,
      // if not, add their function stub
      for( let mode of modeConstants ) {
        // key is iterated as string, must use parseInt
        if( this.modesEmployed.indexOf( mode ) === -1 ) {
          lightingFunctions.push( this.defaultFunctionDeclarations[ modeConstants.indexOf( mode ) ] )
        }
      }

      const lighting = this.shell( 
        this.lights.length || 2, 
        this.emit_lights(), 
        SDF.materials.emit_materials(), 
        shadows,
        SDF.primitives.emit_geometries()
      )

      let lightingFuncStr = lightingFunctions.join('\n')
      lightingFuncStr = lightingFuncStr.replace( /(MAX\_LIGHTS)/g, this.lights.length || 2 )
      return lighting[0] + lightingFuncStr + lighting[1]
    },

    emit_decl() {
      let str = ''
      for( let light of this.lights ) {
        str += light.pos.emit_decl()
        str += light.color.emit_decl()
        str += light.__attenuation.emit_decl()
      }

      return str
    },

    update_location( gl, program ) {
      for( let light of this.lights ) {
        if( light.pos.dirty === true )  light.pos.update_location( gl, program )
        if( light.color.dirty === true )  light.color.update_location( gl, program )
        if( light.__attenuation.dirty === true ) light.__attenuation.update_location( gl, program )
      }

    },

    upload_data( gl, program='' ) {
      for( let light of this.lights ) {
        if( light.pos.dirty === true )   light.pos.upload_data( gl, program )
        if( light.color.dirty === true )  light.color.upload_data( gl, program )
        if( light.__attenuation.dirty === true )  light.__attenuation.upload_data( gl, program )
      }
    },

    modesEmployed:[],

    // these stubs are placed in the shader by default as placeholders so that they can be referenced in 
    // a switch statement selecting lighting. They are overridden by actual lighting functions if any
    // material in the scene uses a corresponding function.
    defaultFunctionDeclarations: [
      '    vec3 global( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, Material mat, Light lights[MAX_LIGHTS] ) { return vec3(0.); }',
      '    vec3 normal( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, Material mat, Light lights[MAX_LIGHTS] ) { return vec3(0.); }',
      '    vec3 directional( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, Material mat, Light lights[MAX_LIGHTS] ) { return vec3(0.); }',
      '    vec3 orenn( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, Material mat, Light lights[MAX_LIGHTS] ) { return vec3(0.); }',
    ],

    shell( numlights, lights, materials, shadow=0, sdfs ) {
      const __shadow = shadow > 0
        ? `diffuseCoefficient *= softshadow( surfacePosition, normalize( light.position ), 0.02, 2.5, ${shadow.toFixed(1)} );` 
        : ''


      let preface = glsl`  int MAX_LIGHTS = ${numlights};
    #pragma glslify: calcAO = require( 'glsl-sdf-ops/ao', map = scene )
    vec3 getTexture( int id, vec3 pos, vec3 nor ) {
      vec3 tex;
      switch( id ) {
        case 0: 
          pos = (vec4(pos,1.) * inverse( rotations[0] ) ).xyz;
          float n = snoise( pos*2. );
          tex = vec3( n );
          break;
        default:
          tex = vec3(0.);
          break;
      }

      return tex;
    }

    `

//      let func = `

//    vec3 lighting( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, float materialID ) {
//      // applies to all lights (actually, not 'normal' mode... TODO)
//      //float occlusion = calcAO( surfacePosition, normal );

//      ${materials}
//      Material mat = materials[ int(materialID) ];


//      int MAX_LIGHTS = ${numlights};     

//      ${lights}

//      vec3 clr;
//      switch( mat.mode ) {
//        case 0: clr = global( surfacePosition, normal, rayOrigin, rayDirection, mat, lights ); break;
//        case 1: clr = normal; break;
//        case 2: clr = directional( surfacePosition, normal, rayOrigin, rayDirection, mat, lights ); break;
//        case 3: clr = orenn( surfacePosition, normal, rayOrigin, rayDirection, mat, lights ); break;
//        default:
//          clr = normal;
//      }

//      return clr; /[> textureColor.rgb;
//    }
//`

      let func = `

    vec3 lighting( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, float sdfID ) {
      ${sdfs}
      SDF sdf = sdfs[ int( sdfID ) ];

      ${materials}
      Material mat = materials[ sdf.materialID ];

      int MAX_LIGHTS = ${numlights};     

      ${lights}

      vec3 clr;
      switch( mat.mode ) {
        case 0: clr = global( surfacePosition, normal, rayOrigin, rayDirection, mat, lights ); break;
        case 1: clr = normal; break;
        case 2: clr = directional( surfacePosition, normal, rayOrigin, rayDirection, mat, lights ); break;
        case 3: clr = orenn( surfacePosition, normal, rayOrigin, rayDirection, mat, lights ); break;
        default:
          clr = normal;
      }

      vec3 textureClr = getTexture( int(sdf.textureID), (vec4(surfacePosition,1.)*sdf.transform).xyz, normal );

      clr = clr + textureClr;

      return clr; 
    }
`
      return [ preface, func ]
    }, 

    modes:{
      global() {
        const shadow = SDF.__scene.__shadow

        const str = glsl`

        vec3 global( vec3 pos, vec3 nor, vec3 ro, vec3 rd, Material mat, Light lights[MAX_LIGHTS] ) {
          Light light = lights[ 0 ];
          vec3  ref = reflect( rd, nor ); // reflection angle
          float occ = ao( pos, nor );
          vec3  lig = normalize( light.position ); // light position
          float amb = clamp( 0.5 + 0.5 * nor.y, 0.0, 1.0 );
          float dif = clamp( dot( nor, lig ), 0.0, 1.0 );

          vec3 textureColor;
          /*
          if( mat.textureID > -1 ) {
            textureColor = texture( textures[ mat.textureID ], pos.xy ); 
          }else{
            textureColor = vec4(1.);
          }*/
          // XXX uncomment below to loop textures back in...
          textureColor = vec3(0.);//getTex( mat.textureID, pos, nor );//vec4(1.);


          // simulated backlight
          float bac = clamp( dot( nor, normalize( vec3( -lig.x, 0.0 , -lig.z ))), 0.0, 1.0 ) * clamp( 1.0-pos.y, 0.0 ,1.0 );

          // simulated skydome light
          float dom = smoothstep( -0.1, 0.1, ref.y );
          float fre = pow( clamp( 1.0 + dot( nor,rd ),0.0,1.0 ), 3.0);
          float spe = pow( clamp( dot( ref, lig ), 0.0, 1.0 ), 8.0 );

          dif *= softshadow( pos, lig, 0.02, 2.5, ${shadow.toFixed(1)} );
          dom *= softshadow( pos, ref, 0.02, 2.5, ${shadow.toFixed(1)} );

          vec3 brdf = vec3( 0.0 );
          brdf += 1.20 * dif * vec3( 1.00,0.90,0.60 ) * mat.diffuse * light.color;
          brdf += 2.20 * spe * vec3( 1.00,0.90,0.60 ) * dif * mat.specular * light.color;
          brdf += 0.30 * amb * vec3( 0.50,0.70,1.00 ) * occ * mat.ambient * light.color;
          brdf += 0.40 * dom * vec3( 0.50,0.70,1.00 );
          brdf += 0.70 * bac * vec3( 0.25 );
          brdf += 0.40 * (fre * light.color);

          return brdf + textureColor.xyz;
        }
        `

        return str
      },

      phong( numlights, lights, materials ) {
        const shadow = SDF.__scene.__shadow

        const __shadow = shadow > 0
          ? `diffuseCoefficient *= softshadow( surfacePosition, normalize( light.position ), 0.02, 2.5, ${shadow.toFixed(1)} );` 
          : ''

        const str = glsl`  
        vec4 texcube( sampler2D sam, in vec3 p, in vec3 n, in float scale ) {
            vec3 m = pow( abs( n ), vec3(scale) );
            vec4 x = texture( sam, p.yz );
            vec4 y = texture( sam, p.zx );
            vec4 z = texture( sam, p.xy );
            return (x*m.x + y*m.y + z*m.z) / (m.x + m.y + m.z);
        }
        // p = point on surface, p0 = object center
        vec2 getUVCubic(vec3 p, vec3 p0){
            
          // Center the surface position about the zero point.
          p -= p0;
            
          vec3 absp = abs(p);
            
          // First conditional: If the point is in one of the sextants to the left or right of the x-axis, the uv cordinate will be (0.5*p.zy)/(p.x).
          // If you trace a line out to a zy plane that is 0.5 units from the zero origin,  (0.5*p.xyz)/(p.x) will be the result, and
          // the yz components will be our uv coordinates, hence (0.5*p.zy)/(p.x).
          vec2 uv = ((absp.x>=absp.y)&&(absp.x>=absp.z)) ? (0.5*p.zy)/(p.x) : ((absp.y>=absp.z)&&(absp.y>=absp.x)) ? (0.5*p.xz)/(p.y) : (-0.5*p.xy)/(p.z);
            
          //We still need to determine which side our uv cordinates are on so that the texture orients the right way. Note that there's some 
          // redundancy there, which I'll fix at some stage. For now, it works, so I'm not touching it. :)
          if( ((p.x<0.)&&(absp.x>=absp.y)&&(absp.x>=absp.z)) || ((p.y<0.)&&(absp.y>=absp.z)&&(absp.y>=absp.x)) || ((p.z>0.)&&(absp.z>=absp.x)&&(absp.z>=absp.y)) ) uv.y*=-1.;
                 
          // Mapping the uv range from [-0.5, 0.5] to [0.0, 1.0].
          return (uv+0.5);
        }

        vec3 directional( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, Material mat, Light lights[MAX_LIGHTS] ) {
          vec3  outputColor   = vec3( 0. );
   
          // applies to all lights
          float occlusion = ao( surfacePosition, normal );

          /*
          vec4 textureColor;
          if( mat.textureID > -1 ) {
            //textureColor = texcube( textures[ mat.textureID ], surfacePosition, normal, 1. );//texture( textures[ mat.textureID ], surfacePosition.xy - normal.xy ); 
            vec2 uv = getUVCubic( surfacePosition, vec3(0.) );//surfacePosition.xz*vec2(0.03,0.07);
            textureColor = texture( textures[ mat.textureID ], uv );
          }else{
            textureColor = vec4(0.);
          }

          outputColor = textureColor.xyz;
          */

          for( int i = 0; i < 20000; i++ ) {
            if( i >= MAX_LIGHTS ) break;

            Light light = lights[ i ];

            vec3 surfaceToLightDirection = normalize( light.position - surfacePosition );
            
            // get similarity between normal and direction to light
            float diffuseCoefficient = dot( normal, surfaceToLightDirection ); 

            // get reflection angle for light striking surface
            vec3 angleOfReflection = reflect( -surfaceToLightDirection, normal );

            // see if reflected light travels to camera and generate coefficient accordingly
            float specularAngle = clamp( dot( angleOfReflection, -rayDirection ), 0., 1. );
            float specularCoefficient = pow( specularAngle, mat.shininess );

            // lights should have an attenuation factor
            float attenuation = 1. / ( light.attenuation * pow( length( light.position - surfacePosition ), 2. ) ); 

            // bias, scale, power
            float fresnel = mat.fresnel.x + mat.fresnel.y * pow( 1.0 + dot( rayDirection, normal ), mat.fresnel.z ); 

            ${__shadow}

            vec3 color = vec3( 0. );
            color += 1.2 * diffuseCoefficient * mat.diffuse * light.color;
            color += 2.2 * specularCoefficient * mat.specular * light.color;
            color += 0.3 * (mat.ambient * light.color) * occlusion;
            color += (fresnel * light.color);

            // texture
            //color *= textureColor.xyz;

            // gamma correction must occur before light attenuation
            // which means it must be applied on a per-light basis unfortunately
            vec3 gammaCorrectedColor = pow( color, vec3( 1./2.2 ) );
            vec3 attenuatedColor = 2. * gammaCorrectedColor * attenuation; 

            outputColor += attenuatedColor;
          }

          return outputColor;
        }
        `

        return str
      }, 
      phongT( numlights, lights, materials ) {
        const shadow = SDF.__scene.__shadow

        const __shadow = shadow > 0
          ? `diffuseCoefficient *= softshadow( surfacePosition, normalize( light.position ), 0.02, 2.5, ${shadow.toFixed(1)} );` 
          : ''

        const str = glsl`  
        vec4 texcube( sampler2D sam, in vec3 p, in vec3 n, in float scale ) {
            vec3 m = pow( abs( n ), vec3(scale) );
            vec4 x = texture( sam, p.yz );
            vec4 y = texture( sam, p.zx );
            vec4 z = texture( sam, p.xy );
            return (x*m.x + y*m.y + z*m.z) / (m.x + m.y + m.z);
        }
        // p = point on surface, p0 = object center
        vec2 getUVCubic(vec3 p, vec3 p0){
            
          // Center the surface position about the zero point.
          p -= p0;
            
          vec3 absp = abs(p);
            
          // First conditional: If the point is in one of the sextants to the left or right of the x-axis, the uv cordinate will be (0.5*p.zy)/(p.x).
          // If you trace a line out to a zy plane that is 0.5 units from the zero origin,  (0.5*p.xyz)/(p.x) will be the result, and
          // the yz components will be our uv coordinates, hence (0.5*p.zy)/(p.x).
          vec2 uv = ((absp.x>=absp.y)&&(absp.x>=absp.z)) ? (0.5*p.zy)/(p.x) : ((absp.y>=absp.z)&&(absp.y>=absp.x)) ? (0.5*p.xz)/(p.y) : (-0.5*p.xy)/(p.z);
            
          //We still need to determine which side our uv cordinates are on so that the texture orients the right way. Note that there's some 
          // redundancy there, which I'll fix at some stage. For now, it works, so I'm not touching it. :)
          if( ((p.x<0.)&&(absp.x>=absp.y)&&(absp.x>=absp.z)) || ((p.y<0.)&&(absp.y>=absp.z)&&(absp.y>=absp.x)) || ((p.z>0.)&&(absp.z>=absp.x)&&(absp.z>=absp.y)) ) uv.y*=-1.;
                 
          // Mapping the uv range from [-0.5, 0.5] to [0.0, 1.0].
          return (uv+0.5);
        }

        vec3 directional( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, Material mat, Light lights[MAX_LIGHTS] ) {
          vec3  outputColor   = vec3( 0. );
   
          // applies to all lights
          float occlusion = ao( surfacePosition, normal );

          vec4 textureColor;
          if( mat.textureID > -1 ) {
            //textureColor = texcube( textures[ mat.textureID ], surfacePosition, normal, 1. );//texture( textures[ mat.textureID ], surfacePosition.xy - normal.xy ); 
            vec2 uv = getUVCubic( surfacePosition, vec3(0.) );//surfacePosition.xz*vec2(0.03,0.07);
            textureColor = texture( textures[ mat.textureID ], uv );
          }else{
            textureColor = vec4(0.);
          }

          outputColor = 0;//textureColor.xyz;

          for( int i = 0; i < 20000; i++ ) {
            if( i >= MAX_LIGHTS ) break;

            Light light = lights[ i ];

            vec3 surfaceToLightDirection = normalize( light.position - surfacePosition );
            
            // get similarity between normal and direction to light
            float diffuseCoefficient = dot( normal, surfaceToLightDirection ); 

            // get reflection angle for light striking surface
            vec3 angleOfReflection = reflect( -surfaceToLightDirection, normal );

            // see if reflected light travels to camera and generate coefficient accordingly
            float specularAngle = clamp( dot( angleOfReflection, -rayDirection ), 0., 1. );
            float specularCoefficient = pow( specularAngle, mat.shininess );

            // lights should have an attenuation factor
            float attenuation = 1. / ( light.attenuation * pow( length( light.position - surfacePosition ), 2. ) ); 

            // bias, scale, power
            float fresnel = mat.fresnel.x + mat.fresnel.y * pow( 1.0 + dot( rayDirection, normal ), mat.fresnel.z ); 

            ${__shadow}

            vec3 color = vec3( 0. );
            color += 1.2 * diffuseCoefficient * textureColor.xyz * light.color;
            color += 2.2 * specularCoefficient * textureColor.xyz * light.color;
            color += 0.3 * (mat.ambient * light.color) * occlusion;
            color += (fresnel * light.color);

            // texture
            //color *= textureColor.xyz;

            // gamma correction must occur before light attenuation
            // which means it must be applied on a per-light basis unfortunately
            vec3 gammaCorrectedColor = pow( color, vec3( 1./2.2 ) );
            vec3 attenuatedColor = 2. * gammaCorrectedColor * attenuation; 

            outputColor += attenuatedColor;
          }

          return outputColor;
        }
        `

        return str
      }, 


      orenn( numlights, lights, materials ) {
        const shadow = SDF.__scene.__shadow
        const __shadow = shadow > 0
          ? `diffuseCoefficient *= softshadow( surfacePosition, normalize( light.position ), 0.02, 2.5, ${shadow.toFixed(1)} );` 
          : ''

        const str = glsl`  
        #pragma glslify: orenND  = require( 'glsl-diffuse-oren-nayar' )
        #pragma glslify: gauss  = require( 'glsl-specular-gaussian' )

        vec3 orenn( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, Material mat, Light lights[MAX_LIGHTS] ) {
          vec3  outputColor   = vec3( 0. );
   
          // applies to all lights
          float occlusion = ao( surfacePosition, normal );

          for( int i = 0; i < 20000; i++ ) {
            if( i >= MAX_LIGHTS ) break;

            Light light = lights[ i ];

            vec3 surfaceToLightDirection = normalize( light.position - surfacePosition );
            
            // get similarity between normal and direction to light
            float diffuseCoefficient = orenND( surfaceToLightDirection, -rayDirection, normal, 0.15, 4.0);

            // get reflection angle for light striking surface
            vec3 angleOfReflection = reflect( -surfaceToLightDirection, normal );

            // see if reflected light travels to camera and generate coefficient accordingly
            float specularAngle = clamp( dot( angleOfReflection, -rayDirection ), 0., 1. );
            float specularCoefficient = gauss( surfaceToLightDirection, -rayDirection, normal, .5 ); 

            // lights should have an attenuation factor
            float attenuation = 1. / ( light.attenuation * pow( length( light.position - surfacePosition ), 2. ) ); 

            float fresnel = mat.fresnel.x + mat.fresnel.y * pow( 1.0 + dot( rayDirection, normal ), mat.fresnel.z ); 

            ${__shadow}

            vec3 color = vec3( 0. );
            color += 1.2 * diffuseCoefficient * mat.diffuse * light.color;
            color += 2.2 * specularCoefficient * mat.specular * light.color;
            color += 0.3 * (mat.ambient * light.color) * occlusion;
            color += (fresnel * light.color);

            // gamma correction must occur before light attenuation
            // which means it must be applied on a per-light basis unfortunately
            vec3 gammaCorrectedColor = pow( color, vec3( 1./2.2 ) );
            vec3 attenuatedColor = 2. * gammaCorrectedColor * attenuation; 

            outputColor += attenuatedColor;
          }

          return outputColor;
        }`

        return str
      }, 


      global_save( numlights, lights, materials, shadow='' ) {
        const str = glsl`
        #pragma glslify: calcAO = require( 'glsl-sdf-ops/ao', map = scene )

        ${materials}

        ${lights}

        vec3 lighting( vec3 pos, vec3 nor, vec3 ro, vec3 rd, float materialID ) {
          Light light = lights[ 0 ];
          vec3  ref = reflect( rd, nor ); // reflection angle
          float occ = calcAO( pos, nor );
          vec3  lig = normalize( light.position ); // light position
          float amb = clamp( 0.5 + 0.5 * nor.y, 0.0, 1.0 );
          float dif = clamp( dot( nor, lig ), 0.0, 1.0 );

          // simulated backlight
          float bac = clamp( dot( nor, normalize( vec3( -lig.x, 0.0 , -lig.z ))), 0.0, 1.0 ) * clamp( 1.0-pos.y, 0.0 ,1.0 );

          // simulated skydome light
          float dom = smoothstep( -0.1, 0.1, ref.y );
          float fre = pow( clamp( 1.0 + dot( nor,rd ),0.0,1.0 ), 2.0 );
          float spe = pow( clamp( dot( ref, lig ), 0.0, 1.0 ), 8.0 );

          dif *= softshadow( pos, lig, 0.02, 2.5, 8. );
          dom *= softshadow( pos, ref, 0.02, 2.5, 8. );

          Material mat = materials[ int(materialID) ];

          vec3 brdf = vec3( 0.0 );
          brdf += 1.20 * dif * vec3( 1.00,0.90,0.60 ) * mat.diffuse * light.color;
          brdf += 2.20 * spe * vec3( 1.00,0.90,0.60 ) * dif * mat.specular * light.color;
          brdf += 0.30 * amb * vec3( 0.50,0.70,1.00 ) * occ * mat.ambient * light.color;
          brdf += 0.40 * dom * vec3( 0.50,0.70,1.00 ) * occ;
          brdf += 0.70 * bac * vec3( 0.25 ) * occ;
          brdf += 0.40 * (fre * light.color) * occ;

          return brdf;
        }`

        return str

      },

      normal() { return '' },
      noise() { return '' }
    },
  }

  return Light
}

module.exports = Lights

// old lighting
/*
*/
