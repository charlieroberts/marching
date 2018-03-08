const SceneNode = require( './sceneNode.js' ),
      { param_wrap, MaterialID } = require( './utils.js' ),
      { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen } = require( './var.js' ),
      { Vec2, Vec3, Vec4 } = require( './vec.js' )

const glsl = require( 'glslify' )

const Lights = function( SDF ) {

  const Light = {
  //  emit() {
  //    return `  color = applyLight( color, t.x, ${this.amount.emit()} );`
  //  },
   
  //  emit_decl() {
  //    let str = this.amount.emit_decl() + this.color.emit_decl()
  //    const preface = `  vec3 applyLight( in vec3 rgb, in float distance, in float amount ) {
  //  float lightAmount = 1. - exp( -distance * amount );
  //  vec3  lightColor  = ${this.color.emit()};
  //  return mix( rgb, lightColor, lightAmount );
  //}
  //`
  //    if( SDF.memo.light === undefined ) {
  //      str = str + preface
  //      SDF.memo.light = true
  //    }

  //    return str
  //  },

  //  update_location( gl, program ) {
  //    this.amount.update_location( gl, program )
  //    this.color.update_location( gl, program )
  //  },

  //  upload_data( gl ) {
  //    this.amount.upload_data( gl )
  //    this.color.upload_data( gl )
  //  },
    lights:[],
    materials:[],

    defaultLights:`
      Light lights[2] = Light[2](
        Light( vec3( 2.,2.,3. ),  vec3(0.25,0.25,1.), 1. ),
        Light( vec3( -2.,2.,3. ), vec3(1.,0.25,0.25), 1. )
      );
    `,

    defaultMaterials:`
      Material materials[2] = Material[2](
        Material( vec3( 1. ), vec3(0.,0.,0.), vec3(1.), 8., Fresnel( 0., 1., 4.) ),
        Material( vec3( 1. ), vec3(1.,0.,0.), vec3(1.), 8., Fresnel( 0., 1., 4.) )
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

    
    gen() {
      const str = glsl`  int MAX_LIGHTS = ${this.lights.length || 2 };
      #pragma glslify: calcAO = require( 'glsl-sdf-ops/ao', map = scene )

      ${SDF.materials.emit_materials()}

      ${this.emit_lights()}

      vec3 lighting( vec3 surfacePosition, vec3 normal, vec3 rayOrigin, vec3 rayDirection, float materialID ) {
        vec3  outputColor   = vec3( 0. );
 
        // applies to all lights
        float occlusion = calcAO( surfacePosition, normal );

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

          diffuseCoefficient *= softshadow( surfacePosition, normalize( light.position ), 0.02, 2.5, 8. );

          vec3 color = vec3( 0. );
          color += 1.2 * diffuseCoefficient * mat.diffuse * light.color;
          color += 2.2 * specularCoefficient * mat.specular * diffuseCoefficient * light.color;
          color += 0.3 * (mat.ambient * light.color) * occlusion;
          color += (fresnel * light.color) * occlusion;

          // gamma correction must occur before light attenuation
          // which means it must be applied on a per-light basis unfortunately
          vec3 gammaCorrectedColor = pow( color, vec3( 1./2.2 ) );
          vec3 attenuatedColor = 2. * gammaCorrectedColor * attenuation; 

          outputColor += attenuatedColor;
        }

        return outputColor;
      }`
   
      return str
    }
  }

  return Light
}

module.exports = Lights

// old lighting
/*
      vec3 lightingOld( vec3 pos, vec3 nor, vec3 ro, vec3 rd ) {
        vec3  ref = reflect( rd, nor ); // reflection angle
        float occ = calcAO( pos, nor );
        vec3  lig = normalize( vec3( -0.6, 0.7, -0.5 ) ); // light position
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

        vec3 brdf = vec3( 0.0 );
        brdf += 1.20 * dif * vec3( 1.00,0.90,0.60 );
        brdf += 2.20 * spe * vec3( 1.00,0.90,0.60 ) * dif;
        brdf += 0.30 * amb * vec3( 0.50,0.70,1.00 ) * occ;
        brdf += 0.40 * dom * vec3( 0.50,0.70,1.00 ) * occ;
        brdf += 0.70 * bac * vec3( 0.25 ) * occ;
        brdf += 0.40 * fre * occ;

        return brdf;
      }
*/
