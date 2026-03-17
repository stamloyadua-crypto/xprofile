import express from "express";
import multer from "multer";
import fs from "fs";
import puppeteer from "puppeteer";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// סטטי
app.use("/uploads", express.static("uploads"));
app.use("/", express.static("public"));

// ⭐ התיקון שחסר לך — חובה ל‑Render
app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/public/index.html");
});

const upload = multer({ dest: "uploads/" });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

function normalizeTraits(body) {
  const toNum = (v) => (Number(v) === 1 ? 1 : 0);

  return {
    openness: toNum(body.openness),
    conscientiousness: toNum(body.conscientiousness),
    extraversion: toNum(body.extraversion),
    agreeableness: toNum(body.agreeableness),
    neuroticism: toNum(body.neuroticism),
    ambition: toNum(body.ambition),
    adaptability: toNum(body.adaptability),
  };
}

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
נתוני הנבדק:

${JSON.stringify(
  {
    fullName: data.fullName,
    phone: data.phone,
    lens: data.lens,
    subTopic: data.subTopic,
    context: data.context,
    traits: data.traits,
    createdAt: data.createdAt,
  },
  null,
  2
)}

הנחיות כתיבה:
- שלב את התכונות בתוך הניתוח.
- צור ניסוח מגוון.
- התאם את הדוח ל-HR או SECURITY.
- הרחב את הסיכום וההמלצות.
- כתוב דוח ארוך, מקצועי וקליני.
        `,
      },
    ],
    temperature: 0.4,
  };

  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("OpenAI error:", text);
    throw new Error("OpenAI API error");
  }

  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content || "";

  const cleaned = raw
    .replace(/```html/gi, "")
    .replace(/```/g, "")
    .trim();

  return cleaned;
}

function buildHtml(data) {
  return `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<title>דוח פרופיל אישיותי – ${data.fullName}</title>

<style>
body {
  font-family: "Assistant", Arial, sans-serif;
  margin: 0;
  padding: 0;
  background-image: url("/xProfile_BG.png");
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center top;
  color: #222;
}

.content-wrapper {
  padding: 160px 140px 80px 140px;
}

.main-title {
  font-size: 46px;
  font-weight: 800;
  text-align: center;
  margin-bottom: 10px;
}

.sub-title {
  font-size: 26px;
  text-align: center;
  margin-bottom: 30px;
}

.top-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40px;
  margin-bottom: 60px;
}

.photo {
  width: 260px;
  height: 260px;
  object-fit: cover;
  border-radius: 10px;
  border: 4px solid #1d9d6d;
}

.top-text {
  text-align: right;
  max-width: 420px;
}

.top-text p {
  font-size: 20px;
  margin: 6px 0;
}

h2 {
  font-size: 30px;
  margin-top: 50px;
  margin-bottom: 16px;
  border-bottom: 3px solid #1d9d6d;
  padding-bottom: 8px;
  text-align: right;
}

h3 {
  font-size: 22px;
  margin-top: 24px;
  margin-bottom: 10px;
  text-align: right;
}

p {
  font-size: 18px;
  line-height: 1.9;
  margin: 12px 0;
  text-align: right;
}

ul {
  font-size: 18px;
  line-height: 1.9;
  padding-right: 20px;
  text-align: right;
}

li {
  margin-bottom: 8px;
}

.action-buttons {
  margin-top: 60px;
  display: flex;
  justify-content: center;
  gap: 30px;
}

.btn {
  padding: 14px 28px;
  font-size: 18px;
  font-weight: 600;
  border-radius: 8px;
  text-decoration: none;
  color: white;
  transition: 0.2s;
}

.pdf-btn {
  background-color: #1d9d6d;
}

.pdf-btn:hover {
  background-color: #157a54;
}

.back-btn {
  background-color: #444;
}

.back-btn:hover {
  background-color: #222;
}
</style>
</head>

<body>
<div class="content-wrapper">

  <div class="main-title">דוח פרופיל אישיותי – ${data.fullName}</div>
  <div class="sub-title">${data.phone}</div>

  <div class="top-section">
    <img src="${data.imageUrl}" class="photo" />

    <div class="top-text">
      <p><strong>שם מלא:</strong> ${data.fullName}</p>
      <p><strong>טלפון:</strong> ${data.phone}</p>
      <p><strong>Lens:</strong> ${data.lens}</p>
      <p><strong>תת־נושא:</strong> ${data.subTopic}</p>
      <p><strong>תאריך יצירה:</strong> ${new Date(data.createdAt).toLocaleDateString("he-IL")}</p>
    </div>
  </div>

  <div class="report-body">
    ${data.reportHtml}
  </div>

  <div class="action-buttons">
    <a class="btn pdf-btn" href="/report/${data.reportId}/pdf">הורד PDF</a>
    <a class="btn back-btn" href="/">חזור לטופס</a>
  </div>

</div>
</body>
</html>
`;
}

app.post("/create-report", upload.single("image"), async (req, res) => {
  try {
    const reportId = "R" + Date.now();
    const createdAt = new Date().toISOString();
    const traits = normalizeTraits(req.body);

    const data = {
      reportId,
      fullName: req.body.fullName,
      phone: req.body.phone,
      lens: req.body.lens,
      subTopic: req.body.subTopic,
      context: req.body.context || "",
      traits,
      imageUrl: "/uploads/" + req.file.filename,
      createdAt,
    };

    const reportHtml = await generateReportWithGPT(data);
    const fullData = { ...data, reportHtml };

    if (!fs.existsSync("reports")) fs.mkdirSync("reports");

    fs.writeFileSync(
      `reports/${reportId}.json`,
      JSON.stringify(fullData, null, 2),
      "utf8"
    );

    res.json({
      reportId,
      url: `/report/${reportId}`,
      pdfUrl: `/report/${reportId}/pdf`,
    });
  } catch (err) {
    console.error("CREATE REPORT ERROR:", err);
    res.status(500).json({ message: "Report creation failed" });
  }
});

app.get("/report/:id", (req, res) => {
  try {
    const data = JSON.parse(
      fs.readFileSync(`reports/${req.params.id}.json`, "utf8")
    );
    res.send(buildHtml(data));
  } catch (err) {
    console.error("READ REPORT ERROR:", err);
    res.status(404).send("Report not found");
  }
});

app.get("/report/:id/pdf", async (req, res) => {
  try {
    const data = JSON.parse(
      fs.readFileSync(`reports/${req.params.id}.json`, "utf8")
    );
    const html = buildHtml(data);

    const safeName = `report_${data.reportId}.pdf`;

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
    res.send(pdf);
  } catch (err) {
    console.error("PDF ERROR:", err);
    res.status(500).send("PDF generation failed");
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
