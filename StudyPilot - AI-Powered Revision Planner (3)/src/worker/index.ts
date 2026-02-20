import { Hono } from "hono";
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  authMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";
import { getCookie, setCookie } from "hono/cookie";
import { GoogleGenAI } from "@google/genai";


interface SubjectMark {
  subject: string;
  marks: number;
  maxMarks: number;
}

interface UserPreferences {
  learning_style: string;
  study_time: string;
  session_length: string;
  environment: string;
  motivation: string;
}

const app = new Hono<{ Bindings: Env }>();

// Helper to get user ID from auth or guest_id parameter
const getUserId = (c: any): string | null => {
  const user = c.get("user");
  if (user?.id) return user.id;
  
  // Check for guest_id in query params
  const guestId = c.req.query("guest_id");
  if (guestId && guestId.startsWith("guest_")) return guestId;
  
  return null;
};

// Optional auth middleware - allows both authenticated and guest users
const optionalAuthMiddleware = async (c: any, next: () => Promise<void>) => {
  const guestId = c.req.query("guest_id");
  if (guestId && guestId.startsWith("guest_")) {
    // Guest user - set a minimal user object
    c.set("user", { id: guestId });
    return next();
  }
  // Try regular auth
  return authMiddleware(c, next);
};

// Extract marks from marksheet image using Gemini Vision
app.post("/api/extract-marks", optionalAuthMiddleware, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return c.json({ error: "No image file provided" }, 400);
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    // Initialize Gemini
    const ai = new GoogleGenAI({ apiKey: c.env.GEMINI_API_KEY });

    // Send image to Gemini for extraction
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          text: `Analyze this marksheet image and extract all subjects with their marks.
Return ONLY a valid JSON array with this exact format (no other text):
[
  {"subject": "Subject Name", "marks": 85, "maxMarks": 100},
  ...
]

Important:
- Extract the actual subject names as shown on the marksheet
- marks should be the obtained marks as a number
- maxMarks should be the maximum possible marks (often 100)
- If you cannot determine maxMarks, use 100 as default
- Include ALL subjects visible on the marksheet
- If no marks are visible, return an empty array []`,
        },
        {
          inlineData: {
            mimeType: file.type || "image/png",
            data: base64Image,
          },
        },
      ],
      config: {
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    const responseText = response.text || "";
    
    // Parse the JSON from response
    let marks = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        marks = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", responseText);
      return c.json({ error: "Failed to parse extracted marks", rawResponse: responseText }, 500);
    }

    return c.json({ marks, success: true });
  } catch (error: any) {
    console.error("Error extracting marks:", error);
    
    // Check for rate limit or quota errors
    if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("quota") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
      return c.json({ 
        error: "AI service is temporarily unavailable due to rate limits. Please wait a minute and try again, or check your Gemini API quota at ai.google.dev" 
      }, 429);
    }
    
    return c.json({ error: "Failed to process image" }, 500);
  }
});

// Extract syllabus topics from uploaded document using Gemini Vision
app.post("/api/extract-syllabus", optionalAuthMiddleware, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("document") as File;
    const subjectsJson = formData.get("subjects") as string;
    const subjects = subjectsJson ? JSON.parse(subjectsJson) : [];

    if (!file) {
      return c.json({ error: "No document provided" }, 400);
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Document = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    // Initialize Gemini
    const ai = new GoogleGenAI({ apiKey: c.env.GEMINI_API_KEY });

    const subjectsList = subjects.length > 0 
      ? `The student is studying these subjects: ${subjects.join(", ")}. Focus on topics related to these subjects.`
      : "Identify all subjects and their topics from the syllabus.";

    // Send document to Gemini for extraction
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          text: `Analyze this syllabus document and extract all topics/chapters organized by subject.
${subjectsList}

Return ONLY a valid JSON array with this exact format (no other text):
[
  {"subject": "Mathematics", "chapter": "Chapter 1: Algebra", "topic": "Linear Equations", "priority": "high"},
  {"subject": "Mathematics", "chapter": "Chapter 1: Algebra", "topic": "Quadratic Equations", "priority": "medium"},
  {"subject": "Physics", "chapter": "Chapter 2: Mechanics", "topic": "Newton's Laws", "priority": "high"},
  ...
]

Important:
- Extract ALL topics and chapters visible in the syllabus
- Group topics by their subject and chapter
- priority should be "high", "medium", or "low" based on typical exam importance
- If a topic seems foundational or frequently tested, mark it as "high"
- chapter can be null if not clearly indicated
- Be comprehensive - include all topics mentioned`,
        },
        {
          inlineData: {
            mimeType: file.type || "image/png",
            data: base64Document,
          },
        },
      ],
      config: {
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    const responseText = response.text || "";
    
    // Parse the JSON from response
    let topics = [];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        topics = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", responseText);
      return c.json({ error: "Failed to parse extracted topics", rawResponse: responseText }, 500);
    }

    return c.json({ topics, success: true });
  } catch (error: any) {
    console.error("Error extracting syllabus:", error);
    
    // Check for rate limit or quota errors
    if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("quota") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
      return c.json({ 
        error: "AI service is temporarily unavailable due to rate limits. Please wait a minute and try again, or check your Gemini API quota at ai.google.dev" 
      }, 429);
    }
    
    return c.json({ error: "Failed to process document" }, 500);
  }
});

