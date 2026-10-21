/**
 * ============================================================================
 * Hailey Shen — Interactive Journey Map Engine
 * Features:
 * - High-precision canvas scaling and coordinate mapping across all screens
 * - Generous click hitboxes for all landmarks (School, Quanta, NYU MOT, Big Tech, Woody's Outpost)
 * - Hailey walks strictly along the connected road network
 * - Information cards pop up ONLY upon arrival at the destination
 * - Absolutely NO red ripples or circles
 * - Hand pointer cursor
 * ============================================================================
 */

(function () {
  'use strict';

  // Polyfill roundRect
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii = 0) {
      let r = typeof radii === 'number' ? [radii, radii, radii, radii] : radii;
      if (!Array.isArray(r)) r = [0, 0, 0, 0];
      const [tl, tr, br, bl] = r;
      this.moveTo(x + tl, y);
      this.lineTo(x + w - tr, y);
      this.arcTo(x + w, y, x + w, y + tr, tr);
      this.lineTo(x + w, y + h - br);
      this.arcTo(x + w, y + h, x + w - br, y + h, br);
      this.lineTo(x + bl, y + h);
      this.arcTo(x, y + h, x, y + h - bl, bl);
      this.lineTo(x + tl, y);
      this.arcTo(x, y, x + tl, y, tl);
      this.closePath();
      return this;
    };
  }

  // --- Web Audio Synthesizer ---
  class SoundFX {
    constructor() {
      this.ctx = null;
      this.enabled = true;
    }

    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.ctx = new AudioContext();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    playTone(freq, type, duration, gainVal = 0.08) {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {}
    }

    step() { this.playTone(180, 'sine', 0.04, 0.02); }
    ding() {
      this.playTone(587.33, 'triangle', 0.12, 0.06);
      setTimeout(() => this.playTone(880, 'triangle', 0.2, 0.06), 90);
    }
    chime() {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        setTimeout(() => this.playTone(freq, 'sine', 0.18, 0.05), i * 70);
      });
    }
    bark() {
      this.playTone(320, 'sawtooth', 0.08, 0.05);
      setTimeout(() => this.playTone(280, 'sawtooth', 0.1, 0.05), 80);
    }
  }

  const sfx = new SoundFX();

  // --- Journey Milestones Info Data ---
  const MILESTONES = {
    start: {
      id: 'start',
      title: 'Origins & Curiosity',
      subtitle: 'Where the Journey Began',
      icon: '🌱',
      stage: 'STAGE 1 • ROOTS',
      desc: 'Every great adventure begins with natural curiosity, a passion for exploring the world, and an openness to unexpected paths.',
      highlights: [
        { label: 'Drive', val: 'Curiosity' },
        { label: 'Mindset', val: 'Lifelong Learner' }
      ]
    },
    poli_hall: {
      id: 'poli_hall',
      title: 'School of Political Science',
      subtitle: 'Undergrad Foundations in Policy & Systems',
      icon: '🏛️ 📜',
      stage: 'STAGE 2A • UNDERGRAD FOUNDATION',
      desc: 'I majored in Political Science in college. Studying political science taught me deep systems thinking, institutional governance, policy analysis, and understanding human motivations and incentives. It shaped my strategic approach to solving complex organizational problems.',
      highlights: [
        { label: 'College Major', val: 'Political Science' },
        { label: 'Degree', val: 'Bachelor of Arts' },
        { label: 'Key Strength', val: 'Systems Thinking' }
      ]
    },
    intersection: {
      id: 'intersection',
      title: 'The Crossroads of Paths',
      subtitle: 'Political Science meets High-Tech Manufacturing',
      icon: '⚖️ ➔ 💻',
      stage: 'STAGE 2B • THE TURNING POINT',
      desc: 'At the post-graduation crossroads, I chose to take the Tech Road. Channeling analytical governance and systems-level coordination into high-velocity hardware manufacturing proved to be the pivotal catalyst for my career.',
      highlights: [
        { label: 'Decision', val: 'The Tech Road' },
        { label: 'Transition', val: 'Poli Sci ➔ Tech PM' },
        { label: 'Mindset', val: 'Bold Explorer' }
      ]
    },
    quanta: {
      id: 'quanta',
      title: 'Quanta Computer',
      subtitle: '5 Years as Hardware Product Manager',
      icon: '💻 ⚙️',
      stage: 'STAGE 3 • HARDWARE LEADERSHIP',
      desc: 'Over 5 intensive years at Quanta Computer — the world\'s leading notebook computer manufacturer — I led cross-functional engineering teams, managed high-volume laptop manufacturing, NPI (New Product Introduction) cycles, supply chain architecture, and global customer delivery.',
      highlights: [
        { label: 'Tenure', val: '5 Full Years' },
        { label: 'Product Domain', val: 'Laptop Manufacturing' },
        { label: 'Core Scope', val: 'Hardware PM & NPI' }
      ]
    },
    nyu: {
      id: 'nyu',
      title: 'New York University (NYU)',
      subtitle: 'Master of Science in Management of Technology (MOT)',
      icon: '🎓 🗽',
      stage: 'STAGE 4 • CURRENT ADVENTURE',
      desc: 'Now 28, living in NYC and pursuing my Master\'s degree at NYU studying Management of Technology! Blending 5 years of hardware PM battle experience with tech innovation management, modern product strategy, and venture leadership.',
      highlights: [
        { label: 'Degree', val: 'M.S. MOT' },
        { label: 'School', val: 'NYU Tandon' },
        { label: 'Focus', val: 'Tech Strategy & PM' }
      ]
    },
    bigtech: {
      id: 'bigtech',
      title: 'Big Tech PM Horizon',
      subtitle: 'The Shining Next Destination',
      icon: '✨ 🏛️ 🚀',
      stage: 'STAGE 5 • FUTURE HORIZON',
      desc: 'NYU MOT is an empowering chapter, but not the final stop! The road leads onward toward joining Big Tech as a Product Manager. A warm, shining destination where I aspire to lead global-scale products that merge hardware craftsmanship, cutting-edge software, and human-centered design.',
      highlights: [
        { label: 'Career Goal', val: 'Big Tech PM' },
        { label: 'Vision', val: 'Global Impact' },
        { label: 'Superpower', val: 'HW PM + Strategy' }
      ]
    },
    store: {
      id: 'store',
      title: 'Woody\'s & Hailey\'s Interest Outpost',
      isStore: true
    }
  };

  // Logical coordinate system bounds
  const WORLD_WIDTH = 1200;
  const WORLD_HEIGHT = 750;

  // --- Road Network Graph (Hailey is locked to this network!) ---
  const ROAD_NODES = {
    start:        { id: 'start',        x: 120,  y: 620, landmark: 'start', name: 'Origins' },
    r1:           { id: 'r1',           x: 210,  y: 570 },
    r2:           { id: 'r2',           x: 280,  y: 510 },
    intersection: { id: 'intersection', x: 380,  y: 460, landmark: 'intersection', name: 'The Crossroads' },
    r_poli:       { id: 'r_poli',       x: 320,  y: 390 },
    poli_hall:    { id: 'poli_hall',    x: 270,  y: 340, landmark: 'poli_hall', name: 'School of Political Science' },
    r_tech1:      { id: 'r_tech1',      x: 480,  y: 400 },
    quanta:       { id: 'quanta',       x: 620,  y: 330, landmark: 'quanta', name: 'Quanta Computer' },
    r_shop1:      { id: 'r_shop1',      x: 700,  y: 420 },
    r_shop2:      { id: 'r_shop2',      x: 780,  y: 490 },
    store:        { id: 'store',        x: 860,  y: 560, landmark: 'store', name: "Woody's & Hobbies Outpost" },
    r_nyu:        { id: 'r_nyu',        x: 740,  y: 280 },
    nyu:          { id: 'nyu',          x: 880,  y: 240, landmark: 'nyu', name: 'NYU MOT' },
    r_fut1:       { id: 'r_fut1',       x: 980,  y: 200 },
    bigtech:      { id: 'bigtech',      x: 1080, y: 170, landmark: 'bigtech', name: 'Big Tech PM Horizon' }
  };

  const ROAD_EDGES = [
    ['start', 'r1'],
    ['r1', 'r2'],
    ['r2', 'intersection'],
    ['intersection', 'r_poli'],
    ['r_poli', 'poli_hall'],
    ['intersection', 'r_tech1'],
    ['r_tech1', 'quanta'],
    ['quanta', 'r_shop1'],
    ['r_shop1', 'r_shop2'],
    ['r_shop2', 'store'],
    ['quanta', 'r_nyu'],
    ['r_nyu', 'nyu'],
    ['nyu', 'r_fut1'],
    ['r_fut1', 'bigtech']
  ];

  const graph = {};
  Object.keys(ROAD_NODES).forEach(k => { graph[k] = []; });
  ROAD_EDGES.forEach(([u, v]) => {
    graph[u].push(v);
    graph[v].push(u);
  });

  // Shortest path on road graph (BFS)
  function findNodePath(fromId, toId) {
    if (fromId === toId) return [fromId];
    const queue = [[fromId]];
    const visited = new Set([fromId]);
    while (queue.length > 0) {
      const path = queue.shift();
      const curr = path[path.length - 1];
      if (curr === toId) return path;
      for (let neighbor of graph[curr]) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }
    return [fromId, toId];
  }

  function projectPointOnSegment(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return { x: a.x, y: a.y, t: 0, dist: Math.hypot(p.x - a.x, p.y - a.y) };
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    return {
      x: projX,
      y: projY,
      t: t,
      dist: Math.hypot(p.x - projX, p.y - projY)
    };
  }

  function snapToRoadNetwork(point) {
    let bestProj = null;
    let minD = Infinity;
    let bestEdge = null;

    for (let [uId, vId] of ROAD_EDGES) {
      const u = ROAD_NODES[uId];
      const v = ROAD_NODES[vId];
      const proj = projectPointOnSegment(point, u, v);
      if (proj.dist < minD) {
        minD = proj.dist;
        bestProj = proj;
        bestEdge = [uId, vId];
      }
    }

    return {
      x: bestProj.x,
      y: bestProj.y,
      u: bestEdge[0],
      v: bestEdge[1],
      t: bestProj.t
    };
  }

  function getClosestNode(point) {
    let minD = Infinity;
    let bestNode = 'start';
    for (let k in ROAD_NODES) {
      const n = ROAD_NODES[k];
      const d = Math.hypot(point.x - n.x, point.y - n.y);
      if (d < minD) {
        minD = d;
        bestNode = k;
      }
    }
    return bestNode;
  }

  // --- Canvas Setup ---
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const viewport = document.getElementById('map-viewport');

  // Hailey Character — 28 Yrs Old Tech PM, Stylish, Mature with Short Black Hair
  const girl = {
    x: ROAD_NODES.start.x,
    y: ROAD_NODES.start.y,
    speed: 2.7, // Smooth, graceful walking pace so speech bubble can be read comfortably
    facing: 1,
    isWalking: false,
    walkFrame: 0,
    bubbleText: "Hi! Click any building or road to guide me!",
    bubbleTimer: 360,
    waypointQueue: [],
    destinationAction: null
  };

  // Story Tour Sequence & Automated Loop State
  const STORY_TOUR_MILESTONES = [
    'start',        // 1. Origins & Curiosity
    'poli_hall',    // 2. School of Poli Sci (Undergrad Major)
    'intersection', // 3. The Crossroads (Choosing Tech)
    'quanta',       // 4. Quanta Computer (5 Yrs Hardware PM)
    'nyu',          // 5. NYU MOT (Master of Science in Management of Tech)
    'bigtech',      // 6. Big Tech PM Horizon (The Shining Next Destination)
    'store'         // 7. Woody's & Hailey's Interest Outpost (Woody & Passions)
  ];

  let isStoryTourActive = false;
  let storyTourStep = 0;
  let dogTailAngle = 0;
  let campfireFrame = 0;
  let horizonGlow = 0;

  // Accurate logical coordinate mapping from screen coordinates
  function getLogicalCoords(evt) {
    const rect = canvas.getBoundingClientRect();
    const clientX = evt.clientX != null ? evt.clientX : (evt.touches && evt.touches[0].clientX);
    const clientY = evt.clientY != null ? evt.clientY : (evt.touches && evt.touches[0].clientY);
    const x = (clientX - rect.left) * (WORLD_WIDTH / rect.width);
    const y = (clientY - rect.top) * (WORLD_HEIGHT / rect.height);
    return {
      x: Math.max(0, Math.min(WORLD_WIDTH, x)),
      y: Math.max(0, Math.min(WORLD_HEIGHT, y))
    };
  }

  // Comprehensive, generous hitbox detection for every landmark building
  function getLandmarkAt(pos) {
    // 1. Quanta Computer: Centered at (620, 330)
    if (pos.x >= 540 && pos.x <= 700 && pos.y >= 230 && pos.y <= 400) return 'quanta';
    // 2. NYU MOT: Centered at (880, 240)
    if (pos.x >= 800 && pos.x <= 960 && pos.y >= 130 && pos.y <= 310) return 'nyu';
    // 3. Big Tech PM Horizon: Centered at (1080, 170)
    if (pos.x >= 980 && pos.x <= 1180 && pos.y >= 50 && pos.y <= 260) return 'bigtech';
    // 4. Woody's & Hailey's Outpost: Centered at (860, 560)
    if (pos.x >= 770 && pos.x <= 950 && pos.y >= 460 && pos.y <= 630) return 'store';
    // 5. School of Political Science: Centered at (270, 340)
    if (pos.x >= 200 && pos.x <= 340 && pos.y >= 265 && pos.y <= 405) return 'poli_hall';
    // 6. The Crossroads Signpost: Centered at (380, 460)
    if (pos.x >= 280 && pos.x <= 480 && pos.y >= 415 && pos.y <= 515) return 'intersection';
    // 7. Start / Origins Flag: Centered at (120, 620)
    if (Math.hypot(pos.x - 120, pos.y - 620) < 60) return 'start';
    return null;
  }

  // Route Hailey along the road graph to a landmark, and execute callback ON ARRIVAL
  function walkToLandmark(landmarkId) {
    const targetNode = ROAD_NODES[landmarkId];
    if (!targetNode) return;

    const speechBubbles = {
      poli_hall: 'Walking to School of Political Science! 🏛️',
      intersection: 'Inspecting The Crossroads! ⚖️',
      quanta: 'Heading to Quanta Computer (5 Yrs Laptop PM)! 💻',
      nyu: 'Walking towards NYU MOT! 🎓',
      bigtech: 'Heading to the Big Tech PM Horizon! ✨',
      store: "Heading into Woody's Outpost! 🦮",
      start: 'Back to Origins! 🏁'
    };
    girl.bubbleText = speechBubbles[landmarkId] || 'On my way!';
    girl.bubbleTimer = 450; // Ample duration to read clearly

    // Check if Hailey is already at this node
    if (Math.hypot(girl.x - targetNode.x, girl.y - targetNode.y) < 12) {
      onArrivalAtLandmark(landmarkId);
      return;
    }

    routeAlongRoadGraph(landmarkId, () => {
      onArrivalAtLandmark(landmarkId);
    });
  }

  function onArrivalAtLandmark(landmarkId) {
    girl.isWalking = false;
    updateActivePill(landmarkId);

    if (landmarkId === 'store') {
      girl.bubbleText = "Welcome to Woody's Outpost! ❤️";
      girl.bubbleTimer = 200;
      sfx.bark();
      openModal('modal-interests');
    } else {
      sfx.chime();
      triggerLandmarkModal(landmarkId);
    }
  }

  // Build the node path along the road network
  function routeAlongRoadGraph(destNodeId, onArrival) {
    girl.destinationAction = onArrival;

    const currNodeId = getClosestNode(girl);
    const nodePath = findNodePath(currNodeId, destNodeId);

    const waypoints = [];
    // If not already on currNode, walk there first
    if (Math.hypot(girl.x - ROAD_NODES[currNodeId].x, girl.y - ROAD_NODES[currNodeId].y) > 4) {
      waypoints.push({ x: ROAD_NODES[currNodeId].x, y: ROAD_NODES[currNodeId].y });
    }

    for (let nid of nodePath) {
      const pt = ROAD_NODES[nid];
      const last = waypoints[waypoints.length - 1];
      if (!last || Math.hypot(last.x - pt.x, last.y - pt.y) > 2) {
        waypoints.push({ x: pt.x, y: pt.y });
      }
    }

    if (waypoints.length === 0) {
      if (girl.destinationAction) {
        const act = girl.destinationAction;
        girl.destinationAction = null;
        act();
      }
      return;
    }

    girl.waypointQueue = waypoints;
    sfx.step();
  }

  // Route to an arbitrary spot on the road (clicked by user)
  function routeToArbitraryPoint(targetPos) {
    girl.destinationAction = null;
    const snapped = snapToRoadNetwork(targetPos);
    const currNodeId = getClosestNode(girl);

    const distToU = Math.hypot(snapped.x - ROAD_NODES[snapped.u].x, snapped.y - ROAD_NODES[snapped.u].y);
    const distToV = Math.hypot(snapped.x - ROAD_NODES[snapped.v].x, snapped.y - ROAD_NODES[snapped.v].y);
    const targetNodeId = distToU < distToV ? snapped.u : snapped.v;

    const nodePath = findNodePath(currNodeId, targetNodeId);

    const waypoints = [];
    if (Math.hypot(girl.x - ROAD_NODES[currNodeId].x, girl.y - ROAD_NODES[currNodeId].y) > 4) {
      waypoints.push({ x: ROAD_NODES[currNodeId].x, y: ROAD_NODES[currNodeId].y });
    }
    for (let nid of nodePath) {
      waypoints.push({ x: ROAD_NODES[nid].x, y: ROAD_NODES[nid].y });
    }
    waypoints.push({ x: snapped.x, y: snapped.y });

    girl.waypointQueue = waypoints;
    sfx.step();
  }

  // --- Click Handler: NO RIPPLES, Pure Routing & Modal on Arrival ---
  canvas.addEventListener('click', (e) => {
    sfx.init();
    const pos = getLogicalCoords(e);

    // 1. Check if user clicked any landmark building or sign
    const clickedLandmark = getLandmarkAt(pos);
    if (clickedLandmark) {
      isStoryTourActive = false; // User took manual control
      walkToLandmark(clickedLandmark);
      return;
    }

    // 2. Otherwise walk strictly along road to the clicked spot
    isStoryTourActive = false;
    routeToArbitraryPoint(pos);
  });

  // --- Girl Movement Update ---
  function updateGirl() {
    if (girl.waypointQueue.length > 0) {
      const nextWp = girl.waypointQueue[0];
      const dx = nextWp.x - girl.x;
      const dy = nextWp.y - girl.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= girl.speed) {
        girl.x = nextWp.x;
        girl.y = nextWp.y;
        girl.waypointQueue.shift();

        if (girl.waypointQueue.length === 0) {
          girl.isWalking = false;
          if (girl.destinationAction) {
            const action = girl.destinationAction;
            girl.destinationAction = null;
            action();
          }
        }
      } else {
        girl.isWalking = true;
        girl.x += (dx / dist) * girl.speed;
        girl.y += (dy / dist) * girl.speed;
        if (Math.abs(dx) > 0.6) {
          girl.facing = dx > 0 ? 1 : -1;
        }
        if (Math.random() < 0.1) sfx.step();
      }
    } else {
      girl.isWalking = false;
    }

    if (girl.isWalking) girl.walkFrame += 0.22; else girl.walkFrame = 0;
    if (girl.bubbleTimer > 0) girl.bubbleTimer--;
  }

  // --- Drawing Utilities ---
  function drawDashedRoad(points, roadWidth = 44) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeStyle = '#3A322D';
    ctx.lineWidth = roadWidth + 5;
    ctx.stroke();

    ctx.strokeStyle = '#FFFDF7';
    ctx.lineWidth = roadWidth;
    ctx.stroke();

    ctx.setLineDash([12, 10]);
    ctx.strokeStyle = '#3A322D';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawPineTree(x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(-3.5, 0, 7, 16);

    ctx.fillStyle = '#305F48';
    ctx.strokeStyle = '#233F31';
    ctx.lineWidth = 2;
    [{ y: 4, w: 32, h: 20 }, { y: -10, w: 26, h: 18 }, { y: -24, w: 18, h: 16 }].forEach(l => {
      ctx.beginPath();
      ctx.moveTo(0, l.y - l.h);
      ctx.lineTo(l.w / 2, l.y);
      ctx.lineTo(-l.w / 2, l.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawMountain(x, y, w, h, color = '#6B9080') {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x, y - h);
    ctx.lineTo(x + w / 2, y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#2C3E35';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x - w * 0.16, y - h * 0.65);
    ctx.lineTo(x - w * 0.05, y - h * 0.6);
    ctx.lineTo(x + w * 0.08, y - h * 0.68);
    ctx.lineTo(x + w * 0.16, y - h * 0.65);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();
  }

  function drawRiver() {
    drawMountain(170, 160, 190, 140, '#4F7C68');

    ctx.fillStyle = '#79D7E8';
    ctx.strokeStyle = '#2B4C55';
    ctx.lineWidth = 2;
    ctx.fillRect(150, 60, 40, 85);
    ctx.strokeRect(150, 60, 40, 85);

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    for (let ly = 75; ly < 140; ly += 14) {
      ctx.beginPath(); ctx.moveTo(154, ly); ctx.lineTo(186, ly); ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(170, 145);
    ctx.bezierCurveTo(130, 240, 260, 320, 240, 420);
    ctx.bezierCurveTo(220, 500, 350, 520, 450, 520);
    ctx.bezierCurveTo(550, 520, 560, 590, 520, 680);
    ctx.lineWidth = 42;
    ctx.strokeStyle = '#6CC5D6';
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 3;
    [[175, 220], [210, 310], [240, 390], [310, 490], [420, 520], [520, 620]].forEach(w => {
      ctx.beginPath(); ctx.arc(w[0], w[1], 10, 0.2, Math.PI - 0.2); ctx.stroke();
    });
  }

  function drawCampground(x, y) {
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#D9534F';
    ctx.strokeStyle = '#2B2625';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-45, 10); ctx.lineTo(-20, -25); ctx.lineTo(5, 10);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#E8ECEF';
    ctx.beginPath();
    ctx.moveTo(10, 10); ctx.lineTo(30, -15); ctx.lineTo(50, 10);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    campfireFrame += 0.15;
    const flicker = Math.sin(campfireFrame) * 3;
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath(); ctx.moveTo(-8, 18); ctx.quadraticCurveTo(0, -6 + flicker, 8, 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#EF4444';
    ctx.beginPath(); ctx.moveTo(-4, 18); ctx.quadraticCurveTo(0, 0 + flicker, 4, 18); ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#2B2625';
    ctx.font = 'bold 10px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OUTDOOR BASECAMP', 0, 36);
    ctx.restore();
  }

  function drawClickTag(x, y, text) {
    ctx.save();
    ctx.translate(x, y);
    ctx.font = 'bold 11px Fredoka, sans-serif';
    const textWidth = ctx.measureText(text).width;
    const pad = 8;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#2B2625';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-textWidth / 2 - pad, -12, textWidth + pad * 2, 22, 11);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#2B2625';
    ctx.textAlign = 'center';
    ctx.fillText(text, 0, 3);
    ctx.restore();
  }

  function drawCrossroads(x, y) {
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#784626';
    ctx.fillRect(-6, -20, 12, 60);

    ctx.fillStyle = '#F3E5D8';
    ctx.strokeStyle = '#321D10';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-5, -15); ctx.lineTo(-85, -15); ctx.lineTo(-100, -2); ctx.lineTo(-85, 10); ctx.lineTo(-5, 10);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#3A2E2B';
    ctx.font = 'bold 9px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏛️ POLI SCIENCE', -52, 0);

    ctx.fillStyle = '#FFE27A';
    ctx.beginPath();
    ctx.moveTo(5, 5); ctx.lineTo(95, 5); ctx.lineTo(110, 18); ctx.lineTo(95, 30); ctx.lineTo(5, 30);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#2B2625';
    ctx.font = 'bold 9px Space Grotesk, sans-serif';
    ctx.fillText('💻 TECH ROAD ➔', 55, 20);

    drawClickTag(0, -32, '⚖️ The Crossroads');
    ctx.restore();
  }

  function drawQuantaBuilding(x, y) {
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#2D3748';
    ctx.strokeStyle = '#1A202C';
    ctx.lineWidth = 3;
    ctx.fillRect(-55, -45, 110, 80);
    ctx.strokeRect(-55, -45, 110, 80);

    ctx.fillStyle = '#4A5568';
    ctx.fillRect(-60, -55, 120, 14);
    ctx.strokeRect(-60, -55, 120, 14);

    ctx.fillStyle = '#63B3ED';
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillRect(-42 + c * 32, -30 + r * 28, 20, 18);
        ctx.strokeRect(-42 + c * 32, -30 + r * 28, 20, 18);
      }
    }

    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(-18, -4, 36, 22);
    ctx.fillStyle = '#1A365D';
    ctx.fillRect(-15, -2, 30, 16);
    ctx.fillStyle = '#CBD5E0';
    ctx.fillRect(-22, 18, 44, 4);

    ctx.fillStyle = '#E53E3E';
    ctx.fillRect(-50, -74, 100, 18);
    ctx.strokeRect(-50, -74, 100, 18);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QUANTA COMPUTER', 0, -61);

    drawClickTag(0, -85, '💻 5 Yrs Laptop PM');
    ctx.restore();
  }

  function drawNYUBuilding(x, y) {
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#F7FAFC';
    ctx.strokeStyle = '#2D3748';
    ctx.lineWidth = 3;
    ctx.fillRect(-46, -42, 24, 80); ctx.strokeRect(-46, -42, 24, 80);
    ctx.fillRect(22, -42, 24, 80); ctx.strokeRect(22, -42, 24, 80);

    ctx.fillRect(-52, -62, 104, 20); ctx.strokeRect(-52, -62, 104, 20);

    ctx.fillStyle = '#FBE6D6';
    ctx.beginPath();
    ctx.arc(0, -10, 22, Math.PI, 0, false);
    ctx.lineTo(22, 38); ctx.lineTo(-22, 38);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#57068C';
    ctx.fillRect(-42, -58, 84, 14);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NYU • MOT', 0, -47);

    ctx.strokeStyle = '#2D3748';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, -62); ctx.lineTo(0, -92); ctx.stroke();
    ctx.fillStyle = '#57068C';
    ctx.beginPath(); ctx.moveTo(0, -92); ctx.lineTo(30, -82); ctx.lineTo(0, -72);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    drawClickTag(0, -102, '🎓 NYU MOT Master\'s');
    ctx.restore();
  }

  function drawBigTechHorizon(x, y) {
    ctx.save();
    ctx.translate(x, y);

    horizonGlow += 0.04;
    const pulse = Math.sin(horizonGlow) * 6;

    const glowGrad = ctx.createRadialGradient(0, -20, 10, 0, -20, 85 + pulse);
    glowGrad.addColorStop(0, 'rgba(255, 223, 128, 0.85)');
    glowGrad.addColorStop(0.5, 'rgba(255, 183, 77, 0.45)');
    glowGrad.addColorStop(1, 'rgba(255, 243, 224, 0)');

    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, -20, 85 + pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.35)';
    ctx.lineWidth = 2;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(a + horizonGlow * 0.2) * 35, -20 + Math.sin(a + horizonGlow * 0.2) * 35);
      ctx.lineTo(Math.cos(a + horizonGlow * 0.2) * (70 + pulse), -20 + Math.sin(a + horizonGlow * 0.2) * (70 + pulse));
      ctx.stroke();
    }

    ctx.fillStyle = '#FFF8E1';
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-45, 10, 90, 20, 6);
    ctx.fill(); ctx.stroke();

    const towerGrad = ctx.createLinearGradient(0, -50, 0, 10);
    towerGrad.addColorStop(0, '#FFE082');
    towerGrad.addColorStop(1, '#FFB74D');
    ctx.fillStyle = towerGrad;
    ctx.fillRect(-32, -45, 64, 55);
    ctx.strokeRect(-32, -45, 64, 55);

    ctx.fillStyle = '#FFFFFF';
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillRect(-24 + c * 18, -38 + r * 16, 12, 10);
      }
    }

    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(-36, -45); ctx.lineTo(0, -75); ctx.lineTo(36, -45); ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(0, -75, 5 + Math.sin(horizonGlow * 2) * 1.5, 0, Math.PI * 2);
    ctx.fill();

    const s1 = Math.sin(horizonGlow * 1.5) * 4;
    const s2 = Math.cos(horizonGlow * 1.3) * 4;
    ctx.font = '14px sans-serif';
    ctx.fillText('✨', -48, -40 + s1);
    ctx.fillText('⭐', 38, -50 + s2);
    ctx.fillText('✨', 0, -88 + s1);

    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(-52, -18, 104, 18);
    ctx.strokeRect(-52, -18, 104, 18);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 9px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BIG TECH PM HORIZON', 0, -6);

    drawClickTag(0, -98, '✨ Future: Big Tech PM');
    ctx.restore();
  }

  function drawInterestShop(x, y) {
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#E8985E';
    ctx.strokeStyle = '#3E2415';
    ctx.lineWidth = 3;
    ctx.fillRect(-65, -45, 130, 85);
    ctx.strokeRect(-65, -45, 130, 85);

    const awningW = 140;
    const stripes = 8;
    const stripeW = awningW / stripes;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#E53E3E' : '#FFFFFF';
      ctx.strokeStyle = '#3E2415';
      ctx.lineWidth = 2;
      ctx.fillRect(-70 + i * stripeW, -45, stripeW, 18);
      ctx.strokeRect(-70 + i * stripeW, -45, stripeW, 18);
    }

    ctx.fillStyle = '#FFF8E7';
    ctx.strokeStyle = '#3E2415';
    ctx.lineWidth = 2.5;
    ctx.fillRect(-64, -70, 128, 20);
    ctx.strokeRect(-64, -70, 128, 20);

    ctx.fillStyle = '#2B2625';
    ctx.font = 'bold 9.5px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏕️ WOODY & HAILEY\'S OUTPOST', 0, -56);

    ctx.fillStyle = '#3E2415';
    ctx.fillRect(-18, 0, 36, 40);
    ctx.fillStyle = '#FFE0B2';
    ctx.fillRect(-12, 6, 24, 18);

    ctx.save();
    ctx.translate(-50, 16); ctx.rotate(-0.2);
    ctx.fillStyle = '#E53E3E';
    ctx.strokeStyle = '#1A365D';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-5, -24, 10, 48, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFD54F'; ctx.fillRect(-5, -4, 10, 7);
    ctx.restore();

    // WOODY
    dogTailAngle += 0.2;
    const tailWag = Math.sin(dogTailAngle) * 0.45;

    ctx.save();
    ctx.translate(22, 26);

    ctx.save();
    ctx.translate(14, 4);
    ctx.rotate(0.3 + tailWag);
    ctx.fillStyle = '#E69C45';
    ctx.beginPath(); ctx.ellipse(8, -6, 12, 5, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#F6B45A';
    ctx.strokeStyle = '#6E4215';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, 14, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.beginPath(); ctx.arc(-8, -10, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#D6882C';
    ctx.beginPath(); ctx.ellipse(-14, -8, 4, 8, -0.3, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#FFE0B2';
    ctx.beginPath(); ctx.arc(-13, -7, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3D2612';
    ctx.beginPath(); ctx.arc(-16, -9, 2.5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#F472B6';
    ctx.beginPath();
    ctx.ellipse(-14, -1, 3, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2B1A0E';
    ctx.beginPath(); ctx.arc(-8, -12, 1.8, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#E53E3E'; ctx.fillRect(-12, -2, 8, 3);

    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(8, 8, 14, 5);
    ctx.fillStyle = '#2B2625';
    ctx.font = 'bold 8px Fredoka, sans-serif';
    ctx.fillText('WOODY', -8, 18);

    const heartFloat = Math.sin(dogTailAngle * 0.7) * 3;
    ctx.fillStyle = '#E53E3E';
    ctx.font = '12px Fredoka, sans-serif';
    ctx.fillText('❤️', -8, -24 + heartFloat);

    ctx.restore();

    drawClickTag(0, -82, '🏕️ Woody\'s Outpost 🦮');
    ctx.restore();
  }

  function drawPoliSciHall(x, y) {
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#D97706';
    ctx.strokeStyle = '#2B2625';
    ctx.lineWidth = 2.5;
    ctx.fillRect(-35, -20, 70, 42); ctx.strokeRect(-35, -20, 70, 42);

    ctx.beginPath(); ctx.moveTo(-40, -20); ctx.lineTo(0, -45); ctx.lineTo(40, -20); ctx.closePath();
    ctx.fillStyle = '#F59E0B'; ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    for (let c = -24; c <= 24; c += 16) {
      ctx.fillRect(c - 3, -18, 6, 40); ctx.strokeRect(c - 3, -18, 6, 40);
    }

    drawClickTag(0, -54, '🏛️ School of Poli Sci');
    ctx.restore();
  }

  function drawGirlCharacter() {
    ctx.save();
    ctx.translate(girl.x, girl.y);
    ctx.scale(girl.facing, 1);

    const bob = girl.isWalking ? Math.sin(girl.walkFrame * 2) * 1.8 : 0;
    const legSwing = girl.isWalking ? Math.sin(girl.walkFrame) * 6 : 0;

    // Soft ground shadow
    ctx.fillStyle = 'rgba(43, 38, 37, 0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(0, bob);

    // --- Legs & Sleek Trousers ---
    ctx.strokeStyle = '#1F2937'; // Dark charcoal slim trousers
    ctx.lineWidth = 3.5;
    // Back leg
    ctx.beginPath();
    ctx.moveTo(3, -4);
    ctx.lineTo(3.5 - legSwing, 8);
    ctx.stroke();
    // Back Chelsea boot
    ctx.fillStyle = '#171717';
    ctx.fillRect(1 - legSwing, 6, 8, 4.5);

    // Front leg
    ctx.beginPath();
    ctx.moveTo(-3, -4);
    ctx.lineTo(-3 + legSwing, 8);
    ctx.stroke();
    // Front Chelsea boot
    ctx.fillRect(-5 + legSwing, 6, 8, 4.5);

    // --- Stylish Tailored Coat / Blazer (Charcoal minimalist jacket) ---
    ctx.fillStyle = '#262626'; // Sleek dark designer outerwear
    ctx.strokeStyle = '#171717';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-8, -28, 16, 26, [3, 3, 2, 2]);
    ctx.fill();
    ctx.stroke();

    // Chic V-neck & Cream inner top
    ctx.fillStyle = '#FDFBF7';
    ctx.beginPath();
    ctx.moveTo(-4, -28);
    ctx.lineTo(0, -18);
    ctx.lineTo(4, -28);
    ctx.closePath();
    ctx.fill();

    // Belt / waistline detail
    ctx.strokeStyle = '#D97706'; // Slim camel leather belt
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-8, -14);
    ctx.lineTo(8, -14);
    ctx.stroke();

    // --- Chic Crossbody Bag (Camel leather with gold clasp) ---
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-6, -26);
    ctx.lineTo(8, -12);
    ctx.stroke();
    ctx.fillStyle = '#B45309';
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(4, -15, 9, 8, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FCD34D';
    ctx.fillRect(7.5, -12, 2, 2);

    // --- Head & Face ---
    // Neck
    ctx.fillStyle = '#FCD34D';
    ctx.fillRect(-2.5, -34, 5, 7);

    // Head oval
    ctx.fillStyle = '#FCD34D';
    ctx.beginPath();
    ctx.arc(0, -38, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2B2625';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Mature, refined eyes
    ctx.fillStyle = '#171717';
    ctx.fillRect(2.5, -39, 3, 1.2);
    ctx.beginPath();
    ctx.arc(4, -37.5, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Gentle confident smile
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(3.5, -34.5, 2.5, 0.2, Math.PI - 0.3);
    ctx.stroke();

    // --- Short Black Hair (Chic Modern French Bob) ---
    ctx.fillStyle = '#171717'; // Jet black
    ctx.beginPath();
    ctx.arc(-2, -40, 10.5, Math.PI * 0.7, Math.PI * 2.1, false);
    ctx.fill();

    // Sleek side strands framing jawline
    ctx.beginPath();
    ctx.moveTo(-8, -42);
    ctx.quadraticCurveTo(-11, -33, -7, -29);
    ctx.lineTo(-4, -34);
    ctx.closePath();
    ctx.fill();

    // Front chic fringe / side-parted bangs
    ctx.beginPath();
    ctx.moveTo(-8, -45);
    ctx.quadraticCurveTo(0, -44, 7, -40);
    ctx.quadraticCurveTo(4, -36, 1, -40);
    ctx.quadraticCurveTo(-4, -42, -8, -45);
    ctx.closePath();
    ctx.fill();

    // Earring: Subtle minimalist gold hoop
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(-3, -34, 1.8, 0, Math.PI * 2);
    ctx.stroke();

    // --- Arm & Gesture ---
    const armSwing = girl.isWalking ? -Math.sin(girl.walkFrame) * 4 : 0;
    ctx.strokeStyle = '#262626';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(1, -24);
    ctx.lineTo(4 + armSwing, -14);
    ctx.stroke();
    ctx.fillStyle = '#FCD34D';
    ctx.beginPath();
    ctx.arc(4 + armSwing, -13, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Road paths for rendering
  const roadOriginsToCrossroads = [
    { x: 90, y: 640 }, { x: 190, y: 600 }, { x: 260, y: 530 }, { x: 380, y: 460 }
  ];
  const roadCrossroadsToQuanta = [
    { x: 380, y: 460 }, { x: 480, y: 400 }, { x: 620, y: 330 }
  ];
  const roadQuantaToNYU = [
    { x: 620, y: 330 }, { x: 740, y: 280 }, { x: 880, y: 240 }
  ];
  const roadNYUToBigTech = [
    { x: 880, y: 240 }, { x: 980, y: 200 }, { x: 1080, y: 170 }
  ];
  const roadToInterestShop = [
    { x: 620, y: 330 }, { x: 700, y: 420 }, { x: 780, y: 490 }, { x: 860, y: 560 }
  ];
  const roadToPoliSciHall = [
    { x: 380, y: 460 }, { x: 320, y: 390 }, { x: 270, y: 340 }
  ];

  // --- Main Animation Render Loop ---
  function render() {
    const rect = viewport.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Keep physical canvas buffer sized accurately to viewport
    const targetW = Math.max(300, Math.round(rect.width * dpr));
    const targetH = Math.max(200, Math.round(rect.height * dpr));
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    // Transform coordinate system so logical 1200x750 fills rect.width x rect.height
    const scaleX = rect.width / WORLD_WIDTH;
    const scaleY = rect.height / WORLD_HEIGHT;
    ctx.setTransform(scaleX * dpr, 0, 0, scaleY * dpr, 0, 0);

    ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // 1. Warm Map Ground
    ctx.fillStyle = '#F8B1A0';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    ctx.fillStyle = '#EE9F8E';
    [[80, 100], [240, 80], [420, 140], [700, 100], [920, 80], [60, 480], [520, 240], [800, 380], [1050, 420], [660, 640]].forEach(d => {
      ctx.beginPath(); ctx.arc(d[0], d[1], 18, 0, Math.PI * 2); ctx.fill();
    });

    // 2. Mountains
    drawMountain(740, 120, 180, 100, '#5A8B73');
    drawMountain(860, 130, 210, 120, '#4F7C68');
    drawMountain(1050, 140, 240, 130, '#3F6B58');

    // 3. River & Waterfall
    drawRiver();

    // 4. Roads (All connected, paved & dashed)
    drawDashedRoad(roadOriginsToCrossroads);
    drawDashedRoad(roadToPoliSciHall, 32);
    drawDashedRoad(roadCrossroadsToQuanta);
    drawDashedRoad(roadQuantaToNYU);
    drawDashedRoad(roadNYUToBigTech);
    drawDashedRoad(roadToInterestShop);

    // 5. Trees
    drawPineTree(80, 240, 1.2);
    drawPineTree(95, 300, 1.0);
    drawPineTree(70, 360, 1.1);
    drawPineTree(840, 180, 1.1);
    drawPineTree(720, 640, 1.1);
    drawPineTree(1000, 620, 1.2);

    // 6. Basecamp
    drawCampground(180, 460);

    // 7. Poli Sci Hall
    drawPoliSciHall(270, 340);

    // 8. Landmarks
    drawCrossroads(380, 460);
    drawQuantaBuilding(620, 330);
    drawNYUBuilding(880, 240);
    drawBigTechHorizon(1080, 170);
    drawInterestShop(860, 560);

    // 9. Start Flag
    ctx.save();
    ctx.translate(120, 620);
    ctx.strokeStyle = '#2B2625'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, -34); ctx.stroke();
    ctx.fillStyle = '#10B981';
    ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(24, -25); ctx.lineTo(0, -16); ctx.closePath(); ctx.fill(); ctx.stroke();
    drawClickTag(0, -44, '🏁 1. Start');
    ctx.restore();

    // 10. Girl Adventurer (Strictly on the road! NO red ripples rendered!)
    updateGirl();
    drawGirlCharacter();

    // 11. Update HTML Floating Speech Bubble Position (100% vector-crisp)
    const bubbleEl = document.getElementById('hailey-speech-bubble');
    const bubbleTextEl = document.getElementById('hailey-bubble-text');
    if (bubbleEl && bubbleTextEl) {
      if (girl.bubbleTimer > 0 && girl.bubbleText) {
        bubbleTextEl.textContent = girl.bubbleText;
        const screenX = (girl.x / WORLD_WIDTH) * rect.width;
        const screenY = (girl.y / WORLD_HEIGHT) * rect.height - 54;
        bubbleEl.style.left = screenX + 'px';
        bubbleEl.style.top = screenY + 'px';
        bubbleEl.style.display = 'block';
      } else {
        bubbleEl.style.display = 'none';
      }
    }

    requestAnimationFrame(render);
  }

  // --- Modals System ---
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    sfx.ding();

    // If opening the interest outpost store modal, update continue button text
    if (modalId === 'modal-interests') {
      const storeContinueBtn = document.getElementById('btn-store-continue');
      if (storeContinueBtn) {
        if (isStoryTourActive) {
          storeContinueBtn.textContent = 'Finish Tour & Explore Freely 🎉';
        } else {
          storeContinueBtn.textContent = 'Close & Explore Map ➔';
        }
      }
    }
  }

  function closeModal(modal) {
    const isTourModal = modal.id === 'modal-milestone' || modal.id === 'modal-interests';
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');

    // Automated Story Tour Loop: Advance to next milestone automatically upon closing!
    if (isTourModal && isStoryTourActive) {
      storyTourStep++;
      if (storyTourStep < STORY_TOUR_MILESTONES.length) {
        const nextLandmark = STORY_TOUR_MILESTONES[storyTourStep];
        setTimeout(() => {
          walkToLandmark(nextLandmark);
        }, 360);
      } else {
        isStoryTourActive = false;
        girl.bubbleText = '✨ Story Tour complete! Feel free to explore freely or click Business Card!';
        girl.bubbleTimer = 350;
        sfx.chime();
      }
    }
  }

  document.querySelectorAll('.game-modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-close') || e.target.classList.contains('modal-backdrop')) {
        closeModal(modal);
      }
    });
  });

  function triggerLandmarkModal(landmarkId) {
    if (landmarkId === 'store') {
      openModal('modal-interests');
      sfx.bark();
      return;
    }

    const data = MILESTONES[landmarkId];
    if (!data) return;

    document.getElementById('lm-icon').textContent = data.icon;
    document.getElementById('lm-stage').textContent = data.stage;
    document.getElementById('lm-title').textContent = data.title;
    document.getElementById('lm-subtitle').textContent = data.subtitle;
    document.getElementById('lm-description').textContent = data.desc;

    const highlightsBox = document.getElementById('lm-highlights');
    highlightsBox.innerHTML = '';
    if (data.highlights) {
      data.highlights.forEach(h => {
        const item = document.createElement('div');
        item.className = 'highlight-box';
        // Light grey topic (label) on TOP, detail black answer (val) at BOTTOM
        item.innerHTML = `<span class="highlight-lbl">${h.label}</span><span class="highlight-val">${h.val}</span>`;
        highlightsBox.appendChild(item);
      });
    }

    // Dynamic Continue Button label during story tour
    const continueBtn = document.getElementById('btn-milestone-continue');
    if (continueBtn) {
      if (isStoryTourActive && storyTourStep < STORY_TOUR_MILESTONES.length - 1) {
        const nextId = STORY_TOUR_MILESTONES[storyTourStep + 1];
        const nextNames = {
          poli_hall: 'School of Poli Sci',
          intersection: 'The Crossroads',
          quanta: 'Quanta Computer',
          nyu: 'NYU MOT',
          bigtech: 'Big Tech Horizon',
          store: "Woody's Outpost"
        };
        continueBtn.textContent = `Continue to ${nextNames[nextId] || 'Next Milestone'} ➔`;
      } else if (isStoryTourActive && storyTourStep === STORY_TOUR_MILESTONES.length - 1) {
        continueBtn.textContent = 'Finish Tour & Explore Freely 🎉';
      } else {
        continueBtn.textContent = 'Continue Exploring Map ➔';
      }
    }

    openModal('modal-milestone');
  }

  // Milestone Pill Nav Clicking -> Routes Hailey first, then pops up card on arrival!
  document.querySelectorAll('.milestone-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      isStoryTourActive = false; // user took manual control
      const targetId = pill.getAttribute('data-target');
      walkToLandmark(targetId);
    });
  });

  function updateActivePill(id) {
    document.querySelectorAll('.milestone-pill').forEach(p => {
      const target = p.getAttribute('data-target');
      const matches = (target === id) || (target === 'intersection' && id === 'poli_hall');
      p.classList.toggle('active', matches);
    });
  }

  // Interest Store Tabs
  document.querySelectorAll('.store-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.store-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.store-tab-content .tab-panel').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(`tab-${btn.getAttribute('data-tab')}`);
      if (targetPanel) {
        targetPanel.classList.add('active');
        if (btn.getAttribute('data-tab') === 'woody') {
          sfx.bark();
        } else {
          sfx.step();
        }
      }
    });
  });

  // Story Tour Button: Starts automated tour from Origins and loops through all landmarks!
  document.getElementById('btn-story-mode').addEventListener('click', () => {
    sfx.chime();
    isStoryTourActive = true;
    storyTourStep = 0;
    walkToLandmark(STORY_TOUR_MILESTONES[storyTourStep]);
  });

  // Direct Button Openers -> Walk to store / card
  document.getElementById('btn-interest-shop').addEventListener('click', () => {
    walkToLandmark('store');
  });

  document.getElementById('btn-card').addEventListener('click', () => {
    openModal('modal-card');
  });

  // Toast close
  document.getElementById('close-toast').addEventListener('click', () => {
    document.getElementById('toast-hint').style.display = 'none';
  });

  // Sound toggle button
  const soundBtn = document.getElementById('btn-sound');
  const soundIcon = document.getElementById('sound-icon');
  soundBtn.addEventListener('click', () => {
    sfx.enabled = !sfx.enabled;
    soundIcon.textContent = sfx.enabled ? '🔊' : '🔇';
    if (sfx.enabled) sfx.ding();
  });

  // Kickoff Game Loop
  requestAnimationFrame(render);
})();
