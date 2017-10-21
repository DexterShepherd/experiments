// presets
// {"diffusion":{"a":2.908821306686554,"b":2.064894557538544},"feed":0.23267924886401412,"kill":0.3196840142813681}
// {"diffusion":{"a":1.594889698745263,"b":2.015037272400598},"feed":0.4854550847605263,"kill":0.37716790250970805}
//
// {"diffusion":{"a":1.384892317009904,"b":1.8611989012920418},"feed":0.006555690359197998,"kill":0.2780614695012526}


const p5 = require('p5');

new p5(p => {
  let cells, num_cols, num_rows,
      diffusion, feed, kill,
      cellW, cellH;


  p.setup = function() {
    const canvas = p.createCanvas(800, 800);

    // let params = {
    //   diffusion: {
    //     a: p.random(0.01, 10),
    //     b: p.random(0.01, 20)
    //   },
    //   feed: p.random(0.001, 0.5),
    //   kill: p.random(0.001, 0.5),
    // }
    
    // let params = {"diffusion":{"a":1.594889698745263,"b":2.015037272400598},"feed":0.4854550847605263,"kill":0.37716790250970805}

    let params = {"diffusion":{"a":1.384892317009904,"b":1.8611989012920418},"feed":0.006555690359197998,"kill":0.2780614695012526}
    console.log(JSON.stringify(params))

    cells = [];
    num_cols = 200;
    num_rows = 200;

    cellW = p.width / num_cols;
    cellH = p.height / num_rows;

    diffusion = params.diffusion;
    feed = params.feed;
    kill = params.kill;

    p.colorMode(p.HSB)


    p.noStroke();
    p.fill(0);

    for(let i = 0; i < num_cols; i++) {
      cells[i] = []
      for(let j = 0; j < num_rows; j++) {
        cells[i][j] = new Cell({ a: 1.0, b: 0.0 }, p.createVector((p.width/num_cols) * i, (p.height/num_rows) * j), i, j);
      }
    }
    seed();
  }

  p.draw = function() {
    p.background(100);
    p.translate((p.width/num_cols)/2, (p.height/num_rows)/2)

    for(let i = 0; i < num_cols; i++) {
      for(let j = 0; j < num_rows; j++) {
        cells[i][j].update();
      }
    }

    for(let i = 0; i < num_cols; i++) {
      for(let j = 0; j < num_rows; j++) {
        cells[i][j].display();
      }
    }

    // if(p.frameRate % 10 == 0) {
    //   cells.push(cells[0]);
    //   cells.shift();
    // }

    // p.save(p.frameCount + '.png')
  }

  function seed() {
    for(let i = -5; i < 5; i++) {
      for(let j = -5; j < 5; j++) {
        cells[ Math.floor(num_cols / 2) + i][ Math.floor(num_rows / 2) + j].state = { a: 0.0, b: 0.1 }
      }
    }
  }

  let Cell = function(state, loc, x, y) {
    this.loc = loc;
    this.state = state;
    this.next = state;
    this.x = x;
    this.y = y;
    this.neighborhood = [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0],  [0, 0],  [1, 0],
      [-1, 1],  [0, 1],  [1, 1]
    ];

    this.weights = [
      0.05, 0.2, 0.05,
      0.2, -1.0,  0.3,
      0.05, 0.2, 0.05
    ];
    
    this.update = function() {
      let lap = this.laplace()
      this.next.a = this.state.a + (diffusion.a * lap.a) - (this.state.a * this.state.b * this.state.b) +
                                     (feed * (1.0 - this.state.a));
      this.next.b = this.state.b + (diffusion.b * lap.b) + (this.state.a * this.state.b * this.state.b) -
                                     ((kill + feed) * this.state.b);
      this.next.a = p.constrain(this.next.a, 0, 1)
      this.next.b = p.constrain(this.next.b, 0, 1)
    }

    this.display = function() {
      let n = cells[loopX(this.x + 1)][loopY(this.y + 1)]
      let colA = p.constrain(this.next.a - this.next.b, 0, 1)
      let colB = p.constrain(n.next.a - n.next.b, 0, 1)
      p.fill(p.abs(colA - colB) * 255)
      p.rect(this.loc.x, this.loc.y, cellW, cellH);

      const temp = this.state;
      this.state = this.next;
      this.next = temp;
    }

    this.displayDiff = function() {
      let n = cells[loopX(this.x + 1)][loopY(this.y)]
      let colA = p.constrain(this.next.a - this.next.b, 0, 1)
      let colB = p.constrain(n.next.a - n.next.b, 0, 1)
      p.fill(p.abs(colA - colB) * 255)
      p.rect(this.loc.x, this.loc.y, cellW, cellH);

      const temp = this.state;
      this.state = this.next;
      this.next = temp;
    }
    this.laplace = function() {
      let sum = { a: 0, b: 0 };
      for(let i = 0; i < this.neighborhood.length; i++) {
        const cell = cells[loopX(this.x + this.neighborhood[i][0])][loopY(this.y + this.neighborhood[i][1])]
        sum.a += (cell.state.a * this.weights[i]);
        sum.b += (cell.state.b * this.weights[i]);
      }
      return sum;
    }

  }
  
  function loopX(x){
    return (x + num_cols) % num_cols;
  }

  function loopY(y){
    return (y + num_rows) % num_rows;
  }
});
