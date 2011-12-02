Array.prototype.swap = function swap(a, b) {
    var tmp = this[a];
    this[a] = this[b];
    this[b] = tmp;
};

//Used to manage elements on scene
function Scene($canvas) {
    this.managed = [];
    var space = 0;
    var right = 0;
    var left = 0;
    var ctx = $canvas.get(0).getContext('2d');

    $(document).keydown(function(event) {
        space |= (event.keyCode==32);
        right |= (event.keyCode==39);
        left  |= (event.keyCode==37);
    });

    $(document).keyup(function(event) {
        if (event.keyCode==32) space = 0;
        if (event.keyCode==39) right = 0;
        if (event.keyCode==37) left  = 0;
    });

    this.refresh = function() {
        ctx.clearRect(0, 0, $canvas.width(), $canvas.height());
    };
     
    this.update = function() {
        for (var i=0; i<this.managed.length; i++) {
            if (typeof this.managed[i].update === 'function') {
                this.managed[i].update({left: left, right: right, space: space});
            }
        }
    };

    this.draw = function() {
        for (var i=0; i<this.managed.length; i++) {
            if (typeof this.managed[i].draw === 'function') {
                this.managed[i].draw(ctx);
            }
        }
    };
}

//The stack of values currently in play
function Stack(capacity, position, width, height, bounds) {
    this.capacity = capacity;
    this.position = position;
    this.bounds = bounds;
    this.width = width;
    this.height = height;

    var stack = [
        {color: 'red', x: position.x, y: position.y}, 
        {color: 'red', x: position.x, y: position.y}, 
        {color: 'blue', x: position.x, y: position.y},
        {color: 'green', x: position.x, y: position.y},
        {color: 'red', x: position.x, y: position.y}
    ];

    var colors = {
        red: 'img/block-red.png',
        green:'img/block-green.png',
        blue: 'img/block-blue.png'
    };
 
    for (var color in colors) {
        var block_image = new Image;
        block_image.src = colors[color];
        colors[color] = block_image;
    }

    var token_collision = function(bounds) {
        return bounds.some(function(e) {
            return ((e.x > this.position[0].x && e.x < this.position[1].x) && (e.y > this.position[0].y && e.y < this.position[1].y));
        });
    };

    var push_block = function(color) {
        if (this.stack.length==this.capacity) {
            return 'overlow';
        }
        else {
            this.stack.push(color);
        }
    };

    var pop_block = function(color) {
        if (this.stack.length==0) {
            return 'underflow';
        }
        else {
            this.stack.push(color);
        }
    }; 

    this.update = function(keyboard, tokens) {
        var pixel_step = 12;

        if (keyboard.space) {
            stack.swap(0, 3);
        }

        if (keyboard.left && this.position.x-pixel_step>bounds.from) {
            this.position.x -= pixel_step;
        }

        if (keyboard.right && this.position.x+pixel_step<bounds.to) {
            this.position.x += pixel_step;
        }

        for (var pos in tokens) {
            if (collision(token.bounds, this.bounds)) {
                var err = this.push_block(token.type);
                if (err)  {
                    return err;
                }
            }
        }
    };

    this.draw = function(ctx) {
        for (var i=0; i<stack.length; i++) { 
            var color = stack[i].color;
            var image = colors[color];
            var proper_y = this.position.y-i*this.height;
            stack[i].x = (i==0) ? this.position.x : (stack[i-1].x+stack[i].x)/2;

            if (stack[i].y!=proper_y) {
                stack[i].y -= (stack[i].y-proper_y)/10;
            }

            ctx.drawImage(image, stack[i].x, stack[i].y, this.width, this.height);
        }
    };
}

//Token
//A falling object
function Token(type, position, velocity, acceleration) {
    this.type = type;
    this.position = position;
    this.velocity = velocity; 
    this.acceleration = acceleration;
}

Token.prototpe.icons = {
    'red': 
};

Token.prototype.update = function(keyboard, tokens) {
    this.velocity += this.acceleration;
    this.position += this.velocity;
}

Token.prototype.draw = function(ctx) {
    ctx.drawImage()
}

//Initialize canvas element, scene manager, etc.
$(document).ready(function() {
   
    var $canvas = $('#morph');
    var scene = new Scene($canvas);
    scene.refresh();

    var player_width = 64;
    var player_height = 33;
    var bottom_offset = 20;

    var player = new Stack(10, {
        x: $canvas.width()/2 - player_width/2, 
        y: $canvas.height() - player_height - bottom_offset
    }, player_width, player_height, {
        from: 0,
        to: 440 
    });
    scene.managed.push(player);

    function poll_loop() {
        scene.update();
        scene.refresh();
        scene.draw();
    };

    setInterval(poll_loop, 35);
});
