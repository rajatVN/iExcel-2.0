/**
 * iExcel 2.0 – In-Basket Exercise (Project Drishti Pilot)
 * CANDIDATE-FACING CONTENT ONLY.
 *
 * Transcribed from "iExcel 2.0 In-Basket - Project Drishti Pilot.docx",
 * Candidate Pack sections A–H. Wording is kept exactly as in the source.
 *
 * Part 3 of the source (Sections I and J — competency mapping and marking
 * guide) is assessor-only and is intentionally NOT included anywhere in this
 * application. Do not add it to this file: this module is shipped to the
 * candidate's browser.
 */

export type Block =
  | { kind: "p"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "metrics"; title: string; rows: { label: string; value: string }[] }
  | {
      kind: "survey";
      intro: string;
      rows: { statement: string; before: string; after: string }[];
    }
  | { kind: "chat"; messages: string[] }
  | { kind: "attachment"; heading: string; blocks: Block[] }
  | { kind: "forward"; heading: string; blocks: Block[] }
  | { kind: "margin-note"; text: string };

export type ItemFormat = "email" | "dashboard" | "whatsapp" | "email-memo" | "survey" | "training";

export interface InBasketItem {
  id: number;
  format: ItemFormat;
  /** Format label exactly as in the source, e.g. "Email with attached memo". */
  formatLabel: string;
  /** Short identifier used in the inbox list and in the response report. */
  shortTitle: string;
  sender: string;
  /** Compact time label for the inbox list. */
  sentShort: string;
  subject: string;
  preview: string;
  headers: { label: string; value: string }[];
  blocks: Block[];
  responseType: "standard" | "recommendation";
}

export const ASSESSMENT_TITLE = "iExcel 2.0 – In-Basket Exercise";
export const ASSESSMENT_SUBTITLE = "Project Drishti";
export const ROLE_NAME = "Ananya Kulkarni";
export const ROLE_TITLE = "Manager – Manufacturing Excellence";
export const ITEM_COUNT = 9;

/* ------------------------------------------------------------------------ */
/* A. Note to the participant                                                */
/* ------------------------------------------------------------------------ */

export const participantNote =
  "To the participant. You will play the role of Ananya Kulkarni at a fictional company. Read Sections B to G first, then work through the nine items in Section H. You have 30 minutes in total. Everything you need is in this pack.";

/* ------------------------------------------------------------------------ */
/* B. Organisation Context                                                   */
/* ------------------------------------------------------------------------ */

export const organisationContext = {
  intro:
    "Aaravi Automotive Ltd. is an Indian vehicle manufacturer with more than thirty-five years in the market. It has two plants: Dharwad (Karnataka), the smaller and newer plant, and Neemrana (Rajasthan), the larger and older plant. A long-term settlement with the workers’ union covers manning, shift patterns and the introduction of new machinery at both plants. Most inspection staff are long-serving.",
  pressuresLead: "The company faces three pressures at the same time:",
  pressures: [
    {
      label: "Cost.",
      text: "Input costs are rising, and price competition makes them hard to pass on. Leadership has set a manufacturing cost reduction target for next year and has named automation as part of the answer.",
    },
    {
      label: "Quality.",
      text: "Customer complaints about defects that reached customers rose last year. Quality is under pressure to show that this has stopped.",
    },
    {
      label: "Growth.",
      text: "A new model launches next year. The New Model Launch team is building its own team and needs experienced people from the plants.",
    },
  ],
  drishtiHeading: "Project Drishti",
  drishti:
    "Project Drishti puts camera-based automated inspection (cameras and software that flag defective parts) and digital line monitoring (a screen-based view of output and stoppages) on the production lines. It has run as a pilot on two lines at Dharwad since June 2026. The proposed next step is to roll it out to Neemrana. A Steering Committee, chaired by the Chief Operating Officer, reviews the project.",
  glossary: [
    {
      term: "False reject",
      meaning: "A part the camera flags as defective that is found to be good when a person checks it again",
    },
    { term: "Escape", meaning: "A defective part that is not caught and reaches the customer" },
    { term: "Super-user", meaning: "An operator trained to fix and reset the system on the line when it stops" },
    {
      term: "Manual override",
      meaning: "Letting parts pass by hand when the system has stopped. The rule is that every override is logged.",
    },
    { term: "Go-live", meaning: "The date from which the system is used for real inspection on a line" },
  ],
};

