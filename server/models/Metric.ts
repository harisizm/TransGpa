import mongoose, { Document, Schema } from 'mongoose';

export interface IMetric extends Document {
  userId: string;
  sessionId: string;
  timestamp: Date;
  eventType: 'SESSION_START' | 'UPLOAD' | 'PARSE_SUCCESS' | 'PARSE_FAIL' | 'PAGE_VIEW';
  metadata?: {
    fileType?: string;
    fileName?: string;
    fileSize?: number;
    pageCount?: number;
    parseDuration?: number;
    error?: string;
    path?: string;
    studentName?: string;
    fatherName?: string;
    studentNo?: string;
    cgpa?: string;
  };
  deviceInfo?: {
    browser?: string;
    os?: string;
    deviceType?: string;
  };
}

const MetricSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now },
  eventType: { type: String, required: true },
  metadata: {
    fileType: String,
    fileName: String,
    fileSize: Number,
    pageCount: Number,
    parseDuration: Number,
    error: String,
    path: String,
    studentName: String,
    fatherName: String,
    studentNo: String,
    cgpa: String,
  },
  deviceInfo: {
    browser: String,
    os: String,
    deviceType: String,
  },
});

export default mongoose.model<IMetric>('Metric', MetricSchema);
