module.exports = `zigzag = Box(.5)
  .move( -2,1.25 )
  .texture(
    'zigzag', 
    { scale:5 }
  )
 
dots = Box(.5)
  .move( -0,1.25 )
  .texture(
    'dots', 
    { 
      scale:10, 
      color:[1,0,0]
    }
  )
 
noise = Box(.5)
  .move( 2,1.25 )
  .texture(
    'noise', 
    { 
      wrap:true, 
      scale:20, 
      color:[1,0,0]
    }
)
 
truchet = Box(.5)
  .move( -2,-.15 )
  .texture(
    'truchet', 
    { 
      scale:20, 
      color:[0,1,1] 
    }
)
 
stripes = Box(.5)
  .move( -0,-.15)
  .texture(
    'stripes', 
    { 
      scale:10, 
      color:[1,0,0]
    }
)
 
checkers = Box(.5)
  .move( 2, -.15 )
  .texture(
    'checkers', 
    { 
      scale:20, 
      color1:[0,1,1], 
      color2:[1,0,0] 
    }
  )
 
cellular = Box(.5)
  .move( -2, -1.55 )
  .texture(
    'cellular', 
    { 
      scale:10, 
      strength:1 
    }
)
 
voronoi= Box(.5)
  .move( 2,-1.55 )
  .texture(
    'voronoi', 
    { 
      wrap:true, 
      scale:10, 
      mode:2 
    }
)
 
bg = Plane( Vec3(0,0,1), .5 ).material('white glow')
 
march( 
  zigzag, dots, noise, 
  truchet, stripes, cellular, 
  checkers, voronoi, bg
)
.render()` 
