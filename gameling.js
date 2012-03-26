/**
 *  Lightweight gaming framework.
 *
 *  @author Brendan Barr brendanbarr.web@gmail.com
 */

// namespace
var GL = {};

// ensure Object.create
Object.create || (Object.create = function() {
  var F = function() {};
  return function(src) {
    F.prototype = src;
    return new F;
  }
}());

//Constructor factory to assist inheritence
GL.Constructor = function() {};

GL.Constructor.extend = function(user_constructor, user_prototype) {

	var self = this,
	    NewConstructor,
	    new_prototype = Object.create(this.prototype),
			extend = GL.util.extend;

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

// standardize requestAnimationFrame
window.requestAnimationFrame = window.requestAnimationFrame || 
                               window.webkitRequestAnimationFrame || 
                               window.mozRequestAnimationFrame || 
                               window.oRequestAnimationFrame || 
                               window.msRequestAnimationFrame;

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

GL.Base = GL.Constructor.extend(function() {
	this._events = {};
}, {
	
	_ready_queue: [],
	_ready: false,

	subscribe: function(name, cb, scope) {
		var _events = this._events;
		if (typeof cb !== 'function') return;
		cb.scope = scope;
		(_events[name] || (_events[name] = [])).push(cb);
	},
	
	unsubscribe: function() {
		// implement
	},
	
	publish: function(name, data) {
		
		var queue = this._events[name];
		if (!queue) return;
		
		for (var i = 0, len = queue.length; i < len; i++) {
			queue[i].call(queue[i].scope || this, data);
		}
	},
	
	ready: function(cb) {
		if (cb) {
			if (this._ready) cb.call(this);
			else this._ready_queue.push(cb.bind(this));
		}
		else {
			this._ready = true;
			while (this._ready_queue[0]) this._ready_queue.shift()();
		}
	}
});

GL.Container = GL.Base.extend(function() {
	this.children = [];
	this.children_keys = {};
	this.class_name = 'Container';
}, {
	
	add: function(child) {
		child.id || (child.id = GL.util.generate_id());
		child.parent = this;
		this.children.push(child);
		this.children_keys[child.id] = this.children.length - 1;
		child[this.class_name.toLowerCase()] = this;
		if (this.parent) child[this.parent.class_name.toLowerCase()] = this.parent;
	},
	
	remove: function(child) {
		var id = typeof child === 'string' ? child : child.id,
				index = this.children_keys[id];
		this.children.splice(index, 1);
		delete this.children_keys[id];
		child[this.class_name.toLowerCase()] = null;
		if (this.parent) child[this.parent.class_name.toLowerCase()] = null;
	},
	
	each: function(iterator) {
		for (var i = 0, len = this.children.length; i < len; i++) {
			iterator.call(this, this.children[i], i, this.children);			
		}
	}
});

GL.Game = GL.Container.extend(function(config) {
	config || (config = {});
	this.class_name = 'Game';
  this.el = typeof config.el === 'string' ? document.getElementById(config.el) : config.el;
	this.height = config.height;
	this.width = config.width;
  this.timer = new GL.Timer(config.fps || 30);
  this.paused = true;
	this._bind();
}, {
  
  stage: function(id, piece, Constructor) {
    this._ensure_stage(id, Constructor).add(piece);
  },
  
  start: function() {
    this.paused = false;
    this.tick();
		this.ready();
  },
  
  pause: function() {
    this.paused = true;
    this.timer.pause();
  },
  
  tick: function() {

    this.tick = function() {
			if (this.paused) return;
			this.publish('tick');
			this.timer.get_frame(this.tick);
		}.bind(this);
		
		this.tick();
  },

  _ensure_stage: function(id, Constructor) {

    Constructor = Constructor || GL.Stage;

    var stage = this.children[this.children_keys[id]];
    if (!stage) { 
      
      var el = document.getElementById(id);
      if (!el) {
        el = document.createElement('canvas');
        el.setAttribute('id', id);
        el.height = this.height;
        el.width = this.width;
        this.el.appendChild(el);
      }
      
      stage = new Constructor(el);
			this.add(stage);
    }
    
    return stage;
  },

	_bind: function() {
		
		var el = this.el,
				events = [ 'click', 'mouseover', 'mouseout' ],
				window_events = [ 'keydown', 'keyup', 'keypress' ],
				self = this
		
		events.forEach(function(event) {
			el.addEventListener(event, function(e) { self.publish(event, e); })
		});
		
		window_events.forEach(function(event) {
			window.addEventListener(event, function(e) { self.publish(event, e); })
		});
	}

});

GL.Stage = GL.Container.extend(function(el) {
  this.el = el;
  this.id = el.getAttribute('id');
  this.ctx = el.getContext('2d');
	this.class_name = 'Stage';	
}, {});

GL.Piece = GL.Base.extend(function() {
	this.class_name = 'Piece';
	this.ready(function() {
		this.game.subscribe('tick', this.tick, this);
	});	
}, {
 
});

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

GL.Vector = function(set) {
  this.x = set[0] || 0;
  this.y = set[1] || 0;
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

	is_flat: function() {
		return !this.x && !this.y;
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
    return new GL.Vector([ this.x, this.y ]);
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