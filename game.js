"use strict";

/* =========================================================
   SURVIVAL ISLAND - PIXEL ART V2
   Dependency-free mobile canvas game
   ========================================================= */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;

let W = 0;
let H = 0;
let dpr = Math.min(window.devicePixelRatio || 1, 2);

const state = {
    x: 0,
    y: 0,
    day: 1,
    time: 6 * 60,
    hp: 100,
    food: 100,

    wood: 12,
    stone: 8,
    berries: 4,

    axe: true,
    pickaxe: true,
    raft: false,

    dead: false,
    won: false,

    selected: 0,
    moving: false,
    dirX: 0,
    dirY: 0,

    message: "",
    messageTime: 0
};

const saveKey = "survivalIslandSaveV2";

const nodes = [];
const decorations = [];

let cameraX = 0;
let cameraY = 0;

let lastTime = performance.now();
let walkTime = 0;

/* ---------------------------------------------------------
   Resize
--------------------------------------------------------- */

function resize() {
    W = window.innerWidth;
    H = window.innerHeight;

    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);

    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
}

window.addEventListener("resize", resize);
resize();

/* ---------------------------------------------------------
   Utility
--------------------------------------------------------- */

function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}

function dist(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
}

function rand(min, max) {
    return Math.random() * (max - min) + min;
}

function irand(min, max) {
    return Math.floor(rand(min, max + 1));
}

function say(text) {
    state.message = text;
    state.messageTime = 2.2;

    const box = document.getElementById("message");

    if (box) {
        box.textContent = text;
    }
}

/* ---------------------------------------------------------
   Island
--------------------------------------------------------- */

const island = {
    radius: 900
};

function islandInside(x, y) {
    return Math.hypot(x, y) < island.radius;
}

function beachInside(x, y) {
    const r = Math.hypot(x, y);
    return r > island.radius - 80;
}

/* ---------------------------------------------------------
   World generation
--------------------------------------------------------- */

function generateWorld() {

    nodes.length = 0;
    decorations.length = 0;

    /* Trees */
    for (let i = 0; i < 30; i++) {
        let x, y;

        do {
            x = rand(-700, 700);
            y = rand(-650, 650);
        } while (
            !islandInside(x, y) ||
            dist(x, y, 0, 0) < 180
        );

        nodes.push({
            type: "tree",
            x,
            y,
            alive: true,
            size: rand(0.85, 1.25)
        });
    }

    /* Rocks */
    for (let i = 0; i < 22; i++) {
        let x, y;

        do {
            x = rand(-720, 720);
            y = rand(-680, 680);
        } while (
            !islandInside(x, y) ||
            dist(x, y, 0, 0) < 130
        );

        nodes.push({
            type: "rock",
            x,
            y,
            alive: true,
            size: rand(0.8, 1.15)
        });
    }

    /* Berry bushes */
    for (let i = 0; i < 16; i++) {
        let x, y;

        do {
            x = rand(-720, 720);
            y = rand(-680, 680);
        } while (
            !islandInside(x, y) ||
            dist(x, y, 0, 0) < 140
        );

        nodes.push({
            type: "berry",
            x,
            y,
            alive: true,
            size: rand(0.85, 1.15)
        });
    }

    /* Grass / flowers / decoration */
    for (let i = 0; i < 180; i++) {
        let x, y;

        do {
            x = rand(-820, 820);
            y = rand(-760, 760);
        } while (!islandInside(x, y));

        decorations.push({
            x,
            y,
            type: irand(0, 4)
        });
    }

    /* Fixed raft */
    nodes.push({
        type: "raft",
        x: 720,
        y: 300,
        alive: true
    });
}

/* ---------------------------------------------------------
   Save / Load
--------------------------------------------------------- */

function saveGame() {

    const data = {
        ...state
    };

    localStorage.setItem(saveKey, JSON.stringify(data));

    say("GAME SAVED");
}

function loadGame() {

    try {

        const raw = localStorage.getItem(saveKey);

        if (!raw) return;

        const data = JSON.parse(raw);

        Object.assign(state, data);

        state.dead = false;
        state.won = false;

    } catch (e) {
        console.log("Save load error", e);
    }
}

function resetGame() {

    localStorage.removeItem(saveKey);

    state.x = 0;
    state.y = 0;
    state.day = 1;
    state.time = 360;
    state.hp = 100;
    state.food = 100;

    state.wood = 12;
    state.stone = 8;
    state.berries = 4;

    state.axe = true;
    state.pickaxe = true;
    state.raft = false;

    state.dead = false;
    state.won = false;

    generateWorld();

    say("WELCOME TO SURVIVAL ISLAND");
}

/* ---------------------------------------------------------
   Time
--------------------------------------------------------- */

function updateTime(dt) {

    /* 1 real second = 1 game minute */
    state.time += dt * 60;

    if (state.time >= 1440) {
        state.time -= 1440;
        state.day++;

        state.food = clamp(state.food - 12, 0, 100);

        saveGame();
    }

    if (state.food <= 0) {
        state.hp -= dt * 2;
    }

    if (state.hp <= 0) {
        state.hp = 0;
        state.dead = true;
    }
}

