'use strict'

const Marching = require( './main.js' )

Marching.__export = Marching.export
Marching.export = obj => {
  obj.march = Marching.createScene.bind( Marching )
  Marching.__export( obj )
}

window.Marching = Marching

module.exports = Marching
