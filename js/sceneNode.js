// SceneNode

let SceneNode = ()=> Object.create( SceneNode.prototype )

SceneNode.prototype = {
	emit() { return "#NotImplemented#"; },

	emit_decl() { return ""; },

	update_location(gl, program) {},

  upload_data(gl) {},

  getID() {
    let id = this.id

    if( id === undefined && this.sdf !== undefined ) {
      id = this.sdf.getID()
    }

    return id
  },

  getCenter() {
    let center = this.center

    if( center === undefined && this.sdf !== undefined ) {
      if( this.sdf.getCenter === undefined ) {
        center = this.sdf.__wrapped.getCenter()
      }else{
        center = this.sdf.getCenter()
      }
    }

    return center
  },

  move( ...args ) {
    return this.translate( ...args )
  },

  rotate( angle, x,y,z ) {
    this.transform.rotation.angle = angle
    if( x !== undefined ) this.transform.rotation.axis.x = x
    if( y !== undefined ) this.transform.rotation.axis.y = y
    if( z !== undefined ) this.transform.rotation.axis.z = z
  
    return this
  },

  translate( x,y,z ) {
    if( x !== undefined && x !== null ) this.transform.translation.x = x
    if( y !== undefined && y !== null ) this.transform.translation.y = y
    if( z !== undefined && z !== null ) this.transform.translation.z = z
  
    return this
  },

  scale( amount ) {
    if( amount !== undefined ) this.transform.scale = amount
    return this
  },

  material( mat ) {
    this.__setMaterial( mat )
    return this
  }
}

module.exports = SceneNode