/* ------------------------------------------------------------------------ */
/* C. Organisational Structure                                               */
/* ------------------------------------------------------------------------ */

export const organisationStructure = {
  intro: "Only the people who appear in the items are shown.",
  chartImage: "/organisation-structure.png",
  people: [
    {
      name: "Arvind Choudhary",
      role: "Chief Operating Officer (COO); chairs the Drishti Steering Committee",
      reportsTo: "Managing Director",
      relationship: "Project sponsor; two levels above Ananya",
    },
    {
      name: "Suresh Iyengar",
      role: "Head – Manufacturing Excellence",
      reportsTo: "COO",
      relationship: "Ananya’s manager",
    },
    {
      name: "Ananya Kulkarni",
      role: "Manager – Manufacturing Excellence; Drishti project lead (you)",
      reportsTo: "Suresh Iyengar",
      relationship: "–",
    },
    {
      name: "Vikrant Desai",
      role: "Plant Head – Dharwad (pilot plant)",
      reportsTo: "COO",
      relationship: "Senior peer; Ananya’s team works in his plant",
    },
    {
      name: "Farhan Qureshi",
      role: "Plant Head – Neemrana",
      reportsTo: "COO",
      relationship: "Senior peer; his plant is next for Drishti",
    },
    {
      name: "Lakshmi Narayanan",
      role: "Head – Quality",
      reportsTo: "COO",
      relationship: "Internal customer for inspection results",
    },
    {
      name: "Deepak Malhotra",
      role: "Head – New Model Launch",
      reportsTo: "COO",
      relationship: "Peer function; building a launch team",
    },
    {
      name: "Manish Agarwal",
      role: "Finance Business Partner – Manufacturing",
      reportsTo: "Chief Financial Officer",
      relationship: "Owns the manufacturing budget numbers",
    },
    {
      name: "Neha Saxena",
      role: "HR Business Partner – Manufacturing",
      reportsTo: "Head – HR",
      relationship: "Advises on people matters and the union settlement",
    },
    {
      name: "Ritu Sharma",
      role: "L&D Coordinator – Manufacturing",
      reportsTo: "Head – L&D",
      relationship: "Runs Drishti training",
    },
    {
      name: "Imran Shaikh",
      role: "Shift Lead – Inspection, Dharwad (second and night shifts)",
      reportsTo: "Dharwad Production Manager",
      relationship: "Works with Ananya’s team on the pilot lines",
    },
    {
      name: "Pooja Rathod, Arjun Pillai",
      role: "Inspection operators, Dharwad; Drishti super-users",
      reportsTo: "Dharwad Production Manager (on loan to Ananya’s project)",
      relationship: "Part of Ananya’s project team",
    },
    {
      name: "M. Gowda",
      role: "Senior Line Supervisor – Neemrana",
      reportsTo: "Neemrana Production Manager",
      relationship: "Writes on behalf of 14 line supervisors in both plants",
    },
    {
      name: "Karthik Rao",
      role: "Account Manager, VisionEdge Analytics (Drishti vendor; fictional)",
      reportsTo: "–",
      relationship: "External supplier",
    },
  ],
};

/* ------------------------------------------------------------------------ */
/* D. Your Role                                                              */
/* ------------------------------------------------------------------------ */

