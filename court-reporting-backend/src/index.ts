import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

// --- REPORTER ROUTES ---
app.post('/reporters', async (req: Request, res: Response) => {
  const { name, location, availability } = req.body;
  try {
    const reporter = await prisma.reporter.create({
      data: { name, location, availability: availability ?? true },
    });
    res.status(201).json(reporter);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create reporter' });
  }
});

app.get('/reporters', async (req: Request, res: Response) => {
  const reporters = await prisma.reporter.findMany();
  res.json(reporters);
});

// --- EDITOR ROUTES ---
app.post('/editors', async (req: Request, res: Response) => {
  const { name } = req.body;
  try {
    const editor = await prisma.editor.create({
      data: { name },
    });
    res.status(201).json(editor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create editor' });
  }
});

app.get('/editors', async (req: Request, res: Response) => {
  const editors = await prisma.editor.findMany();
  res.json(editors);
});

// --- JOB ROUTES ---

// 1. Create Job
app.post('/jobs', async (req: Request, res: Response) => {
  const { caseName, durationMinutes, locationType, city } = req.body;
  try {
    const job = await prisma.job.create({
      data: {
        caseName,
        durationMinutes,
        locationType,
        city,
        status: 'NEW',
      },
    });
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// List Jobs
app.get('/jobs', async (req: Request, res: Response) => {
  const jobs = await prisma.job.findMany({
    include: { reporter: true, editor: true }
  });
  res.json(jobs);
});

// 2. Assign Reporter
app.post('/jobs/:id/assign-reporter', async (req: Request, res: Response): Promise<any> => {
  const id = req.params.id as string;
  const { reporterId } = req.body;
  
  try {
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'NEW') return res.status(400).json({ error: 'Job is not in NEW status' });

    let finalReporterId = reporterId;

    // Logic: Prefer same city for physical jobs if no specific reporterId is provided
    if (!finalReporterId) {
      if (job.locationType === 'Physical' && job.city) {
        const localReporter = await prisma.reporter.findFirst({
          where: { location: job.city, availability: true }
        });
        if (localReporter) {
          finalReporterId = localReporter.id;
        }
      }
      
      // Fallback: any available reporter
      if (!finalReporterId) {
        const availableReporter = await prisma.reporter.findFirst({
          where: { availability: true }
        });
        if (!availableReporter) return res.status(400).json({ error: 'No available reporters found' });
        finalReporterId = availableReporter.id;
      }
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: {
        reporterId: finalReporterId,
        status: 'ASSIGNED'
      }
    });

    res.json(updatedJob);
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign reporter' });
  }
});

// Update Status (e.g., ASSIGNED -> TRANSCRIBED)
app.patch('/jobs/:id/status', async (req: Request, res: Response): Promise<any> => {
  const id = req.params.id as string;
  const { status } = req.body; // e.g. TRANSCRIBED
  
  try {
    const job = await prisma.job.update({
      where: { id },
      data: { status }
    });
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// 3. Assign Editor
app.post('/jobs/:id/assign-editor', async (req: Request, res: Response): Promise<any> => {
  const id = req.params.id as string;
  const { editorId } = req.body;
  
  try {
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'TRANSCRIBED') return res.status(400).json({ error: 'Job is not TRANSCRIBED yet' });

    let finalEditorId = editorId;
    if (!finalEditorId) {
      const anyEditor = await prisma.editor.findFirst();
      if (!anyEditor) return res.status(400).json({ error: 'No editors available' });
      finalEditorId = anyEditor.id;
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: {
        editorId: finalEditorId,
        status: 'REVIEWED'
      }
    });

    res.json(updatedJob);
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign editor' });
  }
});

// 4. Payment Calculation
app.get('/jobs/:id/payment', async (req: Request, res: Response): Promise<any> => {
  const id = req.params.id as string;
  
  try {
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    
    // Example rules:
    // Reporter paid per minute (e.g. 2000 IDR/min)
    // Editor paid per job (flat fee) e.g. 50,000 IDR

    const REPORTER_RATE_PER_MIN = 2000;
    const EDITOR_FLAT_FEE = 50000;

    const reporterPayment = job.reporterId ? job.durationMinutes * REPORTER_RATE_PER_MIN : 0;
    const editorPayment = job.editorId ? EDITOR_FLAT_FEE : 0;
    const totalPayout = reporterPayment + editorPayment;

    // Save to DB
    await prisma.job.update({
      where: { id },
      data: { reporterPayment, editorPayment }
    });

    res.json({
      jobId: id,
      caseName: job.caseName,
      durationMinutes: job.durationMinutes,
      reporterPayment,
      editorPayment,
      totalPayout
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate payment' });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