// Save syllabus topics
app.post("/api/syllabus/save", optionalAuthMiddleware, async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    
    const body = await c.req.json();
    const { topics } = body as { topics: { subject: string; chapter: string | null; topic: string; priority: string }[] };

    // Clear existing syllabus topics and insert new ones
    await c.env.DB.prepare("DELETE FROM syllabus_topics WHERE user_id = ?").bind(userId).run();

    for (const item of topics) {
      await c.env.DB.prepare(`
        INSERT INTO syllabus_topics (user_id, subject, topic, chapter, priority)
        VALUES (?, ?, ?, ?, ?)
      `).bind(userId, item.subject, item.topic, item.chapter || null, item.priority || "medium").run();
    }

    return c.json({ success: true, count: topics.length });
  } catch (error) {
    console.error("Error saving syllabus:", error);
    return c.json({ error: "Failed to save syllabus" }, 500);
  }
});

// Get user's syllabus topics
app.get("/api/syllabus", optionalAuthMiddleware, async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const result = await c.env.DB.prepare(
      "SELECT * FROM syllabus_topics WHERE user_id = ? ORDER BY subject, chapter, topic"
    ).bind(userId).all();

    return c.json({ topics: result.results || [] });
  } catch (error) {
    console.error("Error fetching syllabus:", error);
    return c.json({ error: "Failed to fetch syllabus" }, 500);
  }
});

// Toggle syllabus topic completion
app.patch("/api/syllabus/:id/toggle", optionalAuthMiddleware, async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    
    const topicId = c.req.param("id");
    
    // Toggle the is_completed status
    await c.env.DB.prepare(`
      UPDATE syllabus_topics 
      SET is_completed = CASE WHEN is_completed = 1 THEN 0 ELSE 1 END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).bind(topicId, userId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error toggling topic:", error);
    return c.json({ error: "Failed to toggle topic" }, 500);
  }
});

// Delete a syllabus topic
app.delete("/api/syllabus/:id", optionalAuthMiddleware, async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    
    const topicId = c.req.param("id");
    
    await c.env.DB.prepare(
      "DELETE FROM syllabus_topics WHERE id = ? AND user_id = ?"
    ).bind(topicId, userId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting topic:", error);
    return c.json({ error: "Failed to delete topic" }, 500);
  }
});

// Add a single syllabus topic
app.post("/api/syllabus/add", optionalAuthMiddleware, async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    
    const body = await c.req.json();
    const { subject, topic, chapter, priority } = body as { 
      subject: string; 
      topic: string; 
      chapter?: string; 
      priority?: string 
    };

    if (!subject || !topic) {
      return c.json({ error: "Subject and topic are required" }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO syllabus_topics (user_id, subject, topic, chapter, priority)
      VALUES (?, ?, ?, ?, ?)
    `).bind(userId, subject, topic, chapter || null, priority || "medium").run();

    // Fetch the inserted topic
    const inserted = await c.env.DB.prepare(
      "SELECT * FROM syllabus_topics WHERE id = ?"
    ).bind(result.meta.last_row_id).first();

    return c.json({ success: true, topic: inserted });
  } catch (error) {
    console.error("Error adding topic:", error);
    return c.json({ error: "Failed to add topic" }, 500);
  }
});

// Generate quiz questions for a topic
app.post("/api/quiz/generate", optionalAuthMiddleware, async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    const { subject, topic, chapter } = body as {
      subject: string;
      topic: string;
      chapter?: string;
    };

    if (!subject || !topic) {
      return c.json({ error: "Subject and topic are required" }, 400);
    }

    // Get user's learning profile for personalization
    const profile = await c.env.DB.prepare(
      "SELECT * FROM user_profiles WHERE user_id = ?"
    ).bind(userId).first();

    // Get user's marks for this subject to gauge difficulty level
    const subjectMarks = await c.env.DB.prepare(
      "SELECT marks, max_marks FROM subject_marks WHERE user_id = ? AND subject = ?"
    ).bind(userId, subject).first();

    let difficulty = "medium";
    if (subjectMarks) {
      const percentage = ((subjectMarks.marks as number) / (subjectMarks.max_marks as number)) * 100;
      if (percentage >= 80) difficulty = "challenging";
      else if (percentage < 50) difficulty = "basic";
    }

    const ai = new GoogleGenAI({ apiKey: c.env.GEMINI_API_KEY });

    const prompt = `Generate exactly 5 multiple choice quiz questions to test knowledge on the following topic:

Subject: ${subject}
Topic: ${topic}
${chapter ? `Chapter: ${chapter}` : ""}
Difficulty Level: ${difficulty}
${profile ? `Student Learning Style: ${profile.learning_style}` : ""}

Requirements:
- Generate exactly 5 questions
- Each question should have exactly 4 options
- Questions should be appropriate for a student studying this topic
- Include a mix of conceptual and application-based questions
- Make questions clear and unambiguous

Return the response as a JSON array with this exact structure:
[
  {
    "question": "The question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0
  }
]

Only return the JSON array, no additional text or markdown.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const responseText = response.text?.trim() || "";
    
    // Parse the JSON response
    let questions;
    try {
      // Remove any markdown code blocks if present
      const cleanJson = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      questions = JSON.parse(cleanJson);
    } catch {
      console.error("Failed to parse quiz response:", responseText);
      return c.json({ error: "Failed to generate valid quiz questions" }, 500);
    }

    // Validate the structure
    if (!Array.isArray(questions) || questions.length === 0) {
      return c.json({ error: "Invalid quiz format received" }, 500);
    }

    // Ensure each question has the required fields
    const validQuestions = questions.filter(
      (q: { question?: string; options?: string[]; correctIndex?: number }) =>
        q.question &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        typeof q.correctIndex === "number" &&
        q.correctIndex >= 0 &&
        q.correctIndex < 4
    );

    if (validQuestions.length < 3) {
      return c.json({ error: "Not enough valid questions generated" }, 500);
    }

    return c.json({ questions: validQuestions.slice(0, 5) });
  } catch (error) {
    console.error("Error generating quiz:", error);
    return c.json({ error: "Failed to generate quiz" }, 500);
  }
});

// Save user profile and marks from onboarding
app.post("/api/onboarding/complete", optionalAuthMiddleware, async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json();
    const { marks, preferences } = body as { marks: SubjectMark[]; preferences: UserPreferences };

    // Save or update user profile
    await c.env.DB.prepare(`
      INSERT INTO user_profiles (user_id, learning_style, study_time, session_length, environment, motivation)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        learning_style = excluded.learning_style,
        study_time = excluded.study_time,
        session_length = excluded.session_length,
        environment = excluded.environment,
        motivation = excluded.motivation,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      userId,
      preferences.learning_style,
      preferences.study_time,
      preferences.session_length,
      preferences.environment,
      preferences.motivation
    ).run();

    // Clear existing marks and insert new ones
    await c.env.DB.prepare("DELETE FROM subject_marks WHERE user_id = ?").bind(userId).run();

    for (const mark of marks) {
      await c.env.DB.prepare(`
        INSERT INTO subject_marks (user_id, subject, marks, max_marks)
        VALUES (?, ?, ?, ?)
      `).bind(userId, mark.subject, mark.marks, mark.maxMarks).run();
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error saving onboarding data:", error);
    return c.json({ error: "Failed to save data" }, 500);
  }
});

