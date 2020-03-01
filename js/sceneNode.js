const SceneNode = ()=> Object.create( SceneNode.prototype )
const Matrix = require( './external/matrix.js' )

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

  rotateBy( angle,x,y,z ) {
    this.transform.__rotations.push( Matrix.rotate( angle,x,y,z ) )
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
  },

  texture( tex,props ) {
    this.__setTexture( tex,props )
    return this
  },

  bump( tex,strength ) {
    this.__setBump( tex,strength )
    return this
  }
}

const ops = [ 'repeat', 'polarRepeat', 'elongation' ]

ops.forEach( op => {
  const constructorName = op[0].toUpperCase() + op.slice(1)
  SceneNode.prototype[ op ] = function( ...args ) {
    this[ op ] = this[ op ].bind( this )
    Object.assign( this[ op ], SceneNode.prototype )
    this.__target = this[ op ]
    this[ '__'+op ] = Marching[ constructorName ]( this, ...args, this[ op ] )
    this[ op ].transform = this[ '__'+op ].transform
    return this
  }
})

module.exports = SceneNode
