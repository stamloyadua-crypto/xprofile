import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// קבצים סטטיים
app.use("/", express.static("public"));
app.use("/uploads", express.static("uploads"));

// הגדרות Multer להעלאת תמונות
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// חיבור ל־OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// פונקציה שמייצרת HTML מלא לדוח
function buildHtml(data) {
  return `
  <!DOCTYPE html>
  <html lang="he" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <title>דוח פרופיל אישיותי – ${data.fullName}</title>
    <style>
      body { font-family: Arial; margin: 0; padding: 0; direction: rtl; }
      header, footer { background: #f0f0f0; padding: 20px; text-align: center; }
      .section { margin: 40px; }
      img { max-width: 240px; border-radius: 8px; }
    </style>
  </head>
  <body>

    <header>
      <h1>דוח פרופיל אישיותי</h1>
    </header>

    <div class="section">
      <h2>פרטים אישיים</h2>
      <p><strong>שם:</strong> ${data.fullName}</p>
      <p><strong>טלפון:</strong> ${data.phone}</p>
      <p><strong>Lens:</strong> ${data.lens}</p>
      <p><strong>תת־נושא:</strong> ${data.subTopic}</p>
      <img src="${data.imageUrl}" />
    </div>

    <div class="section">
      <h2>דוח מקצועי</h2>
      ${data.reportHtml}
    </div>

    <footer>
      <a href="/" style="font-size:20px;">⬅ חזרה לטופס</a>
    </footer>

  </body>
  </html>
  `;
}

// יצירת דוח חדש — מחזיר HTML ישירות
app.post("/create-report", upload.single("image"), async (req, res) => {
  try {
    const traits = {
      openness: Number(req.body.openness) || 0,
      conscientiousness: Number(req.body.conscientiousness) || 0,
      extraversion: Number(req.body.extraversion) || 0,
      agreeableness: Number(req.body.agreeableness) || 0,
      neuroticism: Number(req.body.neuroticism) || 0,
      ambition: Number(req.body.ambition) || 0,
      adaptability: Number(req.body.adaptability) || 0,
    };

    const data = {
      fullName: req.body.fullName,
      phone: req.body.phone,
      lens: req.body.lens,
      subTopic: req.body.subTopic,
      context: req.body.context || "",
      traits,
      imageUrl: "/uploads/" + req.file.filename,
    };

    // יצירת טקסט עם GPT
    const gptResponse = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "אתה פסיכולוג תעסוקתי בכיר. כתוב דוח מקצועי בעברית.",
        },
        {
          role: "user",
          content: `צור דוח על בסיס הנתונים: ${JSON.stringify(data, null, 2)}`,
        },
      ],
    });

    const reportHtml = gptResponse.choices[0].message.content;

    const fullData = { ...data, reportHtml };

    // החזרת HTML ישירות — עמוד חדש
    res.send(buildHtml(fullData));
  } catch (err) {
    console.error("CREATE REPORT ERROR:", err);
    res.status(500).send("שגיאה ביצירת הדוח");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
