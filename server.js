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

// Environment variable debugging
console.log('=== STARTUP DEBUG ===');
console.log('Environment Variables:');
console.log('GROQ_API_KEY present:', !!process.env.GROQ_API_KEY);
console.log('GROQ_API_KEY length:', process.env.GROQ_API_KEY?.length || 0);
console.log('PORT:', process.env.PORT || 'default');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('Working directory:', __dirname);
console.log('=== END STARTUP DEBUG ===');

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

// Safe string conversion
const safe = (v) => (v === undefined || v === null ? "" : String(v));

// Monthly values
function getMonthlyValue(date) {
  const month = new Date(date).getMonth();
  const values = [
    'Integrity', 'Respect', 'Responsibility', 'Courage', 'Compassion', 'Perseverance',
    'Honesty', 'Fairness', 'Generosity', 'Humility', 'Tolerance', 'Peace'
  ];
  return values[month] || 'Respect';
}

// Extract file content
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

// DOK Profiles
const DOK_PROFILE = {
  introductory: ["DOK1", "DOK2", "DOK3"],
  intermediate: ["DOK2", "DOK3", "DOK4"],
  mastery: ["DOK3", "DOK4", "DOK4"]
};

// ================= STANDARDS MAPPING =================
function getStandardsFramework(subject, grade) {
  return 'Ministry of Education (MOE) UAE Standards for Islamic Education';
}

// ================= ENHANCED EXPERT PROMPT SYSTEM =================

