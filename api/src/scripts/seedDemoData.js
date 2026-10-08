/**
 * Demo Data Seed Script
 * =====================
 * Fills an empty franchise with realistic-looking TEMPORARY content so every
 * screen (public website + admin dashboards) can be designed and reviewed with
 * real layout pressure instead of empty states.
 *
 * This is throwaway demo content, not real data. Everything it writes can be
 * removed again with `--clear`.
 *
 * Usage (run from the api directory):
 *   node src/scripts/seedDemoData.js                  # seed (skips collections that already have rows)
 *   FRANCHISE_SLUG=bz node src/scripts/seedDemoData.js
 *   node src/scripts/seedDemoData.js --reset          # wipe this franchise's content, then seed
 *   node src/scripts/seedDemoData.js --clear          # wipe this franchise's content, nothing else
 *
 * What it creates:
 *   Website settings (counters, about, vision, mission, values, donation, footer)
 *   Projects + published Project Pages, Schemes + published Scheme Pages
 *   Banners, news, blogs, gallery, videos, partners, brochures, FAQs, press
 *   Donors + donations, beneficiaries + applications + payments
 *
 * Note: images point at picsum.photos / placehold.co so the design is not
 * limited by the local asset folder. Replace them with real uploads later.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const FRANCHISE_SLUG = (process.env.FRANCHISE_SLUG || 'people').toLowerCase().trim();
const RESET = process.argv.includes('--reset');
const CLEAR_ONLY = process.argv.includes('--clear');

// ── Content collections owned by this script ────────────────────────────────
const CONTENT_COLLECTIONS = [
  'Banner', 'Project', 'ProjectPage', 'Scheme', 'SchemePage',
  'NewsEvent', 'Blog', 'GalleryAlbum', 'Video', 'Partner',
  'Brochure', 'Faq', 'MediaCoverage',
  'Donor', 'Donation', 'Beneficiary', 'Application', 'Payment'
];

// ── Tiny deterministic RNG so re-runs look the same ─────────────────────────
let seedState = 987654321;
const rand = () => {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return seedState / 2147483648;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

// ── Media helpers ───────────────────────────────────────────────────────────
const photo = (seed, w = 1200, h = 800) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
const logoSvg = (text, bg = '0F3D5C') =>
  `https://placehold.co/320x160/${bg}/FFFFFF/png?text=${encodeURIComponent(text)}`;

const day = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * day);
const daysAhead = (n) => new Date(Date.now() + n * day);
const slugify = (t) =>
  String(t).toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

// ─────────────────────────────────────────────────────────────────────────────
// Content definitions
// ─────────────────────────────────────────────────────────────────────────────

const PROJECTS = [
  {
    name: 'Vidya Jyothi Scholarship Project',
    code: 'PF-EDU-001',
    category: 'education',
    status: 'active',
    priority: 'high',
    scope: 'state',
    description:
      'Tuition support, study materials and a mentoring track for students from families below the poverty line across Kozhikode, Malappuram and Wayanad.',
    summary:
      'Scholarships, study kits and mentoring for 1,200 students from low-income families, from Class 8 through degree level.',
    budget: 4200000,
    spent: 2680000,
    progress: 64,
    beneficiaries: 1200,
    startDays: 300,
    endDays: 120,
    imageSeed: 'pf-vidya',
    highlights: [
      '1,200 students enrolled across 14 districts',
      'Monthly mentoring by 86 volunteer teachers',
      'Study kits distributed before the academic year starts',
    ],
    milestones: [
      { label: 'Application window closed', date: 'Completed' },
      { label: 'Verification of 1,400 applications', date: 'Completed' },
      { label: 'Disbursement \u2014 term 1', date: 'Completed' },
      { label: 'Disbursement \u2014 term 2', date: 'In progress' },
    ],
  },
  {
    name: 'Arogya Health Camp Initiative',
    code: 'PF-HLT-002',
    category: 'healthcare',
    status: 'active',
    priority: 'high',
    scope: 'multi_region',
    description:
      'Free medical camps with specialist consultation, diabetes and hypertension screening, and follow-up support for patients who cannot travel to district hospitals.',
    summary:
      'Mobile medical camps bringing specialist consultation and screening to villages with limited access to district hospitals.',
    budget: 2850000,
    spent: 1720000,
    progress: 58,
    beneficiaries: 8600,
    startDays: 240,
    endDays: 90,
    imageSeed: 'pf-arogya',
    highlights: [
      '86 camps held across nine districts',
      '8,600 patients screened, 1,900 referred for treatment',
      'Free medicines for patients above 60',
    ],
    milestones: [
      { label: 'Camp calendar finalised', date: 'Completed' },
      { label: 'First 50 camps delivered', date: 'Completed' },
      { label: 'Referral tracking system live', date: 'In progress' },
    ],
  },
  {
    name: 'Safe Homes Housing Support',
    code: 'PF-HOU-003',
    category: 'housing',
    status: 'active',
    priority: 'medium',
    scope: 'district',
    description:
      'Roof replacement and structural repair grants for dilapidated houses, prioritising widows, elderly couples living alone and families with a disabled member.',
    summary:
      'Repair and roofing grants that keep vulnerable families in safe, habitable homes instead of temporary shelters.',
    budget: 6400000,
    spent: 3150000,
    progress: 47,
    beneficiaries: 260,
    startDays: 210,
    endDays: 210,
    imageSeed: 'pf-homes',
    highlights: [
      '260 houses surveyed and prioritised',
      '142 roofs replaced so far',
      'Local contractors engaged under a rate contract',
    ],
    milestones: [
      { label: 'Beneficiary survey', date: 'Completed' },
      { label: 'First 100 houses completed', date: 'Completed' },
      { label: 'Monsoon readiness check', date: 'In progress' },
    ],
  },
  {
    name: 'Kudumbashree Livelihood Fund',
    code: 'PF-LIV-004',
    category: 'livelihood',
    status: 'active',
    priority: 'medium',
    scope: 'area',
    description:
      'Micro-grants and equipment support for women-led neighbourhood groups starting small enterprises \u2014 tailoring units, food processing and petty trade.',
    summary:
      'Micro-grants, equipment and bookkeeping training for 340 women-led micro-enterprises.',
    budget: 3600000,
    spent: 2410000,
    progress: 71,
    beneficiaries: 340,
    startDays: 330,
    endDays: 60,
    imageSeed: 'pf-livelihood',
    highlights: [
      '340 enterprises funded in 22 neighbourhood groups',
      'Average monthly income up 38% after six months',
      'Bookkeeping clinics run every fortnight',
    ],
    milestones: [
      { label: 'Group selection', date: 'Completed' },
      { label: 'Equipment handover \u2014 phase 1', date: 'Completed' },
      { label: 'Impact review', date: 'In progress' },
    ],
  },
  {
    name: 'Emergency Relief Assistance',
    code: 'PF-EMR-005',
    category: 'emergency_relief',
    status: 'approved',
    priority: 'critical',
    scope: 'state',
    description:
      'Rapid-response relief for flood and landslide affected households: food kits, bedding, temporary shelter material and immediate cash assistance.',
    summary:
      'Rapid relief kits and immediate cash assistance for households hit by flood and landslide events.',
    budget: 5100000,
    spent: 900000,
    progress: 18,
    beneficiaries: 2400,
    startDays: 45,
    endDays: 275,
    imageSeed: 'pf-relief',
    highlights: [
      'Standing stock of 3,000 relief kits',
      'Volunteer network on 24-hour call',
      'Cash assistance released within 72 hours',
    ],
    milestones: [
      { label: 'Kit pre-positioning', date: 'Completed' },
      { label: 'Volunteer mobilisation drill', date: 'In progress' },
      { label: 'District coordination signed off', date: 'Pending' },
    ],
  },
  {
    name: 'Community Welfare Infrastructure',
    code: 'PF-INF-006',
    category: 'infrastructure',
    status: 'completed',
    priority: 'low',
    scope: 'district',
    description:
      'Construction of community halls, drinking water points and accessible sanitation blocks for coastal and tribal settlements.',
    summary:
      'Community halls, drinking water points and accessible sanitation for coastal and tribal settlements.',
    budget: 7800000,
    spent: 7620000,
    progress: 100,
    beneficiaries: 5400,
    startDays: 720,
    endDays: 60,
    imageSeed: 'pf-infra',
    highlights: [
      '18 drinking water points commissioned',
      '4 community halls handed over to local bodies',
      'Accessible sanitation for 9 settlements',
    ],
    milestones: [
      { label: 'Site survey and design', date: 'Completed' },
      { label: 'Construction', date: 'Completed' },
      { label: 'Handover to local bodies', date: 'Completed' },
    ],
  },
  {
    // Listed last on purpose: the home endpoints sort projects newest-first,
    // so this is the one that leads the campaign carousel.
    name: 'Chooralmala\u2013Mundakkai Rehabilitation Project',
    code: 'PF-REH-007',
    category: 'infrastructure',
    status: 'active',
    priority: 'critical',
    scope: 'district',
    description:
      'The ARISE MEPPADI programme: rebuilding homes, access roads and drinking water sources for the families displaced by the Chooralmala and Mundakkai landslides.',
    summary:
      'ARISE MEPPADI \u2014 survival, restoration and a return to vitality for the households displaced by the Chooralmala\u2013Mundakkai landslides.',
    budget: 9600000,
    spent: 3100000,
    progress: 32,
    beneficiaries: 480,
    startDays: 400,
    endDays: 330,
    imageSeed: 'pf-rehab',
    highlights: [
      '142 temporary shelters handed over',
      'Access road to Mundakkai reopened',
      'Three drinking water sources restored',
    ],
    milestones: [
      { label: 'Family needs assessment', date: 'Completed' },
      { label: 'Temporary shelters', date: 'Completed' },
      { label: 'Permanent housing', date: 'In progress' },
    ],
  },
];

const SCHEMES = [
  {
    name: 'Educational Scholarship Scheme',
    code: 'SCH-EDU-01',
    projectCode: 'PF-EDU-001',
    category: 'education',
    description:
      'Annual scholarship for school and college students from families with an annual income below the scheme threshold.',
    imageSeed: 'sch-education',
    benefit: { type: 'scholarship', amount: 15000, frequency: 'yearly', duration: 3, description: 'Annual scholarship paid in two instalments, plus a study kit.' },
    budget: 2400000,
    eligibility: { ageMin: 12, ageMax: 25, incomeLimit: 200000, educationLevel: 'secondary' },
    requiresInterview: false,
    highlights: ['Two instalments per academic year', 'Study kit included', 'Renewable for up to three years'],
  },
  {
    name: 'Medical Assistance Scheme',
    code: 'SCH-HLT-02',
    projectCode: 'PF-HLT-002',
    category: 'healthcare',
    description:
      'One-time assistance towards surgery, dialysis, cancer treatment and prolonged medication for families without adequate insurance cover.',
    imageSeed: 'sch-medical',
    benefit: { type: 'cash', amount: 50000, frequency: 'one_time', description: 'Direct payment to the hospital, or reimbursement against original bills.' },
    budget: 3200000,
    eligibility: { ageMin: 0, ageMax: 90, incomeLimit: 300000 },
    requiresInterview: true,
    highlights: ['Direct hospital settlement', 'Covers dialysis and cancer care', 'Decision within 10 working days'],
  },
  {
    name: 'Housing Renovation Grant',
    code: 'SCH-HOU-03',
    projectCode: 'PF-HOU-003',
    category: 'housing',
    description:
      'Grant towards roofing, flooring and toilet construction for houses that fail the safety inspection.',
    imageSeed: 'sch-housing',
    benefit: { type: 'subsidy', amount: 120000, frequency: 'one_time', description: 'Released in two stages against work completion photographs.' },
    budget: 4800000,
    eligibility: { ageMin: 18, ageMax: 80, incomeLimit: 250000, employmentStatus: 'any' },
    requiresInterview: true,
    highlights: ['Stage-wise release', 'Site inspection before approval', 'Local labour encouraged'],
  },
  {
    name: 'Self-Employment Loan Scheme',
    code: 'SCH-LIV-04',
    projectCode: 'PF-LIV-004',
    category: 'livelihood',
    description:
      'Interest-free micro-loan for women-led groups setting up or expanding a small enterprise.',
    imageSeed: 'sch-livelihood',
    benefit: { type: 'loan', amount: 75000, frequency: 'one_time', duration: 2, description: 'Interest-free, repaid in monthly instalments over 24 months.' },
    budget: 3000000,
    eligibility: { ageMin: 18, ageMax: 60, incomeLimit: 250000, employmentStatus: 'unemployed' },
    requiresInterview: false,
    highlights: ['Zero interest', '24-month repayment', 'Group guarantee accepted'],
  },
  {
    name: 'Marriage Assistance Scheme',
    code: 'SCH-SOC-05',
    projectCode: 'PF-LIV-004',
    category: 'social_welfare',
    description:
      'Assistance towards the essential expenses of marriage for families below the income threshold, with a strict ceiling to discourage extravagance.',
    imageSeed: 'sch-marriage',
    benefit: { type: 'cash', amount: 40000, frequency: 'one_time', description: 'Paid directly to the beneficiary family before the wedding date.' },
    budget: 1600000,
    eligibility: { ageMin: 18, ageMax: 70, incomeLimit: 150000 },
    requiresInterview: false,
    highlights: ['Modest fixed ceiling', 'Paid before the event date', 'Simple documentation'],
  },
  {
    name: 'Emergency Relief Assistance',
    code: 'SCH-EMR-06',
    projectCode: 'PF-EMR-005',
    category: 'emergency_relief',
    description:
      'Immediate cash and kit assistance for households affected by flood, landslide, fire or sudden loss of the earning member.',
    imageSeed: 'sch-emergency',
    benefit: { type: 'kind', amount: 25000, frequency: 'one_time', description: 'Relief kit plus immediate cash assistance for the first 30 days.' },
    budget: 2200000,
    eligibility: { ageMin: 18, ageMax: 80, incomeLimit: 300000 },
    requiresInterview: false,
    highlights: ['72-hour turnaround', 'Kit plus cash', 'No income certificate needed up front'],
  },
];

const NEWS = [
  { title: '1,200 scholarships disbursed for the new academic year', category: 'news', seed: 'news-scholarship', days: 6, featured: true,
    description: 'The second instalment reached all enrolled students ahead of the term start, with 96% attendance verified by volunteer teachers.' },
  { title: 'Arogya camps cross the 8,000 patient mark', category: 'success_story', seed: 'news-arogya', days: 14,
    description: 'Nine districts covered so far. Nearly 1,900 patients have been referred onward to government hospitals for treatment.' },
  { title: 'Monsoon relief stock pre-positioned in five districts', category: 'announcement', seed: 'news-relief', days: 21,
    description: 'Three thousand relief kits and temporary shelter material are staged so teams can move within hours of a red alert.' },
  { title: 'Community hall handed over at Chaliyam', category: 'event', seed: 'news-hall', days: 35,
    description: 'The fourth community hall built under the infrastructure project was handed over to the local body this month.' },
  { title: 'Livelihood fund: average income up 38% after six months', category: 'success_story', seed: 'news-livelihood', days: 48,
    description: 'An internal review of 120 funded enterprises shows a clear income lift, largely from better bookkeeping and repeat customers.' },
];

const BLOGS = [
  { title: 'How Zakat actually reaches a family', slug: 'how-zakat-reaches-a-family', seed: 'blog-zakat', days: 9,
    excerpt: 'From application to disbursement \u2014 the five checks a Zakat application passes through before money moves.',
    content:
      '<p>Most donors only ever see the receipt. Here is what happens between your payment and a family receiving help.</p><h3>1. Application and screening</h3><p>Applications arrive through district offices and the website. Each one is screened for completeness before it reaches a field verifier.</p><h3>2. Field verification</h3><p>A volunteer visits the household. Income, dependants and the specific need are recorded, and photographs are attached to the file.</p><h3>3. Committee review</h3><p>The local committee reviews verified applications and decides on the amount. Anything above the standard band goes to the state committee.</p><h3>4. Disbursement</h3><p>Payments are made directly to the beneficiary or to the hospital or vendor, never through an intermediary.</p><h3>5. Follow-up</h3><p>Six months later, the case is reviewed again \u2014 partly to confirm the outcome, partly to catch situations that have worsened.</p>' },
  { title: 'Why we publish our scheme budgets', slug: 'why-we-publish-scheme-budgets', seed: 'blog-budgets', days: 23,
    excerpt: 'Transparency means more than an annual report. Here is what we publish and why it sometimes looks unflattering.',
    content:
      '<p>Every scheme on this site shows its allocated budget and the amount spent to date. That is deliberately uncomfortable for us.</p><p>Published spending reveals slow procurement, delayed disbursements and schemes that underperform their targets. We would rather explain a slow quarter than hide it.</p><h3>What we do not publish</h3><p>Household-level data stays private. We publish counts and amounts, never anything that identifies a beneficiary family.</p>' },
  { title: 'Volunteering as a field verifier: what it involves', slug: 'volunteering-as-a-field-verifier', seed: 'blog-volunteer', days: 41,
    excerpt: 'Roughly six hours a month, a scooter, and the willingness to listen carefully. That is most of the job.',
    content:
      '<p>Field verifiers are the backbone of the Zakat process. Without a household visit, an application is just paper.</p><h3>What you actually do</h3><p>You visit two or three households a month, complete a standard checklist, and upload photographs through the volunteer app.</p><h3>What we ask of you</h3><p>Confidentiality above all. Beneficiary circumstances are not shared with neighbours, relatives or on social media.</p>' },
];

const GALLERY = [
  { title: 'Health camps 2026', category: 'healthcare', seed: 'gal-health', count: 6,
    description: 'Screening days across Kozhikode, Malappuram and Palakkad.' },
  { title: 'Scholarship distribution', category: 'education', seed: 'gal-education', count: 5,
    description: 'Study kits and instalments handed over ahead of the academic year.' },
  { title: 'Housing project sites', category: 'housing', seed: 'gal-housing', count: 5,
    description: 'Roofing and repair work in progress across three districts.' },
  { title: 'Volunteer training', category: 'general', seed: 'gal-volunteers', count: 4,
    description: 'Field verification and relief coordination workshops.' },
];

/**
 * Neutral, openly licensed CC0 clips stand in for real footage. A real YouTube
 * id would embed whatever video it happens to name, which reads as a mistake
 * in a design review; these play as generic footage, and the card thumbnail is
 * a seeded photo rather than a stranger's video frame.
 */
