var gameContainer = document.getElementById("game")
var modal_about = document.getElementById("modal_about")
var modal_gameover = document.getElementById("modal_gameover")
var modal_highscore = document.getElementById("modal_highscore")
var modals = { about: modal_about, gameover: modal_gameover, highscore: modal_highscore }
var span_score = document.getElementById("span_score")
var button_start = document.getElementById("button_start")
var button_submit = document.getElementById("button_submit")
var button_tryagain = document.getElementById("button_tryagain")
var button_higscore_restart = document.getElementById("button_higscore_restart")
var iframe_highscore = document.getElementById("iframe_highscore")



var game = new Phaser.Game(gameContainer.clientWidth, gameContainer.clientHeight, Phaser.AUTO, 'game', { preload: preload, create: create, update: update });
var state = {};
var cmode = "about";
var balloons = Array(0);
var text = "";



button_start.onclick = function() {
	cmode = "start";
}
button_higscore_restart.onclick = function() {
  cmode = "start";
}

button_submit.onclick = function() {
	var username = window.prompt("Username?", config.last_username)
	config.last_username = username

  xhr = new XMLHttpRequest();

  xhr.open("POST", config.highscore_url, true);
  xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  xhr.send(urlencode({
    name: username,
    config: JSON.stringify(config),
    state: JSON.stringify(state)
  }));

  iframe_highscore.onload = function() {
    console.log("iframe onload")
    iframe_highscore.style.height = iframe_highscore.contentWindow.document.body.scrollHeight + 'px';
  }
  iframe_highscore.src = config.highscore_url;


  console.log("Hello World!")
  showModal("highscore");

	// cmode = "start";
}

button_tryagain.onclick = function() {
	cmode = "start";
}


function urlencode(data) {
  var ret = ""
  Object.keys(data).forEach(function(index) {
    ret += encodeURIComponent(index) + "=" + encodeURIComponent(data[index]) + "&";
  })
  return ret.slice(0, -1).replace(/%20/g, '+');
}



function showModal(modal) {
  Object.keys(modals).forEach(function(index) {
    if (index == modal) {
      modals[index].classList.remove("hidden")
    } else {
      modals[index].classList.add("hidden")
    }
  })
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}
function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}
function getRandomElement(arr, min, max) {
  min = min || 0;
  max = max || arr.length;
  return arr[Math.floor(Math.random() * (max - min)) + min];
}





function Balloon(balloonconfig) {

  var y = game.height - balloonconfig.ystart;
  var x = getRandomInt(config.spacing_leftright, game.width - config.spacing_leftright);
	var _this = this;

  this.velocity = getRandom(balloonconfig.vmin, balloonconfig.vmax);

  if (balloonconfig.sprite) {
    this.img = game.add.sprite(x, y, balloonconfig.img);
		if (balloonconfig.animation) {
			var anim = this.img.animations.add(balloonconfig.animation);
			// this.img.animations.add("explode");
		  if (typeof balloonconfig.onAnimationComplete == "object") {
		    balloonconfig.onAnimationComplete.forEach(function(handler) {
		      anim.onComplete.add(handler, _this);
		    })
		  }
		}
  } else {
    this.img = game.add.image(x, y, balloonconfig.img);
  }
  this.img.smoothed = false;
  this.img.inputEnabled = true;
  this.img.input.pixelPerfectClick = true;
  this.img.input.pixelPerfectAlpha = 1;
  this.img.width = this.img.width * balloonconfig.scale;
  this.img.height = this.img.height * balloonconfig.scale;

  this.onClick = balloonconfig.onClick;
  this.onOut = balloonconfig.onOut;
  this.onUpdate = balloonconfig.onUpdate;

  this.config = balloonconfig;

  if (typeof this.onClick == "object") {
    this.onClick.forEach(function(handler) {
      _this.img.events.onInputDown.add(handler, _this);
    })
  }
}

function normalBalloon_onClick() {
  if (!this.clicked) {
    this.clicked = true;
		//this.remove = true;
    state.total_popped += 1;
    state.normalBalloons_popped += 1;

    this.img.animations.play(this.config.animation, 40, false);

    snd_blop.play();
  }
}


function normalBalloon_onOut(balloon) {
  if (!balloon.clicked) {
    snd_miss.play()
    state.total_missed += 1;
    state.normalBalloons_missed += 1;
    state.lifes -= 1;
    if (state.lifes < 0) {
      cmode = "end";
    }
  }
}


