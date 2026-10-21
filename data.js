// ============================================================
//  SKH Solutions — site data
//  Edit this file to update subjects and teachers.
//  Teachers marked `placeholder: true` are sample profiles —
//  replace them with the real teacher's name and details.
// ============================================================

const TEACHERS = {
  khurram: {"name": "Sir Khurram Hussain", "initials": "KH", "subjects": ["is"], "founder": true, "title": "Founder · Islamiyat", "bio": "Sir Khurram Hussain is the founder of SKH Solutions and a well-known O Level Islamiyat teacher in Karachi. He began teaching professionally in 2008 and has taught at leading institutions including Beaconhouse School System, Karachi Grammar School, Shahwilayat Public School and Nakhla Islamic School.", "facts": [["Education", "BA (Hons) Islamiyat & Computer Science, Sheikh Zayed Islamic University · Master's in Islamic Studies, University of Karachi"], ["Teaching since", "2008"], ["Author of", "9 books covering all chapters of O Level Islamiyat"]], "approach": ["Nine chapter-wise books covering the full O Level Islamiyat syllabus", "Cambridge guide with past papers, marking schemes and revision material", "Monthly planner for targeted exam preparation", "Review books for Paper 1 and Paper 2"]},
  anees: {"name": "Sir Anees Masood", "initials": "AM", "subjects": ["en"], "bio": "Sir Anees Masood teaches English at SKH Solutions, helping students write with clarity and structure — from directed writing and summaries to comprehension and essays."},
  jalal: {"name": "Sir Jalal Azam", "initials": "JA", "subjects": ["en"]},
  beenish: {"name": "Miss Beenish Ramzan", "initials": "BR", "subjects": ["en"]},
  jaweria: {"name": "Miss Jaweria Amer", "initials": "JA", "subjects": ["en"], "levels": ["O Level"], "bio": "Miss Jaweria Amer is the newest member of Team SKH, teaching O Level English — directed writing, summary skills, comprehension and narrative and descriptive essays."},
  adeel: {"name": "Sir Adeel Jatoi", "initials": "AJ", "subjects": ["ma"], "bio": "Sir Adeel Jatoi teaches Mathematics at SKH Solutions. His classes build problem-solving confidence, taking students from the basics to the hardest past-paper questions one method at a time."},
  mali: {"name": "Sir M. Ali Khan", "initials": "MK", "subjects": ["ma"]},
  yousuf: {"name": "Sir Yousuf Panwala", "initials": "YP", "subjects": ["ma"]},
  saad: {"name": "Sir Saad Pancha", "initials": "SP", "subjects": ["am"], "title": "Additional Mathematics · O Level", "bio": "Sir Saad Pancha teaches O Level Additional Mathematics at SKH Solutions — functions, calculus, trigonometry and series taught step by step, with plenty of past-paper practice for students aiming for top grades."},
  babar: {"name": "Sir Babar Hussain", "initials": "BH", "subjects": ["ph"], "bio": "Sir Babar Hussain teaches Physics at SKH Solutions. His classes focus on turning tricky concepts — forces, waves, electricity — into clear, step-by-step reasoning that students can apply straight to exam questions."},
  adil: {"name": "Sir Adil Azeem", "initials": "AA", "subjects": ["ph"], "title": "Physics · A Level", "bio": "Sir Adil Azeem teaches A Level Physics at SKH Solutions — mechanics, fields and waves built from first principles, with numericals and data-analysis questions practised to Cambridge standard."},
  ghazi: {"name": "Sir Ghazi Hassan", "initials": "GH", "subjects": ["ch"]},
  ali: {"name": "Sir Ali Siddiqui", "initials": "AS", "subjects": ["ch"], "bio": "Sir Ali Siddiqui teaches Chemistry at SKH Solutions, helping students connect the theory — bonding, organic reactions, calculations — with the exact wording examiners look for."},
  kashif: {"name": "Sir Kashif Ismail", "initials": "KI", "subjects": ["ch"], "title": "Chemistry · A Level", "bio": "Sir Kashif Ismail teaches A Level Chemistry at SKH Solutions — physical, inorganic and organic chemistry made systematic, with calculations and mechanisms practised until they are second nature."},
  umer: {"name": "Sir Umer Soni", "initials": "US", "subjects": ["bi"]},
  yahya: {"name": "Sir Yahya Khan", "initials": "YK", "subjects": ["bi"], "title": "Biology · A Level", "bio": "Sir Yahya Khan teaches A Level Biology at SKH Solutions — biological molecules, physiology and genetics explained with clear diagrams, precise definitions and structured long answers."},
  sami: {"name": "Sir Sami Khatri", "initials": "SK", "subjects": ["cs"]},
  zafar: {"name": "Sir Zafar Ali Khan", "initials": "ZK", "subjects": ["cs"]},
  zain: {"name": "Sir Zain Merchant", "initials": "ZM", "subjects": ["cs"], "title": "Computer Science · O Level", "bio": "Sir Zain Merchant teaches O Level Computer Science at SKH Solutions — theory made simple and plenty of pseudocode and programming practice for Paper 1 and Paper 2."},
  nabi: {"name": "Sir Ghulam Nabi", "initials": "GN", "subjects": ["ac"]},
  bawany: {"name": "Sir Ahmed Bawany", "initials": "AB", "subjects": ["ac"]},
  paperwala: {"name": "Sir Adeel Paperwala", "initials": "AP", "subjects": ["ac"]},
  usama: {"name": "Sir Usama Rasheed", "initials": "UR", "subjects": ["ec"]},
  asif: {"name": "Sir Asif Farooq", "initials": "AF", "subjects": ["ec"]},
  surti: {"name": "Sir Saeed Surti", "initials": "SS", "subjects": ["bs"]},
  kamran: {"name": "Sir Kamran A. Salam", "initials": "KS", "subjects": ["bs"]},
  alihassan: {"name": "Sir Ali Hassan", "initials": "AH", "subjects": ["bs"], "title": "Business Studies · O / A Level", "bio": "Sir Ali Hassan teaches O and A Level Business at SKH Solutions — business concepts linked to real Pakistani companies, with case-study and evaluation technique practised in every class."},
  umang: {"name": "Sir Abid Ali Umang", "initials": "AU", "subjects": ["ur"]},
  fahad: {"name": "Sir Fahad Asif", "initials": "FA", "subjects": ["ur"]},
  nusrat: {"name": "Miss Nusrat Sarfaraz", "initials": "NS", "subjects": ["ur"]},
  faizan: {"name": "Sir Faizan Fazal", "initials": "FF", "subjects": ["ps"]},
  haisam: {"name": "Sir Haisam Javed", "initials": "HJ", "subjects": ["ps"]},
  samiullah: {"name": "Sir Samiullah Pathan", "initials": "SP", "subjects": ["so"]},
  bilal: {"name": "Sir Bilal Hassan", "initials": "BH", "subjects": ["py"]},
  zindani: {"name": "Sir Bilal Zindani", "initials": "BZ", "subjects": ["lw"], "title": "Law · A Level", "bio": "Sir Bilal Zindani teaches A Level Law at SKH Solutions — the English legal system, criminal law, contract and tort, with case law and exam-style problem questions practised in every class."},
};

