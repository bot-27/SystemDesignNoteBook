# System Design Whiteboard

A local, offline-first system design whiteboard built with React, ReactFlow, and TailwindCSS. Design architectures, draw connections, add component-specific notes, and save your progress locally.

## 🚀 Getting Started

### 1. Installation

Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

Clone the repository and install the dependencies:

```bash
# Clone the repository
git clone <your-repo-url>
cd SystemDesignNotePad

# Install dependencies
npm install
```

### 2. Running the Application

You can start the development server using the provided batch script or via npm directly:

**Option A (Windows):**
Double-click the `start.bat` file in the root directory, or run it from the command line:
```bash
.\start.bat
```

**Option B (All Platforms):**
```bash
npm run dev
```

The application will start and be available at `http://localhost:5174` (or another port if 5174 is in use).

---

## 🛠️ Features & Usage Flow

### Drag and Drop Components
* **Sidebar:** On the left, you'll find a categorized list of 34 system design components (Clients, Networking, Compute, Storage, Messaging, Platform).
* **Action:** Drag any component from the sidebar and drop it onto the main canvas.

### Connect Nodes
* Every component has 4 handles (Top, Bottom, Left, Right).
* Green handles (Bottom, Right) are connection sources.
* Blue handles (Top, Left) are connection targets.
* **Action:** Click and drag from a green handle to a blue handle to create a directed arrow connecting two components.

### Customize Labels & Protocols
* **Nodes:** Double-click the label of any node (e.g., "SQL Database") to rename it to something specific (e.g., "User Postgres DB").
* **Edges:** Double-click the `···` symbol on any connecting line to define the protocol or action (e.g., "REST", "gRPC", "TCP").

### Add Component Notes & Context
* Each component on the canvas has a small **Document/Note icon** on the right side.
* **Action:** Click this icon to open a multi-line text area. You can write details about what the service does, why it was chosen, rate limits, etc.
* Click outside the text box to save the note. The note will neatly display beneath the component's title.

### Save and Load Locally
* The whiteboard runs entirely locally in your browser.
* **Save:** Click the **Save** button in the top right corner to instantly download your current architecture as a `system-design.json` file. This saves all nodes, edges, labels, and notes.
* **Load:** Click the **Load** button to upload a previously saved JSON file and instantly restore your whiteboard exactly as you left it.

### Canvas Controls
* **Delete:** Select any node or edge and press `Backspace` to delete it.
* **Pan & Zoom:** Click and drag the background to pan around the canvas. Use the scroll wheel or the controls in the bottom right corner to zoom in and out.
* **Minimap:** Use the minimap in the bottom left to quickly navigate large architectures.

## 💻 Tech Stack
* **React** + **Vite** (TypeScript)
* **ReactFlow** (Canvas, Nodes, Edges, State Management)
* **TailwindCSS v4** (Styling)
* **Lucide React** (Icons)
