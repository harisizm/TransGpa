import { useEffect, useCallback } from 'react';
import { trackEvent } from '../services/api';

export const useTracking = () => {
  // Session Management Logic
  const getSessionId = () => {
    const NOW = Date.now();
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    let sessionId = localStorage.getItem('transgpa_session_id');
    const lastActive = parseInt(localStorage.getItem('transgpa_last_active') || '0', 10);

    // If no session or expired, start new
    if (!sessionId || (NOW - lastActive > SESSION_TIMEOUT)) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('transgpa_session_id', sessionId);

      // Track SESSION_START for new sessions
      trackEvent({
        eventType: 'SESSION_START',
        sessionId // Pass explicitly or rely on api wrapper (we'll update wrapper too)
      });
    }

    // Update last active
    localStorage.setItem('transgpa_last_active', NOW.toString());
    return sessionId;
  };

  // Initialize User & Session
  useEffect(() => {
    let userId = localStorage.getItem('transgpa_user_id');
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem('transgpa_user_id', userId);
    }
    getSessionId(); // Initialize/Check session on mount
  }, []);

  const trackUpload = useCallback((file: File, studentInfo?: any) => {
    console.log('Tracking Upload:', { fileName: file.name, studentInfo });
    trackEvent({
      eventType: 'UPLOAD',
      sessionId: getSessionId(),
      metadata: {
        fileType: file.type,
        fileName: file.name,
        fileSize: file.size,
        studentName: studentInfo?.name,
        fatherName: studentInfo?.fatherName,
        studentNo: studentInfo?.studentNo,
        cgpa: studentInfo?.cgpa,
      }
    });
  }, []);

  const trackParseResult = useCallback((success: boolean, pageCount?: number, error?: string) => {
    trackEvent({
      eventType: success ? 'PARSE_SUCCESS' : 'PARSE_FAIL',
      sessionId: getSessionId(),
      metadata: {
        pageCount,
        error
      }
    });
  }, []);

  return { trackUpload, trackParseResult };
};