// Teaching focus shown on each teacher profile (by subject)
const SUBJECT_FOCUS = {
  ma: ["Clear methods for every question type", "Topical worksheets and full past papers", "Showing working to secure method marks", "Speed and accuracy under timed conditions"],
  ph: ["Concept-first explanations with real-life examples", "Numericals practised step by step", "Practical and data-handling questions", "Past papers marked to Cambridge standards"],
  ch: ["Physical, inorganic and organic chemistry made systematic", "Mole calculations until they're automatic", "Marking-scheme keywords for every topic", "Timed yearly past papers"],
  bi: ["Labelled diagrams and precise definitions", "Long-answer structure that earns full marks", "Practical and planning questions", "Topical past-paper practice"],
  cs: ["Theory broken into bite-size topics", "Pseudocode and programming practice", "Algorithm tracing and trace tables", "Paper 1 and Paper 2 exam technique"],
  ac: ["Correct formats for every financial statement", "Double-entry practice until it clicks", "Analysis and evaluation questions", "Timed past papers"],
  ec: ["Diagrams drawn and explained properly", "Real-world examples for essays", "Data-response technique", "Evaluation skills for top grades"],
  bs: ["Case-study technique", "Business terms used precisely", "Analysis and evaluation practice", "Past papers with feedback"],
  en: ["Directed writing and composition frameworks", "Summary and comprehension techniques", "Vocabulary and grammar polishing", "Individual feedback on written work"],
  ur: ["Composition and letter writing", "Translation and comprehension practice", "Grammar and vocabulary building", "Regular written tests"],
  is: ["Chapter-wise coverage of the full syllabus", "Structured answers for knowledge and evaluation", "Past papers with marking schemes", "Paper 1 and Paper 2 revision"],
  ps: ["History timelines made easy to remember", "Geography with maps and data", "Source-based question technique", "Well-argued long answers"],
  so: ["Key sociological concepts and theories", "Research methods explained clearly", "Essay planning and evaluation", "Past-paper practice"],
  am: ["Step-by-step methods for every topic", "Calculus and trigonometry drilled until fluent", "Topical and yearly past papers", "Exam technique for full working marks"],
  lw: ["Key cases for every topic", "Problem-question (IRAC) technique", "Essay planning and evaluation", "Past papers with marking schemes"],
  py: ["Core studies explained in depth", "Research methods and evaluation", "Applying approaches to exam questions", "Structured essay practice"],
};

