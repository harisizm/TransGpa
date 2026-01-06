# TransGPA 🎓

**TransGPA** is a powerful, client-side academic tool designed to help students visualize, plan, and optimize their educational journey. It transforms static transcript PDFs into dynamic, interactive dashboards, empowering students to take control of their CGPA.

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

---

## ✨ Key Features

### 📄 Instant PDF Parsing
- Drag & drop your official university transcript (optimized for UOL format).
- Advanced regex engine automatically extracts student details, semesters, courses, credit hours, and grades.

### 🏗️ GPA Builder (Manual Mode)
- Don't have a transcript handy? Use the **GPA Builder**.
- Manually input semesters and courses in a clean, "Zero-Knowledge" environment.
- Perfect for freshers or students from other universities.

### 🧮 Interactive Grade Simulation
- **"What-if" Analysis**: Change past grades to see how retakes would affect your CGPA.
- **Real-time Calculation**: SGPA and CGPA update instantly as you type or select grades.
- **Smart Logic**: Automatically applies "Best Grade" policies for repeated courses.

### 🔮 Future Projections
- Add "Future Semesters" to your timeline.
- Plan your course load and set target grades to visualize your path to graduation.

### 📊 Deep Analytics
- **GPA Trend Line**: Track your performance trajectory.
- **Grade Distribution**: See the breakdown of your As, Bs, and Fs.
- **Seasonal Analysis**: Compare Spring vs. Fall performance.
- **Credit Load**: Understand the correlation between workload and GPA.

---

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
- **No Database**: We do not store your grades, student ID, or personal information.
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

---

## 📖 Usage Guide

1. **Upload**: Drop your PDF transcript on the home screen.
2. **Review**: Check the parsed "Transcript Mode" view.
3. **Simulate**: Click on any grade (e.g., 'B+') to change it to an 'A' and watch the CGPA recalculate.
4. **Project**: Scroll to the bottom and click **"Add Future Semester"**. Add courses like "Final Year Project" with expected grades.
5. **Analyze**: Click the **"Analytics"** button (top right) to see visual graphs of your performance.

---

## 🤝 Contributing
Contributions are welcome! Please open an issue or submit a pull request for any bugs or feature enhancements.

## 📄 License
This project is open-source and available under the **MIT License**.

## ❤️ Support
Built with passion by **[Haris Iftikhar](https://www.linkedin.com/in/harisizm/)**.
If you find this tool useful, feel free to reach out on LinkedIn!
