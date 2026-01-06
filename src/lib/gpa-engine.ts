import type { Semester, Course } from './pdf-parser';

export interface GpaResult {
  cgpa: string;
  totalCredits: number;
  totalPoints: number;
  totalEarnedCredits: number;
}

/**
 * Calculates CGPA by grouping courses by code and taking the Best Grade for each.
 * This simulates a "Retake/Replacement" policy where the best attempt counts.
 */
export function calculateCGPA(semesters: Semester[]): GpaResult {
  const courseMap = new Map<string, Course>();

  // Flatten all courses from all semesters
  semesters.forEach(sem => {
    sem.courses.forEach(course => {
      // Normalize code: remove spaces/hyphens for consistent key
      const key = course.code.replace(/[-\s]/g, '').toUpperCase();

      // If we haven't seen this course, add it
      if (!courseMap.has(key)) {
        courseMap.set(key, course);
      } else {
        // If we have seen it, keep the one with higher points (or higher grade points per credit)
        const existing = courseMap.get(key)!;

        // Compare by Grade Points (4.0 scale)
        const existingGP = existing.points / (existing.credits || 1);
        const currentGP = course.points / (course.credits || 1);

        if (currentGP > existingGP) {
          courseMap.set(key, course);
        }
        // If equal?? Maybe latest? Usually doesn't matter for math.
      }
    });
  });

  let totalPoints = 0;
  let totalCredits = 0;       // Attempted credits for GPA (includes F)
  let totalEarnedCredits = 0; // Earned credits (excludes F)

  courseMap.forEach((course) => {
    if (course.grade === 'W' || course.grade === 'I') return;

    totalCredits += course.credits;
    totalPoints += course.points;

    if (course.grade !== 'F') {
      totalEarnedCredits += course.credits;
    }
  });

  const cgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";

  return {
    cgpa,
    totalCredits,
    totalPoints,
    totalEarnedCredits
  };
}

export interface SemesterProgression {
  semesterId: string;
  cumulativeCGPA: string;
  cumulativeCredits: number;
}

/**
 * Calculates the CGPA progression after each semester.
 */
export function calculateSemesterProgressions(semesters: Semester[]): SemesterProgression[] {
  const progressions: SemesterProgression[] = [];
  const processedSemesters: Semester[] = [];

  for (const semester of semesters) {
    processedSemesters.push(semester);
    const stats = calculateCGPA(processedSemesters);

    progressions.push({
      semesterId: semester.id,
      cumulativeCGPA: stats.cgpa,
      cumulativeCredits: stats.totalCredits
    });
  }

  return progressions;
}