export const yourRole = {
  heading: "Your Role: Ananya Kulkarni",
  paragraphs: [
    "You are Ananya Kulkarni, Manager – Manufacturing Excellence. You have been with Aaravi for nine years. Your background is in lean manufacturing and process improvement, and you have led several improvement projects on the shop floor. You report to Suresh Iyengar. You have been based at Dharwad for the pilot.",
    "Drishti is your first project with automated, camera-based inspection. So far you have relied on the vendor, VisionEdge, and on your two super-users, Pooja and Arjun, for technical questions such as how the system decides what to reject.",
  ],
  canDo: [
    "Decide the roll-out plan and recommend go-live dates to the Steering Committee",
    "Decide Drishti training content, with L&D",
    "Assign work within your project team",
    "Recommend figures and decisions to Suresh and the Steering Committee",
  ],
  cannotDo: [
    "Commit the company on jobs, transfers, pay or anything covered by the union settlement (this needs HR and the plant head)",
    "Approve spending outside the project budget (this goes through Suresh)",
    "Change camera settings without Quality’s agreement",
  ],
};

/* ------------------------------------------------------------------------ */
/* E. The Immediate Situation                                                */
/* ------------------------------------------------------------------------ */

export const immediateSituation = [
  "It is 07:30 on Monday 19 October 2026. You came back late last night from a one-week residential leadership programme. Before you left, you agreed with Suresh that you would not be contacted except in an emergency. Suresh handled routine matters but did not commit you on anything important. Everything that needed you has been held.",
  "The nine items in Section H are in your inbox and on your desk. None of them has been answered. Your first meeting is at 09:30. You cannot reach anyone before then, so you need to decide now what you will do, in what order, and what you will say.",
];

/* ------------------------------------------------------------------------ */
/* F. Your Calendar This Week                                                */
/* ------------------------------------------------------------------------ */

export const calendar = {
  days: [
    {
      day: "Monday 19 Oct",
      entries: [
        { time: "09:30", text: "Drishti weekly team review, Dharwad (your team, including Pooja and Arjun)" },
        { time: "14:00", text: "Second shift starts at Dharwad" },
        { time: "16:00", text: "Call with VisionEdge (Karthik Rao)" },
      ],
    },
    {
      day: "Tuesday 20 Oct",
      entries: [
        { time: "11:00", text: "One-to-one with Suresh" },
        { time: "18:00", text: "Deadline: your one-page recommendation to Suresh" },
      ],
    },
    {
      day: "Wednesday 21 Oct",
      entries: [
        {
          time: "10:00",
          text: "Drishti Steering Committee (COO chairs; plant heads, Quality, Finance and HR attend)",
        },
      ],
    },
    {
      day: "Thursday 22 Oct",
      entries: [
        { time: "09:00", text: "Budget lock with Finance (Drishti savings line)" },
        { time: "11:00", text: "Neemrana supervisors’ briefing by Vikrant Desai and Farhan Qureshi" },
      ],
    },
    {
      day: "Friday 23 Oct",
      entries: [
        { time: "All day", text: "Neemrana Drishti training, batch 1, begins" },
        { time: "End of day", text: "Deadline: reply requested by the line supervisors" },
      ],
    },
  ],
  footnote:
    "The hardest decisions of the week fall between Tuesday evening and Friday, and several items bear on them.",
};

/* ------------------------------------------------------------------------ */
/* G. Instructions                                                           */
/* ------------------------------------------------------------------------ */

