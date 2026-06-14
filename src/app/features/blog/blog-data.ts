export type BlogCategory =
  | "Website Roasts"
  | "Indie Dev Guides"
  | "Vibe Coding"
  | "Launch & Growth";

export interface BlogSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface BlogArticle {
  slug: string;
  title: string;
  excerpt: string;
  shortAnswer: string;
  category: BlogCategory;
  readTime: string;
  publishedAt: string;
  updatedAt: string;
  author: string;
  image: string;
  imageAlt: string;
  audience: string;
  featured?: boolean;
  sections: BlogSection[];
}

export const blogCategories: Array<BlogCategory | "All"> = [
  "All",
  "Website Roasts",
  "Indie Dev Guides",
  "Vibe Coding",
  "Launch & Growth",
];

export const blogArticles: BlogArticle[] = [
  {
    slug: "website-roast-checklist",
    title: "Website Roast Checklist: 25 Things to Fix Before Launch",
    excerpt:
      "A brutal but practical pass over your headline, CTA, trust signals, mobile layout, speed, and the five seconds that decide whether anyone stays.",
    shortAnswer:
      "A useful website roast checks whether visitors understand the product, trust the builder, and know what to do next. Fix clarity before polish: headline, offer, proof, CTA, mobile layout, and loading speed.",
    category: "Website Roasts",
    readTime: "9 min read",
    publishedAt: "June 14, 2026",
    updatedAt: "June 14, 2026",
    author: "Lokalhost Editorial",
    image: "/blog/landing-page-roast.jpg",
    imageAlt: "A landing page being scanned and improved by a website roast",
    audience: "Indie developers, students, startup founders, and anyone about to share a landing page publicly.",
    featured: true,
    sections: [
      {
        heading: "Your first five seconds are doing most of the work",
        paragraphs: [
          "Most websites do not fail because the idea is bad. They fail because nobody understands what the hell is happening before the tab closes.",
          "A visitor should know what you built, who it helps, and why it matters without scrolling through a founder autobiography.",
        ],
      },
      {
        heading: "The 25-point pre-launch roast",
        bullets: [
          "The headline names a specific outcome, not a vague ambition.",
          "The supporting copy explains who the product is for.",
          "The primary CTA uses an actual command.",
          "The CTA appears before the first major scroll.",
          "The page shows the real product, not an atmospheric stock photo.",
          "Screenshots are legible on mobile.",
          "The visual hierarchy survives without animation.",
          "Text contrast passes a basic accessibility check.",
          "Buttons look clickable and links look like links.",
          "Navigation contains only routes users genuinely need.",
          "The logo links home.",
          "Pricing or cost expectations are not deliberately hidden.",
          "Testimonials identify a real person or company.",
          "Claims include proof, numbers, screenshots, or examples.",
          "The page has a clear privacy policy and terms link.",
          "The domain looks intentional and production-ready.",
          "The favicon, title, description, and social image are configured.",
          "The page loads quickly on a normal mobile connection.",
          "Images have stable dimensions and do not shift the layout.",
          "The experience works with keyboard navigation.",
          "Forms explain errors in human language.",
          "Empty states tell the user what to do next.",
          "There is no dead button, fake metric, or unfinished route.",
          "The product works at common mobile widths.",
          "A stranger can repeat your value proposition after one visit.",
        ],
      },
      {
        heading: "Common mistake: polishing the wrong sentence",
        paragraphs: [
          "Founders spend three hours changing a gradient while the headline still says \"Empowering the future of innovation.\" Nobody knows what that means. Your landing page should explain the product, not summon a detective.",
        ],
      },
    ],
  },
  {
    slug: "first-100-users-without-paid-ads",
    title: "How to Get Your First 100 Users Without Paid Ads",
    excerpt:
      "The unglamorous distribution plan: talk to specific people, enter existing communities, document the build, and earn each early user manually.",
    shortAnswer:
      "Your first 100 users usually come from direct conversations, niche communities, useful public content, and warm introductions. Pick one painful problem, find where affected people already gather, and recruit them one by one.",
    category: "Launch & Growth",
    readTime: "8 min read",
    publishedAt: "June 14, 2026",
    updatedAt: "June 14, 2026",
    author: "Lokalhost Editorial",
    image: "/blog/first-100-users.jpg",
    imageAlt: "An indie product spreading through connected builder communities",
    audience: "Solo founders and indie builders with more time than marketing budget.",
    sections: [
      {
        heading: "Do things that do not scale yet",
        paragraphs: [
          "Early distribution is closer to recruiting than advertising. Find people with the exact problem and ask them to try the smallest useful version.",
          "A hundred mildly curious visitors are worth less than ten users who are annoyed when your product goes offline.",
        ],
      },
      {
        heading: "A practical acquisition loop",
        bullets: [
          "Write down the narrowest user profile that feels the problem weekly.",
          "Join two communities where those people already ask for help.",
          "Answer questions before posting your own link.",
          "Invite ten people personally with a specific reason.",
          "Watch five people use the product without explaining it.",
          "Turn repeated confusion into public guides and demos.",
          "Ask every useful user who else has the same problem.",
          "Share progress, failures, and proof instead of generic launch hype.",
        ],
      },
      {
        heading: "The metric that matters",
        paragraphs: [
          "Track activated users, not impressions. An activated user reaches the product's useful moment and has a reason to return. Everything else is decorative analytics.",
        ],
      },
    ],
  },
  {
    slug: "indie-builder-launch-checklist",
    title: "The Indie Builder Launch Checklist Before You Post Anywhere",
    excerpt:
      "Before Product Hunt, Reddit, X, or your group chat sees the link, make sure the product, story, screenshots, and recovery paths are ready.",
    shortAnswer:
      "A launch-ready project has a working core flow, clear positioning, credible screenshots, analytics, support contact, mobile QA, and a plan for feedback. Launching early is good; launching incomprehensibly is not.",
    category: "Indie Dev Guides",
    readTime: "7 min read",
    publishedAt: "June 14, 2026",
    updatedAt: "June 14, 2026",
    author: "Lokalhost Editorial",
    image: "/blog/launch-checklist.jpg",
    imageAlt: "A launch control desk with product checks and a rocket ready to ship",
    audience: "Builders preparing to release an MVP, side project, portfolio, or open-source tool.",
    sections: [
      {
        heading: "The product check",
        bullets: [
          "The primary user journey works from a fresh browser.",
          "Sign up, login, logout, and password recovery behave correctly.",
          "The app has useful loading, error, and empty states.",
          "Mobile users can complete the core action.",
          "You know what happens when a dependency goes down.",
        ],
      },
      {
        heading: "The launch package",
        bullets: [
          "One sentence explaining the product and audience.",
          "Three honest screenshots showing the actual experience.",
          "A short demo that reaches value quickly.",
          "A launch post written for the community, not for investors.",
          "A direct request: feedback, testers, contributors, or customers.",
        ],
      },
      {
        heading: "The post-launch hour",
        paragraphs: [
          "Stay available. Answer every serious comment, record every repeated question, and fix anything blocking activation. Your launch is not a victory lap; it is a high-volume usability test.",
        ],
      },
    ],
  },
  {
    slug: "vibe-coding-is-not-the-problem",
    title: "Vibe Coding Is Not the Problem. Shipping Garbage Is.",
    excerpt:
      "AI can help you build faster. It cannot take responsibility for broken auth, exposed secrets, inaccessible interfaces, or code nobody understands.",
    shortAnswer:
      "Vibe coding is useful when AI accelerates a workflow you still verify. The problem begins when generated code reaches production without testing, security review, accessibility checks, or anyone understanding the system.",
    category: "Vibe Coding",
    readTime: "6 min read",
    publishedAt: "June 14, 2026",
    updatedAt: "June 14, 2026",
    author: "Lokalhost Editorial",
    image: "/blog/vibe-coding.jpg",
    imageAlt: "A builder choosing between a tested AI coding pipeline and broken production code",
    audience: "AI-assisted builders, students, nontraditional developers, and experienced engineers moving faster with coding agents.",
    sections: [
      {
        heading: "Speed is not the crime",
        paragraphs: [
          "Using AI to skip repetitive work is sensible. Using AI to skip responsibility is how private keys end up in frontend bundles.",
          "You do not need to handwrite every line. You do need to understand the boundaries, data flow, failure modes, and blast radius of what you ship.",
        ],
      },
      {
        heading: "The responsible vibe-coding loop",
        bullets: [
          "Describe the user outcome before asking for code.",
          "Read the surrounding codebase before accepting a new pattern.",
          "Keep changes small enough to review.",
          "Run the real build, tests, and security checks.",
          "Verify the workflow in a browser at mobile and desktop sizes.",
          "Never paste production secrets into prompts or public files.",
          "Record why a non-obvious decision was made.",
        ],
      },
      {
        heading: "Taste still belongs to the builder",
        paragraphs: [
          "Generated software inherits the clarity of the person directing it. Vibe coding is fine. Vibe shipping without testing is where the crime starts.",
        ],
      },
    ],
  },
];

export function getBlogArticle(slug: string | undefined) {
  return blogArticles.find((article) => article.slug === slug);
}
