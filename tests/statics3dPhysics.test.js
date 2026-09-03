const { describe, it } = require('node:test');
const assert = require('node:assert');
const Statics3DPhysics = require('../src/statics3dPhysics.js');

describe('3D Statics Physics Engine Tests', () => {
  it('Symmetric 3-Cable Tripod: equal tensions and zero horizontal net force', () => {
    // 3 anchors in horizontal plane Y = 30 cm, forming symmetric triangle:
    // Radius R = 20 cm
    // Angle 0: (20, 30, 0)
    // Angle 120 deg: (-10, 30, 17.32)
    // Angle 240 deg: (-10, 30, -17.32)
    const a1 = { x: 20, y: 30, z: 0 };
    const a2 = { x: -10, y: 30, z: 17.320508 };
    const a3 = { x: -10, y: 30, z: -17.320508 };

    // Knot at (0, 10, 0) (centered directly below origin)
    const knot = { x: 0, y: 10, z: 0 };
    const massKg = 0.600;
    const g = 9.80;

    const res = Statics3DPhysics.calculateEquilibrium(knot, a1, a2, a3, massKg, g, false);

    assert.strictEqual(res.isStable, true, 'Symmetric tripod must be physically stable');

    // All 3 tensions should be identical due to symmetry
    assert.ok(Math.abs(res.tensions.t1 - res.tensions.t2) < 1e-4, 'T1 and T2 must match');
    assert.ok(Math.abs(res.tensions.t2 - res.tensions.t3) < 1e-4, 'T2 and T3 must match');

    // Net force components must be exactly 0
    assert.ok(Math.abs(res.netForce.sumFx) < 1e-5, 'Sum Fx must be 0');
    assert.ok(Math.abs(res.netForce.sumFy) < 1e-5, 'Sum Fy must be 0');
    assert.ok(Math.abs(res.netForce.sumFz) < 1e-5, 'Sum Fz must be 0');

    // Vertical components sum must equal weight
    const totalVerticalTension = res.components.t1y + res.components.t2y + res.components.t3y;
    assert.ok(Math.abs(totalVerticalTension - res.Fg) < 1e-5, 'Vertical tension must support weight');
  });

  it('Asymmetric 3D Setup: balances all 3 force components (Fx, Fy, Fz)', () => {
    // 3 anchors at varying heights and irregular positions
    const a1 = { x: 25, y: 32, z: 8 };
    const a2 = { x: -18, y: 28, z: 22 };
    const a3 = { x: -12, y: 35, z: -25 };

    // Knot at (2, 8, 3)
    const knot = { x: 2, y: 8, z: 3 };
    const massKg = 0.750;
    const g = 9.80;

    const res = Statics3DPhysics.calculateEquilibrium(knot, a1, a2, a3, massKg, g, false);

    assert.strictEqual(res.isStable, true, 'Knot inside anchor envelope must be stable');

    // Verify static equilibrium in 3D:
    assert.ok(Math.abs(res.netForce.sumFx) < 1e-5, `Sum Fx was ${res.netForce.sumFx}`);
    assert.ok(Math.abs(res.netForce.sumFy) < 1e-5, `Sum Fy was ${res.netForce.sumFy}`);
    assert.ok(Math.abs(res.netForce.sumFz) < 1e-5, `Sum Fz was ${res.netForce.sumFz}`);
  });

  it('Mass Reconstruction from 3D Unit Vectors and Tensions', () => {
    const a1 = { x: 22, y: 30, z: 5 };
    const a2 = { x: -15, y: 28, z: 18 };
    const a3 = { x: -10, y: 32, z: -20 };
    const knot = { x: 0, y: 12, z: 0 };
    const actualMassKg = 0.500;
    const g = 9.80;

    const res = Statics3DPhysics.calculateEquilibrium(knot, a1, a2, a3, actualMassKg, g, false);

    // Reconstruct mass from measured values: m = (T1·u1y + T2·u2y + T3·u3y) / g
    const reconstructed = Statics3DPhysics.reconstructMass(
      res.tensions.t1, res.unitVectors.u1.y,
      res.tensions.t2, res.unitVectors.u2.y,
      res.tensions.t3, res.unitVectors.u3.y,
      g
    );

    assert.ok(Math.abs(reconstructed.calcMassKg - actualMassKg) < 1e-5, 'Reconstructed mass must match actual mass');
    
    const evaluation = Statics3DPhysics.evaluateError(reconstructed.calcMassG, actualMassKg * 1000);
    assert.strictEqual(evaluation.isExcellent, true, 'Ideal reconstruction should have 0% error');
    assert.ok(evaluation.percentError < 0.01, 'Percent error must be virtually 0');
  });

  it('Real Lab Mode: Spring stretch and uncertainty', () => {
    const a1 = { x: 20, y: 30, z: 0 };
    const a2 = { x: -10, y: 30, z: 17.32 };
    const a3 = { x: -10, y: 30, z: -17.32 };
    const knot = { x: 0, y: 10, z: 0 };
    const massKg = 0.500;

    const res = Statics3DPhysics.calculateEquilibrium(knot, a1, a2, a3, massKg, 9.80, true);

    assert.ok(res.springDeltas.springDelta1 > 0, 'Internal spring must stretch under tension');
    assert.ok(typeof res.readTensions.t1 === 'number', 'Scale reading must be present');
    
    // Scale readability resolution test (rounded to 0.1 N)
    const isTenth = (val) => Math.abs(val * 10 - Math.round(val * 10)) < 1e-4;
    assert.ok(isTenth(res.readTensions.t1), 'Scale reading must be graduated to 0.1 N');
  });
});
