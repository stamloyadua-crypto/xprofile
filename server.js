import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// סטטי
app.use("/", express.static("public"));
app.use("/uploads", express.static("uploads"));

// Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// פונקציית GPT – כמו שלך
async function generateReportWithGPT(data) {
  const payload = {
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `
אתה פסיכולוג תעסוקתי בכיר ומומחה אבחון. אתה כותב דוחות הערכת אישיות מקצועיים בעברית ברמה גבוהה, בסגנון קליני, זורם, מאוגד ולא תבניתי.
הדוח חייב להיות מקצועי, מגוון, עמוק, מותאם ל-HR או SECURITY.
אין להשתמש בקוד, אין להשתמש ב-\`\`\`html.
החזר HTML בלבד של גוף הדוח.
        `.trim(),
      },
      {
        role: "user",
        content: `
צור דוח הערכת אישיות תעסוקתית מפורט, מרשים וכתוב היטב, על בסיס הנתונים הבאים בלבד. אל תוסיף תכונות שלא קיימות בנתונים. אל תשתמש בשום סקאלה מלבד 0 או 1 כפי שמופיע בנתונים. החזר HTML בלבד של גוף הדוח, ללא תגיות <html>, <head> או <body>:

${JSON.stringify(data, null, 2)}
        `.trim(),
      },
    ],
  };

  const response = await client.chat.completions.create(payload);
  return response.choices[0].message.content;
}

// HTML מלא של הדוח
function buildHtml(data) {
  return `
  <!DOCTYPE html>
  <html lang="he" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <title>דוח פרופיל אישיותי – ${data.fullName}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 0; direction: rtl; background:#f5f5f5; }
      header, footer { background: #f0f0f0; padding: 20px; text-align: center; }
      .section { margin: 30px auto; max-width: 800px; background:#ffffff; padding:24px; border-radius:12px; box-shadow:0 2px 6px rgba(0,0,0,0.06); }
      h1, h2 { margin-top: 0; }
      img { max-width: 200px; border-radius: 8px; display:block; margin-top:10px; }
      .meta p { margin:4px 0; }
      a { text-decoration:none; color:#1d9d6d; }
    </style>
  </head>
  <body>

    <header>
      <h1>דו"ח פרופיל אישיותי</h1>
    </header>

    <div class="section meta">
      <h2>פרטים אישיים</h2>
      <p><strong>שם:</strong> ${data.fullName}</p>
      <p><strong>טלפון:</strong> ${data.phone}</p>
      <p><strong>Lens:</strong> ${data.lens}</p>
      <p><strong>תת־נושא:</strong> ${data.subTopic}</p>
      ${data.imageUrl ? `<img src="${data.imageUrl}" alt="תמונה">` : ""}
    </div>

    <div class="section">
      <h2>דוח מקצועי</h2>
      ${data.reportHtml}
    </div>

    <footer>
      <a href="/" style="font-size:18px;">⬅ חזרה לטופס</a>
    </footer>

  </body>
  </html>
  `;
}

// יצירת דוח
app.post("/create-report", upload.single("image"), async (req, res) => {
  try {
    const traits = {
      openness: req.body.openness === "1" ? 1 : 0,
      conscientiousness: req.body.conscientiousness === "1" ? 1 : 0,
      extraversion: req.body.extraversion === "1" ? 1 : 0,
      agreeableness: req.body.agreeableness === "1" ? 1 : 0,
      neuroticism: req.body.neuroticism === "1" ? 1 : 0,
      ambition: req.body.ambition === "1" ? 1 : 0,
      adaptability: req.body.adaptability === "1" ? 1 : 0,
    };

    const data = {
      fullName: req.body.fullName,
      phone: req.body.phone,
      lens: req.body.lens,
      subTopic: req.body.subTopic,
      context: req.body.context || "",
      traits,
      imageUrl: req.file ? "/uploads/" + req.file.filename : "",
    };

    const reportHtml = await generateReportWithGPT(data);
    const fullData = { ...data, reportHtml };

    res.send(buildHtml(fullData));
  } catch (err) {
    console.error("CREATE REPORT ERROR:", err);
    res.status(500).send("שגיאה ביצירת הדוח");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
