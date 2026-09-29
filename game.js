const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const stats = document.getElementById("stats");
const message = document.getElementById("message");

let W = innerWidth;
let H = innerHeight;
let DPR = Math.min(devicePixelRatio || 1, 2);

let last = performance.now();

let px = 0;
let py = 0;

let time = 6;
let day = 1;

let hp = 100;
let food = 100;

let wood = 0;
let stone = 0;
let berries = 0;

let axe = false;
let pick = false;
let raft = false;

let won = false;
let dead = false;

let jx = 0;
let jy = 0;

let seed = 7;
const nodes = [];

/* =========================
   RANDOM
========================= */

function rand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
}

/* =========================
   CANVAS
========================= */

function resize() {
    W = innerWidth;
    H = innerHeight;

    DPR = Math.min(devicePixelRatio || 1, 2);

    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);

    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    ctx.imageSmoothingEnabled = false;
}

addEventListener("resize", resize);
resize();

/* =========================
   ISLAND OBJECTS
========================= */

for (let i = 0; i < 42; i++) {

    const a = rand() * Math.PI * 2;
    const d = 160 + rand() * 650;

    nodes.push({
        x: Math.cos(a) * d,
        y: Math.sin(a) * d,
        t: i % 3,
        alive: true,
        variant: Math.floor(rand() * 3)
    });
}

/* Escape raft point */

nodes.push({
    x: 720,
    y: 0,
    t: 3,
    alive: true
});

/* =========================
   SAVE / LOAD
========================= */

function save() {

    localStorage.setItem(
        "survivalIslandSave",
        JSON.stringify({
            px,
            py,
            time,
            day,
            hp,
            food,
            wood,
            stone,
            berries,
            axe,
            pick,
            raft
        })
    );
}

function load() {

    try {

        const s = JSON.parse(
            localStorage.getItem("survivalIslandSave")
        );

        if (!s) return;

        px = s.px ?? 0;
        py = s.py ?? 0;
        time = s.time ?? 6;
        day = s.day ?? 1;

        hp = s.hp ?? 100;
        food = s.food ?? 100;

        wood = s.wood ?? 0;
        stone = s.stone ?? 0;
        berries = s.berries ?? 0;

        axe = !!s.axe;
        pick = !!s.pick;
        raft = !!s.raft;

    } catch (e) {
        console.log("Save load error");
    }
}

load();

/* =========================
   MESSAGE
========================= */

let messageTimer = null;

function flash(text) {

    message.textContent = text;

    clearTimeout(messageTimer);

    messageTimer = setTimeout(() => {
        if (!won && !dead) {
            message.textContent = "";
        }
    }, 1400);
}

/* =========================
   JOYSTICK
========================= */

const joy = document.getElementById("joystick");
const stick = document.getElementById("stick");

function moveJoy(e) {

    const r = joy.getBoundingClientRect();

    const centerX = r.width / 2;
    const centerY = r.height / 2;

    let x = e.clientX - r.left - centerX;
    let y = e.clientY - r.top - centerY;

    const max = Math.min(r.width, r.height) * 0.35;

    const distance = Math.hypot(x, y);

    if (distance > max) {
        x = x / distance * max;
        y = y / distance * max;
    }

    stick.style.transform =
        `translate(${x}px, ${y}px)`;

    jx = x / max;
    jy = y / max;
}

function stopJoy() {

    jx = 0;
    jy = 0;

    stick.style.transform =
        "translate(0px,0px)";
}

joy.addEventListener("pointerdown", e => {

    joy.setPointerCapture(e.pointerId);

    moveJoy(e);
});

joy.addEventListener("pointermove", e => {

    if (e.buttons) {
        moveJoy(e);
    }
});

joy.addEventListener("pointerup", stopJoy);
joy.addEventListener("pointercancel", stopJoy);

/* =========================
   BUTTONS
========================= */

document.getElementById("use").onclick = use;
document.getElementById("craft").onclick = craft;
document.getElementById("eat").onclick = eat;

document.getElementById("save").onclick = () => {

    save();

    flash("GAME SAVED");
};

/* =========================
   USE OBJECT
========================= */

