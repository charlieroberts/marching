const osc = require( 'osc/dist/osc-browser' ),
      { Vec2, Vec3, Vec4 } = require( './vec.js' )

function unpackArg( arg ) {
  if( Array.isArray( arg ) )
    return Vec4( arg.map( a => a.value ) )

  return arg.value
}

const OSC = {
  client: null,

  start( url ) {
    console.log("STARTING", url)
    OSC.client = new osc.WebSocketPort({ url, metadata: true, unpackSingleArgs: true })
    OSC.client.on( 'message', OSC.messageCallback )
    OSC.client.open()
    console.log("STARTING", OSC.client)
  },

  stop() {
    OSC.client.close()
  },

  messageCallback(message) {
    const parts = message.address.split('/')

    let object = window
    for( const part of parts.slice( 1, -1 ) ) {
      object = object[part]

      if( !object ) {
        throw new Error( `can't handle OSC message ${message.address}: no such key '${part}'` )
      }
    }

    const key = parts[parts.length - 1]
    switch( key ) {
      /* methods */
      case 'translate':
      case 'rotate':
      case 'scale':
      case 'fog':
      case 'material':
        object[key].apply( object, message.args.map( unpackArg ) )
        break

      /* variables */
      default: {
        const old = object[key]

        if( !old ) {
          throw new Error( `can't handle OSC message ${message.address}: no such key ${key}` )
        }

        switch( old.type ) {
          case 'int':
          case 'float':
            object[key] = message.args.value
            break

          case 'vec2':
          case 'vec3':
          case 'vec4':
            object[key] = Vec4( message.args.map( a => a.value ) )
            break

          default:
            throw new Error( `can't handle OSC message ${message.address}: type ${old.type}` )
        }
      }
    }
  }
}

module.exports = OSC
