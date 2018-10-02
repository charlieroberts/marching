const SceneNode = require( './sceneNode.js' ),
      { param_wrap, MaterialID } = require( './utils.js' ),
      { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen } = require( './var.js' ),
      { Vec2, Vec3, Vec4 } = require( './vec.js' )

const glsl = require( 'glslify' )

const modeConstants = [
  'global',
  'normal',
  'directional',
  'orenn'
]

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
        Material( 0, vec3( 1. ), vec3(0.,0.,0.), vec3(1.), 8., Fresnel( 0., 1., 2.) ),
        Material( 0, vec3( 1. ), vec3(1.,0.,0.), vec3(1.), 8., Fresnel( 0., 1., 2.) )
      );
    `,

    light( pos=Vec3(2,2,3), color=Vec3(0,0,1), attenuation=1, intensity=1 ) {
      const light = { pos, color, attenuation, intensity }
      return light
    },

    emit_lights() {
      if( this.lights.length === 0 ) return this.defaultLights

      let str = `      Light lights[${this.lights.length}] = Light[${this.lights.length}](`

      for( let light of this.lights ) {
        str += `\n        Light( ${light.pos.emit().out}, ${light.color.emit().out}, ${light.attenuation.toFixed(1)}),` 
      }
      
      str = str.slice(0,-1) // remove trailing comma

      str += ');'

      return str
    },

    mode:'global',

    gen( shadows=8 ) {
      //const str = this.modes[ this.mode ]( this.lights.length || 2, this.emit_lights(), SDF.materials.emit_materials(), shadows )
   
      this.modesEmployed.length = 0

      let lightingFunctions = []

      for( let mat of SDF.materials.materials ) {
        if( this.modesEmployed.indexOf( mat.mode ) === -1 ) {
          lightingFunctions.push( this.modes[ modeConstants[ mat.mode ] ]() )  

          this.modesEmployed.push( mat.mode )
        }
      }

      for( let mode in modeConstants ) {
        // key is iterated as string, must use parseInt
        if( this.modesEmployed.indexOf( parseInt(mode) ) === -1 ) {
          lightingFunctions.push( this.defaultFunctionDeclarations[ mode  ] )
        }
      }

      const lighting = this.shell( this.lights.length || 2, this.emit_lights(), SDF.materials.emit_materials(), shadows )

      return lighting[0] + lightingFunctions.join('\n') + lighting[1]
    },

    modesEmployed:[],

    defaultFunctionDeclarations: [
      'vec3 global( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, float materialID ) { return vec3(0.); }',
      'vec3 normal( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, float materialID ) { return vec3(0.); }',
      'vec3 directional( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, float materialID ) { return vec3(0.); }',
      'vec3 orenn( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, float materialID ) { return vec3(0.); }',
    ],

    functionDeclarations: {

    },

    shell( numlights, lights, materials, shadow=0 ) {
      const __shadow = shadow > 0
        ? `diffuseCoefficient *= softshadow( surfacePosition, normalize( light.position ), 0.02, 2.5, ${shadow.toFixed(1)} );` 
        : ''


      let preface = glsl`  int MAX_LIGHTS = ${numlights};
    #pragma glslify: calcAO = require( 'glsl-sdf-ops/ao', map = scene )

    ${materials}

    ${lights}
    `

    let func = `  vec3 lighting( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, float materialID ) {
      // applies to all lights (actually, not 'normal' mode... TODO)
      //float occlusion = calcAO( surfacePosition, normal );

      Material mat = materials[ int(materialID) ];

      int MAX_LIGHTS = ${numlights};     

      vec3 clr;
      switch( mat.mode ) {
        case 0: clr = global( surfacePosition, normal, rayOrigin, rayDirection, materialID ); break;
        case 1: clr = normal; break;
        case 2: clr = directional( surfacePosition, normal, rayOrigin, rayDirection, materialID ); break;
        case 3: clr = orenn( surfacePosition, normal, rayOrigin, rayDirection, materialID ); break;
        default:
          clr = normal;
      }

      return clr;
    }
`

      return [ preface, func ]
    }, 

    modes:{
      global( shadow=8 ) {
        const str = glsl`

        vec3 global( vec3 pos, vec3 nor, vec3 ro, vec3 rd, float materialID ) {
          Light light = lights[ 0 ];
          vec3  ref = reflect( rd, nor ); // reflection angle
          float occ = ao( pos, nor );
          vec3  lig = normalize( light.position ); // light position
          float amb = clamp( 0.5 + 0.5 * nor.y, 0.0, 1.0 );
          float dif = clamp( dot( nor, lig ), 0.0, 1.0 );

          // simulated backlight
          float bac = clamp( dot( nor, normalize( vec3( -lig.x, 0.0 , -lig.z ))), 0.0, 1.0 ) * clamp( 1.0-pos.y, 0.0 ,1.0 );

          // simulated skydome light
          float dom = smoothstep( -0.1, 0.1, ref.y );
          float fre = pow( clamp( 1.0 + dot( nor,rd ),0.0,1.0 ), 3.0);
          float spe = pow( clamp( dot( ref, lig ), 0.0, 1.0 ), 8.0 );

          dif *= softshadow( pos, lig, 0.02, 2.5, ${shadow.toFixed(1)} );
          dom *= softshadow( pos, ref, 0.02, 2.5, ${shadow.toFixed(1)} );

          Material mat = materials[ int(materialID) ];

          vec3 brdf = vec3( 0.0 );
          brdf += 1.20 * dif * vec3( 1.00,0.90,0.60 ) * mat.diffuse * light.color;
          brdf += 2.20 * spe * vec3( 1.00,0.90,0.60 ) * dif * mat.specular * light.color;
          brdf += 0.30 * amb * vec3( 0.50,0.70,1.00 ) * occ * mat.ambient * light.color;
          brdf += 0.40 * dom * vec3( 0.50,0.70,1.00 );
          brdf += 0.70 * bac * vec3( 0.25 );
          brdf += 0.40 * (fre * light.color);

          return brdf;
        }
        
        `

        return str
      },

      directional( numlights, lights, materials, shadow=0 ) {
        const __shadow = shadow > 0
          ? `diffuseCoefficient *= softshadow( surfacePosition, normalize( light.position ), 0.02, 2.5, ${shadow.toFixed(1)} );` 
          : ''

        const str = glsl`  
        vec3 directional( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, float materialID ) {
          vec3  outputColor   = vec3( 0. );
   
          // applies to all lights
          float occlusion = ao( surfacePosition, normal );

          Material mat = materials[ int(materialID) ];

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

            float fresnel = mat.fresnel.bias + mat.fresnel.scale * pow( 1.0 + dot( rayDirection, normal ), mat.fresnel.power ); 

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
        }
        
        `

        return str
      }, 

      orenn( numlights, lights, materials, shadow=0 ) {
        const __shadow = shadow > 0
          ? `diffuseCoefficient *= softshadow( surfacePosition, normalize( light.position ), 0.02, 2.5, ${shadow.toFixed(1)} );` 
          : ''

        const str = glsl`  
        #pragma glslify: orenND  = require( 'glsl-diffuse-oren-nayar' )
        #pragma glslify: gauss  = require( 'glsl-specular-gaussian' )

        vec3 orenn( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, float materialID ) {
          vec3  outputColor   = vec3( 0. );
   
          // applies to all lights
          float occlusion = ao( surfacePosition, normal );

          Material mat = materials[ int(materialID) ];

          for( int i = 0; i < 20000; i++ ) {
            if( i >= MAX_LIGHTS ) break;

            Light light = lights[ i ];

            vec3 surfaceToLightDirection = normalize( light.position - surfacePosition );
            
            //vec3 dif2 = col2 * orenND( surfaceToLightDirection, -rayDirection, normal, 0.15, 1.0);
            //vec3 spc2 = col2 * gauss(dir2, -rd, nor, 0.15);

            // get similarity between normal and direction to light
            float diffuseCoefficient = orenND( surfaceToLightDirection, -rayDirection, normal, 0.15, 4.0);

            // get reflection angle for light striking surface
            vec3 angleOfReflection = reflect( -surfaceToLightDirection, normal );

            // see if reflected light travels to camera and generate coefficient accordingly
            float specularAngle = clamp( dot( angleOfReflection, -rayDirection ), 0., 1. );
            float specularCoefficient = gauss( surfaceToLightDirection, -rayDirection, normal, .5 ); 

            // lights should have an attenuation factor
            float attenuation = 1. / ( light.attenuation * pow( length( light.position - surfacePosition ), 2. ) ); 

            float fresnel = mat.fresnel.bias + mat.fresnel.scale * pow( 1.0 + dot( rayDirection, normal ), mat.fresnel.power ); 

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

      normal() { return '' }
      //normal( numlights, lights, materials ) {
      //  const str = glsl`vec3 lighting( vec3 pos, vec3 nor, vec3 ro, vec3 rd, float materialID ) {
      //    return nor;
      //  }`

      //  return str

      //},
    },
  }

  return Light
}

module.exports = Lights

// old lighting
/*
*/
