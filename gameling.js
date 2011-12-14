/**
 *  Lightweight gaming framework.
 *
 *  @author Brendan Barr brendanbarr.web@gmail.com
 */

// Ensure Object.create
Object.create || (Object.create = function() {
  var F = function() {};
  return function(src) {
    F.prototype = src;
    F.prototype.constructor = F;
    return new F;
  }
})();

/**
 *  Constructor factory to assist inheritence
 *
 *  @example 
 *  var A = Constructor.extend(a_constructor_fn, a_proto_obj);
 *  var a = new A;
 *  var B = A.extend(b_constructor_fn, b_proto_obj); // inherits properties from A
 *  var b = new B; 
 */
var Constructor = (function() {
  
  var extend,
      Constructor;
  
  extend = function(to, from) {
    for (var key in from) {
      if (from.hasOwnProperty(key)) {
        to[key] = from[key];
      }
    }
  };
  
  Constructor = function() {};
  
  Constructor.extend = function(user_constructor, user_prototype) {

    var self = this,
        NewConstructor,
        new_prototype = Object.create(this.prototype);

    user_constructor || (user_constructor = function() {}),
    user_prototype || (user_prototype = user_constructor.prototype || {});

    NewConstructor = function() {
      self.apply(this, arguments);
      user_constructor.apply(this, arguments);
    };
    
    extend(NewConstructor, this);
    extend(new_prototype, user_prototype);

    NewConstructor.prototype = new_prototype;

    return NewConstructor;
  };
  
  return Constructor;
  
})();

var GL = {};

GL.Game = Constructor.extend(function(config) {
  config || (config = {});
  this.el = config.el;
  this.timer = new GL.Timer(config.fps || 30);
  this.paused = true;
  this.stages = {};
  this.pieces = []; // for aggregations and other times when its nice having them togehter
}, {
  
  stage: function(id, piece) {
    var stage = this._ensure_stage(id);
    stage.add(piece);
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
    }, timer.interval);
  },

  influence: function(piece) {
    this.pieces.forEach(function(other_piece) {
      if (piece.id === other_piece.id) return;
      other_piece.influences.forEach(function(influence) {
        if (influence.detect && !influence.detect.call(other_piece, piece)) return;
        influence.affect.call(other_piece, piece);
      });
    });
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
      
      stage = new GL.Stage(el);
      stage.game = this;
      this.stages[stage.id] = stage;
    }
    
    return stage;
  }

});

GL.Stage = function(canvas) {
  this.canvas = canvas;
  this.id = canvas.id;
  this.ctx = canvas.getContext('2d');
  this.pieces = [];
};

GL.Stage.prototype = {
  
  tick: function(coeff) {
    this.pieces.forEach(function(p) { p.tick(coeff); });
  },
  
  add: function(piece) {
    piece.stage = this;
    this.game.pieces.push(piece);
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

GL.Piece = Constructor.extend(function() {
  this.influences = [];
  this.id = this.generate_id();
}, {

  //override
  tick: function() {},
  
  destroy: function() {
    this.stage.remove(this);
  },
  
  generate_id: function() {
    var i = 0;    
    return function() {
      return i++;
    }
  }(),

  influence: function() {
    
  }

});

GL.Timer = function(ideal_fps) {
  
  this.ideal_fps = ideal_fps;
  
  // aggregations, should not be reset
  this.count = 0;
  this.total_coefficient = 0;
  this.total_fps = 0;
  this.interval = 1000 / ideal_fps;
  
  this.paused = true;
  this.reset();
};

GL.Timer.prototype = {
  
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

GL.Vector = function(x, y) {
  this.x = x || 0;
  this.y = y || 0;
}

GL.Vector.prototype = {

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

  dot: function(v) {
    return (this.x * v.x) + (this.y * v.y);
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
    return new GL.Vector(this.x, this.y);
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
  
  get_own_angle: function() {
    return (new GL.Vector(0, 0)).get_angle_to(this);
  },
  
  get_difference: function(v) {
    return new GL.Vector(this.x - v.x, this.y - v.y);
  },
  
  to_string: function() {
    return 'Vector: ' + this.x + ', ' + this.y;
  }

};

/**
 *  Some standard influences
 *  Needs support for regions
 */

GL.GRAVITY = {
  affect: function(p) {
    
    var difference = this.position.get_difference(p.position),
        length = difference.get_length(),
        range = this.size * 4;

    if (length > range) return;
    
    var scale = 1 - (length / range),
        gravity = difference.clone();
        
    gravity
      .normalize()
      .scale(scale);

    p.velocity.add(gravity);
  }
};

GL.COLLISIONS = {
  
  detect: function(o) {
    var diff = this.position.get_difference(o.position);
    return diff.get_length() <= (this.size + o.size);
  },
  
  affect: function(o) {
    
    var diff = this.position.get_difference(o.position).normalize(),
        this_tangent = this.velocity.clone().dot(diff),
        o_tangent = o.velocity.clone().dot(diff);

    this.velocity
      .add(diff.clone().scale(o_tangent - this_tangent).scale(o.size / this.size))
      .scale(this.elasticity);
      
    o.velocity
      .add(diff.clone().scale(this_tangent - o_tangent).scale(this.size / o.size))
      .scale(this.elasticity);
  }
};

GL.BOUNDRIES = {};