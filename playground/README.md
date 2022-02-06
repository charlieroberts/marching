To build the marching.js playground, run the following command from the top level of this repo (*not* from within the playground directory):

`npx browserify playground/environment.js -o playground/playground.bundle.js`

You can then start a server in the top level:

`npx http-server . -p 10000`

... and access the page at `http://localhost:10000/playground/index.htm`
