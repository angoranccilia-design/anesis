/**
 * The Anesis Journal — articles de lancement. Ton : presse économique/hôtelière britannique, pas
 * un blog (brief §3.A). Registre estate/country-club. en-GB, £, jamais « AI » ni construction bannie.
 * Contenu structuré (versionné) ; pourra passer en MDX plus tard sans changer le rendu.
 */
export interface Article {
  readonly slug: string;
  readonly title: string;
  readonly dek: string; // chapô
  readonly date: string; // ISO
  readonly readMinutes: number;
  readonly lead?: boolean;
  readonly body: readonly string[];
}

export const ISSUE = { volume: "Vol. I", date: "2026-08-01", label: "August 2026" };

export const ARTICLES: readonly Article[] = [
  {
    slug: "money-booking-will-never-give-back",
    title: "The Money Booking.com Will Never Give Back",
    dek: "A commission is not a marketing cost. It is a toll on a guest who had already found you.",
    date: "2026-08-01",
    readMinutes: 6,
    lead: true,
    body: [
      "There is a particular kind of loss that never appears on a hotelier’s ledger, because it is disguised as a cost of doing business. It is the commission paid to an online travel agency for a booking that would have arrived at the front desk regardless. The guest saw the terrace on Instagram, read the reviews, pictured the fire in the drawing room — and then, a click before the direct booking, was quietly re-introduced to the very hotel they had already chosen, for a fee of fifteen to twenty per cent.",
      "Booking.com is not a villain in this story. It is an efficient marketplace doing precisely what it was built to do. The difficulty is that a great many independent hotels have come to treat that marketplace as their marketing department, when in truth it is a tollbooth positioned on a road the guest was already travelling.",
      "An underwriter would look at this and ask a blunt question: of the bookings you pay commission on, how many did you actually acquire, and how many did you merely rent back? The honest answer, for a hotel of character with a loyal following, is uncomfortable. A meaningful share of that spend buys nothing — it simply changes the colour of money that was already yours.",
      "None of this argues for abandoning the platforms. They fill shoulder nights and reach travellers who genuinely would not have found you. It argues, instead, for measuring the difference — for putting a figure, in pounds, on the demand you are paying to recover rather than to create. Once that figure is on the table, the conversation stops being about marketing budgets and starts being about recoverable revenue.",
      "That is the whole of our first gate: a number, measured from your own data, that tells you how much of your direct channel you are currently paying a platform to hand back to you. It costs nothing to know. What you do with it is another matter.",
    ],
  },
  {
    slug: "true-cost-of-a-reply-six-hours-late",
    title: "The True Cost of a Reply Sent Six Hours Late",
    dek: "In hospitality, a delayed answer is not merely poor service. It is a booking, quietly withdrawn.",
    date: "2026-08-01",
    readMinutes: 5,
    body: [
      "A guest writes at four in the afternoon, warm with intent. By the time a considered reply arrives the following morning, the mood has cooled, a competitor has answered, and the room is sold elsewhere. Nothing dramatic has happened. A single enquiry has simply evaporated — and it will not appear in any report as a loss, because it never became a line to lose.",
      "Multiply that by a season, and the sum is no longer trivial. Speed, in hospitality, is not a matter of efficiency for its own sake; it is the difference between demand captured and demand mislaid. The window in which a guest is ready to book is narrow, and it closes quietly.",
      "The same is true of a review left unanswered. A thoughtful reply, promptly given, is read by the next dozen prospective guests as evidence of care. Left for six hours, it reads as indifference — and indifference does not convert.",
      "We measure these things because they are measurable, and because they are recoverable. A response time cut from hours to minutes, a review answered while it still matters: neither requires more advertising spend. Both return direct bookings that were already within reach, and merely allowed to drift.",
    ],
  },
  {
    slug: "what-an-underwriter-can-teach-a-hotelier",
    title: "What an Underwriter Can Teach a Hotelier",
    dek: "The discipline is old and unglamorous: measure the risk, price it, and stand behind the figure.",
    date: "2026-08-01",
    readMinutes: 6,
    body: [
      "Underwriting is not a fashionable word. It belongs to the quiet end of finance — to the people who, before anyone is promised anything, put a number on what could go wrong and what could be recovered. It is a discipline of measurement before persuasion, and it translates unexpectedly well to a hotel.",
      "A marketing agency begins with activity: campaigns, posts, impressions. An underwriter begins with a figure. Where is the revenue leaking, in pounds, and how much of it can honestly be recovered? Only once that is answered does anyone speak of what to do about it.",
      "This inversion changes the relationship entirely. It means telling a prospective client, on occasion, that there is not enough recoverable loss to justify the engagement — and meaning it. It means tying reward to what is actually returned to the direct channel, rather than to how much is spent chasing it.",
      "It is, admittedly, a slower way to begin. It refuses more work than it takes. But for a hotel of character, weary of being sold hours and impressions, there is a certain relief in being handed a figure instead of a pitch — and in dealing with a firm prepared to be held to it.",
    ],
  },
  {
    slug: "why-we-turn-away-more-than-we-take",
    title: "Why We Turn Away More Hotels Than We Take",
    dek: "A mandate we accept is one we are prepared to be held financially responsible for. Most are not.",
    date: "2026-08-01",
    readMinutes: 5,
    body: [
      "It is an unusual thing to advertise, but we decline the majority of the hotels we assess. This is not exclusivity for its own sake, nor a marketing posture. It is a direct consequence of how the firm is built.",
      "Because our reward is tied to the revenue we actually recover, a mandate only makes sense where there is genuine, measurable loss to recover — and enough of it to justify the work for both parties. Where the assessment finds a hotel already running its direct channel well, we say so, and we stop. There is no honest engagement to be had.",
      "There is a discipline in the refusal. It keeps the firm small, and it keeps every mandate one we believe in. A hotelier who has been told, plainly, that they do not need us tends to remember it — and to return when circumstances change.",
      "So the free assessment is not a funnel dressed up as generosity. It is a genuine filter, applied in both directions. Most often, the most valuable thing we can offer is a clear-eyed no.",
    ],
  },
];

export const bySlug = (slug: string): Article | undefined => ARTICLES.find((a) => a.slug === slug);
