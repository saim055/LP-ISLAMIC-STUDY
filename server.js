// ================= IMPORTS =================
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const multer = require("multer");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
require("dotenv").config();

// ================= APP SETUP =================
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ dest: uploadsDir });

// ================= AI CLIENT =================
const Groq = require("groq-sdk");
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// ================= HELPER FUNCTIONS =================
const safe = (v) => (v === undefined || v === null ? "" : String(v));

function getMonthlyValue(date) {
  const month = new Date(date).getMonth();
  const values = [
    'Integrity', 'Respect', 'Responsibility', 'Courage', 'Compassion', 'Perseverance',
    'Honesty', 'Fairness', 'Generosity', 'Humility', 'Tolerance', 'Peace'
  ];
  return values[month] || 'Respect';
}

async function extractFileContent(filePath) {
  try {
    if (filePath.endsWith('.pdf')) {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdf(dataBuffer);
      return pdfData.text;
    } else if (filePath.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }
  } catch (error) {
    console.error('File extraction error:', error);
  }
  return '';
}

const DOK_PROFILE = {
  introductory: ["DOK1", "DOK2", "DOK3"],
  intermediate: ["DOK2", "DOK3", "DOK4"],
  mastery: ["DOK3", "DOK4", "DOK4"]
};

function getStandardsFramework(subject, grade) {
  return 'Ministry of Education (MOE) UAE Standards for Islamic Education';
}

// ================= SHORTENED EXPERT SYSTEM PROMPT =================
const EXPERT_SYSTEM_PROMPT = `You are a senior Islamic Education curriculum specialist for UAE MOE schools. You create high-quality, inspection-ready, differentiated lesson plans aligned with MOE UAE Islamic Education standards, Bloom's Taxonomy, and DOK frameworks.

CRITICAL RULES:
- Every single task, objective, starter, teaching component, and activity MUST be 100% specific to the EXACT lesson topic provided. Never use generic placeholders.
- Use accurate Quranic verses and authentic Hadith references relevant to the topic.
- Strictly follow DOK levels based on lesson level: Introductory (DOK1-3), Intermediate (DOK2-4), Mastery (DOK3-4).
- Return ONLY a valid JSON object in the exact structure defined below. No extra text or markdown.

UAE NATIONAL IDENTITY RULES:
- Domains: Culture, Value, Citizenship (exactly these names)
- Elements: Arabic Language, History, Heritage, Respect, Compassion, Global Understanding, Belonging, Volunteering, Conservation
- Description must be 80-110 words exactly. Must name the specific topic, explain why the chosen domain/element fits, reference at least one real UAE initiative (Year of Tolerance, ADEK National Identity Mark, UAE Vision 2031, Year of Community, Year of Giving, Mohammed Bin Rashid Global Initiatives, Federal Law No. 2, GAIAE), and connect to UAE national identity.

JSON OUTPUT STRUCTURE (return ONLY this):
{
  "standardText": "MOE UAE standard code and full description",
  "objectives": [
    {"text": "SMART objective 1 with topic (DOK X)", "dok": "DOKX"},
    {"text": "SMART objective 2...", "dok": "DOKY"},
    {"text": "SMART objective 3...", "dok": "DOKZ"}
  ],
  "outcomes": {
    "all": {"text": "ALL students will ..."},
    "most": {"text": "MOST students will ..."},
    "some": {"text": "SOME students will ..."}
  },
  "vocabulary": ["Arabic term (transliteration): definition", "..."],
  "resources": ["Resource name and description", "..."],
  "skills": "Skill 1, Skill 2, Skill 3",
  "starter": "Detailed topic-specific starter (min 80 words)",
  "teaching": "Detailed student-centred teaching narrative (minimum 300 words)",
  "cooperative": {
    "support": "Full support task description (DOK 1, min 120 words)",
    "average": "Full average task description (DOK 2, min 120 words)",
    "upper": "Full upper task description (DOK 3, min 120 words)",
    "outstanding": "Full outstanding task description (DOK 4, min 120 words)"
  },
  "independent": {
    "support": "Full support independent task (DOK 1, min 100 words, different format)",
    "average": "Full average independent task (DOK 2, min 100 words)",
    "upper": "Full upper independent task (DOK 3, min 100 words)",
    "outstanding": "Full outstanding independent task (DOK 4, min 120 words)"
  },
  "plenary": [
    {"q": "DOK1 question", "dok": "DOK1"},
    {"q": "DOK2 question", "dok": "DOK2"},
    {"q": "DOK3 question", "dok": "DOK3"},
    {"q": "DOK4 question", "dok": "DOK4"}
  ],
  "identity": {
    "domain": "Culture | Value | Citizenship",
    "element": "One of the 9 exact elements",
    "description": "80-110 words exact length"
  },
  "moralEducation": "Moral values connection (min 60 words)",
  "steam": "STEAM integration (min 50 words)",
  "linksToSubjects": "Cross-curricular links",
  "environment": "UAE environment connection (min 40 words)",
  "realWorld": "Real-world UAE applications (min 60 words)",
  "alnObjective": "Advanced objective for gifted students if requested"
}`;