function use() {

    if (won || dead) return;

    let nearest = null;
    let distance = 70;

    for (const n of nodes) {

        if (!n.alive) continue;

        const d = Math.hypot(
            px - n.x,
            py - n.y
        );

        if (d < distance) {
            distance = d;
            nearest = n;
        }
    }

    if (!nearest) {

        flash("MOVE CLOSER");

        return;
    }

    /* TREE */

    if (nearest.t === 0) {

        if (!axe) {

            axe = true;

            flash("AXE FOUND");

        } else {

            wood += 4;

            nearest.alive = false;

            flash("+4 WOOD");
        }

        save();

        return;
    }

    /* ROCK */

    if (nearest.t === 1) {

        if (!pick) {

            pick = true;

            flash("PICKAXE FOUND");

        } else {

            stone += 3;

            nearest.alive = false;

            flash("+3 STONE");
        }

        save();

        return;
    }

    /* BERRY */

    if (nearest.t === 2) {

        berries += 2;

        nearest.alive = false;

        flash("+2 BERRIES");

        save();

        return;
    }

    /* RAFT */

    if (nearest.t === 3) {

        if (!raft) {

            flash("BUILD A RAFT FIRST");

        } else {

            won = true;

            save();

            flash("YOU ESCAPED!");
        }
    }
}

/* =========================
   CRAFT
========================= */

function craft() {

    if (won || dead) return;

    /* AXE */

    if (!axe && wood >= 3) {

        wood -= 3;

        axe = true;

        flash("AXE CRAFTED");

        save();

        return;
    }

    /* PICKAXE */

    if (!pick && wood >= 2 && stone >= 2) {

        wood -= 2;
        stone -= 2;

        pick = true;

        flash("PICKAXE CRAFTED");

        save();

        return;
    }

    /* RAFT */

    if (!raft && wood >= 30 && stone >= 10) {

        wood -= 30;
        stone -= 10;

        raft = true;

        flash("RAFT BUILT!");

        save();

        return;
    }

    flash("NOT ENOUGH MATERIALS");
}

/* =========================
   EAT
========================= */

function eat() {

    if (won || dead) return;

    if (berries > 0 && food < 100) {

        berries--;

        food = Math.min(
            100,
            food + 25
        );

        flash("ATE BERRIES");

        save();

    } else {

        flash("NO BERRIES");
    }
}

/* =========================
   PIXEL RECT HELPER
========================= */

function rect(x, y, w, h, color) {

    ctx.fillStyle = color;

    ctx.fillRect(
        Math.round(x),
        Math.round(y),
        Math.round(w),
        Math.round(h)
    );
}

/* =========================
   PIXEL TREE
========================= */

function drawTree(x, y, variant) {

    /* shadow */

    rect(x - 18, y + 20, 36, 7, "#28552c");
    rect(x - 12, y + 27, 24, 4, "#28552c");

    /* trunk */

    rect(x - 7, y - 5, 14, 32, "#754326");
    rect(x - 3, y - 5, 5, 32, "#9a5b30");

    /* leaves */

    if (variant === 0) {

        rect(x - 25, y - 25, 50, 25, "#236b38");
        rect(x - 18, y - 34, 36, 12, "#328b45");
        rect(x - 10, y - 42, 20, 12, "#3c9b4e");

    } else if (variant === 1) {

        rect(x - 30, y - 20, 60, 22, "#286f38");
        rect(x - 22, y - 34, 44, 18, "#39934a");
        rect(x - 12, y - 43, 24, 12, "#4ba854");

    } else {

        rect(x - 22, y - 30, 44, 30, "#1f6434");
        rect(x - 30, y - 18, 60, 15, "#2c813f");
        rect(x - 12, y - 40, 24, 14, "#3e9d4d");
    }

    /* leaf highlights */

    rect(x - 15, y - 25, 7, 6, "#58b85b");
    rect(x + 8, y - 17, 7, 5, "#4daa53");
}

/* =========================
   PIXEL ROCK
========================= */

function drawRock(x, y, variant) {

    rect(x - 25, y + 10, 50, 6, "#38533e");

    if (variant === 0) {

        rect(x - 20, y - 10, 40, 20, "#6f7774");
        rect(x - 13, y - 18, 27, 10, "#888f8b");
        rect(x - 7, y - 15, 8, 5, "#a8aeaa");

    } else {

        rect(x - 25, y - 5, 50, 16, "#656d6a");
        rect(x - 15, y - 14, 30, 12, "#858d88");
        rect(x - 5, y - 12, 10, 5, "#adb2ae");
    }
}