const SAMPLE_CLIPS = [
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
];

const VIDEOS = [
  { title: 'Inside a Zakat field verification', clip: 0, seed: 'vid-field', category: 'general', featured: true,
    description: 'A walk-through of the household visit that decides whether an application moves forward.' },
  { title: 'Arogya camp \u2014 one day on the ground', clip: 1, seed: 'vid-camp', category: 'healthcare',
    description: 'Six hours of screening, consultations and referrals in a single village.' },
  { title: 'Building a roof in three days', clip: 0, seed: 'vid-roof', category: 'housing',
    description: 'How a housing grant turns into a weatherproof roof within a week of approval.' },
  { title: 'Livelihood enterprises, six months on', clip: 1, seed: 'vid-livelihood', category: 'livelihood',
    description: 'Three women-led enterprises revisited after their first six months of operation.' },
];

const PARTNERS = [
  'Kerala State Welfare Board', 'People\u2019s Urban Co-op Bank', 'District Panchayat',
  'Al-Ameen Foundation', 'Crescent Charitable Trust', 'Coastal Development Society',
  'Sahodaran Trust', 'Malabar Medical Mission',
];

const BROCHURES = [
  { title: 'Scheme Handbook 2026', category: 'scheme', description: 'Every scheme, its eligibility rules and the documents required.', size: 2450000 },
  { title: 'Annual Report 2025', category: 'report', description: 'Audited income, expenditure and scheme-wise outcomes for the year.', size: 6180000 },
  { title: 'Zakat Guidelines for Donors', category: 'guideline', description: 'Nisab, calculation and the questions donors ask most often.', size: 890000 },
  { title: 'Project Portfolio', category: 'project', description: 'Ongoing and completed projects with budget and progress.', size: 3120000 },
];