// Fill in shared details for every teacher
Object.entries(TEACHERS).forEach(([id, t]) => {
  const sid = t.subjects[0];
  const subj = () => SUBJECTS.find((s) => s.id === sid);
  t.title = t.title || `${subj ? "" : ""}${({ma:"Mathematics",ph:"Physics",ch:"Chemistry",bi:"Biology",cs:"Computer Science",ac:"Accounting",ec:"Economics",bs:"Business Studies",en:"English",ur:"Urdu",is:"Islamiyat",ps:"Pakistan Studies",so:"Sociology",py:"Psychology",am:"Additional Mathematics",lw:"Law"})[sid]} Faculty`;
  t.approach = t.approach || SUBJECT_FOCUS[sid];
  t.campuses = t.campuses || "Ask admissions for timings";
  if (!t.bio) {
    const sname = t.title.replace(" Faculty", "");
    t.bio = `${t.name} teaches ${sname} at SKH Solutions, preparing O and A Level students for their Cambridge examinations with clear concepts, regular practice and exam-focused guidance.`;
  }
});

// Placeholder teacher created automatically for subjects with no named teacher
function placeholderTeacher(subject) {
  return {
    name: `${subject.name} Specialist`,
    initials: subject.sym,
    title: `${subject.name} Faculty`,
    subjects: [subject.id],
    levels: subject.levels,
    campuses: "Ask admissions for timings",
    bio: `SKH Solutions offers ${subject.name} classes taught by a dedicated subject specialist. This profile is a placeholder — the teacher's name, photo, qualifications and experience can be added here.`,
    approach: ["Complete syllabus coverage", "Topical and yearly past papers", "Regular assessments with feedback", "Exam technique and time management"],
    placeholder: true,
  };
}