// Get user's marks and preferences
app.get("/api/user/profile", optionalAuthMiddleware, async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const profile = await c.env.DB.prepare(
      "SELECT * FROM user_profiles WHERE user_id = ?"
    ).bind(userId).first();

    const marksResult = await c.env.DB.prepare(
      "SELECT subject, marks, max_marks as maxMarks FROM subject_marks WHERE user_id = ?"
    ).bind(userId).all();

    return c.json({
      profile,
      marks: marksResult.results || [],
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return c.json({ error: "Failed to fetch profile" }, 500);
  }
});

// Generate AI study plan
app.post("/api/study-plan/generate", optionalAuthMiddleware, async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json();
    const { startDate, days = 7, hoursPerDay = 4 } = body;

    // Get user's marks and preferences
    const profile = await c.env.DB.prepare(
      "SELECT * FROM user_profiles WHERE user_id = ?"
    ).bind(userId).first();

    const marksResult = await c.env.DB.prepare(
      "SELECT subject, marks, max_marks as maxMarks FROM subject_marks WHERE user_id = ?"
    ).bind(userId).all();

    const marks = marksResult.results || [];

    if (marks.length === 0) {
      return c.json({ error: "No subjects found. Please complete onboarding first." }, 400);
    }

    // Get upcoming exam schedule
    const planStartDate = startDate || new Date().toISOString().split("T")[0];
    const examScheduleResult = await c.env.DB.prepare(`
      SELECT subject, exam_date, exam_name FROM exam_schedule 
      WHERE user_id = ? AND exam_date >= ?
      ORDER BY exam_date ASC
    `).bind(userId, planStartDate).all();
    
    const examSchedule = examScheduleResult.results || [];

    // Calculate days until exam for each subject
    const examUrgency: Record<string, { daysUntil: number; examDate: string; examName: string | null }> = {};
    examSchedule.forEach((exam: any) => {
      const examDate = new Date(exam.exam_date);
      const start = new Date(planStartDate);
      const daysUntil = Math.ceil((examDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      // Only track the closest exam for each subject
      if (!examUrgency[exam.subject] || daysUntil < examUrgency[exam.subject].daysUntil) {
        examUrgency[exam.subject] = { daysUntil, examDate: exam.exam_date, examName: exam.exam_name };
      }
    });

    // Calculate time allocation based on marks AND exam proximity
    // Calculate weakness scores (inverse of performance) combined with exam urgency
    const subjectWeights = marks.map((m: any) => {
      const percentage = (m.marks / m.maxMarks) * 100;
      // Lower percentage = higher weight (more study time needed)
      let weaknessScore = 100 - percentage;
      
      // Factor in exam urgency - exams within 14 days get priority boost
      const examInfo = examUrgency[m.subject];
      let urgencyBoost = 0;
      if (examInfo) {
        if (examInfo.daysUntil <= 3) urgencyBoost = 80;
        else if (examInfo.daysUntil <= 7) urgencyBoost = 50;
        else if (examInfo.daysUntil <= 14) urgencyBoost = 30;
        else if (examInfo.daysUntil <= 21) urgencyBoost = 15;
      }
      
      return { 
        subject: m.subject, 
        percentage, 
        weaknessScore: weaknessScore + urgencyBoost,
        baseWeaknessScore: weaknessScore,
        urgencyBoost,
        marks: m.marks, 
        maxMarks: m.maxMarks,
        examInfo: examInfo || null
      };
    });

    const totalWeaknessScore = subjectWeights.reduce((sum: number, s: any) => sum + s.weaknessScore, 0);

    // Calculate time allocation per subject
    const totalMinutesPerDay = hoursPerDay * 60;
    const subjectAllocations = subjectWeights.map((s: any) => {
      const timeRatio = totalWeaknessScore > 0 ? s.weaknessScore / totalWeaknessScore : 1 / marks.length;
      const minutesPerDay = Math.round(totalMinutesPerDay * timeRatio);
      return {
        ...s,
        minutesPerDay,
        priority: s.percentage < 40 ? "high" : s.percentage < 60 ? "medium" : "low",
      };
    });

    // Sort by priority (weakest subjects first)
    subjectAllocations.sort((a: any, b: any) => b.weaknessScore - a.weaknessScore);

    // Get session length preference
    const sessionLengths: Record<string, number> = {
      short: 25,
      medium: 45,
      long: 60,
      extended: 90,
    };
    const sessionLength = sessionLengths[profile?.session_length as string] || 45;

    // Get preferred study time
    const studyTimeStarts: Record<string, string> = {
      morning: "06:00",
      midday: "10:00",
      afternoon: "14:00",
      evening: "18:00",
    };
    const preferredStartTime = studyTimeStarts[profile?.study_time as string] || "09:00";

    // Generate study plan
    // Build exam schedule info for AI prompt
    const examScheduleInfo = subjectAllocations
      .filter((s: any) => s.examInfo)
      .map((s: any) => `- ${s.subject}: Exam on ${s.examInfo.examDate}${s.examInfo.examName ? ` (${s.examInfo.examName})` : ""} - ${s.examInfo.daysUntil} days away`)
      .join("\n");

    const ai = new GoogleGenAI({ apiKey: c.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          text: `Create a ${days}-day study schedule based on these requirements:

STUDENT PERFORMANCE (prioritize weaker subjects and upcoming exams):
${subjectAllocations.map((s: any) => `- ${s.subject}: ${s.marks}/${s.maxMarks} (${s.percentage.toFixed(0)}%) - Priority: ${s.priority}${s.examInfo ? ` - EXAM in ${s.examInfo.daysUntil} days` : ""} - Allocate ~${s.minutesPerDay} min/day`).join("\n")}

${examScheduleInfo ? `UPCOMING EXAMS (CRITICAL - prioritize these subjects!):
${examScheduleInfo}` : ""}

PREFERENCES:
- Preferred study start time: ${preferredStartTime}
- Session length: ${sessionLength} minutes
- Total study hours per day: ${hoursPerDay}
- Learning style: ${profile?.learning_style || "visual"}

RULES:
1. CRITICAL: Subjects with lower scores MUST get MORE study time
2. Include 5-10 min breaks between sessions
3. Schedule hardest subjects during peak focus times (earlier in the day)
4. Vary subjects throughout the day to maintain engagement
5. Include specific focus tips for each session

Return ONLY valid JSON in this exact format:
{
  "plan": [
    {
      "date": "YYYY-MM-DD",
      "sessions": [
        {
          "subject": "Subject Name",
          "startTime": "HH:MM",
          "endTime": "HH:MM",
          "duration": 45,
          "priority": "high|medium|low",
          "focusTip": "Brief study tip for this session"
        }
      ]
    }
  ],
  "summary": {
    "totalHours": 28,
    "focusAreas": ["Subject 1", "Subject 2"],
    "recommendation": "Overall study recommendation"
  }
}

Start date: ${startDate || new Date().toISOString().split("T")[0]}`,
        },
      ],
      config: {
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    const responseText = response.text || "";
    
    // Parse the JSON from response
    let studyPlan;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        studyPlan = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse study plan:", responseText);
      return c.json({ error: "Failed to generate study plan" }, 500);
    }

    // Save plan to database
    if (studyPlan?.plan) {
      // Clear existing future plans
      await c.env.DB.prepare(
        "DELETE FROM study_plans WHERE user_id = ? AND plan_date >= ?"
      ).bind(userId, startDate || new Date().toISOString().split("T")[0]).run();

      for (const day of studyPlan.plan) {
        for (const session of day.sessions) {
          await c.env.DB.prepare(`
            INSERT INTO study_plans (user_id, plan_date, subject, start_time, end_time, duration_minutes, priority, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            userId,
            day.date,
            session.subject,
            session.startTime,
            session.endTime,
            session.duration,
            session.priority,
            session.focusTip
          ).run();
        }
      }
    }

    return c.json({ 
      success: true, 
      plan: studyPlan,
      subjectAllocations,
    });
  } catch (error) {
    console.error("Error generating study plan:", error);
    return c.json({ error: "Failed to generate study plan" }, 500);
  }
});

// Get user's study plan
app.get("/api/study-plan", optionalAuthMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const date = c.req.query("date") || new Date().toISOString().split("T")[0];

    const plans = await c.env.DB.prepare(`
      SELECT * FROM study_plans 
      WHERE user_id = ? AND plan_date >= ?
      ORDER BY plan_date, start_time
    `).bind(user.id, date).all();

    return c.json({ plans: plans.results || [] });
  } catch (error) {
    console.error("Error fetching study plan:", error);
    return c.json({ error: "Failed to fetch study plan" }, 500);
  }
});

// Mark session as completed
app.patch("/api/study-plan/:id/complete", optionalAuthMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const body = await c.req.json();

    await c.env.DB.prepare(`
      UPDATE study_plans 
      SET is_completed = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).bind(body.completed ? 1 : 0, id, user.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating session:", error);
    return c.json({ error: "Failed to update session" }, 500);
  }
});

// Get missed sessions (past, incomplete)
app.get("/api/study-plan/missed", optionalAuthMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const today = new Date().toISOString().split("T")[0];

    const missed = await c.env.DB.prepare(`
      SELECT * FROM study_plans 
      WHERE user_id = ? AND plan_date < ? AND is_completed = 0
      ORDER BY plan_date DESC, start_time
    `).bind(user.id, today).all();

    return c.json({ sessions: missed.results || [] });
  } catch (error) {
    console.error("Error fetching missed sessions:", error);
    return c.json({ error: "Failed to fetch missed sessions" }, 500);
  }
});

// Reschedule a single session
app.patch("/api/study-plan/:id/reschedule", optionalAuthMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const body = await c.req.json();
    const { newDate, newStartTime, newEndTime } = body;

    if (!newDate) {
      return c.json({ error: "New date is required" }, 400);
    }

    await c.env.DB.prepare(`
      UPDATE study_plans 
      SET plan_date = ?, start_time = ?, end_time = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).bind(newDate, newStartTime, newEndTime, id, user.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error rescheduling session:", error);
    return c.json({ error: "Failed to reschedule session" }, 500);
  }
});

// Smart reschedule - moves all missed sessions to upcoming days
app.post("/api/study-plan/reschedule-missed", optionalAuthMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const today = new Date().toISOString().split("T")[0];

    // Get missed sessions
    const missedResult = await c.env.DB.prepare(`
      SELECT * FROM study_plans 
      WHERE user_id = ? AND plan_date < ? AND is_completed = 0
      ORDER BY plan_date, start_time
    `).bind(user.id, today).all();

    const missed = missedResult.results || [];

    if (missed.length === 0) {
      return c.json({ success: true, rescheduled: 0 });
    }

    // Get existing upcoming sessions to avoid conflicts
    const upcomingResult = await c.env.DB.prepare(`
      SELECT plan_date, COUNT(*) as session_count FROM study_plans 
      WHERE user_id = ? AND plan_date >= ?
      GROUP BY plan_date
    `).bind(user.id, today).all();

    const sessionsPerDay: Record<string, number> = {};
    (upcomingResult.results || []).forEach((r: any) => {
      sessionsPerDay[r.plan_date] = r.session_count;
    });

    // Distribute missed sessions across upcoming days (max 6 per day)
    const maxSessionsPerDay = 6;
    let currentDate = new Date();
    let rescheduledCount = 0;

    for (const session of missed) {
      // Find next available day
      while (true) {
        const dateStr = currentDate.toISOString().split("T")[0];
        const existingCount = sessionsPerDay[dateStr] || 0;
        
        if (existingCount < maxSessionsPerDay) {
          // Reschedule to this day
          await c.env.DB.prepare(`
            UPDATE study_plans 
            SET plan_date = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
          `).bind(dateStr, (session as any).id, user.id).run();

          sessionsPerDay[dateStr] = existingCount + 1;
          rescheduledCount++;
          break;
        } else {
          // Try next day
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    }

    return c.json({ success: true, rescheduled: rescheduledCount });
  } catch (error) {
    console.error("Error rescheduling missed sessions:", error);
    return c.json({ error: "Failed to reschedule sessions" }, 500);
  }
});

// Delete a session
app.delete("/api/study-plan/:id", optionalAuthMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");

    await c.env.DB.prepare(`
      DELETE FROM study_plans WHERE id = ? AND user_id = ?
    `).bind(id, user.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting session:", error);
    return c.json({ error: "Failed to delete session" }, 500);
  }
});

// Get analytics data
app.get("/api/analytics", optionalAuthMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    // Get all study sessions
    const allSessions = await c.env.DB.prepare(`
      SELECT * FROM study_plans WHERE user_id = ?
      ORDER BY plan_date, start_time
    `).bind(user.id).all();

    const sessions = allSessions.results || [];

    // Get subject marks
    const marksResult = await c.env.DB.prepare(
      "SELECT subject, marks, max_marks as maxMarks FROM subject_marks WHERE user_id = ?"
    ).bind(user.id).all();

    const marks = marksResult.results || [];

    // Calculate overall stats
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((s: any) => s.is_completed).length;
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
    const totalStudyMinutes = sessions.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);
    const completedStudyMinutes = sessions
      .filter((s: any) => s.is_completed)
      .reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);

    // Group sessions by subject
    const subjectStats: Record<string, { total: number; completed: number; minutes: number; completedMinutes: number }> = {};
    sessions.forEach((s: any) => {
      if (!subjectStats[s.subject]) {
        subjectStats[s.subject] = { total: 0, completed: 0, minutes: 0, completedMinutes: 0 };
      }
      subjectStats[s.subject].total++;
      subjectStats[s.subject].minutes += s.duration_minutes || 0;
      if (s.is_completed) {
        subjectStats[s.subject].completed++;
        subjectStats[s.subject].completedMinutes += s.duration_minutes || 0;
      }
    });

    // Calculate subject performance with marks
    const subjectPerformance = marks.map((m: any) => {
      const stats = subjectStats[m.subject] || { total: 0, completed: 0, minutes: 0, completedMinutes: 0 };
      const percentage = Math.round((m.marks / m.maxMarks) * 100);
      const studyCompletionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
      
      return {
        subject: m.subject,
        marks: m.marks,
        maxMarks: m.maxMarks,
        percentage,
        totalSessions: stats.total,
        completedSessions: stats.completed,
        studyCompletionRate,
        totalMinutes: stats.minutes,
        completedMinutes: stats.completedMinutes,
      };
    });

    // Group sessions by date for daily trends
    const dailyStats: Record<string, { total: number; completed: number; minutes: number; completedMinutes: number }> = {};
    sessions.forEach((s: any) => {
      const date = s.plan_date;
      if (!dailyStats[date]) {
        dailyStats[date] = { total: 0, completed: 0, minutes: 0, completedMinutes: 0 };
      }
      dailyStats[date].total++;
      dailyStats[date].minutes += s.duration_minutes || 0;
      if (s.is_completed) {
        dailyStats[date].completed++;
        dailyStats[date].completedMinutes += s.duration_minutes || 0;
      }
    });

    // Convert to array and sort by date
    const dailyTrends = Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        ...stats,
        completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14); // Last 14 days

    // Weekly summary
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekStartStr = weekStart.toISOString().split("T")[0];

    const thisWeekSessions = sessions.filter((s: any) => s.plan_date >= weekStartStr);
    const thisWeekCompleted = thisWeekSessions.filter((s: any) => s.is_completed).length;
    const thisWeekMinutes = thisWeekSessions
      .filter((s: any) => s.is_completed)
      .reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);

    // Calculate streak (consecutive days with completed sessions)
    const completedDates = new Set(
      sessions.filter((s: any) => s.is_completed).map((s: any) => s.plan_date)
    );
    let streak = 0;
    const checkDate = new Date();
    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (completedDates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return c.json({
      overview: {
        totalSessions,
        completedSessions,
        completionRate,
        totalStudyMinutes,
        completedStudyMinutes,
        streak,
        thisWeekCompleted,
        thisWeekMinutes,
      },
      subjectPerformance,
      dailyTrends,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return c.json({ error: "Failed to fetch analytics" }, 500);
  }
});

// Log new exam results
app.post("/api/exam-results", optionalAuthMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json();
    const { examName, examDate, results } = body as { 
      examName: string; 
      examDate: string; 
      results: { subject: string; marks: number; maxMarks: number }[] 
    };

    if (!examName || !examDate || !results?.length) {
      return c.json({ error: "Exam name, date, and results are required" }, 400);
    }

    // Insert each subject result
    for (const result of results) {
      await c.env.DB.prepare(`
        INSERT INTO exam_results (user_id, exam_name, exam_date, subject, marks, max_marks)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(user.id, examName, examDate, result.subject, result.marks, result.maxMarks).run();

      // Also update subject_marks with latest score
      await c.env.DB.prepare(`
        UPDATE subject_marks SET marks = ?, max_marks = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND subject = ?
      `).bind(result.marks, result.maxMarks, user.id, result.subject).run();
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error logging exam results:", error);
    return c.json({ error: "Failed to log exam results" }, 500);
  }
});

// Get exam history
app.get("/api/exam-results", optionalAuthMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const results = await c.env.DB.prepare(`
      SELECT * FROM exam_results WHERE user_id = ?
      ORDER BY exam_date DESC, subject
    `).bind(user.id).all();

    return c.json({ results: results.results || [] });
  } catch (error) {
    console.error("Error fetching exam results:", error);
    return c.json({ error: "Failed to fetch exam results" }, 500);
  }
});

