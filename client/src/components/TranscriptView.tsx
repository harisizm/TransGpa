
import { useState, useEffect } from 'react';
import type { TranscriptData, Semester } from '../lib/pdf-parser';
import { getGradePoints, GRADES_ORDER } from '../lib/pdf-parser';
import { calculateSemesterProgressions, calculateCGPA } from '../lib/gpa-engine';
import { cn } from '../utils/cn';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { X, Plus, Trash2 } from 'lucide-react';

interface TranscriptViewProps {
  data: TranscriptData;
  onReset: () => void;
}

export function TranscriptView({ data, onReset }: TranscriptViewProps) {
  const { student } = data;

  // Local state for simulation
  const [simulatedSemesters, setSimulatedSemesters] = useState<Semester[]>(data.semesters);
  const [showTutorial, setShowTutorial] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sync state if prop changes (re-upload)
  useEffect(() => {
    setSimulatedSemesters(data.semesters);
  }, [data]);

  const progressions = calculateSemesterProgressions(simulatedSemesters);

  // Helper to re-calculate generic stats for a semester
  const recalculateSemester = (sem: Semester): Semester => {
    const effectiveCourses = sem.courses.filter(c => c.grade !== 'W' && c.grade !== 'I');
    const totalCredits = effectiveCourses.reduce((sum, c) => sum + (c.credits || 0), 0);
    const totalPoints = effectiveCourses.reduce((sum, c) => sum + (c.points || 0), 0);
    const sgpa = totalCredits > 0 ? totalPoints / totalCredits : 0;

    return { ...sem, sgpa, totalCredits, totalPoints };
  };

  const handleGradeChange = (semId: string, courseCode: string, newGrade: string) => {
    setSimulatedSemesters(prev => prev.map(sem => {
      if (sem.id !== semId) return sem;
      const newCourses = sem.courses.map(course => {
        if (course.code !== courseCode) return course;
        const newPoints = getGradePoints(newGrade) * (newGrade === 'W' ? 0 : course.credits);
        return { ...course, grade: newGrade, points: newPoints };
      });
      return recalculateSemester({ ...sem, courses: newCourses });
    }));
  };

  const handleCourseEdit = (semId: string, courseCode: string, field: 'credits' | 'code' | 'title', value: string) => {
    setSimulatedSemesters(prev => prev.map(sem => {
      if (sem.id !== semId) return sem;
      const newCourses = sem.courses.map(course => {
        if (course.code !== courseCode) return course;

        const updated = { ...course };
        if (field === 'credits') {
          const val = parseFloat(value);
          updated.credits = isNaN(val) ? 0 : val;
          // Recalc points if credits change
          updated.points = getGradePoints(updated.grade) * (updated.grade === 'W' ? 0 : updated.credits);
        } else if (field === 'code') {
          updated.code = value;
        } else if (field === 'title') {
          updated.title = value;
        }
        return updated;
      });
      return recalculateSemester({ ...sem, courses: newCourses });
    }));
  };

  const addSemester = () => {
    const newId = `future-sem-${Date.now()}`;
    const newSem: Semester = {
      id: newId,
      name: `Future Semester ${simulatedSemesters.length + 1}`,
      courses: [],
      sgpa: 0,
      totalPoints: 0,
      totalCredits: 0
    };
    setSimulatedSemesters(prev => [...prev, newSem]);
    // Auto-add one course for convenience
    addCourse(newId);
  };

  const addCourse = (semId: string) => {
    setSimulatedSemesters(prev => prev.map(sem => {
      if (sem.id !== semId) return sem;
      const newCourse = {
        code: `NEW-${Date.now()}`, // Temporary unique ID
        title: '',
        credits: 3.0,
        grade: 'C', // Default average
        points: 6.0,
        isRepeat: false
      };
      return recalculateSemester({ ...sem, courses: [...sem.courses, newCourse] });
    }));
  };

  const deleteCourse = (semId: string, courseCode: string) => {
    setSimulatedSemesters(prev => prev.map(sem => {
      if (sem.id !== semId) return sem;
      const newCourses = sem.courses.filter(c => c.code !== courseCode);
      return recalculateSemester({ ...sem, courses: newCourses });
    }));
  };

  const deleteSemester = (semId: string) => {
    setSimulatedSemesters(prev => prev.filter(s => s.id !== semId));
  };


  // Calculate specific "Transcript Totals"
  const totalAttemptedRaw = simulatedSemesters.reduce((acc, sem) => {
    return acc + sem.courses.reduce((cAcc, c) => cAcc + (c.grade === 'W' ? 0 : c.credits), 0);
  }, 0);

  const finalGpaResult = calculateCGPA(simulatedSemesters);
  const currentCgpaVal = parseFloat(finalGpaResult.cgpa);

  // Custom Color Logic for CGPA (User Request: < 2.0 Red, > 3.0 Green)
  const getCgpaColor = (cgpa: number | string) => {
    const val = typeof cgpa === 'string' ? parseFloat(cgpa) : cgpa;
    if (val < 2.0) return "text-red-600 font-bold";
    if (val > 3.0) return "text-green-600 font-bold";
    return "text-slate-900"; // Default between 2.0 and 3.0
  };

  const standing = currentCgpaVal >= 2.0 ? "GOOD" : "PROBATION";
  const status = currentCgpaVal >= 2.0 ? "Promoted" : "Probation";

  const gradeOptions = [...GRADES_ORDER, 'W', 'I'];

  const isManual = student.studentNo === 'MANUAL-ENTRY';

  return (
    <div id="transcript-top" className="w-full max-w-[1920px] mx-auto p-4 animate-in fade-in duration-500 font-serif">
      <div className="flex flex-col lg:flex-row gap-8 items-start">

        {/* LEFT COLUMN - TRANSCRIPT (70%) */}
        <div className="w-full lg:w-[70%] space-y-4">

          {!isManual ? (
            <>
              {/* University Header (Blue theme as requested) */}
              <div className="bg-blue-600 p-4 rounded-none shadow-sm border border-blue-700 text-center space-y-1 text-white">
                <h1 className="text-xl font-bold uppercase tracking-wide">The University of Lahore</h1>
                <h2 className="text-sm font-semibold text-blue-100">Lahore Campus</h2>
                <div className="h-px w-16 bg-blue-400 mx-auto my-2" />
                <h3 className="text-xs font-medium text-blue-50">Faculty of Information Technology</h3>
                <h4 className="text-xs font-medium text-blue-50">Department of Software Engineering</h4>
              </div>

              {/* Student Info Grid */}
              <div className="bg-white p-3 border border-slate-300 shadow-sm text-xs font-medium">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-1 gap-x-8">
                  <div className="flex justify-between border-b border-slate-100 pb-0.5">
                    <span className="text-slate-500 uppercase text-[10px] tracking-wider">Student Name</span>
                    <span className="text-slate-900 font-bold">{student.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-0.5">
                    <span className="text-slate-500 uppercase text-[10px] tracking-wider">Father's Name</span>
                    <span className="text-slate-900 font-bold">{student.fatherName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-0.5">
                    <span className="text-slate-500 uppercase text-[10px] tracking-wider">Student No</span>
                    <span className="text-slate-900 font-mono">{student.studentNo}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-0.5">
                    <span className="text-slate-500 uppercase text-[10px] tracking-wider">Reg Status</span>
                    <span className={cn("font-bold", currentCgpaVal < 2.0 ? "text-red-600" : "text-slate-900")}>
                      {currentCgpaVal < 2.0 ? "Probation" : student.regStatus}
                    </span>
                  </div>
                  <div className="md:col-span-2 flex justify-between border-b border-slate-100 pb-0.5">
                    <span className="text-slate-500 uppercase text-[10px] tracking-wider">Program</span>
                    <span className="text-slate-900">{student.program}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-6 border border-slate-300 shadow-sm text-center">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">GPA Calculator</h1>
              <p className="text-slate-500 text-xs mt-1 font-medium">Design your dream GPA. Add semesters, simulate grades, and see the future.</p>
            </div>
          )}

          {/* Reset Button (Floating/Utility) */}
          <div className="flex justify-end gap-2">
            {!isManual && (
              <button
                onClick={() => setSimulatedSemesters(data.semesters)}
                className="px-2 py-1 text-xs font-sans font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors border border-blue-100 cursor-pointer"
              >
                Reset Projection
              </button>
            )}
            <button
              onClick={onReset}
              className="px-2 py-1 text-xs font-sans font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors border border-red-100 cursor-pointer"
            >
              Upload New
            </button>
          </div>

          {/* Semesters Grid */}
          <div className="grid grid-cols-1 gap-3">
            {simulatedSemesters.map((sem, idx) => {
              const prog = progressions.find(p => p.semesterId === sem.id);
              const semCgpa = prog?.cumulativeCGPA ? parseFloat(prog.cumulativeCGPA) : 0;
              const isFuture = sem.id.startsWith('future-');

              return (
                <div key={sem.id} className={cn("bg-white border rounded shadow-sm break-inside-avoid relative transition-all", isFuture ? "border-blue-300 ring-1 ring-blue-100" : "border-slate-300")}>

                  {isFuture && (
                    <button
                      onClick={() => deleteSemester(sem.id)}
                      className="absolute right-2 top-2 p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Remove Semester"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}

                  {/* Semester Header */}
                  <div className={cn("bg-slate-50 border-b px-3 py-1 flex justify-between items-center group", isFuture ? "border-blue-200 bg-blue-50/50" : "border-slate-300")}>
                    {isFuture ? (
                      <input
                        type="text"
                        value={sem.name}
                        onChange={(e) => setSimulatedSemesters(prev => prev.map(s => s.id === sem.id ? { ...s, name: e.target.value } : s))}
                        className="font-bold text-slate-800 text-[11px] uppercase tracking-wide bg-transparent border-none focus:ring-0 p-0 w-full"
                        placeholder="Enter Semester Name..."
                      />
                    ) : (
                      <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">{sem.name}</h3>
                    )}
                  </div>

                  {/* Courses Table */}
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-white text-slate-500 font-medium border-b border-slate-200 uppercase text-[9px]">
                      <tr>
                        <th className="px-2 py-1 border-r border-slate-100 w-24">Code</th>
                        <th className="px-2 py-1 border-r border-slate-100">Course Title</th>
                        <th className="px-2 py-1 border-r border-slate-100 w-12 text-center">Cr.Hr</th>
                        <th className="px-2 py-1 w-12 text-center bg-blue-50/30">Grd</th>
                        {isFuture && <th className="px-1 py-1 w-6"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sem.courses.map((course, cIdx) => {
                        // Check if grade is modified
                        const originalSem = data.semesters.find(s => s.id === sem.id);
                        const originalCourse = originalSem?.courses.find(c => c.code === course.code);
                        const isChanged = originalCourse && originalCourse.grade !== course.grade;

                        return (
                          <tr key={course.code + cIdx} className={cn("hover:bg-slate-50 transition-colors", course.isRepeat && "bg-slate-50/50")}>
                            {/* CODE */}
                            <td className="px-2 py-0.5 border-r border-slate-100 font-mono text-[10px]">
                              <input
                                type="text"
                                value={course.code.startsWith('NEW-') ? '' : course.code}
                                onChange={(e) => handleCourseEdit(sem.id, course.code, 'code', e.target.value)}
                                placeholder={course.code.startsWith('NEW-') ? "Code" : ""}
                                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-[10px] font-mono text-slate-600 focus:text-blue-600 placeholder:text-slate-300 focus:placeholder-transparent"
                              />
                            </td>

                            {/* TITLE */}
                            <td className="px-2 py-0.5 border-r border-slate-100 font-medium text-slate-800 text-[11px]">
                              <input
                                type="text"
                                value={course.title}
                                onChange={(e) => handleCourseEdit(sem.id, course.code, 'title', e.target.value)}
                                placeholder="Course Name (Optional)"
                                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-[11px] font-medium text-slate-800 focus:text-blue-600 placeholder:text-slate-300 focus:placeholder-transparent"
                              />
                              {course.isRepeat && <span className="ml-2 text-[9px] text-red-500 font-medium opacity-80">(Repeat)</span>}
                            </td>

                            {/* CREDITS */}
                            <td className="px-2 py-0.5 border-r border-slate-100 text-center text-[11px]">
                              <input
                                type="number"
                                step="1"
                                min="0"
                                max="6"
                                value={course.credits}
                                onChange={(e) => handleCourseEdit(sem.id, course.code, 'credits', e.target.value)}
                                className="w-full text-center bg-transparent border-none focus:ring-0 p-0 text-[11px] text-slate-800 focus:text-blue-600"
                              />
                            </td>

                            {/* GRADE */}
                            <td className="px-0.5 py-0.5 text-center relative bg-blue-50/30 group">
                              {/* Instructional Bubble on first semester, first row */}
                              {idx === 0 && cIdx === 0 && showTutorial && (
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-48 bg-blue-600 text-white text-[10px] p-2 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-left-2">
                                  {/* Ping animation to draw attention */}
                                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                  </span>

                                  <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-blue-600 rotate-45"></div>

                                  <p className="mb-1.5 leading-tight font-semibold">Click grade to modify.</p>

                                  <button
                                    onClick={() => setShowTutorial(false)}
                                    className="w-full bg-white text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-bold hover:bg-blue-50 transition-colors cursor-pointer shadow-sm active:scale-95"
                                  >
                                    Got it
                                  </button>
                                </div>
                              )}
                              <select
                                value={course.grade}
                                onChange={(e) => handleGradeChange(sem.id, course.code, e.target.value)}
                                className={cn(
                                  "w-full text-center font-bold bg-transparent border-0 border-b-0 focus:ring-0 text-[11px] py-0 cursor-pointer transition-all appearance-none rounded p-0 h-4",
                                  getGradeColor(course.grade),
                                  isChanged && "bg-yellow-50 text-yellow-700"
                                )}
                              >
                                {gradeOptions.map(g => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                              {isChanged && (
                                <span className="absolute top-0 right-0 w-1 h-1 bg-yellow-500 rounded-full shadow-sm" title="Grade Modified" />
                              )}
                            </td>

                            {isFuture && (
                              <td className="px-1 text-center">
                                <button
                                  onClick={() => deleteCourse(sem.id, course.code)}
                                  className="text-slate-300 hover:text-red-500 p-0.5 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>

                  {isFuture && (
                    <div className="p-1 border-t border-slate-200 bg-slate-50/50 flex justify-center">
                      <button
                        onClick={() => addCourse(sem.id)}
                        className="flex items-center gap-1 text-[10px] text-blue-600 font-bold hover:bg-blue-100 px-2 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add Course
                      </button>
                    </div>
                  )}

                  {/* Footer Stats similar to transcript */}
                  <div className="bg-slate-100 border-t border-slate-300 px-3 py-1 flex justify-between items-center text-[10px] font-bold text-slate-700">
                    <div className="flex gap-4">
                      <span className={cn(sem.sgpa !== (data.semesters.find(s => s.id === sem.id)?.sgpa ?? 0) && "text-blue-600")}>
                        SGPA: {sem.sgpa.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex gap-4">
                      <span className={getCgpaColor(semCgpa)}>CGPA: {prog?.cumulativeCGPA}</span>
                      <span className="text-slate-500 font-normal">Earned: {prog?.cumulativeCredits}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* JUPYTER STYLE ADD BUTTON */}
            <div className="flex justify-center py-4 group">
              <button
                onClick={addSemester}
                className="flex flex-col items-center gap-2 group-hover:scale-105 transition-transform cursor-pointer"
                title="Add Future Semester"
              >
                <div className="w-full min-w-[300px] h-0.5 bg-slate-200 group-hover:bg-blue-300 transition-colors relative">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-1 border border-slate-200 rounded shadow-sm group-hover:border-blue-300 group-hover:text-blue-600 transition-colors">
                    <Plus className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-blue-500 tracking-wider">Add Future Semester</span>
              </button>
            </div>


          </div>

          {/* Footer Stats - Transcript Style */}
          <div className="bg-white p-3 border border-slate-300 shadow-sm mt-4 break-inside-avoid">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="space-y-0.5">
                <div className="flex gap-2 text-xs">
                  <span className="font-bold text-slate-700 uppercase">Standing =</span>
                  <span className="font-medium text-slate-900">{standing}</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="font-bold text-slate-700 uppercase">Status =</span>
                  <span className="font-medium text-slate-900">{status}</span>
                </div>
              </div>

              <div className="space-y-0.5 md:text-right">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-tight">
                  Total Credit Hours Attempted = <span className="text-slate-900">{totalAttemptedRaw.toFixed(0)}</span>
                </div>
                <div className="text-xs font-bold text-slate-700 uppercase tracking-tight">
                  Total Credit Hours Earned = <span className="text-slate-900">{finalGpaResult.totalEarnedCredits.toFixed(0)}</span>
                </div>
                <div className="text-sm font-bold text-slate-900 uppercase mt-1 border-t-2 border-slate-900 inline-block pt-0.5">
                  Cumulative Grade Point Average (CGPA) = <span className={getCgpaColor(currentCgpaVal)}>{finalGpaResult.cgpa}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Grading Criteria & Policy */}
          <div id="grading-policy" className="bg-white p-3 border border-slate-300 shadow-sm mt-4 break-inside-avoid">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2 uppercase">
              Grading Criteria & Calculation Policy
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Text/Formula Side */}
              <div className="space-y-2 text-xs text-slate-700">
                <p className="leading-relaxed">
                  <strong>GPA Calculation:</strong> The Grade Point Average (GPA) is calculated using the following official formula:
                </p>
                <div className="bg-slate-50 p-2 rounded font-mono text-center border border-slate-200 text-blue-800 font-bold text-[10px]">
                  GPA = Σ (Credit Hours × Grade Points) / Σ Total Credit Hours
                </div>
                <p className="leading-relaxed">
                  <strong>CGPA Policy:</strong> The Cumulative GPA (CGPA) is calculated by considering all courses attempted.
                </p>
              </div>

              {/* Image Side - Bigger & Clickable */}
              <div className="flex justify-center items-start">
                <img
                  src="/grading.jpeg"
                  alt="Official Grading Criteria"
                  className="max-w-full h-auto border border-slate-200 shadow-sm rounded-sm max-h-[200px] cursor-pointer hover:opacity-95 transition-opacity"
                  onClick={() => setIsModalOpen(true)}
                  title="Click to zoom"
                />
              </div>
            </div>
          </div>

          {/* Final Disclaimer */}
          <div className="text-center text-[10px] text-slate-400 max-w-2xl mx-auto pt-4 pb-8 font-sans">
            Note: This is an interactive projection. Edit any grade to see the impact on SGPA and CGPA instantly.
          </div>

        </div>

        {/* RIGHT COLUMN - ANALYTICS (30%) */}
        <div className="w-full lg:w-[30%]">
          <AnalyticsDashboard semesters={simulatedSemesters} />
        </div>

      </div>

      {/* MODAL FOR IMAGE ZOOM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsModalOpen(false)}>
          <div className="relative max-w-4xl w-full p-4" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute -top-10 right-0 text-white hover:text-red-400 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src="/grading.jpeg"
              alt="Grading Criteria Zoomed"
              className="w-full h-auto rounded shadow-2xl bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function getGradeColor(grade: string) {
  if (['A', 'A-'].includes(grade)) return 'text-emerald-600'; // Green for A
  if (['F'].includes(grade)) return 'text-red-600';     // Red for F
  return 'text-slate-900';                              // Others default
}
