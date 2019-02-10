const SceneNode = require( './sceneNode.js' ),
      { param_wrap, MaterialID } = require( './utils.js' ),
      { Var, float_var_gen, vec2_var_gen, vec3_var_gen, vec4_var_gen } = require( './var.js' ),
      { Vec2, Vec3, Vec4 } = require( './vec.js' )


const glsl = require( 'glslify' )

const __Materials = function( SDF ) {

  const Materials = {
    materials:[],
    __materials:[],
    modeConstants : [
      'global',
      'normal',
      'phong',
      'orenn'
    ],

    default: 'global',

    addMaterial( mat ) {
      if( mat === undefined ) mat = Materials.material.default

      if( Materials.materials.indexOf( mat ) === -1 ) {
        mat.id = MaterialID.alloc()

        // we have to dirty the material so that its data
        // will be uploaded to new shaders, otherwise the
        // material will only work the first time it's used, when
        // it's dirty on initialization.
        Materials.dirty( mat )

        Materials.materials.push( mat )
      } 

      return mat
    },

    material( mode='global', __ambient, __diffuse, __specular, __shininess, __fresnel ){
      let modeIdx = Materials.modeConstants.indexOf( mode )
      if( modeIdx === -1 ) {
        console.warn( `There is no material type named ${mode}. Using the default material, ${Materials.default}, instead.` )
        mode = Materials.default
        modeIdx = Materials.modeConstants.indexOf( mode )
      }

      const ambient = param_wrap( __ambient, vec3_var_gen(.1,.1,.1) )
      const diffuse = param_wrap( __diffuse, vec3_var_gen(0,0,1) )
      const specular = param_wrap( __specular, vec3_var_gen(1,1,1) )
      const shininess = param_wrap( __shininess, float_var_gen(8) )
      const fresnel   = param_wrap( __fresnel, vec3_var_gen(0,1,2) )

      const mat = { mode, ambient, diffuse, specular, shininess, fresnel, id:MaterialID.alloc() }
      
      return mat 
    },

    dirty( mat ) {
      mat.ambient.dirty = true
      mat.diffuse.dirty = true
      mat.specular.dirty = true
      mat.shininess.dirty = true
      mat.fresnel.dirty = true
    },
   
    emit_materials() {
      if( this.materials.length === 0 ) return this.defaultMaterials

      let str = `Material materials[${this.materials.length}] = Material[${this.materials.length}](`

      this.materials.sort( (a,b) => a.id > b.id ? 1 : -1 ) 

      for( let mat of this.materials ) {
        const fresnel = `Fresnel( ${f(mat.fresnel.x)}, ${f(mat.fresnel.y)}, ${f(mat.fresnel.z)} )`

        str += `\n        Material( ${this.modeConstants.indexOf( mat.mode )}, ${mat.ambient.emit()}, ${mat.diffuse.emit()}, ${mat.specular.emit()}, ${mat.shininess.emit()}, ${mat.fresnel.emit()} ),` 
      }
      
      str = str.slice(0,-1) // remove trailing comma

      str += '\n      );'

      this.__materials = this.materials.slice( 0 )
      this.materials.length = 0

      return str
    },

    emit_decl() {
      let str = ''
      for( let mat of this.__materials ) {
        str += mat.ambient.emit_decl()
        str += mat.diffuse.emit_decl()
        str += mat.specular.emit_decl()
        str += mat.shininess.emit_decl()
        str += mat.fresnel.emit_decl()
      }

      return str
    },

    update_location( gl, program ) {
      for( let mat of this.__materials ) {
        if( mat.ambient.dirty === true )   mat.ambient.update_location( gl, program )
        if( mat.diffuse.dirty === true )   mat.diffuse.update_location( gl, program )
        if( mat.specular.dirty === true )  mat.specular.update_location( gl, program )
        if( mat.shininess.dirty === true ) mat.shininess.update_location( gl, program )
        if( mat.fresnel.dirty === true )   mat.fresnel.update_location( gl, program )
      }
    },

    upload_data( gl, program='' ) {
      for( let mat of this.__materials ) {
        if( mat.ambient.dirty === true )   mat.ambient.upload_data( gl, program )
        if( mat.diffuse.dirty === true )   mat.diffuse.upload_data( gl, program )
        if( mat.specular.dirty === true )  mat.specular.upload_data( gl, program )
        if( mat.shininess.dirty === true ) mat.shininess.upload_data( gl, program )
        if( mat.fresnel.dirty === true )   mat.fresnel.upload_data( gl, program )
      }
    }

  }

  const f = value => value % 1 === 0 ? value.toFixed(1) : value 

  Object.assign( Materials.material, {
    default : Materials.material( 'global', Vec3( .15 ), Vec3(0), Vec3(1), 8, Vec3( 0, 1, .5 ) ),  
    red     : Materials.material( 'global', Vec3(.25,0,0), Vec3(1,0,0), Vec3(0), 2, Vec3(0) ),
    green   : Materials.material( 'global', Vec3(0,.25,0), Vec3(0,1,0), Vec3(0), 2, Vec3(0) ),
    blue    : Materials.material( 'global', Vec3(0,0,.25), Vec3(0,0,1), Vec3(0), 2, Vec3(0) ),
    cyan    : Materials.material( 'global', Vec3(0,.25,.25), Vec3(0,1,1), Vec3(0), 2, Vec3(0) ),
    magenta : Materials.material( 'global', Vec3(.25,0,.25), Vec3(1,0,1), Vec3(0), 2, Vec3(0) ),
    yellow  : Materials.material( 'global', Vec3(.25,.25,.0), Vec3(1,1,0), Vec3(0), 2, Vec3(0) ),
    black   : Materials.material( 'global', Vec3(0, 0, 0), Vec3(0,0,0), Vec3(0), 2, Vec3(0) ),
    white   : Materials.material( 'global', Vec3(.25), Vec3(1), Vec3(1), 2, Vec3(0) ),
    grey    : Materials.material( 'global', Vec3(.25), Vec3(.33), Vec3(1), 2, Vec3(0) ),

    'white glow' : Materials.material( 'phong',  Vec3(.015), Vec3(1), Vec3(1), 16, Vec3(0,200,5) ),

    normal  : Materials.material( 'normal' )
  })

  return Materials
}

module.exports = __Materials