// Get performance trends per subject
app.get("/api/performance/trends", optionalAuthMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    // Get all exam results grouped by subject
    const results = await c.env.DB.prepare(`
      SELECT subject, exam_name, exam_date, marks, max_marks
      FROM exam_results WHERE user_id = ?
      ORDER BY exam_date ASC
    `).bind(user.id).all();

    // Also get initial marks from onboarding
    const initialMarks = await c.env.DB.prepare(`
      SELECT subject, marks, max_marks as maxMarks, created_at
      FROM subject_marks WHERE user_id = ?
    `).bind(user.id).all();

    // Group by subject with improvement tracking
    const subjectTrends: Record<string, {
      subject: string;
      history: { examName: string; date: string; marks: number; maxMarks: number; percentage: number }[];
      initialMarks: number;
      initialMaxMarks: number;
      latestMarks: number;
      latestMaxMarks: number;
      improvement: number;
    }> = {};

    // Add initial marks
    (initialMarks.results || []).forEach((m: any) => {
      subjectTrends[m.subject] = {
        subject: m.subject,
        history: [{
          examName: "Initial (Onboarding)",
          date: m.created_at?.split("T")[0] || "Initial",
          marks: m.marks,
          maxMarks: m.maxMarks,
          percentage: Math.round((m.marks / m.maxMarks) * 100)
        }],
        initialMarks: m.marks,
        initialMaxMarks: m.maxMarks,
        latestMarks: m.marks,
        latestMaxMarks: m.maxMarks,
        improvement: 0
      };
    });

    // Add exam results
    (results.results || []).forEach((r: any) => {
      if (!subjectTrends[r.subject]) {
        subjectTrends[r.subject] = {
          subject: r.subject,
          history: [],
          initialMarks: r.marks,
          initialMaxMarks: r.max_marks,
          latestMarks: r.marks,
          latestMaxMarks: r.max_marks,
          improvement: 0
        };
      }
      subjectTrends[r.subject].history.push({
        examName: r.exam_name,
        date: r.exam_date,
        marks: r.marks,
        maxMarks: r.max_marks,
        percentage: Math.round((r.marks / r.max_marks) * 100)
      });
      subjectTrends[r.subject].latestMarks = r.marks;
      subjectTrends[r.subject].latestMaxMarks = r.max_marks;
    });

    // Calculate improvements
    Object.values(subjectTrends).forEach((trend) => {
      const initialPct = (trend.initialMarks / trend.initialMaxMarks) * 100;
      const latestPct = (trend.latestMarks / trend.latestMaxMarks) * 100;
      trend.improvement = Math.round(latestPct - initialPct);
    });

    return c.json({ trends: Object.values(subjectTrends) });
  } catch (error) {
    console.error("Error fetching performance trends:", error);
    return c.json({ error: "Failed to fetch trends" }, 500);
  }
});