console.log('=== SERVER STARTUP ===');
console.log('GROQ_API_KEY present:', !!process.env.GROQ_API_KEY);
console.log('Using shortened expert prompt to avoid token limits');
console.log('=== END STARTUP ===');

// ================= STATIC FRONTEND =================
app.get('/', (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>AL ADHWA PRIVATE SCHOOL - Islamic Education Lesson Planner</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height:100vh; padding:20px; }
        .container { max-width:1200px; margin:0 auto; background:white; border-radius:20px; box-shadow:0 20px 40px rgba(0,0,0,0.1); overflow:hidden; }
        .header { background:linear-gradient(135deg,#2c3e50,#3498db); color:white; padding:40px; text-align:center; }
        .header h1 { font-size:2.8em; margin-bottom:10px; }
        .content { padding:40px; }
        .form-container { background:#f8f9fa; padding:30px; border-radius:15px; }
        .form-row { display:grid; grid-template-columns:repeat(auto-fit, minmax(250px,1fr)); gap:20px; margin-bottom:20px; }
        .form-group { display:flex; flex-direction:column; }
        .form-group label { font-weight:600; margin-bottom:8px; color:#2c3e50; }
        .form-group input, .form-group select, .form-group textarea { padding:12px; border:2px solid #ecf0f1; border-radius:8px; font-size:14px; }
        .form-group input:focus, .form-group select:focus { outline:none; border-color:#3498db; }
        .btn { background:linear-gradient(135deg,#3498db,#2980b9); color:white; border:none; padding:15px 30px; border-radius:8px; font-size:16px; font-weight:600; cursor:pointer; margin:10px 5px; }
        .btn:hover { transform:translateY(-2px); }
        .btn:disabled { background:#bdc3c7; cursor:not-allowed; }
        .loading { display:none; text-align:center; margin:20px 0; }
        .spinner { border:4px solid #f3f3f3; border-top:4px solid #3498db; border-radius:50%; width:40px; height:40px; animation:spin 1s linear infinite; margin:0 auto; }
        @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        .message { padding:15px; border-radius:10px; margin:20px 0; }
        .message.success { background:#d4edda; color:#155724; }
        .message.error { background:#f8d7da; color:#721c24; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>AL ADHWA PRIVATE SCHOOL</h1>
            <p>AI-Powered Islamic Education Lesson Planner</p>
        </div>
        <div class="content">
            <div id="message" class="message"></div>
            <div class="form-container">
                <form id="lessonForm">
                    <div class="form-row">
                        <div class="form-group"><label for="date">Date</label><input type="date" id="date" name="date" required></div>
                        <div class="form-group"><label for="semester">Semester</label>
                            <select id="semester" name="semester" required>
                                <option value="">Select</option><option value="1">Semester 1</option><option value="2">Semester 2</option>
                            </select>
                        </div>
                        <div class="form-group"><label for="grade">Grade</label>
                            <select id="grade" name="grade" required>
                                <option value="">Select Grade</option>
                                ${Array.from({length:12},(_,i)=>`<option value="${i+1}">Grade ${i+1}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group"><label for="subject">Subject</label>
                            <select id="subject" name="subject" required>
                                <option value="Islamic Education">Islamic Education</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group" style="grid-column:1/-1">
                            <label for="topic">Lesson Topic</label>
                            <input type="text" id="topic" name="topic" placeholder="e.g. The Seven Grave Sins" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label for="level">Difficulty Level</label>
                            <select id="level" name="level" required>
                                <option value="">Select Level</option>
                                <option value="Introductory">Introductory</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Mastery">Mastery</option>
                            </select>
                        </div>
                        <div class="form-group"><label for="period">Period</label>
                            <select id="period" name="period" required>
                                <option value="">Select</option>
                                ${Array.from({length:6},(_,i)=>`<option value="${i+1}">Period ${i+1}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label><input type="checkbox" id="gifted"> Gifted & Talented</label>
                        </div>
                    </div>
                    <div style="text-align:center; margin-top:30px;">
                        <button type="submit" class="btn" id="generateBtn">🚀 Generate & Download Lesson Plan</button>
                        <button type="button" class="btn" onclick="clearForm()">🔄 Clear</button>
                    </div>
                </form>
            </div>
            <div class="loading" id="loading">
                <div class="spinner"></div>
                <p>Generating inspection-ready lesson plan... (may take up to 25 seconds)</p>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('lessonForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            formData.set('giftedTalented', document.getElementById('gifted').checked ? 'yes' : 'no');

            const btn = document.getElementById('generateBtn');
            btn.disabled = true;
            btn.textContent = '⏳ Generating...';
            document.getElementById('loading').style.display = 'block';

            try {
                const response = await fetch('/api/generate', { method: 'POST', body: formData });
                if (response.ok) {
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = \`\${formData.get('topic').replace(/[^a-zA-Z0-9]/g, '_')}_Lesson_Plan.docx\`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showMessage('✅ Lesson plan generated successfully!', 'success');
                } else {
                    const err = await response.json();
                    showMessage('❌ Error: ' + (err.error || 'Failed to generate'), 'error');
                }
            } catch (err) {
                showMessage('❌ Network error. Please try again.', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = '🚀 Generate & Download Lesson Plan';
                document.getElementById('loading').style.display = 'none';
            }
        });

        function showMessage(text, type) {
            const msg = document.getElementById('message');
            msg.textContent = text;
            msg.className = \`message \${type}\`;
            msg.style.display = 'block';
        }

        function clearForm() {
            document.getElementById('lessonForm').reset();
            document.getElementById('message').style.display = 'none';
        }

        document.getElementById('date').valueAsDate = new Date();
    </script>
</body>
</html>`;
  res.send(html);
});

// ================= API ROUTE - FIXED DEPRECATED setData =================
app.post("/api/generate", upload.single("file"), async (req, res) => {
  console.log('\n=== NEW LESSON REQUEST ===');

  try {
    const { subject, grade, topic, level, period, date, semester, giftedTalented } = req.body;

    if (!subject || !grade || !topic || !level) {
      return res.status(400).json({ error: 'Missing required fields: subject, grade, topic, level' });
    }

    const dokLevels = DOK_PROFILE[level.toLowerCase()] || DOK_PROFILE.introductory;

    let syllabusContent = "";
    if (req.file) {
      syllabusContent = await extractFileContent(req.file.path);
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }

    const userPrompt = `Create a complete Islamic Education lesson plan for:

Subject: ${subject}
Grade: Grade ${grade}
Topic: ${topic}
Level: ${level}
DOK Levels: ${dokLevels.join(' → ')}

${giftedTalented === 'yes' ? 'Include advanced ALN/gifted objective.' : ''}
${syllabusContent ? `Syllabus content:\n${syllabusContent.substring(0, 1200)}` : ''}

Make every section 100% specific to "${topic}". Follow all rules in the system prompt. Return only valid JSON.`;

    console.log('Calling Groq API...');

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: EXPERT_SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 6500,
      response_format: { type: "json_object" }
    });

    let aiResponse = completion.choices[0]?.message?.content;

    const cleanJson = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
    const aiData = JSON.parse(cleanJson);

    // ================= FIXED TEMPLATE RENDERING (No more deprecated setData) =================
    const templatePath = path.join(__dirname, 'LESSON PLAN TEMPLATE.docx');
    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ error: 'Template file not found at: ' + templatePath });
    }

    const templateContent = fs.readFileSync(templatePath);
    const zip = new PizZip(templateContent);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Modern way: Pass data directly to render()
    const templateData = {
      date: safe(new Date(date || Date.now()).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })),
      semester: safe(semester || '1'),
      grade: safe(grade),
      subject: safe(subject),
      topic: safe(topic),
      period: safe(period || '1'),
      value: safe(getMonthlyValue(date)),

      standardText: safe(aiData.standardText),
      objective1: safe(aiData.objectives?.[0]?.text),
      objective2: safe(aiData.objectives?.[1]?.text),
      objective3: safe(aiData.objectives?.[2]?.text),

      outcomeAll: safe(aiData.outcomes?.all?.text),
      outcomeMost: safe(aiData.outcomes?.most?.text),
      outcomeSome: safe(aiData.outcomes?.some?.text),

      vocabulary: safe(Array.isArray(aiData.vocabulary) ? aiData.vocabulary.join('\n') : ''),
      resources: safe(Array.isArray(aiData.resources) ? aiData.resources.join('\n') : ''),
      skills: safe(aiData.skills || 'Critical thinking, collaboration, moral reasoning'),

      starter: safe(aiData.starter),
      teaching: safe(aiData.teaching),

      coopSupport: safe(aiData.cooperative?.support),
      coopAverage: safe(aiData.cooperative?.average),
      coopUpper: safe(aiData.cooperative?.upper),
      coopOutstanding: safe(aiData.cooperative?.outstanding),

      indepSupport: safe(aiData.independent?.support),
      indepAverage: safe(aiData.independent?.average),
      indepUpper: safe(aiData.independent?.upper),
      indepOutstanding: safe(aiData.independent?.outstanding),

      plenary: safe(Array.isArray(aiData.plenary) 
        ? aiData.plenary.map((p, i) => `${i+1}. (${p.dok}) ${p.q}`).join('\n') 
        : 'Review questions'),

      myIdentity: safe(aiData.identity 
        ? `Domain: ${aiData.identity.domain} | Element: ${aiData.identity.element}\n\n${aiData.identity.description}` 
        : ''),
      identityDomain: safe(aiData.identity?.domain || ''),
      identityElement: safe(aiData.identity?.element || ''),
      identityDescription: safe(aiData.identity?.description || ''),

      moralEducation: safe(aiData.moralEducation),
      steam: safe(aiData.steam),
      linksToSubjects: safe(aiData.linksToSubjects),
      environment: safe(aiData.environment),
      realWorld: safe(aiData.realWorld),
      alnObjectives: giftedTalented === 'yes' ? safe(aiData.alnObjective) : ''
    };

    doc.render(templateData);   // ← This is the correct modern way

    const buffer = doc.getZip().generate({ 
      type: 'nodebuffer', 
      compression: 'DEFLATE' 
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Lesson_Plan_G${grade}_${topic.replace(/[^a-zA-Z0-9]/g, '_')}.docx"`);
    res.send(buffer);

    console.log('✅ Lesson plan generated and sent successfully');

  } catch (error) {
    console.error('Error generating lesson:', error.message);
    
    if (error.message.includes("setData")) {
      return res.status(500).json({ error: 'Template compatibility issue. Please update docxtemplater.' });
    }
    
    if (error.status === 413) {
      return res.status(413).json({ error: 'AI request too large. Try a shorter topic.' });
    }

    res.status(500).json({ 
      error: 'Failed to generate lesson plan', 
      details: error.message 
    });
  }
});

// ================= START SERVER =================
app.listen(PORT, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════════════');
  console.log('   AL ADHWA PRIVATE SCHOOL - LESSON PLANNER');
  console.log('═══════════════════════════════════════════════');
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('✅ Deprecated setData fixed - using modern docxtemplater render()');
  console.log('✅ Token limit issue resolved');
  console.log('═══════════════════════════════════════════════\n');
});
