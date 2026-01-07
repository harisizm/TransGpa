import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker
// Use Vite's ?url suffix to get the URL to the worker file
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface Course {
  code: string;
  title: string;
  credits: number;
  grade: string;
  points: number;
  isRepeat: boolean;
}

export interface Semester {
  id: string; // generated
  name: string; // e.g., "Semester 1 - Fall 2023"
  courses: Course[];
  sgpa: number; // parsed SGPA
  totalPoints: number; // calculated
  totalCredits: number; // calculated
}

// Grading Scale Mapping
// Strictly following the provided asset/criteria:
// A=4.0, A-=3.75, B+=3.5, B=3.0, C+=2.5, C=2.0, D+=1.5, D=1.0, F=0.0
export const GRADE_POINTS: Record<string, number> = {
  'A': 4.00, 'A-': 3.75,
  'B+': 3.50, 'B': 3.00,
  'C+': 2.50, 'C': 2.00,
  'D+': 1.50, 'D': 1.00,
  'F': 0.00,
  'W': 0, // Withdrawal
  'I': 0, // Incomplete
};

// Canonical Grade Order (High to Low)
export const GRADES_ORDER = ['A', 'A-', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'];

export const getGradePoints = (grade: string): number => {
  return GRADE_POINTS[grade] ?? 0;
};

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n\n';
  }

  return fullText;
}

export interface StudentInfo {
  name: string;
  fatherName: string;
  studentNo: string;
  program: string;
  regStatus: string;
}

export interface TranscriptData {
  student: StudentInfo;
  semesters: Semester[];
}

export function parseTranscript(text: string): TranscriptData {
  // 1. Extract Student Info
  const nameMatch = text.match(/Student Name:\s*(.*?)\s+Father's Name:/i);
  const fatherMatch = text.match(/Father's Name:\s*(.*?)\s+Student No:/i);
  const stdNoMatch = text.match(/Student No:\s*(\d+)/i);
  const regStatusMatch = text.match(/RegStatus\s+(.*?)\s+Program:/i);
  const programMatch = text.match(/Program:\s*(.*?)(?=\s+Course Code)/i);

  const student: StudentInfo = {
    name: nameMatch ? nameMatch[1].trim() : "Unknown",
    fatherName: fatherMatch ? fatherMatch[1].trim() : "Unknown",
    studentNo: stdNoMatch ? stdNoMatch[1].trim() : "Unknown",
    regStatus: regStatusMatch ? regStatusMatch[1].trim() : "Unknown",
    program: programMatch ? programMatch[1].trim() : "Unknown",
  };

  const semesters: Semester[] = [];

  // Regex Strategy based on User's Raw Text
  // Example: "Semester   1   Spring   Semester   2023"
  const semesterHeaderRegex = /Semester\s+\d+\s+(?:Spring|Summer|Fall)\s+Semester\s+\d{4}/gi;

  const matches = [...text.matchAll(semesterHeaderRegex)];

  if (matches.length === 0) {
    const snippet = text.slice(0, 3000);
    throw new Error("No semester headers found. Raw text start: " + snippet);
  }

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const header = match[0];
    const startIndex = match.index!;
    const endIndex = i < matches.length - 1 ? matches[i + 1].index! : text.length;

    const blockText = text.slice(startIndex, endIndex);
    const semester = parseSemesterBlock(header, blockText, i);

    if (semester.courses.length > 0) {
      semesters.push(semester);
    }
  }

  return { student, semesters };
}

function parseSemesterBlock(header: string, text: string, index: number): Semester {
  // Course Regex
  // Example: "QURT-1111   Translation ... 0.0   A-"
  // Example: "PHY01115 ... 3.0   B+   Repeat"
  // Group 1: Code
  // Group 2: Title
  // Group 3: Credits
  // Group 4: Grade
  // Group 5: Repeat (optional)

  const courseRegex = /([A-Z]{2,8}[-]?\d{3,6})\s+(.+?)\s+(\d+\.\d)\s+([A-F][+\-]?|W|I)(\s+Repeat)?/g;
  const sgpaRegex = /SGPA\s*[:\-]?\s*(\d?\.\d{2})/i;

  const courses: Course[] = [];

  const courseMatches = [...text.matchAll(courseRegex)];

  for (const m of courseMatches) {
    const code = m[1].trim();
    const title = m[2].trim();
    const credits = parseFloat(m[3]);
    const grade = m[4].trim();
    const isRepeat = !!m[5]; // Presence of Group 5 means Repeat

    courses.push({
      code,
      title,
      credits,
      grade,
      points: getGradePoints(grade) * (grade === 'W' ? 0 : credits),
      isRepeat
    });
  }

  // Extract SGPA
  const sgpaMatch = text.match(sgpaRegex);
  const parsedSgpa = sgpaMatch ? parseFloat(sgpaMatch[1]) : 0;

  // Calculate totals
  const effectiveCourses = courses.filter(c => c.grade !== 'W' && c.grade !== 'I');

  const totalCredits = effectiveCourses.reduce((sum, c) => sum + c.credits, 0);
  const totalPoints = effectiveCourses.reduce((sum, c) => sum + c.points, 0);

  return {
    id: `sem-${index}`,
    name: header.replace(/\s+/g, ' '),
    courses,
    sgpa: parsedSgpa,
    totalCredits,
    totalPoints
  };
}
