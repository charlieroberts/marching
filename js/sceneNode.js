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
  }
}

module.exports = SceneNode