// --- Exam Schedule Management ---

// Get all upcoming exams
app.get("/api/exam-schedule", optionalAuthMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const result = await c.env.DB.prepare(`
      SELECT * FROM exam_schedule WHERE user_id = ?
      ORDER BY exam_date ASC
    `).bind(user.id).all();

    return c.json({ exams: result.results || [] });
  } catch (error) {
    console.error("Error fetching exam schedule:", error);
    return c.json({ error: "Failed to fetch exam schedule" }, 500);
  }
});

// Add a new exam date
app.post("/api/exam-schedule", optionalAuthMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json();
    const { subject, examDate, examName, notes } = body as {
      subject: string;
      examDate: string;
      examName?: string;
      notes?: string;
    };

    if (!subject || !examDate) {
      return c.json({ error: "Subject and exam date are required" }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO exam_schedule (user_id, subject, exam_date, exam_name, notes)
      VALUES (?, ?, ?, ?, ?)
    `).bind(user.id, subject, examDate, examName || null, notes || null).run();

    const inserted = await c.env.DB.prepare(
      "SELECT * FROM exam_schedule WHERE id = ?"
    ).bind(result.meta.last_row_id).first();

    return c.json({ success: true, exam: inserted });
  } catch (error) {
    console.error("Error adding exam:", error);
    return c.json({ error: "Failed to add exam" }, 500);
  }
});

// Update an exam date
app.patch("/api/exam-schedule/:id", optionalAuthMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const body = await c.req.json();
    const { subject, examDate, examName, notes } = body as {
      subject?: string;
      examDate?: string;
      examName?: string;
      notes?: string;
    };

    await c.env.DB.prepare(`
      UPDATE exam_schedule 
      SET subject = COALESCE(?, subject),
          exam_date = COALESCE(?, exam_date),
          exam_name = COALESCE(?, exam_name),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).bind(subject || null, examDate || null, examName || null, notes || null, id, user.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating exam:", error);
    return c.json({ error: "Failed to update exam" }, 500);
  }
});

