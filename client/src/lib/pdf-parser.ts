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
  cgpa?: string; // New: extracted from PDF footer
}

export interface TranscriptData {
  student: StudentInfo;
  semesters: Semester[];
  extractedCgpa?: string; // Explicitly capture for analytics tracking
}

export function parseTranscript(text: string): TranscriptData {
  // 1. Extract Student Info
  // Helper to clean extracted text (remove newlines, extra spaces)
  const clean = (text: string) => text.replace(/\s+/g, ' ').trim();

  // Debug: Log a snippet of the text to see what we're working with
  console.log("[PDF Debug] Raw Text Start:", text.slice(0, 500));

  // 1. Extract Student Info
  // Use [\s\S]*? for multi-line matching

  // Student Name: Match text until "Father", "Student No", or "RegStatus"
  const nameMatch = text.match(/Student\s*Name:\s*([\s\S]*?)(?=\s+Father|\s+Student\s*No|\s+Reg\s*Status)/i);
  console.log("[PDF Debug] Name Match:", nameMatch ? nameMatch[1] : "Fail");

  // Father's Name: Match text until "Student No" or "RegStatus"
  const fatherMatch = text.match(/Father's\s*Name:\s*([\s\S]*?)(?=\s+Student\s*No|\s+Reg\s*Status)/i);
  console.log("[PDF Debug] Father Match:", fatherMatch ? fatherMatch[1] : "Fail");

  // Student No: Capture digits and whitespace
  const stdNoMatch = text.match(/Student\s*No:\s*([\d\s]+)/i);
  console.log("[PDF Debug] StdNo Match:", stdNoMatch ? stdNoMatch[1] : "Fail");

  const regStatusMatch = text.match(/Reg\s*Status\s+([\s\S]*?)(?=\s+Program)/i);
  console.log("[PDF Debug] Reg Status Match:", regStatusMatch ? regStatusMatch[1] : "Fail");

  // Robust Program Regex: Handles "Course Code", "Course Title", or split "Course Cod\ne"
  const programMatch = text.match(/Program:\s*([\s\S]*?)(?=\s+Course\s+Tit|\s+Course\s+Cod|\s+Course\s+Code)/i);
  console.log("[PDF Debug] Program Match:", programMatch ? programMatch[1] : "Fail");

  // Extract CGPA from footer area
  // Handle split label: CUMULATIVE \n GRADE POINT AVERAGE(CG\nPA)
  const cgpaMatch = text.match(/CUMULATIVE\s+GRADE\s+POINT\s+AVERAGE\s*\(\s*CG\s*PA\s*\)\s*=\s*(\d?\.\d{2})/i);
  console.log("[PDF Debug] CGPA Match:", cgpaMatch ? cgpaMatch[1] : "Fail");

  const student: StudentInfo = {
    name: nameMatch ? clean(nameMatch[1]) : "Unknown",
    fatherName: fatherMatch ? clean(fatherMatch[1]) : "Unknown",
    studentNo: stdNoMatch ? clean(stdNoMatch[1]) : "Unknown",
    regStatus: regStatusMatch ? clean(regStatusMatch[1]) : "Unknown",
    program: programMatch ? clean(programMatch[1]) : "Unknown",
    cgpa: cgpaMatch ? cgpaMatch[1].trim() : "0.00"
  };

  // 2. Extract Semesters
  const semesters: Semester[] = [];

  // Robust Semester Regex: Handles split "Semester", split season names, and split years (e.g. 20\n23)
  // Matches: Semester \n 1 \n Spring \n Semester \n 20\n23
  const semesterHeaderRegex = /Semester\s*[\n\r]*\s*\d+\s*[\n\r]*\s*(?:S\s*p\s*r\s*i\s*n\s*g|S\s*u\s*m\s*m\s*e\s*r|F\s*a\s*l\s*l)\s*[\n\r]*\s*S\s*e\s*m\s*e\s*s\s*t\s*e\s*r\s*[\n\r]*\s*\d[\s\n\r]*\d[\s\n\r]*\d[\s\n\r]*\d/gi;

  const matches = [...text.matchAll(semesterHeaderRegex)];

  if (matches.length === 0) {
    // Just warn instead of throwing, so we can still return student info
    console.warn("No semester headers found during parsing.");
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

  return { student, semesters, extractedCgpa: student.cgpa };
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