const SUBJECTS = [
  { id: "ma", sym: "Ma", name: "Mathematics", cat: "science", code: "4024 · 9709", levels: ["O Level", "AS Level", "A2 Level"], teachers: ["adeel", "mali", "yousuf"],
    desc: "From algebra and geometry to calculus and statistics — build speed, accuracy and the confidence to tackle any past-paper question." },
  { id: "am", sym: "Am", name: "Additional Mathematics", cat: "science", code: "4037", levels: ["O Level"], teachers: ["saad"],
    desc: "Functions, calculus, trigonometry and series — the perfect bridge from O Level Maths to A Level." },
  { id: "ph", sym: "Ph", name: "Physics", cat: "science", code: "5054 · 9702", levels: ["O Level", "AS Level", "A2 Level"], teachers: ["babar", "adil"],
    desc: "Understand how the world works — mechanics, waves, electricity and modern physics — with strong focus on numericals and practical skills." },
  { id: "ch", sym: "Ch", name: "Chemistry", cat: "science", code: "5070 · 9701", levels: ["O Level", "AS Level", "A2 Level"], teachers: ["ghazi", "ali", "kashif"],
    desc: "Master physical, inorganic and organic chemistry with clear concepts, reaction pathways and calculation practice." },
  { id: "bi", sym: "Bi", name: "Biology", cat: "science", code: "5090 · 9700", levels: ["O Level", "AS Level", "A2 Level"], teachers: ["umer", "yahya"],
    desc: "Cells, genetics, physiology and ecology — learn the diagrams, definitions and long-answer technique examiners reward." },
  { id: "cs", sym: "Cs", name: "Computer Science", cat: "science", code: "2210 · 9618", levels: ["O Level", "AS Level", "A2 Level"], teachers: ["sami", "zafar", "zain"],
    desc: "Programming, algorithms, data representation and systems — theory and pseudocode practice for both papers." },
  { id: "ac", sym: "Ac", name: "Accounting", cat: "commerce", code: "7707 · 9706", levels: ["O Level", "AS Level", "A2 Level"], teachers: ["nabi", "bawany", "paperwala"],
    desc: "Double entry, financial statements and analysis — clear formats and plenty of practice to secure every mark." },
  { id: "ec", sym: "Ec", name: "Economics", cat: "commerce", code: "2281 · 9708", levels: ["O Level", "AS Level", "A2 Level"], teachers: ["usama", "asif"],
    desc: "Micro and macroeconomics explained with diagrams, real-world examples and structured essay practice." },
  { id: "bs", sym: "Bs", name: "Business Studies", cat: "commerce", code: "7115 · 9609", levels: ["O Level", "AS Level", "A2 Level"], teachers: ["surti", "kamran", "alihassan"],
    desc: "Marketing, finance, operations and people — case-study technique and evaluation skills for top grades." },
  { id: "en", sym: "En", name: "English", cat: "humanities", code: "1123 · 9093", levels: ["O Level", "AS Level", "A2 Level"], teachers: ["anees", "jalal", "beenish", "jaweria"],
    desc: "Reading, writing and language skills — summaries, directed writing, comprehension and essays." },
  { id: "ur", sym: "Ur", name: "Urdu", cat: "humanities", code: "3248", levels: ["O Level"], teachers: ["umang", "fahad", "nusrat"],
    desc: "Grammar, composition, translation and literature for O Level Urdu, with regular writing practice." },
  { id: "is", sym: "Is", name: "Islamiyat", cat: "humanities", code: "2058", levels: ["O Level"], teachers: ["khurram"],
    desc: "Quran, Hadith and Islamic history — structured answers that cover knowledge and evaluation marks." },
  { id: "ps", sym: "Ps", name: "Pakistan Studies", cat: "humanities", code: "2059", levels: ["O Level"], teachers: ["faizan", "haisam"],
    desc: "History and geography of Pakistan — timelines, source questions and well-argued long answers." },
  { id: "so", sym: "So", name: "Sociology", cat: "humanities", code: "2251 · 9699", levels: ["O Level", "AS Level", "A2 Level"], teachers: ["samiullah"],
    desc: "Society, culture, family and research methods — evaluation-heavy essay practice." },
  { id: "py", sym: "Py", name: "Psychology", cat: "humanities", code: "9990", levels: ["AS Level", "A2 Level"], teachers: ["bilal"],
    desc: "Core studies, research methods and approaches — learn to describe, apply and evaluate." },
  { id: "lw", sym: "Lw", name: "Law", cat: "humanities", code: "9084", levels: ["AS Level", "A2 Level"], teachers: ["zindani"],
    desc: "English legal system, criminal law, contract and tort — cases, statutes and problem-question technique." },
];