// Delete an exam from schedule
app.delete("/api/exam-schedule/:id", optionalAuthMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");

    await c.env.DB.prepare(
      "DELETE FROM exam_schedule WHERE id = ? AND user_id = ?"
    ).bind(id, user.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting exam:", error);
    return c.json({ error: "Failed to delete exam" }, 500);
  }
});

// Delete an exam result
app.delete("/api/exam-results/:id", optionalAuthMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");

    await c.env.DB.prepare(
      "DELETE FROM exam_results WHERE id = ? AND user_id = ?"
    ).bind(id, user.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting exam result:", error);
    return c.json({ error: "Failed to delete exam result" }, 500);
  }
});

// Get privacy data summary
app.get("/api/privacy/data-summary", optionalAuthMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const profile = await c.env.DB.prepare(
      "SELECT created_at FROM user_profiles WHERE user_id = ?"
    ).bind(user.id).first();

    const subjectsCount = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM subject_marks WHERE user_id = ?"
    ).bind(user.id).first();

    const studyPlansCount = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM study_plans WHERE user_id = ?"
    ).bind(user.id).first();

    const examResultsCount = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM exam_results WHERE user_id = ?"
    ).bind(user.id).first();

    return c.json({
      profile: !!profile,
      subjectsCount: (subjectsCount as { count: number })?.count || 0,
      studyPlansCount: (studyPlansCount as { count: number })?.count || 0,
      examResultsCount: (examResultsCount as { count: number })?.count || 0,
      accountCreated: profile?.created_at || null,
    });
  } catch (error) {
    console.error("Error fetching data summary:", error);
    return c.json({ error: "Failed to fetch data summary" }, 500);
  }
});