const FAQS = [
  { q: 'Who is eligible to apply for a scheme?', a: 'Eligibility is set per scheme and shown on each scheme page. Most of our schemes use an annual family income threshold, and some add an age or education condition. The application form will tell you which document proves each condition.', c: 'eligibility' },
  { q: 'How long does an application take?', a: 'From submission to a decision is normally two to three weeks for schemes that need a field visit. Emergency relief is decided within 72 hours.', c: 'applications' },
  { q: 'Can I apply for more than one scheme at a time?', a: 'Yes, if the schemes have different purposes. Two applications under the same scheme are not accepted unless the first has been closed.', c: 'applications' },
  { q: 'What documents do I need?', a: 'A ration card or equivalent proof of address, an Aadhaar-linked identity document, and an income certificate where the scheme has an income limit. Scheme pages list anything extra.', c: 'documents' },
  { q: 'How is Zakat calculated?', a: 'Zakat is 2.5% of the net value of zakatable assets held for a lunar year, once they exceed the nisab threshold. The calculator on this site estimates the figure for you.', c: 'zakat' },
  { q: 'Is my donation eligible for tax exemption?', a: 'Yes. Donations to the foundation qualify for exemption under the applicable provisions, and a receipt is issued for every donation. Consult your tax adviser for how this applies to you.', c: 'donations' },
];