/* =========================
   PIXEL BERRY BUSH
========================= */

function drawBerry(x, y) {

    rect(x - 5, y - 2, 10, 25, "#70452b");

    rect(x - 25, y - 20, 50, 27, "#246c3b");
    rect(x - 17, y - 28, 34, 15, "#32884a");

    /* berries */

    rect(x - 16, y - 12, 7, 7, "#e83c5c");
    rect(x + 4, y - 17, 7, 7, "#d82d52");
    rect(x + 10, y - 3, 7, 7, "#ef4660");
    rect(x - 4, y - 2, 7, 7, "#c9284a");
}

/* =========================
   RAFT
========================= */

function drawRaft(x, y) {

    rect(x - 42, y - 8, 84, 25, "#774526");

    rect(x - 34, y - 15, 68, 9, "#a86632");

    rect(x - 28, y - 2, 56, 5, "#d38b43");

    rect(x - 4, y - 48, 8, 40, "#603a27");

    rect(x + 4, y - 45, 3, 35, "#8b5931");

    /* sail */

    ctx.beginPath();

    ctx.moveTo(x + 6, y - 45);
    ctx.lineTo(x + 36, y - 25);
    ctx.lineTo(x + 6, y - 10);

    ctx.closePath();

    ctx.fillStyle = "#eee0a7";
    ctx.fill();
}

/* =========================
   ISLAND
========================= */

function drawIsland(cx, cy) {

    /* water shadow */

    ctx.fillStyle = "#236e91";

    ctx.beginPath();

    ctx.arc(
        cx,
        cy,
        930,
        0,
        Math.PI * 2
    );

    ctx.fill();

    /* sand */

    ctx.fillStyle = "#d9b45e";

    ctx.beginPath();

    ctx.arc(
        cx,
        cy,
        900,
        0,
        Math.PI * 2
    );

    ctx.fill();

    /* grass */

    ctx.fillStyle = "#42954b";

    ctx.beginPath();

    ctx.arc(
        cx,
        cy,
        825,
        0,
        Math.PI * 2
    );

    ctx.fill();

    /* pixel-like beach decoration */

    for (let i = 0; i < 45; i++) {

        const a = rand() * Math.PI * 2;
        const d = 830 + rand() * 45;

        const x = cx + Math.cos(a) * d;
        const y = cy + Math.sin(a) * d;

        rect(
            x,
            y,
            5,
            5,
            "#f0cf75"
        );
    }
}

/* =========================
   PLAYER SPRITE
========================= */

function drawPlayer(x, y) {

    const walking =
        Math.abs(jx) + Math.abs(jy) > 0.15;

    const step =
        walking &&
        Math.floor(performance.now() / 150) % 2;

    /* shadow */

    rect(
        x - 12,
        y + 22,
        24,
        6,
        "#28502f"
    );

    /* legs */

    if (step) {

        rect(x - 10, y + 12, 7, 15, "#3c355e");
        rect(x + 4, y + 10, 7, 17, "#3c355e");

    } else {

        rect(x - 8, y + 10, 7, 17, "#3c355e");
        rect(x + 5, y + 12, 7, 15, "#3c355e");
    }

    /* body */

    rect(
        x - 12,
        y - 8,
        24,
        22,
        "#3c79a8"
    );

    rect(
        x - 9,
        y - 5,
        18,
        16,
        "#5596c2"
    );

    /* arms */

    rect(
        x - 17,
        y - 5,
        6,
        17,
        "#d99868"
    );

    rect(
        x + 11,
        y - 5,
        6,
        17,
        "#d99868"
    );

    /* head */

    rect(
        x - 11,
        y - 28,
        22,
        20,
        "#d99868"
    );

    /* hair */

    rect(
        x - 12,
        y - 32,
        24,
        8,
        "#3a2a22"
    );

    rect(
        x - 12,
        y - 28,
        6,
        7,
        "#3a2a22"
    );

    rect(
        x + 6,
        y - 28,
        6,
        7,
        "#3a2a22"
    );

    /* face */

    rect(
        x - 6,
        y - 20,
        3,
        3,
        "#33251f"
    );

    rect(
        x + 3,
        y - 20,
        3,
        3,
        "#33251f"
    );
}

