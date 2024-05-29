const SceneNode = ()=> Object.create( SceneNode.prototype )
const Matrix = require( './external/matrix.js' )

SceneNode.prototype = {
  active: 1,

  // register functions passed as property values
  // to callbacks, and assign initial value by
  // running the function
  __processFunction( obj, value, name, shouldAdd=false ) {
    if( typeof value === 'function' ) {
      const __value = value
      let fnc = null

      if( typeof obj[ name ] === 'function' ) {
        fnc = t => obj[ name ]( __value( t ) ) 
      }else{
        fnc = shouldAdd 
          ? t => obj[ name ] += __value( t )
          : t => obj[ name ] =__value( t )  
      }

      Marching.postrendercallbacks.push( fnc )

      value = value( 0 )
    }

    return value
  },

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

  moveBy( x,y,z ) {
    x = this.__processFunction( this.transform.translation, x, 'x', true )
    y = this.__processFunction( this.transform.translation, y, 'y', true )
    z = this.__processFunction( this.transform.translation, z, 'z', true )

    if( x !== undefined && x !== null ) this.transform.translation.x += x
    if( y !== undefined && y !== null ) this.transform.translation.y += y
    if( z !== undefined && z !== null ) this.transform.translation.z += z

    return this
  },
  
  rotate( angle, x,y,z ) {
    angle = this.__processFunction( this.transform.rotation, angle, 'angle' )
    this.transform.rotation.angle = angle

    x = this.__processFunction( this.transform.rotation.axis, x, 'x' )
    y = this.__processFunction( this.transform.rotation.axis, y, 'y' )
    z = this.__processFunction( this.transform.rotation.axis, z, 'z' )
    if( x !== undefined ) this.transform.rotation.axis.x = x
    if( y !== undefined ) this.transform.rotation.axis.y = y
    if( z !== undefined ) this.transform.rotation.axis.z = z
  
    return this
  },

  rotateX( angle ) {
    angle = this.__processFunction( this.transform.rotation, angle, 'angle' )
    this.transform.rotation.angle = angle


  },

  rotateBy( angle,x,y,z ) {
    this.transform.__rotations.push( Matrix.rotate( angle,x,y,z ) )
    return this
  },

  translate( x,y,z ) {
    x = this.__processFunction( this.transform.translation, x, 'x' )
    y = this.__processFunction( this.transform.translation, y, 'y' )
    z = this.__processFunction( this.transform.translation, z, 'z' )
    if( x !== undefined && x !== null ) this.transform.translation.x = x
    if( y !== undefined && y !== null ) this.transform.translation.y = y
    if( z !== undefined && z !== null ) this.transform.translation.z = z
  
    return this
  },

  scale( amount ) {
    amount = this.__processFunction( this, amount, 'scale' )
    if( amount !== undefined ) this.transform.scale = amount
    return this
  },

  scaleBy( amount ) {
    amount = this.__processFunction( this, amount, 'scaleBy' )
    if( amount !== undefined ) this.transform.scale += amount
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
