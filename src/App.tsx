import { useState, useEffect } from 'react';
import { Dropzone } from './components/Dropzone';
import { TranscriptView } from './components/TranscriptView';
import { type TranscriptData, extractTextFromPDF, parseTranscript } from './lib/pdf-parser';
import { Loader2, ArrowUp, Github, Linkedin, Globe } from 'lucide-react';

function App() {
  const [data, setData] = useState<TranscriptData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const text = await extractTextFromPDF(file);
      const parsedData = parseTranscript(text);
      if (parsedData.semesters.length === 0) {
        throw new Error("Could not find any semester data. Please check the PDF format.");
      }
      setData(parsedData);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to parse transcript.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const startManualMode = () => {
    const initId = `future-sem-${Date.now()}`;
    setData({
      student: {
        name: "Guest User",
        fatherName: "-",
        studentNo: "MANUAL-ENTRY",
        program: "B.Sc Software Engineering",
        regStatus: "Active"
      },
      semesters: [{
        id: initId,
        name: "Semester 1",
        courses: [{
          code: "COURSE-1",
          title: "",
          credits: 3.0,
          grade: "C",
          points: 6.0,
          isRepeat: false
        }],
        sgpa: 2.0,
        totalPoints: 6.0,
        totalCredits: 3.0
      }]
    });
  };

  const handleReset = () => {
    setData(null);
    setError(null);
  };

  const isManual = data?.student.studentNo === 'MANUAL-ENTRY';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Navbar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 w-1/4">
            <button
              onClick={handleReset}
              className="group flex items-center gap-2 cursor-pointer p-1 -ml-1 rounded-lg hover:bg-slate-50 transition-colors"
              title="TransGPA Home"
            >
              <img src="/uol.png" alt="UOL Logo" className="w-6 h-6 object-contain" />
              <span className="text-base font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent hidden sm:inline-block group-hover:from-blue-600 group-hover:to-blue-500 transition-all">
                TransGPA
              </span>
            </button>
          </div>

          <div className="flex-1 flex justify-center">
            <nav className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-full border border-slate-200 shadow-sm backdrop-blur-sm">
              <button
                onClick={handleReset}
                className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-full transition-all duration-300 cursor-pointer ${!data
                  ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                  }`}
              >
                Transcript Mode
              </button>
              <button
                onClick={startManualMode}
                className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-full transition-all duration-300 cursor-pointer ${isManual
                  ? 'bg-white text-purple-600 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-purple-600 hover:bg-white/50'
                  }`}
              >
                GPA Builder
              </button>
              {data && (
                <button
                  onClick={() => scrollToSection('grading-policy')}
                  className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 hover:text-slate-800 hover:bg-white/50 rounded-full transition-all duration-300 cursor-pointer hidden sm:block"
                >
                  Grading Criteria
                </button>
              )}
              <button
                onClick={() => scrollToSection('support')}
                className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 hover:text-slate-800 hover:bg-white/50 rounded-full transition-all duration-300 cursor-pointer"
              >
                Support
              </button>
            </nav>
          </div>

          <div className="w-1/4 flex justify-end">
            <a href="#support" className="text-[10px] font-medium text-slate-400 hover:text-blue-600 transition-colors">
              v1.0.0
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full py-4 px-4 relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[50vh] animate-in fade-in duration-500">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
            <h3 className="text-base font-semibold text-slate-700">Analyzing your transcript...</h3>
            <p className="text-slate-400 text-xs">Extracting semantics, courses, and grades.</p>
          </div>
        ) : data ? (
          <TranscriptView data={data} onReset={handleReset} />
        ) : (
          <div className="max-w-3xl mx-auto flex flex-col items-center gap-8 mt-12 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center space-y-4">
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">
                Visualize Your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Academic Journey.</span>
              </h1>
              <p className="text-base text-slate-600 max-w-lg mx-auto leading-relaxed font-medium">
                Upload your official UOL transcript to instantly calculate your CGPA, simulate grade improvements, and plan your success.
              </p>
            </div>

            <Dropzone onFileSelect={handleFileUpload} />

            <div className="flex flex-col items-center gap-3 animate-in fade-in duration-700 delay-150 mt-4">
              <div className="flex items-center gap-3 w-full max-w-xs">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold bg-slate-50 px-2">Or</span>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>
              <button
                onClick={startManualMode}
                className="group flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 shadow-sm rounded-full hover:border-purple-200 hover:shadow-md hover:scale-[1.02] transition-all duration-300 cursor-pointer"
              >
                <div className="w-2 h-2 rounded-full bg-purple-500 group-hover:animate-pulse" />
                <span className="text-sm font-bold text-slate-600 group-hover:text-purple-700">
                  Enter GPA Builder
                </span>
              </button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-6 py-4 rounded-xl border border-red-100 max-w-4xl text-center mx-auto overflow-hidden mt-8">
                <p className="font-semibold mb-2">Parsing Failed</p>
                <div className="text-xs opacity-90 font-mono text-left whitespace-pre-wrap max-h-96 overflow-y-auto bg-white p-4 rounded border border-red-200 select-text">
                  {error}
                </div>
                <p className="text-xs mt-2 text-slate-500">Please copy the text above and share it with support.</p>
              </div>
            )}
          </div>
        )}

        {/* Scroll to Top Button */}
        <button
          onClick={scrollToTop}
          className={`fixed bottom-8 right-8 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-500 z-50 cursor-pointer ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-6 h-6" />
        </button>

        {/* Support Section */}
        <section id="support" className="max-w-4xl mx-auto mt-24 mb-12 px-4 animate-in fade-in duration-700">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10 text-center space-y-6">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">About TransGPA</h2>

              <div className="flex flex-col gap-4 text-slate-300 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
                <p>
                  TransGPA is a powerful, client-side academic tool designed to help students visualize and plan their educational journey.
                  By parsing standard PDF transcripts directly in your browser, it transforms static data into an interactive dashboard,
                  allowing for real-time grade simulation, future GPA projection, and in-depth performance analytics.
                </p>
                <p>
                  Built with privacy as a priority, all processing happens locally on your device—your academic data never leaves your browser.
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 mt-8 w-full max-w-md mx-auto">
                <p className="text-sm text-slate-400">
                  Have any questions or feature requests? <br />
                  <a
                    href="https://www.linkedin.com/in/harisizm/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-white font-bold hover:text-blue-400 hover:underline mt-2 transition-colors cursor-pointer"
                  >
                    <Linkedin className="w-4 h-4" />
                    Feel free to reach out on LinkedIn
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-4 text-center">
          <p className="text-slate-500 text-xs font-medium">
            Made with <span className="text-red-500">♥</span> by <a href="https://www.linkedin.com/in/harisizm/" target="_blank" rel="noopener noreferrer" className="text-slate-900 font-bold hover:underline">harisizm</a>
          </p>
          <div className="flex items-center gap-6">
            <a
              href="https://harisifti.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-900 transition-colors transform hover:scale-110"
              title="Portfolio"
            >
              <Globe className="w-5 h-5" />
            </a>
            <a
              href="https://www.linkedin.com/in/harisizm/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-blue-700 transition-colors transform hover:scale-110"
              title="LinkedIn"
            >
              <Linkedin className="w-5 h-5" />
            </a>
            <a
              href="https://github.com/harisizm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-900 transition-colors transform hover:scale-110"
              title="GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