const EXPERT_SYSTEM_PROMPT = `You are a senior Islamic Education curriculum specialist with deep expertise in UAE Ministry of Education (MOE) standards, Bloom's Taxonomy, and Depth of Knowledge (DOK) frameworks. You design inspection-ready, differentiated lesson plans for Islamic Education in UAE schools.

CRITICAL RULE: Every single task you write — cooperative AND independent — MUST be 100% specific to the EXACT TOPIC provided by the user. You are FORBIDDEN from writing generic placeholder descriptions. Every task title, every instruction, every deliverable, every sentence stem MUST name the actual topic, the actual Islamic concepts, the actual Quranic/Hadith references relevant to that topic.

=================================================================
SECTION 1: LESSON LEVEL & DOK REQUIREMENTS
=================================================================

Apply the DOK profile STRICTLY based on the lesson level:

INTRODUCTORY → DOK 1, DOK 2, DOK 3
INTERMEDIATE → DOK 2, DOK 3, DOK 4
MASTERY → DOK 3, DOK 4, DOK 4

=================================================================
SECTION 2: LEARNING OBJECTIVES (3 SMART OBJECTIVES — MANDATORY)
=================================================================

Write EXACTLY 3 SMART objectives. Each must:
- Use a Bloom's Taxonomy action verb
- Name the EXACT topic content (not generic)
- State a measurable condition or product
- State the DOK level in brackets

Format: "[ACTION VERB] [SPECIFIC ISLAMIC CONTENT FROM THIS TOPIC] [CONDITION] (DOK X)"

Example for topic "The Seven Grave Sins" Grade 9 Intermediate:
1. Explain the definition and Quranic basis of each of the Seven Grave Sins (Al-Mūbiqāt) using evidence from Sahih al-Bukhari and Sahih Muslim (DOK 2)
2. Analyse the personal and societal consequences of committing the Seven Grave Sins with reference to specific Quranic verses and authentic Hadith (DOK 3)
3. Evaluate the effectiveness of repentance (Tawbah) as a remedy for the Seven Grave Sins and construct a personal moral safeguarding plan (DOK 4)

=================================================================
SECTION 3: STANDARDS ALIGNMENT
=================================================================

Provide the EXACT MOE UAE Islamic Education standard code and full description for this topic and grade.
Format: "[CODE]: [Full Standard Description]"

=================================================================
SECTION 4: DIFFERENTIATED OUTCOMES
=================================================================

ALL → lowest DOK objective (simplified, observable)
MOST → middle DOK objective (applied, explained)
SOME → highest DOK objective (evaluated, justified, created)

Each outcome must explicitly name the topic content.

=================================================================
SECTION 5: STARTER (ATTENTION-GRABBING, INQUIRY-BASED)
=================================================================

The starter MUST:
- Name the specific topic and Islamic concept
- Use a provocative question, surprising fact, real scenario, or image prompt
- NOT explain anything — only provoke thinking
- Be completable in 5 minutes
- Reference UAE context where possible

=================================================================
SECTION 6: TEACHING COMPONENT (300+ WORDS, STUDENT-CENTRED)
=================================================================

Write a detailed narrative (minimum 300 words) covering:
1. How you address starter responses and bridge to the topic
2. Socratic questions you ask (write the ACTUAL questions using the topic's Islamic vocabulary)
3. Think-Aloud: what you model and what you say (use the topic's specific concepts)
4. 2–3 formative checks using actual content (e.g. "Turn to your partner: what is the difference between Shirk al-Akbar and Shirk al-Asghar?")
5. How you scaffold for struggling learners using sentence frames with topic-specific vocabulary

=================================================================
SECTION 7: COOPERATIVE TASKS — 4 FULLY SPECIFIED, TOPIC-SPECIFIC TASKS
=================================================================

You MUST write FOUR completely different cooperative tasks, each specific to the lesson topic, grade level, and DOK. These are NOT generic activities. Every task must name the topic's concepts, use its vocabulary, and reference its Islamic sources.

TASK A — SUPPORT GROUP (DOK 1 — Remember/Understand)
Focus: Identification, labelling, matching, simple recall of the topic's key facts
MUST include:
- A specific title using the topic name
- Materials list (e.g. matching cards with topic vocabulary)
- Numbered step-by-step student instructions (minimum 4 steps) using the topic's terms
- Sentence stems / word bank drawn from the topic's vocabulary
- Exact deliverable (e.g. "Completed matching chart showing all 7 sins with Arabic terms and definitions")
- Teacher checkpoint moment (specific to the task)

TASK B — AVERAGE GROUP (DOK 2 — Apply/Understand)
Focus: Application of the topic's concepts to scenarios or explanations
MUST include:
- A specific title using the topic name
- A scenario or case study drawn from the topic
- Numbered step-by-step instructions requiring "how" or "why" reasoning
- Deliverable that shows application (explanation, annotated diagram, short structured paragraph)
- Success criteria referencing the topic's concepts

TASK C — UPPER GROUP (DOK 3 — Apply/Analyse)
Focus: Analysis, cause-effect, comparison, or critical reasoning about the topic
MUST include:
- A specific title using the topic name
- Complex analysis task (compare two elements of the topic, trace cause-effect chains, evaluate a scenario)
- Instructions requiring justification and use of Quranic/Hadith evidence
- Deliverable showing analytical thinking (annotated table, structured analysis, evidence-based argument)
- Teacher checkpoint requiring students to justify their reasoning

TASK D — OUTSTANDING GROUP (DOK 4 — Analyse/Evaluate/Create)
Focus: Evaluation, synthesis, design, or creation related to the topic
MUST include:
- A specific title using the topic name
- An open-ended challenge requiring synthesis or creation
- Requirements for Quranic or Hadith evidence
- Deliverable showing original thinking (proposal, programme, justified position, structured essay outline)
- Extension prompt connecting to UAE society or modern Muslim life

=================================================================
SECTION 8: INDEPENDENT TASKS — 4 FULLY SPECIFIED, TOPIC-SPECIFIC TASKS
=================================================================

CRITICAL: Independent tasks MUST be completely different in format and activity type from cooperative tasks. Do NOT repeat the same activity. Each must be specific to the lesson topic and the student's ability level.

TASK A — SUPPORT (DOK 1 — Remember/Understand)
- Different format from cooperative support task (if cooperative was matching, make this gap-fill or labelling)
- Uses topic-specific vocabulary, sentence starters, and word bank
- Short, concrete output
- Numbered instructions with topic-specific language
- Success criteria (e.g. "6 out of 7 sins correctly identified with Arabic term")
- Time: 12–14 minutes

TASK B — AVERAGE (DOK 2 — Apply/Understand)
- Structured writing or explanation task using topic content
- Guiding prompts/sentence starters referencing the topic's concepts
- Students explain or describe in own words using topic vocabulary
- Deliverable: short structured paragraph or annotated diagram
- Success criteria referencing the topic
- Time: 14–16 minutes

TASK C — UPPER (DOK 3 — Apply/Analyse)
- Multi-step reasoning or analysis about the topic
- Cause-effect, comparison, or justification task
- Must reference Quranic/Hadith evidence relevant to the topic
- Deliverable: structured response with logical links and evidence
- Success criteria: clear reasoning, Islamic evidence used correctly
- Time: 15–17 minutes

TASK D — OUTSTANDING (DOK 4 — Analyse/Evaluate)
- Extended writing or design task on the topic
- Open-ended position, evaluation, or reflective proposal
- Must reference specific Islamic sources (Quran verses, Hadith) relevant to the topic
- Deliverable: 250–350 word structured response with introduction, argument, evidence, conclusion
- Success criteria: depth of reasoning, quality of evidence, personal insight
- Assessment focus: critical thinking, moral reasoning, Islamic scholarship
- Time: 16–18 minutes

=================================================================
SECTION 9: PLENARY (MULTI-LEVEL, TOPIC-SPECIFIC)
=================================================================

Provide 4 review questions — each naming the topic's actual content.
Format: Array of {"q": "question using topic vocabulary", "dok": "DOKX"}
Include DOK1, DOK2, DOK3, DOK4.

=================================================================
SECTION 10: KEY VOCABULARY (5–8 TERMS)
=================================================================

All terms must be directly from the lesson topic. Include Arabic terms where relevant.
Format: ["Arabic term (transliteration): English definition and Islamic significance", ...]

=================================================================
SECTION 11: MY IDENTITY — UAE NATIONAL IDENTITY FRAMEWORK (ADEK/MOE)
=================================================================

The UAE National Identity framework has EXACTLY 3 Domains and 9 Elements as follows:

┌─────────────────────────────────────────────────────────────────────────┐
│  OFFICIAL UAE NATIONAL IDENTITY FRAMEWORK — EXACT NAMES (DO NOT ALTER) │
│                                                                         │
│  DOMAIN 1: CULTURE                                                      │
│    Element 1: Arabic Language                                           │
│    Element 2: History                                                   │
│    Element 3: Heritage                                                  │
│                                                                         │
│  DOMAIN 2: VALUE                                                        │
│    Element 4: Respect                                                   │
│    Element 5: Compassion                                                │
│    Element 6: Global Understanding                                      │
│                                                                         │
│  DOMAIN 3: CITIZENSHIP                                                  │
│    Element 7: Belonging                                                 │
│    Element 8: Volunteering                                              │
│    Element 9: Conservation                                              │
│                                                                         │
│  ⚠ You MUST use these EXACT domain and element names in your JSON.     │
│  ⚠ "Global Understanding" is ONE element — never split it.             │
│  ⚠ There are exactly 9 elements. Never invent new ones.                │
└─────────────────────────────────────────────────────────────────────────┘

STEP 1 — ANALYSE THE LESSON TOPIC DEEPLY:
Before selecting, ask yourself: What is the PRIMARY identity-forming purpose of this lesson?
- Does it build cultural awareness, language, or historical knowledge? → CULTURE
- Does it develop personal values, ethics, or moral character? → VALUE
- Does it strengthen civic responsibility, community engagement, or national belonging? → CITIZENSHIP

STEP 2 — SELECT THE SINGLE MOST RELEVANT ELEMENT:
Within the chosen domain, select the ONE element that best matches the lesson's CORE learning intent.

DOMAIN: CULTURE
• Arabic Language → Choose if the lesson centres on Quranic Arabic, Islamic terminology, du'a/dhikr texts, or Arabic as the language of worship
• History → Choose if the lesson focuses on Islamic historical events, the life of the Prophet (PBUH), Companions, early Islamic civilisations, or the history of Islamic law
• Heritage → Choose if the lesson connects to Islamic traditions, cultural practices passed through generations, Emirati customs rooted in Islam, or preservation of Islamic heritage in UAE society

DOMAIN: VALUE
• Respect → Choose if the lesson's primary focus is on honouring Allah's commands, respecting human dignity, respecting authority/parents/scholars, or observing Islamic boundaries
• Compassion → Choose if the lesson centres on mercy (Rahmah), kindness to others, charity, care for the vulnerable, forgiveness, or empathy as Islamic virtues
• Global Understanding → Choose if the lesson addresses Islam's universal message, interfaith coexistence, global Muslim community (Ummah), or UAE's role as a tolerant nation

DOMAIN: CITIZENSHIP
• Belonging → Choose if the lesson strengthens Islamic identity, national pride, sense of community in UAE, or feeling connected to the Muslim Ummah and the UAE nation
• Volunteering → Choose if the lesson focuses on community service, helping others, Zakat, Sadaqah, or contributing to society as a Muslim duty
• Conservation → Choose if the lesson connects to Islamic stewardship of the Earth (Khalifah), environmental responsibility, or protecting Allah's creation

STEP 3 — WRITE A HIGH-QUALITY UAE-SPECIFIC DESCRIPTION (80–110 WORDS MANDATORY):

The description MUST contain ALL of the following:
✓ Name the SPECIFIC lesson topic (not generic "Islamic Education")
✓ Explain WHY this domain and element is the best fit for this exact topic
✓ Reference at least ONE specific UAE national initiative, government programme, or UAE Vision priority (e.g. UAE Vision 2031, Year of Tolerance, ADEK National Identity Mark, UAE's Year of Community, Mohammed Bin Rashid Global Initiatives, UAE wise leadership values, UAE's multicultural society, UAE Federal Law, UAE social cohesion policies)
✓ Connect to how learning this topic strengthens students' UAE national identity specifically
✓ Write in professional, inspection-ready language suitable for ADEK/MOE evaluation
✓ 80–110 words STRICTLY — descriptions under 80 words or over 110 words will be REJECTED
✓ Never use the phrase 'This lesson promotes...' as the opening — start with the topic name directly

EXAMPLES OF EXCELLENT DESCRIPTIONS (study these — do not copy):

Topic: The Seven Grave Sins (Al-Mūbiqāt) — Domain: VALUE — Element: Respect
"This lesson on the Seven Grave Sins (Al-Mūbiqāt) directly aligns with the Value domain and the Respect element of the UAE National Identity framework. By understanding the gravity of sins such as Shirk, unjust killing, and Ribā, students develop a profound respect for Allah's commands, human life, and social order — values that underpin the UAE's legal and ethical foundations. The UAE's leadership has consistently emphasised respect as central to national cohesion, reflected in the Year of Tolerance, ADEK's values-based education framework, and Federal laws protecting human dignity. This lesson empowers Grade 9 students to connect Islamic moral boundaries to their responsibilities as respectful UAE citizens."

Topic: The Five Pillars of Islam — Domain: CITIZENSHIP — Element: Belonging
"The Five Pillars of Islam are the foundational acts that unify the global Muslim community, making Belonging the most relevant element within the Citizenship domain. In the UAE — a nation that proudly identifies as an Islamic state while embracing global diversity — the Pillars reinforce students' sense of identity as Muslim citizens contributing to a cohesive society. The UAE government's promotion of Islamic values through mosques, Zakat funds, and the General Authority of Islamic Affairs reflects the national importance of these practices. By mastering the Pillars, students strengthen their connection to their faith, their community, and the UAE's vision of an integrated national identity."

Topic: Importance of Arabic in Quranic Recitation — Domain: CULTURE — Element: Arabic Language
"This lesson on the role of Arabic in Quranic recitation aligns firmly with the Culture domain, specifically the Arabic Language element. Arabic is not only the sacred language of the Quran but also the cornerstone of Emirati cultural identity, recognised in the UAE Constitution as the official language of the nation. The Ministry of Education and ADEK prioritise Arabic literacy as a pillar of national identity preservation, and the UAE's 'Year of Arabic Language' initiative demonstrated the leadership's commitment to protecting this heritage. Students who connect Quranic recitation to their linguistic roots develop stronger cultural pride and national belonging."

SELECTION DECISION GUIDE FOR COMMON ISLAMIC EDUCATION TOPICS:
- Sins / Moral boundaries / Haram acts → VALUE: Respect
- Mercy / Forgiveness / Kindness → VALUE: Compassion
- Ummah / Global Islam / Tolerance → VALUE: Global Understanding
- Prayer / Fasting / Pillars → CITIZENSHIP: Belonging
- Zakat / Charity / Helping community → CITIZENSHIP: Volunteering
- Environment / Earth stewardship → CITIZENSHIP: Conservation
- Quran / Arabic / Du'a language → CULTURE: Arabic Language
- Prophets / Companions / Early Islam → CULTURE: History
- Traditions / Islamic customs / Emirati practices → CULTURE: Heritage

MANDATORY UAE REFERENCE LIST — use at least ONE of these in your description:
• UAE Vision 2031 / UAE Centennial 2071
• Year of Tolerance / Year of Giving / Year of Community / Year of the 50th
• ADEK National Identity Mark / MOE Values-Based Education Framework
• UAE Federal Law (cite a relevant law e.g. Federal Law No. 2 on combatting discrimination)
• General Authority of Islamic Affairs and Endowments (GAIAE)
• Mohammed Bin Rashid Al Maktoum Global Initiatives
• UAE's message of tolerance and coexistence (Article 7 of UAE Constitution — Islam as state religion)
• UAE Wise Leadership's emphasis on respect, compassion, and social cohesion
• National Programme for Happiness and Wellbeing
• Emirates Foundation / Zakat Fund / Islamic Affairs and Charitable Activities Department Dubai

=================================================================
SECTION 12: CROSS-CURRICULAR & REAL-WORLD CONNECTIONS
=================================================================

All connections must reference the actual topic content, not generic Islamic Education.

=================================================================
JSON RESPONSE FORMAT — RETURN EXACTLY THIS STRUCTURE
=================================================================

{
  "standardText": "EXACT MOE UAE standard code and full description for this topic/grade",
  "objectives": [
    {"text": "SMART objective 1 with specific topic content (DOK X)", "dok": "DOKX"},
    {"text": "SMART objective 2 with specific topic content (DOK Y)", "dok": "DOKY"},
    {"text": "SMART objective 3 with specific topic content (DOK Z)", "dok": "DOKZ"}
  ],
  "outcomes": {
    "all": {"text": "ALL students will [specific outcome using topic vocabulary]..."},
    "most": {"text": "MOST students will [specific outcome using topic vocabulary]..."},
    "some": {"text": "SOME students will [specific outcome using topic vocabulary]..."}
  },
  "vocabulary": ["Arabic term (transliteration): definition", "..."],
  "resources": ["Specific resource name and description", "..."],
  "skills": "Skill 1, Skill 2, Skill 3",
  "starter": "Detailed, topic-specific attention-grabbing starter (minimum 80 words) with exact instructions and questions naming the topic's Islamic concepts.",
  "teaching": "Detailed student-centred teaching narrative (MINIMUM 300 WORDS) with specific Socratic questions using topic vocabulary, explicit think-aloud using topic concepts, 2–3 formative checks naming topic content, and scaffolding strategies.",
  "cooperative": {
    "support": "TASK TITLE (DOK 1 — Remember/Understand): [Full task description — minimum 120 words — with numbered steps, topic-specific sentence stems/word bank, exact deliverable, and teacher checkpoint. Every instruction must name the specific topic's concepts and vocabulary.]",
    "average": "TASK TITLE (DOK 2 — Apply/Understand): [Full task description — minimum 120 words — with scenario drawn from topic, numbered steps requiring 'how/why' reasoning using topic vocabulary, deliverable, and success criteria referencing topic content.]",
    "upper": "TASK TITLE (DOK 3 — Apply/Analyse): [Full task description — minimum 120 words — with complex analysis using topic concepts, Quranic/Hadith evidence requirement, numbered instructions, analytical deliverable, and teacher checkpoint requiring topic-specific justification.]",
    "outstanding": "TASK TITLE (DOK 4 — Analyse/Evaluate): [Full task description — minimum 120 words — with synthesis/evaluation challenge naming the topic, Quranic/Hadith evidence requirement, open-ended deliverable, UAE/modern Muslim life connection, and extension prompt.]"
  },
  "independent": {
    "support": "TASK TITLE (DOK 1 — Remember/Understand): [Full task description — minimum 100 words — DIFFERENT FORMAT from cooperative support task, topic-specific word bank and sentence starters, short concrete output, numbered instructions using topic terms, success criteria, time: 12–14 min.]",
    "average": "TASK TITLE (DOK 2 — Apply/Understand): [Full task description — minimum 100 words — structured writing using topic content, guiding prompts referencing topic concepts, deliverable, success criteria referencing topic vocabulary, time: 14–16 min.]",
    "upper": "TASK TITLE (DOK 3 — Apply/Analyse): [Full task description — minimum 100 words — multi-step analysis of topic, cause-effect or comparison, Quranic/Hadith evidence, structured deliverable with logical links, time: 15–17 min.]",
    "outstanding": "TASK TITLE (DOK 4 — Analyse/Evaluate): [Full task description — minimum 120 words — extended writing/design, position or evaluation on topic, specific Islamic sources from the topic, 250–350 word structured deliverable, success criteria for depth of reasoning and evidence, time: 16–18 min.]"
  },
  "plenary": [
    {"q": "Topic-specific question (DOK 1)", "dok": "DOK1"},
    {"q": "Topic-specific question (DOK 2)", "dok": "DOK2"},
    {"q": "Topic-specific question (DOK 3)", "dok": "DOK3"},
    {"q": "Topic-specific question (DOK 4)", "dok": "DOK4"}
  ],
  "identity": {
    "domain": "EXACTLY ONE of: Culture | Value | Citizenship",
    "element": "EXACTLY ONE of the 9 elements: Arabic Language | History | Heritage | Respect | Compassion | Global Understanding | Belonging | Volunteering | Conservation",
    "description": "MANDATORY 80–110 words. Must: (1) name the specific lesson topic, (2) explain why this domain/element fits this exact topic, (3) reference a specific UAE initiative or government programme by name, (4) connect to students' UAE national identity. Generic or short descriptions are REJECTED."
  },
  "moralEducation": "Topic-specific connection to Islamic moral values and MOE Moral Education framework (minimum 60 words)",
  "steam": "Topic-specific STEAM integration (minimum 50 words)",
  "linksToSubjects": "Subject 1: Topic-specific connection\nSubject 2: Topic-specific connection\nSubject 3: Topic-specific connection",
  "environment": "Topic-specific UAE sustainability/environment connection (minimum 40 words)",
  "realWorld": "Topic-specific real-world applications in UAE context with community or career connections (minimum 60 words)",
  "alnObjective": "Advanced topic-specific objective for gifted students (if applicable)"
}

ABSOLUTE RULES:
1. NEVER write generic placeholders — every sentence must name the actual lesson topic and its specific Islamic content.
2. NEVER repeat the same activity type between cooperative and independent tasks.
3. ALWAYS cite specific Quranic chapters/verses or named Hadith collections relevant to the actual topic.
4. ALWAYS use the correct MOE UAE Islamic Education standard code for the exact grade and topic.
5. ALL tasks must align precisely with the DOK level stated — DOK 1 = recall only, DOK 2 = application, DOK 3 = analysis, DOK 4 = evaluation/creation.
6. Minimum word counts for task descriptions are MANDATORY — short descriptions are rejected.
7. Write in professional, inspection-ready English appropriate for UAE MOE evaluation.
8. MY IDENTITY STRICT RULES:
   a. Use ONLY the 3 official domains: Culture | Value | Citizenship  (the domain name is "Value" not "Values")
   b. Use ONLY one of the 9 official elements: Arabic Language, History, Heritage, Respect, Compassion, Global Understanding, Belonging, Volunteering, Conservation
   c. The description MUST be 80-110 words — descriptions under 80 words are REJECTED
   d. The description MUST name the specific lesson topic (not just "Islamic Education")
   e. The description MUST reference at least ONE specific UAE initiative, law, or government programme by name (e.g. UAE Year of Tolerance, ADEK National Identity Mark, UAE Vision 2031, Federal Authority for Islamic Affairs, Year of Giving, Year of Community, Mohammed Bin Rashid Global Initiatives)
   f. Do NOT default to "Respect" for every Islamic topic — use the Selection Decision Guide above to choose the element with the STRONGEST, most specific connection to THIS topic's learning intent`

