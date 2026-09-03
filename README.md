# 3D Statics: 3-Cable Equilibrium Lab (AP Physics C)

An interactive, research-grade 3D statics simulation for AP Physics C and introductory engineering mechanics. Part of **The Thinking Experiment** (PhysicsKit) physics curriculum.

🌐 **Live Simulation:** [https://thinking-experiment-sims.github.io/statics-3d-sim/](https://thinking-experiment-sims.github.io/statics-3d-sim/)

---

## 🔬 Curricular Alignment: AP Physics C & Multivariable Vector Statics

In 2D statics, forces are coplanar and can be resolved using simple 2-variable trigonometry. In real-world physics and 3D statics, forces are non-coplanar and require multivariable vector resolution:

$$\sum \vec{F} = \vec{T}_1 + \vec{T}_2 + \vec{T}_3 + \vec{F}_g = \vec{0}$$

$$\begin{cases}
T_1 u_{1x} + T_2 u_{2x} + T_3 u_{3x} = 0 \\
T_1 u_{1y} + T_2 u_{2y} + T_3 u_{3y} = mg \\
T_1 u_{1z} + T_2 u_{2z} + T_3 u_{3z} = 0
\end{cases}$$

Where each unit direction vector is given by:

$$\hat{u}_i = \frac{\Delta \vec{r}_i}{L_i} = \left\langle \frac{x_i - x_k}{L_i}, \frac{y_i - y_k}{L_i}, \frac{z_i - z_k}{L_i} \right\rangle = \langle \cos\alpha_i, \cos\beta_i, \cos\gamma_i \rangle$$

---

## 🚀 Key Features

- **360° Lightweight 3D Canvas Orbit Engine:**
  - Orbit, pan, and zoom around the apparatus using pure Canvas 2D perspective projection with zero external dependencies (no Three.js or WebGL needed).
  - Quick camera presets: `3D Orbit`, `Top (X-Z)` (overhead), `Front (X-Y)` (front elevation), `Side (Z-Y)` (side profile).
- **Three Vertical Zoomed Scales (`🔍 Zoomed Scales`):**
  - High-resolution Vernier spring scale panels displaying $0 \to 10\text{ N}$ with $0.2\text{ N}$ graduations, helical coils, and live red indicators for millimeter-precision reading.
- **AP Physics C 3D Coordinates & Angles HUD (`📏 3D Coords HUD`):**
  - Live metric telemetry displaying knot coordinates $(x_k, y_k, z_k)$, displacement vectors $\Delta \vec{r}$, cable lengths $L_i$, and true elevation angles $\theta_{\text{elev}} = \arcsin(\Delta y_i / L_i)$.
- **Virtual Dual-Scale Protractor:**
  - Teal Outer Scale ($0^\circ \to 180^\circ$) and Amber Inner Scale ($180^\circ \to 0^\circ$).
  - Instant knot snapping and cable alignment presets.
- **Real Lab Mode vs. Ideal Physics:**
  - Switch between ideal analytical equilibrium and realistic experimental conditions with spring sag and measurement uncertainty ($\pm 0.05\text{ N}$).
- **Mystery Mass Challenge:**
  - Mystery weights ($A, B, C, D$) where students measure 3D cable directions and spring scale deflections to calculate the unknown mass.
- **4-Column 3D Force Resolution Workbench:**
  - Students enter measured angles and tensions to calculate $F_x, F_y, F_z$ components and verify $\Sigma F = 0$.

---

## 💻 Local Development

No build steps, bundlers, or package managers required. Simply open `index.html` in any modern web browser:

```bash
open statics-3d-sim/index.html
```

To run unit tests:

```bash
node --test statics-3d-sim/tests/statics3dPhysics.test.js
```

---

## 🎨 Design System

Adheres strictly to **The Thinking Experiment** Design System:
- **Primary Teal:** `#0f7e9b`
- **Amber Accent:** `#d67b19`
- **Banned Colors:** NO Purple (`#59118e`) and NO Gold (`#ffc61e`).

---

## 📄 License

Educational open source — The Thinking Experiment.