export const instructions: { text: string; sub?: { label: string; text: string }[] }[] = [
  {
    text: "You have 30 minutes in total. We suggest you read all nine items before you write anything. Later items carry information that bears on earlier ones.",
  },
  {
    text: "For each of Items 1 to 8, write on the response sheet:",
    sub: [
      { label: "Priority:", text: "High, Medium or Low." },
      { label: "Action:", text: "what you will do, with whom and by when (2 to 4 short lines)." },
      {
        label: "Say now / hold:",
        text: "what you will communicate now, and anything you will deliberately not say or commit yet (1 line).",
      },
    ],
  },
  {
    text: "For Item 9, write the outline of your one-page recommendation to Suresh (about 150 words; bullet points are fine).",
  },
  {
    text: "Respond to every item. Deciding that no action is needed, and saying why, is a response. If you pass an item to someone, say what you want them to do and by when.",
  },
  {
    text: "Where the information is not enough to decide, say what is missing, who will provide it, by when, and what you will do in the meantime.",
  },
  {
    text: "If a later item changes your view on an earlier one, strike through what you are changing and write the new decision beside it. Do not erase it. Changes are allowed and expected.",
  },
  {
    text: "Some items do not ask you for anything. Whether an item needs action, and how much, is for you to judge. No item needs another to be answered first.",
  },
  { text: "Short notes are fine. Spelling, grammar and writing style are not assessed." },
];

/** Added for the online format (not in the paper pack). */
export const onlineFormatNotes = [
  "In this online version, the response sheet is built into each item. You can open the items in any order and return to any item at any time before you submit.",
  "To change an earlier decision, simply edit your response. You do not need to strike anything through: each saved version is kept on record automatically.",
  "Your responses are saved automatically as you type. When the time runs out, your responses are submitted automatically.",
];

/* ------------------------------------------------------------------------ */
/* H. In-Basket Items                                                        */
/* ------------------------------------------------------------------------ */

export const itemsIntro =
  "The items appear as they would in your inbox. The question for every item is the same: As Ananya, what will you do?";

