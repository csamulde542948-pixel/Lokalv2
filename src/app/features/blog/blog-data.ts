export type BlogCategory =
  | "Website Roasts"
  | "Indie Dev Guides"
  | "Vibe Coding"
  | "Launch & Growth"
  | "Case Studies"
  | "Lokalhost Updates";

export interface BlogSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface BlogArticle {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  shortAnswer: string;
  category: BlogCategory;
  readTime: string;
  publishedAt: string;
  updatedAt: string;
  publishedIso: string;
  updatedIso: string;
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
  "Case Studies",
  "Lokalhost Updates",
];

export const blogArticles: BlogArticle[] = [
  {
    slug: "website-roast-checklist",
    title: "Website Roast Checklist: 25 Things to Fix Before Launch",
    metaTitle: "Website Roast Checklist: 25 Fixes Before Launch",
    metaDescription:
      "Use this brutally practical website roast checklist to fix your landing page, improve trust, and make your project easier to understand before launch.",
    excerpt:
      "A brutal but useful checklist for fixing clarity, trust, CTAs, screenshots, mobile layout, and the first five seconds before users disappear.",
    shortAnswer:
      "A good website roast checks whether visitors can understand the product, trust the builder, and know what to do next. Start with the headline, offer, proof, CTA, mobile layout, loading speed, and whether a stranger can explain the product after one visit.",
    category: "Website Roasts",
    readTime: "9 min read",
    publishedAt: "June 16, 2026",
    updatedAt: "June 16, 2026",
    publishedIso: "2026-06-16",
    updatedIso: "2026-06-16",
    author: "Lokalhost Editorial",
    image: "/blog/landing-page-roast.jpg",
    imageAlt: "A landing page being scanned and improved by a website roast",
    audience:
      "Indie developers, students, startup founders, vibe coders, and anyone about to share a landing page publicly.",
    featured: true,
    sections: [
      {
        heading: "What is a website roast?",
        paragraphs: [
          "A website roast is blunt feedback on your website's clarity, design, positioning, trust, and conversion flow. It is not just making fun of your site. The point is to expose the parts of your page that confuse people before real users silently bounce and never tell you why.",
          "A useful roast checks the headline, value proposition, call to action, design hierarchy, mobile experience, credibility, product explanation, screenshots, pricing clarity, and overall trust.",
          "The best roast hurts for five minutes and helps for months.",
        ],
      },
      {
        heading: "Your first five seconds are doing most of the work",
        paragraphs: [
          "Most websites do not fail because the idea is bad. They fail because nobody understands what the hell is happening before the tab closes.",
          "A visitor should know what you built, who it helps, and why it matters without scrolling through a founder autobiography.",
          "Your page should answer three questions fast: what is this, who is it for, and why should I care right now?",
        ],
      },
      {
        heading: "Fix the headline before you fix the gradient",
        paragraphs: [
          "A weak headline tries to sound impressive. A strong headline explains the product.",
          "Bad headline: Build better. Grow faster. Unlock your potential.",
          "Better headline: Get brutal AI feedback on your landing page before you launch.",
          "Your headline should not try to sound expensive. It should try to be understood.",
        ],
        bullets: [
          "Can a first-time visitor understand the product in one sentence?",
          "Does the headline say what the user gets?",
          "Is it specific enough to separate you from similar tools?",
          "Would someone outside your team understand it without context?",
        ],
      },
      {
        heading: "Your CTA should tell users what happens next",
        paragraphs: [
          "If your page has five buttons fighting for attention, users hesitate. Pick one primary action and make it specific.",
          "Avoid weak CTAs like Learn More, Explore, Discover, or Continue when the user does not know what comes after the click.",
        ],
        bullets: [
          "Get your website roasted",
          "Submit your project",
          "Join Lokalhost",
          "Post your launch",
          "Analyze my landing page",
        ],
      },
      {
        heading: "Show the product early",
        paragraphs: [
          "Do not hide the product behind ten paragraphs of founder poetry. If your product has a dashboard, show it. If it generates a result, show the result. If the value is a community interaction, show the interaction.",
          "A screenshot should answer a simple question: what will I see after I sign up?",
        ],
      },
      {
        heading: "Remove fake trust and add real trust",
        paragraphs: [
          "Trust is not built by saying trusted by thousands when the product launched last Tuesday. Trust is built by reducing uncertainty.",
          "For early projects, honest trust signals are better than corporate cosplay.",
        ],
        bullets: [
          "Founder or team profile",
          "Real product screenshots",
          "Public changelog or roadmap",
          "Clear privacy policy and terms",
          "Known limitations or beta status",
          "Contact or support route",
        ],
      },
      {
        heading: "The 25-point pre-launch roast checklist",
        bullets: [
          "The headline names a specific outcome, not a vague ambition.",
          "The supporting copy explains who the product is for.",
          "The primary CTA uses an actual command.",
          "The CTA appears before the first major scroll.",
          "The page shows the real product.",
          "Screenshots are legible on mobile.",
          "The visual hierarchy survives without animation.",
          "Text contrast passes a basic accessibility check.",
          "Buttons look clickable and links look like links.",
          "Navigation contains only routes users genuinely need.",
          "Pricing or access expectations are clear.",
          "Claims include proof, screenshots, numbers, or examples.",
          "The page has privacy policy and terms links.",
          "The domain looks intentional and production-ready.",
          "The favicon, title, description, and social image are configured.",
          "The page loads quickly on a normal mobile connection.",
          "Images have stable dimensions and do not shift the layout.",
          "The core experience works with keyboard navigation.",
          "Forms explain errors in human language.",
          "Empty states tell the user what to do next.",
          "There are no dead buttons or unfinished routes.",
          "The product works at common mobile widths.",
          "The page answers the user's main objections.",
          "The share preview looks presentable.",
          "A stranger can repeat your value proposition after one visit.",
        ],
      },
      {
        heading: "Final roast rule",
        paragraphs: [
          "Your website does not need to impress other founders. It needs to help tired, distracted, skeptical users understand why they should care.",
          "If your landing page explains the product clearly, shows proof, builds trust, and gives users one obvious action, you are already ahead of many projects online.",
        ],
      },
    ],
  },
  {
    slug: "why-your-landing-page-looks-scammy",
    title: "Why Your Landing Page Looks Scammy Even If It Is Not",
    metaTitle: "Why Your Landing Page Looks Scammy",
    metaDescription:
      "Your product may be legit, but your landing page might accidentally look suspicious. Here are the copy, design, and trust mistakes that make users hesitate.",
    excerpt:
      "Your project can be real and useful while the page still sends the wrong trust signals. Here is how to make it feel clear, alive, and believable.",
    shortAnswer:
      "A landing page looks scammy when it uses vague claims, hides the product, lacks proof, asks for commitment too early, or makes users unsure what happens next. The fix is specific copy, realistic promises, visible product examples, clear CTAs, and honest trust signals.",
    category: "Website Roasts",
    readTime: "8 min read",
    publishedAt: "June 16, 2026",
    updatedAt: "June 16, 2026",
    publishedIso: "2026-06-16",
    updatedIso: "2026-06-16",
    author: "Lokalhost Editorial",
    image: "/blog/landing-page-roast.jpg",
    imageAlt: "A suspicious-looking landing page being cleaned up with clearer trust signals",
    audience:
      "Early-stage builders whose product is legit but whose landing page still makes visitors hesitate.",
    sections: [
      {
        heading: "Your product may be real. Your page may still feel risky.",
        paragraphs: [
          "Your intentions may be good. Your code may be working. Your product may even solve a real problem.",
          "But online, people judge fast. Before they read your full explanation, they already feel whether your site looks trustworthy, confusing, rushed, fake, or risky.",
          "Users do not see how hard you worked. They only see the page.",
        ],
      },
      {
        heading: "Generic headlines create suspicion",
        paragraphs: [
          "Scammy pages often use big claims with no details. The future of productivity. Unlock your full potential. Grow 10x with AI.",
          "Those lines are not automatically evil, but they are overused. When users see vague hype, they start doubting the page.",
          "Specific copy feels more honest because it tells people what the product actually does.",
        ],
        bullets: [
          "Instead of: The ultimate AI platform for growth",
          "Write: Get AI feedback on your landing page before launch",
          "Instead of: Supercharge your startup journey",
          "Write: Share your project, get feedback, and find early users",
        ],
      },
      {
        heading: "Huge promises too early feel fake",
        paragraphs: [
          "Early-stage products should be careful with massive claims. If your tool is new, do not promise to make every startup successful.",
          "Promise the next useful step, not the entire dream. For Lokalhost, the promise is grounded: get feedback, get visibility, meet other builders, improve your project, and receive a roast before real users silently leave.",
        ],
      },
      {
        heading: "Bad hierarchy makes every section scream",
        paragraphs: [
          "A page looks suspicious when everything fights for attention: giant headline, animated background, three badges, five CTAs, fake testimonials, and a random dashboard screenshot.",
          "Good design tells the eye where to go first, second, and third. When everything is emphasized, nothing is emphasized.",
        ],
        bullets: [
          "Headline",
          "Subheadline",
          "Primary CTA",
          "Product preview",
          "Benefits",
          "Proof",
          "Final CTA",
        ],
      },
      {
        heading: "Screenshots need to prove the product, not decorate the page",
        paragraphs: [
          "Product screenshots build trust only when people can understand them. A blurry dashboard with tiny fake data does not help.",
          "Show the actual value: a project post, a roast result, a launchpad event, a builder profile, a shared result card, or a comment thread with useful feedback.",
        ],
      },
      {
        heading: "Anonymous does not have to mean lifeless",
        paragraphs: [
          "Anonymous products can work, but early-stage products need signs of life. If there is no founder name, social link, changelog, community activity, or contact route, users hesitate.",
          "You do not need to look corporate. You need to look alive.",
        ],
        bullets: [
          "Founder profile",
          "Public roadmap",
          "Community count",
          "Update log",
          "Social media link",
          "Real screenshots",
          "Clear support email",
        ],
      },
      {
        heading: "The fix is removing confusion",
        paragraphs: [
          "Trust is not built by writing trust us. Trust is built by removing uncertainty.",
          "Make the headline specific, show the product, use realistic promises, add real examples, clarify pricing or access, and tell users exactly what happens next.",
          "Your landing page is the first user experience. Before users try the feature, they judge the clarity.",
        ],
      },
    ],
  },
  {
    slug: "how-to-launch-your-indie-project-with-no-audience",
    title: "How to Launch Your Indie Project When You Have No Audience",
    metaTitle: "How to Launch Your Indie Project With No Audience",
    metaDescription:
      "A practical launch guide for indie builders, student founders, and vibe coders who want to get early users without a big audience.",
    excerpt:
      "Launching with no audience is not a death sentence. Use clarity, repetition, useful communities, specific feedback asks, and public iteration.",
    shortAnswer:
      "If you have no audience, launch by making the project easy to understand, posting in communities where the right users already gather, asking for specific feedback, and repeating the launch from multiple angles. The first goal is not virality; it is learning who cares and what to fix.",
    category: "Launch & Growth",
    readTime: "10 min read",
    publishedAt: "June 16, 2026",
    updatedAt: "June 16, 2026",
    publishedIso: "2026-06-16",
    updatedIso: "2026-06-16",
    author: "Lokalhost Editorial",
    image: "/blog/first-100-users.jpg",
    imageAlt: "An indie project launching from a small desk into builder communities",
    audience:
      "Solo builders, student founders, indie hackers, and first-time makers preparing to launch without a big following.",
    sections: [
      {
        heading: "A quiet launch is normal",
        paragraphs: [
          "Launching with no audience feels embarrassing. You post the project, three people like it, one is your friend, one is a bot, and one is you checking if the button works.",
          "Most indie projects do not launch to a stadium. They launch to a tiny room with bad lighting and a few curious people.",
          "The goal of your first launch is not to go viral. The goal is to learn whether anyone understands what you built, who cares, and what to fix next.",
        ],
      },
      {
        heading: "Fix your launch message first",
        paragraphs: [
          "Before posting anywhere, write the simple version of your project.",
          "Use this format: I built [product] for [audience] who struggle with [problem]. It helps them [outcome] by [how it works].",
          "Example: I built Lokalhost for indie builders who struggle to get honest feedback and visibility. It helps them share projects, get roasted, and find other people shipping online.",
        ],
      },
      {
        heading: "Every launch post needs five things",
        bullets: [
          "What you built",
          "Who it is for",
          "Why you built it",
          "What people can do with it",
          "A clear link or call to action",
        ],
        paragraphs: [
          "A clear launch post beats a dramatic announcement. Do not write like you are raising a seed round if you are asking five builders to test a beta.",
        ],
      },
      {
        heading: "Do not launch only once",
        paragraphs: [
          "One of the biggest mistakes indie builders make is treating launch as a one-day event. You post once, it flops, and you declare the project dead.",
          "That is not launch. That is one post. A real launch is a campaign with different angles over several days or weeks.",
        ],
        bullets: [
          "Day 1: what you built",
          "Day 2: why you built it",
          "Day 3: demo video",
          "Day 4: problem breakdown",
          "Day 5: feature highlight",
          "Day 6: behind-the-scenes build story",
          "Day 7: what feedback changed",
        ],
      },
      {
        heading: "Find communities where your users already exist",
        paragraphs: [
          "If you have no audience, carefully borrow attention from communities. Do not spam links. Join conversations.",
          "A better post sounds like: I built this because I kept seeing this problem. I am trying to validate whether other builders experience it too. Feedback is welcome, especially on the landing page and onboarding.",
        ],
        bullets: [
          "Indie hacker communities",
          "Developer Facebook groups",
          "Reddit communities",
          "Discord servers",
          "Student tech groups",
          "Startup communities",
          "Build-in-public circles",
          "Local tech communities",
        ],
      },
      {
        heading: "Ask for specific feedback",
        paragraphs: [
          "If you say any thoughts, most people will say nothing. Specific questions make feedback easier to give.",
        ],
        bullets: [
          "Is the headline clear?",
          "Would you understand this without my explanation?",
          "What part feels confusing?",
          "Does the page feel trustworthy?",
          "What would stop you from signing up?",
          "What feature should I remove?",
        ],
      },
      {
        heading: "Turn feedback into public updates",
        paragraphs: [
          "The best launch content often comes after the first launch. When someone gives feedback, turn it into an update.",
          "Example: Someone pointed out that our roast result page was hard to share, so we added cleaner public share cards.",
          "That post shows the project is alive, thanks the community, explains a new feature, and gives people a reason to revisit.",
        ],
      },
      {
        heading: "The no-audience launch plan",
        bullets: [
          "Prepare a one-sentence explanation.",
          "Prepare screenshots and a short demo.",
          "Fix the landing page headline.",
          "Make sure the link preview looks good.",
          "Soft launch to a few trusted builders.",
          "Ask what is confusing.",
          "Post the public launch with a specific feedback request.",
          "Share what you changed after feedback.",
          "Repeat with a new angle.",
        ],
      },
    ],
  },
  {
    slug: "write-project-description-people-click",
    title: "How to Write a Project Description That People Actually Click",
    metaTitle: "Project Description Template People Actually Click",
    metaDescription:
      "Use this project description template to explain what you built, who it helps, why it matters, and why people should click.",
    excerpt:
      "Your project description is not a mini pitch deck. It is a fast explanation that helps strangers decide whether to care.",
    shortAnswer:
      "A good project description says what the product is, who it is for, what problem it solves, what users can do right now, and what kind of feedback you want. Keep it specific, human, and easy to scan.",
    category: "Indie Dev Guides",
    readTime: "7 min read",
    publishedAt: "June 16, 2026",
    updatedAt: "June 16, 2026",
    publishedIso: "2026-06-16",
    updatedIso: "2026-06-16",
    author: "Lokalhost Editorial",
    image: "/blog/launch-checklist.jpg",
    imageAlt: "A builder rewriting a project description into a clearer launch post",
    audience:
      "Builders posting projects on Lokalhost, launch communities, X, Reddit, Discord, or product directories.",
    sections: [
      {
        heading: "People do not click what they cannot understand",
        paragraphs: [
          "Most weak project descriptions fail because they try to sound impressive instead of useful.",
          "A stranger scrolling the feed is asking: what is this, why should I care, and is this worth opening?",
        ],
      },
      {
        heading: "Use the one-sentence test",
        paragraphs: [
          "Write one sentence that explains the product without hype.",
          "Template: I built [product] for [specific audience] so they can [specific outcome] without [specific pain].",
          "Example: I built a tiny invoice tracker for freelance students so they can see who paid, who owes, and what to follow up without opening a spreadsheet.",
        ],
      },
      {
        heading: "The clickable description structure",
        bullets: [
          "One plain sentence explaining the product",
          "One sentence explaining the problem",
          "Three bullets showing what users can do",
          "One honest status note",
          "One specific feedback request",
        ],
      },
      {
        heading: "Bad vs better",
        paragraphs: [
          "Bad: Excited to launch my AI-powered productivity ecosystem for modern creators.",
          "Better: I built a simple AI note sorter for students who save too many lecture screenshots. Upload messy notes, get grouped topics, and export a study checklist.",
          "The better version wins because it names the user, the problem, the action, and the outcome.",
        ],
      },
      {
        heading: "Ask for the right feedback",
        paragraphs: [
          "Do not ask for vague thoughts if you need useful answers. Tell people what to inspect.",
        ],
        bullets: [
          "Is the landing page clear?",
          "Would you use this workflow?",
          "What feels missing?",
          "What part looks untrustworthy?",
          "Does the demo explain the value fast enough?",
        ],
      },
      {
        heading: "Copy-paste template",
        paragraphs: [
          "I built [project name], a [type of product] for [audience].",
          "The problem: [specific pain point].",
          "What it does: [feature 1], [feature 2], [feature 3].",
          "It is currently [beta/prototype/live], so I am looking for feedback on [specific part].",
          "Try it here: [link].",
        ],
      },
    ],
  },
  {
    slug: "vibe-coding-is-not-the-problem",
    title: "Vibe Coding Is Not the Problem. Shipping Garbage Is.",
    metaTitle: "Vibe Coding Is Not the Problem",
    metaDescription:
      "AI can help you build faster, but it cannot take responsibility for broken auth, exposed secrets, inaccessible UI, or code nobody understands.",
    excerpt:
      "AI can speed up the build. It cannot own the product, test the flow, protect secrets, or decide whether the thing should ship.",
    shortAnswer:
      "Vibe coding is useful when AI accelerates a workflow you still verify. The problem starts when generated code reaches production without testing, security review, accessibility checks, or anyone understanding the system.",
    category: "Vibe Coding",
    readTime: "7 min read",
    publishedAt: "June 16, 2026",
    updatedAt: "June 16, 2026",
    publishedIso: "2026-06-16",
    updatedIso: "2026-06-16",
    author: "Lokalhost Editorial",
    image: "/blog/vibe-coding.jpg",
    imageAlt: "A builder choosing between a tested AI coding workflow and broken production code",
    audience:
      "AI-assisted builders, students, nontraditional developers, and experienced engineers moving faster with coding agents.",
    sections: [
      {
        heading: "Speed is not the crime",
        paragraphs: [
          "Using AI to skip repetitive work is sensible. Using AI to skip responsibility is how private keys end up in frontend bundles.",
          "You do not need to handwrite every line. You do need to understand the boundaries, data flow, failure modes, and blast radius of what you ship.",
        ],
      },
      {
        heading: "Generated code still needs ownership",
        paragraphs: [
          "A coding agent can write a component, migration, resolver, or test. It cannot decide whether your users can recover from a broken auth state at 2 AM.",
          "The builder owns the outcome. That means reading the diff, testing the flow, checking mobile layout, and knowing how to roll back.",
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
        heading: "What AI is good at",
        bullets: [
          "Scaffolding repetitive UI patterns",
          "Explaining unfamiliar code",
          "Generating test cases",
          "Finding inconsistencies",
          "Drafting migrations",
          "Writing first-pass docs",
        ],
      },
      {
        heading: "What AI is bad at unless you supervise",
        bullets: [
          "Understanding product taste",
          "Protecting secrets by default",
          "Knowing your production constraints",
          "Making tradeoffs for your specific users",
          "Saying no to a feature that should not exist",
        ],
      },
      {
        heading: "Taste still belongs to the builder",
        paragraphs: [
          "Generated software inherits the clarity of the person directing it.",
          "Vibe coding is fine. Vibe shipping without testing is where the crime starts.",
        ],
      },
    ],
  },
  {
    slug: "roast-report-landing-page-mistakes",
    title: "Roast Report: Landing Page Mistakes We Keep Seeing",
    metaTitle: "Roast Report: Common Landing Page Mistakes",
    metaDescription:
      "A Lokalhost-style field report on the landing page mistakes that make indie projects harder to understand, trust, and share.",
    excerpt:
      "A community archive format for recurring roast insights: weak headlines, vague CTAs, missing proof, tiny screenshots, and mobile layouts that fall apart.",
    shortAnswer:
      "The most common landing page mistakes are vague headlines, unclear CTAs, hidden product examples, missing trust signals, unreadable screenshots, and mobile layouts that were never tested. These are fixable before launch.",
    category: "Case Studies",
    readTime: "6 min read",
    publishedAt: "June 16, 2026",
    updatedAt: "June 16, 2026",
    publishedIso: "2026-06-16",
    updatedIso: "2026-06-16",
    author: "Lokalhost Editorial",
    image: "/blog/landing-page-roast.jpg",
    imageAlt: "An anonymized report board showing repeated website roast patterns",
    audience:
      "Builders who want practical lessons from project roasts without waiting for their own page to get cooked.",
    sections: [
      {
        heading: "Why roast reports matter",
        paragraphs: [
          "A single roast helps one builder. A pattern report helps the whole community.",
          "The goal is not to shame projects. The goal is to turn repeated mistakes into fixes other builders can apply before launch.",
        ],
      },
      {
        heading: "Mistake 1: the headline is a fog machine",
        paragraphs: [
          "If the headline could describe fifty different products, it is not doing its job.",
          "Replace abstract ambition with the concrete user outcome.",
        ],
      },
      {
        heading: "Mistake 2: the screenshot is decorative",
        paragraphs: [
          "A product screenshot should reduce doubt. If users cannot read it or understand what action is happening, it is decoration.",
        ],
      },
      {
        heading: "Mistake 3: the CTA is a shrug",
        paragraphs: [
          "Learn More is not always wrong, but it often hides what the next step is. Users should know what happens after the click.",
        ],
      },
      {
        heading: "Mistake 4: trust signals arrive too late",
        paragraphs: [
          "If the visitor has to scroll to the footer to learn whether the project is alive, you waited too long.",
        ],
        bullets: [
          "Show a real update date",
          "Show the builder or team",
          "Show a working demo",
          "Show contact and policy links",
          "Show examples of the output",
        ],
      },
      {
        heading: "The fix list",
        bullets: [
          "Rewrite the headline for a specific user and outcome.",
          "Use one main CTA above the fold.",
          "Show the product before explaining every feature.",
          "Add honest trust signals.",
          "Test the page on a real phone.",
          "Ask a stranger what the product does after five seconds.",
        ],
      },
    ],
  },
  {
    slug: "lokalhost-share-cards-update",
    title: "Lokalhost Update: Cleaner Share Cards for Roasts and Brand Analysis",
    metaTitle: "Lokalhost Share Cards Update",
    metaDescription:
      "Lokalhost now has cleaner public result cards for roast and brand analysis pages so builders can share feedback outside the feed.",
    excerpt:
      "Roast and brand analysis results now have cleaner share actions and public cards built for X, Facebook, and direct links.",
    shortAnswer:
      "Lokalhost result pages now support cleaner share actions for roast and brand analysis results. Builders can post to the feed, share a public result card to X or Facebook, or copy a direct link.",
    category: "Lokalhost Updates",
    readTime: "4 min read",
    publishedAt: "June 16, 2026",
    updatedAt: "June 16, 2026",
    publishedIso: "2026-06-16",
    updatedIso: "2026-06-16",
    author: "Lokalhost Editorial",
    image: "/blog/first-100-users.jpg",
    imageAlt: "A Lokalhost AI result card being shared to social platforms",
    audience:
      "Lokalhost users who want to share roast results, brand analysis, or product feedback outside the feed.",
    sections: [
      {
        heading: "What changed",
        paragraphs: [
          "Roast and brand analysis results are not just private outputs anymore. They now have cleaner public result cards designed for sharing outside Lokalhost.",
          "The result action is clearer too: posting to the community feed is separate from sharing the public result card.",
        ],
      },
      {
        heading: "Why this matters",
        paragraphs: [
          "Feedback gets more useful when it can travel. A founder can share a roast, ask for second opinions, or use a brand analysis as a quick public artifact while improving the project.",
        ],
      },
      {
        heading: "Available actions",
        bullets: [
          "Post the roast to the Lokalhost feed",
          "Share the result card on X",
          "Share the result card on Facebook",
          "Copy a direct public share link",
        ],
      },
      {
        heading: "What comes next",
        paragraphs: [
          "We want shared result cards to become useful artifacts: clear enough for social previews, readable enough for search, and valuable enough that builders actually want to send them to other people.",
        ],
      },
    ],
  },
];

export function getBlogArticle(slug: string | undefined) {
  return blogArticles.find((article) => article.slug === slug);
}
