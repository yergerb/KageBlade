(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const GROUND_Y = 426;
  const WORLD_W = 1840;
  const GRAVITY = 0.78;
  const AIR_DRAG = 0.985;
  const FLOOR_FRICTION = 0.82;

  const keys = new Set();
  const prevInput = {};
  const particles = [];
  const afterImages = [];
  const damageTexts = [];

  let cameraX = 0;
  let shake = 0;
  let freezeFrames = 0;
  let roundPulse = 0;
  let gameOverTimer = 0;
  let last = performance.now();
  let accumulator = 0;

  const moves = {
    horizontal: {
      name: "Moon-Cut",
      button: "X",
      startup: 7,
      active: 9,
      recovery: 17,
      damage: 13,
      chip: 2,
      stun: 17,
      push: 8.2,
      freeze: 5,
      shake: 5,
      meter: 9,
      hitbox: { x: 34, y: -122, w: 128, h: 62 },
    },
    vertical: {
      name: "Sky-Split",
      button: "Y",
      startup: 12,
      active: 10,
      recovery: 25,
      damage: 20,
      chip: 3,
      stun: 24,
      push: 6.4,
      lift: -7.4,
      freeze: 7,
      shake: 8,
      meter: 13,
      hitbox: { x: 20, y: -174, w: 96, h: 154 },
    },
    kick: {
      name: "Heel Burst",
      button: "B",
      startup: 5,
      active: 7,
      recovery: 13,
      damage: 8,
      chip: 1,
      stun: 14,
      push: 9.4,
      freeze: 3,
      shake: 3,
      meter: 6,
      hitbox: { x: 26, y: -82, w: 82, h: 42 },
    },
    grab: {
      name: "Chain Throw",
      button: "RB",
      startup: 8,
      active: 7,
      recovery: 24,
      damage: 11,
      stun: 30,
      push: 12.5,
      freeze: 6,
      shake: 6,
      meter: 12,
      throw: true,
      hitbox: { x: 24, y: -118, w: 64, h: 94 },
    },
  };

  const fighters = [
    makeFighter({
      name: "Ren",
      title: "Ronin Greatsword",
      weapon: "greatsword",
      x: 520,
      palette: {
        coat: "#2d2f3c",
        trim: "#ffcc5c",
        cloth: "#f4f0df",
        sash: "#d83d36",
        hair: "#111116",
        skin: "#f1c7a6",
        blade: "#d9e7ef",
        aura: "#ffcc5c",
      },
      player: true,
    }),
    makeFighter({
      name: "Kaida",
      title: "Crimson Nunchaku",
      weapon: "nunchaku",
      x: 760,
      palette: {
        coat: "#60192f",
        trim: "#44d6b0",
        cloth: "#161116",
        sash: "#7a62ff",
        hair: "#f7e2bd",
        skin: "#e8b28e",
        blade: "#cfd9df",
        aura: "#44d6b0",
      },
      player: false,
    }),
  ];

  window.addEventListener("keydown", (event) => {
    const k = keyName(event);
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
      event.preventDefault();
    }
    keys.add(k);
    if (k === "Enter" && gameOverTimer > 45) resetRound();
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(keyName(event));
  });

  requestAnimationFrame(loop);

  function makeFighter(options) {
    return {
      ...options,
      y: GROUND_Y,
      vx: 0,
      vy: 0,
      facing: options.x < W / 2 ? 1 : -1,
      width: 54,
      height: 154,
      health: 100,
      maxHealth: 100,
      meter: 24,
      action: null,
      actionFrame: 0,
      activeHit: false,
      hitTargets: new Set(),
      stun: 0,
      blockStun: 0,
      parryFrames: 0,
      parryCooldown: 0,
      invuln: 0,
      grabLock: 0,
      onGround: true,
      blocking: false,
      hurtFlash: 0,
      aiClock: 0,
      aiIntent: null,
      aiHold: 0,
      combo: 0,
      comboTimer: 0,
      lastMove: "",
      winPose: 0,
    };
  }

  function loop(now) {
    const delta = Math.min(0.05, (now - last) / 1000);
    last = now;
    accumulator += delta;

    while (accumulator >= 1 / 60) {
      update();
      accumulator -= 1 / 60;
    }

    render();
    requestAnimationFrame(loop);
  }

  function update() {
    if (freezeFrames > 0) {
      freezeFrames -= 1;
      updateEffects(true);
      return;
    }

    const playerInput = readPlayerInput();
    const aiInput = readAiInput(fighters[1], fighters[0]);

    updateFighter(fighters[0], fighters[1], playerInput, "p1");
    updateFighter(fighters[1], fighters[0], aiInput, "ai");
    resolveAttacks(fighters[0], fighters[1]);
    resolveAttacks(fighters[1], fighters[0]);
    keepApart(fighters[0], fighters[1]);
    updateCamera();
    updateEffects(false);
    updateRoundState();
    Object.assign(prevInput, playerInput);
  }

  function keyName(event) {
    if (event.key === " ") return "Space";
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
  }

  function readPlayerInput() {
    const pad = navigator.getGamepads ? navigator.getGamepads()[0] : null;
    const axisX = pad ? deadzone(pad.axes[0] || 0, 0.22) : 0;
    const axisY = pad ? deadzone(pad.axes[1] || 0, 0.38) : 0;
    const button = (i) => Boolean(pad && pad.buttons[i] && pad.buttons[i].pressed);

    return {
      left: keys.has("ArrowLeft") || axisX < -0.2 || button(14),
      right: keys.has("ArrowRight") || axisX > 0.2 || button(15),
      up: keys.has("ArrowUp") || keys.has("w") || keys.has("Space") || axisY < -0.55 || button(12),
      down: keys.has("ArrowDown") || axisY > 0.55 || button(13),
      horizontal: keys.has("x") || keys.has("j") || button(2),
      vertical: keys.has("y") || keys.has("i") || button(3),
      kick: keys.has("b") || keys.has("k") || button(1),
      block: keys.has("a") || keys.has("l") || button(0) || button(7),
      grab: keys.has("r") || keys.has("o") || button(5),
      parry: keys.has("q") || keys.has("u") || button(6),
      flip: keys.has("e") || keys.has("p") || keys.has("Shift") || button(4),
    };
  }

  function justPressed(input, key) {
    return input[key] && !prevInput[key];
  }

  function deadzone(v, dz) {
    return Math.abs(v) < dz ? 0 : v;
  }

  function readAiInput(ai, target) {
    if (target.health <= 0 || ai.health <= 0) return {};
    const dist = target.x - ai.x;
    const abs = Math.abs(dist);
    const input = {};

    ai.aiClock += 1;
    if (ai.aiHold > 0) {
      ai.aiHold -= 1;
      return { ...ai.aiIntent };
    }

    if (ai.stun || ai.action || ai.blockStun || ai.grabLock) {
      return {};
    }

    if (target.action && abs < 170 && Math.random() < 0.038) {
      ai.aiIntent = Math.random() < 0.36 ? { parry: true } : { block: true };
      ai.aiHold = ai.aiIntent.parry ? 7 : 22;
      return { ...ai.aiIntent };
    }

    if (abs > 148) {
      input.left = dist < 0;
      input.right = dist > 0;
      if (ai.aiClock % 92 === 0 && Math.random() < 0.34) input.flip = true;
    } else if (abs < 64) {
      input.left = dist > 0;
      input.right = dist < 0;
      if (Math.random() < 0.025) input.grab = true;
    } else if (ai.aiClock % 22 === 0 || Math.random() < 0.012) {
      const roll = Math.random();
      if (roll < 0.42) input.horizontal = true;
      else if (roll < 0.67) input.kick = true;
      else if (roll < 0.88) input.vertical = true;
      else input.grab = true;
    }

    if (target.blocking && abs < 92 && Math.random() < 0.024) input.grab = true;
    ai.aiIntent = input;
    ai.aiHold = 4 + Math.floor(Math.random() * 8);
    return input;
  }

  function updateFighter(f, opponent, input, inputId) {
    const alive = f.health > 0;
    if (!alive) {
      f.vx *= FLOOR_FRICTION;
      f.winPose = 0;
    }

    if (f.hurtFlash > 0) f.hurtFlash -= 1;
    if (f.stun > 0) f.stun -= 1;
    if (f.blockStun > 0) f.blockStun -= 1;
    if (f.parryFrames > 0) f.parryFrames -= 1;
    if (f.parryCooldown > 0) f.parryCooldown -= 1;
    if (f.invuln > 0) f.invuln -= 1;
    if (f.grabLock > 0) f.grabLock -= 1;
    if (f.comboTimer > 0) f.comboTimer -= 1;
    else f.combo = 0;

    if (alive && !f.action && !f.stun && !f.blockStun && !f.grabLock) {
      f.facing = opponent.x >= f.x ? 1 : -1;
    }

    const moveDir = Number(Boolean(input.right)) - Number(Boolean(input.left));
    const canControl = alive && !f.stun && !f.blockStun && !f.grabLock;
    const attacking = Boolean(f.action && moves[f.action]);
    f.blocking = canControl && !attacking && !f.action && (input.block || f.blockStun > 0) && f.onGround;

    if (canControl && f.health > 0) {
      if (!f.action && !f.blocking) {
        if (inputId === "p1") {
          if (justPressed(input, "parry")) startParry(f);
          else if (justPressed(input, "flip")) startFlip(f, moveDir);
          else if (justPressed(input, "grab")) startAttack(f, "grab");
          else if (justPressed(input, "vertical")) startAttack(f, "vertical");
          else if (justPressed(input, "horizontal")) startAttack(f, "horizontal");
          else if (justPressed(input, "kick")) startAttack(f, "kick");
        } else {
          if (input.parry) startParry(f);
          else if (input.flip) startFlip(f, moveDir);
          else if (input.grab) startAttack(f, "grab");
          else if (input.vertical) startAttack(f, "vertical");
          else if (input.horizontal) startAttack(f, "horizontal");
          else if (input.kick) startAttack(f, "kick");
        }
      }

      if (!f.action || f.action === "flip") {
        const speed = f.blocking ? 0.45 : f.onGround ? 1.18 : 0.54;
        const cap = f.blocking ? 2.1 : f.onGround ? 6.0 : 5.1;
        f.vx += moveDir * speed;
        f.vx = clamp(f.vx, -cap, cap);
      }

      if (input.up && f.onGround && !f.blocking && !f.action) {
        f.vy = -14.3;
        f.onGround = false;
        puff(f.x, GROUND_Y - 5, 10, "#f5ecd9", 0.9);
      }
    }

    if (f.action) updateAction(f);

    if (f.blocking) f.vx *= 0.76;
    if (f.onGround && !f.action) f.vx *= FLOOR_FRICTION;
    if (!f.onGround) f.vx *= AIR_DRAG;
    if (!f.onGround || f.vy < 0) f.vy += GRAVITY;

    f.x += f.vx;
    f.y += f.vy;

    if (f.y >= GROUND_Y) {
      if (!f.onGround && f.vy > 7) {
        puff(f.x, GROUND_Y - 4, 14, "#f5ecd9", 1);
        addShake(2);
      }
      f.y = GROUND_Y;
      f.vy = 0;
      f.onGround = true;
    } else {
      f.onGround = false;
    }

    if (f.x < 88) {
      f.x = 88;
      f.vx = Math.max(0, f.vx);
    }
    if (f.x > WORLD_W - 88) {
      f.x = WORLD_W - 88;
      f.vx = Math.min(0, f.vx);
    }

    if (Math.abs(f.vx) > 2.3 && f.onGround && alive && !f.action && frameEvery(7)) {
      puff(f.x - f.facing * 16, GROUND_Y - 2, 2, "#f5ecd9", 0.48);
    }
  }

  function startAttack(f, type) {
    f.action = type;
    f.actionFrame = 0;
    f.activeHit = false;
    f.hitTargets.clear();
    f.lastMove = moves[type].name;
    f.vx *= type === "vertical" ? 0.35 : 0.58;
    if (type === "kick") f.vx += f.facing * 1.8;
    if (type === "grab") f.vx += f.facing * 1.0;
    afterImage(f, 0.22);
  }

  function startParry(f) {
    if (f.parryCooldown > 0 || f.meter < 4) return;
    f.action = "parry";
    f.actionFrame = 0;
    f.parryFrames = 12;
    f.parryCooldown = 35;
    f.meter = Math.max(0, f.meter - 4);
    f.vx *= 0.25;
    ring(f.x + f.facing * 18, f.y - 92, f.palette.aura, 24);
  }

  function startFlip(f, dir) {
    f.action = "flip";
    f.actionFrame = 0;
    f.invuln = 22;
    f.onGround = false;
    f.vy = -10.6;
    f.vx = (dir || -f.facing) * 8.8;
    afterImage(f, 0.36);
    puff(f.x, GROUND_Y - 4, 15, f.palette.aura, 0.82);
  }

  function updateAction(f) {
    f.actionFrame += 1;
    if (moves[f.action]) {
      const m = moves[f.action];
      const end = m.startup + m.active + m.recovery;
      f.activeHit = f.actionFrame >= m.startup && f.actionFrame < m.startup + m.active;
      if (f.actionFrame === m.startup) {
        addSwingParticles(f, m);
      }
      if (f.actionFrame >= end) {
        f.action = null;
        f.activeHit = false;
      }
      return;
    }

    if (f.action === "parry" && f.actionFrame > 23) {
      f.action = null;
    }

    if (f.action === "flip") {
      if (f.actionFrame % 4 === 0) afterImage(f, 0.24);
      if (f.actionFrame > 30 && f.onGround) {
        f.action = null;
      }
    }

    if (f.action === "parried" && f.actionFrame > 23) {
      f.action = null;
    }
  }

  function resolveAttacks(attacker, target) {
    if (!attacker.action || !moves[attacker.action] || !attacker.activeHit || attacker.hitTargets.has(target)) {
      return;
    }
    if (target.health <= 0 || target.invuln > 0) return;

    const hitbox = getAttackBox(attacker, moves[attacker.action]);
    const hurtbox = getHurtBox(target);
    if (!rectsOverlap(hitbox, hurtbox)) return;

    attacker.hitTargets.add(target);
    const move = moves[attacker.action];
    const attackFromFront = (attacker.x - target.x) * target.facing > -8;

    if (!move.throw && target.parryFrames > 0 && attackFromFront) {
      parrySuccess(target, attacker);
      return;
    }

    if (!move.throw && target.blocking && attackFromFront) {
      blockHit(target, attacker, move);
      return;
    }

    if (move.throw && (target.onGround === false || target.action === "flip")) {
      whiffGrab(attacker);
      return;
    }

    landHit(attacker, target, move);
  }

  function getAttackBox(f, move) {
    const hb = move.hitbox;
    const x = f.facing === 1 ? f.x + hb.x : f.x - hb.x - hb.w;
    return { x, y: f.y + hb.y, w: hb.w, h: hb.h };
  }

  function getHurtBox(f) {
    return {
      x: f.x - f.width / 2,
      y: f.y - f.height,
      w: f.width,
      h: f.height,
    };
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function parrySuccess(defender, attacker) {
    defender.action = null;
    defender.parryFrames = 0;
    defender.meter = clamp(defender.meter + 22, 0, 100);
    attacker.action = "parried";
    attacker.actionFrame = 0;
    attacker.stun = 28;
    attacker.vx = -attacker.facing * 7;
    attacker.vy = Math.min(attacker.vy, -3);
    freezeFrames = 7;
    addShake(9);
    slashBurst(attacker.x - attacker.facing * 18, attacker.y - 98, defender.palette.aura, 26);
    damageTexts.push(makeText("PARRY", defender.x, defender.y - 168, defender.palette.aura, 26));
  }

  function blockHit(target, attacker, move) {
    target.health = Math.max(0, target.health - move.chip);
    target.blockStun = 12;
    target.vx = attacker.facing * move.push * 0.38;
    attacker.vx *= 0.2;
    attacker.meter = clamp(attacker.meter + move.meter * 0.35, 0, 100);
    target.meter = clamp(target.meter + 7, 0, 100);
    freezeFrames = 2;
    addShake(move.shake * 0.35);
    slashBurst(target.x - target.facing * 20, target.y - 95, "#8bd7ff", 12);
    damageTexts.push(makeText("BLOCK", target.x, target.y - 164, "#8bd7ff", 18));
  }

  function landHit(attacker, target, move) {
    target.health = Math.max(0, target.health - move.damage);
    target.stun = move.stun;
    target.blocking = false;
    target.hurtFlash = 12;
    target.vx = attacker.facing * move.push;
    if (move.lift) {
      target.vy = move.lift;
      target.onGround = false;
    } else if (move.throw) {
      target.vy = -8.8;
      target.onGround = false;
      target.grabLock = 22;
      target.x = attacker.x + attacker.facing * 54;
    }
    attacker.meter = clamp(attacker.meter + move.meter, 0, 100);
    attacker.combo += 1;
    attacker.comboTimer = 58;
    freezeFrames = move.freeze;
    addShake(move.shake);
    slashBurst(target.x, target.y - 92, move.throw ? attacker.palette.aura : "#ffffff", move.throw ? 26 : 18);
    damageTexts.push(makeText(`-${move.damage}`, target.x, target.y - 158, "#ffffff", 20));
    if (attacker.combo > 1) {
      damageTexts.push(makeText(`${attacker.combo} HIT`, attacker.x + attacker.facing * 56, attacker.y - 190, attacker.palette.aura, 18));
    }
    if (target.health <= 0) {
      target.stun = 80;
      target.vx = attacker.facing * 11;
      target.vy = -11;
      gameOverTimer = 1;
      roundPulse = 34;
    }
  }

  function whiffGrab(attacker) {
    attacker.vx *= 0.25;
    damageTexts.push(makeText("MISS", attacker.x + attacker.facing * 48, attacker.y - 145, "#b7b1a5", 14));
  }

  function keepApart(a, b) {
    const minDist = 46;
    const dx = b.x - a.x;
    const overlap = minDist - Math.abs(dx);
    if (overlap > 0 && a.health > 0 && b.health > 0) {
      const dir = dx >= 0 ? 1 : -1;
      a.x -= (overlap / 2) * dir;
      b.x += (overlap / 2) * dir;
    }
  }

  function updateCamera() {
    const mid = (fighters[0].x + fighters[1].x) / 2;
    const desired = clamp(mid - W / 2, 0, WORLD_W - W);
    cameraX += (desired - cameraX) * 0.08;
    if (shake > 0) shake *= 0.84;
    if (roundPulse > 0) roundPulse -= 1;
  }

  function updateEffects(frozen) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      if (!frozen) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.life -= 1;
        p.spin += p.rot;
      } else {
        p.life -= 0.35;
      }
      if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = afterImages.length - 1; i >= 0; i -= 1) {
      afterImages[i].life -= 1;
      if (afterImages[i].life <= 0) afterImages.splice(i, 1);
    }

    for (let i = damageTexts.length - 1; i >= 0; i -= 1) {
      const t = damageTexts[i];
      t.y += t.vy;
      t.vy *= 0.94;
      t.life -= 1;
      if (t.life <= 0) damageTexts.splice(i, 1);
    }
  }

  function updateRoundState() {
    const winner = fighters.find((f) => f.health > 0);
    const loser = fighters.find((f) => f.health <= 0);
    if (winner && loser) {
      winner.winPose += 1;
      gameOverTimer += 1;
      if (gameOverTimer > 210) {
        resetRound();
      }
    }
  }

  function resetRound() {
    fighters[0].x = 520;
    fighters[0].y = GROUND_Y;
    fighters[1].x = 760;
    fighters[1].y = GROUND_Y;
    fighters.forEach((f) => {
      f.vx = 0;
      f.vy = 0;
      f.health = f.maxHealth;
      f.meter = 24;
      f.action = null;
      f.actionFrame = 0;
      f.activeHit = false;
      f.hitTargets.clear();
      f.stun = 0;
      f.blockStun = 0;
      f.parryFrames = 0;
      f.parryCooldown = 0;
      f.invuln = 0;
      f.grabLock = 0;
      f.onGround = true;
      f.blocking = false;
      f.hurtFlash = 0;
      f.combo = 0;
      f.comboTimer = 0;
      f.winPose = 0;
    });
    particles.length = 0;
    afterImages.length = 0;
    damageTexts.length = 0;
    gameOverTimer = 0;
    roundPulse = 28;
  }

  function render() {
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;
    ctx.save();
    ctx.translate(sx, sy);
    drawBackground();
    drawWorldInk();
    drawAfterImages();
    drawFighter(fighters[0]);
    drawFighter(fighters[1]);
    drawParticles();
    drawForeground();
    drawHud();
    drawRoundOver();
    ctx.restore();
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#211827");
    sky.addColorStop(0.44, "#5f2430");
    sky.addColorStop(0.68, "#bf6b42");
    sky.addColorStop(1, "#201714");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(-cameraX * 0.08, 0);
    ctx.fillStyle = "rgba(245, 236, 217, 0.9)";
    ctx.beginPath();
    ctx.arc(775, 88, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(16, 16, 20, 0.18)";
    for (let i = 0; i < 8; i += 1) {
      ctx.beginPath();
      ctx.arc(738 + i * 12, 74 + Math.sin(i) * 12, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    drawHalftone();

    ctx.save();
    ctx.translate(-cameraX * 0.18, 0);
    drawMountainBand(0, 284, "#2d2938", 0.95);
    drawMountainBand(280, 304, "#1d2530", 0.82);
    ctx.restore();

    ctx.save();
    ctx.translate(-cameraX * 0.45, 0);
    for (let i = -1; i < 8; i += 1) {
      drawPagoda(i * 282 + 50, 292, 1 + (i % 2) * 0.12);
    }
    ctx.restore();

    ctx.save();
    ctx.translate(-cameraX * 0.72, 0);
    drawTorii(270, 306, 1.05);
    drawTorii(1220, 318, 0.94);
    ctx.restore();

    ctx.save();
    ctx.translate(-cameraX, 0);
    drawGround();
    ctx.restore();
  }

  function drawHalftone() {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#101014";
    for (let y = 18; y < 274; y += 14) {
      for (let x = (y / 14) % 2 ? 10 : 2; x < W; x += 14) {
        const r = 1.2 + y / 210;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawMountainBand(offset, base, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(offset - 120, base);
    for (let x = offset - 120; x < WORLD_W + 220; x += 130) {
      ctx.lineTo(x + 50, base - 55 - Math.sin(x * 0.02) * 22);
      ctx.lineTo(x + 125, base);
    }
    ctx.lineTo(WORLD_W + 240, H);
    ctx.lineTo(offset - 120, H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPagoda(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = "rgba(18, 16, 22, 0.76)";
    ctx.strokeStyle = "rgba(245, 236, 217, 0.16)";
    ctx.lineWidth = 2;
    for (let floor = 0; floor < 3; floor += 1) {
      const yy = -floor * 42;
      ctx.beginPath();
      ctx.moveTo(-58 + floor * 8, yy);
      ctx.lineTo(58 - floor * 8, yy);
      ctx.lineTo(42 - floor * 6, yy - 17);
      ctx.lineTo(-42 + floor * 6, yy - 17);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(-34 + floor * 5, yy - 17, 68 - floor * 10, 38);
    }
    ctx.beginPath();
    ctx.moveTo(-20, -126);
    ctx.lineTo(0, -152);
    ctx.lineTo(20, -126);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawTorii(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = "#271117";
    ctx.strokeStyle = "#0a080a";
    ctx.lineWidth = 4;
    ctx.fillRect(-92, -58, 184, 16);
    ctx.strokeRect(-92, -58, 184, 16);
    ctx.fillRect(-72, -78, 144, 14);
    ctx.strokeRect(-72, -78, 144, 14);
    ctx.fillRect(-62, -44, 16, 122);
    ctx.fillRect(46, -44, 16, 122);
    ctx.strokeRect(-62, -44, 16, 122);
    ctx.strokeRect(46, -44, 16, 122);
    ctx.restore();
  }

  function drawGround() {
    const ground = ctx.createLinearGradient(0, GROUND_Y - 38, 0, H);
    ground.addColorStop(0, "#29201a");
    ground.addColorStop(1, "#111014");
    ctx.fillStyle = ground;
    ctx.fillRect(-80, GROUND_Y - 20, WORLD_W + 160, H - GROUND_Y + 22);

    ctx.fillStyle = "#08080a";
    for (let x = -70; x < WORLD_W + 70; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y + 17 + Math.sin(x) * 4);
      ctx.lineTo(x + 48, GROUND_Y + 10 + Math.cos(x) * 3);
      ctx.lineTo(x + 70, GROUND_Y + 68);
      ctx.lineTo(x - 12, GROUND_Y + 75);
      ctx.closePath();
      ctx.globalAlpha = 0.23;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = "rgba(245, 236, 217, 0.28)";
    ctx.lineWidth = 2;
    for (let x = 0; x < WORLD_W; x += 150) {
      jaggedLine(x, GROUND_Y + 8, x + 118, GROUND_Y + 2, 5);
    }

    ctx.fillStyle = "rgba(255, 180, 61, 0.06)";
    ctx.fillRect(0, GROUND_Y - 20, WORLD_W, 14);
  }

  function drawWorldInk() {
    ctx.save();
    ctx.translate(-cameraX, 0);
    ctx.strokeStyle = "rgba(16, 16, 20, 0.55)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 15; i += 1) {
      const x = (i * 153 + 40) % WORLD_W;
      const y = 80 + ((i * 67) % 240);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 120 + (i % 4) * 28, y - 10 - (i % 3) * 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawAfterImages() {
    afterImages.forEach((ghost) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ghost.life / ghost.maxLife) * ghost.alpha;
      drawFighterShape(ghost.fighter, ghost.x, ghost.y, ghost.facing, true, ghost.tint);
      ctx.restore();
    });
  }

  function drawFighter(f) {
    drawShadow(f);
    drawAttackTrail(f);
    drawFighterShape(f, f.x, f.y, f.facing, false);
    if (f.parryFrames > 0) {
      ctx.save();
      ctx.translate(f.x - cameraX + f.facing * 22, f.y - 90);
      ctx.strokeStyle = f.palette.aura;
      ctx.globalAlpha = 0.72;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 26 - f.parryFrames * 0.8, -0.5, Math.PI * 1.35);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawShadow(f) {
    ctx.save();
    ctx.translate(f.x - cameraX, GROUND_Y + 3);
    ctx.scale(1, 0.24);
    ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
    ctx.beginPath();
    ctx.arc(0, 0, 50 + Math.abs(f.vx) * 2, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawAttackTrail(f) {
    if (!f.action || !moves[f.action]) return;
    const move = moves[f.action];
    const total = move.startup + move.active + move.recovery;
    const t = clamp(f.actionFrame / total, 0, 1);
    const activeGlow = f.actionFrame >= move.startup - 2 && f.actionFrame <= move.startup + move.active + 3;
    if (!activeGlow) return;

    ctx.save();
    ctx.translate(f.x - cameraX, f.y);
    ctx.scale(f.facing, 1);
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.65;
    ctx.strokeStyle = f.palette.aura;
    ctx.lineWidth = f.action === "vertical" ? 18 : 15;
    ctx.lineCap = "round";

    if (f.action === "horizontal") {
      ctx.beginPath();
      ctx.arc(18, -104, 116, -0.52 + t * 0.4, 0.48 + t * 0.4);
      ctx.stroke();
      ctx.globalAlpha = 0.34;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 6;
      ctx.stroke();
    } else if (f.action === "vertical") {
      ctx.beginPath();
      ctx.arc(18, -94, 124, -1.52 + t * 0.5, 0.68 + t * 0.38);
      ctx.stroke();
      ctx.globalAlpha = 0.34;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 6;
      ctx.stroke();
    } else if (f.action === "kick") {
      ctx.beginPath();
      ctx.moveTo(42, -70);
      ctx.quadraticCurveTo(82, -84, 118, -62);
      ctx.stroke();
    } else if (f.action === "grab") {
      ctx.strokeStyle = "#ffffff";
      ctx.globalAlpha = 0.34;
      ctx.setLineDash([8, 7]);
      ctx.beginPath();
      ctx.arc(42, -94, 44, -0.72, 0.94);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFighterShape(f, x, y, facing, ghost, tint) {
    const px = x - cameraX;
    const action = f.action || "idle";
    const actionFrame = f.actionFrame || 0;
    const walk = Math.sin((x + performance.now() * 0.24) * 0.045) * Math.min(1, Math.abs(f.vx) / 4);
    const hit = f.hurtFlash > 0 && !ghost;
    const pal = f.palette;

    ctx.save();
    ctx.translate(px, y);
    ctx.scale(facing, 1);
    if (action === "flip") {
      ctx.rotate((actionFrame / 30) * Math.PI * 2 * -facing);
      ctx.translate(0, -18);
    }
    if (action === "parried") ctx.rotate(Math.sin(actionFrame * 0.6) * 0.08);

    if (ghost) {
      ctx.fillStyle = tint || pal.aura;
      ctx.strokeStyle = tint || pal.aura;
    }

    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = ghost ? tint || pal.aura : "#08080a";
    ctx.lineWidth = 6;

    const crouch = f.blocking ? 8 : 0;
    const lean = action === "horizontal" ? 8 : action === "vertical" ? -5 : action === "grab" ? 11 : f.blocking ? -5 : 0;
    const torsoY = -102 + crouch;
    const headY = -144 + crouch;

    drawScarf(pal, actionFrame, action);
    drawLegs(pal, walk, crouch, ghost);
    drawTorso(pal, torsoY, lean, hit, ghost);
    drawArmsAndWeapon(f, pal, action, actionFrame, ghost);
    drawHead(pal, headY, hit, ghost);

    if (f.blocking && !ghost) drawBlockGuard(f, pal);
    if (f.invuln > 0 && !ghost) drawFlipAura(pal);

    ctx.restore();
  }

  function drawScarf(pal, actionFrame, action) {
    ctx.save();
    ctx.strokeStyle = "#08080a";
    ctx.lineWidth = 9;
    ctx.fillStyle = pal.sash;
    const snap = action === "horizontal" || action === "flip" ? 26 : 14;
    ctx.beginPath();
    ctx.moveTo(-8, -128);
    ctx.bezierCurveTo(-42, -132, -52 - actionFrame * 0.2, -118 + Math.sin(actionFrame) * 3, -74 - snap, -126);
    ctx.lineTo(-70 - snap, -113);
    ctx.bezierCurveTo(-45, -112, -28, -118, -6, -121);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }

  function drawLegs(pal, walk, crouch, ghost) {
    ctx.save();
    ctx.strokeStyle = ghost ? pal.aura : "#08080a";
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(-13, -70 + crouch);
    ctx.lineTo(-27 - walk * 8, -28);
    ctx.lineTo(-37 - walk * 12, -2);
    ctx.moveTo(14, -70 + crouch);
    ctx.lineTo(25 + walk * 9, -28);
    ctx.lineTo(44 + walk * 8, -4);
    ctx.stroke();

    ctx.strokeStyle = ghost ? pal.aura : pal.cloth;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-13, -70 + crouch);
    ctx.lineTo(-27 - walk * 8, -28);
    ctx.lineTo(-37 - walk * 12, -2);
    ctx.moveTo(14, -70 + crouch);
    ctx.lineTo(25 + walk * 9, -28);
    ctx.lineTo(44 + walk * 8, -4);
    ctx.stroke();

    ctx.fillStyle = ghost ? pal.aura : "#08080a";
    ctx.fillRect(-48 - walk * 12, -7, 28, 9);
    ctx.fillRect(32 + walk * 8, -9, 30, 9);
    ctx.restore();
  }

  function drawTorso(pal, y, lean, hit, ghost) {
    ctx.save();
    ctx.translate(0, y);
    ctx.rotate(lean * Math.PI / 180);
    ctx.fillStyle = hit ? "#ffffff" : ghost ? pal.aura : pal.coat;
    ctx.strokeStyle = ghost ? pal.aura : "#08080a";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-31, -28);
    ctx.lineTo(30, -30);
    ctx.lineTo(42, 40);
    ctx.quadraticCurveTo(0, 58, -42, 40);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();

    ctx.fillStyle = ghost ? pal.aura : pal.trim;
    ctx.beginPath();
    ctx.moveTo(-4, -27);
    ctx.lineTo(13, -20);
    ctx.lineTo(5, 46);
    ctx.lineTo(-15, 45);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = ghost ? pal.aura : pal.sash;
    ctx.fillRect(-39, 20, 78, 14);
    ctx.restore();
  }

  function drawHead(pal, y, hit, ghost) {
    ctx.save();
    ctx.translate(0, y);
    ctx.strokeStyle = ghost ? pal.aura : "#08080a";
    ctx.lineWidth = 5;
    ctx.fillStyle = hit ? "#ffffff" : ghost ? pal.aura : pal.skin;
    ctx.beginPath();
    ctx.arc(0, 0, 21, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fill();

    ctx.fillStyle = ghost ? pal.aura : pal.hair;
    ctx.beginPath();
    ctx.moveTo(-23, -5);
    ctx.quadraticCurveTo(-9, -32, 20, -18);
    ctx.quadraticCurveTo(9, -2, -3, 8);
    ctx.quadraticCurveTo(-12, 2, -23, -5);
    ctx.fill();

    if (!ghost) {
      ctx.strokeStyle = "#08080a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(7, -1);
      ctx.lineTo(18, -4);
      ctx.stroke();
      ctx.fillStyle = pal.aura;
      ctx.fillRect(11, -7, 8, 3);
    }
    ctx.restore();
  }

  function drawArmsAndWeapon(f, pal, action, frame, ghost) {
    if (f.weapon === "greatsword") drawGreatswordArms(f, pal, action, frame, ghost);
    else drawNunchakuArms(f, pal, action, frame, ghost);
  }

  function drawGreatswordArms(f, pal, action, frame, ghost) {
    const phase = action && moves[action] ? clamp(frame / (moves[action].startup + moves[action].active), 0, 1) : 0;
    let shoulder = { x: 24, y: -122 };
    let hand = { x: 54, y: -108 };
    let bladeA = { x: 38, y: -126 };
    let bladeB = { x: 114, y: -160 };
    let bladeAngle = -0.28;

    if (action === "horizontal") {
      hand = { x: 64 + phase * 38, y: -104 + Math.sin(phase * Math.PI) * 6 };
      bladeA = { x: hand.x - 14, y: hand.y - 12 };
      bladeB = { x: hand.x + 104, y: hand.y - 8 };
      bladeAngle = 0.04;
    } else if (action === "vertical") {
      hand = { x: 42 + phase * 28, y: -138 + phase * 84 };
      bladeA = { x: hand.x - 12, y: hand.y - 82 };
      bladeB = { x: hand.x + 34, y: hand.y + 70 };
      bladeAngle = 1.18;
    } else if (action === "kick") {
      hand = { x: 22, y: -112 };
      bladeA = { x: -26, y: -155 };
      bladeB = { x: 34, y: -72 };
      bladeAngle = 0.74;
    } else if (action === "grab") {
      hand = { x: 78, y: -108 };
      bladeA = { x: 10, y: -154 };
      bladeB = { x: 58, y: -72 };
      bladeAngle = 0.8;
    } else if (f.blocking) {
      hand = { x: 38, y: -118 };
      bladeA = { x: 36, y: -186 };
      bladeB = { x: 52, y: -42 };
      bladeAngle = 1.47;
    }

    ctx.save();
    ctx.strokeStyle = ghost ? pal.aura : "#08080a";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(hand.x, hand.y);
    ctx.stroke();
    ctx.strokeStyle = ghost ? pal.aura : pal.cloth;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(hand.x, hand.y);
    ctx.stroke();
    drawGreatsword(bladeA, bladeB, bladeAngle, pal, ghost);

    if (action === "kick") {
      drawKickingLeg(pal, phase, ghost);
    }
    ctx.restore();
  }

  function drawGreatsword(a, b, angle, pal, ghost) {
    ctx.save();
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.strokeStyle = ghost ? pal.aura : "#08080a";
    ctx.lineWidth = 7;
    ctx.fillStyle = ghost ? pal.aura : pal.blade;
    ctx.beginPath();
    ctx.moveTo(-len / 2, -9);
    ctx.lineTo(len / 2 - 12, -12);
    ctx.lineTo(len / 2 + 12, 0);
    ctx.lineTo(len / 2 - 12, 12);
    ctx.lineTo(-len / 2, 9);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.fillStyle = ghost ? pal.aura : pal.trim;
    ctx.fillRect(-len / 2 - 8, -18, 12, 36);
    ctx.fillStyle = ghost ? pal.aura : "#171116";
    ctx.fillRect(-len / 2 - 28, -5, 28, 10);
    ctx.restore();
  }

  function drawNunchakuArms(f, pal, action, frame, ghost) {
    const phase = action && moves[action] ? clamp(frame / (moves[action].startup + moves[action].active), 0, 1) : 0;
    let hand = { x: 45, y: -116 };
    let off = { x: -24, y: -114 };
    if (action === "horizontal") hand = { x: 70 + phase * 35, y: -108 + Math.sin(phase * Math.PI) * 10 };
    if (action === "vertical") hand = { x: 42 + phase * 34, y: -150 + phase * 90 };
    if (action === "kick") hand = { x: 26, y: -112 };
    if (action === "grab") hand = { x: 77, y: -108 };
    if (f.blocking) hand = { x: 34, y: -116 };

    ctx.save();
    ctx.strokeStyle = ghost ? pal.aura : "#08080a";
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(22, -120);
    ctx.lineTo(hand.x, hand.y);
    ctx.moveTo(-22, -119);
    ctx.lineTo(off.x, off.y);
    ctx.stroke();
    ctx.strokeStyle = ghost ? pal.aura : pal.cloth;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(22, -120);
    ctx.lineTo(hand.x, hand.y);
    ctx.moveTo(-22, -119);
    ctx.lineTo(off.x, off.y);
    ctx.stroke();

    drawNunchaku(hand.x, hand.y, phase, action, pal, ghost);
    if (action === "kick") drawKickingLeg(pal, phase, ghost);
    ctx.restore();
  }

  function drawNunchaku(x, y, phase, action, pal, ghost) {
    const spin = action && moves[action] ? phase * Math.PI * 1.7 : Math.sin(performance.now() * 0.006) * 0.3;
    const a1 = spin - 0.4;
    const a2 = spin + 0.96;
    const p1 = { x: x + Math.cos(a1) * 26, y: y + Math.sin(a1) * 26 };
    const p2 = { x: p1.x + Math.cos(a2) * 36, y: p1.y + Math.sin(a2) * 36 };
    ctx.save();
    ctx.strokeStyle = ghost ? pal.aura : "#08080a";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.strokeStyle = ghost ? pal.aura : pal.blade;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    drawStick(x, y, a1 + Math.PI / 2, pal, ghost);
    drawStick(p2.x, p2.y, a2 + Math.PI / 2, pal, ghost);
    ctx.restore();
  }

  function drawStick(x, y, angle, pal, ghost) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = ghost ? pal.aura : pal.trim;
    ctx.strokeStyle = ghost ? pal.aura : "#08080a";
    ctx.lineWidth = 4;
    ctx.fillRect(-5, -20, 10, 40);
    ctx.strokeRect(-5, -20, 10, 40);
    ctx.restore();
  }

  function drawKickingLeg(pal, phase, ghost) {
    ctx.save();
    ctx.strokeStyle = ghost ? pal.aura : "#08080a";
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(13, -68);
    ctx.lineTo(52 + phase * 34, -65);
    ctx.lineTo(88 + phase * 26, -52);
    ctx.stroke();
    ctx.strokeStyle = ghost ? pal.aura : pal.cloth;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(13, -68);
    ctx.lineTo(52 + phase * 34, -65);
    ctx.lineTo(88 + phase * 26, -52);
    ctx.stroke();
    ctx.fillStyle = ghost ? pal.aura : "#08080a";
    ctx.fillRect(83 + phase * 26, -57, 34, 11);
    ctx.restore();
  }

  function drawBlockGuard(f, pal) {
    ctx.save();
    ctx.globalAlpha = 0.58;
    ctx.strokeStyle = pal.aura;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(42, -174);
    ctx.quadraticCurveTo(76, -106, 43, -42);
    ctx.stroke();
    ctx.restore();
  }

  function drawFlipAura(pal) {
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.strokeStyle = pal.aura;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -92, 76, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawParticles() {
    particles.forEach((p) => {
      ctx.save();
      ctx.translate(p.x - cameraX, p.y);
      ctx.rotate(p.spin);
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife) * p.alpha;
      ctx.fillStyle = p.color;
      if (p.kind === "ring") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.08;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (1 - p.life / p.maxLife + 0.18), 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === "slash") {
        ctx.fillRect(-p.size * 0.5, -1.5, p.size, 3);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawForeground() {
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = "#08080a";
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, H - 68);
    ctx.quadraticCurveTo(160, H - 24, 322, H - 58);
    ctx.quadraticCurveTo(562, H - 98, W, H - 42);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    damageTexts.forEach((t) => {
      ctx.save();
      ctx.translate(t.x - cameraX, t.y);
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.font = `900 ${t.size}px ui-sans-serif, system-ui`;
      ctx.textAlign = "center";
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#08080a";
      ctx.fillStyle = t.color;
      ctx.strokeText(t.text, 0, 0);
      ctx.fillText(t.text, 0, 0);
      ctx.restore();
    });

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "#f5ecd9";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, W - 20, H - 20);
    ctx.restore();
  }

  function drawHud() {
    drawHealthBar(fighters[0], 34, 28, 360, 1);
    drawHealthBar(fighters[1], W - 394, 28, 360, -1);
    drawMeterBar(fighters[0], 34, 76, 230, 1);
    drawMeterBar(fighters[1], W - 264, 76, 230, -1);

    ctx.save();
    ctx.fillStyle = "#f5ecd9";
    ctx.strokeStyle = "#08080a";
    ctx.lineWidth = 6;
    ctx.font = "900 28px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.strokeText("KAGEBLADE", W / 2, 42);
    ctx.fillText("KAGEBLADE", W / 2, 42);
    ctx.font = "700 12px ui-sans-serif, system-ui";
    ctx.fillStyle = "rgba(245, 236, 217, 0.8)";
    ctx.fillText("Prototype 01", W / 2, 62);
    ctx.restore();
  }

  function drawHealthBar(f, x, y, w, dir) {
    const pct = clamp(f.health / f.maxHealth, 0, 1);
    ctx.save();
    ctx.translate(x, y);
    if (dir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.fillStyle = "rgba(8, 8, 10, 0.72)";
    ctx.fillRect(0, 0, w, 28);
    ctx.strokeStyle = "#08080a";
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, w, 28);
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, f.palette.aura);
    grad.addColorStop(0.56, "#f5ecd9");
    grad.addColorStop(1, "#e73535");
    ctx.fillStyle = grad;
    ctx.fillRect(4, 4, Math.max(0, (w - 8) * pct), 20);
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.fillRect(4, 4, Math.max(0, (w - 8) * pct), 6);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "#f5ecd9";
    ctx.strokeStyle = "#08080a";
    ctx.lineWidth = 4;
    ctx.font = "900 18px ui-sans-serif, system-ui";
    ctx.textAlign = dir > 0 ? "left" : "right";
    ctx.strokeText(f.name, dir > 0 ? x : x + w, y - 6);
    ctx.fillText(f.name, dir > 0 ? x : x + w, y - 6);
    ctx.font = "700 10px ui-sans-serif, system-ui";
    ctx.fillStyle = "rgba(245, 236, 217, 0.74)";
    ctx.fillText(f.title, dir > 0 ? x + 2 : x + w - 2, y + 47);
    ctx.restore();
  }

  function drawMeterBar(f, x, y, w, dir) {
    const pct = clamp(f.meter / 100, 0, 1);
    ctx.save();
    ctx.translate(x, y);
    if (dir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.fillStyle = "rgba(8, 8, 10, 0.74)";
    ctx.fillRect(0, 0, w, 10);
    ctx.strokeStyle = "#08080a";
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, w, 10);
    ctx.fillStyle = f.palette.aura;
    ctx.fillRect(3, 3, (w - 6) * pct, 4);
    ctx.restore();
  }

  function drawRoundOver() {
    if (!gameOverTimer) return;
    const winner = fighters.find((f) => f.health > 0);
    if (!winner) return;
    ctx.save();
    ctx.globalAlpha = clamp(gameOverTimer / 35, 0, 0.85);
    ctx.fillStyle = "rgba(8, 8, 10, 0.54)";
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = clamp(gameOverTimer / 35, 0, 1);
    ctx.textAlign = "center";
    ctx.font = "900 54px ui-sans-serif, system-ui";
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#08080a";
    ctx.fillStyle = winner.palette.aura;
    ctx.strokeText(`${winner.name} WINS`, W / 2, H / 2 - 8);
    ctx.fillText(`${winner.name} WINS`, W / 2, H / 2 - 8);
    ctx.font = "700 16px ui-sans-serif, system-ui";
    ctx.fillStyle = "#f5ecd9";
    ctx.fillText("REMATCH READY", W / 2, H / 2 + 30);
    ctx.restore();
  }

  function addSwingParticles(f, move) {
    const baseX = f.x + f.facing * (move.throw ? 58 : 96);
    const baseY = f.y + (move === moves.vertical ? -118 : -94);
    slashBurst(baseX, baseY, f.palette.aura, move.throw ? 8 : 12);
  }

  function puff(x, y, count, color, alpha) {
    for (let i = 0; i < count; i += 1) {
      particles.push({
        kind: "dot",
        x,
        y,
        vx: (Math.random() - 0.5) * 3.5,
        vy: -Math.random() * 2.2,
        gravity: 0.04,
        size: 2 + Math.random() * 5,
        color,
        alpha,
        life: 18 + Math.random() * 22,
        maxLife: 40,
        spin: 0,
        rot: 0,
      });
    }
  }

  function slashBurst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 7.8;
      particles.push({
        kind: Math.random() < 0.62 ? "slash" : "dot",
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.78,
        gravity: 0.035,
        size: 6 + Math.random() * 28,
        color,
        alpha: 0.86,
        life: 12 + Math.random() * 18,
        maxLife: 30,
        spin: angle,
        rot: (Math.random() - 0.5) * 0.24,
      });
    }
  }

  function ring(x, y, color, size) {
    particles.push({
      kind: "ring",
      x,
      y,
      vx: 0,
      vy: 0,
      gravity: 0,
      size,
      color,
      alpha: 0.75,
      life: 20,
      maxLife: 20,
      spin: 0,
      rot: 0,
    });
  }

  function afterImage(f, alpha) {
    afterImages.push({
      fighter: f,
      x: f.x,
      y: f.y,
      facing: f.facing,
      alpha,
      tint: f.palette.aura,
      life: 14,
      maxLife: 14,
    });
  }

  function makeText(text, x, y, color, size) {
    return {
      text,
      x,
      y,
      color,
      size,
      vy: -1.05,
      life: 46,
      maxLife: 46,
    };
  }

  function addShake(amount) {
    shake = Math.max(shake, amount);
  }

  function jaggedLine(x1, y1, x2, y2, chunks) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (let i = 1; i < chunks; i += 1) {
      const t = i / chunks;
      ctx.lineTo(lerp(x1, x2, t), lerp(y1, y2, t) + (Math.random() - 0.5) * 7);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function frameEvery(n) {
    return Math.floor(performance.now() / (1000 / 60)) % n === 0;
  }
})();