export const items: InBasketItem[] = [
  {
    id: 1,
    format: "email",
    formatLabel: "Email",
    shortTitle: "Finance — firm savings figure",
    sender: "Manish Agarwal",
    sentShort: "Fri 17:40",
    subject: "Drishti savings – firm number needed for Thursday",
    preview: "We lock next year’s manufacturing budget on Thursday at 09:00. The Drishti business case shows a saving of ₹18 crore…",
    headers: [
      { label: "From", value: "Manish Agarwal, Finance Business Partner – Manufacturing" },
      { label: "To", value: "Ananya Kulkarni" },
      { label: "Cc", value: "Suresh Iyengar" },
      { label: "Sent", value: "Friday 16 October, 17:40" },
    ],
    blocks: [
      { kind: "p", text: "Ananya," },
      {
        kind: "p",
        text: "We lock next year’s manufacturing budget on Thursday at 09:00. The Drishti business case shows a saving of ₹18 crore a year at full roll-out across both plants, mainly from 40 fewer manual inspection roles and lower rework.",
      },
      {
        kind: "p",
        text: "I need one firm figure from you by Wednesday evening, not a range. The COO has already mentioned Drishti savings in the cost plan.",
      },
      {
        kind: "p",
        text: "Two things I have not reconciled. The case has no line for retraining, redeployment or running manual and automated inspection side by side. And Deepak’s launch team has asked for 12 additional people next year. Tell me if either changes your number.",
      },
      { kind: "p", text: "Manish" },
    ],
    responseType: "standard",
  },
  {
    id: 2,
    format: "email",
    formatLabel: "Email",
    shortTitle: "Plant Head Dharwad — take Drishti to Neemrana in November",
    sender: "Vikrant Desai",
    sentShort: "Sat 11:20",
    subject: "Dharwad pilot works – let’s take Drishti to Neemrana in November",
    preview: "Output per operator on the pilot lines is up 22% since Drishti went live in June. That settles it for me…",
    headers: [
      { label: "From", value: "Vikrant Desai, Plant Head – Dharwad" },
      { label: "To", value: "Ananya Kulkarni" },
      { label: "Cc", value: "Farhan Qureshi" },
      { label: "Sent", value: "Saturday 17 October, 11:20" },
    ],
    blocks: [
      { kind: "p", text: "Ananya," },
      {
        kind: "p",
        text: "Output per operator on the pilot lines is up 22% since Drishti went live in June. That settles it for me. Let’s start Neemrana on 2 November and book the savings in this budget.",
      },
      {
        kind: "p",
        text: "Yes, the new paint-shop line and the new shift pattern also started in this period, and line headcount is about 10% lower because we moved people to the launch team. Volumes were roughly flat. I don’t think that changes the story.",
      },
      {
        kind: "p",
        text: "Farhan and I brief the Neemrana supervisors on Thursday at 11:00. I want Manufacturing Excellence and the plants saying the same thing there, and at Wednesday’s Steering Committee. Can I count on your support?",
      },
      { kind: "p", text: "Vikrant" },
    ],
    responseType: "standard",
  },
  {
    id: 3,
    format: "dashboard",
    formatLabel: "Dashboard extract with note",
    shortTitle: "Quality — inspection results and two false-reject figures",
    sender: "Lakshmi Narayanan",
    sentShort: "Fri 19:05",
    subject: "Drishti inspection results – decision needed before Neemrana",
    preview: "Drishti dashboard – Dharwad pilot lines, September. False rejects: 4.8% of parts inspected (go-live target: 2.0%)…",
    headers: [
      { label: "From", value: "Lakshmi Narayanan, Head – Quality" },
      { label: "To", value: "Ananya Kulkarni" },
      { label: "Sent", value: "Friday 16 October, 19:05" },
    ],
    blocks: [
      {
        kind: "metrics",
        title: "Drishti dashboard – Dharwad pilot lines, September",
        rows: [
          { label: "False rejects", value: "4.8% of parts inspected (go-live target: 2.0%)" },
          {
            label: "Escapes (defects reaching customers)",
            value: "0 from June to September (7 in the four months before go-live)",
          },
          { label: "Line stoppages for re-checks", value: "41 in September" },
        ],
      },
      {
        kind: "p",
        text: "Ananya, the line-monitoring system shows false rejects at 2.1% for the same month. The two systems count re-checked parts differently, and nobody has yet confirmed which figure is right.",
      },
      {
        kind: "p",
        text: "Production wants the camera sensitivity lowered to cut stoppages. My team will not accept any lowering until we know the real false-reject rate. Escapes are what Quality is judged on. Please tell me before the Steering Committee whether Neemrana goes live with the current settings.",
      },
      { kind: "p", text: "Lakshmi" },
    ],
    responseType: "standard",
  },
  {
    id: 4,
    format: "whatsapp",
    formatLabel: "WhatsApp message",
    shortTitle: "Shift Lead — floor rumour and the super-users",
    sender: "Imran Shaikh",
    sentShort: "Sun 22:15",
    subject: "WhatsApp message",
    preview: "Ma’am, sorry to message late. The story on the floor tonight is that once Drishti goes to Neemrana…",
    headers: [
      { label: "From", value: "Imran Shaikh (Shift Lead – Inspection, Dharwad)" },
      { label: "Received", value: "Sunday 18 October, 22:15" },
    ],
    blocks: [
      {
        kind: "chat",
        messages: [
          "Ma’am, sorry to message late. The story on the floor tonight is that once Drishti goes to Neemrana, manual inspectors in both plants will be cut. Night-shift inspectors are asking me directly and I have nothing to tell them.",
          "One more thing. Pooja and Arjun say Deepak sir’s launch team has asked them to join from 1 November. They are the only two who can reset the cameras when they stop. We had three stoppages on night shift this week. People used manual override and did not log it.",
          "I need something I can tell my team before second shift starts at 14:00 tomorrow.",
        ],
      },
    ],
    responseType: "standard",
  },
  {
    id: 5,
    format: "email-memo",
    formatLabel: "Email with attached memo",
    shortTitle: "Line supervisors — written assurance before roll-out (with HR memo)",
    sender: "M. Gowda",
    sentShort: "Fri 16:30",
    subject: "Assurance before Neemrana roll-out",
    preview: "Before Drishti comes to Neemrana, we request written confirmation that no inspector will lose his job…",
    headers: [
      {
        label: "From",
        value: "M. Gowda, Senior Line Supervisor – Neemrana (on behalf of 14 line supervisors, Dharwad and Neemrana)",
      },
      { label: "To", value: "Ananya Kulkarni" },
      { label: "Cc", value: "Farhan Qureshi, Vikrant Desai" },
      { label: "Sent", value: "Friday 16 October, 16:30" },
    ],
    blocks: [
      { kind: "p", text: "Madam," },
      {
        kind: "p",
        text: "Before Drishti comes to Neemrana, we request written confirmation that no inspector will lose his job or be transferred out of his plant. Please reply by Friday 23 October. Without this, supervisors will find it difficult to release inspectors for the Drishti training batches.",
      },
      { kind: "p", text: "M. Gowda" },
      {
        kind: "attachment",
        heading:
          "Attached memo – from Neha Saxena, HR Business Partner – Manufacturing, to the Drishti project team (Thursday 15 October):",
        blocks: [
          {
            kind: "p",
            text: "Any written statement about jobs, transfers or headcount must be cleared by HR and the plant head. Changes in manning are covered by the long-term settlement with the workers’ union, and a written promise either way could bind the company in that process. At the same time, silence is being read as confirmation of the rumours. I can help draft, but the decision on what to say, and when, sits with the business.",
          },
        ],
      },
    ],
    responseType: "standard",
  },
  {
    id: 6,
    format: "survey",
    formatLabel: "Survey extract",
    shortTitle: "Drishti adoption pulse survey",
    sender: "HR analytics team",
    sentShort: "Fri",
    subject: "Drishti adoption pulse – shop-floor staff, Dharwad and Neemrana",
    preview: "Favourable responses, August survey compared with October survey…",
    headers: [
      { label: "Source", value: "HR analytics team" },
      { label: "Placed in inbox", value: "Friday 16 October" },
    ],
    blocks: [
      {
        kind: "survey",
        intro: "Favourable responses, August survey compared with October survey:",
        rows: [
          { statement: "‘I understand how Drishti will change my job’", before: "58%", after: "31%" },
          { statement: "‘I believe Drishti will be good for people like me’", before: "52%", after: "34%" },
          { statement: "‘I know who to go to when Drishti has a problem’ (Dharwad only)", before: "66%", after: "49%" },
          { statement: "Response rate", before: "74%", after: "38%" },
        ],
      },
      { kind: "p", text: "No split by plant or shift is attached." },
      {
        kind: "margin-note",
        text: "An unsigned note in the margin reads: ‘Neemrana hardly responded – draw your own conclusions.’",
      },
    ],
    responseType: "standard",
  },
  {
    id: 7,
    format: "email",
    formatLabel: "Email",
    shortTitle: "Vendor — Operator Readiness Score",
    sender: "Karthik Rao",
    sentShort: "Thu 12:10",
    subject: "Operator Readiness Score – ready to share",
    preview: "As discussed with your team, our Operator Readiness Score now ranks all 230 inspection staff across both plants…",
    headers: [
      { label: "From", value: "Karthik Rao, Account Manager, VisionEdge Analytics" },
      { label: "To", value: "Ananya Kulkarni" },
      { label: "Sent", value: "Thursday 15 October, 12:10" },
    ],
    blocks: [
      { kind: "p", text: "Dear Ananya," },
      {
        kind: "p",
        text: "As discussed with your team, our Operator Readiness Score now ranks all 230 inspection staff across both plants on how likely they are to adapt to Drishti. It uses attendance, age band, years of service, e-module quiz scores and supervisor ratings. Supervisor ratings were not available for Neemrana, so we estimated them from the Dharwad pattern.",
      },
      {
        kind: "p",
        text: "The score has not yet been checked against how people actually perform on Drishti. A validation study would take about ten weeks. We suggest you use the ranked list now to decide who is retrained and who is redeployed, and run the validation in parallel.",
      },
      { kind: "p", text: "Shall we send the list on Wednesday?" },
      { kind: "p", text: "Karthik" },
    ],
    responseType: "standard",
  },
  {
    id: 8,
    format: "training",
    formatLabel: "Training report and forwarded article",
    shortTitle: "L&D — training status and forwarded article",
    sender: "Ritu Sharma",
    sentShort: "Fri 15:20",
    subject: "Drishti training status",
    preview: "Dharwad: 100% of inspection and line staff have completed the vendor’s two-hour e-module…",
    headers: [
      { label: "From", value: "Ritu Sharma, L&D Coordinator – Manufacturing" },
      { label: "To", value: "Drishti project team" },
      { label: "Sent", value: "Friday 16 October, 15:20" },
    ],
    blocks: [
      {
        kind: "p",
        text: "Dharwad: 100% of inspection and line staff have completed the vendor’s two-hour e-module, with an average quiz score of 86%. Neemrana: batch 1 starts on Friday 23 October with the same module. The module is the vendor’s standard version and does not use our lines or parts. No refresher is planned.",
      },
      {
        kind: "forward",
        heading: "Forwarded by Suresh Iyengar on Saturday 17 October, with no message:",
        blocks: [
          {
            kind: "p",
            text: "Trade press, 14 October. A components manufacturer has paused the roll-out of camera inspection at its second plant after operators began working around the system. Its operations head said training had covered ‘how to use the screens, not what to do when the screens are wrong’.",
          },
        ],
      },
    ],
    responseType: "standard",
  },
  {
    id: 9,
    format: "email",
    formatLabel: "Email",
    shortTitle: "Suresh — one-page recommendation for the Steering Committee",
    sender: "Suresh Iyengar",
    sentShort: "Sun 20:30",
    subject: "Your recommendation for Wednesday – by Tuesday 18:00",
    preview: "Welcome back. I have held everything that needed you. For Wednesday’s Steering Committee I need your recommendation…",
    headers: [
      { label: "From", value: "Suresh Iyengar, Head – Manufacturing Excellence" },
      { label: "To", value: "Ananya Kulkarni" },
      { label: "Sent", value: "Sunday 18 October, 20:30" },
    ],
    blocks: [
      { kind: "p", text: "Ananya," },
      {
        kind: "p",
        text: "Welcome back. I have held everything that needed you. For Wednesday’s Steering Committee I need your recommendation on one page, by Tuesday 18:00:",
      },
      {
        kind: "bullets",
        items: [
          "whether and when Drishti goes to Neemrana, and on what conditions",
          "the savings figure we give Finance on Thursday",
          "what we say to the supervisors and the floor, and what we hold back",
          "what we need to know before we move, and who does what",
        ],
      },
      {
        kind: "p",
        text: "The plant heads want speed, Quality wants no loosening, Finance wants a firm number and HR wants care with anything in writing. Arvind will want a clear view. I will back a clear view; I won’t back a hedge.",
      },
      { kind: "p", text: "Suresh" },
    ],
    responseType: "recommendation",
  },
];

/* ------------------------------------------------------------------------ */
/* Response sheet guidance                                                   */
/* ------------------------------------------------------------------------ */

export const responseGuidance = {
  priority: "Priority",
  action: {
    label: "Action",
    hint: "What will you do, with whom and by when? (2 to 4 short lines)",
  },
  sayHold: {
    label: "Say now / Hold",
    hint: "What will you communicate now, and what will you deliberately not say or commit yet? (1 line each)",
    sayNow: { label: "Say now", placeholder: "Who, and what you’ll say…" },
    hold: { label: "Hold", placeholder: "What you’ll hold back, and why (or “Nothing to hold”)…" },
  },
  recommendation: {
    label: "Outline of your one-page recommendation to Suresh",
    hint: "About 150 words; bullet points are fine.",
    targetWords: 150,
  },
};

export const PRIORITIES = ["High", "Medium", "Low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}
