# MorrOS

Interactive single-page "operating system" that showcases the career and work of polymath **Dr. Jordan Morris**.

Live version can be found here: (https://jordanmorris.co.uk)

## About Dr. Morris

- AI researcher, ASIC designer, electronic engineer, software and DevOps practitioner with 25+ years of programming experience across C/C++, Python, TypeScript, and more.
- 13+ years in digital (and some analog) ASIC hardware design spanning Cadence and Synopsys toolchains, asynchronous logic, subthreshold circuitry, and physical modelling.
- 8+ years in AI R&D focusing on bitwise and hardware-efficient AI architectures; currently exploring agentic AI systems.
- Based in the Bay Area (California, USA); dual British/Irish national holding a U.S. EB-1A green card.
- Contact: `jordan@jordanmorris.co.uk`

## Site Structure

- **Boot screen** transitions into a retro-inspired desktop environment branded as MorrOS.
- Top navigation surfaces windowed sections: About, Education, Projects, Publications, and Skills.
- Includes an autoplay looping profile video, live clock, and quick links to email, LinkedIn, ResearchGate, GitHub, Credly, Google Scholar, and Newcastle University profile pages.

## Career Highlights

- **Bitset Technologies** – Founder & CTO (Aug 2024 – Mar 2026).
- **Literal Labs** – Principal Engineer (Feb 2023 – Jan 2024).
- **POETS Project** – Research Associate (Aug 2019 – May 2023).

## Education

- PhD in VLSI Design and Semiconductor Physics, Newcastle University (2013 – 2018) – iCASE award sponsored by Arm; thesis on low-energy subthreshold standard cell libraries.
- MEng (summa cum laude) and BEng in Electrical & Electronic Engineering, Newcastle University (2009 – 2013).

## Selected Publications

- _Pre-Sorted Tsetlin Machine (The Genetic K-Medoid Method)_, ISTM 2024 (preprint).
- _An Event Driven Approach To Genotype Imputation On A RISC-V Cluster_, IEEE TCBB, 2023.
- _Event-based High Throughput Computing_ series, IET Computers & Digital Techniques, 2022.
- _A Subthreshold Layout Strategy for Faster and Lower Energy Complex Digital Circuits_, JLPEA, 2022.

## Skills Snapshot

- **AI & Software**: TensorFlow, PyTorch, Keras, CUDA, MPI, MERN, Next.js, SQL, Tailwind, Sass.
- **ASIC & Hardware**: Verilog/SystemVerilog, VHDL, Cadence (Xcelium, Genus, Innovus, Tempus, Voltus, Joules, Quantus, Pegasus, Conformal, JasperGold) and Synopsys (VCS, Design Compiler, IC Compiler, PrimeTime) flows.
- **Specialities**: Asynchronous logic design, subthreshold physics, hardware-efficient machine learning.

## External Training

- Broad portfolio of intensive courses between 2013–2023 covering hardware-efficient ML, Cadence/Synopsys ASIC implementation, FPGA design, advanced C, real-time UML, and mixed-signal IC design.

## Running Locally

This is a static site—open `index.html` in any modern browser, or serve the folder via a simple HTTP server (e.g., `python -m http.server`) to preview locally.

The first visit plays an eight-second desktop assembly animation, building the visible page from top to bottom and then placing the shortcut icons from left to right. Cursors appear as placements begin and retire when finished, so their number follows the work. They draw dashed selection boxes, and their tooltips name each element only while it is being constructed. Use **Skip intro** or Escape to finish immediately, or **MorrOS → Reboot** to watch it again. Reduced-motion preferences bypass the animation. Completion is remembered in local storage when available.

Append `?boot=1` to preview the intro on every reload, or `?skipBoot=1` to go straight to the desktop. The page content remains available when JavaScript is disabled, and the desktop is revealed if the animation script fails to load.

When deploying, upload `boot.css` and `boot.js` alongside the updated `index.html` and `script.js`.

## Repository Contents

- `index.html` – MorrOS desktop markup and content.
- `styles.css` – Retro terminal-inspired styling with responsive tweaks.
- `script.js` – Boot sequence, window management, live clock, and video playback control.
- `boot.js` and `boot.css` – Simulated worker cursors, staged desktop assembly, and startup controls.
- `images/` – Profile media and partner logos.
