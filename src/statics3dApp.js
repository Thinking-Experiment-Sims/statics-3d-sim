/**
 * 3D Statics Lab Application Controller
 * Handles 3D Canvas Projection, Orbit Controls, Event Binding, and Workbench UI
 */

(function () {
  'use strict';

  class Statics3DApp {
    constructor() {
      // DOM Elements
      this.dom = {
        canvas: document.getElementById('apparatusCanvas'),
        btnModeIdeal: document.getElementById('btnModeIdeal'),
        btnModeReal: document.getElementById('btnModeReal'),
        chkRealLabMode: document.getElementById('chkRealLabMode'),
        modeDescText: document.getElementById('modeDescText'),

        // Scenario Tabs
        scenarioTabs: document.querySelectorAll('.scenario-tab'),
        bannerTitle: document.getElementById('bannerTitle'),
        bannerDesc: document.getElementById('bannerDesc'),

        // Controls
        sliderMass: document.getElementById('sliderMass'),
        valMass: document.getElementById('valMass'),
        massControlItem: document.getElementById('massControlItem'),
        sliderKnotX: document.getElementById('sliderKnotX'),
        valKnotX: document.getElementById('valKnotX'),
        sliderKnotZ: document.getElementById('sliderKnotZ'),
        valKnotZ: document.getElementById('valKnotZ'),
        valKnotY: document.getElementById('valKnotY'),
        btnCenterKnot: document.getElementById('btnCenterKnot'),

        // Camera buttons
        camBtns: document.querySelectorAll('.cam-btn'),

        // Toolbar toggles
        chkGrid: document.getElementById('chkGrid'),
        chkAxes: document.getElementById('chkAxes'),
        chkVectors: document.getElementById('chkVectors'),
        chkBadges: document.getElementById('chkBadges'),
        chkDrops: document.getElementById('chkDrops'),
        btnResetCam: document.getElementById('btnResetCam'),

        // Telemetry
        telemT1: document.getElementById('telemT1'),
        telemT2: document.getElementById('telemT2'),
        telemT3: document.getElementById('telemT3'),
        telemNetForce: document.getElementById('telemNetForce'),

        // Mystery Challenge
        mysteryBox: document.getElementById('mysteryBox'),
        studentMassInput: document.getElementById('studentMassInput'),
        btnCheckMystery: document.getElementById('btnCheckMystery'),
        mysteryFeedback: document.getElementById('mysteryFeedback'),

        // Table Elements
        wbTheta1: document.getElementById('wbTheta1'),
        wbTheta2: document.getElementById('wbTheta2'),
        wbTheta3: document.getElementById('wbTheta3'),
        wbForce1: document.getElementById('wbForce1'),
        wbForce2: document.getElementById('wbForce2'),
        wbForce3: document.getElementById('wbForce3'),
        btnSolveWorkbench: document.getElementById('btnSolveWorkbench'),
        workbenchResults: document.getElementById('workbenchResults'),

        // Trial History Log
        dataLogBody: document.getElementById('dataLogBody'),
        btnRecordTrial: document.getElementById('btnRecordTrial'),
        btnClearLog: document.getElementById('btnClearLog'),
        btnCopyLog: document.getElementById('btnCopyLog')
      };

      // Simulation State
      this.state = {
        activeScenario: 'lab', // 'lab' or 'mystery'
        isRealLabMode: false,
        massKg: 0.500,
        g: 9.80,

        // 3D Anchor positions on the tabletop (in cm)
        // Stand 1: Front-Left (Teal)
        // Stand 2: Front-Right (Amber)
        // Stand 3: Rear-Center (Emerald)
        anchors: {
          a1: { x: 22, y: 30, z: 12 },
          a2: { x: -22, y: 30, z: 12 },
          a3: { x: 0, y: 30, z: -24 }
        },

        // Knot position in 3D (in cm)
        knot: {
          x: 0,
          y: 12,
          z: 0
        },

        // Mystery Mass setup
        mysteryPresets: {
          A: 0.350,
          B: 0.550,
          C: 0.725,
          D: 0.900
        },
        currentMystery: 'A',

        // 3D Camera Orbit Configuration
        camera: {
          yaw: 35 * (Math.PI / 180),    // Horizontal orbit angle
          pitch: 28 * (Math.PI / 180),  // Elevation angle
          distance: 92,                 // Distance from target
          target: { x: 0, y: 15, z: 0 },
          fov: 520,                     // Focal length for perspective divide
          isDragging: false,
          lastMouseX: 0,
          lastMouseY: 0
        },

        // Toggles
        showGrid: true,
        showAxes: true,
        showVectors: true,
        showBadges: true,
        showDrops: true,

        // Settling Bobbing Animation
        bobbingOffset: 0
      };

      this.trials = [];
      this.settlingAnimationId = null;

      this.init();
    }

    init() {
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());

      this.bindEvents();
      this.updateEquilibrium();
      this.updateModeUI();
      this.render();
    }

    resizeCanvas() {
      if (!this.dom.canvas) return;
      const rect = this.dom.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.dom.canvas.width = Math.round(rect.width * dpr);
      this.dom.canvas.height = Math.round(rect.height * dpr);
      this.render();
    }

    // 3D Perspective Projection Engine
    project3D(point, w, h) {
      const cam = this.state.camera;

      // 1. Center relative to target
      const dx = point.x - cam.target.x;
      const dy = point.y - cam.target.y;
      const dz = point.z - cam.target.z;

      // 2. Rotate by yaw (around Y axis)
      const cosY = Math.cos(cam.yaw);
      const sinY = Math.sin(cam.yaw);
      const x1 = dx * cosY - dz * sinY;
      const z1 = dx * sinY + dz * cosY;

      // 3. Rotate by pitch (around X axis)
      const cosP = Math.cos(cam.pitch);
      const sinP = Math.sin(cam.pitch);
      const y2 = dy * cosP - z1 * sinP;
      const z2 = dy * sinP + z1 * cosP;

      // 4. Translate along camera distance
      const zCam = z2 + cam.distance;
      if (zCam <= 1) return null; // Behind camera clipping

      // 5. Perspective projection
      const scale = cam.fov / zCam;
      const screenX = w / 2 + x1 * scale;
      const screenY = h / 2 - y2 * scale; // Invert Y for standard 2D canvas

      return {
        x: screenX,
        y: screenY,
        scale,
        depth: zCam
      };
    }

    getActiveMassKg() {
      if (this.state.activeScenario === 'mystery') {
        return this.state.mysteryPresets[this.state.currentMystery] || 0.500;
      }
      return this.state.massKg;
    }

    updateEquilibrium() {
      const massKg = this.getActiveMassKg();
      const knotPos = {
        x: this.state.knot.x,
        y: this.state.knot.y + this.state.bobbingOffset,
        z: this.state.knot.z
      };

      this.equilibrium = Statics3DPhysics.calculateEquilibrium(
        knotPos,
        this.state.anchors.a1,
        this.state.anchors.a2,
        this.state.anchors.a3,
        massKg,
        this.state.g,
        this.state.isRealLabMode
      );

      this.updateTelemetry();
    }

    updateTelemetry() {
      const eq = this.equilibrium;
      if (!eq) return;

      const isMystery = this.state.activeScenario === 'mystery';

      if (isMystery) {
        if (this.dom.telemT1) this.dom.telemT1.innerHTML = `<span style="color: var(--accent-amber-dark);">🔍 Read Scale</span>`;
        if (this.dom.telemT2) this.dom.telemT2.innerHTML = `<span style="color: var(--accent-amber-dark);">🔍 Read Scale</span>`;
        if (this.dom.telemT3) this.dom.telemT3.innerHTML = `<span style="color: var(--accent-amber-dark);">🔍 Read Scale</span>`;
      } else if (this.state.isRealLabMode) {
        if (this.dom.telemT1) this.dom.telemT1.innerHTML = `<span style="color: var(--accent-amber-dark);">~${eq.readTensions.t1.toFixed(1)} N</span>`;
        if (this.dom.telemT2) this.dom.telemT2.innerHTML = `<span style="color: var(--accent-amber-dark);">~${eq.readTensions.t2.toFixed(1)} N</span>`;
        if (this.dom.telemT3) this.dom.telemT3.innerHTML = `<span style="color: var(--accent-amber-dark);">~${eq.readTensions.t3.toFixed(1)} N</span>`;
      } else {
        if (this.dom.telemT1) this.dom.telemT1.textContent = `${eq.tensions.t1.toFixed(2)} N`;
        if (this.dom.telemT2) this.dom.telemT2.textContent = `${eq.tensions.t2.toFixed(2)} N`;
        if (this.dom.telemT3) this.dom.telemT3.textContent = `${eq.tensions.t3.toFixed(2)} N`;
      }

      if (this.dom.telemNetForce) {
        if (eq.isStable) {
          this.dom.telemNetForce.innerHTML = '<span style="color: var(--success);">⚖️ &Sigma;F = &lang;0, 0, 0&rang;</span>';
        } else {
          this.dom.telemNetForce.innerHTML = '<span style="color: var(--error);">⚠️ Unbalanced (Outside)</span>';
        }
      }

      // Readouts
      if (this.dom.valMass) {
        this.dom.valMass.textContent = isMystery ? '??? g (Hidden)' : `${Math.round(this.state.massKg * 1000)} g`;
      }
      if (this.dom.valKnotX) this.dom.valKnotX.textContent = `${this.state.knot.x.toFixed(1)} cm`;
      if (this.dom.valKnotZ) this.dom.valKnotZ.textContent = `${this.state.knot.z.toFixed(1)} cm`;
      if (this.dom.valKnotY) this.dom.valKnotY.textContent = `${this.state.knot.y.toFixed(1)} cm`;
    }

    triggerEquilibriumSettling(initialAmp = 3) {
      if (this.settlingAnimationId) {
        cancelAnimationFrame(this.settlingAnimationId);
        this.settlingAnimationId = null;
      }

      const startTime = performance.now();
      const durationMs = 500;
      const omega = 18;
      const gamma = 6;

      const step = (now) => {
        const t = (now - startTime) / 1000;
        if (t >= durationMs / 1000) {
          this.state.bobbingOffset = 0;
          this.updateEquilibrium();
          this.render();
          this.settlingAnimationId = null;
          return;
        }

        this.state.bobbingOffset = initialAmp * Math.exp(-gamma * t) * Math.cos(omega * t);
        this.updateEquilibrium();
        this.render();
        this.settlingAnimationId = requestAnimationFrame(step);
      };

      this.settlingAnimationId = requestAnimationFrame(step);
    }

    updateModeUI() {
      const isReal = this.state.isRealLabMode;
      if (this.dom.btnModeIdeal) this.dom.btnModeIdeal.classList.toggle('active', !isReal);
      if (this.dom.btnModeReal) this.dom.btnModeReal.classList.toggle('active', isReal);
      if (this.dom.chkRealLabMode) this.dom.chkRealLabMode.checked = isReal;

      if (this.dom.modeDescText) {
        if (isReal) {
          this.dom.modeDescText.innerHTML = `
            <strong>Real Lab Mode (Active):</strong> Internal scale springs stretch under load (ΔL = T/k). Tensions have realistic reading precision; experimental error shows &Sigma;F &approx; 0 N!
          `;
        } else {
          this.dom.modeDescText.innerHTML = `
            <strong>Ideal Scenario:</strong> Inextensible cables and exact mathematical resolution (&Sigma;F<sub>x</sub> = 0, &Sigma;F<sub>y</sub> = 0, &Sigma;F<sub>z</sub> = 0).
          `;
        }
      }
    }

    setScenario(scenarioId) {
      this.state.activeScenario = scenarioId;

      if (scenarioId === 'mystery') {
        if (this.dom.bannerTitle) this.dom.bannerTitle.textContent = '2. Mystery Mass Challenge (3D):';
        if (this.dom.bannerDesc) this.dom.bannerDesc.textContent = 'The hanging mass is an unknown load. Inspect 3D cable directions and read the three spring scales directly to determine the mystery mass.';
        if (this.dom.mysteryBox) this.dom.mysteryBox.style.display = 'block';
        if (this.dom.massControlItem) this.dom.massControlItem.style.display = 'none';

        // Lock off badges
        if (this.dom.chkBadges) {
          this.dom.chkBadges.checked = false;
          this.dom.chkBadges.disabled = true;
        }
        this.state.showBadges = false;
      } else {
        // 'lab' mode
        if (this.dom.bannerTitle) this.dom.bannerTitle.textContent = '1. 3D Statics Lab & Exploration:';
        if (this.dom.bannerDesc) this.dom.bannerDesc.textContent = 'Freely adjust mass and position the knot in 3D. Orbit around the rig to inspect the 3 cables and solve the 3x3 force system in the table.';
        if (this.dom.mysteryBox) this.dom.mysteryBox.style.display = 'none';
        if (this.dom.massControlItem) this.dom.massControlItem.style.display = 'flex';

        if (this.dom.chkBadges) {
          this.dom.chkBadges.disabled = false;
          this.dom.chkBadges.checked = true;
        }
        this.state.showBadges = true;
      }

      this.updateEquilibrium();
      this.render();
    }

    setCameraPreset(preset) {
      this.dom.camBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.cam === preset);
      });

      if (preset === 'orbit') {
        this.state.camera.yaw = 35 * (Math.PI / 180);
        this.state.camera.pitch = 28 * (Math.PI / 180);
      } else if (preset === 'top') {
        this.state.camera.yaw = 0;
        this.state.camera.pitch = 85 * (Math.PI / 180);
      } else if (preset === 'front') {
        this.state.camera.yaw = 0;
        this.state.camera.pitch = 8 * (Math.PI / 180);
      } else if (preset === 'side') {
        this.state.camera.yaw = 90 * (Math.PI / 180);
        this.state.camera.pitch = 8 * (Math.PI / 180);
      }

      this.render();
    }

    bindEvents() {
      // Segmented Mode Buttons
      if (this.dom.btnModeIdeal) {
        this.dom.btnModeIdeal.addEventListener('click', () => {
          this.state.isRealLabMode = false;
          this.updateModeUI();
          this.updateEquilibrium();
          this.render();
        });
      }

      if (this.dom.btnModeReal) {
        this.dom.btnModeReal.addEventListener('click', () => {
          this.state.isRealLabMode = true;
          this.updateModeUI();
          this.updateEquilibrium();
          this.render();
        });
      }

      // Scenario Navigation
      this.dom.scenarioTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          this.dom.scenarioTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this.setScenario(tab.dataset.scenario);
        });
      });

      // Mass Slider
      if (this.dom.sliderMass) {
        this.dom.sliderMass.addEventListener('input', (e) => {
          this.state.massKg = parseFloat(e.target.value) / 1000;
          this.updateMassPresetChips();
          this.updateEquilibrium();
          this.render();
        });
        this.dom.sliderMass.addEventListener('change', () => this.triggerEquilibriumSettling(4));
      }

      // Mass Presets
      document.querySelectorAll('.preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const massG = parseFloat(chip.dataset.mass);
          if (isNaN(massG)) return;
          this.state.massKg = massG / 1000;
          if (this.dom.sliderMass) this.dom.sliderMass.value = massG;
          this.updateMassPresetChips();
          this.updateEquilibrium();
          this.triggerEquilibriumSettling(5);
          this.render();
        });
      });

      // Knot Position Sliders
      if (this.dom.sliderKnotX) {
        this.dom.sliderKnotX.addEventListener('input', (e) => {
          this.state.knot.x = parseFloat(e.target.value);
          this.updateEquilibrium();
          this.render();
        });
        this.dom.sliderKnotX.addEventListener('change', () => this.triggerEquilibriumSettling(3));
      }

      if (this.dom.sliderKnotZ) {
        this.dom.sliderKnotZ.addEventListener('input', (e) => {
          this.state.knot.z = parseFloat(e.target.value);
          this.updateEquilibrium();
          this.render();
        });
        this.dom.sliderKnotZ.addEventListener('change', () => this.triggerEquilibriumSettling(3));
      }

      // Center Knot Button
      if (this.dom.btnCenterKnot) {
        this.dom.btnCenterKnot.addEventListener('click', () => {
          this.state.knot.x = 0;
          this.state.knot.z = 0;
          if (this.dom.sliderKnotX) this.dom.sliderKnotX.value = 0;
          if (this.dom.sliderKnotZ) this.dom.sliderKnotZ.value = 0;
          this.updateEquilibrium();
          this.triggerEquilibriumSettling(5);
          this.render();
        });
      }

      // Camera Presets
      this.dom.camBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          this.setCameraPreset(btn.dataset.cam);
        });
      });

      // Toolbar Toggles
      if (this.dom.chkGrid) {
        this.dom.chkGrid.addEventListener('change', (e) => {
          this.state.showGrid = e.target.checked;
          this.render();
        });
      }
      if (this.dom.chkAxes) {
        this.dom.chkAxes.addEventListener('change', (e) => {
          this.state.showAxes = e.target.checked;
          this.render();
        });
      }
      if (this.dom.chkVectors) {
        this.dom.chkVectors.addEventListener('change', (e) => {
          this.state.showVectors = e.target.checked;
          this.render();
        });
      }
      if (this.dom.chkBadges) {
        this.dom.chkBadges.addEventListener('change', (e) => {
          this.state.showBadges = e.target.checked;
          this.render();
        });
      }
      if (this.dom.chkDrops) {
        this.dom.chkDrops.addEventListener('change', (e) => {
          this.state.showDrops = e.target.checked;
          this.render();
        });
      }
      if (this.dom.btnResetCam) {
        this.dom.btnResetCam.addEventListener('click', () => {
          this.setCameraPreset('orbit');
        });
      }

      // Canvas Mouse / Touch 3D Orbit Interaction
      this.bind3DOrbitControls();

      // Mystery Chips
      document.querySelectorAll('.mystery-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          document.querySelectorAll('.mystery-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          this.state.currentMystery = chip.dataset.mystery;
          if (this.dom.mysteryFeedback) this.dom.mysteryFeedback.className = 'feedback-box';
          this.updateEquilibrium();
          this.triggerEquilibriumSettling(5);
          this.render();
        });
      });

      if (this.dom.btnCheckMystery) {
        this.dom.btnCheckMystery.addEventListener('click', () => this.handleCheckMystery());
      }

      // Workbench Solve Button
      if (this.dom.btnSolveWorkbench) {
        this.dom.btnSolveWorkbench.addEventListener('click', () => this.solve3DForceTable());
      }

      // Data Logger
      if (this.dom.btnRecordTrial) {
        this.dom.btnRecordTrial.addEventListener('click', () => this.recordTrial());
      }
      if (this.dom.btnClearLog) {
        this.dom.btnClearLog.addEventListener('click', () => {
          this.trials = [];
          this.updateDataLogTable();
        });
      }
      if (this.dom.btnCopyLog) {
        this.dom.btnCopyLog.addEventListener('click', () => this.copyDataLog());
      }

      // Analysis Tab Switcher
      document.querySelectorAll('.analysis-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.analysis-tab-btn').forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.analysis-tab-pane').forEach(p => p.classList.remove('active'));
          btn.classList.add('active');
          const pane = document.getElementById(btn.dataset.tab);
          if (pane) pane.classList.add('active');
        });
      });
    }

    bind3DOrbitControls() {
      const canvas = this.dom.canvas;
      if (!canvas) return;

      const onPointerDown = (clientX, clientY) => {
        this.state.camera.isDragging = true;
        this.state.camera.lastMouseX = clientX;
        this.state.camera.lastMouseY = clientY;
      };

      const onPointerMove = (clientX, clientY) => {
        if (!this.state.camera.isDragging) return;

        const deltaX = clientX - this.state.camera.lastMouseX;
        const deltaY = clientY - this.state.camera.lastMouseY;

        this.state.camera.lastMouseX = clientX;
        this.state.camera.lastMouseY = clientY;

        // Rotate orbit angles (sensitivity = 0.007 rad/px)
        this.state.camera.yaw -= deltaX * 0.007;
        this.state.camera.pitch += deltaY * 0.007;

        // Clamp elevation to avoid gimbal flips
        const minPitch = 4 * (Math.PI / 180);
        const maxPitch = 86 * (Math.PI / 180);
        this.state.camera.pitch = Math.max(minPitch, Math.min(maxPitch, this.state.camera.pitch));

        this.dom.camBtns.forEach(btn => btn.classList.remove('active'));
        this.render();
      };

      const onPointerUp = () => {
        this.state.camera.isDragging = false;
      };

      // Mouse events
      canvas.addEventListener('mousedown', (e) => onPointerDown(e.clientX, e.clientY));
      window.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
      window.addEventListener('mouseup', onPointerUp);

      // Touch events
      canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: true });

      window.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
          onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: true });

      window.addEventListener('touchend', onPointerUp);

      // Wheel Zoom
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomDelta = e.deltaY * 0.06;
        this.state.camera.distance = Math.max(45, Math.min(150, this.state.camera.distance + zoomDelta));
        this.render();
      }, { passive: false });
    }

    updateMassPresetChips() {
      const currentG = Math.round(this.state.massKg * 1000);
      document.querySelectorAll('.preset-chip').forEach(chip => {
        chip.classList.toggle('active', parseInt(chip.dataset.mass) === currentG);
      });
    }

    handleCheckMystery() {
      if (!this.dom.studentMassInput || !this.dom.mysteryFeedback) return;
      const studentG = parseFloat(this.dom.studentMassInput.value);

      if (isNaN(studentG) || studentG <= 0) {
        this.dom.mysteryFeedback.className = 'feedback-box show incorrect';
        this.dom.mysteryFeedback.textContent = 'Please enter a valid positive number for mass in grams.';
        return;
      }

      const actualG = (this.state.mysteryPresets[this.state.currentMystery] || 0.500) * 1000;
      const err = Statics3DPhysics.evaluateError(studentG, actualG);

      if (err.isAcceptable) {
        this.dom.mysteryFeedback.className = 'feedback-box show correct';
        this.dom.mysteryFeedback.innerHTML = `
          <strong>🎉 Outstanding Precision!</strong> Your calculated mass is <strong>${studentG.toFixed(1)} g</strong> 
          (Actual: ${actualG.toFixed(1)} g, Error: ${err.percentError.toFixed(2)}%). 3D static equilibrium verified!
        `;
      } else {
        this.dom.mysteryFeedback.className = 'feedback-box show incorrect';
        this.dom.mysteryFeedback.innerHTML = `
          <strong>⚠️ Recalculate:</strong> Your guess of ${studentG.toFixed(1)} g has a ${err.percentError.toFixed(1)}% discrepancy. 
          Double-check your vertical unit vector components (u<sub>1y</sub>, u<sub>2y</sub>, u<sub>3y</sub>) and scale force readings.
        `;
      }
    }

    solve3DForceTable() {
      const eq = this.equilibrium;
      if (!eq) return;

      // Populate Table components
      const setCell = (id, val, suffix = ' N') => {
        const el = document.getElementById(id);
        if (el) el.textContent = `${val >= 0 ? '+' : ''}${val.toFixed(2)}${suffix}`;
      };

      setCell('tblT1x', eq.components.t1x);
      setCell('tblT1y', eq.components.t1y);
      setCell('tblT1z', eq.components.t1z);

      setCell('tblT2x', eq.components.t2x);
      setCell('tblT2y', eq.components.t2y);
      setCell('tblT2z', eq.components.t2z);

      setCell('tblT3x', eq.components.t3x);
      setCell('tblT3y', eq.components.t3y);
      setCell('tblT3z', eq.components.t3z);

      setCell('tblFgy', -eq.Fg);

      // Net Force sums
      const sumElX = document.getElementById('tblSumFx');
      const sumElY = document.getElementById('tblSumFy');
      const sumElZ = document.getElementById('tblSumFz');

      if (sumElX) sumElX.textContent = `${eq.netForce.sumFx.toFixed(2)} N`;
      if (sumElY) sumElY.textContent = `${eq.netForce.sumFy.toFixed(2)} N`;
      if (sumElZ) sumElZ.textContent = `${eq.netForce.sumFz.toFixed(2)} N`;

      // Direction Angles Tab population
      const setAngle = (id, deg) => {
        const el = document.getElementById(id);
        if (el) el.textContent = `${deg.toFixed(1)}°`;
      };
      setAngle('angA1_alpha', eq.angles.angles1.alphaDeg);
      setAngle('angA1_beta', eq.angles.angles1.betaDeg);
      setAngle('angA1_gamma', eq.angles.angles1.gammaDeg);

      setAngle('angA2_alpha', eq.angles.angles2.alphaDeg);
      setAngle('angA2_beta', eq.angles.angles2.betaDeg);
      setAngle('angA2_gamma', eq.angles.angles2.gammaDeg);

      setAngle('angA3_alpha', eq.angles.angles3.alphaDeg);
      setAngle('angA3_beta', eq.angles.angles3.betaDeg);
      setAngle('angA3_gamma', eq.angles.angles3.gammaDeg);

      // Reconstructed Mass
      const recon = Statics3DPhysics.reconstructMass(
        eq.tensions.t1, eq.unitVectors.u1.y,
        eq.tensions.t2, eq.unitVectors.u2.y,
        eq.tensions.t3, eq.unitVectors.u3.y,
        eq.g
      );
      const actualG = eq.massKg * 1000;
      const err = Statics3DPhysics.evaluateError(recon.calcMassG, actualG);

      if (this.dom.workbenchResults) {
        this.dom.workbenchResults.innerHTML = `
          <div style="background: var(--surface); border: 1.5px solid var(--primary-teal); border-radius: 6px; padding: 0.6rem 0.8rem; margin-top: 0.6rem;">
            <div style="font-weight: 800; color: var(--primary-teal-dark); font-size: 0.86rem; margin-bottom: 0.2rem;">
              ✅ 3D Equilibrium Solution Summary
            </div>
            <div style="font-size: 0.78rem; color: var(--ink);">
              Vertical Equilibrium: &Sigma;F<sub>y</sub> = (${eq.components.t1y.toFixed(2)} + ${eq.components.t2y.toFixed(2)} + ${eq.components.t3y.toFixed(2)}) N = <strong>${eq.Fg.toFixed(2)} N</strong><br>
              Reconstructed Mass: <code>m = &Sigma;F<sub>y</sub> / g</code> = <strong>${recon.calcMassG.toFixed(1)} g</strong> (Actual: ${actualG.toFixed(1)} g, Error: ${err.percentError.toFixed(2)}%)
            </div>
          </div>
        `;
      }
    }

    recordTrial() {
      const eq = this.equilibrium;
      if (!eq) return;

      const trial = {
        id: this.trials.length + 1,
        massG: Math.round(eq.massKg * 1000),
        knotX: this.state.knot.x.toFixed(1),
        knotY: this.state.knot.y.toFixed(1),
        knotZ: this.state.knot.z.toFixed(1),
        t1: eq.tensions.t1.toFixed(2),
        t2: eq.tensions.t2.toFixed(2),
        t3: eq.tensions.t3.toFixed(2),
        sumFx: eq.netForce.sumFx.toFixed(2),
        sumFy: eq.netForce.sumFy.toFixed(2),
        sumFz: eq.netForce.sumFz.toFixed(2)
      };

      this.trials.push(trial);
      this.updateDataLogTable();
    }

    updateDataLogTable() {
      if (!this.dom.dataLogBody) return;
      if (this.trials.length === 0) {
        this.dom.dataLogBody.innerHTML = `
          <tr>
            <td colspan="10" style="text-align: center; color: var(--muted); padding: 0.8rem;">
              No recorded trials yet. Click <strong>📝 Record Trial</strong> to log 3D statics configurations.
            </td>
          </tr>
        `;
        return;
      }

      this.dom.dataLogBody.innerHTML = this.trials.map(tr => `
        <tr>
          <td><strong>#${tr.id}</strong></td>
          <td>${tr.massG} g</td>
          <td>(${tr.knotX}, ${tr.knotY}, ${tr.knotZ})</td>
          <td style="color: var(--primary-teal); font-weight: 700;">${tr.t1} N</td>
          <td style="color: var(--accent-amber); font-weight: 700;">${tr.t2} N</td>
          <td style="color: #1b8a5a; font-weight: 700;">${tr.t3} N</td>
          <td>${tr.sumFx}</td>
          <td>${tr.sumFy}</td>
          <td>${tr.sumFz}</td>
        </tr>
      `).join('');
    }

    copyDataLog() {
      if (this.trials.length === 0) {
        alert('Data log is empty. Record some trials first!');
        return;
      }
      const headers = ['Trial', 'Mass (g)', 'Knot (X,Y,Z cm)', 'T1 (N)', 'T2 (N)', 'T3 (N)', 'Sum Fx (N)', 'Sum Fy (N)', 'Sum Fz (N)'];
      const rows = this.trials.map(t => [
        t.id, t.massG, `(${t.knotX}, ${t.knotY}, ${t.knotZ})`,
        t.t1, t.t2, t.t3, t.sumFx, t.sumFy, t.sumFz
      ]);
      const text = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
      navigator.clipboard.writeText(text).then(() => {
        alert('3D trial data copied to clipboard! Paste into Google Sheets or Excel.');
      });
    }

    // =========================================================================
    // 3D Rendering Pipeline (Depth Sorted Canvas)
    // =========================================================================
    render() {
      const canvas = this.dom.canvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Render Queue with Depth Sorting (Painter's Algorithm)
      const renderQueue = [];

      // 1. Tabletop Floor Grid in (X, Z) plane
      if (this.state.showGrid) {
        renderQueue.push({
          depth: 1000,
          draw: () => this.drawTabletopGrid(ctx, w, h)
        });
      }

      // 2. Coordinate Axes
      if (this.state.showAxes) {
        renderQueue.push({
          depth: 900,
          draw: () => this.drawWorldAxes(ctx, w, h)
        });
      }

      // 3. Ring Stands
      const stands = [
        { anchor: this.state.anchors.a1, id: 1, color: '#0f7e9b' },
        { anchor: this.state.anchors.a2, id: 2, color: '#d67b19' },
        { anchor: this.state.anchors.a3, id: 3, color: '#1b8a5a' }
      ];

      stands.forEach(st => {
        const pBase = this.project3D({ x: st.anchor.x, y: 0, z: st.anchor.z }, w, h);
        const pClamp = this.project3D(st.anchor, w, h);
        if (pBase && pClamp) {
          renderQueue.push({
            depth: pBase.depth,
            draw: () => this.drawRingStand(ctx, pBase, pClamp, st.id, st.color)
          });
        }
      });

      // 4. Cables, Spring Scales, & Knot
      const eq = this.equilibrium;
      if (eq) {
        const pKnot = this.project3D(eq.knot, w, h);

        if (pKnot) {
          // Component drops to floor
          if (this.state.showDrops) {
            const pFloor = this.project3D({ x: eq.knot.x, y: 0, z: eq.knot.z }, w, h);
            if (pFloor) {
              renderQueue.push({
                depth: pFloor.depth + 10,
                draw: () => {
                  ctx.save();
                  ctx.strokeStyle = 'rgba(15, 126, 155, 0.4)';
                  ctx.setLineDash([4, 4]);
                  ctx.lineWidth = 1.5;
                  ctx.beginPath();
                  ctx.moveTo(pKnot.x, pKnot.y);
                  ctx.lineTo(pFloor.x, pFloor.y);
                  ctx.stroke();

                  // Footprint ring
                  ctx.fillStyle = 'rgba(15, 126, 155, 0.15)';
                  ctx.beginPath();
                  ctx.ellipse(pFloor.x, pFloor.y, 8, 4, 0, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.restore();
                }
              });
            }
          }

          // Cables & Spring Scales
          const cableConfigs = [
            { a: eq.anchors.a1, t: eq.tensions.t1, readT: eq.readTensions.t1, color: '#0f7e9b', name: 'T₁' },
            { a: eq.anchors.a2, t: eq.tensions.t2, readT: eq.readTensions.t2, color: '#d67b19', name: 'T₂' },
            { a: eq.anchors.a3, t: eq.tensions.t3, readT: eq.readTensions.t3, color: '#1b8a5a', name: 'T₃' }
          ];

          cableConfigs.forEach(cb => {
            const pClamp = this.project3D(cb.a, w, h);
            if (pClamp) {
              const midDepth = (pKnot.depth + pClamp.depth) / 2;
              renderQueue.push({
                depth: midDepth,
                draw: () => this.drawCableWithSpringScale(ctx, pKnot, pClamp, cb.t, cb.readT, cb.color, cb.name)
              });
            }
          });

          // 3D Force Vectors
          if (this.state.showVectors) {
            renderQueue.push({
              depth: pKnot.depth - 5,
              draw: () => this.drawForceVectors3D(ctx, w, h, eq, pKnot)
            });
          }

          // Hanging Mass & Brass Knot
          renderQueue.push({
            depth: pKnot.depth,
            draw: () => this.drawKnotAndHangingMass(ctx, pKnot, eq.massKg)
          });
        }
      }

      // Sort by depth (farthest first)
      renderQueue.sort((a, b) => b.depth - a.depth);

      // Execute all draw calls in order
      renderQueue.forEach(item => item.draw());

      // Screen space HUD elements (always on top)
      this.drawOrientationGizmo(ctx, w, h);
    }

    drawTabletopGrid(ctx, w, h) {
      ctx.save();
      ctx.strokeStyle = 'rgba(200, 219, 227, 0.45)';
      ctx.lineWidth = 1;

      const size = 32;
      const step = 8;

      for (let x = -size; x <= size; x += step) {
        const p1 = this.project3D({ x, y: 0, z: -size }, w, h);
        const p2 = this.project3D({ x, y: 0, z: size }, w, h);
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }

      for (let z = -size; z <= size; z += step) {
        const p1 = this.project3D({ x: -size, y: 0, z }, w, h);
        const p2 = this.project3D({ x: size, y: 0, z }, w, h);
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }

      // Table boundary circle
      ctx.strokeStyle = 'rgba(15, 126, 155, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const numSegs = 36;
      for (let i = 0; i <= numSegs; i++) {
        const angle = (i / numSegs) * Math.PI * 2;
        const pt = this.project3D({ x: Math.cos(angle) * 32, y: 0, z: Math.sin(angle) * 32 }, w, h);
        if (pt) {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    drawWorldAxes(ctx, w, h) {
      const pOrigin = this.project3D({ x: 0, y: 0, z: 0 }, w, h);
      if (!pOrigin) return;

      const len = 14;
      const pX = this.project3D({ x: len, y: 0, z: 0 }, w, h);
      const pY = this.project3D({ x: 0, y: len, z: 0 }, w, h);
      const pZ = this.project3D({ x: 0, y: 0, z: len }, w, h);

      ctx.save();
      ctx.lineWidth = 2;

      // X Axis (Teal)
      if (pX) {
        ctx.strokeStyle = '#0f7e9b';
        ctx.beginPath();
        ctx.moveTo(pOrigin.x, pOrigin.y);
        ctx.lineTo(pX.x, pX.y);
        ctx.stroke();
        ctx.fillStyle = '#0f7e9b';
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.fillText('+X', pX.x + 4, pX.y);
      }

      // Y Axis (Vertical Upward - Green)
      if (pY) {
        ctx.strokeStyle = '#1b8a5a';
        ctx.beginPath();
        ctx.moveTo(pOrigin.x, pOrigin.y);
        ctx.lineTo(pY.x, pY.y);
        ctx.stroke();
        ctx.fillStyle = '#1b8a5a';
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.fillText('+Y (Up)', pY.x, pY.y - 4);
      }

      // Z Axis (Depth - Amber)
      if (pZ) {
        ctx.strokeStyle = '#d67b19';
        ctx.beginPath();
        ctx.moveTo(pOrigin.x, pOrigin.y);
        ctx.lineTo(pZ.x, pZ.y);
        ctx.stroke();
        ctx.fillStyle = '#d67b19';
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.fillText('+Z', pZ.x + 4, pZ.y);
      }

      ctx.restore();
    }

    drawRingStand(ctx, pBase, pClamp, id, color) {
      ctx.save();

      // Cast iron heavy base
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(pBase.x, pBase.y, 14 * pBase.scale, 7 * pBase.scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Steel vertical rod
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3.5 * pBase.scale;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pBase.x, pBase.y);
      ctx.lineTo(pClamp.x, pClamp.y - 12 * pClamp.scale);
      ctx.stroke();

      // Clamp collar
      ctx.fillStyle = color;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pClamp.x, pClamp.y, 5 * pClamp.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Stand Label
      ctx.fillStyle = color;
      ctx.font = `bold ${Math.max(9, Math.round(11 * pClamp.scale))}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`Stand ${id}`, pClamp.x, pClamp.y - 14 * pClamp.scale);

      ctx.restore();
    }

    drawCableWithSpringScale(ctx, pKnot, pClamp, tension, readTension, color, name) {
      ctx.save();

      // Cable line
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(pKnot.x, pKnot.y);
      ctx.lineTo(pClamp.x, pClamp.y);
      ctx.stroke();

      // Vector from clamp toward knot for scale placement
      const dx = pKnot.x - pClamp.x;
      const dy = pKnot.y - pClamp.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 20) { ctx.restore(); return; }

      const ux = dx / dist;
      const uy = dy / dist;
      const angle = Math.atan2(dy, dx);

      // Spring Scale Barrel on cable
      const scalePos = 0.38;
      const sx = pClamp.x + dx * scalePos;
      const sy = pClamp.y + dy * scalePos;

      ctx.translate(sx, sy);
      ctx.rotate(angle);

      const barrelLen = 34;
      const barrelW = 10;

      // Acrylic scale body
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.strokeRect(-barrelLen / 2, -barrelW / 2, barrelLen, barrelW);
      ctx.fillRect(-barrelLen / 2, -barrelW / 2, barrelLen, barrelW);

      // Red Deflection Indicator
      const maxExt = barrelLen - 12;
      const ext = Math.min(maxExt, (tension / 10) * maxExt);
      const indX = -barrelLen / 2 + 6 + ext;

      ctx.fillStyle = '#dc2626';
      ctx.fillRect(indX - 1.5, -barrelW / 2 + 1, 3, barrelW - 2);

      // Force Badge
      const isMystery = this.state.activeScenario === 'mystery';
      if (this.state.showBadges && !isMystery) {
        ctx.rotate(-angle);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        const bw = 50;
        const bh = 18;
        ctx.fillRect(-bw / 2, -26, bw, bh);
        ctx.strokeRect(-bw / 2, -26, bw, bh);

        ctx.fillStyle = color;
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const txt = this.state.isRealLabMode ? `~${readTension.toFixed(1)} N` : `${tension.toFixed(2)} N`;
        ctx.fillText(txt, 0, -17);
      }

      ctx.restore();
    }

    drawKnotAndHangingMass(ctx, pKnot, massKg) {
      ctx.save();

      // Brass Knot Ring
      ctx.fillStyle = '#d97706';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pKnot.x, pKnot.y, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Hanging vertical string
      const dropLen = 32;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pKnot.x, pKnot.y + 5);
      ctx.lineTo(pKnot.x, pKnot.y + dropLen);
      ctx.stroke();

      // Metallic Hooked Slotted Weight
      const massY = pKnot.y + dropLen;
      const mw = 22;
      const mh = 26;

      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.fillRect(pKnot.x - mw / 2, massY, mw, mh);
      ctx.strokeRect(pKnot.x - mw / 2, massY, mw, mh);

      // Mass label
      const isMystery = this.state.activeScenario === 'mystery';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8.5px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isMystery ? '???' : `${Math.round(massKg * 1000)}g`, pKnot.x, massY + mh / 2);

      ctx.restore();
    }

    drawForceVectors3D(ctx, w, h, eq, pKnot) {
      ctx.save();
      const vScale = 6.5; // px per Newton

      // 3 Tension vectors
      const tVecs = [
        { u: eq.unitVectors.u1, t: eq.tensions.t1, color: '#0f7e9b' },
        { u: eq.unitVectors.u2, t: eq.tensions.t2, color: '#d67b19' },
        { u: eq.unitVectors.u3, t: eq.tensions.t3, color: '#1b8a5a' }
      ];

      tVecs.forEach(tv => {
        const pEndWorld = {
          x: eq.knot.x + tv.u.x * (tv.t * vScale * 0.15),
          y: eq.knot.y + tv.u.y * (tv.t * vScale * 0.15),
          z: eq.knot.z + tv.u.z * (tv.t * vScale * 0.15)
        };
        const pEnd = this.project3D(pEndWorld, w, h);
        if (pEnd) {
          ctx.strokeStyle = tv.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(pKnot.x, pKnot.y);
          ctx.lineTo(pEnd.x, pEnd.y);
          ctx.stroke();

          // Arrowhead
          const angle = Math.atan2(pEnd.y - pKnot.y, pEnd.x - pKnot.x);
          ctx.fillStyle = tv.color;
          ctx.beginPath();
          ctx.moveTo(pEnd.x, pEnd.y);
          ctx.lineTo(pEnd.x - 7 * Math.cos(angle - Math.PI / 6), pEnd.y - 7 * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(pEnd.x - 7 * Math.cos(angle + Math.PI / 6), pEnd.y - 7 * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fill();
        }
      });

      // Gravity downward vector (Fg)
      const pGravWorld = {
        x: eq.knot.x,
        y: eq.knot.y - (eq.Fg * vScale * 0.15),
        z: eq.knot.z
      };
      const pGrav = this.project3D(pGravWorld, w, h);
      if (pGrav) {
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(pKnot.x, pKnot.y);
        ctx.lineTo(pGrav.x, pGrav.y);
        ctx.stroke();

        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(pGrav.x, pGrav.y);
        ctx.lineTo(pGrav.x - 4, pGrav.y - 7);
        ctx.lineTo(pGrav.x + 4, pGrav.y - 7);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    drawOrientationGizmo(ctx, w, h) {
      // 3D Mini Orientation Tripod in bottom-left corner
      ctx.save();
      const ox = 40;
      const oy = h - 40;
      const arm = 24;

      const cam = this.state.camera;
      const cosY = Math.cos(cam.yaw);
      const sinY = Math.sin(cam.yaw);
      const cosP = Math.cos(cam.pitch);
      const sinP = Math.sin(cam.pitch);

      const projectGizmo = (x, y, z) => {
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        const y2 = y * cosP - z1 * sinP;
        return { x: ox + x1 * arm, y: oy - y2 * arm };
      };

      const gX = projectGizmo(1, 0, 0);
      const gY = projectGizmo(0, 1, 0);
      const gZ = projectGizmo(0, 0, 1);

      ctx.lineWidth = 2;

      // X Axis (Teal)
      ctx.strokeStyle = '#0f7e9b';
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(gX.x, gX.y);
      ctx.stroke();

      // Y Axis (Green)
      ctx.strokeStyle = '#1b8a5a';
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(gY.x, gY.y);
      ctx.stroke();

      // Z Axis (Amber)
      ctx.strokeStyle = '#d67b19';
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(gZ.x, gZ.y);
      ctx.stroke();

      ctx.fillStyle = '#0f7e9b';
      ctx.font = 'bold 8px Inter, sans-serif';
      ctx.fillText('X', gX.x + 3, gX.y);
      ctx.fillStyle = '#1b8a5a';
      ctx.fillText('Y', gY.x, gY.y - 3);
      ctx.fillStyle = '#d67b19';
      ctx.fillText('Z', gZ.x + 3, gZ.y);

      ctx.restore();
    }
  }

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { window.app = new Statics3DApp(); });
  } else {
    window.app = new Statics3DApp();
  }
})();
