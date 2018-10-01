const SceneNode = require( './sceneNode.js' ),
      { param_wrap, MaterialID } = require( './utils.js' ),
      { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen } = require( './var.js' ),
      { Vec2, Vec3, Vec4 } = require( './vec.js' )


const glsl = require( 'glslify' )

const __Materials = function( SDF ) {

  const Materials = {
  //  emit() {
  //    return `  color = applyMaterial( color, t.x, ${this.amount.emit()} );`
  //  },
   
  //  emit_decl() {
  //    let str = this.amount.emit_decl() + this.color.emit_decl()
  //    const preface = `  vec3 applyMaterial( in vec3 rgb, in float distance, in float amount ) {
  //  float materialAmount = 1. - exp( -distance * amount );
  //  vec3  materialColor  = ${this.color.emit()};
  //  return mix( rgb, materialColor, materialAmount );
  //}
  //`
  //    if( SDF.memo.material === undefined ) {
  //      str = str + preface
  //      SDF.memo.material = true
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
    __materials:[],
    materials:[],
/*      struct Material {
        vec3 ambient;
        vec3 diffuse;
        vec3 specular;
        float shininess;
        Fresnel fresnel;
        };  */

    defaultMaterials:`
      Material materials[2] = Material[2](
        Material( 0, vec3( .15 ), vec3(0.,0.,0.), vec3(1.), 8., Fresnel( 0., 1., 4.) ),
        Material( 0, vec3( .05 ), vec3(1.,0.,0.), vec3(1.), 8., Fresnel( 0., 1., 4.) )
      );
    `,

    material( mode=0, ambient=Vec3(.05), diffuse=Vec3(0,0,1), specular=Vec3(1,1,1), shininess=8, fresnel=Vec3(0,1,2) ){
      const mat = { mode, ambient, diffuse, specular, shininess, fresnel, id:MaterialID.alloc() }
      Materials.materials.push( mat )
      
      return mat 
    },
   
    emit_materials() {
      if( this.materials.length === 0 ) return this.defaultMaterials

      let str = `Material materials[${this.materials.length}] = Material[${this.materials.length}](`

      this.materials.sort( (a,b) => a.id > b.id ? 1 : -1 ) 

      for( let mat of this.materials ) {
        const ambient = `vec3( ${f(mat.ambient.x)}, ${f(mat.ambient.y)}, ${f(mat.ambient.z)} )`
        const diffuse = `vec3( ${f(mat.diffuse.x)}, ${f(mat.diffuse.y)}, ${f(mat.diffuse.z)} )`
        const specular = `vec3( ${f(mat.specular.x)}, ${f(mat.specular.y)}, ${f(mat.specular.z)} )`
        const fresnel = `Fresnel( ${f(mat.fresnel.x)}, ${f(mat.fresnel.y)}, ${f(mat.fresnel.z)} )`

        console.log( 'mode:', mat.mode )

        str += `\n        Material( ${mat.mode}, ${ambient}, ${diffuse}, ${specular}, ${f(mat.shininess)}, ${fresnel} ),` 
      }
      
      str = str.slice(0,-1) // remove trailing comma

      str += '\n      );'

      return str
    },
  }

  const f = value => value % 1 === 0 ? value.toFixed(1) : value 

  Object.assign( Materials.material, {
    green : Materials.material( 0, Vec3(0,.25,0), Vec3(0,1,0), Vec3(0), 2, Vec3(0) ),
    red   : Materials.material( 0, Vec3(.25,0,0), Vec3(1,0,0), Vec3(0), 2, Vec3(0) ),
    blue  : Materials.material( 0, Vec3(0,0,.25), Vec3(0,0,1), Vec3(0), 2, Vec3(0) ),
    cyan  : Materials.material( 0, Vec3(0,.25,.25), Vec3(0,1,1), Vec3(0), 2, Vec3(0) ),
    magenta  : Materials.material( 0, Vec3(.25,0,.25), Vec3(1,0,1), Vec3(0), 2, Vec3(0) ),
    yellow : Materials.material( 0, Vec3(.25,.25,.0), Vec3(1,1,0), Vec3(0), 2, Vec3(0) ),
    black : Materials.material( 0, Vec3(0, 0, 0), Vec3(0,0,0), Vec3(0), 2, Vec3(0) ),
    white: Materials.material( 0, Vec3(.25), Vec3(1), Vec3(1), 2, Vec3(0) ),
    grey : Materials.material( 0, Vec3(.25), Vec3(.33), Vec3(1), 2, Vec3(0) )
  })

  return Materials
}

module.exports = __Materials
