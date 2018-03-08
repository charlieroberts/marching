// SceneNode

let SceneNode = ()=> Object.create( SceneNode.prototype )

SceneNode.prototype = {
	emit() { return "#NotImplemented#"; },

	emit_decl() { return ""; },

	update_location(gl, program) {},

	upload_data(gl) {}
}

module.exports = SceneNode
