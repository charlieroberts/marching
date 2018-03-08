'use strict'

const SDF = {
  main: require( './main.js' ),
  init( canvas, sizingScalar ) {
    this.main.init( canvas, sizingScalar )
  },
  export( obj ) {
    this.main.export( obj )
    obj.march = this.main.createScene.bind( this.main )
  },

}

window.SDF = SDF 

module.exports = SDF 
