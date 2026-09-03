/**
 * 3D Statics Lab Application Controller
 * Handles 3D Canvas Projection, Orbit Controls, Virtual Dual-Scale Protractor,
 * Event Binding, and Workbench UI
 */

(function () {
  'use strict';

  // Helper: Draw rounded rectangle without ctx.roundRect (Design System standard)
  function drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

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
        valKnotCoords: document.getElementById('valKnotCoords'),
        valKnotSag: document.getElementById('valKnotSag'),

        // Camera buttons
        camBtns: document.querySelectorAll('.cam-btn'),

        // Toolbar toggles
        chkGrid: document.getElementById('chkGrid'),
        chkAxes: document.getElementById('chkAxes'),
        chkVectors: document.getElementById('chkVectors'),
        chkBadges: document.getElementById('chkBadges'),
        chkDrops: document.getElementById('chkDrops'),
        chkZoomScales: document.getElementById('chkZoomScales'),
        chkCoordsHUD: document.getElementById('chkCoordsHUD'),
        btnResetCam: document.getElementById('btnResetCam'),

        // Protractor Measurement Controls
        btnToggleProtractor: document.getElementById('btnToggleProtractor'),
        btnSnapProtractor: document.getElementById('btnSnapProtractor'),
        btnAlignC1: document.getElementById('btnAlignC1'),
        btnAlignC2: document.getElementById('btnAlignC2'),
        btnAlignC3: document.getElementById('btnAlignC3'),
        btnAlignHoriz: document.getElementById('btnAlignHoriz'),

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

        // Table Elements & Inputs
        inTheta1: document.getElementById('inTheta1'),
        inTheta2: document.getElementById('inTheta2'),
        inTheta3: document.getElementById('inTheta3'),
        inForce1: document.getElementById('inForce1'),
        inForce2: document.getElementById('inForce2'),
        inForce3: document.getElementById('inForce3'),
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

        // 3D Anchor positions on tabletop (in cm)
        anchors: {
          a1: { x: 22, y: 30, z: 12 },   // Stand 1: Front-Left (Teal)
          a2: { x: -22, y: 30, z: 12 },  // Stand 2: Front-Right (Amber)
          a3: { x: 0, y: 30, z: -24 }    // Stand 3: Rear-Center (Emerald)
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

        // 3D Camera Orbit Configuration (Calibrated for AP Physics C)
        camera: {
          yaw: 35 * (Math.PI / 180),    // Horizontal orbit angle
          pitch: 22 * (Math.PI / 180),  // Elevation angle
          distance: 64,                 // Calibrated distance for CSS pixel canvas
          target: { x: 0, y: 15, z: 0 },
          fov: 650,                     // Crisp FOV
          isDragging: false,
          lastMouseX: 0,
          lastMouseY: 0
        },

        // Virtual Dual-Scale Protractor Tool
        protractor: {
          visible: false,
          x: 0,
          y: 0,
          rotationDeg: 0,
          radius: 155,
          isSnapped: true
        },

        // Toggles
        showGrid: true,
        showAxes: true,
        showVectors: true,
        showBadges: true,
        showDrops: true,
        showZoomScales: true,
        showCoordsHUD: true,

        // Settling Bobbing Animation
        bobbingOffset: 0
      };

      this.dragTarget = null; // 'protractor', 'protractor_rot', 'camera'
      this.dragOffset = { x: 0, y: 0 };
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

      // Snap protractor if first load
      if (this.state.protractor.isSnapped) {
        this.snapProtractorToKnot();
      }

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

      // In real lab mode, the active knot position includes Hooke's Law elastic sag
      if (this.state.protractor.isSnapped) {
        this.snapProtractorToKnot();
      }

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
      if (this.dom.valKnotCoords) {
        this.dom.valKnotCoords.textContent = `(${eq.knot.x.toFixed(1)}, ${eq.knot.y.toFixed(1)}, ${eq.knot.z.toFixed(1)}) cm`;
      }
      if (this.dom.valKnotSag) {
        if (this.state.isRealLabMode && Math.abs(eq.elasticSagY) > 0.05) {
          const sign = eq.elasticSagY > 0 ? '-' : '+';
          this.dom.valKnotSag.innerHTML = `<span style="color: var(--accent-amber);">Hooke's Law Sag (${sign}${Math.abs(eq.elasticSagY).toFixed(1)} cm)</span>`;
        } else if (this.state.isRealLabMode) {
          this.dom.valKnotSag.innerHTML = `<span style="color: var(--accent-amber);">Elastic Scale Springs</span>`;
        } else {
          this.dom.valKnotSag.textContent = 'Ideal Inextensible Cables';
        }
      }
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
        this.state.camera.pitch = 26 * (Math.PI / 180);
        this.state.camera.distance = 60;
      } else if (preset === 'top') {
        this.state.camera.yaw = 0;
        this.state.camera.pitch = 88 * (Math.PI / 180);
        this.state.camera.distance = 56;
      } else if (preset === 'front') {
        this.state.camera.yaw = 0;
        this.state.camera.pitch = 8 * (Math.PI / 180);
        this.state.camera.distance = 58;
      } else if (preset === 'side') {
        this.state.camera.yaw = 90 * (Math.PI / 180);
        this.state.camera.pitch = 8 * (Math.PI / 180);
        this.state.camera.distance = 58;
      }

      if (this.state.protractor.isSnapped) {
        this.snapProtractorToKnot();
      }

      this.render();
    }

    snapProtractorToKnot() {
      const canvas = this.dom.canvas;
      if (!canvas || !this.equilibrium) return;
      const w = canvas.width;
      const h = canvas.height;
      const pKnot = this.project3D(this.equilibrium.knot, w, h);
      if (pKnot) {
        this.state.protractor.x = pKnot.x;
        this.state.protractor.y = pKnot.y;
        this.state.protractor.isSnapped = true;
      }
    }

    alignProtractorToCable(cableNum) {
      this.snapProtractorToKnot();
      const canvas = this.dom.canvas;
      if (!canvas || !this.equilibrium) return;
      const w = canvas.width;
      const h = canvas.height;

      const pKnot = this.project3D(this.equilibrium.knot, w, h);
      let anchor = null;
      if (cableNum === 1) anchor = this.equilibrium.anchors.a1;
      else if (cableNum === 2) anchor = this.equilibrium.anchors.a2;
      else if (cableNum === 3) anchor = this.equilibrium.anchors.a3;

      if (pKnot && anchor) {
        const pClamp = this.project3D(anchor, w, h);
        if (pClamp) {
          const dx = pClamp.x - pKnot.x;
          const dy = pClamp.y - pKnot.y;
          const rad = Math.atan2(dy, dx);
          let deg = (rad * 180) / Math.PI;
          if (deg < 0) deg += 360;
          this.state.protractor.rotationDeg = Math.round(deg);
        }
      }
      this.state.protractor.visible = true;
      this.updateProtractorButtonUI();
      this.render();
    }

    updateProtractorButtonUI() {
      if (!this.dom.btnToggleProtractor) return;
      const isVis = this.state.protractor.visible;
      this.dom.btnToggleProtractor.textContent = isVis ? '📐 Protractor (On)' : '📐 Protractor (Off)';
      this.dom.btnToggleProtractor.classList.toggle('btn-protractor-active', isVis);
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
      if (this.dom.chkZoomScales) {
        this.dom.chkZoomScales.addEventListener('change', (e) => {
          this.state.showZoomScales = e.target.checked;
          this.render();
        });
      }
      if (this.dom.chkCoordsHUD) {
        this.dom.chkCoordsHUD.addEventListener('change', (e) => {
          this.state.showCoordsHUD = e.target.checked;
          this.render();
        });
      }
      if (this.dom.btnResetCam) {
        this.dom.btnResetCam.addEventListener('click', () => {
          this.setCameraPreset('orbit');
        });
      }

      // Protractor Control Buttons
      if (this.dom.btnToggleProtractor) {
        this.dom.btnToggleProtractor.addEventListener('click', () => {
          this.state.protractor.visible = !this.state.protractor.visible;
          if (this.state.protractor.visible) {
            this.snapProtractorToKnot();
          }
          this.updateProtractorButtonUI();
          this.render();
        });
      }

      if (this.dom.btnSnapProtractor) {
        this.dom.btnSnapProtractor.addEventListener('click', () => {
          this.state.protractor.visible = true;
          this.snapProtractorToKnot();
          this.updateProtractorButtonUI();
          this.render();
        });
      }

      if (this.dom.btnAlignC1) {
        this.dom.btnAlignC1.addEventListener('click', () => this.alignProtractorToCable(1));
      }
      if (this.dom.btnAlignC2) {
        this.dom.btnAlignC2.addEventListener('click', () => this.alignProtractorToCable(2));
      }
      if (this.dom.btnAlignC3) {
        this.dom.btnAlignC3.addEventListener('click', () => this.alignProtractorToCable(3));
      }
      if (this.dom.btnAlignHoriz) {
        this.dom.btnAlignHoriz.addEventListener('click', () => {
          this.snapProtractorToKnot();
          this.state.protractor.rotationDeg = 0;
          this.state.protractor.visible = true;
          this.updateProtractorButtonUI();
          this.render();
        });
      }

      // Canvas Mouse / Touch Orbit & Protractor Interaction
      this.bindCanvasInteraction();

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

    bindCanvasInteraction() {
      const canvas = this.dom.canvas;
      if (!canvas) return;

      const getCanvasCoords = (clientX, clientY) => {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        return {
          x: (clientX - rect.left) * (canvas.width / rect.width),
          y: (clientY - rect.top) * (canvas.height / rect.height)
        };
      };

      const handleDown = (clientX, clientY) => {
        const { x, y } = getCanvasCoords(clientX, clientY);

        // Check Protractor Hit Testing if visible
        if (this.state.protractor.visible) {
          const px = this.state.protractor.x;
          const py = this.state.protractor.y;
          const r = this.state.protractor.radius;
          const rotRad = (this.state.protractor.rotationDeg * Math.PI) / 180;

          // 1. Rotation handle: at (px + (r + 18)*cos(rot), py + (r + 18)*sin(rot))
          const handleX = px + (r + 18) * Math.cos(rotRad);
          const handleY = py + (r + 18) * Math.sin(rotRad);
          if (Math.hypot(x - handleX, y - handleY) <= 18) {
            this.dragTarget = 'protractor_rot';
            return;
          }

          // 2. Protractor Body: inside semicircle radius r
          const distToCenter = Math.hypot(x - px, y - py);
          if (distToCenter <= r) {
            this.dragTarget = 'protractor';
            this.dragOffset.x = x - px;
            this.dragOffset.y = y - py;
            this.state.protractor.isSnapped = false;
            return;
          }
        }

        // Otherwise orbit camera
        this.dragTarget = 'camera';
        this.state.camera.isDragging = true;
        this.state.camera.lastMouseX = clientX;
        this.state.camera.lastMouseY = clientY;
      };

      const handleMove = (clientX, clientY) => {
        if (!this.dragTarget) return;

        const { x, y } = getCanvasCoords(clientX, clientY);

        if (this.dragTarget === 'protractor_rot') {
          const px = this.state.protractor.x;
          const py = this.state.protractor.y;
          const rad = Math.atan2(y - py, x - px);
          let deg = (rad * 180) / Math.PI;
          if (deg < 0) deg += 360;
          this.state.protractor.rotationDeg = Math.round(deg);
          this.render();
        } else if (this.dragTarget === 'protractor') {
          this.state.protractor.x = x - this.dragOffset.x;
          this.state.protractor.y = y - this.dragOffset.y;

          // Auto-snap if dragged near knot
          if (this.equilibrium) {
            const pKnot = this.project3D(this.equilibrium.knot, canvas.width, canvas.height);
            if (pKnot && Math.hypot(this.state.protractor.x - pKnot.x, this.state.protractor.y - pKnot.y) < 22) {
              this.state.protractor.x = pKnot.x;
              this.state.protractor.y = pKnot.y;
              this.state.protractor.isSnapped = true;
            }
          }
          this.render();
        } else if (this.dragTarget === 'camera') {
          const deltaX = clientX - this.state.camera.lastMouseX;
          const deltaY = clientY - this.state.camera.lastMouseY;

          this.state.camera.lastMouseX = clientX;
          this.state.camera.lastMouseY = clientY;

          this.state.camera.yaw -= deltaX * 0.007;
          this.state.camera.pitch += deltaY * 0.007;

          // Clamp elevation to avoid flips
          const minPitch = 4 * (Math.PI / 180);
          const maxPitch = 86 * (Math.PI / 180);
          this.state.camera.pitch = Math.max(minPitch, Math.min(maxPitch, this.state.camera.pitch));

          this.dom.camBtns.forEach(btn => btn.classList.remove('active'));

          if (this.state.protractor.isSnapped) {
            this.snapProtractorToKnot();
          }

          this.render();
        }
      };

      const handleUp = () => {
        this.dragTarget = null;
        this.state.camera.isDragging = false;
      };

      // Mouse Listeners
      canvas.addEventListener('mousedown', (e) => handleDown(e.clientX, e.clientY));
      window.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
      window.addEventListener('mouseup', handleUp);

      // Touch Listeners
      canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          handleDown(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: true });

      window.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
          handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: true });

      window.addEventListener('touchend', handleUp);

      // Wheel Zoom
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomDelta = e.deltaY * 0.06;
        this.state.camera.distance = Math.max(38, Math.min(120, this.state.camera.distance + zoomDelta));
        if (this.state.protractor.isSnapped) {
          this.snapProtractorToKnot();
        }
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

      // Populate input fields with measured/read values
      if (this.dom.inTheta1) this.dom.inTheta1.value = eq.angles.angles1.betaDeg.toFixed(1);
      if (this.dom.inTheta2) this.dom.inTheta2.value = eq.angles.angles2.betaDeg.toFixed(1);
      if (this.dom.inTheta3) this.dom.inTheta3.value = eq.angles.angles3.betaDeg.toFixed(1);

      if (this.dom.inForce1) this.dom.inForce1.value = eq.readTensions.t1.toFixed(1);
      if (this.dom.inForce2) this.dom.inForce2.value = eq.readTensions.t2.toFixed(1);
      if (this.dom.inForce3) this.dom.inForce3.value = eq.readTensions.t3.toFixed(1);

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
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);
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

          // Hanging Slotted Weight & Brass Knot
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

      // Screen space HUD elements: Dual-Scale Protractor
      if (this.state.protractor.visible) {
        this.drawProtractor(ctx, this.state.protractor.x, this.state.protractor.y);
      }

      // Vertical Zoom Scales for High Precision Reading (AP Physics C Standard)
      if (this.state.showZoomScales && eq) {
        this.drawAllZoomScales(ctx, w, h, eq);
      }

      // 3D Cartesian Coordinates & Angles HUD
      if (this.state.showCoordsHUD && eq) {
        this.draw3DCoordinatesHUD(ctx, w, h, eq);
      }

      // Orientation axes gizmo
      this.drawOrientationGizmo(ctx, w, h);

      ctx.restore();
    }

    drawTabletopGrid(ctx, w, h) {
      ctx.save();
      ctx.strokeStyle = 'rgba(200, 219, 227, 0.45)';
      ctx.lineWidth = 1;

      const size = 36;
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
        const p1 = this.project3D({ x: -size, y: 0, z: z }, w, h);
        const p2 = this.project3D({ x: size, y: 0, z: z }, w, h);
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
        const pt = this.project3D({ x: Math.cos(angle) * 36, y: 0, z: Math.sin(angle) * 36 }, w, h);
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

      const len = 16;
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
        ctx.font = 'bold 10px Inter, sans-serif';
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
        ctx.font = 'bold 10px Inter, sans-serif';
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
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillText('+Z', pZ.x + 4, pZ.y);
      }

      ctx.restore();
    }

    drawAllZoomScales(ctx, w, h, eq) {
      const scaleW = 90;
      const scaleH = 270;
      const startX = w - (scaleW * 3 + 24);
      const startY = 32;

      const pC1 = this.project3D(eq.anchors.a1, w, h);
      const pC2 = this.project3D(eq.anchors.a2, w, h);
      const pC3 = this.project3D(eq.anchors.a3, w, h);

      this.drawVerticalZoomScale(ctx, startX, startY, scaleW, scaleH, eq.tensions.t1, eq.readTensions.t1, 'T₁ (Stand 1)', '#0f7e9b', pC1);
      this.drawVerticalZoomScale(ctx, startX + scaleW + 8, startY, scaleW, scaleH, eq.tensions.t2, eq.readTensions.t2, 'T₂ (Stand 2)', '#d67b19', pC2);
      this.drawVerticalZoomScale(ctx, startX + (scaleW + 8) * 2, startY, scaleW, scaleH, eq.tensions.t3, eq.readTensions.t3, 'T₃ (Stand 3)', '#1b8a5a', pC3);
    }

    drawVerticalZoomScale(ctx, x, y, width, height, tension, readTension, title, themeColor, anchorPoint) {
      ctx.save();

      // Card Container
      ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
      drawRoundedRect(ctx, x, y, width, height, 7, true, true);
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Header Banner
      ctx.fillStyle = themeColor;
      drawRoundedRect(ctx, x + 4, y + 4, width - 8, 22, 4, true, false);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, x + width / 2, y + 15);

      // Subtitle
      ctx.fillStyle = '#475569';
      ctx.font = '9px Inter, sans-serif';
      ctx.fillText('0–10 N (0.2N)', x + width / 2, y + 34);

      // Barrel Dimensions
      const barrelX = x + 8;
      const barrelY = y + 42;
      const barrelW = 28;
      const barrelH = height - 76;
      const usableH = barrelH - 8;

      // Acrylic Tube Background
      ctx.fillStyle = '#f8fafc';
      drawRoundedRect(ctx, barrelX, barrelY, barrelW, barrelH, 3, true, true);
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Spring Extension
      const ext = Math.max(0, Math.min(usableH, (tension / 10) * usableH));
      const indY = barrelY + 4 + ext;

      // Helical Spring
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(barrelX + barrelW / 2, barrelY + 2);
      const coils = 12;
      for (let i = 0; i <= coils; i++) {
        const cy = barrelY + 2 + (i / coils) * ext;
        const cx = barrelX + barrelW / 2 + (i % 2 === 0 ? -4 : 4);
        ctx.lineTo(cx, cy);
      }
      ctx.lineTo(barrelX + barrelW / 2, indY);
      ctx.stroke();

      // Hook Rod
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(barrelX + barrelW / 2, indY);
      ctx.lineTo(barrelX + barrelW / 2, barrelY + barrelH + 6);
      ctx.stroke();

      // Red Indicator Ring & Pointer
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(barrelX + 1, indY - 2, barrelW - 2, 4);
      ctx.beginPath();
      ctx.moveTo(barrelX + barrelW, indY);
      ctx.lineTo(barrelX + barrelW + 4, indY - 3);
      ctx.lineTo(barrelX + barrelW + 4, indY + 3);
      ctx.closePath();
      ctx.fill();

      // Graduated Newton Ticks (0 to 10 N every 0.2 N)
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (let n = 0; n <= 10; n += 0.2) {
        const val = Math.round(n * 10) / 10;
        const tickY = barrelY + 4 + (val / 10) * usableH;
        const isWhole = Math.abs(val - Math.round(val)) < 0.05;
        const isEven = Math.abs(val % 2) < 0.05;

        if (isWhole) {
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(barrelX + barrelW, tickY);
          ctx.lineTo(barrelX + barrelW + 8, tickY);
          ctx.stroke();

          if (isEven) {
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 10px Inter, sans-serif';
            ctx.fillText(Math.round(val).toString(), barrelX + barrelW + 11, tickY);
          }
        } else if (Math.abs(val - (Math.floor(val) + 0.5)) < 0.05) {
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(barrelX + barrelW, tickY);
          ctx.lineTo(barrelX + barrelW + 5.5, tickY);
          ctx.stroke();
        } else {
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(barrelX + barrelW, tickY);
          ctx.lineTo(barrelX + barrelW + 3.5, tickY);
          ctx.stroke();
        }
      }

      // Live force readout badge (hidden in mystery mode)
      const isMystery = this.state.activeScenario === 'mystery';
      if (!isMystery) {
        ctx.fillStyle = themeColor;
        drawRoundedRect(ctx, x + 5, height - 26, width - 10, 20, 4, true, false);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const txt = this.state.isRealLabMode ? `~${readTension.toFixed(1)} N` : `${tension.toFixed(2)} N`;
        ctx.fillText(txt, x + width / 2, height - 16);
      } else {
        ctx.fillStyle = '#fef5ea';
        drawRoundedRect(ctx, x + 5, height - 26, width - 10, 20, 4, true, false);
        ctx.fillStyle = '#d67b19';
        ctx.font = 'bold 9.5px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Read Scale', x + width / 2, height - 16);
      }

      ctx.restore();
    }

    draw3DCoordinatesHUD(ctx, w, h, eq) {
      ctx.save();
      const cardW = 420;
      const cardH = 118;
      const x = 12;
      const y = h - cardH - 12;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
      drawRoundedRect(ctx, x, y, cardW, cardH, 7, true, true);
      ctx.strokeStyle = '#0f7e9b';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.fillStyle = '#0f7e9b';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('AP PHYSICS C: 3D COORDINATES & ELEVATION ANGLES', x + 10, y + 16);

      const knotStr = `Knot P: (${eq.knot.x.toFixed(1)}, ${eq.knot.y.toFixed(1)}, ${eq.knot.z.toFixed(1)}) cm`;
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 10.5px Inter, sans-serif';
      ctx.fillText(knotStr, x + 10, y + 33);

      const items = [
        { name: 'Cable 1', a: eq.anchors.a1, u: eq.unitVectors.u1, color: '#0f7e9b', ang: eq.angles.angles1 },
        { name: 'Cable 2', a: eq.anchors.a2, u: eq.unitVectors.u2, color: '#d67b19', ang: eq.angles.angles2 },
        { name: 'Cable 3', a: eq.anchors.a3, u: eq.unitVectors.u3, color: '#1b8a5a', ang: eq.angles.angles3 }
      ];

      items.forEach((item, idx) => {
        const rowY = y + 52 + idx * 20;
        const dx = (item.a.x - eq.knot.x).toFixed(1);
        const dy = (item.a.y - eq.knot.y).toFixed(1);
        const dz = (item.a.z - eq.knot.z).toFixed(1);
        const L = Math.hypot(item.a.x - eq.knot.x, item.a.y - eq.knot.y, item.a.z - eq.knot.z).toFixed(1);
        const elev = (Math.asin(Math.max(-1, Math.min(1, item.u.y))) * (180 / Math.PI)).toFixed(1);

        ctx.fillStyle = item.color;
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillText(`${item.name}:`, x + 10, rowY);

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`Δr=<${dx},${dy},${dz}>cm`, x + 62, rowY);
        ctx.fillText(`L=${L}cm`, x + 240, rowY);
        ctx.fillText(`θ_elev=${elev}°`, x + 318, rowY);
      });

      ctx.restore();
    }

    drawRingStand(ctx, pBase, pClamp, id, color) {
      ctx.save();

      // Cast Iron Base (Crisp size: 34 x 16 px)
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(pBase.x, pBase.y, 34, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Steel Vertical Rod (width: 5 px)
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pBase.x, pBase.y);
      ctx.lineTo(pClamp.x, pClamp.y - 14);
      ctx.stroke();

      // Adjustable Clamp Collar (radius: 8.5 px)
      ctx.fillStyle = color;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(pClamp.x, pClamp.y, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Stand Label Badge (Pill: 64 x 22 px)
      ctx.fillStyle = color;
      drawRoundedRect(ctx, pClamp.x - 32, pClamp.y - 34, 64, 22, 5, true, false);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Stand ${id}`, pClamp.x, pClamp.y - 23);

      ctx.restore();
    }

    drawCableWithSpringScale(ctx, pKnot, pClamp, tension, readTension, color, name) {
      ctx.save();

      // Cable line
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(pKnot.x, pKnot.y);
      ctx.lineTo(pClamp.x, pClamp.y);
      ctx.stroke();

      const dx = pKnot.x - pClamp.x;
      const dy = pKnot.y - pClamp.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 25) { ctx.restore(); return; }

      const angle = Math.atan2(dy, dx);

      // Spring Scale Barrel on cable
      const scalePos = 0.38;
      const sx = pClamp.x + dx * scalePos;
      const sy = pClamp.y + dy * scalePos;

      ctx.translate(sx, sy);
      ctx.rotate(angle);

      const barrelLen = 46;
      const barrelW = 15;

      // Acrylic Scale Body
      ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.strokeRect(-barrelLen / 2, -barrelW / 2, barrelLen, barrelW);
      ctx.fillRect(-barrelLen / 2, -barrelW / 2, barrelLen, barrelW);

      // Red Deflection Indicator
      const maxExt = barrelLen - 14;
      const ext = Math.min(maxExt, (tension / 10) * maxExt);
      const indX = -barrelLen / 2 + 7 + ext;

      ctx.fillStyle = '#dc2626';
      ctx.fillRect(indX - 2, -barrelW / 2 + 1, 4, barrelW - 2);

      // Force Badge
      const isMystery = this.state.activeScenario === 'mystery';
      if (this.state.showBadges && !isMystery) {
        ctx.rotate(-angle);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        const bw = 64;
        const bh = 22;
        ctx.fillRect(-bw / 2, -32, bw, bh);
        ctx.strokeRect(-bw / 2, -32, bw, bh);

        ctx.fillStyle = color;
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const txt = this.state.isRealLabMode ? `~${readTension.toFixed(1)} N` : `${tension.toFixed(2)} N`;
        ctx.fillText(txt, 0, -21);
      }

      ctx.restore();
    }

    drawKnotAndHangingMass(ctx, pKnot, massKg) {
      ctx.save();

      // Brass Knot Ring
      ctx.fillStyle = '#d97706';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(pKnot.x, pKnot.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Vertical string
      const dropLen = 30;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pKnot.x, pKnot.y + 6);
      ctx.lineTo(pKnot.x, pKnot.y + dropLen);
      ctx.stroke();

      const topY = pKnot.y + dropLen;
      const isMystery = this.state.activeScenario === 'mystery';

      if (isMystery) {
        // Mystery Load Canister
        const boxW = 42;
        const boxH = 48;
        ctx.fillStyle = '#d67b19';
        drawRoundedRect(ctx, pKnot.x - boxW / 2, topY, boxW, boxH, 6, true, true);
        ctx.strokeStyle = '#a35a0d';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', pKnot.x, topY + boxH / 2 - 4);

        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.fillText(`MASS ${this.state.currentMystery}`, pKnot.x, topY + boxH - 10);
      } else {
        // Realistic Slotted Mass Hanger with Brass Discs
        const hangerW = 38;
        const discH = 8;
        const massG = Math.round(massKg * 1000);

        // Hanger Rod
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(pKnot.x, topY + 3, 3.5, 0, Math.PI * 2);
        ctx.moveTo(pKnot.x, topY + 7);
        ctx.lineTo(pKnot.x, topY + 54);
        ctx.stroke();

        // Base plate
        ctx.fillStyle = '#475569';
        drawRoundedRect(ctx, pKnot.x - hangerW / 2, topY + 52, hangerW, 5, 2, true, false);

        // Brass Slotted Discs
        const numDiscs = Math.max(1, Math.min(5, Math.ceil(massG / 200)));
        for (let i = 0; i < numDiscs; i++) {
          const discY = topY + 52 - (i + 1) * (discH + 1);
          const grad = ctx.createLinearGradient(pKnot.x - hangerW / 2, discY, pKnot.x + hangerW / 2, discY);
          grad.addColorStop(0, '#d67b19');
          grad.addColorStop(0.5, '#fef5ea');
          grad.addColorStop(1, '#a35a0d');
          ctx.fillStyle = grad;
          drawRoundedRect(ctx, pKnot.x - hangerW / 2, discY, hangerW, discH, 2, true, true);
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Tag
        ctx.fillStyle = '#0f7e9b';
        drawRoundedRect(ctx, pKnot.x - 26, topY + 62, 52, 18, 4, true, false);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${massG} g`, pKnot.x, topY + 71);
      }

      ctx.restore();
    }

    drawForceVectors3D(ctx, w, h, eq, pKnot) {
      ctx.save();
      const vScale = 7.5; // px per Newton

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
          ctx.lineWidth = 2.8;
          ctx.beginPath();
          ctx.moveTo(pKnot.x, pKnot.y);
          ctx.lineTo(pEnd.x, pEnd.y);
          ctx.stroke();

          // Arrowhead
          const angle = Math.atan2(pEnd.y - pKnot.y, pEnd.x - pKnot.x);
          ctx.fillStyle = tv.color;
          ctx.beginPath();
          ctx.moveTo(pEnd.x, pEnd.y);
          ctx.lineTo(pEnd.x - 8 * Math.cos(angle - Math.PI / 6), pEnd.y - 8 * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(pEnd.x - 8 * Math.cos(angle + Math.PI / 6), pEnd.y - 8 * Math.sin(angle + Math.PI / 6));
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
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(pKnot.x, pKnot.y);
        ctx.lineTo(pGrav.x, pGrav.y);
        ctx.stroke();

        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(pGrav.x, pGrav.y);
        ctx.lineTo(pGrav.x - 5, pGrav.y - 8);
        ctx.lineTo(pGrav.x + 5, pGrav.y - 8);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    // =========================================================================
    // Virtual Dual-Scale Protractor (Authentic The Thinking Experiment Tool)
    // =========================================================================
    drawProtractor(ctx, protX, protY) {
      ctx.save();
      ctx.translate(protX, protY);
      ctx.rotate((this.state.protractor.rotationDeg * Math.PI) / 180);

      const r = this.state.protractor.radius;

      // Semi-transparent Acrylic Body (180 deg)
      ctx.fillStyle = 'rgba(224, 242, 247, 0.84)';
      ctx.strokeStyle = '#0f7e9b';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(0, 0, r, Math.PI, 0, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dividing Arc separating Outer Scale and Inner Scale
      ctx.strokeStyle = 'rgba(15, 126, 155, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, r - 25, Math.PI, 0, false);
      ctx.stroke();

      // Inner Cutout
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.strokeStyle = '#0f7e9b';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.40, Math.PI, 0, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Origin Baseline (Horizontal Alignment Line)
      ctx.strokeStyle = 'rgba(15, 126, 155, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.lineTo(r, 0);
      ctx.stroke();

      // Center Origin Crosshairs & Sighting Ring
      ctx.strokeStyle = '#d67b19';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(16, 0);
      ctx.moveTo(0, -16);
      ctx.lineTo(0, 16);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.stroke();

      // Graduated Degree Ticks & Numbers (Dual Scale)
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let deg = 0; deg <= 180; deg += 1) {
        const rad = Math.PI - (deg * Math.PI) / 180;

        // Outer rim ticks (every 1°, 5°, 10°)
        let outerTickLen = 3.5;
        if (deg % 10 === 0) outerTickLen = 10;
        else if (deg % 5 === 0) outerTickLen = 6.5;

        const ox1 = (r - 2) * Math.cos(rad);
        const oy1 = -(r - 2) * Math.sin(rad);
        const ox2 = (r - 2 - outerTickLen) * Math.cos(rad);
        const oy2 = -(r - 2 - outerTickLen) * Math.sin(rad);

        ctx.strokeStyle = '#0f7e9b';
        ctx.lineWidth = (deg % 10 === 0) ? 1.3 : 0.65;
        ctx.beginPath();
        ctx.moveTo(ox1, oy1);
        ctx.lineTo(ox2, oy2);
        ctx.stroke();

        // Inner scale ticks extending inward from dividing arc
        if (deg % 5 === 0) {
          const innerTickLen = (deg % 10 === 0) ? 6 : 4;
          const inR1 = r - 25;
          const inR2 = r - 25 - innerTickLen;
          const ix1 = inR1 * Math.cos(rad);
          const iy1 = -inR1 * Math.sin(rad);
          const ix2 = inR2 * Math.cos(rad);
          const iy2 = -inR2 * Math.sin(rad);

          ctx.strokeStyle = (deg % 10 === 0) ? '#d67b19' : 'rgba(214, 123, 25, 0.6)';
          ctx.lineWidth = (deg % 10 === 0) ? 1.1 : 0.65;
          ctx.beginPath();
          ctx.moveTo(ix1, iy1);
          ctx.lineTo(ix2, iy2);
          ctx.stroke();
        }

        // Dual Degree Numbers every 10°
        if (deg % 10 === 0) {
          // 1. Outer Scale: 0° to 180° Left-to-Right (Teal)
          const outTextR = r - 18;
          const otx = outTextR * Math.cos(rad);
          const oty = -outTextR * Math.sin(rad);
          ctx.fillStyle = '#0a576b';
          ctx.font = 'bold 9.5px Inter, sans-serif';
          ctx.fillText(deg.toString(), otx, oty);

          // 2. Inner Scale: 0° to 180° Right-to-Left (Amber)
          const inTextR = r - 42;
          const itx = inTextR * Math.cos(rad);
          const ity = -inTextR * Math.sin(rad);
          const innerDeg = 180 - deg;
          ctx.fillStyle = '#d67b19';
          ctx.font = 'bold 9px Inter, sans-serif';
          ctx.fillText(innerDeg.toString(), itx, ity);
        }
      }

      // Quick reference labels
      ctx.fillStyle = '#0a576b';
      ctx.font = 'bold 8.5px Inter, sans-serif';
      ctx.fillText('OUTER', 0, -r + 26);
      ctx.fillStyle = '#d67b19';
      ctx.font = 'bold 8px Inter, sans-serif';
      ctx.fillText('INNER', 0, -r + 50);

      // Rotation Drag Handle (Orange circle on outer edge)
      const rotX = r + 18;
      const rotY = 0;
      ctx.fillStyle = '#d67b19';
      ctx.beginPath();
      ctx.arc(rotX, rotY, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#0f7e9b';
      drawRoundedRect(ctx, -40, -r - 18, 80, 16, 3, true, false);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8.5px Inter, sans-serif';
      ctx.fillText('PROTRACTOR', 0, -r - 10);

      ctx.restore();
    }

    drawOrientationGizmo(ctx, w, h) {
      ctx.save();
      const ox = 45;
      const oy = h - 45;
      const arm = 26;

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

      ctx.lineWidth = 2.2;

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
      ctx.font = 'bold 9px Inter, sans-serif';
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
