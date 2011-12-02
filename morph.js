//Used to manage elements on scene
function Scene($canvas) {
    this.managed = [];
    var left = false;
    var right = false;
    var ctx = $canvas.get(0).getContext('2d');

    $(document).keydown(function(event) {
        right |= (event.keyCode==39);
        left  |= (event.keyCode==37);
    });

    $(document).keyup(function(event) {
        if (event.keyCode==39) right = 0;
        if (event.keyCode==37) left = 0;
    });

    this.refresh = function() {
        ctx.clearRect(0, 0, $canvas.width(), $canvas.height());
    };
 
    this.update = function() {
        for (var i in this.managed) {
            this.managed[i].update({left: left, right: right});
        }
    };

    this.draw = function() {
        for (var i in this.managed) {
            this.managed[i].draw(ctx);
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

    var stack = [['red', position.x], ['red', position.x], ['blue', position.x], ['green', position.x], ['red', position.x]];

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
 
        var pixel_step = 10;

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

        for (var i in stack) {
            var color = stack[i][0];
            var image = colors[color];
            stack[i][1] = (i==0) ? this.position.x : (stack[i-1][1]+stack[i][1])/2;
            ctx.drawImage(image, stack[i][1], this.position.y-i*this.height, this.width, this.height);
        }
    };
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

    setInterval(poll_loop, 15);
});
