/*
 * Some useful functions
 */
Array.prototype.swap = function swap(a, b) {
    var tmp = this[a];
    this[a] = this[b];
    this[b] = tmp;
};

Array.prototype.last = function last() {
    return this[this.length-1];
};

function roll(sides) {
    return Math.floor(Math.random()*sides);
}

/*
 * Scene
 * Used to manage elements on scene & handle winning/losing
 * - $canvas: the jQuery canvas object
 * - goal_size: the number of elements in the goal stack
 * - tps: number of ticks per second
 */
function Scene($canvas, $goal, player, difficulty, tps) {
    this.managed = [player];
    var space = 0;
    var right = 0;
    var left = 0;
    var ctx = $canvas.get(0).getContext('2d');

    var operators = 0;
    var seconds = 0;
    var ticks = 0;
    var running = 1;

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

    this.set_up_goal = function() {
        var goal = [];
        var choices = [];
        var gctx = $goal.get(0).getContext('2d');

        for (var color in player.colors) {
            choices.push(color);
        }

        for (var i=0; i<difficulty; i++) {
            goal.push(choices[roll(choices.length)]);
        }

        for (var i=0; i<goal.length; i++) {
            var image = player.colors[goal[i]];
            gctx.drawImage(image, 0, i*player.height, player.width, player.height);
        }

        return goal;
    };

    this.set_up_goal();

    this.refresh = function() {
        if (!running) return;
        ctx.clearRect(0, 0, $canvas.width(), $canvas.height());
    };
     
    this.update = function() {
        if (!running) return;

        ticks = (++ticks)%tps;
        if (ticks==0) seconds++;
        
        var length = this.managed.length
        for (var i=0; i<length; i++) {
            if (typeof this.managed[i].update === 'function') {
                var msg = this.managed[i].update({
                   left: left, 
                   right: right, 
                   space: space
                }, this.managed, i);
                i -= length - this.managed.length;
                length = this.managed.length;

                if (msg) {
                    if (typeof msg.operators === 'number') {
                        operators += msg.operators;
                    }
                    if (typeof msg.game_over === 'string') {
                        this.managed = [];
                        running = 0;
                        $('#popup-bg').show(200, function() {             
                           $('#game-over').show(200);
                           $('#game-over').find('.reason').html(msg.game_over);
                        });
                    }
                }
            }
        }
        $('#seconds').html(seconds);
        $('#operators').html(operators);
    };

    this.draw = function() {
        if (!running) return;
        for (var i=0; i<this.managed.length; i++) {
            if (typeof this.managed[i].draw === 'function') {
                ctx.save();
                this.managed[i].draw(ctx);
                ctx.restore();
            }
        }
    };
}

/*
 * Rain
 * Coordinates creation of new tokens to fall
 * - tpd: average number of ticks per drop
 * - min_speed: slowest falling object
 * - max_speed: fastest falling object
 * - min_acceleration: minimum acceleration of falling object
 * - max_acceleration: maximum acceleration of falling obejct
 */
function Rain(tpd, speed, padding) {

    var since_last = 0;
    this.tokens = ['red', 'blue', 'green', 'pop', 'swap', 'over', 'rot', 'dup'];

    this.update = function(_, managed) {
        since_last++;
        if (since_last>tpd) {
            since_last = 0;
            var x = PIXEL_STEP;

            while (x<WIDTH-PIXEL_STEP) {
                var type = this.tokens[roll(this.tokens.length)];

                //Throttle the red, green, and blue tokens
                if ((type=='red' || type=='blue' || type=='green') && roll(2)) continue;

                var new_speed = speed.min + roll(speed.max-speed.min);
                var new_token = new Token(type, {x: x, y: 0}, new_speed, 0);
                new_token.position.x += new_token.size/2;
                x += new_token.size*2;

                if (roll(3)) managed.push(new_token);
            }
        }
    } 
}

/*
 * Stack
 * The stack of values currently in play. Handles user input and collisions.
 * - capacity: maximum number of values allowed (gameplay element)
 * - position: x & y values of the bottom of the stack
 * - width: the width of a single stack element
 * - height: the height of a single stack element
 */