function normalBalloon(name, img) {
  var config = {
    name: name + "Balloon",
    sprite: true,
    animation: "explode",
    ystart: 10,
    vmin: 0.1,
    vmax: 0.3,
    accel: 0,
    img: img,
    scale: 3,
    onClick: [normalBalloon_onClick, function() {state[name + "Balloons_popped"] += 1}],
    onOut: [normalBalloon_onOut, function() {state[name + "Balloons_missed"] += 1}],
		onAnimationComplete: [function() { this.remove = true; }]
  }

  return new Balloon(config);
}





function bomb() {
  var config = {
    name: "bomb",
    sprite: true,
    ystart: 10,
    vmin: 0.05,
    vmax: 0.1,
    accel: 0,
    img: "bomb",
    scale: 3,
    onClick: [function() {
			cmode = "end";
		}],
    onOut: [function() {
			state.bombs_missed += 1
		}],
		onUpdate: [function(balloon, dt) {

			// balloon.img.input.pointerOver() does not work when you don't move your mouse!
			if (Phaser.Rectangle.containsPoint(balloon.img._bounds, game.input.activePointer)) {
				balloon.img.animations.frame = 1;
			}
			else {
				balloon.img.animations.frame = 0;
			}
		}]
  }

  return new Balloon(config);
}




function clearbomb() {
  var config = {
    name: "clearbomb",
    sprite: true,
		animation: "explode",
    ystart: 10,
    vmin: 0.3,
    vmax: 0.4,
    accel: 0,
    img: "clearbomb",
    scale: 3,
    onClick: [function() {
			//cmode = "end";

			this.img.animations.play(this.config.animation, 60, false)

			state.clearbombs_popped += 1
		}],
    onOut: [function() {
			state.clearbombs_missed += 1
		}],
		onAnimationComplete: [function () {
			balloons.forEach(function(balloon) {
				balloon.remove = true;
			})
		}]
  }

  return new Balloon(config);
}






function changeBalloon() {
  var b = new Balloon({
    name: "changeBalloon",
    width: 64,
    height: 64,
    ystart: 10,
    vmin: 0.4,
    vmax: 0.6,
    accel: 0,
    img: 'balloon',
    scale: 3,
    onClick: [normalBalloon_onClick, function() {
      state.changeBalloonns_popped += 1;
      state.lifes = Math.min(state.lifes + 1, 10);
      this.remove = true;
    }],
    onOut: [normalBalloon_onOut, function() {
      state.changeBalloons_missed += 1;
    }],
    onUpdate: [function(balloon, dt) {
      balloon.hue += (balloon.hue_v * dt)
      var c = colors[Math.floor(balloon.hue % 359)]
      balloon.img.tint = (c.r << 16) + (c.g << 8) + c.b
    }]
  })

  b.hue = getRandomInt(0, 359);
  b.hue_v = getRandom(0.01, 1);

  return b
}



function updateStats() {

  // Add missing lifes
  for (i=state.lifes_img.length; i<state.lifes; i++) {
    var life = game.add.image(game.width - 16, 16, "heart");
    life.width = life.width * config.heart_scale;
    life.height = life.height * config.heart_scale;
    life.x -= (i+1) * life.width;
    life.smoothed = false;
    state.lifes_img.push(life);
  }

  // Remove to many lifes
  state.lifes_img = state.lifes_img.map(function(life, index, lifes) {
    if (state.lifes <= index) {
      if (life) {
        life.destroy();
      }
      lifes.pop();
    } else {
      return life;
    }
  })

	bmpText.text = state.total_popped;
	span_score.innerHTML = state.total_popped;

}




function preload() {
	// background Image
  game.load.image('logo', 'assets/logo.png');

  // heart symbole
  game.load.image('heart', 'assets/heart.png');

	// Sounds
  game.load.audio('blop', 'assets/blop.mp3');
  game.load.audio('end', 'assets/end.mp3');
  game.load.audio('miss', 'assets/miss.mp3');

	// Main font
  game.load.bitmapFont('gem', 'assets/gem.png', 'assets/gem.xml');



  // transparent balloon
  game.load.image('balloon', 'assets/balloon.png');
	// bomb
	game.load.spritesheet('bomb', 'assets/bomb.png', 30, 30);
	// clearbomb
	game.load.spritesheet('clearbomb', 'assets/clearbomb.png', 30, 30);
  // load all normal balloon images
  config.balloon_colors.forEach(function(color) {
    game.load.spritesheet('balloon_' + color, 'assets/balloon_' + color + '.png', config.balloon_sprite_width, config.balloon_sprite_height, config.balloon_sprite_count);
  });
}

