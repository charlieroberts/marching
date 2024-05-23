# marching.js

[Online Playground (Chrome/Firefox)](https://charlieroberts.github.io/marching/playground/)    
[Atom plugin](https://atom.io/packages/atom-marching)   
[Reference](https://charlieroberts.github.io/marching/docs/index.html)   

[![Screenshot](https://i.postimg.cc/P5HWp4bm/Screen-Shot-2022-02-08-at-8-55-03-PM.png)](https://postimg.cc/vcPgC5NB)
Marching.js is a JavaScript shader compiler specifically focused on ray marching via signed distance functions. The goals of this project are:

- Expose beginning programmers to constructive solid geometry (CSG) concepts
- Enable JS programmers to explore CSG without having to learn GLSL
- Provide a terse API suitable for live coding performance

Marching.js builds on the [work of many other people](https://github.com/charlieroberts/marching/blob/master/CREDITS.markdown).

## Development
The library is compiled using gulp. Run `npm install` to install all necessary dependencies, and then `npm run build` to build the library.
