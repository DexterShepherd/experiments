const regl = require('regl')()

const radius = 2048

const reactionParams = {
  diffusion: {
    a: 1.384892317009904,
    b: 1.861198901292049,
  },
  feed: 0.006555690359198,
  kill: 0.2780614695012526
}

// const reactionParams = {
//   diffusion: {
//     a: 1.0,
//     b: 0.5,
//   },
//   feed: 0.055,
//   kill: 0.062
// }

const state = (Array(2)).fill().map(() =>
  regl.framebuffer({
    color: regl.texture({
      radius: radius,
      data: initState(radius, 1),
      wrap: 'repeat'
    }),
    depthStencil: false
  }))

let lastTime = 0;

const updateLife = regl({
  frag: `
  precision mediump float;
  uniform sampler2D prevState;
  uniform mat3 weights;
  uniform mat3 neighX;
  uniform mat3 neighY;
  uniform float diffusionA;
  uniform float diffusionB;
  uniform float feed_rate;
  uniform float kill_rate;
  uniform float delta;

  uniform float time, viewportWidth, viewportHeight, viewportRatio, neighborX, neighborY;
  varying vec2 uv;

  vec2 laplace() {
    vec4 s = texture2D(prevState, uv);
    vec2 sum = vec2(0.0);

    for( int x = 0; x < 3; x++ ) {
      for( int y = 0; y < 3; y++ ) {

        vec4 n = texture2D(prevState, uv + vec2(neighX[x][y], neighY[x][y]) / float(${radius}));
        sum.x += n.r * weights[x][y];
        sum.y += n.g * weights[x][y];
      }
    }
    return sum;

  }
  
  void main() {
    // vec4 s = texture2D(prevState, uv);
    // vec2 lap = laplace();
    // float reaction = s.r * s.g * s.g;
    // float a = (s.r +
    //           (diffusionA * lap.x * lap.x) -
    //           reaction +
    //           (feed * (1.0 - s.r)));

    // float b = (s.g +
    //           (diffusionB * lap.y * lap.y) +
    //           reaction -
    //           ((kill + feed) * s.g));

    // a = clamp(a, 0.0, 1.0);
    // b = clamp(b, 0.0, 1.0);
    
    vec4 center = texture2D(prevState, uv);
    float a = center.x;
    float b = center.y;

    vec2 lap = laplace();

    // vec4 adjacentNeighbors = 0.20 * (
    //   texture2D(prevState, uv + vec2(neighborX, 0.0)) +
    //   texture2D(prevState, uv + vec2(0.0, neighborY)) +
    //   texture2D(prevState, uv + vec2(-neighborX, 0.0)) +
    //   texture2D(prevState, uv + vec2(0.0, -neighborY))
    // );

    // vec4 cornerNeighbors = 0.05 * (
    //   texture2D(prevState, uv + vec2(neighborX, neighborY)) +
    //   texture2D(prevState, uv + vec2(neighborX, -neighborY)) +
    //   texture2D(prevState, uv + vec2(-neighborX, -neighborY)) +
    //   texture2D(prevState, uv + vec2(-neighborX, neighborY))
    // );

    // float laplacianA =  -a + adjacentNeighbors.x + cornerNeighbors.x;
    // float laplacianB =  -b + adjacentNeighbors.y + cornerNeighbors.y;
    float reaction = a * b * b;
    float feed = (feed_rate) * (1.0 - a);
    float kill = (kill_rate + feed_rate) * b;

    gl_FragColor = vec4(
      a + 0.001 + (diffusionA * lap.x - reaction + feed),
      b + (diffusionB * lap.y + reaction - kill),
      0.0,
      1.0
    );
  }
  `,

  framebuffer: ({tick}) => state[(tick + 1) % 2],

  uniforms: {
    weights: [
      0.05, 0.20, 0.05,
      0.3, -1.0, 0.1,
      0.05, 0.2, 0.05
    ],
    neighX: [
      -1, 0, 1,
      -1, 0, 1,
      -1, 0, 1
    ],
    neighY: [
      -1, -1, -1,
      0, 0, 0,
      1, 1, 1
    ],
    diffusionA: reactionParams.diffusion.a,
    diffusionB: reactionParams.diffusion.b,
    kill_rate: reactionParams.kill,
    feed_rate: reactionParams.feed,
    time: ({tick}) => 0.001 * tick,
    viewportWidth: regl.context('viewportWidth'),
    viewportHeight: regl.context('viewportHeight'),
    viewportRatio: ({viewportWidth, viewportHeight}) => viewportHeight / viewportWidth,
    neighborX: ({viewportWidth}) => 1 / viewportWidth,
    neighborY: ({viewportHeight}) => 1 / viewportHeight
  }
})

const setupQuad = regl({
  frag: `
  precision mediump float;
  uniform sampler2D prevState;
  varying vec2 uv;
  
  void main() {
    vec4 s = texture2D(prevState, uv);
    vec4 sN = texture2D(prevState, uv + vec2(1.0, 1.0) / float(${radius}));
    float color = (s.r - sN.r) - (s.g - sN.g);
    // gl_FragColor = vec4(clamp(vec3(s.r - s.g), 0.0, 1.0), 1.0);
    // gl_FragColor = s;
    if(color == 0.0) {
      gl_FragColor = vec4(vec3(255, 145, 206) / 255.0, 1);
    } else {
      gl_FragColor = vec4(color * color * color, sN.r * sN.r + s.g, sN.g + s.r, 1);
    }
  }`,

  vert: `
  precision mediump float;
  attribute vec2 position;
  varying vec2 uv;
  void main() {
    uv = 0.5 * (position + 1.0);
    gl_Position = vec4(position, 0, 1);
  }`,

  attributes: {
    position: [ -4, -4, 4, -4, 0, 4 ]
  },

  uniforms: {
    prevState: ({tick}) => state[tick % 2]
  },

  depth: { enable: false },

  count: 3
})

regl.frame(() => {
  setupQuad(() => {
    regl.draw()
    updateLife()
  })
})

function initState(rad, seedSize) {
  let temp = []
  for( let i = 0; i < rad; i += 1 ) {
    for( let j = 0; j < rad; j += 1 ) {
      let cell = [255.0, 0.0, 0.0, 255.0]
      if (( i > Math.floor( rad / 2 ) - seedSize) &&
        (i < Math.floor( rad / 2 ) + seedSize) &&
        (j > Math.floor( rad / 2 ) - seedSize) &&
        (j < Math.floor( rad / 2 ) + seedSize)) {
        cell = [255.0, 255.0, 0.0, 255.0]
      }
      for( let k = 0; k < 4; k += 1 ) {
        temp.push(cell[k])
      }
    }
  }
  return temp
}