const MEDIA = [
  { title: 'Charity network reaches 12,000 beneficiaries in a year', source: 'Malayala Manorama', seed: 'media-1', days: 12 },
  { title: 'Zakat funds and how to verify where they go', source: 'Mathrubhumi', seed: 'media-2', days: 26 },
  { title: 'Health camps fill a gap for villages far from hospitals', source: 'The Hindu', seed: 'media-3', days: 44 },
  { title: 'Transparency in charity: publishing budgets publicly', source: 'Madhyamam', seed: 'media-4', days: 63 },
];

const DONORS = [
  { name: 'Abdul Rahman Haji', type: 'individual', category: 'patron', city: 'Kozhikode', amount: 250000 },
  { name: 'Fathima Beevi', type: 'individual', category: 'regular', city: 'Malappuram', amount: 48000 },
  { name: 'Crescent Charitable Trust', type: 'trust', category: 'major', city: 'Kochi', amount: 750000 },
  { name: 'Mohammed Ashraf', type: 'individual', category: 'regular', city: 'Kannur', amount: 36000 },
  { name: 'Al-Ameen Foundation', type: 'foundation', category: 'corporate', city: 'Thrissur', amount: 1200000 },
  { name: 'Suhara Kunhi', type: 'individual', category: 'regular', city: 'Kasaragod', amount: 60000 },
  { name: 'People\u2019s Urban Co-op Bank', type: 'corporate', category: 'corporate', city: 'Kozhikode', amount: 500000 },
  { name: 'Ibrahim Kutty', type: 'individual', category: 'recurring', city: 'Palakkad', amount: 84000 },
  { name: 'Zainab Trust', type: 'trust', category: 'major', city: 'Alappuzha', amount: 320000 },
  { name: 'Rahiman Musaliar', type: 'individual', category: 'regular', city: 'Kollam', amount: 42000 },
  { name: 'Coastal Development Society', type: 'ngo', category: 'corporate', city: 'Kannur', amount: 180000 },
  { name: 'Nusrath Jahan', type: 'individual', category: 'recurring', city: 'Thiruvananthapuram', amount: 72000 },
];

const BENEFICIARY_NAMES = [
  'Ayesha Beevi', 'Muhammed Basheer', 'Khadija Umma', 'Rasheed Ahmed', 'Safiya Nasrin',
  'Usman Koya', 'Jameela Habeeb', 'Nizamuddin Koya', 'Fatima Zarina', 'Abdul Karim',
  'Haleema Sultana', 'Shihab Khan', 'Nasriya Begum', 'Ismail Haji', 'Rukiya Banu',
  'Yousuf Ali', 'Mariyakutty', 'Shamsudheen', 'Ayisha Rifa', 'Kunhali Master',
  'Zubaida Teacher', 'Ali Hassan', 'Sainaba', 'Musthafa Kamal',
];

const APPLICATION_STATUSES = [
  'draft', 'pending', 'under_review', 'field_verification',
  'interview_scheduled', 'pending_committee_approval', 'approved', 'rejected', 'disbursed'
];

// ─────────────────────────────────────────────────────────────────────────────
// Safety guards
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Collections this script must never write to or delete from. They hold
 * accounts, permissions, tenant records and shared geographic data, none of
 * which is demo content. Asserted below so a future edit cannot quietly add
 * one of them to CONTENT_COLLECTIONS.
 */
const PROTECTED_COLLECTIONS = [
  'User', 'UserFranchise', 'UserRole', 'Role', 'Permission', 'Franchise',
  'Location', 'SitePage', 'ActivityLog', 'LoginLog', 'ErrorLog',
  'WebsiteSettings', 'Counter', 'MasterData'
];

const LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1'];
const ALLOW_REMOTE = process.argv.includes('--allow-remote');

function assertScriptIsSafe() {
  const clash = CONTENT_COLLECTIONS.filter((c) => PROTECTED_COLLECTIONS.includes(c));
  if (clash.length) {
    console.error(`✖ Refusing to run: CONTENT_COLLECTIONS contains protected collection(s): ${clash.join(', ')}`);
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('✖ Refusing to run with NODE_ENV=production. This script writes demo content only.');
    process.exit(1);
  }
}