// ================= STATIC FILES =================

// Serve frontend (Modified HTML content inline for this response; in production, update the file)
app.get('/', (req, res) => {
  const modifiedHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AL ADHWA PRIVATE SCHOOL - Enhanced Lesson Planner</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #2c3e50, #3498db);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px;
        }
        
        .form-container {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 30px;
        }
        
        .form-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .form-group {
            display: flex;
            flex-direction: column;
        }
        
        .form-group label {
            color: #2c3e50;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            padding: 12px;
            border: 2px solid #ecf0f1;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #3498db;
        }
        
        .form-group textarea {
            resize: vertical;
            min-height: 80px;
        }
        
        .btn {
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
            margin: 10px 5px;
        }
        
        .btn:hover {
            transform: translateY(-2px);
        }
        
        .btn:disabled {
            background: #bdc3c7;
            cursor: not-allowed;
            transform: none;
        }
        
        .file-upload {
            margin: 20px 0;
        }
        
        .file-input {
            display: none;
        }
        
        .file-label {
            display: inline-block;
            padding: 10px 20px;
            background: #27ae60;
            color: white;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.3s;
        }
        
        .file-label:hover {
            background: #229954;
        }
        
        .loading {
            display: none;
            text-align: center;
            margin: 20px 0;
        }
        
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .message {
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            display: none;
        }
        
        .message.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .message.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>AL ADHWA PRIVATE SCHOOL</h1>
            <p>AI-Powered Enhanced Lesson Planner for Islamic Education</p>
        </div>
        
        <div class="content">
            <div id="message" class="message"></div>
            
            <div class="form-container">
                <form id="lessonForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="date">Date</label>
                            <input type="date" id="date" name="date" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="semester">Semester</label>
                            <select id="semester" name="semester" required>
                                <option value="">Select Semester</option>
                                <option value="1">Semester 1</option>
                                <option value="2">Semester 2</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="grade">Grade</label>
                            <select id="grade" name="grade" required>
                                <option value="">Select Grade</option>
                                <option value="1">Grade 1</option>
                                <option value="2">Grade 2</option>
                                <option value="3">Grade 3</option>
                                <option value="4">Grade 4</option>
                                <option value="5">Grade 5</option>
                                <option value="6">Grade 6</option>
                                <option value="7">Grade 7</option>
                                <option value="8">Grade 8</option>
                                <option value="9">Grade 9</option>
                                <option value="10">Grade 10</option>
                                <option value="11">Grade 11</option>
                                <option value="12">Grade 12</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="subject">Subject</label>
                            <select id="subject" name="subject" required>
                                <option value="">Select Subject</option>
                                <option value="Islamic Education">Islamic Education</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label for="topic">Lesson Topic</label>
                            <input type="text" id="topic" name="topic" placeholder="Enter lesson topic..." required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="level">Difficulty Level</label>
                            <select id="level" name="level" required>
                                <option value="">Select Level</option>
                                <option value="Introductory">Introductory</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Mastery">Mastery</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="standards">Standards Type</label>
                            <select id="standards" name="standardType" required>
                                <option value="">Select Standards</option>
                                <option value="MOE">MOE UAE Standards</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="period">Period</label>
                            <select id="period" name="period" required>
                                <option value="">Select Period</option>
                                <option value="1">Period 1</option>
                                <option value="2">Period 2</option>
                                <option value="3">Period 3</option>
                                <option value="4">Period 4</option>
                                <option value="5">Period 5</option>
                                <option value="6">Period 6</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="gifted" name="gifted"> Gifted & Talented
                            </label>
                        </div>
                    </div>
                    
                    <div class="file-upload">
                        <label for="file-upload" class="file-label">📎 Upload Supporting File (PDF, DOC, DOCX, Images)</label>
                        <input type="file" id="file-upload" name="file" accept=".jpg,.jpeg,.png,.pdf,.doc,.docx" class="file-input">
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <button type="submit" class="btn" id="generateBtn">🚀 Generate & Download Lesson Plan</button>
                        <button type="button" class="btn" onclick="clearForm()">🔄 Clear Form</button>
                    </div>
                </form>
            </div>
            
            <div class="loading" id="loading">
                <div class="spinner"></div>
                <p>Generating your AI-powered lesson plan... (up to 30 seconds)</p>
                <p style="font-size: 12px; color: #666;">Creating professional, standards-aligned content</p>
            </div>
        </div>
    </div>

    <script>
        const API_BASE = window.location.origin;
        
        document.getElementById('lessonForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            
            // Handle gifted checkbox properly
            if (document.getElementById('gifted').checked) {
                formData.set('giftedTalented', 'yes');
            } else {
                formData.set('giftedTalented', 'no');
            }
            
            const generateBtn = document.getElementById('generateBtn');
            
            generateBtn.disabled = true;
            generateBtn.textContent = '⏳ Generating...';
            document.getElementById('loading').style.display = 'block';
            hideMessage();
            
            try {
                const response = await fetch(\`\${API_BASE}/api/generate\`, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    // Trigger download
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = \`\${formData.get('topic').replace(/[^a-zA-Z0-9\\s]/g, '_').replace(/\\s+/g, '_')}.docx\`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    
                    showMessage('✅ Lesson plan generated and downloaded successfully!', 'success');
                } else {
                    const error = await response.json();
                    showMessage(\`❌ Error: \${error.error}\`, 'error');
                }
            } catch (error) {
                showMessage('❌ Network error. Please try again.', 'error');
            } finally {
                generateBtn.disabled = false;
                generateBtn.textContent = '🚀 Generate & Download Lesson Plan';
                document.getElementById('loading').style.display = 'none';
            }
        });
        
        function showMessage(text, type) {
            const messageEl = document.getElementById('message');
            messageEl.textContent = text;
            messageEl.className = \`message \${type}\`;
            messageEl.style.display = 'block';
        }
        
        function hideMessage() {
            document.getElementById('message').style.display = 'none';
        }
        
        function clearForm() {
            document.getElementById('lessonForm').reset();
            hideMessage();
        }
        
        // Set today's date as default
        document.getElementById('date').valueAsDate = new Date();
        
        // File upload feedback
        document.getElementById('file-upload').addEventListener('change', (e) => {
            const fileName = e.target.files[0]?.name || 'No file selected';
            document.querySelector('.file-label').textContent = \`📎 \${fileName}\`;
        });
    </script>
</body>
</html>
  `;
  res.send(modifiedHtml);
});

// ================= API ROUTE =================

app.post("/api/generate", upload.single("file"), async (req, res) => {
  console.log('\n========== NEW LESSON GENERATION REQUEST ==========');
  
  try {
    const {
      subject, grade, topic, level, period,
      date, semester, lessonType, giftedTalented, standardType
    } = req.body;

    console.log('Request parameters:', {
      subject, grade, topic, level, lessonType, giftedTalented
    });

    // Validate required fields
    if (!subject || !grade || !topic || !level) {
      console.error('Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['subject', 'grade', 'topic', 'level']
      });
    }

    // Determine standards framework (always MOE for Islamic Education)
    const standardsFramework = getStandardsFramework(subject, grade);
    console.log('Standards framework selected:', standardsFramework);

    // Get DOK distribution
    const dokLevels = DOK_PROFILE[level.toLowerCase()] || DOK_PROFILE.introductory;
    console.log('DOK levels for', level, ':', dokLevels);

    // Extract syllabus content if file provided
    let syllabusContent = "";
    if (req.file) {
      console.log('Processing uploaded file:', req.file.originalname);
      syllabusContent = await extractFileContent(req.file.path);
      console.log('Syllabus content extracted:', syllabusContent.substring(0, 200) + '...');
      
      // Clean up uploaded file
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('File cleanup error:', err);
      }
    }

    // Build AI prompt
    const userPrompt = `You are generating a lesson plan for the following EXACT specifications. Read every detail carefully — your cooperative and independent tasks MUST be 100% specific to this topic, grade, and level. Generic content will be rejected.

=== LESSON SPECIFICATIONS ===
Subject: ${subject} (Islamic Education — UAE MOE Standards)
Grade: Grade ${grade}
Topic: ${topic}
Lesson Level: ${level}
DOK Profile for this level: ${dokLevels.join(' → ')}
Standards Framework: ${standardsFramework}
${giftedTalented === 'yes' ? 'Gifted & Talented: YES — include ALN advanced objective' : ''}
${syllabusContent ? `\n=== UPLOADED SYLLABUS/CONTENT FOR THIS TOPIC ===\n${syllabusContent}\n=== END OF SYLLABUS CONTENT ===\n` : ''}

=== MANDATORY TASK REQUIREMENTS ===

COOPERATIVE TASKS — Write 4 tasks, ALL specific to the topic "${topic}" for Grade ${grade}:

[SUPPORT — DOK 1]: Design a matching/identification/labelling task about the specific concepts of "${topic}". 
- Use the actual Islamic vocabulary from this topic (Arabic terms, Quranic/Hadith references)
- Include a word bank drawn from "${topic}" content
- Provide sentence stems referencing "${topic}" concepts
- State the exact deliverable (what students hand to the teacher)
- Include a teacher checkpoint moment
- Minimum 120 words

[AVERAGE — DOK 2]: Design a scenario-based application task about "${topic}".
- Create a real-life or Quranic scenario related to "${topic}"
- Students must explain HOW or WHY using "${topic}" content
- Require use of at least 2 key Islamic terms from "${topic}"
- State exact deliverable and success criteria naming "${topic}" concepts
- Minimum 120 words

[UPPER — DOK 3]: Design a critical analysis task about "${topic}".
- Students must compare, evaluate cause-effect, or critically examine aspects of "${topic}"
- Require reference to specific Quran verses or Hadith related to "${topic}"
- Students must justify reasoning using Islamic evidence from "${topic}"
- State exact deliverable showing analytical thinking
- Minimum 120 words

[OUTSTANDING — DOK 4]: Design an evaluation/synthesis/creation task about "${topic}".
- Open-ended challenge directly about "${topic}" and its implications
- Require synthesis of multiple Islamic sources relevant to "${topic}"
- Connect to modern UAE Muslim life or contemporary ethical challenges related to "${topic}"
- State deliverable requiring extended, original written response
- Include extension prompt
- Minimum 120 words

INDEPENDENT TASKS — Write 4 tasks, ALL specific to "${topic}", DIFFERENT FORMAT from cooperative tasks:

[SUPPORT INDEPENDENT — DOK 1]: If cooperative support was matching, use gap-fill, labelling, or sequencing instead — all about "${topic}".
[AVERAGE INDEPENDENT — DOK 2]: Structured writing explaining "${topic}" content in own words — different from cooperative average task format.
[UPPER INDEPENDENT — DOK 3]: Multi-step analytical writing about "${topic}" — cause-effect chain, comparative table, or evidence-based argument.
[OUTSTANDING INDEPENDENT — DOK 4]: Extended written position or evaluation (250–350 words) on a key question arising from "${topic}" — with Quranic/Hadith evidence.

Generate the complete, inspection-ready lesson plan now in JSON format.`

    console.log('\n=== CALLING AI API ===');
    console.log('Prompt length:', userPrompt.length, 'characters');

    // Call AI API
    let aiResponse;
    try {
      const completion = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: EXPERT_SYSTEM_PROMPT
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 8000,
        response_format: { type: "json_object" }
      });

      aiResponse = completion.choices[0]?.message?.content;
      console.log('AI response received:', aiResponse ? 'YES' : 'NO');
      console.log('Response length:', aiResponse?.length || 0, 'characters');

    } catch (apiError) {
      console.error('AI API Error:', apiError);
      return res.status(500).json({
        error: 'AI generation failed',
        details: apiError.message
      });
    }

    if (!aiResponse) {
      console.error('No AI response received');
      return res.status(500).json({
        error: 'No response from AI',
        details: 'The AI did not generate any content'
      });
    }

    // Parse AI response
    let aiData;
    try {
      // Clean potential markdown blocks from AI response
      const cleanJson = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      aiData = JSON.parse(cleanJson);
      console.log('AI response parsed successfully');
      console.log('Generated objectives:', aiData.objectives?.length || 0);
      console.log('Standard text:', aiData.standardText?.substring(0, 100) || 'MISSING');
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('AI Response:', aiResponse.substring(0, 500));
      return res.status(500).json({
        error: 'Failed to parse AI response',
        details: parseError.message,
        aiResponse: aiResponse.substring(0, 500)
      });
    }

    // Prepare template data
    const templateData = {
      // Basic info
      date: safe(new Date(date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })),
      semester: safe(semester || '1'),
      grade: safe(grade),
      subject: safe(subject),
      topic: safe(topic),
      period: safe(period || '1'),
      value: safe(getMonthlyValue(date)),

      // Standards - Now uses AI-generated exact standard
      standardText: safe(aiData.standardText || `${standardsFramework} - Standard for Grade ${grade} ${subject}: ${topic}`),

      // SMART Objectives
      objective1: safe(aiData.objectives?.[0]?.text || `Students will demonstrate understanding of ${topic} (${dokLevels[0]})`),
      objective2: safe(aiData.objectives?.[1]?.text || `Students will apply concepts from ${topic} (${dokLevels[1]})`),
      objective3: safe(aiData.objectives?.[2]?.text || `Students will analyze applications of ${topic} (${dokLevels[2]})`),

      // Outcomes
      outcomeAll: safe(aiData.outcomes?.all?.text || `All students will identify key concepts of ${topic}`),
      outcomeMost: safe(aiData.outcomes?.most?.text || `Most students will apply ${topic} to solve problems`),
      outcomeSome: safe(aiData.outcomes?.some?.text || `Some students will evaluate and justify solutions using ${topic}`),

      // Content
      vocabulary: safe(Array.isArray(aiData.vocabulary) ? aiData.vocabulary.join('\n') : aiData.vocabulary || 'Key terms'),
      resources: safe(
        Array.isArray(aiData.resources) 
          ? aiData.resources.join('\n') 
          : aiData.resources || 'Educational resources and materials'
      ),
      skills: safe(aiData.skills || 'Critical thinking, problem-solving, collaboration'),

      // Activities - Enhanced
      starter: safe(aiData.starter || 'Attention-grabbing inquiry-based starter to activate prior knowledge and reveal misconceptions'),
      teaching: safe(aiData.teaching || 'Detailed student-centered teaching component with guided discovery, Socratic questioning, and formative checks'),

      // Cooperative tasks - 4 levels matching template placeholders exactly
      coopOutstanding: safe(aiData.cooperative?.outstanding || 'Outstanding (DOK 4): Open-ended evaluation task requiring analysis, synthesis, and justification based on Islamic sources.'),
      coopUpper: safe(aiData.cooperative?.upper || 'Upper Ability (DOK 3): Critical analysis task requiring evaluation, comparison, or cause-effect reasoning with justification.'),
      coopAverage: safe(aiData.cooperative?.average || 'Average/Middle Ability (DOK 2): Structured application task requiring reasoning and multi-step explanation.'),
      coopSupport: safe(aiData.cooperative?.support || 'Those Needing More Assistance (DOK 1): Scaffolded task with graphic organizers, sentence stems, and word bank.'),

      // Independent tasks - 4 levels matching template placeholders exactly
      indepOutstanding: safe(aiData.independent?.outstanding || 'Outstanding (DOK 4): Open-ended evaluation task requiring extended writing, synthesis of Islamic sources, and a defended position.'),
      indepUpper: safe(aiData.independent?.upper || 'Upper Ability (DOK 3): Multi-step reasoning task requiring cause-effect analysis and justified connections between Islamic concepts.'),
      indepAverage: safe(aiData.independent?.average || 'Average/Middle Ability (DOK 2): Structured independent application task requiring explanation in own words with success criteria.'),
      indepSupport: safe(aiData.independent?.support || 'Those Needing More Assistance (DOK 1): Fluency-focused task with heavy scaffolding, sentence starters, and word bank.'),

      // Plenary
      plenary: safe(
        Array.isArray(aiData.plenary) 
          ? aiData.plenary.map((p, i) => `${i + 1}. (${p.dok}) ${p.q}`).join('\n')
          : aiData.plenary || 'Multi-level review questions assessing understanding'
      ),

      // Cross-curricular
      myIdentity: safe(
        aiData.identity && aiData.identity.domain && aiData.identity.element && aiData.identity.description
          ? `Domain: ${aiData.identity.domain}  |  Element: ${aiData.identity.element}\n\n${aiData.identity.description}`
          : `Domain and Element must be selected by AI based on topic relevance.`
      ),
      identityDomain: safe(aiData.identity?.domain || 'ERROR'),
      identityElement: safe(aiData.identity?.element || 'ERROR'),
      identityDescription: safe(aiData.identity?.description || 'My Identity description missing.'),
      
      moralEducation: safe(aiData.moralEducation || 'Connection to Islamic values and moral education'),
      steam: safe(aiData.steam || 'Science, Technology, Engineering, Arts, Mathematics connections'),
      linksToSubjects: safe(aiData.linksToSubjects || 'Cross-curricular connections'),
      environment: safe(aiData.environment || 'UAE sustainability and environmental connections'),

      // Real world
      realWorld: safe(aiData.realWorld || 'Real-world applications in UAE context with industry and career connections'),

      // ALN for Gifted Students
      alnObjectives: giftedTalented === 'yes' 
        ? safe(aiData.alnObjective || `Gifted students will synthesize ${topic} concepts through advanced research, designing innovative solutions (DOK 4).`)
        : ''
    };

    console.log('Template data prepared');
    console.log('Standard Text:', templateData.standardText.substring(0, 100) + '...');
    console.log('Objective 1:', templateData.objective1.substring(0, 100) + '...');
    console.log('My Identity:', templateData.identityDomain + ' - ' + templateData.identityElement);
    console.log('ALN Objectives:', templateData.alnObjectives ? 'POPULATED' : 'EMPTY');

    // Load template
    const templatePath = path.join(__dirname, 'LESSON PLAN TEMPLATE.docx');
    
    console.log('Looking for template at:', templatePath);
    console.log('Template exists:', fs.existsSync(templatePath));
    
    if (!fs.existsSync(templatePath)) {
      console.error('Template file not found');
      return res.status(500).json({ 
        error: 'Template file not found', 
        details: `Template not found at: ${templatePath}`,
        workingDirectory: __dirname,
        filesInDir: fs.readdirSync(__dirname)
      });
    }

    console.log('Loading template from:', templatePath);
    
    let templateContent, zip, doc;
    try {
      templateContent = fs.readFileSync(templatePath);
      zip = new PizZip(templateContent);
      doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });
    } catch (templateError) {
      console.error('Template loading error:', templateError);
      return res.status(500).json({
        error: 'Failed to load template',
        details: templateError.message
      });
    }

    // Render template
    console.log('Rendering template with AI data...');
    try {
      doc.setData(templateData);
      doc.render();
    } catch (renderError) {
      console.error('Template render error:', renderError);
      return res.status(500).json({ 
        error: 'Failed to render template', 
        details: renderError.message,
        properties: renderError.properties
      });
    }

    // Generate buffer
    let buffer;
    try {
      buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
    } catch (bufferError) {
      console.error('Buffer generation error:', bufferError);
      return res.status(500).json({
        error: 'Failed to generate document',
        details: bufferError.message
      });
    }

    console.log('Document generated successfully');
    console.log('File size:', buffer.length, 'bytes');

    // Send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Lesson_Plan_G${grade}_${subject}_${topic.replace(/\s+/g, '_')}.docx"`);
    res.send(buffer);

    console.log('========== LESSON GENERATION COMPLETE ==========');
    
  } catch (error) {
    console.error('Unexpected error in lesson generation:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Enhanced Expert Lesson Plan Server for Islamic Education is running',
    timestamp: new Date().toISOString() 
  });
});

// ================= ERROR HANDLING MIDDLEWARE =================

app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// ================= START SERVER =================

app.listen(PORT, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════════════');
  console.log('   ENHANCED EXPERT LESSON PLAN SERVER FOR ISLAMIC EDUCATION');
  console.log('═══════════════════════════════════════════════');
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Template: ${path.join(__dirname, 'LESSON PLAN TEMPLATE.docx')}`);
  console.log(`🤖 AI: Groq llama-3.3-70b-versatile`);
  console.log(`✨ Features: SMART Objectives, Exact MOE Standards, Student-Centered`);
  console.log('═══════════════════════════════════════════════\n');
});