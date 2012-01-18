/*
 * Array
 * Some useful functions
 */
Array.prototype.last = function last() {
    return this[this.length-1];
};

Array.prototype.swap = function swap(a, b) {
    var tmp = this[a];
    this[a] = this[b];
    this[b] = tmp;
};

Array.prototype.shuffle = function shuffle() {
    for (var i=this.length-1; i>0; i--) {
        this.swap(i, roll(i+1));
    }
}

/*
 * Utility for random number generation
 */
function roll(sides) {
    return Math.floor(Math.random()*sides);
}

/* Resources
 * Loads all resources, then starts the game
 * - locations: locations of all images to load
 * - callback: what to do when the loading is complete
*/
function Resources(locations, callback) {
    var self = this;
    self.list = {};

    (function load_resource(i) { 
        var image = new Image;
        if (i<locations.length) {
            image.onload = function() {
               self.list[locations[i]] = image;
               load_resource(i+1);
            }
            image.src = locations[i];
        } else { 
            callback(self.list);
        }
    })(0);
}

/*
 * Scene
 * Used to manage elements on scene & handle winning/losing
 * - $canvas: the jQuery game canvas object
 * - $goal: the jQuery goal canvas object
 * - player: the Stack object
 * - difficulty: the number of elements in the goal stack
 * - tps: number of ticks per second
 * - res: loaded images
 */