/* ---------------------------------------------------------
   Player
--------------------------------------------------------- */

function updatePlayer(dt) {

    if (state.dead || state.won) return;

    if (!state.moving) return;

    const speed = 170;

    state.x += state.dirX * speed * dt;
    state.y += state.dirY * speed * dt;

    if (!islandInside(state.x, state.y)) {

        const len = Math.hypot(state.x, state.y);

        state.x = state.x / len * (island.radius - 12);
        state.y = state.y / len * (island.radius - 12);
    }

    walkTime += dt * 10;

    state.food -= dt * 0.35;

    if (state.food < 0) {
        state.food = 0;
    }
}

/* ---------------------------------------------------------
   Interaction
--------------------------------------------------------- */

function useObject() {

    if (state.dead || state.won) return;

    let closest = null;
    let best = 100000;

    for (const n of nodes) {

        if (!n.alive) continue;

        const d = dist(
            state.x,
            state.y,
            n.x,
            n.y
        );

        if (d < best) {
            best = d;
            closest = n;
        }
    }

    if (!closest || best > 95) {

        say("MOVE CLOSER");

        return;
    }

    if (closest.type === "tree") {

        if (!state.axe) {
            say("YOU NEED AN AXE");
            return;
        }

        state.wood += irand(3, 6);

        closest.alive = false;

        state.time += 8;

        say("+ WOOD");

        return;
    }

    if (closest.type === "rock") {

        if (!state.pickaxe) {
            say("YOU NEED A PICKAXE");
            return;
        }

        state.stone += irand(2, 5);

        closest.alive = false;

        state.time += 8;

        say("+ STONE");

        return;
    }

    if (closest.type === "berry") {

        state.berries += irand(2, 4);

        closest.alive = false;

        say("+ BERRIES");

        return;
    }

    if (closest.type === "raft") {

        if (!state.raft) {

            say("CRAFT THE RAFT FIRST");

            return;
        }

        state.won = true;

        say("YOU ESCAPED THE ISLAND!");

        return;
    }
}

/* ---------------------------------------------------------
   Craft
--------------------------------------------------------- */

function craft() {

    if (state.dead || state.won) return;

    if (!state.axe) {

        if (state.wood >= 3) {

            state.wood -= 3;
            state.axe = true;

            say("AXE CRAFTED");

        } else {
            say("NEED 3 WOOD");
        }

        return;
    }

    if (!state.pickaxe) {

        if (state.wood >= 2 && state.stone >= 2) {

            state.wood -= 2;
            state.stone -= 2;

            state.pickaxe = true;

            say("PICKAXE CRAFTED");

        } else {
            say("NEED 2 WOOD + 2 STONE");
        }

        return;
    }

    if (!state.raft) {

        if (state.wood >= 30 && state.stone >= 10) {

            state.wood -= 30;
            state.stone -= 10;

            state.raft = true;

            say("RAFT CRAFTED!");

        } else {

            say("RAFT: 30 WOOD + 10 STONE");
        }

        return;
    }

    say("ALL ITEMS CRAFTED");
}

/* ---------------------------------------------------------
   Eat
--------------------------------------------------------- */

function eat() {

    if (state.berries <= 0) {

        say("NO BERRIES");

        return;
    }

    if (state.food >= 100) {

        say("FOOD IS FULL");

        return;
    }

    state.berries--;

    state.food = clamp(
        state.food + 28,
        0,
        100
    );

    say("+ FOOD");
}

/* ---------------------------------------------------------
   Camera
--------------------------------------------------------- */

function updateCamera() {

    const targetX = state.x;
    const targetY = state.y;

    cameraX += (targetX - cameraX) * 0.12;
    cameraY += (targetY - cameraY) * 0.12;
}

function worldToScreen(x, y) {

    return {
        x: W / 2 + (x - cameraX),
        y: H / 2 + (y - cameraY)
    };
}

/* ---------------------------------------------------------
   Pixel drawing helpers
--------------------------------------------------------- */

function rect(x, y, w, h, color) {

    ctx.fillStyle = color;
    ctx.fillRect(
        Math.round(x),
        Math.round(y),
        Math.round(w),
        Math.round(h)
    );
}

function pixel(x, y, s, color) {

    rect(
        Math.round(x),
        Math.round(y),
        s,
        s,
        color
    );
}

/* ---------------------------------------------------------
   Water
--------------------------------------------------------- */

function drawWater() {

    rect(0, 0, W, H, "#159bd1");

    const waveOffset =
        (performance.now() / 900) % 24;

    for (let y = -20; y < H + 30; y += 42) {

        for (
            let x = -40;
            x < W + 40;
            x += 80
        ) {

            const xx =
                x + ((y / 42) % 2) * 35 - waveOffset;

            rect(
                xx,
                y,
                42,
                5,
                "#48c9e8"
            );

            rect(
                xx + 15,
                y + 7,
                26,
                4,
                "#0d83c2"
            );
        }
    }
}

