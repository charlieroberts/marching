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
  }
}

module.exports = SceneNode