// Course finder: suggested subject combinations
const STREAMS = {
  medical:     { label: "Pre-Medical",       subjects: ["bi", "ch", "ph"], note: "The classic route towards MBBS and life sciences." },
  engineering: { label: "Pre-Engineering",   subjects: ["ma", "ph", "ch"], note: "Strong Maths and Physics open doors to engineering." },
  computing:   { label: "Computing",         subjects: ["cs", "ma", "ph"], note: "Ideal for software, data and tech careers." },
  commerce:    { label: "Business & Commerce", subjects: ["ac", "ec", "bs", "ma"], note: "For accounting, finance, business and economics." },
  humanities:  { label: "Humanities & Social Sciences", subjects: ["lw", "so", "py", "en"], note: "For law, media, psychology and social sciences." },
  architecture:{ label: "Architecture & Design", subjects: ["ma", "ph", "cs"], note: "Maths and Physics build the spatial and technical skills architecture needs." },
  civil:       { label: "Civil Services & Economics", subjects: ["ec", "ma", "so", "en"], note: "A strong base for CSS, economics, public policy and international relations." },
  unsure:      { label: "Keep your options open", subjects: ["ma", "en", "ph", "ec"], note: "A balanced mix that keeps science, business and social-science paths open — you can decide later." },
};
const O_LEVEL_CORE = ["en", "ur", "is", "ps", "ma"];

// ============================================================
//  SAMPLE DATA — for the demo only.
//  Replace with SKH's real timetable and results.
// ============================================================