function create() {
  colors = Phaser.Color.HSVColorWheel();
  time = game.time.time;
  state.startTime = time;

  snd_blop = game.add.audio("blop");
  snd_end = game.add.audio("end");
  snd_miss = game.add.audio("miss");

  logo = game.add.image(game.width / 2, game.height / 2, "logo");
  logo.anchor.setTo(0.5, 0.5);
  logo.smoothed = false;
	var scale = ( game.width / 2 ) / logo.width;

  logo.width = logo.width * scale;
  logo.height = logo.height * scale;

  bmpText = game.add.bitmapText(16, 16, 'gem', text, 32);

	game.stage.backgroundColor = colors[200].rgba;

}

function update() {
  var dt = (game.time.time - time);
  time = game.time.time;

  if (cmode == "start") {
    state = {
      total_popped: 0,
      normalBalloons_popped: 0,
      total_missed: 0,
      normalBalloons_missed: 0,
      startTime: time,
      hue: 200,
      lifes: config.max_lifes,
      lifes_img: Array(0),
      timepassed: 0,
			speed: 0,
      timers: [
        {
          left: getRandomInt(config.normal_spawn_min, config.normal_spawn_max),
          action: function() {
            var color = getRandomElement(config.balloon_colors);
            balloons.push(normalBalloon(color, "balloon_" + color));
          },
          min: config.normal_spawn_min,
          max: config.normal_spawn_max,
          consume: false,
        },
        {
          left: getRandomInt(120000, 180000),
          action: function() {
						balloons.push(changeBalloon())
					},
          min: 60000,
          max: 120000,
          consume: false,
        },
				{
          left: getRandomInt(60000, 90000),
          action: function() {
            balloons.push(bomb());
          },
          min: 25000,
          max: 45000,
          consume: false,
        },
				{
          left: getRandomInt(90000, 120000),
          action: function() {
            balloons.push(clearbomb());
          },
          min: 50000,
          max: 90000,
          consume: false,
        },
      ]
    }
    // try_again.visible = false;
    balloons = Array(0);

		showModal();

    cmode = "game";
  }
  else if (cmode == "game") {
    state.hue = (state.hue + (dt / 100)) % 359;
    game.stage.backgroundColor = colors[Math.floor(state.hue)].rgba;
    state.timepassed += dt;

    //logo.tint = logo.tint + (dt * 0x010101) % 0xFFFFFF;

    state.timers.forEach(function(countdown) {
      countdown.left -= dt;
      if (countdown.left <= 0) {
        countdown.left = getRandomInt(countdown.min, countdown.max);
        if (typeof countdown.action == "object") {
            countdown.action.forEach( function(action) {
              action(countdown);
            })
        } else {
          countdown.action(countdown);
        }
      }
    });


    balloons = balloons.filter( function(balloon) {
      if (!balloon.img.inCamera) {
        if (typeof balloon.onOut == "object") {
            balloon.onOut.forEach( function(action) {
              action(balloon);
            })
        }
        return false;
      }
			if (balloon.remove) {
				balloon.img.destroy();
				return false;
			}
      if (typeof balloon.onUpdate == "object") {
          balloon.onUpdate.forEach( function(action) {
            action(balloon, dt);
          })
      }

			state.speed = Math.min(state.speed + dt * config.speed_accel, config.speed_max)
      balloon.img.y -= (dt * balloon.velocity) + (dt * state.speed);

      return true;
    });


    updateStats();

  } else if (cmode == "end") {

		if (config.debug_mode) {
			console.log("DEBUG MODE: You'd be dead right now!")
			console.log("DEBUG MODE: Resetting lives, rejoining game...")
			state.lifes = config.max_lifes;
			cmode = "game"
			return
		}


    balloons.filter(function(balloon) {
      balloon.img.destroy();
      return false;
    })

    //bmpText.text = "GAME OVER";

    //try_again.visible = true;

    showModal("gameover");
    cmode = "ended"

  } else if (cmode == "ended") {

  } else if (cmode == "about") {
		bmpText.text = "";
		showModal("about")
  }
}
