# TransGPA 🎓

**TransGPA** is a powerful academic tool designed to help students visualize, plan, and optimize their educational journey. It transforms static transcript PDFs into dynamic, interactive dashboards, empowering students to take control of their CGPA.

![TransGPA Banner](https://via.placeholder.com/1200x600?text=TransGPA+Dashboard+Preview) 
*(Replace with actual screenshot)*

## 🚀 The Problem
University transcripts are often static PDF documents. They tell you *what happened*, but they don't help you plan *what's next*. Students struggle to answer simple questions like:
- *"What specific grades do I need next semester to reach a 3.5 CGPA?"*
- *"If I retake this 'D' grade and get an 'A', how much will my CGPA improve?"*
- *"What is my GPA trend over the last 4 semesters?"*

## 💡 The Solution
**TransGPA** parses your official transcript directly in the browser (zero privacy risk!) and converts it into a malleable dataset.
- **Simulate**: Click any grade to change it and see the impact instantly.
- **Project**: Add future semesters and hypothetical courses to roadmap your degree.
- **Analyze**: Visualize your performance with professional-grade charts.


## 🛠️ Technology Stack
Built with modern web technologies for speed, performance, and type safety.

- **Framework**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Visualization**: [Recharts](https://recharts.org/)
- **PDF Processing**: [pdfjs-dist](https://mozilla.github.io/pdf.js/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🔒 Privacy First
TransGPA follows a strictly **Client-Side** architecture.
- **No Server Uploads**: Your PDF file is processed entirely within your browser's memory using Web Workers.
- **No Database**: We do not store your grades, student ID,etc.
- **Zero-Knowledge**: Once you close the tab, your data is gone.

---

## 🏁 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/harisizm/TransGPA.git
   cd TransGPA
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```


## ❤️ Support
If you find this tool useful, feel free to reach out on LinkedIn!
