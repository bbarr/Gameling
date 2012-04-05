/**
 *  Lightweight gaming framework.
 *
 *  @author Brendan Barr brendanbarr.web@gmail.com
 */

var GL = {};

GL.util = {
	
	generate_id: function() {
		var id = 0;
		return function() {
			return (id++).toString();
		}
	}(),
	
	extend: function(to, from) {
		for (var key in from) {
      if (from.hasOwnProperty(key)) {
        to[key] = from[key];
      }
    }
	}
};

GL.events = {
  
  _events: {},

	subscribe: function(name, cb, scope) {
		cb.scope = scope || this;
		(this._events[name] || (this._events[name] = [])).push(cb);
	},
	
	unsubscribe: function(name, cb) {
	  
		var queue = this._events[name];
		if (!queue) return;
		
		if (cb) {
		  var index = queue.indexOf(cb);
  		if (index > -1) queue.splice(index, 1); 
		}
		else {
		  delete this._events[name];
		}
	},
	
	publish: function(name, data) {
		
		var queue = this._events[name];
		if (!queue) return;
		
		for (var i = 0, len = queue.length; i < len; i++) {
			queue[i].call(queue[i].scope, data);
		}
	}
}

GL.Game = function() {
  this.stages = [];
  this.stage_keys = {};
};

GL.Game.prototype = {
  
  stage: function(name) {
    var stage = this.stages[this.stage_keys[name]];
    if (!stage) {
      stage = this._create_stage(name);
      this.stage_keys[name] = this.stages.push(stage);
    }
    return stage;
  },
  
  run: function() {
    this.paused = false;
    this.tick();
  },
  
  stop: function() {
    this.paused = true;
  },
  
  _tick: function() {
    
    this._tick = function() {
      if (this.paused) return;
      for (var i = 0, len = this.stages.length; i < len; i++) this.stages[i].tick();
      window.requestAnimationFrame(this._tick);
    }.bind(this);
    
    this.tick();
  },
  
  _create_stage: function(name) {
    
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('canvas');
      el.setAttribute('id', id);
      el.height = this.height;
      el.width = this.width;
      this.el.appendChild(el);
    }

    return new Constructor(el);
  }
};

GL.util.extend(GL.Game.prototype, GL.events);

GL.Stage = function() {
  this.actors = [];
  this.actor_keys = {};
};

GL.Stage.protoype = {
  
  tick: function() {
    for (var i = 0, len = this.actors.length; i < len; i++) this.actors[i].tick();
  },
  
  cast: function(actor) {
    if (this.actor_keys[actor.id]) return;
    this.actor_keys[actor.id] = this.actors.push(actor);
  },
  
  actor: function(id) {
    return this.actors[this.actor_keys[id]];
  }
};

GL.util.extend(GL.Stage.prototype, GL.events);

GL.Actor = function() {
  this.id = GL.util.generate_id();
};

GL.Actor.prototype = {
  
  tick: function() {}
};

GL.util.extend(GL.Actor.prototype, GL.events);

GL.Timer = function(ideal_fps) {
  this.ideal_fps = ideal_fps;
	this.smooth = ideal_fps >= 30;
  this.interval = 1000 / ideal_fps;
	this.coefficient = 1;
};

GL.Timer.prototype = {
  
  pause: function() {
    this.paused = true;
  },
  
	get_frame: function(cb) {
		this._process();
		if (this.smooth) {
			window.requestAnimationFrame(cb)
		}
		else {
			setTimeout(cb, this.interval * this.coeff);
		}
	},
	
	_process: function() {
    
    if (this.paused) {
      this.coeff = 1;
      return;
    }
    
    var current_time = new Date().getTime(),
        elapsed = current_time - this.last_time,
        fps = 1000 / elapsed;

    this.last_time = current_time;
		this.coeff = Math.round(this.ideal_fps / fps * 100) / 100;
  }
};

GL.Vector = function(x, y) {
  this.x = x[0] || x.x || x || 0;
  this.y = x[1] || x.y || y || 0;
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
    return new GL.Vector(this);
  },


	is_empty: function() {
		return this.x === 0 && this.y === 0;
	},

  get_length: function() {
    return Math.sqrt(this.get_raw_length());
  },

  get_length_squared: function() {
    return this.x * this.x + this.y * this.y;
  },
  
  get_angle_to: function(v) {
    var diff = this.get_difference(v);
    return Math.atan2(diff.y, diff.x);
  },
  
  get_angle: function() {
    return Math.atan2(this.y, this.x);
  },
  
  get_difference: function(v) {
    return this.clone().subtract(v);
  },
  
  to_string: function() {
    return 'Vector: ' + this.x + ', ' + this.y;
  }
};

// ensure Object.create
Object.create || (Object.create = function() {
  var F = function() {};
  return function(src) {
    F.prototype = src;
    return new F;
  }
}());

// standardize requestAnimationFrame
window.requestAnimationFrame = window.requestAnimationFrame || 
                               window.webkitRequestAnimationFrame || 
                               window.mozRequestAnimationFrame || 
                               window.oRequestAnimationFrame || 
                               window.msRequestAnimationFrame;