/* =========================
   WORLD OBJECT
========================= */

function drawNode(n, cx, cy) {

    const x = n.x + cx;
    const y = n.y + cy;

    if (
        x < -100 ||
        x > W + 100 ||
        y < -100 ||
        y > H + 100
    ) return;

    if (n.t === 0) {

        drawTree(
            x,
            y,
            n.variant
        );

    } else if (n.t === 1) {

        drawRock(
            x,
            y,
            n.variant
        );

    } else if (n.t === 2) {

        drawBerry(
            x,
            y
        );

    } else {

        drawRaft(
            x,
            y
        );
    }
}

/* =========================
   NIGHT
========================= */

function drawNight() {

    if (time >= 18 || time < 6) {

        const darkness =
            time >= 18
                ? Math.min(0.48, (time - 18) * 0.12)
                : Math.min(0.48, (6 - time) * 0.12);

        ctx.fillStyle =
            `rgba(20,30,75,${darkness})`;

        ctx.fillRect(
            0,
            0,
            W,
            H
        );
    }
}

/* =========================
   HUD UPDATE
========================= */

function updateStats() {

    const hour =
        Math.floor(time);

    const minute =
        Math.floor(
            (time % 1) * 60
        );

    const hh =
        String(hour).padStart(2, "0");

    const mm =
        String(minute).padStart(2, "0");

    stats.textContent =
        `DAY ${day}  ${hh}:${mm}  |  ` +
        `HP ${Math.floor(hp)}  ` +
        `FOOD ${Math.floor(food)}  |  ` +
        `WOOD ${wood}  ` +
        `STONE ${stone}  ` +
        `BERRY ${berries}`;
}

/* =========================
   GAME LOOP
========================= */

function frame(now) {

    const dt =
        Math.min(
            0.05,
            (now - last) / 1000
        );

    last = now;

    /* GAME UPDATE */

    if (!won && !dead) {

        const speed = 155;

        px += jx * speed * dt;
        py += jy * speed * dt;

        /* island boundary */

        const distance =
            Math.hypot(px, py);

        if (distance > 850) {

            px *= 850 / distance;
            py *= 850 / distance;
        }

        /* time */

        time += dt / 20;

        if (time >= 24) {

            time -= 24;

            day++;

            save();
        }

        /* hunger */

        food -= dt * 0.65;

        if (food <= 0) {

            food = 0;

            hp -= dt * 3;
        }

        if (hp <= 0) {

            hp = 0;

            dead = true;

            save();
        }
    }

    /* DRAW */

    ctx.clearRect(
        0,
        0,
        W,
        H
    );

    /* WATER */

    ctx.fillStyle = "#2d82aa";

    ctx.fillRect(
        0,
        0,
        W,
        H
    );

    /* WATER PIXEL WAVES */

    for (let i = 0; i < 25; i++) {

        const wx =
            (i * 127 +
            Math.floor(now / 1000) * 4)
            % W;

        const wy =
            (i * 73) % H;

        rect(
            wx,
            wy,
            18,
            3,
            "rgba(170,225,235,0.35)"
        );
    }

    /* CAMERA */

    const cx =
        W / 2 - px;

    const cy =
        H / 2 - py;

    drawIsland(
        cx,
        cy
    );

    /* WORLD */

    for (const n of nodes) {

        if (n.alive) {

            drawNode(
                n,
                cx,
                cy
            );
        }
    }

    /* PLAYER */

    drawPlayer(
        W / 2,
        H / 2
    );

    /* NIGHT */

    drawNight();

    /* END */

    if (won) {

        message.className =
            "pixel-frame message-box ending";

        message.textContent =
            "YOU ESCAPED!";
    }

    if (dead) {

        message.className =
            "pixel-frame message-box ending";

        message.textContent =
            "YOU DIED";
    }

    updateStats();

    requestAnimationFrame(frame);
}

/* =========================
   START
========================= */

requestAnimationFrame(frame);

/* =========================
   PWA SERVICE WORKER
========================= */

if ("serviceWorker" in navigator) {

    window.addEventListener(
        "load",
        () => {

            navigator.serviceWorker
                .register("./sw.js")
                .catch(() => {});
        }
    );
}