// Export all user data
app.get("/api/privacy/export-data", optionalAuthMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const profile = await c.env.DB.prepare(
      "SELECT * FROM user_profiles WHERE user_id = ?"
    ).bind(user.id).first();

    const subjects = await c.env.DB.prepare(
      "SELECT subject, marks, max_marks, created_at FROM subject_marks WHERE user_id = ?"
    ).bind(user.id).all();

    const studyPlans = await c.env.DB.prepare(
      "SELECT plan_date, subject, start_time, end_time, duration_minutes, priority, is_completed, notes, created_at FROM study_plans WHERE user_id = ?"
    ).bind(user.id).all();

    const examResults = await c.env.DB.prepare(
      "SELECT exam_name, exam_date, subject, marks, max_marks, notes, created_at FROM exam_results WHERE user_id = ?"
    ).bind(user.id).all();

    return c.json({
      exportedAt: new Date().toISOString(),
      user: {
        email: user.email,
        name: user.google_user_data?.name || null,
      },
      profile: profile ? {
        learningStyle: profile.learning_style,
        studyTime: profile.study_time,
        sessionLength: profile.session_length,
        environment: profile.environment,
        motivation: profile.motivation,
        createdAt: profile.created_at,
      } : null,
      subjects: subjects.results || [],
      studyPlans: studyPlans.results || [],
      examResults: examResults.results || [],
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    return c.json({ error: "Failed to export data" }, 500);
  }
});

// Delete all user data
app.delete("/api/privacy/delete-data", optionalAuthMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    // Delete all user data from all tables
    await c.env.DB.prepare("DELETE FROM exam_results WHERE user_id = ?").bind(user.id).run();
    await c.env.DB.prepare("DELETE FROM study_plans WHERE user_id = ?").bind(user.id).run();
    await c.env.DB.prepare("DELETE FROM subject_marks WHERE user_id = ?").bind(user.id).run();
    await c.env.DB.prepare("DELETE FROM user_profiles WHERE user_id = ?").bind(user.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting user data:", error);
    return c.json({ error: "Failed to delete data" }, 500);
  }
});

// --- Chatbot API with Smart Actions ---

// Helper to calculate date from relative terms
function parseRelativeDate(text: string): string {
  const today = new Date();
  const lowerText = text.toLowerCase();
  
  // Handle "this friday", "next monday", etc.
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  
  for (let i = 0; i < days.length; i++) {
    if (lowerText.includes(days[i])) {
      const targetDay = i;
      const currentDay = today.getDay();
      let daysToAdd = targetDay - currentDay;
      
      // If it's "next week" or the day has passed this week
      if (lowerText.includes("next") || daysToAdd < 0) {
        daysToAdd += 7;
      }
      if (daysToAdd === 0 && !lowerText.includes("today")) {
        daysToAdd = 7; // If same day, assume next week unless "today" is mentioned
      }
      
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysToAdd);
      return targetDate.toISOString().split("T")[0];
    }
  }
  
  // Handle "tomorrow"
  if (lowerText.includes("tomorrow")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }
  
  // Handle "today"
  if (lowerText.includes("today")) {
    return today.toISOString().split("T")[0];
  }
  
  // Handle "in X days"
  const daysMatch = lowerText.match(/in (\d+) days?/);
  if (daysMatch) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + parseInt(daysMatch[1]));
    return targetDate.toISOString().split("T")[0];
  }
  
  // Default to today's date
  return today.toISOString().split("T")[0];
}