/* ---------------------------------------------------------
   Island
--------------------------------------------------------- */

function drawIsland() {

    const p = worldToScreen(0, 0);

    ctx.save();

    ctx.beginPath();

    ctx.ellipse(
        p.x,
        p.y + 20,
        island.radius,
        island.radius * 0.82,
        0,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = "#e7c76b";
    ctx.fill();

    ctx.beginPath();

    ctx.ellipse(
        p.x,
        p.y,
        island.radius - 55,
        island.radius * 0.76 - 35,
        0,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = "#46a447";
    ctx.fill();

    /* Grass patches */

    for (let i = 0; i < 70; i++) {

        const a = i * 2.399;

        const r = 100 + (i * 91) % 700;

        const x =
            p.x + Math.cos(a) * r;

        const y =
            p.y + Math.sin(a) * r * 0.76;

        rect(
            x,
            y,
            14,
            5,
            "#2e853e"
        );

        rect(
            x + 5,
            y - 7,
            5,
            8,
            "#62bd4e"
        );
    }

    ctx.restore();
}

/* ---------------------------------------------------------
   Cabin
--------------------------------------------------------- */

function drawCabin() {

    const p = worldToScreen(-100, -520);

    const x = p.x;
    const y = p.y;

    /* shadow */

    rect(
        x - 150,
        y + 105,
        300,
        22,
        "#23552c"
    );

    /* house body */

    rect(
        x - 135,
        y - 10,
        270,
        120,
        "#9b5b31"
    );

    rect(
        x - 125,
        y,
        250,
        105,
        "#c47a3e"
    );

    /* roof */

    ctx.fillStyle = "#704023";

    ctx.beginPath();

    ctx.moveTo(x - 165, y - 10);
    ctx.lineTo(x, y - 125);
    ctx.lineTo(x + 165, y - 10);

    ctx.closePath();

    ctx.fill();

    /* roof highlights */

    for (let i = 0; i < 8; i++) {

        rect(
            x - 130 + i * 32,
            y - 30 - Math.abs(4 - i) * 17,
            24,
            7,
            "#a56a35"
        );
    }

    /* door */

    rect(
        x - 28,
        y + 28,
        56,
        82,
        "#56331f"
    );

    rect(
        x - 18,
        y + 38,
        36,
        72,
        "#7d4929"
    );

    pixel(
        x + 7,
        y + 75,
        7,
        "#f4d26d"
    );

    /* windows */

    rect(
        x - 108,
        y + 30,
        52,
        42,
        "#4d7f91"
    );

    rect(
        x + 56,
        y + 30,
        52,
        42,
        "#4d7f91"
    );

    rect(
        x - 105,
        y + 50,
        46,
        5,
        "#d9a75d"
    );

    rect(
        x + 59,
        y + 50,
        46,
        5,
        "#d9a75d"
    );

    /* chimney */

    rect(
        x + 78,
        y - 92,
        28,
        65,
        "#6d4430"
    );

    rect(
        x + 72,
        y - 98,
        40,
        10,
        "#4c3025"
    );
}

/* ---------------------------------------------------------
   Tree
--------------------------------------------------------- */

function drawTree(n) {

    if (!n.alive) return;

    const p = worldToScreen(n.x, n.y);

    const s = n.size;

    /* shadow */

    rect(
        p.x - 30 * s,
        p.y + 24 * s,
        60 * s,
        12 * s,
        "#236332"
    );

    /* trunk */

    rect(
        p.x - 9 * s,
        p.y - 38 * s,
        18 * s,
        65 * s,
        "#704124"
    );

    rect(
        p.x - 4 * s,
        p.y - 38 * s,
        7 * s,
        65 * s,
        "#9b5b2e"
    );

    /* leaves */

    const leaves = [
        [-28, -45],
        [0, -62],
        [28, -45],
        [-38, -18],
        [0, -28],
        [38, -18]
    ];

    for (const [dx, dy] of leaves) {

        rect(
            p.x + dx * s - 23 * s,
            p.y + dy * s - 23 * s,
            46 * s,
            46 * s,
            "#1e7338"
        );

        rect(
            p.x + dx * s - 17 * s,
            p.y + dy * s - 19 * s,
            34 * s,
            25 * s,
            "#36a844"
        );

        rect(
            p.x + dx * s - 8 * s,
            p.y + dy * s - 20 * s,
            18 * s,
            10 * s,
            "#69c94c"
        );
    }
}

/* ---------------------------------------------------------
   Palm tree
--------------------------------------------------------- */

function drawPalm(x, y, scale = 1) {

    const p = worldToScreen(x, y);

    rect(
        p.x - 8 * scale,
        p.y - 90 * scale,
        16 * scale,
        120 * scale,
        "#81502b"
    );

    rect(
        p.x - 3 * scale,
        p.y - 90 * scale,
        7 * scale,
        120 * scale,
        "#b06c34"
    );

    const leaves = [
        [0, -95, 0],
        [-40, -82, -0.2],
        [40, -82, 0.2],
        [-55, -55, -0.5],
        [55, -55, 0.5]
    ];

    for (const [dx, dy] of leaves) {

        ctx.strokeStyle = "#25863d";
        ctx.lineWidth = 12 * scale;

        ctx.beginPath();

        ctx.moveTo(p.x, p.y - 90 * scale);

        ctx.lineTo(
            p.x + dx * scale,
            p.y + dy * scale
        );

        ctx.stroke();

        ctx.strokeStyle = "#54b844";
        ctx.lineWidth = 5 * scale;

        ctx.beginPath();

        ctx.moveTo(p.x, p.y - 90 * scale);

        ctx.lineTo(
            p.x + dx * scale,
            p.y + dy * scale
        );

        ctx.stroke();
    }
}

/* ---------------------------------------------------------
   Rock
--------------------------------------------------------- */

function drawRock(n) {

    if (!n.alive) return;

    const p = worldToScreen(n.x, n.y);

    const s = n.size;

    rect(
        p.x - 32 * s,
        p.y + 10 * s,
        64 * s,
        10 * s,
        "#315c3b"
    );

    rect(
        p.x - 28 * s,
        p.y - 22 * s,
        56 * s,
        34 * s,
        "#5c6468"
    );

    rect(
        p.x - 18 * s,
        p.y - 32 * s,
        32 * s,
        16 * s,
        "#858c8e"
    );

    rect(
        p.x - 8 * s,
        p.y - 28 * s,
        14 * s,
        7 * s,
        "#b6bbba"
    );
}

/* ---------------------------------------------------------
   Berry
--------------------------------------------------------- */

function drawBerry(n) {

    if (!n.alive) return;

    const p = worldToScreen(n.x, n.y);

    rect(
        p.x - 34,
        p.y + 8,
        68,
        9,
        "#246331"
    );

    rect(
        p.x - 31,
        p.y - 22,
        62,
        36,
        "#16723a"
    );

    rect(
        p.x - 23,
        p.y - 27,
        45,
        25,
        "#38a747"
    );

    const berries = [
        [-15, -3],
        [0, -12],
        [14, -1],
        [-3, 4]
    ];

    for (const [x, y] of berries) {

        rect(
            p.x + x - 5,
            p.y + y - 5,
            10,
            10,
            "#d62d3d"
        );

        pixel(
            p.x + x - 2,
            p.y + y - 7,
            5,
            "#ff6870"
        );
    }
}

/* ---------------------------------------------------------
   Grass / flowers
--------------------------------------------------------- */

function drawDecoration(d) {

    const p = worldToScreen(d.x, d.y);

    if (p.x < -30 || p.x > W + 30) return;
    if (p.y < -30 || p.y > H + 30) return;

    if (d.type === 0) {

        rect(
            p.x,
            p.y,
            4,
            15,
            "#287a38"
        );

        rect(
            p.x - 6,
            p.y + 4,
            5,
            5,
            "#50b947"
        );

        rect(
            p.x + 5,
            p.y + 2,
            5,
            5,
            "#50b947"
        );

    } else if (d.type === 1) {

        pixel(
            p.x,
            p.y,
            5,
            "#fff1cf"
        );

        pixel(
            p.x - 5,
            p.y + 3,
            5,
            "#fff1cf"
        );

        pixel(
            p.x + 5,
            p.y + 3,
            5,
            "#fff1cf"
        );

        pixel(
            p.x + 2,
            p.y + 4,
            5,
            "#f4bf36"
        );

    } else if (d.type === 2) {

        rect(
            p.x - 4,
            p.y,
            8,
            8,
            "#7a5837"
        );

    } else if (d.type === 3) {

        rect(
            p.x - 5,
            p.y,
            10,
            5,
            "#2e7c3b"
        );

    } else {

        pixel(
            p.x,
            p.y,
            4,
            "#cce04a"
        );
    }
}

/* ---------------------------------------------------------
   Crops
--------------------------------------------------------- */

function drawFarm() {

    const p = worldToScreen(430, -360);

    rect(
        p.x - 120,
        p.y - 90,
        240,
        180,
        "#704828"
    );

    rect(
        p.x - 108,
        p.y - 78,
        216,
        156,
        "#8c5b2e"
    );

    for (let row = 0; row < 4; row++) {

        for (let col = 0; col < 4; col++) {

            const x =
                p.x - 85 + col * 55;

            const y =
                p.y - 55 + row * 38;

            rect(
                x,
                y,
                38,
                22,
                "#3e792e"
            );

            rect(
                x + 12,
                y - 9,
                14,
                12,
                "#55a83b"
            );

            pixel(
                x + 15,
                y - 13,
                8,
                "#8dd052"
            );
        }
    }
}

/* ---------------------------------------------------------
   Campfire
--------------------------------------------------------- */

function drawCampfire() {

    const p = worldToScreen(260, -390);

    rect(
        p.x - 38,
        p.y + 20,
        76,
        10,
        "#305a35"
    );

    for (let i = 0; i < 7; i++) {

        const a = i / 7 * Math.PI * 2;

        rect(
            p.x + Math.cos(a) * 22 - 8,
            p.y + Math.sin(a) * 18 - 8,
            16,
            16,
            "#6e4930"
        );
    }

    rect(
        p.x - 12,
        p.y - 36,
        24,
        45,
        "#f08b23"
    );

    rect(
        p.x - 6,
        p.y - 55,
        12,
        42,
        "#ffe34b"
    );

    pixel(
        p.x - 3,
        p.y - 65,
        7,
        "#fff7a2"
    );
}

/* ---------------------------------------------------------
   Raft
--------------------------------------------------------- */

function drawRaft() {

    const p = worldToScreen(720, 300);

    rect(
        p.x - 70,
        p.y + 24,
        140,
        14,
        "#0b6fa3"
    );

    rect(
        p.x - 65,
        p.y - 10,
        130,
        48,
        "#8a5127"
    );

    rect(
        p.x - 54,
        p.y - 5,
        108,
        10,
        "#c57b3b"
    );

    rect(
        p.x - 4,
        p.y - 82,
        8,
        78,
        "#704226"
    );

    ctx.fillStyle = state.raft
        ? "#f5f0d2"
        : "#6e7070";

    ctx.beginPath();

    ctx.moveTo(
        p.x + 3,
        p.y - 78
    );

    ctx.lineTo(
        p.x + 70,
        p.y - 38
    );

    ctx.lineTo(
        p.x + 3,
        p.y - 8
    );

    ctx.closePath();

    ctx.fill();
}

/* ---------------------------------------------------------
   Player
--------------------------------------------------------- */

function drawPlayer() {

    const p = worldToScreen(
        state.x,
        state.y
    );

    const bob =
        state.moving
            ? Math.sin(walkTime) * 3
            : 0;

    const x = p.x;
    const y = p.y + bob;

    /* shadow */

    ctx.fillStyle = "#23552f";

    ctx.beginPath();

    ctx.ellipse(
        x,
        y + 31,
        28,
        9,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    /* legs */

    rect(
        x - 18,
        y + 8,
        13,
        28,
        "#5b3929"
    );

    rect(
        x + 5,
        y + 8,
        13,
        28,
        "#5b3929"
    );

    /* shoes */

    rect(
        x - 22,
        y + 31,
        18,
        8,
        "#252a2d"
    );

    rect(
        x + 5,
        y + 31,
        18,
        8,
        "#252a2d"
    );

    /* body */

    rect(
        x - 24,
        y - 42,
        48,
        57,
        "#276d9b"
    );

    rect(
        x - 17,
        y - 35,
        34,
        43,
        "#3e94bd"
    );

    /* arms */

    rect(
        x - 36,
        y - 28,
        12,
        38,
        "#d99455"
    );

    rect(
        x + 24,
        y - 28,
        12,
        38,
        "#d99455"
    );

    /* neck */

    rect(
        x - 10,
        y - 55,
        20,
        17,
        "#d99455"
    );

    /* head */

    rect(
        x - 25,
        y - 93,
        50,
        44,
        "#e5a060"
    );

    rect(
        x - 22,
        y - 98,
        44,
        12,
        "#39241e"
    );

    rect(
        x - 28,
        y - 88,
        10,
        22,
        "#39241e"
    );

    rect(
        x + 18,
        y - 88,
        10,
        22,
        "#39241e"
    );

    /* eyes */

    pixel(
        x - 12,
        y - 75,
        6,
        "#241c1c"
    );

    pixel(
        x + 7,
        y - 75,
        6,
        "#241c1c"
    );

    /* shirt highlight */

    rect(
        x - 10,
        y - 34,
        7,
        28,
        "#75c5dd"
    );
}

/* ---------------------------------------------------------
   HUD
--------------------------------------------------------- */

function drawPanel(x, y, w, h) {

    rect(
        x + 7,
        y + 8,
        w,
        h,
        "#3b251b"
    );

    rect(
        x,
        y,
        w,
        h,
        "#d4944e"
    );

    rect(
        x + 5,
        y + 5,
        w - 10,
        h - 10,
        "#ffe0a0"
    );

    rect(
        x + 10,
        y + 10,
        w - 20,
        h - 20,
        "#6d4529"
    );

    rect(
        x + 13,
        y + 13,
        w - 26,
        h - 26,
        "#f3c976"
    );
}

function drawHUD() {

    /* top left */

    drawPanel(
        16,
        16,
        Math.min(360, W * 0.42),
        122
    );

    const panelW = Math.min(360, W * 0.42);

    /* hearts */

    const hearts = 5;

    for (let i = 0; i < hearts; i++) {

        const full =
            state.hp >= (i + 1) * 20;

        const x =
            30 + i * 36;

        const y = 29;

        drawHeart(
            x,
            y,
            full
                ? "#ed3948"
                : "#9a7662"
        );
    }

    /* food bar */

    rect(
        30,
        72,
        panelW - 55,
        13,
        "#5a3625"
    );

    rect(
        33,
        75,
        (panelW - 61) * (state.food / 100),
        7,
        "#65bf4c"
    );

    ctx.fillStyle = "#35231b";
    ctx.font = "bold 15px monospace";

    ctx.fillText(
        "FOOD " + Math.round(state.food) + "/100",
        30,
        104
    );

    ctx.fillText(
        "WOOD " + state.wood +
        "   STONE " + state.stone +
        "   BERRY " + state.berries,
        30,
        127
    );

    /* time panel */

    drawPanel(
        W - 260,
        16,
        244,
        64
    );

    ctx.fillStyle = "#fff0b2";
    ctx.font = "bold 20px monospace";

    ctx.fillText(
        "DAY " + state.day +
        "  " + formatTime(),
        W - 245,
        55
    );

    /* inventory / craft */

    drawSmallButton(
        W - 155,
        95,
        140,
        55,
        "INVENTORY"
    );

    drawSmallButton(
        W - 155,
        160,
        140,
        55,
        "CRAFT"
    );
}

function drawHeart(x, y, color) {

    pixel(x + 5, y, 8, color);
    pixel(x + 17, y, 8, color);

    pixel(x, y + 6, 30, color);

    pixel(x + 5, y + 12, 20, color);

    pixel(x + 10, y + 18, 10, color);
}

function drawSmallButton(
    x,
    y,
    w,
    h,
    text
) {

    drawPanel(x, y, w, h);

    ctx.fillStyle = "#39261d";
    ctx.font = "bold 15px monospace";
    ctx.textAlign = "center";

    ctx.fillText(
        text,
        x + w / 2,
        y + 35
    );

    ctx.textAlign = "left";
}

/* ---------------------------------------------------------
   Hotbar
--------------------------------------------------------- */

function drawHotbar() {

    const w = Math.min(
        560,
        W * 0.58
    );

    const h = 74;

    const x =
        W / 2 - w / 2;

    const y =
        H - 88;

    drawPanel(
        x,
        y,
        w,
        h
    );

    const slots = 5;
    const sw = (w - 24) / slots;

    for (let i = 0; i < slots; i++) {

        const sx =
            x + 12 + i * sw;

        const sy =
            y + 12;

        rect(
            sx,
            sy,
            sw - 5,
            h - 24,
            i === state.selected
                ? "#63c84b"
                : "#a76b38"
        );

        if (i === 0) {
            drawMiniAxe(
                sx + 15,
                sy + 10
            );
        }

        if (i === 1) {
            drawMiniPickaxe(
                sx + 15,
                sy + 10
            );
        }

        if (i === 2) {

            rect(
                sx + 18,
                sy + 20,
                28,
                18,
                "#8d5428"
            );

            ctx.fillStyle = "#fff2c2";
            ctx.font = "bold 15px monospace";

            ctx.fillText(
                state.wood,
                sx + 52,
                sy + 43
            );
        }

        if (i === 3) {

            rect(
                sx + 18,
                sy + 22,
                30,
                24,
                "#666d72"
            );

            ctx.fillStyle = "#fff2c2";
            ctx.font = "bold 15px monospace";

            ctx.fillText(
                state.stone,
                sx + 52,
                sy + 43
            );
        }

        if (i === 4) {

            drawBerryIcon(
                sx + 30,
                sy + 33
            );

            ctx.fillStyle = "#fff2c2";
            ctx.font = "bold 15px monospace";

            ctx.fillText(
                state.berries,
                sx + 52,
                sy + 43
            );
        }
    }
}

function drawMiniAxe(x, y) {

    ctx.strokeStyle = "#633d25";
    ctx.lineWidth = 8;

    ctx.beginPath();
    ctx.moveTo(x + 5, y + 48);
    ctx.lineTo(x + 35, y + 8);
    ctx.stroke();

    rect(
        x + 28,
        y + 5,
        28,
        14,
        "#aab0b3"
    );
}

function drawMiniPickaxe(x, y) {

    ctx.strokeStyle = "#704526";
    ctx.lineWidth = 7;

    ctx.beginPath();
    ctx.moveTo(x + 5, y + 48);
    ctx.lineTo(x + 42, y + 12);
    ctx.stroke();

    ctx.strokeStyle = "#9fa5a7";
    ctx.lineWidth = 9;

    ctx.beginPath();
    ctx.moveTo(x + 20, y + 14);
    ctx.lineTo(x + 52, y + 8);
    ctx.stroke();
}

function drawBerryIcon(x, y) {

    pixel(
        x - 13,
        y - 8,
        12,
        "#e32e42"
    );

    pixel(
        x + 1,
        y - 10,
        12,
        "#e32e42"
    );

    pixel(
        x - 5,
        y + 3,
        12,
        "#e32e42"
    );

    pixel(
        x - 3,
        y - 16,
        8,
        "#55ad45"
    );
}

/* ---------------------------------------------------------
   Joystick
--------------------------------------------------------- */

let joyActive = false;
let joyPointer = null;

const joystick =
    document.getElementById("joystick");

const stick =
    document.getElementById("stick");

function setJoystick(clientX, clientY) {

    if (!joystick) return;

    const r =
        joystick.getBoundingClientRect();

    const cx =
        r.left + r.width / 2;

    const cy =
        r.top + r.height / 2;

    let dx = clientX - cx;
    let dy = clientY - cy;

    const max =
        r.width * 0.30;

    const len =
        Math.hypot(dx, dy);

    if (len > max) {

        dx =
            dx / len * max;

        dy =
            dy / len * max;
    }

    if (stick) {

        stick.style.transform =
            "translate(" +
            dx +
            "px," +
            dy +
            "px)";
    }

    state.dirX =
        dx / max;

    state.dirY =
        dy / max;

    const length =
        Math.hypot(
            state.dirX,
            state.dirY
        );

    state.moving = length > 0.12;
}

if (joystick) {

    joystick.addEventListener(
        "pointerdown",
        e => {

            joyActive = true;
            joyPointer = e.pointerId;

            joystick.setPointerCapture(
                e.pointerId
            );

            setJoystick(
                e.clientX,
                e.clientY
            );
        }
    );

    joystick.addEventListener(
        "pointermove",
        e => {

            if (
                !joyActive ||
                e.pointerId !== joyPointer
            ) return;

            setJoystick(
                e.clientX,
                e.clientY
            );
        }
    );

    function releaseJoystick() {

        joyActive = false;
        joyPointer = null;

        state.moving = false;
        state.dirX = 0;
        state.dirY = 0;

        if (stick) {
            stick.style.transform =
                "translate(0,0)";
        }
    }

    joystick.addEventListener(
        "pointerup",
        releaseJoystick
    );

    joystick.addEventListener(
        "pointercancel",
        releaseJoystick
    );
}

/* ---------------------------------------------------------
   Buttons
--------------------------------------------------------- */

const useButton =
    document.getElementById("use");

const craftButton =
    document.getElementById("craft");

const saveButton =
    document.getElementById("save");

const eatButton =
    document.getElementById("eat");

if (useButton) {
    useButton.addEventListener(
        "click",
        useObject
    );
}

if (craftButton) {
    craftButton.addEventListener(
        "click",
        craft
    );
}

if (saveButton) {
    saveButton.addEventListener(
        "click",
        saveGame
    );
}

if (eatButton) {
    eatButton.addEventListener(
        "click",
        eat
    );
}

/* ---------------------------------------------------------
   Touch hotbar
--------------------------------------------------------- */

canvas.addEventListener(
    "pointerdown",
    e => {

        const hotbarY = H - 88;

        if (e.clientY >= hotbarY) {

            const w =
                Math.min(560, W * 0.58);

            const x =
                W / 2 - w / 2;

            if (
                e.clientX >= x &&
                e.clientX <= x + w
            ) {

                const slotW =
                    w / 5;

                const slot =
                    Math.floor(
                        (e.clientX - x) /
                        slotW
                    );

                state.selected =
                    clamp(slot, 0, 4);
            }
        }
    }
);

/* ---------------------------------------------------------
   Keyboard
--------------------------------------------------------- */

const keys = {};

window.addEventListener(
    "keydown",
    e => {

        keys[e.key.toLowerCase()] = true;

        if (e.key === " ") {
            useObject();
        }

        if (e.key.toLowerCase() === "e") {
            eat();
        }

        if (e.key.toLowerCase() === "c") {
            craft();
        }

        if (e.key.toLowerCase() === "s") {
            saveGame();
        }
    }
);

window.addEventListener(
    "keyup",
    e => {
        keys[e.key.toLowerCase()] = false;
    }
);

function keyboardMovement() {

    if (
        keys["w"] ||
        keys["arrowup"]
    ) {
        state.dirY = -1;
    } else if (
        keys["s"] ||
        keys["arrowdown"]
    ) {
        state.dirY = 1;
    } else {
        state.dirY = 0;
    }

    if (
        keys["a"] ||
        keys["arrowleft"]
    ) {
        state.dirX = -1;
    } else if (
        keys["d"] ||
        keys["arrowright"]
    ) {
        state.dirX = 1;
    } else {
        state.dirX = 0;
    }

    if (
        state.dirX !== 0 ||
        state.dirY !== 0
    ) {
        const len =
            Math.hypot(
                state.dirX,
                state.dirY
            );

        state.dirX /= len;
        state.dirY /= len;

        state.moving = true;
    }
}

/* ---------------------------------------------------------
   Time display
--------------------------------------------------------- */

function formatTime() {

    let h =
        Math.floor(state.time / 60);

    const m =
        Math.floor(state.time % 60);

    const hh =
        String(h).padStart(2, "0");

    const mm =
        String(m).padStart(2, "0");

    return hh + ":" + mm;
}

/* ---------------------------------------------------------
   Night
--------------------------------------------------------- */

function drawNight() {

    const hour =
        state.time / 60;

    let alpha = 0;

    if (hour >= 18 && hour < 24) {

        alpha =
            ((hour - 18) / 6) * 0.48;

    } else if (hour >= 0 && hour < 6) {

        alpha =
            (1 - hour / 6) * 0.48;
    }

    if (alpha <= 0) return;

    rect(
        0,
        0,
        W,
        H,
        `rgba(13,24,70,${alpha})`
    );
}

/* ---------------------------------------------------------
   Message
--------------------------------------------------------- */

function drawMessage() {

    if (
        state.messageTime <= 0 ||
        !state.message
    ) return;

    const w =
        Math.min(520, W * 0.62);

    const h = 58;

    const x =
        W / 2 - w / 2;

    const y =
        H * 0.78;

    drawPanel(
        x,
        y,
        w,
        h
    );

    ctx.fillStyle = "#35231b";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";

    ctx.fillText(
        state.message,
        W / 2,
        y + 35
    );

    ctx.textAlign = "left";
}

/* ---------------------------------------------------------
   Ending / Death
--------------------------------------------------------- */

function drawEnding() {

    if (!state.dead && !state.won) return;

    rect(
        0,
        0,
        W,
        H,
        "rgba(0,0,0,0.42)"
    );

    const w =
        Math.min(500, W * 0.72);

    const h = 160;

    const x =
        W / 2 - w / 2;

    const y =
        H / 2 - h / 2;

    drawPanel(
        x,
        y,
        w,
        h
    );

    ctx.fillStyle =
        state.won
            ? "#1f723a"
            : "#9e2d36";

    ctx.font =
        "bold 28px monospace";

    ctx.textAlign = "center";

    ctx.fillText(
        state.won
            ? "YOU ESCAPED!"
            : "YOU DIED",
        W / 2,
        y + 55
    );

    ctx.fillStyle = "#39261d";
    ctx.font = "bold 15px monospace";

    ctx.fillText(
        state.won
            ? "THE RAFT CARRIED YOU HOME"
            : "SURVIVE LONGER NEXT TIME",
        W / 2,
        y + 90
    );

    ctx.fillText(
        "TAP USE TO RESTART",
        W / 2,
        y + 125
    );

    ctx.textAlign = "left";
}

/* ---------------------------------------------------------
   Main render
--------------------------------------------------------- */

function render() {

    ctx.clearRect(
        0,
        0,
        W,
        H
    );

    drawWater();

    drawIsland();

    /* Decorations */

    for (const d of decorations) {
        drawDecoration(d);
    }

    /* Important landmarks */

    drawCabin();
    drawFarm();
    drawCampfire();

    drawPalm(-620, -280, 1.15);
    drawPalm(-650, 420, 0.95);
    drawPalm(620, -420, 0.9);
    drawPalm(570, 510, 1.0);

    /* Resources */

    for (const n of nodes) {

        if (!n.alive) continue;

        if (n.type === "tree") {
            drawTree(n);
        }

        if (n.type === "rock") {
            drawRock(n);
        }

        if (n.type === "berry") {
            drawBerry(n);
        }

        if (n.type === "raft") {
            drawRaft();
        }
    }

    drawPlayer();

    drawNight();

    drawHUD();

    drawHotbar();

    drawMessage();

    drawEnding();
}

/* ---------------------------------------------------------
   Update
--------------------------------------------------------- */

function update(dt) {

    if (state.messageTime > 0) {
        state.messageTime -= dt;

        if (state.messageTime <= 0) {

            state.message = "";

            const box =
                document.getElementById("message");

            if (box) {
                box.textContent = "";
            }
        }
    }

    if (!state.dead && !state.won) {

        keyboardMovement();

        updateTime(dt);

        updatePlayer(dt);

        updateCamera();
    }
}

/* ---------------------------------------------------------
   Main loop
--------------------------------------------------------- */

function loop(now) {

    let dt =
        (now - lastTime) / 1000;

    lastTime = now;

    dt = Math.min(dt, 0.05);

    update(dt);
    render();

    requestAnimationFrame(loop);
}

/* ---------------------------------------------------------
   Start
--------------------------------------------------------- */

generateWorld();
loadGame();

if (state.hp <= 0) {
    state.hp = 100;
}

if (state.food <= 0) {
    state.food = 100;
}

state.dead = false;
state.won = false;

say("WELCOME TO SURVIVAL ISLAND");

requestAnimationFrame(loop);

/* ---------------------------------------------------------
   Service Worker
--------------------------------------------------------- */

if ("serviceWorker" in navigator) {

    window.addEventListener(
        "load",
        () => {

            navigator.serviceWorker
                .register("./sw.js")
                .then(() => {
                    console.log(
                        "Service Worker registered"
                    );
                })
                .catch(err => {
                    console.log(
                        "Service Worker error",
                        err
                    );
                });
        }
    );
}
