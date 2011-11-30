var Gummy = {};

Gummy.Game = Constructor.extend(function(config) {
  config || (config = {});
  this.el = config.el;
  this.timer = new Gummy.Timer(config.fps || 30);
  this.paused = true;
  this.stages = {};
}, {
  
  stage: function(id, piece) {
    var stage = this._ensure_stage(id);
    stage.add(piece);
  },
  
  _ensure_stage: function(id) {
    
    var stage = this.stages[id];
    if (!stage) { 
      
      var el = document.getElementById(id);
      if (!el) {
        el = document.createElement('canvas');
        el.setAttribute('id', id);
        el.height = this.el.getAttribute('height');
        el.width = this.el.getAttribute('width');
        this.el.appendChild(el);
      }
      
      stage = new Gummy.Stage(el);
      stage.game = game;
      this.stages[stage.id] = stage;
    }
    
    return stage;
  },
  
  start: function() {
    this.paused = false;
    this.tick();
  },
  
  pause: function() {
    this.paused = true;
    this.timer.pause();
  },
  
  tick: function() {
      
    if (this.paused) return;  
      
    var self = this,
        timer = this.timer,
        stages = this.stages,
        key;

    for (key in stages) {
      stages[key]
        .tick(timer.coefficient);
    }
    
    timer.process();

    window.setTimeout(function() {
      self.tick();
    }, 1000 / timer.interval);
  },

});

Gummy.Stage = function(canvas) {
  this.canvas = canvas;
  this.id = canvas.id;
  this.ctx = canvas.getContext('2d');
  this.pieces = [];
};

Gummy.Stage.prototype = {
  
  tick: function(coeff) {
    this.pieces.forEach(function(p) { p.tick(coeff); });
  },
  
  add: function(piece) {
    piece.stage = this;
    this.pieces.push(piece);
  },

  remove: function(o) {
    var found = this.find(o.id);
    this.pieces.splice(found.index, 1);
  },

  find: function(id) {
    
    var found = false;
    
    this.pieces.forEach(function(p, i) { 
      if (p.id === id) {
        
        found = {
          piece: p,
          index: i
        };
        
        return;
      }
    });
    
    return found;
  }
};

Gummy.Piece = Constructor.extend(function() {

}, {

  //override
  tick: function() {},
  
  destroy: function() {
    this.stage.remove(this);
  },
  
  generate_id: function() {
    var i = 0;    
    return function() {
      return 'piece_' + (i++);
    }
  }()
});

Gummy.Timer = function(ideal_fps) {
  
  this.ideal_fps = ideal_fps;
  
  // aggregations, should not be reset
  this.count = 0;
  this.total_coefficient = 0;
  this.total_fps = 0;
  this.interval = 1000 / ideal_fps;
  
  this.paused = true;
  this.reset();
};

Gummy.Timer.prototype = {
  
  pause: function() {
    this.paused = true;
  },
  
  reset: function() {
    this.fps = 0;
    this.average_fps = 0;
    this.coefficient = 1;
    this.average_coefficient = 0;
    this.last_time = new Date().getTime();
  },
  
  process: function() {
    
    if (this.paused) {
      this.reset();
      this.paused = false;
      return;
    }
    
    var current_time = new Date().getTime(),
        elapsed = current_time - this.last_time,
        fps = 1000 / elapsed,
        coefficient = Math.round(this.ideal_fps / fps * 100) / 100;

    this.last_time = current_time;
    this.count++;
    this.total_fps += this.fps = fps;
    this.total_coefficient += this.coefficient = coefficient;
    this.elapsed = elapsed;
  }
};

Gummy.Vector = function(x, y) {
  this.x = x || 0;
  this.y = y || 0;
}

Gummy.Vector.prototype = {

  add: function(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  },

  subtract: function(v) {
    this.x -= v.x;
    this.y -= v.y;    
    return this;    
  },

  scale: function(scale) {
    this.x *= scale;
    this.y *= scale;
    return this;
  },

  reverse: function() {
    this.x *= -1;
    this.y *= -1;
  },

  normalize: function() {
    var len = this.get_length();
    if (len) {
      this.x /= len;
      this.y /= len;
    }
    return this;
  },

  rotate: function(angle) {
    var cos = Math.cos(angle),
        sin = Math.sin(angle);
    this.x = this.x * cos - this.y * sin;
    this.y = this.x * sin + this.y * cos;
    return this;    
  },

  clone: function() {
    return new Gummy.Vector(this.x, this.y);
  },

  get_length: function() {
    return Math.sqrt(this.get_raw_length());
  },

  get_raw_length: function() {
    return this.x * this.x + this.y * this.y;
  },
  
  get_distance_from: function(v) {
    var diff = this.get_difference(v);
    return diff.get_length();
  },

  get_angle_to: function(v) {
    var diff = this.get_difference(v);
    return Math.atan2(diff.y, diff.x);
  },
  
  get_difference: function(v) {
    return new Gummy.Vector(this.x - v.x, this.y - v.y);
  },
  
  to_string: function() {
    return 'Vector: ' + this.x + ', ' + this.y;
  }

};