app.post("/api/chatbot", optionalAuthMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    
    const body = await c.req.json();
    const { message } = body as { message: string };

    if (!message || message.trim().length === 0) {
      return c.json({ error: "Message is required" }, 400);
    }

    // Get user's subjects for context
    const marksResult = await c.env.DB.prepare(
      "SELECT subject FROM subject_marks WHERE user_id = ?"
    ).bind(user.id).all();
    
    const subjects = (marksResult.results || []).map((m: any) => m.subject);
    const subjectsContext = subjects.length > 0 
      ? `The student is studying these subjects: ${subjects.join(", ")}.` 
      : "";

    // Get today's date for context
    const today = new Date().toISOString().split("T")[0];
    const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });

    const ai = new GoogleGenAI({ apiKey: (c.env as any).GEMINI_API_KEY });

    const systemPrompt = `You are a friendly and helpful study buddy robot assistant for students. Your name is "Study Buddy".

Today is ${dayOfWeek}, ${today}.

${subjectsContext}

Analyze the student's message and respond in JSON format with this exact structure:
{
  "reply": "Your friendly response to the student",
  "actions": [
    {
      "type": "add_exam",
      "subject": "Subject name",
      "exam_date": "YYYY-MM-DD",
      "exam_name": "Optional exam name"
    },
    {
      "type": "add_topic",
      "subject": "Subject name", 
      "topic": "Topic name",
      "priority": "high|medium|low"
    }
  ]
}

IMPORTANT Rules:
- ALWAYS add an "add_exam" action when the student mentions ANY upcoming exam, test, quiz, assessment, or final
- For "add_exam": subject is REQUIRED. If not specified, use "General" or infer from context
- For "add_exam": exam_date is REQUIRED in YYYY-MM-DD format. Calculate from relative dates:
  * "today" = ${today}
  * "tomorrow" = add 1 day
  * "this friday" = next Friday from today
  * "in X days" = add X days
- If the student mentions needing to study a topic, add an "add_topic" action
- If no actions are needed, use an empty array for "actions"
- Your reply should be encouraging, supportive, use emojis occasionally 🎓📚
- Give concise answers (2-4 sentences for simple questions)
- If you add an exam, ALWAYS mention it in your reply like "I've added that to your exam schedule!"`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    const actions: { type: string; details: any }[] = [];
    let reply = "";

    try {
      // Parse the JSON response
      const responseText = response.text?.trim() || "{}";
      const parsed = JSON.parse(responseText);
      
      reply = parsed.reply || "I'm here to help! Ask me anything. 📚";
      
      // Process actions
      if (parsed.actions && Array.isArray(parsed.actions)) {
        for (const action of parsed.actions) {
          if (action.type === "add_exam") {
            // Use default subject if not provided
            const subject = action.subject || "General";
            
            // Validate and fix date if needed
            let examDate = action.exam_date;
            if (!examDate || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
              examDate = parseRelativeDate(message);
            }
            
            console.log("Adding exam:", { subject, examDate, name: action.exam_name });
            
            // Add to exam schedule
            await c.env.DB.prepare(`
              INSERT INTO exam_schedule (user_id, subject, exam_date, exam_name)
              VALUES (?, ?, ?, ?)
            `).bind(user.id, subject, examDate, action.exam_name || null).run();
            
            actions.push({
              type: "exam_added",
              details: {
                subject: subject,
                date: examDate,
                name: action.exam_name
              }
            });
          }
          
          if (action.type === "add_topic" && action.topic) {
            // Use default subject if not provided
            const topicSubject = action.subject || "General";
            // Add to syllabus
            await c.env.DB.prepare(`
              INSERT INTO syllabus_topics (user_id, subject, topic, priority)
              VALUES (?, ?, ?, ?)
            `).bind(user.id, topicSubject, action.topic, action.priority || "medium").run();
            
            actions.push({
              type: "topic_added",
              details: {
                subject: topicSubject,
                topic: action.topic,
                priority: action.priority || "medium"
              }
            });
          }
        }
      }
    } catch (parseError) {
      // Fallback if JSON parsing fails
      reply = response.text?.trim() || "I'm not sure how to answer that. Could you try rephrasing?";
    }

    return c.json({ reply, actions });
  } catch (error: any) {
    console.error("Chatbot error:", error);
    
    // Check for rate limit or quota errors
    if (error?.status === 429 || error?.code === "insufficient_quota" || error?.message?.includes("429") || error?.message?.includes("quota")) {
      return c.json({ 
        reply: "I'm taking a quick break! 😴 My AI brain has reached its limit for now. Please ask your teacher or check back later! 📚",
        actions: []
      });
    }
    
    // Check for invalid API key
    if (error?.status === 401 || error?.code === "invalid_api_key") {
      return c.json({ 
        reply: "I'm having trouble connecting to my AI brain right now! 🔧 Please let the app administrator know. 📚",
        actions: []
      });
    }
    
    return c.json({ 
      reply: "Oops! Something went wrong on my end. Please try again in a moment! 🤖",
      actions: []
    });
  }
});

// OAuth redirect URL
app.get("/api/oauth/google/redirect_url", async (c) => {
  const redirectUrl = await getOAuthRedirectUrl("google", {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

// Exchange code for session token
app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60, // 60 days
  });

  return c.json({ success: true }, 200);
});

// Get current user
app.get("/api/users/me", optionalAuthMiddleware, async (c) => {
  return c.json(c.get("user"));
});

// Logout
app.get("/api/logout", async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === "string") {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

export default app;
