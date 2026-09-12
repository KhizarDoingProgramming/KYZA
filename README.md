# KYZA: Next-Generation AI Assistant

<div align="center">
  
<img src="./public/favicon.jpeg" alt="KYZA Logo" width="120" style="border-radius: 24px; margin-bottom: 20px; box-shadow: 0 0 40px rgba(147, 51, 234, 0.4); border: 1px solid rgba(255,255,255,0.1);"/>

![KYZA Banner](https://capsule-render.vercel.app/api?type=waving&color=9333ea&height=250&section=header&text=KYZA&fontSize=90&animation=fadeIn&fontAlignY=38&desc=The%20Future%20of%20AI%20Interaction&descAlignY=51&descAlign=62)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-kyza.vercel.app-9333ea?style=for-the-badge&logo=vercel)](https://kyza.vercel.app)
[![Status](https://img.shields.io/badge/System-Online-success?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](#)

</div>

## System Overview

KYZA is an advanced, multi-modal AI assistant engineered for the modern web. Built with a focus on speed, immersion, and architectural elegance, KYZA operates as a high-performance terminal for human-AI interaction. 

We completely stripped away the clinical, boring interfaces of traditional chat applications and replaced them with our proprietary **"Void & Glow"** aesthetic. Inspired by the sleekness of Apple design and the dynamic micro-animations of Framer, KYZA features a deep dark canvas, frosted glassmorphism elements, and a mesmerizing WebGL shader background that makes the AI feel truly alive.

---

## 🎨 The "Void & Glow" Experience

KYZA's interface is designed to wow you at first glance:

- **Dynamic WebGL Background**: A custom-engineered Julia Set fractal shader runs natively via WebGL in the background, smoothly oscillating between deep violet and cyan to match the site's aesthetic.
- **Immersive Nina Mode**: Meet Nina, your 3D interactive avatar. Toggling Nina Mode launches a stunning, full-screen glassmorphic takeover complete with a simulated voice-activity visualizer for face-to-face interaction.
- **Docked Command Bar**: A sleek, hovering glass input bar puts all your tools exactly where you need them. Instantly toggle between text, voice dictation, image generation, web search, or immersive mode.
- **Premium Typography**: Built entirely on the beautiful, modern geometric **Outfit** typeface for maximum readability and a premium feel.

---

## 🧠 Core Capabilities

- **Neural Routing**: KYZA doesn't rely on a single model. It dynamically routes queries across specialized personas, adapting to complex logic, creative generation, or high-speed data retrieval.
- **Voice Dictation (TTS/STT)**: Integrated voice capabilities allow for hands-free data consumption and prompt generation.
- **Visual Rendering**: Direct integration with Pollinations AI allows the system to synthesize and render high-resolution images natively within the terminal output.
- **Persistent State**: Utilizing Supabase, all session data, configurations, and generated artifacts are synchronized in real-time across edge nodes, ensuring your environment is always exactly as you left it.
- **Ultra-Low Latency**: By interfacing with high-speed LLM inference engines (like Groq) via optimized proxies, KYZA achieves near-instantaneous token generation.

---

## 🎭 The Personas

KYZA operates through specialized, modular personas to handle varying workloads. You can hot-swap these directly from the input bar:

1. **Nova**: The primary logic processor. Optimized for deep reasoning and extreme speed.
2. **Atlas**: The knowledge generalist. Tuned for broad spectrum data retrieval and daily tasks.
3. **Helix**: The engineering module. Strictly programmed to output flawless code architectures, scripts, and technical documentation.
4. **Prism**: The generative engine. Capable of interpreting abstract prompts and synthesizing them into visual data.

---

## 🏗️ Technical Architecture

KYZA is built on a modern, highly scalable stack designed for edge deployment.

### Client-Side
- **React + TypeScript**: Enforcing strict type safety across the entire application state.
- **Vite**: Ultra-fast HMR and optimized production builds.
- **Framer Motion**: Powering fluid, physics-based micro-animations and layout transitions.
- **Three.js / React Three Fiber**: Powering the 3D, physics-enabled avatar systems and the custom WebGL background shaders.

### Server & Infrastructure
- **Node.js**: Edge-ready proxy routes to securely handle API traffic and obfuscate secure keys.
- **Supabase**: Real-time Postgres database and secure biometric/password authentication.
- **Vercel**: Global edge network for zero-configuration, zero-downtime deployments.

---

## 🚀 Initialization (Local Setup)

To deploy the KYZA framework to your local environment, initialize the sequence below:

```bash
# 1. Clone the repository
git clone https://github.com/KhizaDoingProgramming/KYZA.git

# 2. Navigate to the project root
cd KYZA

# 3. Install required dependencies
npm install

# 4. Configure environment parameters
cp .env.example .env
# Edit the .env file in your editor to include the required API keys (Supabase, Groq, etc.)
# (The .env file is safely ignored by Git to prevent unauthorized access)

# 5. Initialize the development server
npm run dev
```

The system will now be active on `localhost:5173`.

---

## 🤝 System Contributions

KYZA is an open framework. We welcome updates to the neural architecture, UI refinements, or backend optimizations.

1. Fork the repository
2. Checkout a new branch (`git checkout -b feature/optimization`)
3. Commit your modifications (`git commit -m 'Implement optimization'`)
4. Push to the branch (`git push origin feature/optimization`)
5. Submit a Pull Request for review.

---

<div align="center">
  <br/>
  <p>Engineered by <a href="https://github.com/KhizaDoingProgramming">KhizaDoingProgramming</a></p>
</div>