const CAMPUSES = ["Gulshan", "Jauhar", "North", "Bahadurabad", "PECHS (Girls)", "Defence"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SLOTS = ["3:00 – 4:30 PM", "4:45 – 6:15 PM", "6:30 – 8:00 PM"];

// Subjects offered per level for timetable generation
const LEVEL_SUBJECTS = {
  "O Level": ["ma", "am", "ph", "ch", "bi", "cs", "ac", "ec", "bs", "en", "ur", "is", "ps", "so"],
  "AS Level": ["ma", "ph", "ch", "bi", "cs", "ac", "ec", "bs", "en", "so", "py", "lw"],
  "A2 Level": ["ma", "ph", "ch", "bi", "cs", "ac", "ec", "bs", "en", "so", "py", "lw"],
};

// Builds a repeatable sample weekly timetable for any campus + level
function sampleTimetable(campus, level) {
  const real = TIMETABLES[`${campus}|${level}`];
  if (real) { // set by the admin in Teacher Portal → Timetables
    const g = {};
    DAYS.forEach((d) => (g[d] = SLOTS.map((slot, si) => ((real[d] || [])[si] ? { subject: real[d][si], slot } : null))));
    return g;
  }
  const subs = LEVEL_SUBJECTS[level];
  const seed = CAMPUSES.indexOf(campus) * 7 + Object.keys(LEVEL_SUBJECTS).indexOf(level) * 3;
  const grid = {};
  DAYS.forEach((d, di) => {
    grid[d] = SLOTS.map((slot, si) => {
      const n = (seed + di * 7 + si * 4 + di * si * 5 + di * di * 3) % (subs.length + 2);
      if (n >= subs.length) return null; // free slot
      return { subject: subs[n], slot };
    });
  });
  return grid;
}

// Sample results for the Hall of Fame (students anonymised)
const RESULTS = {
  "May/June 2026": [
    { student: "Student 01", subject: "ma", level: "A Level", grade: "A*" },
    { student: "Student 02", subject: "ph", level: "A Level", grade: "A*" },
    { student: "Student 03", subject: "ch", level: "O Level", grade: "A*" },
    { student: "Student 04", subject: "en", level: "O Level", grade: "A*" },
    { student: "Student 05", subject: "bi", level: "A Level", grade: "A" },
    { student: "Student 06", subject: "ec", level: "AS Level", grade: "A" },
    { student: "Student 07", subject: "ac", level: "O Level", grade: "A*" },
    { student: "Student 08", subject: "cs", level: "O Level", grade: "A*" },
  ],
  "Oct/Nov 2025": [
    { student: "Student 09", subject: "ma", level: "O Level", grade: "A*" },
    { student: "Student 10", subject: "ch", level: "A Level", grade: "A" },
    { student: "Student 11", subject: "ph", level: "O Level", grade: "A*" },
    { student: "Student 12", subject: "bs", level: "AS Level", grade: "A" },
    { student: "Student 13", subject: "is", level: "O Level", grade: "A*" },
    { student: "Student 14", subject: "so", level: "A Level", grade: "A" },
  ],
};

// every teacher teaches the levels offered for their subject
// (a few teachers take only O Level or only A Level classes)
const O_ONLY = ["O Level"], A_ONLY = ["AS Level", "A2 Level"];
const TEACHER_LEVELS = { jaweria: O_ONLY, beenish: O_ONLY, jalal: O_ONLY, yousuf: O_ONLY, fahad: O_ONLY, saad: O_ONLY, zain: O_ONLY, sami: O_ONLY, umer: O_ONLY, ali: O_ONLY,
  yahya: A_ONLY, kashif: A_ONLY, adil: A_ONLY, kamran: A_ONLY, mali: A_ONLY, zindani: A_ONLY };
Object.entries(TEACHERS).forEach(([id, t]) => {
  t.levels = TEACHER_LEVELS[id] || SUBJECTS.find((s) => s.id === t.subjects[0]).levels;
});

// Which teacher takes a subject at a given campus (sample assignment for the demo)
// Staff ID order (SKH-T-101, 102 …). New teachers are added at the END so existing IDs never change.
const STAFF_ORDER = ["khurram", "anees", "jalal", "beenish", "adeel", "mali", "yousuf", "babar", "ghazi", "ali", "umer", "sami", "zafar", "nabi", "bawany", "paperwala", "usama", "asif", "surti", "kamran", "umang", "fahad", "nusrat", "faizan", "haisam", "samiullah", "bilal", "jaweria", "saad", "zain", "zindani", "alihassan", "yahya", "kashif", "adil"];
Object.keys(TEACHERS).forEach((id) => { if (!STAFF_ORDER.includes(id)) STAFF_ORDER.push(id); });
const staffIdOf = (id) => `SKH-T-${101 + STAFF_ORDER.indexOf(id)}`;

function teacherAt(subjectId, campus, level) {
  const all = SUBJECTS.find((s) => s.id === subjectId).teachers;
  const fit = level ? all.filter((id) => TEACHERS[id].levels.includes(level)) : all;
  let list = fit.length ? fit : all;
  // if the admin has said which campuses a teacher covers, prefer the teacher(s) at this campus
  const here = list.filter((id) => (TEACHERS[id].campusList || []).includes(campus));
  if (here.length) list = here;
  else if (list.some((id) => (TEACHERS[id].campusList || []).length)) {
    const free = list.filter((id) => !(TEACHERS[id].campusList || []).length);
    if (free.length) list = free;
  }
  const i = Math.max(0, CAMPUSES.indexOf(campus));
  const id = list[i % list.length];
  return { id, ...TEACHERS[id] };
}

// ============================================================
//  Study material by subject.
//  Islamiyat = Sir Khurram Hussain's published books (real).
//  Other subjects = typical class material — confirm with SKH.
// ============================================================
const MATERIAL_BASE = [
  ["📘", "Topical notes", "Chapter-by-chapter notes that follow the Cambridge syllabus"],
  ["📝", "Past-paper booklets", "Yearly and topical past papers with marking schemes"],
  ["✏️", "Worksheets & class tests", "Practice after every topic, checked by your teacher"],
  ["⚡", "Revision summary", "Key points and exam tips for the final weeks"],
];
const MATERIAL_EXTRA = {
  ma: ["📐", "Formula sheet", "Every formula you need, on one page"],
  ph: ["🔬", "Practical & numericals pack", "Step-by-step numericals and practical-paper practice"],
  ch: ["⚗️", "Reactions & equations sheet", "Organic pathways and key equations in one place"],
  bi: ["🧬", "Labelled diagrams booklet", "Diagrams and definitions examiners look for"],
  cs: ["💻", "Pseudocode practice", "Algorithms and programming questions with solutions"],
  ac: ["📊", "Format sheets", "Correct layouts for every financial statement"],
  ec: ["📈", "Diagrams guide", "Every economics diagram drawn and explained"],
  bs: ["💼", "Case-study pack", "Practice cases with model answers"],
  en: ["🖋️", "Model essays", "Sample directed writing, summaries and essays"],
  ur: ["📜", "Mazmoon & khat samples", "Model compositions and letters"],
  is: ["📖", "Passages & Hadith notes", "Key themes and points for every Quranic passage and Hadith"],
  ps: ["🗺️", "Maps & timelines", "History timelines and geography maps"],
  so: ["🧠", "Key concepts glossary", "Sociological terms and theories explained"],
  am: ["📐", "Formula & identities sheet", "Every Add Maths formula and trig identity on one page"],
  lw: ["⚖️", "Case-law booklet", "Key cases for every topic with the principle each one sets"],
  py: ["🧠", "Core studies summaries", "Each core study summarised with evaluation points"],
};
const ISLAMIYAT_BOOKS = [
  ["9", "Chapter-wise books", "Covering the full syllabus — from Quranic passages and the life of the Prophet ﷺ to Hadith and the Pillars of Islam"],
  ["1", "Cambridge exam guide", "Course outline, specimen papers, past papers and marking schemes"],
  ["2", "Review books", "One for Paper 1 and one for Paper 2"],
  ["✓", "Monthly planner", "For targeted exam preparation"],
];
const MONTHLY_PLANNER = ["🗓️", "Monthly planner", "A month-by-month plan for targeted exam preparation"];
// Same structure for every subject: notes, past papers, subject extra, worksheets, revision, planner
function materialFor(subjectId) {
  return { items: [...MATERIAL_BASE.slice(0, 2), MATERIAL_EXTRA[subjectId], ...MATERIAL_BASE.slice(2), MONTHLY_PLANNER].filter(Boolean) };
}

// ============================================================
//  Syllabus topics used by the Student Planner (main topics)
// ============================================================
const SYLLABUS = {
  ma: ["Number & Algebra basics", "Algebraic manipulation", "Equations & inequalities", "Functions & graphs", "Coordinate geometry", "Trigonometry", "Mensuration", "Vectors & transformations", "Probability", "Statistics", "Differentiation", "Integration"],
  ph: ["Measurements & units", "Kinematics", "Dynamics & forces", "Energy, work & power", "Pressure & materials", "Thermal physics", "Waves", "Light & optics", "Electricity", "Magnetism & electromagnetism", "Nuclear physics"],
  ch: ["Atomic structure", "Chemical bonding", "Stoichiometry & moles", "Energetics", "Rates of reaction", "Equilibrium", "Acids, bases & salts", "Periodic table", "Metals & extraction", "Organic chemistry", "Electrochemistry"],
  bi: ["Cell structure", "Biological molecules", "Enzymes", "Transport in plants", "Transport in animals", "Respiration", "Nutrition & digestion", "Gas exchange", "Coordination & response", "Inheritance & genetics", "Ecology"],
  cs: ["Data representation", "Communication & networks", "Hardware", "Software & operating systems", "Security & ethics", "Algorithms & flowcharts", "Pseudocode", "Programming concepts", "Databases", "Boolean logic"],
  ac: ["Double entry", "Books of prime entry", "Trial balance", "Errors & suspense", "Bank reconciliation", "Control accounts", "Depreciation", "Income statement", "Statement of financial position", "Partnerships", "Ratio analysis"],
  ec: ["The basic economic problem", "Demand & supply", "Elasticity", "Market failure", "Government intervention", "Money & banking", "Inflation", "Unemployment", "Economic growth", "International trade"],
  bs: ["Business activity", "Business organisation", "People in business", "Marketing", "Operations management", "Finance & accounting", "External influences", "Business strategy"],
  en: ["Reading comprehension", "Summary writing", "Directed writing", "Narrative writing", "Descriptive writing", "Argumentative essays", "Vocabulary & grammar", "Timed practice"],
  ur: ["Qawaid (Grammar)", "Mazmoon nigari", "Khat nigari", "Kahani", "Tarjuma", "Comprehension", "Nazm (Poetry)", "Nasr (Prose)"],
  is: ["Major themes of the Quran", "Selected Quranic passages", "Life of the Prophet ﷺ in Makkah", "Life in Madinah", "The first Islamic community", "The Rightly Guided Caliphs", "Hadith & its role", "Articles of faith", "Pillars of Islam"],
  ps: ["Decline of the Mughal Empire", "East India Company", "War of Independence 1857", "Sir Syed & Aligarh", "Pakistan Movement", "Partition 1947", "Early problems", "Land & climate", "Water & power resources", "Agriculture", "Industry & trade"],
  so: ["Research methods", "Culture & identity", "Socialisation", "Family", "Education", "Crime & deviance", "Media", "Religion"],
  am: ["Functions", "Quadratics", "Polynomials", "Logarithms & exponentials", "Coordinate geometry", "Circular measure", "Trigonometry", "Permutations & combinations", "Series", "Vectors", "Calculus"],
  lw: ["English legal system", "Machinery of justice", "Legal personnel", "Criminal law", "Law of contract", "Law of tort"],
  py: ["Approaches in psychology", "Research methods", "Cognitive core studies", "Social core studies", "Biological core studies", "Learning core studies", "Clinical psychology", "Evaluation skills"],
};

// ============================================================
//  Content edited by the admin (teacher profiles, timetables, news).
//  When the site runs on the server, /api/content.js calls applyContent(...) right after this file.
// ============================================================
const TIMETABLES = {}; // "Gulshan|O Level" -> { Mon: ["ma", null, "ph"], … }
let NEWS = null;
const TEACHER_DEFAULTS = JSON.parse(JSON.stringify(TEACHERS));
function applyContent(c) {
  if (!c) return;
  Object.entries(c.teachers || {}).forEach(([id, o]) => {
    const t = TEACHERS[id]; if (!t || !o) return;
    if (o.title) t.title = o.title;
    if (o.bio) t.bio = o.bio;
    if (o.timings) t.campuses = o.timings;
    if (Array.isArray(o.facts) && o.facts.length) t.facts = o.facts;
    if (Array.isArray(o.approach) && o.approach.length) t.approach = o.approach;
    if (Array.isArray(o.levels) && o.levels.length) t.levels = o.levels;
    if (Array.isArray(o.campusList)) t.campusList = o.campusList;
  });
  Object.keys(TIMETABLES).forEach((k) => delete TIMETABLES[k]);
  Object.assign(TIMETABLES, c.timetable || {});
  NEWS = Array.isArray(c.news) && c.news.length ? c.news : null;
}
