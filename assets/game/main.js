/* KN City — 3D city, walk it or fly over it.
 * Three.js renders, Cannon.js runs the rigid-body physics.
 * Flutter hosts this page in a WebView and talks to it over a JS channel.
 */
(function () {
  'use strict';

  // ------------------------------------------------------------- bridge
  function post(msg) {
    if (window.KNBridge && window.KNBridge.postMessage) {
      window.KNBridge.postMessage(JSON.stringify(msg));
    }
  }

  // ------------------------------------------------------------- config
  var CFG = {
    seed: 20261104,
    blocks: 7,          // 7 x 7 city blocks
    blockSize: 26,
    roadWidth: 14,
    walkSpeed: 5.6,
    sprintSpeed: 9.6,
    jumpSpeed: 6.8,
    droneSpeed: 26,
    droneMinY: 4,
    droneMaxY: 170,
    camDist: 7.4,
    camPitch: 0.30,
    dronePitch: -0.38
  };
  var PITCH = CFG.blockSize + CFG.roadWidth;
  var HALF = CFG.blocks * PITCH / 2;
  var SPAWN = { x: PITCH / 2, y: 1.6, z: PITCH / 2 };
  var PLAYER_R = 0.55;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ------------------------------------------------------------- renderer
  var canvas = document.getElementById('scene');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x16222e, 150, 560);

  var camera = new THREE.PerspectiveCamera(64, 1, 0.1, 1600);
  camera.position.set(SPAWN.x, 4, SPAWN.z - 8);
  camera.lookAt(SPAWN.x, 1.4, SPAWN.z);

  // ------------------------------------------------------------- sky
  var skyGeo = new THREE.SphereGeometry(700, 24, 16);
  var skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x08131f) },
      bottomColor: { value: new THREE.Color(0x24405a) }
    },
    vertexShader: [
      'varying float vY;',
      'void main() {',
      '  vY = normalize(position).y;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'varying float vY;',
      'uniform vec3 topColor;',
      'uniform vec3 bottomColor;',
      'void main() {',
      '  float t = clamp(vY * 0.5 + 0.5, 0.0, 1.0);',
      '  vec3 c = mix(bottomColor, topColor, pow(t, 0.75));',
      '  gl_FragColor = vec4(c, 1.0);',
      '}'
    ].join('\n')
  });
  var sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  // ------------------------------------------------------------- lights
  var hemi = new THREE.HemisphereLight(0x9fd8ff, 0x1b2430, 0.75);
  scene.add(hemi);

  var sun = new THREE.DirectionalLight(0xfff0d0, 1.15);
  sun.position.set(70, 140, 50);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 420;
  sun.shadow.camera.left = -90;
  sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90;
  sun.shadow.camera.bottom = -90;
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  scene.add(sun.target);

  // ------------------------------------------------------------- ground
  var groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1800, 1800),
    new THREE.MeshLambertMaterial({ color: 0x14181d })
  );
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // ------------------------------------------------------------- physics
  var world = new CANNON.World();
  world.gravity.set(0, -26, 0);
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.defaultContactMaterial.friction = 0;
  world.defaultContactMaterial.restitution = 0;

  var groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(groundBody);

  var playerBody = new CANNON.Body({
    mass: 78,
    shape: new CANNON.Sphere(PLAYER_R),
    linearDamping: 0
  });
  playerBody.position.set(SPAWN.x, SPAWN.y, SPAWN.z);
  playerBody.fixedRotation = true;
  playerBody.updateMassProperties();
  world.addBody(playerBody);

  // ------------------------------------------------------------- city
  var buildings = [];
  var plinths = [];
  var parks = [];
  var antennas = [];

  function buildCityData() {
    var rand = mulberry32(CFG.seed);
    var palette = [0x2b3a4a, 0x33414f, 0x263140, 0x3a4552, 0x2f3b47, 0x3d4a56, 0x243444, 0x404e5c];
    var inset = 2.0;
    var gap = 2.2;

    for (var gi = 0; gi < CFG.blocks; gi++) {
      for (var gj = 0; gj < CFG.blocks; gj++) {
        var cx = (gi - (CFG.blocks - 1) / 2) * PITCH;
        var cz = (gj - (CFG.blocks - 1) / 2) * PITCH;
        plinths.push({ x: cx, z: cz });

        var fromCentre = Math.sqrt(cx * cx + cz * cz) / HALF;
        if (rand() < 0.13) {
          parks.push({ x: cx, z: cz });
          continue;
        }

        var nx = rand() < 0.5 ? 1 : 2;
        var nz = rand() < 0.5 ? 1 : 2;
        var cellW = (CFG.blockSize - 2 * inset - gap * (nx - 1)) / nx;
        var cellD = (CFG.blockSize - 2 * inset - gap * (nz - 1)) / nz;

        for (var ix = 0; ix < nx; ix++) {
          for (var iz = 0; iz < nz; iz++) {
            if (rand() < 0.08) { continue; }

            var lotX = cx - CFG.blockSize / 2 + inset + cellW / 2 + ix * (cellW + gap);
            var lotZ = cz - CFG.blockSize / 2 + inset + cellD / 2 + iz * (cellD + gap);
            var w = Math.max(3.6, cellW - (0.8 + rand() * 1.6));
            var d = Math.max(3.6, cellD - (0.8 + rand() * 1.6));
            var tall = clamp(1 - fromCentre, 0, 1) * 0.85 + 0.15;
            var h = 7 + Math.pow(rand(), 1.4) * 80 * tall;

            var col = new THREE.Color(palette[Math.floor(rand() * palette.length)]);
            col.offsetHSL(0, 0, (rand() - 0.5) * 0.06);

            buildings.push({ x: lotX, z: lotZ, w: w, d: d, h: h, color: col });
            if (h > 34) {
              antennas.push({
                x: lotX,
                z: lotZ,
                y: h + 0.18 + 2.2,
                h: 3 + rand() * 4
              });
            }
          }
        }
      }
    }
  }

  function addStaticBox(x, y, z, w, h, d) {
    var body = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2))
    });
    body.position.set(x, y, z);
    world.addBody(body);
  }

  function buildCityMeshes() {
    var dummy = new THREE.Object3D();

    // plinths (the raised pavement each block sits on)
    var plinthGeo = new THREE.BoxGeometry(1, 1, 1);
    var plinthMat = new THREE.MeshLambertMaterial({ color: 0x1f262e });
    var plinthMesh = new THREE.InstancedMesh(plinthGeo, plinthMat, plinths.length);
    plinthMesh.receiveShadow = true;
    for (var p = 0; p < plinths.length; p++) {
      dummy.position.set(plinths[p].x, 0.09, plinths[p].z);
      dummy.scale.set(CFG.blockSize, 0.18, CFG.blockSize);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      plinthMesh.setMatrixAt(p, dummy.matrix);
    }
    plinthMesh.instanceMatrix.needsUpdate = true;
    scene.add(plinthMesh);

    // buildings
    var bGeo = new THREE.BoxGeometry(1, 1, 1);
    var bMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    var bMesh = new THREE.InstancedMesh(bGeo, bMat, buildings.length);
    bMesh.castShadow = true;
    bMesh.receiveShadow = true;
    for (var i = 0; i < buildings.length; i++) {
      var b = buildings[i];
      dummy.position.set(b.x, b.h / 2 + 0.18, b.z);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      bMesh.setMatrixAt(i, dummy.matrix);
      bMesh.setColorAt(i, b.color);
      addStaticBox(b.x, b.h / 2 + 0.18, b.z, b.w, b.h, b.d);
    }
    bMesh.instanceMatrix.needsUpdate = true;
    if (bMesh.instanceColor) { bMesh.instanceColor.needsUpdate = true; }
    scene.add(bMesh);

    // rooftop antennas
    if (antennas.length) {
      var aGeo = new THREE.BoxGeometry(0.22, 1, 0.22);
      var aMat = new THREE.MeshLambertMaterial({ color: 0x6d7a86 });
      var aMesh = new THREE.InstancedMesh(aGeo, aMat, antennas.length);
      for (var a = 0; a < antennas.length; a++) {
        dummy.position.set(antennas[a].x, antennas[a].y, antennas[a].z);
        dummy.scale.set(1, antennas[a].h, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        aMesh.setMatrixAt(a, dummy.matrix);
      }
      aMesh.instanceMatrix.needsUpdate = true;
      scene.add(aMesh);
    }

    // parks — green plinth plus a few trees
    if (parks.length) {
      var parkGeo = new THREE.BoxGeometry(1, 1, 1);
      var parkMat = new THREE.MeshLambertMaterial({ color: 0x1c3a26 });
      var parkMesh = new THREE.InstancedMesh(parkGeo, parkMat, parks.length);
      parkMesh.receiveShadow = true;
      for (var k = 0; k < parks.length; k++) {
        dummy.position.set(parks[k].x, 0.1, parks[k].z);
        dummy.scale.set(CFG.blockSize, 0.2, CFG.blockSize);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        parkMesh.setMatrixAt(k, dummy.matrix);
      }
      parkMesh.instanceMatrix.needsUpdate = true;
      scene.add(parkMesh);

      var rand = mulberry32(CFG.seed + 7);
      var trees = [];
      for (var t = 0; t < parks.length; t++) {
        for (var n = 0; n < 7; n++) {
          trees.push({
            x: parks[t].x + (rand() - 0.5) * (CFG.blockSize - 6),
            z: parks[t].z + (rand() - 0.5) * (CFG.blockSize - 6),
            s: 0.8 + rand() * 0.6
          });
        }
      }
      var trunkGeo = new THREE.CylinderGeometry(0.22, 0.28, 2.2, 6);
      var trunkMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1e });
      var trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
      trunkMesh.castShadow = true;
      var leafGeo = new THREE.IcosahedronGeometry(1.5, 0);
      var leafMat = new THREE.MeshLambertMaterial({ color: 0x2f6b3c });
      var leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, trees.length);
      leafMesh.castShadow = true;
      for (var m = 0; m < trees.length; m++) {
        var tr = trees[m];
        dummy.position.set(tr.x, 1.1 * tr.s + 0.2, tr.z);
        dummy.scale.set(tr.s, tr.s, tr.s);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        trunkMesh.setMatrixAt(m, dummy.matrix);

        dummy.position.set(tr.x, 3.0 * tr.s + 0.2, tr.z);
        dummy.scale.set(tr.s, tr.s * 1.15, tr.s);
        dummy.updateMatrix();
        leafMesh.setMatrixAt(m, dummy.matrix);
      }
      trunkMesh.instanceMatrix.needsUpdate = true;
      leafMesh.instanceMatrix.needsUpdate = true;
      scene.add(trunkMesh);
      scene.add(leafMesh);
    }

    // dashed lane markings along every road
    var dashes = [];
    var roadLines = [];
    for (var r = 0; r <= CFG.blocks; r++) {
      roadLines.push((r - CFG.blocks / 2) * PITCH);
    }
    var step = 9;
    for (var li = 0; li < roadLines.length; li++) {
      var line = roadLines[li];
      for (var off = -1; off <= 1; off += 2) {
        var lateral = off * (CFG.roadWidth * 0.25);
        for (var s = -HALF; s <= HALF; s += step) {
          dashes.push({ x: line + lateral, z: s, rot: 0 });
          dashes.push({ x: s, z: line + lateral, rot: Math.PI / 2 });
        }
      }
    }
    var dGeo = new THREE.BoxGeometry(0.32, 0.06, 3.4);
    var dMat = new THREE.MeshLambertMaterial({ color: 0x8f9aa6 });
    var dMesh = new THREE.InstancedMesh(dGeo, dMat, dashes.length);
    for (var q = 0; q < dashes.length; q++) {
      dummy.position.set(dashes[q].x, 0.03, dashes[q].z);
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, dashes[q].rot, 0);
      dummy.updateMatrix();
      dMesh.setMatrixAt(q, dummy.matrix);
    }
    dMesh.instanceMatrix.needsUpdate = true;
    scene.add(dMesh);
  }

  // ------------------------------------------------------------- player model
  var playerGroup = new THREE.Group();
  var leftLeg, rightLeg, leftArm, rightArm;

  function buildPlayerModel() {
    var bodyMat = new THREE.MeshLambertMaterial({ color: 0x00e5ff });
    var darkMat = new THREE.MeshLambertMaterial({ color: 0x0f6b7a });
    var headMat = new THREE.MeshLambertMaterial({ color: 0xe8f6ff });

    var torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.62, 4, 10), bodyMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    playerGroup.add(torso);

    var head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 14, 12), headMat);
    head.position.y = 1.66;
    head.castShadow = true;
    playerGroup.add(head);

    function limb(x, y, len, mat) {
      var pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      var m = new THREE.Mesh(new THREE.BoxGeometry(0.17, len, 0.17), mat);
      m.position.y = -len / 2;
      m.castShadow = true;
      pivot.add(m);
      playerGroup.add(pivot);
      return pivot;
    }

    leftLeg = limb(-0.14, 0.72, 0.7, darkMat);
    rightLeg = limb(0.14, 0.72, 0.7, darkMat);
    leftArm = limb(-0.38, 1.32, 0.6, bodyMat);
    rightArm = limb(0.38, 1.32, 0.6, bodyMat);

    scene.add(playerGroup);
  }

  // ------------------------------------------------------------- state
  var mode = 'walk';
  var camYaw = 0;
  var camPitch = CFG.camPitch;
  var dronePitch = CFG.dronePitch;
  var dronePos = new THREE.Vector3(0, 60, 0);
  var walkPhase = 0;
  var facing = 0;
  var jumpQueued = false;

  var input = { x: 0, y: 0, up: false, down: false, sprint: false };

  // ------------------------------------------------------------- controls
  var stickEl = document.getElementById('stick');
  var knobEl = document.getElementById('knob');
  var stickPointer = null;
  var lookPointer = null;
  var lookLastX = 0;
  var lookLastY = 0;
  var STICK_MAX = 46;

  function setKnob(dx, dy) {
    knobEl.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  }

  stickEl.addEventListener('pointerdown', function (e) {
    if (stickPointer !== null) { return; }
    stickPointer = e.pointerId;
    stickEl.setPointerCapture(e.pointerId);
    handleStick(e);
    e.preventDefault();
  });

  stickEl.addEventListener('pointermove', function (e) {
    if (e.pointerId !== stickPointer) { return; }
    handleStick(e);
    e.preventDefault();
  });

  function endStick(e) {
    if (e.pointerId !== stickPointer) { return; }
    stickPointer = null;
    input.x = 0;
    input.y = 0;
    setKnob(0, 0);
  }
  stickEl.addEventListener('pointerup', endStick);
  stickEl.addEventListener('pointercancel', endStick);

  function handleStick(e) {
    var r = stickEl.getBoundingClientRect();
    var dx = e.clientX - (r.left + r.width / 2);
    var dy = e.clientY - (r.top + r.height / 2);
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > STICK_MAX) {
      dx = dx / len * STICK_MAX;
      dy = dy / len * STICK_MAX;
      len = STICK_MAX;
    }
    setKnob(dx, dy);
    var nx = dx / STICK_MAX;
    var ny = dy / STICK_MAX;
    var mag = Math.min(1, Math.sqrt(nx * nx + ny * ny));
    if (mag < 0.16) { nx = 0; ny = 0; mag = 0; }
    input.x = nx;
    input.y = -ny;      // screen up = forward
  }

  // look / drag anywhere on the scene
  document.addEventListener('pointerdown', function (e) {
    if (e.target.closest && e.target.closest('.ui')) { return; }
    if (lookPointer !== null) { return; }
    lookPointer = e.pointerId;
    lookLastX = e.clientX;
    lookLastY = e.clientY;
  });

  document.addEventListener('pointermove', function (e) {
    if (e.pointerId !== lookPointer) { return; }
    var dx = e.clientX - lookLastX;
    var dy = e.clientY - lookLastY;
    lookLastX = e.clientX;
    lookLastY = e.clientY;

    camYaw += dx * 0.0045;
    if (mode === 'walk') {
      camPitch = clamp(camPitch + dy * 0.0035, 0.02, 1.15);
    } else {
      dronePitch = clamp(dronePitch - dy * 0.0035, -1.35, 0.55);
    }
  });

  function endLook(e) {
    if (e.pointerId === lookPointer) { lookPointer = null; }
  }
  document.addEventListener('pointerup', endLook);
  document.addEventListener('pointercancel', endLook);

  // action buttons
  function bindHold(id, key) {
    var el = document.getElementById(id);
    el.addEventListener('pointerdown', function (e) {
      input[key] = true;
      e.preventDefault();
      e.stopPropagation();
    });
    function off(e) {
      input[key] = false;
      e.preventDefault();
      e.stopPropagation();
    }
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('pointerleave', off);
  }

  bindHold('btnUp', 'up');
  bindHold('btnDown', 'down');

  var jumpBtn = document.getElementById('btnJump');
  jumpBtn.addEventListener('pointerdown', function (e) {
    jumpQueued = true;
    e.preventDefault();
    e.stopPropagation();
  });

  // ------------------------------------------------------------- modes
  function setMode(next) {
    next = (next === 'drone') ? 'drone' : 'walk';
    if (next === mode) { return; }
    mode = next;
    if (mode === 'drone') {
      dronePos.set(
        playerBody.position.x,
        playerBody.position.y + 34,
        playerBody.position.z + 26
      );
      dronePitch = CFG.dronePitch;
      document.body.classList.add('drone-mode');
    } else {
      camPitch = CFG.camPitch;
      document.body.classList.remove('drone-mode');
    }
    post({ type: 'mode', mode: mode });
  }

  function toggleMode() { setMode(mode === 'walk' ? 'drone' : 'walk'); }

  function reset() {
    playerBody.position.set(SPAWN.x, SPAWN.y, SPAWN.z);
    playerBody.velocity.set(0, 0, 0);
    camYaw = 0;
    camPitch = CFG.camPitch;
    dronePos.set(SPAWN.x, 60, SPAWN.z + 30);
    dronePitch = CFG.dronePitch;
    if (mode === 'drone') { setMode('walk'); }
  }

  window.KN = {
    setMode: setMode,
    toggleMode: toggleMode,
    reset: reset
  };

  // ------------------------------------------------------------- update
  var tmpFwd = new THREE.Vector3();
  var tmpRight = new THREE.Vector3();

  function shortestAngle(from, to) {
    var diff = (to - from) % (Math.PI * 2);
    if (diff > Math.PI) { diff -= Math.PI * 2; }
    if (diff < -Math.PI) { diff += Math.PI * 2; }
    return diff;
  }

  function updateWalk(dt) {
    tmpFwd.set(Math.sin(camYaw), 0, Math.cos(camYaw));
    tmpRight.set(Math.cos(camYaw), 0, -Math.sin(camYaw));

    var wx = tmpRight.x * input.x + tmpFwd.x * input.y;
    var wz = tmpRight.z * input.x + tmpFwd.z * input.y;
    var len = Math.sqrt(wx * wx + wz * wz);

    if (len > 0.01) {
      var speed = CFG.walkSpeed * Math.min(len, 1);
      playerBody.velocity.x = wx / len * speed;
      playerBody.velocity.z = wz / len * speed;
      facing += shortestAngle(facing, Math.atan2(wx, wz)) * Math.min(1, dt * 12);
    } else {
      playerBody.velocity.x *= Math.pow(0.001, dt);
      playerBody.velocity.z *= Math.pow(0.001, dt);
    }

    var grounded = playerBody.position.y <= PLAYER_R + 0.14;
    if (jumpQueued && grounded) {
      playerBody.velocity.y = CFG.jumpSpeed;
    }
    jumpQueued = false;

    // model follows the physics body, feet on the ground
    playerGroup.position.set(
      playerBody.position.x,
      playerBody.position.y - PLAYER_R,
      playerBody.position.z
    );
    playerGroup.rotation.y = facing;

    var horiz = Math.sqrt(
      playerBody.velocity.x * playerBody.velocity.x +
      playerBody.velocity.z * playerBody.velocity.z
    );
    walkPhase += dt * (2.4 + horiz * 1.5);
    var swing = Math.min(horiz / CFG.walkSpeed, 1.3) * 0.55;
    leftLeg.rotation.x = Math.sin(walkPhase) * swing;
    rightLeg.rotation.x = -Math.sin(walkPhase) * swing;
    leftArm.rotation.x = -Math.sin(walkPhase) * swing * 0.8;
    rightArm.rotation.x = Math.sin(walkPhase) * swing * 0.8;

    // third-person camera behind the player
    var tx = playerBody.position.x;
    var ty = playerBody.position.y + 0.85;
    var tz = playerBody.position.z;
    var cosP = Math.cos(camPitch);
    var sinP = Math.sin(camPitch);
    var dx = tx - Math.sin(camYaw) * cosP * CFG.camDist;
    var dy = ty + sinP * CFG.camDist;
    var dz = tz - Math.cos(camYaw) * cosP * CFG.camDist;
    if (dy < 0.7) { dy = 0.7; }

    var k = 1 - Math.exp(-dt * 10);
    camera.position.x += (dx - camera.position.x) * k;
    camera.position.y += (dy - camera.position.y) * k;
    camera.position.z += (dz - camera.position.z) * k;
    camera.lookAt(tx, ty, tz);
  }

  function updateDrone(dt) {
    tmpFwd.set(Math.sin(camYaw), 0, Math.cos(camYaw));
    tmpRight.set(Math.cos(camYaw), 0, -Math.sin(camYaw));

    var sp = CFG.droneSpeed;
    dronePos.x += (tmpRight.x * input.x + tmpFwd.x * input.y) * sp * dt;
    dronePos.z += (tmpRight.z * input.x + tmpFwd.z * input.y) * sp * dt;
    if (input.up) { dronePos.y += sp * dt; }
    if (input.down) { dronePos.y -= sp * dt; }

    var lim = HALF * 1.35;
    dronePos.x = clamp(dronePos.x, -lim, lim);
    dronePos.z = clamp(dronePos.z, -lim, lim);
    dronePos.y = clamp(dronePos.y, CFG.droneMinY, CFG.droneMaxY);

    camera.position.copy(dronePos);
    var cp = Math.cos(dronePitch);
    camera.lookAt(
      dronePos.x + Math.sin(camYaw) * cp,
      dronePos.y + Math.sin(dronePitch),
      dronePos.z + Math.cos(camYaw) * cp
    );

    // the walker keeps standing where you left them
    playerGroup.position.set(
      playerBody.position.x,
      playerBody.position.y - PLAYER_R,
      playerBody.position.z
    );
    playerGroup.rotation.y = facing;
  }

  // ------------------------------------------------------------- loop
  var clock = new THREE.Clock();
  var readySent = false;
  var sunOffset = new THREE.Vector3(70, 140, 50);

  function resize() {
    var w = window.innerWidth || canvas.clientWidth || 800;
    var h = window.innerHeight || canvas.clientHeight || 450;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () {
    setTimeout(resize, 250);
  });

  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);

    world.step(1 / 60, dt, 3);

    if (mode === 'walk') {
      updateWalk(dt);
    } else {
      updateDrone(dt);
    }

    // keep the shadow frustum around the player
    sun.position.set(
      playerBody.position.x + sunOffset.x,
      sunOffset.y,
      playerBody.position.z + sunOffset.z
    );
    sun.target.position.set(playerBody.position.x, 0, playerBody.position.z);
    sun.target.updateMatrixWorld();

    sky.position.set(camera.position.x, 0, camera.position.z);

    renderer.render(scene, camera);

    if (!readySent) {
      readySent = true;
      var loading = document.getElementById('loading');
      if (loading) { loading.style.display = 'none'; }
      post({ type: 'ready' });
    }
  }

  // ------------------------------------------------------------- boot
  try {
    buildCityData();
    buildCityMeshes();
    buildPlayerModel();
    resize();
    animate();
    setTimeout(function () { post({ type: 'mode', mode: mode }); }, 60);
  } catch (err) {
    post({ type: 'error', message: String(err && err.message ? err.message : err) });
    var el = document.getElementById('loading');
    if (el) { el.textContent = 'ERROR: ' + err; }
  }
})();