function assertTargetIsSafe() {
  const host = mongoose.connection.host || '';
  const dbName = mongoose.connection.name || '';

  console.log('┌─ Target database ────────────────────────────');
  console.log(`│  host     : ${host}`);
  console.log(`│  database : ${dbName}`);
  console.log(`│  franchise: ${FRANCHISE_SLUG}`);
  console.log('└──────────────────────────────────────────────\n');

  const isLocal = LOCAL_HOSTS.includes(host) || host.startsWith('/');
  if (!isLocal && !ALLOW_REMOTE) {
    console.error(`✖ Refusing to write to a non-local database ("${host}").`);
    console.error('  This script is for local demo content only.');
    console.error('  If you truly mean to target a remote database, re-run with --allow-remote.');
    process.exit(1);
  }
  if (!isLocal && ALLOW_REMOTE) {
    console.warn(`⚠  Targeting REMOTE database "${host}/${dbName}" because --allow-remote was passed.\n`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Seeding helpers
// ─────────────────────────────────────────────────────────────────────────────

async function clearContent(franchiseId) {
  let removed = 0;
  for (const name of CONTENT_COLLECTIONS) {
    const Model = require(`../models/${name}`);
    // Always scoped to this one franchise — nothing outside it is touched.
    const res = await Model.deleteMany({ franchise: franchiseId });
    removed += res.deletedCount || 0;
    if (res.deletedCount) console.log(`  – cleared ${res.deletedCount} × ${name}`);
  }
  console.log(`Cleared ${removed} demo record(s) for this franchise only.\n`);
}

async function alreadySeeded(Model, franchiseId) {
  return (await Model.countDocuments({ franchise: franchiseId })) > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

async function run() {
  assertScriptIsSafe();

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('✖ MONGODB_URI is not set. Add it to api/.env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  assertTargetIsSafe();

  const Franchise = require('../models/Franchise');
  const franchise = await Franchise.findOne({ slug: FRANCHISE_SLUG }).lean();
  if (!franchise) {
    const available = await Franchise.find().select('slug displayName').lean();
    console.error(`✖ No franchise with slug "${FRANCHISE_SLUG}".`);
    console.error('  Available:', available.map((f) => f.slug).join(', ') || '(none \u2014 run seedFranchises.js first)');
    await mongoose.connection.close();
    process.exit(1);
  }
  const F = franchise._id;
  console.log(`✔ Franchise: ${franchise.displayName || franchise.slug} (${F})\n`);

  if (RESET || CLEAR_ONLY) {
    await clearContent(F);
    if (CLEAR_ONLY) {
      console.log('Done (clear only).');
      await mongoose.connection.close();
      return;
    }
  }

  const User = require('../models/User');
  const admin =
    (await User.findOne({ isSuperAdmin: true }).select('_id').lean()) ||
    (await User.findOne({}).select('_id').lean());
  if (!admin) {
    console.error('✖ No user found to attribute the records to. Run: npm run admin:create');
    await mongoose.connection.close();
    process.exit(1);
  }
  const by = admin._id;

  const created = {};

  // ── Website settings ──────────────────────────────────────────────────────
  const WebsiteSettings = require('../models/WebsiteSettings');
  await WebsiteSettings.updateOne(
    { franchise: F },
    {
      $set: {
        aboutUs: {
          title: 'About People\u2019s Foundation',
          description:
            'People\u2019s Foundation is a Kerala-based welfare organisation that collects Zakat and charitable funds and distributes them to families who need them most \u2014 for education, healthcare, housing and livelihood. Every case is verified by a household visit, and every scheme publishes what it spent and what it achieved.',
          imageUrl: photo('pf-about-people', 1200, 900),
          imageKey: 'demo/about-people.jpg',
        },
        hero: {
          style: 'illustrated',
          title: 'Zakat, delivered where it is needed',
          subtitle: 'Verified household by household, spent scheme by scheme, and reported in the open.',
          ctaText: 'Donate Now',
          ctaLink: '/#donation',
          secondaryCtaText: 'Calculate Zakat',
          secondaryCtaLink: '/#calculator',
        },
        vision: {
          title: 'Our Vision',
          description:
            'A Kerala where no family is left without food, shelter, healthcare or education because of poverty \u2014 and where every rupee given in Zakat is accounted for publicly.',
          icon: 'eye',
          color: 'blue',
        },
        mission: {
          title: 'Our Mission',
          description:
            'To collect and distribute Zakat and welfare funds transparently, verify every case at the household level, and report openly on what each scheme actually achieved.',
          icon: 'target',
          color: 'green',
        },
        values: [
          { title: 'Transparency', description: 'Scheme budgets, spending and outcomes are published, including the disappointing ones.', icon: 'badge-check', color: 'blue', order: 1 },
          { title: 'Dignity', description: 'Help arrives without spectacle. Beneficiaries are never named or photographed publicly without consent.', icon: 'heart-handshake', color: 'green', order: 2 },
          { title: 'Verification', description: 'Every case is confirmed by a household visit before any funds move.', icon: 'clipboard-check', color: 'amber', order: 3 },
          { title: 'Local first', description: 'Field work is done by volunteers and vendors from the same district wherever possible.', icon: 'map-pin', color: 'purple', order: 4 },
        ],
        counts: [
          { title: 'Beneficiaries Served', count: 12480, icon: 'users', color: 'blue', order: 1 },
          { title: 'Active Projects', count: PROJECTS.filter((p) => p.status === 'active').length, icon: 'folder', color: 'green', order: 2 },
          { title: 'Total Donors', count: 3120, icon: 'heart', color: 'amber', order: 3 },
          { title: 'Districts Covered', count: 14, icon: 'map-pin', color: 'purple', order: 4 },
        ],
        donation: {
          enabled: true,
          heading: 'Your Zakat Can Transform Lives',
          description: 'Be a part of this noble cause. Give Zakat. Earn Rewards.',
          accountName: 'People\u2019s Foundation',
          accountNumber: '5021 4478 9903 12',
          bankName: 'People\u2019s Urban Co-operative Bank, Kozhikode',
          ifsc: 'PUCB0001234',
          upiId: 'peoplesfoundation@upi',
          paymentLink: 'https://example.org/donate',
          qrImageUrl: 'https://placehold.co/420x420/FFFFFF/0F3D5C/png?text=Scan+to+Donate',
          qrImageKey: 'demo/donate-qr.png',
        },
        footer: {
          description:
            'A Kerala-based welfare organisation distributing Zakat and charitable funds with household-level verification and public reporting.',
          copyrightText: `\u00A9 ${new Date().getFullYear()} People\u2019s Foundation. All rights reserved.`,
          links: [
            { label: 'Privacy Policy', url: '/privacy-policy', order: 1 },
            { label: 'Contact Us', url: '/p/contact-us', order: 2 },
            { label: 'Terms & Conditions', url: '/p/terms-and-conditions', order: 3 },
          ],
        },
        contactDetails: {
          phone: '+91 495 987 6543',
          email: 'info@peoplefoundation.org',
          address: 'People\u2019s Foundation, Mavoor Road, Kozhikode, Kerala \u2014 673001',
          whatsapp: '+919876543210',
        },
        socialMedia: {
          facebook: 'https://facebook.com/peoplefoundation',
          instagram: 'https://instagram.com/peoplefoundation',
          youtube: 'https://youtube.com/@peoplefoundation',
          twitter: '',
          linkedin: 'https://linkedin.com/company/peoplefoundation',
        },
        seo: {
          title: 'People\u2019s Foundation \u2014 Zakat & Welfare ERP',
          description: 'Zakat collection, verified distribution and public reporting across Kerala.',
          keywords: ['zakat', 'kerala', 'charity', 'ngo', 'welfare'],
        },
        updatedBy: by,
      },
    },
    { upsert: true }
  );
  created.WebsiteSettings = 1;
  console.log('  \u271A Website settings updated (counters, about, vision, mission, values, donation, footer)');

  // ── Projects + published project pages ────────────────────────────────────
  const Project = require('../models/Project');
  const ProjectPage = require('../models/ProjectPage');

  let projectsMade = 0;
  let projectPagesMade = 0;
  for (const p of PROJECTS) {
    if (await Project.findOne({ code: p.code, franchise: F })) continue;

    const doc = await Project.create({
      name: p.name,
      code: p.code,
      description: p.description,
      category: p.category,
      priority: p.priority,
      scope: p.scope,
      startDate: daysAgo(p.startDays),
      endDate: daysAhead(p.endDays),
      budget: { total: p.budget, allocated: p.budget, spent: p.spent, currency: 'INR' },
      progress: { percentage: p.progress },
      targetBeneficiaries: {
        estimated: p.beneficiaries,
        actual: Math.round(p.beneficiaries * (p.progress / 100)),
      },
      status: p.status,
      settings: { allowPublicView: true, requireApprovalForApplications: true, maxApplicationsPerBeneficiary: 1 },
      franchise: F,
      createdBy: by,
      updatedBy: by,
    });
    projectsMade += 1;

    await ProjectPage.create({
      project: doc._id,
      slug: slugify(p.name),
      status: 'published',
      summary: p.summary,
      coverImageUrl: photo(p.imageSeed, 1400, 900),
      coverImageKey: `demo/${p.imageSeed}.jpg`,
      hero: {
        title: p.name,
        subtitle: p.summary,
        imageUrl: photo(`${p.imageSeed}-hero`, 1600, 900),
        imageKey: `demo/${p.imageSeed}-hero.jpg`,
      },
      overview: {
        visible: true, showDates: true, showProgress: true, showBeneficiaries: true,
        showBudget: true, showMilestones: true, background: 'muted',
      },
      sections: [
        { type: 'richtext', order: 1, title: 'What this project does', content: `<p>${p.description}</p>` },
        {
          type: 'stats', order: 2, title: 'At a glance', columns: 3,
          items: [
            { title: 'Allocated budget', value: `\u20B9${(p.budget / 100000).toFixed(1)} L`, icon: 'wallet', order: 1 },
            { title: 'Spent to date', value: `\u20B9${(p.spent / 100000).toFixed(1)} L`, icon: 'trending-up', order: 2 },
            { title: 'Target beneficiaries', value: p.beneficiaries.toLocaleString('en-IN'), icon: 'users', order: 3 },
          ],
        },
        {
          type: 'cards', order: 3, title: 'What we have achieved so far', columns: 3,
          items: p.highlights.map((h, i) => ({ title: h, icon: 'check-circle-2', order: i + 1 })),
        },
        {
          type: 'timeline', order: 4, title: 'Milestones',
          items: p.milestones.map((m, i) => ({ title: m.label, subtitle: m.date, order: i + 1 })),
        },
      ],
      seo: { title: p.name, description: p.summary },
      franchise: F,
      createdBy: by,
      updatedBy: by,
    });
    projectPagesMade += 1;
  }
  created.Project = projectsMade;
  created.ProjectPage = projectPagesMade;
  console.log(`  \u271A ${projectsMade} projects and ${projectPagesMade} published project pages`);

  // ── Schemes + published scheme pages ──────────────────────────────────────
  const Scheme = require('../models/Scheme');
  const SchemePage = require('../models/SchemePage');

  let schemesMade = 0;
  let schemePagesMade = 0;
  for (const s of SCHEMES) {
    if (await Scheme.findOne({ code: s.code, franchise: F })) continue;
    const parentProject = await Project.findOne({ code: s.projectCode, franchise: F }).select('_id').lean();
    if (!parentProject) {
      console.warn(`  ! Skipped scheme "${s.name}" \u2014 parent project ${s.projectCode} is missing`);
      continue;
    }

    const doc = await Scheme.create({
      name: s.name,
      code: s.code,
      description: s.description,
      imageUrl: photo(s.imageSeed, 1200, 800),
      category: s.category,
      priority: 'high',
      eligibility: {
        ageRange: { min: s.eligibility.ageMin, max: s.eligibility.ageMax },
        gender: 'any',
        incomeLimit: s.eligibility.incomeLimit,
        educationLevel: s.eligibility.educationLevel || 'any',
        employmentStatus: s.eligibility.employmentStatus || 'any',
        documents: [
          { type: 'aadhaar', required: true, description: 'Aadhaar card of the applicant' },
          { type: 'ration_card', required: true, description: 'Ration card showing family members' },
          { type: 'income_certificate', required: true, description: 'Income certificate from the village office' },
          { type: 'bank_passbook', required: false, description: 'Bank passbook copy for disbursement' },
        ],
      },
      budget: { total: s.budget, allocated: s.budget, spent: Math.round(s.budget * 0.45), currency: 'INR' },
      benefits: s.benefit,
      applicationSettings: {
        startDate: daysAgo(60),
        endDate: daysAhead(120),
        maxApplications: 1000,
        maxBeneficiaries: 500,
        requiresInterview: s.requiresInterview,
        allowMultipleApplications: false,
      },
      renewalSettings: {
        isRenewable: s.category === 'education',
        renewalPeriodDays: 365,
        autoNotifyBeforeDays: 30,
      },
      status: 'active',
      project: parentProject._id,
      statistics: {
        totalApplications: between(180, 640),
        approvedApplications: between(90, 320),
        rejectedApplications: between(20, 90),
        pendingApplications: between(30, 120),
        totalBeneficiaries: between(90, 420),
        totalAmountDisbursed: Math.round(s.budget * 0.4),
      },
      franchise: F,
      createdBy: by,
      updatedBy: by,
    });
    schemesMade += 1;

    await SchemePage.create({
      scheme: doc._id,
      slug: slugify(s.name),
      status: 'published',
      summary: s.description,
      coverImageUrl: photo(s.imageSeed, 1400, 900),
      coverImageKey: `demo/${s.imageSeed}.jpg`,
      hero: {
        title: s.name,
        subtitle: s.description,
        imageUrl: photo(`${s.imageSeed}-hero`, 1600, 900),
        imageKey: `demo/${s.imageSeed}-hero.jpg`,
      },
      overview: {
        visible: true, showCategory: true, showBudget: true, showBeneficiaries: true,
        showDates: true, showEligibility: true, showDocuments: true, background: 'muted',
      },
      sections: [
        { type: 'richtext', order: 1, title: 'About this scheme', content: `<p>${s.description}</p>` },
        {
          type: 'stats', order: 2, title: 'The numbers', columns: 3,
          items: [
            { title: 'Benefit', value: `\u20B9${s.benefit.amount.toLocaleString('en-IN')}`, icon: 'gift', order: 1 },
            { title: 'Scheme budget', value: `\u20B9${(s.budget / 100000).toFixed(1)} L`, icon: 'wallet', order: 2 },
            { title: 'Income ceiling', value: `\u20B9${(s.eligibility.incomeLimit / 1000).toFixed(0)} K`, icon: 'receipt', order: 3 },
          ],
        },
        {
          type: 'cards', order: 3, title: 'Key features', columns: 3,
          items: s.highlights.map((h, i) => ({ title: h, icon: 'check-circle-2', order: i + 1 })),
        },
        {
          type: 'faq', order: 4, title: 'Questions about this scheme',
          items: [
            { title: 'How do I apply?', description: 'Apply online through the beneficiary portal, or at your nearest district office with the documents listed above.', order: 1 },
            { title: 'When will I know the decision?', description: s.requiresInterview ? 'After the field visit and interview, usually within two to three weeks.' : 'Within two to three weeks of submitting a complete application.', order: 2 },
            { title: 'How is the amount paid?', description: s.benefit.description, order: 3 },
          ],
        },
      ],
      seo: { title: s.name, description: s.description },
      franchise: F,
      createdBy: by,
      updatedBy: by,
    });
    schemePagesMade += 1;
  }
  created.Scheme = schemesMade;
  created.SchemePage = schemePagesMade;
  console.log(`  \u271A ${schemesMade} schemes and ${schemePagesMade} published scheme pages`);

  // ── Banners (used when the hero style is the photo slider) ────────────────
  const Banner = require('../models/Banner');
  if (!(await alreadySeeded(Banner, F))) {
    const bannerData = [
      { title: 'Zakat Brings Smile', description: 'Your Zakat can bring hope, dignity and a better tomorrow.', seed: 'bnr-smile' },
      { title: 'Transforming Lives Together', description: 'From housing to healthcare, your Zakat reaches families across Kerala.', seed: 'bnr-transform' },
      { title: 'Education Opens Doors', description: '1,200 students supported this academic year.', seed: 'bnr-education' },
    ];
    await Banner.insertMany(bannerData.map((b, i) => ({
      title: b.title,
      description: b.description,
      imageUrl: photo(b.seed, 1600, 900),
      imageKey: `demo/${b.seed}.jpg`,
      link: '/#donation',
      order: i + 1,
      status: 'active',
      franchise: F,
      createdBy: by,
    })));
    created.Banner = bannerData.length;
    console.log(`  \u271A ${bannerData.length} banners`);
  } else {
    console.log('  \u2013 banners already present, skipped');
  }

  // ── News & events ─────────────────────────────────────────────────────────
  const NewsEvent = require('../models/NewsEvent');
  if (!(await alreadySeeded(NewsEvent, F))) {
    await NewsEvent.insertMany(NEWS.map((n) => ({
      title: n.title,
      description: n.description,
      category: n.category,
      imageUrl: photo(n.seed, 1200, 800),
      imageKey: `demo/${n.seed}.jpg`,
      publishDate: daysAgo(n.days),
      status: 'published',
      featured: Boolean(n.featured),
      views: between(180, 2400),
      franchise: F,
      createdBy: by,
    })));
    created.NewsEvent = NEWS.length;
    console.log(`  \u271A ${NEWS.length} news & event items`);
  } else {
    console.log('  \u2013 news already present, skipped');
  }

  // ── Blog posts ────────────────────────────────────────────────────────────
  const Blog = require('../models/Blog');
  if (!(await alreadySeeded(Blog, F))) {
    await Blog.insertMany(BLOGS.map((b) => ({
      title: b.title,
      slug: b.slug,
      author: 'People\u2019s Foundation',
      excerpt: b.excerpt,
      content: b.content,
      coverImageUrl: photo(b.seed, 1200, 800),
      coverImageKey: `demo/${b.seed}.jpg`,
      category: 'general',
      tags: ['zakat', 'transparency'],
      publishDate: daysAgo(b.days),
      status: 'published',
      views: between(240, 1800),
      franchise: F,
      createdBy: by,
    })));
    created.Blog = BLOGS.length;
    console.log(`  \u271A ${BLOGS.length} blog posts`);
  } else {
    console.log('  \u2013 blogs already present, skipped');
  }

  // ── Gallery albums ────────────────────────────────────────────────────────
  const GalleryAlbum = require('../models/GalleryAlbum');
  if (!(await alreadySeeded(GalleryAlbum, F))) {
    await GalleryAlbum.insertMany(GALLERY.map((g, gi) => ({
      title: g.title,
      description: g.description,
      category: g.category,
      coverImageUrl: photo(`${g.seed}-cover`, 1200, 800),
      coverImageKey: `demo/${g.seed}-cover.jpg`,
      images: Array.from({ length: g.count }, (_, i) => ({
        imageUrl: photo(`${g.seed}-${i + 1}`, 1200, 800),
        imageKey: `demo/${g.seed}-${i + 1}.jpg`,
        caption: `${g.title} \u2014 photo ${i + 1}`,
      })),
      order: gi + 1,
      status: 'active',
      franchise: F,
      createdBy: by,
    })));
    created.GalleryAlbum = GALLERY.length;
    console.log(`  \u271A ${GALLERY.length} gallery albums (${GALLERY.reduce((a, g) => a + g.count, 0)} photos)`);
  } else {
    console.log('  \u2013 gallery already present, skipped');
  }

  // ── Videos ────────────────────────────────────────────────────────────────
  const Video = require('../models/Video');
  if (!(await alreadySeeded(Video, F))) {
    await Video.insertMany(VIDEOS.map((v, i) => ({
      title: v.title,
      description: v.description,
      videoUrl: SAMPLE_CLIPS[v.clip % SAMPLE_CLIPS.length],
      thumbnailUrl: photo(v.seed, 1280, 720),
      thumbnailKey: `demo/${v.seed}.jpg`,
      category: v.category,
      featured: Boolean(v.featured),
      order: i + 1,
      status: 'active',
      franchise: F,
      createdBy: by,
    })));
    created.Video = VIDEOS.length;
    console.log(`  \u271A ${VIDEOS.length} videos`);
  } else {
    console.log('  \u2013 videos already present, skipped');
  }

  // ── Partners ──────────────────────────────────────────────────────────────
  const Partner = require('../models/Partner');
  if (!(await alreadySeeded(Partner, F))) {
    await Partner.insertMany(PARTNERS.map((name, i) => ({
      name,
      logoUrl: logoSvg(name),
      logoKey: `demo/partner-${i + 1}.png`,
      link: '',
      order: i + 1,
      status: 'active',
      franchise: F,
      createdBy: by,
    })));
    created.Partner = PARTNERS.length;
    console.log(`  \u271A ${PARTNERS.length} partners`);
  } else {
    console.log('  \u2013 partners already present, skipped');
  }

  // ── Brochures ─────────────────────────────────────────────────────────────
  const Brochure = require('../models/Brochure');
  if (!(await alreadySeeded(Brochure, F))) {
    await Brochure.insertMany(BROCHURES.map((b, i) => ({
      title: b.title,
      description: b.description,
      category: b.category,
      fileUrl: `https://placehold.co/1240x1754/FFFFFF/0F3D5C/png?text=${encodeURIComponent(b.title)}`,
      fileKey: `demo/brochure-${i + 1}.pdf`,
      fileName: `${slugify(b.title)}.pdf`,
      fileSize: b.size,
      downloads: between(40, 900),
      status: 'active',
      franchise: F,
      createdBy: by,
    })));
    created.Brochure = BROCHURES.length;
    console.log(`  \u271A ${BROCHURES.length} brochures`);
  } else {
    console.log('  \u2013 brochures already present, skipped');
  }

  // ── FAQs ──────────────────────────────────────────────────────────────────
  const FAQ = require('../models/Faq');
  if (!(await alreadySeeded(FAQ, F))) {
    await FAQ.insertMany(FAQS.map((f, i) => ({
      question: f.q,
      answer: f.a,
      category: f.c,
      order: i + 1,
      status: 'active',
      franchise: F,
      createdBy: by,
    })));
    created.FAQ = FAQS.length;
    console.log(`  \u271A ${FAQS.length} FAQs`);
  } else {
    console.log('  \u2013 FAQs already present, skipped');
  }

  // ── Media coverage ────────────────────────────────────────────────────────
  const MediaCoverage = require('../models/MediaCoverage');
  if (!(await alreadySeeded(MediaCoverage, F))) {
    await MediaCoverage.insertMany(MEDIA.map((m, i) => ({
      title: m.title,
      source: m.source,
      link: 'https://example.org/press',
      imageUrl: photo(m.seed, 1200, 800),
      imageKey: `demo/${m.seed}.jpg`,
      publishDate: daysAgo(m.days),
      order: i + 1,
      status: 'active',
      franchise: F,
      createdBy: by,
    })));
    created.MediaCoverage = MEDIA.length;
    console.log(`  \u271A ${MEDIA.length} press mentions`);
  } else {
    console.log('  \u2013 media coverage already present, skipped');
  }

  // ── Donors + donations ────────────────────────────────────────────────────
  const Donor = require('../models/Donor');
  const Donation = require('../models/Donation');
  const allProjects = await Project.find({ franchise: F }).select('_id name category').lean();
  const allSchemes = await Scheme.find({ franchise: F }).select('_id name category').lean();

  if (!(await alreadySeeded(Donor, F))) {
    let donationCount = 0;
    for (const d of DONORS) {
      const donorDonations = between(1, 5);
      const perDonation = Math.round(d.amount / donorDonations);

      const donor = await Donor.create({
        name: d.name,
        email: `${slugify(d.name)}@example.com`,
        phone: `+9198${between(10000000, 99999999)}`,
        type: d.type,
        category: d.category,
        address: { city: d.city, state: 'Kerala', country: 'India', pincode: String(between(670001, 695615)) },
        donationPreferences: {
          frequency: d.category === 'recurring' ? 'monthly' : 'one-time',
          preferredAmount: perDonation,
          preferredMethod: pick(['upi', 'bank_transfer', 'card']),
        },
        status: 'active',
        isVerified: true,
        verificationDate: daysAgo(between(60, 500)),
        followUpStatus: pick(['active', 'pending_reminder', 'active', 'overdue']),
        engagementScore: between(35, 98),
        engagement: { contactCount: between(2, 24), eventAttendance: between(0, 6), referrals: between(0, 4) },
        source: pick(['website', 'event', 'referral', 'direct']),
        donationStats: {
          totalDonated: d.amount,
          donationCount: donorDonations,
          averageDonation: perDonation,
          firstDonation: daysAgo(between(200, 700)),
          lastDonation: daysAgo(between(3, 90)),
          largestDonation: perDonation * 2,
          currentYearDonations: Math.round(d.amount * 0.6),
          lastYearDonations: Math.round(d.amount * 0.4),
        },
        preferredPrograms: allProjects.slice(0, 2).map((p) => p._id),
        franchise: F,
        createdBy: by,
      });

      for (let i = 0; i < donorDonations; i += 1) {
        const project = pick(allProjects);
        const scheme = pick(allSchemes);
        const when = daysAgo(between(5, 400));
        donationCount += 1;
        await Donation.create({
          // Unique per record: the collection has a unique index on
          // { idempotencyKey, franchise }, and null values collide.
          idempotencyKey: `demo-${FRANCHISE_SLUG}-donation-${donationCount}`,
          donor: donor._id,
          project: project?._id,
          scheme: scheme?._id,
          amount: perDonation + between(-2, 6) * 500,
          currency: 'INR',
          method: pick(['online', 'bank_transfer', 'upi', 'cash']),
          status: 'completed',
          purpose: pick(['general', 'education', 'healthcare', 'emergency_relief', 'other']),
          preferences: {
            frequency: d.category === 'recurring' ? 'monthly' : 'one-time',
            isAnonymous: false,
            publicDisplay: true,
          },
          campaign: { source: pick(['website', 'email', 'social_media', 'offline']), campaignName: 'Ramadan 2026' },
          verification: { status: 'verified', verifiedBy: by, verifiedAt: when },
          timeline: { createdAt: when, completedAt: when },
          receipt: {
            receiptNumber: `RCPT-${when.getFullYear()}-${between(1000, 9999)}`,
            issuedDate: when,
            emailSent: true,
            emailSentAt: when,
          },
          franchise: F,
          createdBy: by,
        });
      }
    }
    created.Donor = DONORS.length;
    created.Donation = donationCount;
    console.log(`  \u271A ${DONORS.length} donors and ${donationCount} donations`);
  } else {
    console.log('  \u2013 donors already present, skipped');
  }

  // ── Beneficiaries + applications + payments ───────────────────────────────
  const Location = require('../models/Location');
  const districts = await Location.find({ type: 'district' }).select('_id name').lean();

  if (!districts.length) {
    console.warn('  ! No districts found \u2014 skipping beneficiaries/applications.');
    console.warn('    Run: node src/scripts/migrateLocations.js');
  } else {
    const Beneficiary = require('../models/Beneficiary');
    const Application = require('../models/Application');
    const Payment = require('../models/Payment');
    const Counter = require('../models/Counter');
    const { generateApplicationNumber } = require('../utils/applicationNumberGenerator');

    if (!(await alreadySeeded(Beneficiary, F))) {
      // One area + unit per district so every beneficiary sits in a valid hierarchy.
      const hierarchy = [];
      for (const d of districts) {
        const area = await Location.findOne({ type: 'area', parent: d._id }).select('_id').lean();
        if (!area) continue;
        const unit = await Location.findOne({ type: 'unit', parent: area._id }).select('_id').lean();
        if (!unit) continue;
        hierarchy.push({ district: d._id, area: area._id, unit: unit._id });
      }

      const beneficiaries = [];
      for (let i = 0; i < BENEFICIARY_NAMES.length; i += 1) {
        const h = hierarchy[i % hierarchy.length];
        beneficiaries.push(await Beneficiary.create({
          name: BENEFICIARY_NAMES[i],
          phone: `+9197${between(10000000, 99999999)}`,
          district: h.district,
          area: h.area,
          unit: h.unit,
          status: pick(['active', 'active', 'active', 'pending']),
          isVerified: true,
          verifiedBy: by,
          verifiedAt: daysAgo(between(20, 400)),
          franchise: F,
          createdBy: by,
        }));
      }
      created.Beneficiary = beneficiaries.length;
      console.log(`  \u271A ${beneficiaries.length} beneficiaries across ${hierarchy.length} districts`);

      let appsMade = 0;
      let paymentsMade = 0;
      for (let i = 0; i < 34; i += 1) {
        const b = beneficiaries[i % beneficiaries.length];
        const scheme = allSchemes[i % allSchemes.length];
        const status = APPLICATION_STATUSES[i % APPLICATION_STATUSES.length];
        const amount = [15000, 25000, 40000, 50000, 75000, 120000][i % 6];
        const requestedAt = daysAgo(between(10, 300));

        // The number is generated explicitly here because the model's pre-save
        // hook runs after validation, so `create()` without it fails validation.
        const applicationNumber = await generateApplicationNumber({
          franchiseId: F,
          ApplicationModel: Application,
        });

        const app = await Application.create({
          applicationNumber,
          beneficiary: b._id,
          scheme: scheme._id,
          status,
          district: b.district,
          area: b.area,
          unit: b.unit,
          requestedAmount: amount,
          approvedAmount: ['approved', 'disbursed'].includes(status) ? amount : undefined,
          purpose: `Support under ${scheme.name}`,
          isRecurring: false,
          renewalStatus: 'not_applicable',
          interview: {
            type: pick(['offline', 'online']),
            result: ['interview_completed', 'approved', 'disbursed'].includes(status) ? 'passed' : 'pending',
          },
          submittedAt: requestedAt,
          franchise: F,
          createdBy: by,
        });
        appsMade += 1;

        if (['approved', 'disbursed'].includes(status)) {
          const now = new Date();
          const ym = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
          const paySeq = await Counter.getNextSequence(`payment_${ym}`);

          await Payment.create({
            paymentNumber: `PAY_${ym}_${String(paySeq).padStart(5, '0')}`,
            application: app._id,
            beneficiary: b._id,
            project: allProjects[i % allProjects.length]._id,
            scheme: scheme._id,
            amount: Math.round(amount * 0.9),
            type: 'full_payment',
            method: pick(['bank_transfer', 'upi', 'cheque']),
            status: 'completed',
            verification: { status: 'verified', confirmationMethod: 'call' },
            processedAt: daysAgo(between(2, 40)),
            initiatedBy: by,
            franchise: F,
            createdBy: by,
          });
          paymentsMade += 1;
        }
      }
      created.Application = appsMade;
      created.Payment = paymentsMade;
      console.log(`  \u271A ${appsMade} applications and ${paymentsMade} payments`);
    } else {
      console.log('  \u2013 beneficiaries already present, skipped');
    }
  }

  console.log('\n───────────────────────────────────────────────');
  console.log('Demo data seeded:');
  for (const [k, v] of Object.entries(created)) console.log(`  ${k}: ${v}`);
  console.log('───────────────────────────────────────────────');
  console.log('\nThis is TEMPORARY demo content, scoped to the "' + FRANCHISE_SLUG + '" franchise.');
  console.log('Accounts, roles, permissions, locations and other franchises were not touched.');
  console.log('Remove it with:');
  console.log(`  FRANCHISE_SLUG=${FRANCHISE_SLUG} node src/scripts/seedDemoData.js --clear\n`);

  await mongoose.connection.close();
}

run().catch(async (err) => {
  console.error('\n✖ Seeding failed:', err.message);
  if (err.errors) {
    for (const [field, e] of Object.entries(err.errors)) console.error(`   ${field}: ${e.message}`);
  }
  try { await mongoose.connection.close(); } catch { /* already closed */ }
  process.exit(1);
});
