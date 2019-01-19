# marching.js

[Playground](https://charlieroberts.github.io/marching/playground/)

![Screenshot](https://raw.github.com/charlieroberts/marching/screenshots/crazyball.png) 

Marching.js is a JavaScript shader compiler specifically focused on ray marching via signed distance functions. The goals of this project are:

- Expose beginning programmers to constructive solid geometry (CSG) concepts
- Enable JS programmers to explore CSG without having to learn GLSL
- Provide a terse API suitable for live coding performance

The project borrows code from [the glslify project](https://github.com/glslify/glslify) as well as code originally written by [Chi Shen](http://shenchi.github.io).

## Development
The library is compiled using gulp. Run `npm install` to install all necessary dependencies, and then `gulp build` to rebuild the library.