function Scene($canvas, $goal, player, rain, difficulty, tps, res) {
    player.populate(player.random_stack(3));
    this.managed = [player];
    var space = 0;
    var right = 0;
    var left = 0;
    var ctx = $canvas.get(0).getContext('2d');
    var initial = 1;

    var operators = 0;
    var seconds = 0;
    var ticks = 0;
    var running = 0;

    $(document).keydown(function(event) {
        if (event.keyCode==38 || event.keyCode==40) {
           event.preventDefault();
        }
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
        var gctx = $goal.get(0).getContext('2d');
        var goal = player.random_stack(difficulty);

        for (var i=0; i<goal.length; i++) {
            var image = res[player.colors[goal[i]]];
            gctx.drawImage(image, ($goal.width()-player.width)/2, $goal.height()-(i+1)*player.height, player.width, player.height);
        }

        return goal;
    };

    player.goal = this.set_up_goal();

    this.refresh = function() {
        ctx.clearRect(0, 0, $canvas.width(), $canvas.height());
    };
     
    this.update = function() {

        if (!running && space) {
            running = 1;
            operators = 0;
            seconds = 0;
            $('.popup').hide(200);
            if (!initial) {
                player.populate(player.random_stack(1+difficulty/2));
                player.goal = this.set_up_goal();
                this.managed = [player, rain];
            } else {
                initial = 0;
                this.managed.push(rain);
            }
        }

        if (running) {
            ticks = (++ticks)%tps;
            if (ticks==0) seconds++;
            $('#seconds').html(seconds);
        }
        
        var length = this.managed.length
        for (var i=0; i<length; i++) {
            if (typeof this.managed[i].update === 'function') {
                var msg = this.managed[i].update(running && {
                   left: left, 
                   right: right
                }, this.managed, i);
                i -= length - this.managed.length;
                length = this.managed.length;

                if (msg) {
                    var trigger = msg;
                    if (typeof trigger.operators === 'number') {
                        operators += trigger.operators;
                        $('#operators').html(operators);
                    }

                    if (typeof trigger.game_over === 'string') {
                        running = 0;
                        $('#popup-bg').show(200, function() {
                           $('#game-over').show(200);
                           $('#game-over').find('.reason').html(trigger.game_over);
                        });
                    }

                    if (typeof trigger.victory === 'string') {
                        running = 0;
                        if (difficulty<10) {
                            difficulty++;
                        }
                        $('#popup-bg').show(200, function() {
                           $('#you-win').show(200);
                           $('#you-win').find('.reason').html(trigger.victory);
                        });
                    }
                }
            }
        }
    };

    this.draw = function() {
        for (var i=0; i<this.managed.length; i++) {
            if (typeof this.managed[i].draw === 'function') {
                ctx.save();
                this.managed[i].draw(ctx, res);
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
        //if (!running) return;
        since_last++;

        if (since_last>tpd) {
            since_last = 0;
            this.tokens.shuffle();
            var x = PIXEL_STEP;
            var i = 0;

            while (x<WIDTH-PIXEL_STEP) {

                //Types don't repeat within a row
                var type = this.tokens[i++];

                var new_speed = speed.min + roll(speed.max-speed.min);
                var new_token = new Token(type, {x: x, y: 0}, new_speed, 0);
                new_token.position.x += new_token.size/2;
                x += new_token.size*2;

                //Throttle the red, green, and blue tokens
                if (!(type=='red' || type=='blue' || type=='green') || roll(2)) {
                    managed.push(new_token);
                }
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
    this.goal = [];

    var stack = [];

    this.colors = {
        red: 'img/block-red.png',
        green: 'img/block-green.png',
        blue: 'img/block-blue.png'
    }; 

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

    this.random_stack = function(size) {
        var choices = [];
        var rs = [];

        for (var color in this.colors) {
            choices.push(color);
        }

        for (var i=0; i<size; i++) {
            rs.unshift(choices[roll(choices.length)]);
        }

        return rs;
    };

    this.populate = function(with_stack) {
        stack = [];

        for (var i=0; i<with_stack.length; i++) {
            stack.push({x: this.position.x, y:this.position.y, color: with_stack[i]});
        }
    };

    var copy_block = function(block) {
        return {x: block.x, y: block.y, color: block.color};
    };

    this.check_overflow = function() {
        if (stack.length>this.capacity) { 
            return 'stack overflow';
        }
    };

    this.check_underflow = function() {
        if (stack.length<1) {
            return 'stack underflow';
        }
    }

    this.update = function(keyboard, managed) {

        //Check to see if the round has been won
        var winning = (stack.length==this.goal.length);

        for (var i=0; i<stack.length; i++) {
            if (stack[i].color!=this.goal[i]) {
                winning = false;
            }

            var proper_y = this.position.y-i*this.height;
            stack[i].x = (i==0) ? this.position.x : (stack[i-1].x+stack[i].x)/2;

            if (stack[i].y!=proper_y) {
                stack[i].y -= (stack[i].y-proper_y)/10;
            }
        }

        if (!keyboard) return;

        if (winning) {
            return {victory: 'Congratulations!'};
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

                //Create puff in place of operator
                var puff = new Puff(item.position, Token.prototype.icons[item.type], -.1, 2);
                managed.push(puff);

                switch(item.type) {
                    case 'red':
                    case 'blue':
                    case 'green':
                          stack[stack.length-1].color = item.type;
                    break;

                    case 'swap':
                        if (stack.length>1) {
                            stack.swap(stack.length-1, stack.length-2);
                        }
                    break;

                    case 'pop':
                        var popped = stack.pop();

                        //Create shattering effect
                        var rows = 2;
                        var cols = 3;
                        for (var i=0; i<rows; i++) {
                            for (var j=0; j<cols; j++) {
                                var shard = new Projectile({
                                    x: popped.x + j*(this.width/cols),
                                    y: popped.y + i*(this.height/rows)
                                }, this.colors[popped.color], {
                                    from: {
                                        x: j*(this.width/cols), 
                                        y: i*(this.height/rows)
                                    },
                                    to: {
                                        x: (j+1)*(this.width/cols), 
                                        y: (i+1)*(this.height/rows)
                                    }
                                });
                                managed.push(shard);
                            }
                        }

                        err = this.check_underflow();
                    break;

                    case 'rot':
                        for (var i=0; i<stack.length/2; i++) {
                            stack.swap(i, stack.length-i-1);
                        }
                    break; 

                    case 'dup':
                        var stack_top = stack.last();
                        var copy = copy_block(stack_top);
                        stack.push(copy);
                        err = this.check_overflow();
                    break;

                    case 'over':
                        if (stack.length==1) break;
                        var stack_second = stack[stack.length-2];
                        var copy = copy_block(stack_second);
                        stack.push(copy);
                        err = this.check_overflow();
                    break;

                    default:
                    break;   
                } 
            }

            if (err)  {

                //Stack falling apart effect
                for (var i=0; i<stack.length; i++) {
                    var shard = new Projectile({
                        x: stack[i].x,
                        y: stack[i].y
                    }, this.colors[stack[i].color], {
                        from: {x: 0, y: 0},
                        to: {x: this.width, y: this.height}
                    });
                    managed.push(shard);
                }

                stack = [];

                return {game_over: err};
            }
        }

        return {operators: operators};
    };

    this.draw = function(ctx, res) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(PIXEL_STEP-3, this.position.y+this.height+1);
        ctx.lineTo(WIDTH-PIXEL_STEP+3, this.position.y+this.height+1);
        ctx.stroke();
        for (var i=0; i<stack.length; i++) { 
            var color = stack[i].color;
            var image = res[this.colors[color]];
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
function Token(type, position, velocity) {
    this.type = type;
    this.position = position;
    this.velocity = velocity; 
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
    this.position.y = this.position.y + this.velocity; 

    if (this.position.y > HEIGHT) {
        managed.splice(i, 1);
    }
};

Token.prototype.draw = function(ctx, res) {
    var icon = res[this.icons[this.type]];
    ctx.drawImage(icon, this.position.x-this.size/2, this.position.y-this.size/2, this.size, this.size);
};

/* Projectile
 * A projectile which follows a randomly-chosen parabolic path.
 * - position: x & y coordinates of the center of the token
 * - image_location: which image to display
 * - bounds: bounds over which to display image
*/
function Projectile(position, image_location, bounds) {

    var x_size = bounds.to.x - bounds.from.x;
    var y_size = bounds.to.y - bounds.from.y;

    var x_velocity = roll(PIXEL_STEP/2);
    if (roll(2)) x_velocity *= -1;
    var y_velocity = -PIXEL_STEP;
    var gravity = 1;

    this.update = function(_, managed, i) {
        position.x += x_velocity;
        position.y += y_velocity;
        y_velocity += gravity;

        if (position.x<0 || position.x>WIDTH) {
            x_velocity = -x_velocity;
        }

        if (position.y>HEIGHT) {
            managed.splice(i, 1);
        }
    };

    this.draw = function(ctx, res) {
        ctx.drawImage(res[image_location], bounds.from.x, bounds.from.y, x_size-1, y_size-1, position.x-(x_size/2), position.y-(y_size/2), x_size, y_size);
    };
}

/* Puff
 * An image which expands and fades away
 * - position: x & y coordinates of the center of the token
 * - image_location: which image to display
 * - delta_opacity: rate at which to change opacity per tick
 * - delta_size: rate at which to change the puff size
*/
function Puff(position, image_location, delta_opacity, delta_size) {

    var opacity = 1;
    var current_size = init_size = 32;//Token.prototype.size;

    this.update = function(_, managed, i) {
        opacity += delta_opacity;
        current_size += delta_size;

        if (opacity<=0) {
            managed.splice(i, 1);
        }
    };

    this.draw = function(ctx, res) {
        var img = res[image_location];
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, 0, 0, img.width, img.height, position.x-(current_size/2), position.y-(current_size/2), current_size, current_size);
        ctx.globalAlpha = 1;
    };
}

//Initialize canvas element, scene manager, etc.
$(document).ready(function() {

    var start = function(res) {

        //Handle vertical centering
        var reposition = function() {
            var page_height = $(window).height();
            var bg = $('#background')
            bg.css('margin-top', (page_height-bg.height())/2);
        };
        
        reposition();
        $(window).resize(reposition);

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
        var bottom_offset = 2;
        var player = new Stack(13, {
            x: $canvas.width()/2 - player_width/2, 
            y: $canvas.height() - player_height - bottom_offset
        }, player_width, player_height);

        //Rain handles the dropping of new items
        var speed = 35;
        var rain = new Rain((100/speed)*20, {min: 5, max: 8}, {min: 0, max: 0});

        //Set up the scene, which updates game objects and handles win/loss mechanics
        var difficulty = 4;
        var scene = new Scene($canvas, $goal, player, rain, difficulty, Math.round(1000/speed), res);
        scene.refresh(); 

        //Kick off the game loop
        function poll_loop() {
            scene.update();
            scene.refresh();
            scene.draw();
        };
    
        setInterval(poll_loop, speed);
    };
    
    //List of resources to load before the game begins
    var locations = [
        'img/block-red.png',
        'img/block-green.png',
        'img/block-blue.png',
        'img/ball-red.png',
        'img/ball-green.png',
        'img/ball-blue.png',
        'img/op-pop.png',
        'img/op-swap.png',
        'img/op-dup.png',
        'img/op-rot.png',
        'img/op-over.png',
    ];

    Resources(locations, start);
});
