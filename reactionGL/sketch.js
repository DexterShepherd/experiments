const regl = require('regl')()

const radius = 256

// const reactionParams = {
//   diffusion: {
//     a: 1.384892317009904,
//     b: 1.861198901292049,
//   },
//   feed: 0.006555690359198,
//   kill: 0.2780614695012526
// }

const reactionParams = {
  diffusion: {
    a: 1.0,
    b: 0.5,
  },
  feed: 0.055,
  kill: 0.0062
}

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
  uniform float diffusionA;
  uniform float diffusionB;
  uniform float kill;
  uniform float feed;
  uniform float delta;
  varying vec2 uv;

  vec2 laplace() {
    vec2 sum = vec2(0.0);
    for( int x = -1; x < 2; x++ ) {
      for( int y = -1; y < 2; y++ ) {
        vec4 n = texture2D(prevState, uv + vec2(x, y) / float(${radius}));
        sum.x += n.r * weights[x + 1][y + 1];
        sum.y += n.g * weights[x + 1][y + 1];
      }
    }
    return sum;
  }
  
  void main() {
    vec4 s = texture2D(prevState, uv);
    vec2 lap = laplace();
    float reaction = s.r * s.g * s.g;
    float a = (s.r +
              (diffusionA * lap.x * lap.x) -
              reaction +
              (feed * (1.0 - s.r)));

    float b = (s.g +
              (diffusionB * lap.y * lap.y) +
              reaction -
              ((kill + feed) * s.g));

    a = clamp(a, 0.0, 1.0);
    b = clamp(b, 0.0, 1.0);

    gl_FragColor = vec4(a, b, 0, 1.0);
  }
  `,

  framebuffer: ({tick}) => state[(tick + 1) % 2],

  uniforms: {
    weights: [
      0.05, 0.2, 0.05,
      0.2, -1.0, 0.2,
      0.05, 0.2, 0.05
    ],
    diffusionA: reactionParams.diffusion.a,
    diffusionB: reactionParams.diffusion.b,
    kill: reactionParams.kill,
    feed: reactionParams.feed,
    delta: ({time}) => time - lastTime
  }
})

const setupQuad = regl({
  frag: `
  precision mediump float;
  uniform sampler2D prevState;
  varying vec2 uv;
  
  void main() {
    vec4 s = texture2D(prevState, uv);
    // gl_FragColor = vec4(clamp(vec3(s.g - s.r), 0.0, 1.0), 1.0);
    gl_FragColor = s;
    // gl_FragColor = vec4(1, 0, 0, 1);
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
