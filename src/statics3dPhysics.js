/**
 * 3D Statics Physics Engine (No DOM dependencies)
 * Solves 3D static equilibrium for a mass suspended by 3 non-coplanar cables.
 * 
 * Equations of Equilibrium:
 *   Σ Fx = T1·u1x + T2·u2x + T3·u3x = 0
 *   Σ Fy = T1·u1y + T2·u2y + T3·u3y - m·g = 0
 *   Σ Fz = T1·u1z + T2·u2z + T3·u3z = 0
 * 
 * Where:
 *   u_i = (Anchor_i - Knot) / ||Anchor_i - Knot|| = unit direction vector
 */

(function (root, factory) {
  const lib = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = lib;
  }
  if (typeof root !== 'undefined') {
    root.Statics3DPhysics = lib;
  }
}(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function () {
  'use strict';

  // 3D Vector Math Utility
  const Vec3 = {
    create: (x = 0, y = 0, z = 0) => ({ x, y, z }),
    sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
    add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
    scale: (v, s) => ({ x: v.x * s, y: v.y * s, z: v.z * s }),
    dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
    cross: (a, b) => ({
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    }),
    magnitude: (v) => Math.hypot(v.x, v.y, v.z),
    normalize: (v) => {
      const mag = Math.hypot(v.x, v.y, v.z);
      if (mag === 0) return { x: 0, y: 0, z: 0 };
      return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
    }
  };

  /**
   * Determinant of a 3x3 matrix:
   * | a1 a2 a3 |
   * | b1 b2 b3 |
   * | c1 c2 c3 |
   */
  function det3x3(a1, a2, a3, b1, b2, b3, c1, c2, c3) {
    return (
      a1 * (b2 * c3 - b3 * c2) -
      a2 * (b1 * c3 - b3 * c1) +
      a3 * (b1 * c2 - b2 * c1)
    );
  }

  /**
   * Calculates 3D static equilibrium for 3 cables supporting a hanging mass.
   * 
   * @param {Object} knot - { x, y, z } in cm (Y is vertical upward)
   * @param {Object} a1 - Anchor 1 { x, y, z } in cm
   * @param {Object} a2 - Anchor 2 { x, y, z } in cm
   * @param {Object} a3 - Anchor 3 { x, y, z } in cm
   * @param {number} massKg - Hanging mass in kg
   * @param {number} g - Gravitational acceleration (default 9.80 m/s^2)
   * @param {boolean} isRealLab - Whether to simulate internal spring stretch & uncertainty
   * @returns {Object} Full equilibrium geometry, unit vectors, tensions, components
   */
  function calculateEquilibrium(nominalKnot, a1, a2, a3, massKg, g = 9.80, isRealLab = false) {
    const knot = { ...nominalKnot };

    // In Real Lab Mode: Hooke's Law elastic cable & spring stretch causes the knot to sag downward!
    // Nominal reference load: 0.500 kg (y = nominalKnot.y = 12 cm)
    // Effective vertical stiffness of the 3-cable tripod system: k_eff ~ 1.9 N/cm
    let elasticSagY = 0;
    if (isRealLab) {
      const kEff = 1.9; // N/cm
      elasticSagY = ((massKg - 0.500) * g) / kEff;
      knot.y = Math.max(4.0, nominalKnot.y - elasticSagY);
    }

    // 1. Cables displacement vectors (from knot pointing to anchors)
    const d1 = Vec3.sub(a1, knot);
    const d2 = Vec3.sub(a2, knot);
    const d3 = Vec3.sub(a3, knot);

    const len1 = Vec3.magnitude(d1);
    const len2 = Vec3.magnitude(d2);
    const len3 = Vec3.magnitude(d3);

    // Unit direction vectors
    const u1 = Vec3.normalize(d1);
    const u2 = Vec3.normalize(d2);
    const u3 = Vec3.normalize(d3);

    // Gravity force vector (pointing downward along -Y)
    const Fg = massKg * g;

    // 2. Linear system matrix:
    // [ u1x  u2x  u3x ] [ T1 ]   [  0 ]
    // [ u1y  u2y  u3y ] [ T2 ] = [ Fg ]
    // [ u1z  u2z  u3z ] [ T3 ]   [  0 ]
    const D = det3x3(
      u1.x, u2.x, u3.x,
      u1.y, u2.y, u3.y,
      u1.z, u2.z, u3.z
    );

    let isStable = Math.abs(D) > 1e-5;
    let t1 = 0;
    let t2 = 0;
    let t3 = 0;

    if (isStable) {
      // Cramer's rule for T1: replace col 1 with [0, Fg, 0]
      const D1 = det3x3(
        0, u2.x, u3.x,
        Fg, u2.y, u3.y,
        0, u2.z, u3.z
      );

      // Cramer's rule for T2: replace col 2 with [0, Fg, 0]
      const D2 = det3x3(
        u1.x, 0, u3.x,
        u1.y, Fg, u3.y,
        u1.z, 0, u3.z
      );

      // Cramer's rule for T3: replace col 3 with [0, Fg, 0]
      const D3 = det3x3(
        u1.x, u2.x, 0,
        u1.y, u2.y, Fg,
        u1.z, u2.z, 0
      );

      t1 = D1 / D;
      t2 = D2 / D;
      t3 = D3 / D;

      // Cables can only pull (tension >= 0). If any T < 0, knot is outside supporting triangle.
      if (t1 < 0 || t2 < 0 || t3 < 0) {
        isStable = false;
      }
    }

    // Force components for each cable
    let t1x = t1 * u1.x;
    let t1y = t1 * u1.y;
    let t1z = t1 * u1.z;

    let t2x = t2 * u2.x;
    let t2y = t2 * u2.y;
    let t2z = t2 * u2.z;

    let t3x = t3 * u3.x;
    let t3y = t3 * u3.y;
    let t3z = t3 * u3.z;

    // Real Lab Mode: Spring stretch and instrument reading noise
    let readT1 = t1;
    let readT2 = t2;
    let readT3 = t3;
    let springDelta1 = 0;
    let springDelta2 = 0;
    let springDelta3 = 0;

    if (isRealLab) {
      // Spring constant k = 1.2 N/cm
      const k = 1.2;
      springDelta1 = t1 / k;
      springDelta2 = t2 / k;
      springDelta3 = t3 / k;

      // Scale readability rounded to 0.1 N with realistic precision
      readT1 = Math.round(t1 * 10) / 10;
      readT2 = Math.round(t2 * 10) / 10;
      readT3 = Math.round(t3 * 10) / 10;
    }

    // Net force components
    const sumFx = t1x + t2x + t3x;
    const sumFy = t1y + t2y + t3y - Fg;
    const sumFz = t1z + t2z + t3z;

    // Direction cosines (angles with coordinate axes: α with X, β with Y, γ with Z)
    const angles1 = {
      alphaDeg: Math.acos(Math.max(-1, Math.min(1, u1.x))) * (180 / Math.PI),
      betaDeg: Math.acos(Math.max(-1, Math.min(1, u1.y))) * (180 / Math.PI),
      gammaDeg: Math.acos(Math.max(-1, Math.min(1, u1.z))) * (180 / Math.PI)
    };

    const angles2 = {
      alphaDeg: Math.acos(Math.max(-1, Math.min(1, u2.x))) * (180 / Math.PI),
      betaDeg: Math.acos(Math.max(-1, Math.min(1, u2.y))) * (180 / Math.PI),
      gammaDeg: Math.acos(Math.max(-1, Math.min(1, u2.z))) * (180 / Math.PI)
    };

    const angles3 = {
      alphaDeg: Math.acos(Math.max(-1, Math.min(1, u3.x))) * (180 / Math.PI),
      betaDeg: Math.acos(Math.max(-1, Math.min(1, u3.y))) * (180 / Math.PI),
      gammaDeg: Math.acos(Math.max(-1, Math.min(1, u3.z))) * (180 / Math.PI)
    };

    return {
      knot,
      anchors: { a1, a2, a3 },
      lengths: { len1, len2, len3 },
      unitVectors: { u1, u2, u3 },
      angles: { angles1, angles2, angles3 },
      Fg,
      massKg,
      g,
      tensions: { t1, t2, t3 },
      readTensions: { t1: readT1, t2: readT2, t3: readT3 },
      components: {
        t1x, t1y, t1z,
        t2x, t2y, t2z,
        t3x, t3y, t3z
      },
      netForce: { sumFx, sumFy, sumFz },
      springDeltas: { springDelta1, springDelta2, springDelta3 },
      elasticSagY,
      isStable,
      det: D
    };
  }

  /**
   * Reconstructs hanging mass from measured tensions and measured unit vectors.
   * In 3D: m = (T1·u1y + T2·u2y + T3·u3y) / g
   */
  function reconstructMass(t1, u1y, t2, u2y, t3, u3y, g = 9.80) {
    const totalFy = t1 * u1y + t2 * u2y + t3 * u3y;
    const calcMassKg = totalFy / g;
    return {
      totalFy,
      calcMassKg,
      calcMassG: calcMassKg * 1000
    };
  }

  /**
   * Evaluates percent error between calculated and actual mass.
   */
  function evaluateError(calcMassG, actualMassG) {
    const errorG = Math.abs(calcMassG - actualMassG);
    const percentError = (errorG / actualMassG) * 100;
    return {
      errorG,
      percentError,
      isExcellent: percentError <= 2.5,
      isAcceptable: percentError <= 6.0
    };
  }

  return {
    Vec3,
    det3x3,
    calculateEquilibrium,
    reconstructMass,
    evaluateError
  };
}));