function Stack(capacity, position, width, height) {
    this.capacity = capacity;
    this.position = position;
    this.width = width;
    this.height = height;

    var stack = [
        {color: 'blue', x: position.x, y: position.y},
        {color: 'green', x: position.x, y: position.y}, 
        {color: 'red', x: position.x, y: position.y}
    ];

    this.colors = {
        red: 'img/block-red.png',
        green:'img/block-green.png',
        blue: 'img/block-blue.png'
    };
 
    for (var color in this.colors) {
        var block_image = new Image;
        block_image.src = this.colors[color];
        this.colors[color] = block_image;
    }

    this.token_collision = function(position, radius) {
        return [
            {x: position.x+radius, y: position.y+radius}, 
            {x: position.x-radius, y: position.y-radius}, 
            {x: position.x+radius, y: position.y-radius},
            {x: position.x-radius, y: position.y+radius}
        ].some(function(e) {
            return ((e.x > stack.last().x && e.x < stack.last().x+this.width) && 
                (e.y > stack.last().y && e.y < stack.last().y+this.height));
        }, this);
    };

    this.push_block = function(color) {
        if (stack.length==this.capacity) {
            return 'stack overlow';
        } else {
            stack.push({color: color, x: stack.last().x, y: stack.last().y});
        }
    };

    this.pop_block = function() {
        if (stack.length==1) {
            return 'stack underflow';
        } else {
            stack.pop();
        }
    }; 

        var f = false;

    this.update = function(keyboard, managed) {

        if (keyboard.space && !f) {
            console.log('a');
            f = 1;
            for (var i=0; i<stack.length/2; i++) {
                stack.swap(i, stack.length-i-1);
            }
        }
        else if (!keyboard.space){
            f=false;
        }

        for (var i=0; i<stack.length; i++) { 
            var proper_y = this.position.y-i*this.height;
            stack[i].x = (i==0) ? this.position.x : (stack[i-1].x+stack[i].x)/2;

            if (stack[i].y!=proper_y) {
                stack[i].y -= (stack[i].y-proper_y)/10;
            }
        }

        if (keyboard.left && this.position.x-PIXEL_STEP>0) {
            this.position.x -= PIXEL_STEP;
        }

        if (keyboard.right && this.position.x+PIXEL_STEP<WIDTH-this.width) {
            this.position.x += PIXEL_STEP;
        }

        var operators = 0;

        for (var i=0; i<managed.length; i++) {
            var item = managed[i];
            
            if (item.position && item.size && this.token_collision(item.position, item.size/2)) {
                managed.splice(i, 1);
                operators++;
                var err = false;

                switch(item.type) {
                    case 'red':
                    case 'blue':
                    case 'green':
                        err = this.push_block(item.type);
                    break;

                    case 'swap':
                        if (stack.length>1) {
                            stack.swap(stack.length-1, stack.length-2);
                        }
                    break;

                    case 'pop':
                        err = this.pop_block();
                    break;

                    case 'rot':
                        if (stack.length>2) {
                            stack.swap(stack.length-1, stack.length-3);
                            stack.swap(stack.length-2, stack.length-3);
                        }
                    break; 

                    case 'dup':
                        var bottom = stack.last();
                        var copy = {x: bottom.x, y: bottom.y, color: bottom.color};
                        stack.push(copy);
                    break;

                    case 'over':
                        for (var i=0; i<stack.length/2; i++) {
                            stack.swap(i, stack.length-i-1);
                        }
                    break;

                    default:
                    break;   
                } 
            }

            if (err)  {
                return {game_over: err};
            }
        }

        return {operators: operators};
    };

    this.draw = function(ctx) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(PIXEL_STEP-3, this.position.y+this.height+1);
        ctx.lineTo(WIDTH-PIXEL_STEP+3, this.position.y+this.height+1);
        ctx.stroke();
        for (var i=0; i<stack.length; i++) { 
            var color = stack[i].color;
            var image = this.colors[color];
            ctx.drawImage(image, stack[i].x, stack[i].y, this.width, this.height);
        }
    };
}

/* Token
 * A falling object
 * - type: A string descriptor of the token
 * - position: x & y coordinates of the center of the token
 * - velocity: rate at which vertical position changes
 * - acceleration: rate at which vertical velocity changes
 */
function Token(type, position, velocity, acceleration) {
    this.type = type;
    this.position = position;
    this.velocity = velocity; 
    this.acceleration = acceleration;
    this.icon = new Image;
    this.icon.src = this.icons[type];
}

Token.prototype.size = 32;

Token.prototype.icons = {
    red: 'img/ball-red.png',
    green: 'img/ball-green.png',
    blue: 'img/ball-blue.png',
    pop: 'img/op-pop.png',
    swap: 'img/op-swap.png',
    dup: 'img/op-dup.png',
    rot: 'img/op-rot.png',
    over: 'img/op-over.png',
};

Token.prototype.update = function(keyboard, managed, i) {
    this.velocity += this.acceleration;
    this.position.y += this.velocity; 

    if (this.position.y > HEIGHT) {
        managed.splice(i, 1);
    }
};

Token.prototype.draw = function(ctx) {
    ctx.drawImage(this.icon, this.position.x-this.size/2, this.position.y-this.size/2, this.size, this.size);
};

//Initialize canvas element, scene manager, etc.
$(document).ready(function() {

    //Get reference to canvas element. Dimensions might as well be global.
    var $canvas = $('#morph');
    WIDTH = $canvas.width();
    HEIGHT = $canvas.height();

    //For the sake of design flexibility, the goal display is a separate canvas element
    var $goal = $('#morph-goal');

    //Set up the player, which handles immediate interaction with the user
    PIXEL_STEP = 12;
    var player_width = 64;
    var player_height = 33;
    var bottom_offset = 20;
    var player = new Stack(13, {
        x: $canvas.width()/2 - player_width/2, 
        y: $canvas.height() - player_height - bottom_offset
    }, player_width, player_height);


    //Set up the scene, which updates game objects and handles win/loss mechanics
    var speed = 35;
    var goal_size = 4;
    var scene = new Scene($canvas, $goal, player, goal_size, Math.round(1000/speed));
    scene.refresh();

    //Rain handles the dropping of new items
    var rain = new Rain((100/speed)*20, {min: 6, max: 9}, {min: 0, max: 0});
    scene.managed.push(rain);

    //Kick off the game loop
    function poll_loop() {
        scene.update();
        scene.refresh();
        scene.draw();
    };
    setInterval(poll_loop, speed);
});
