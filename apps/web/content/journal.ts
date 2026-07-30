/**
 * The Anesis Journal — articles de lancement, BILINGUES (EN-UK / FR). Ton : presse économique/hôtelière
 * britannique, froid et factuel, pas un blog. Registre estate. en-GB, £. Aucun chiffre client réel,
 * aucune mention d'un autre marché. `resolveArticle(a, lang)` rend la version d'une langue.
 */
import type { Lang } from "@/lib/i18n";

type Bi = Record<Lang, string>;
type BiBody = Record<Lang, readonly string[]>;

export interface Article {
  readonly slug: string;
  readonly date: string;
  readonly readMinutes: number;
  readonly lead?: boolean;
  readonly title: Bi;
  readonly dek: Bi;
  readonly body: BiBody;
}

export interface ResolvedArticle {
  readonly slug: string;
  readonly date: string;
  readonly readMinutes: number;
  readonly lead?: boolean;
  readonly title: string;
  readonly dek: string;
  readonly body: readonly string[];
}

export const ISSUE = { volume: "Vol. I", date: "2026-08-01", label: "August 2026" };

export const ARTICLES: readonly Article[] = [
  {
    slug: "money-booking-will-never-give-back",
    date: "2026-08-01",
    readMinutes: 6,
    lead: true,
    title: {
      en: "The Money Booking.com Will Never Give Back",
      fr: "L'argent que Booking.com ne vous rendra jamais",
    },
    dek: {
      en: "A commission is not a marketing cost. It is a toll on a guest who had already found you.",
      fr: "Une commission n'est pas un coût marketing. C'est un péage sur un client qui vous avait déjà trouvé.",
    },
    body: {
      en: [
        "There is a particular kind of loss that never appears on a hotelier's ledger, because it is disguised as a cost of doing business. It is the commission paid to an online travel agency for a booking that would have arrived at the front desk regardless. The guest saw the terrace, read the reviews, pictured the fire in the drawing room — and then, a click before booking directly, was quietly re-introduced to the very hotel they had already chosen, for a fee of fifteen to twenty per cent.",
        "It helps to be precise about what is being paid for. There are two kinds of demand a platform sends a hotel. The first is genuinely new: a traveller who would never have found you otherwise, for whom a commission is a fair price. The second is demand you had already earned — a guest who knew your name, typed it into a search box, and was met at the top of the results by a paid listing standing between them and your own booking page. On the first, the platform has done its work. On the second, it has done very little, and charged the same.",
        "Most independent hotels never separate the two, and so they carry the second cost as though it were unavoidable. It is not. It is simply invisible. A commission statement shows a total; it does not show how much of that total bought demand you would have had for nothing.",
        "The mechanics are worth understanding, because they are designed to blur exactly this line. A platform bids on your own hotel's name in search advertising. It offers the guest a loyalty discount funded, in part, by you. It withholds the guest's email address, so that the relationship — the thing that would let you win the next stay directly — never becomes yours. Each of these is defensible on its own. Together, they convert a guest you had already won into a guest you must keep renting back.",
        "Consider a hotel of forty rooms with a respectable direct following. A meaningful share of its online bookings are for guests who arrived already knowing where they wanted to stay. On those, the fifteen-to-twenty per cent is not acquisition. It is leakage — money leaving a business that had already done the hard part of earning the guest.",
        "None of this is an argument for abandoning the platforms. They fill shoulder nights. They reach travellers who genuinely would not have found you. Used deliberately, they are a useful channel among several. The danger is not their existence; it is treating them as a marketing department when they are, for a large part of your bookings, a tollbooth on a road the guest was already travelling.",
        "The remedy begins with measurement, not with indignation. Before changing a single tariff or campaign, a hotel needs an honest figure: of the commission it pays, how much bought new demand, and how much simply changed the colour of money that was already its own. That figure is almost always uncomfortable, and almost always larger than the owner expects.",
        "Once it exists, the conversation changes entirely. It stops being about marketing budgets and vague ambitions to 'grow direct', and becomes a matter of recoverable revenue — a specific sum, attached to specific booking behaviour, that can be brought back with specific corrections. Rate parity restored. The direct booking path made faster than the platform's. A reason, and a channel, for the guest to return to you directly next time.",
        "That is the whole of the first gate we offer: a number, measured from a hotel's own data, that says how much of the direct channel is currently being paid to a platform to hand back. It costs nothing to know. What an owner does with it afterwards is another matter — but no one should be paying a toll they cannot see.",
      ],
      fr: [
        "Il existe une perte particulière qui n'apparaît jamais dans les comptes d'un hôtelier, parce qu'elle est déguisée en coût normal d'exploitation : la commission versée à une agence en ligne pour une réservation qui serait arrivée à la réception de toute façon. Le client a vu la terrasse, lu les avis, imaginé le feu au salon — puis, un clic avant de réserver en direct, on l'a discrètement re‑présenté à l'hôtel qu'il avait déjà choisi, moyennant quinze à vingt pour cent.",
        "Il faut être précis sur ce que l'on paie. Une plateforme envoie deux types de demande à un hôtel. La première est réellement nouvelle : un voyageur qui ne vous aurait jamais trouvé, et pour qui une commission est un prix juste. La seconde est une demande que vous aviez déjà acquise — un client qui connaissait votre nom, l'a tapé dans un moteur, et a trouvé en tête des résultats une annonce payante glissée entre lui et votre propre page de réservation. Sur la première, la plateforme a fait son travail. Sur la seconde, elle a fait très peu, et facturé autant.",
        "La plupart des hôtels indépendants ne distinguent jamais les deux, et portent donc la seconde comme si elle était inévitable. Elle ne l'est pas. Elle est simplement invisible. Un relevé de commissions montre un total ; il ne montre pas quelle part de ce total a acheté une demande que vous auriez eue gratuitement.",
        "Le mécanisme mérite d'être compris, car il est conçu pour brouiller exactement cette ligne. La plateforme enchérit sur le nom de votre hôtel en publicité. Elle offre au client une remise de fidélité financée, en partie, par vous. Elle retient l'adresse email du client, si bien que la relation — ce qui vous permettrait de gagner le prochain séjour en direct — ne devient jamais la vôtre. Chacun de ces gestes se défend isolément. Ensemble, ils transforment un client déjà gagné en un client que vous devez racheter.",
        "Prenez un hôtel de quarante chambres doté d'une clientèle directe honorable. Une part significative de ses réservations en ligne concerne des clients arrivés en sachant déjà où ils voulaient séjourner. Sur celles‑là, les quinze à vingt pour cent ne sont pas de l'acquisition. C'est une fuite — de l'argent qui quitte une entreprise ayant déjà fait le plus dur : gagner le client.",
        "Rien de tout cela ne plaide pour abandonner les plateformes. Elles remplissent les nuits creuses. Elles atteignent des voyageurs qui, vraiment, ne vous auraient pas trouvé. Utilisées à dessein, elles sont un canal utile parmi d'autres. Le danger n'est pas leur existence ; c'est de les traiter comme un service marketing alors qu'elles sont, pour une large part de vos réservations, un péage sur une route que le client empruntait déjà.",
        "Le remède commence par la mesure, pas par l'indignation. Avant de changer le moindre tarif ou la moindre campagne, un hôtel a besoin d'un chiffre honnête : sur la commission qu'il paie, combien a acheté une demande nouvelle, et combien a seulement changé la couleur d'un argent qui était déjà le sien. Ce chiffre est presque toujours inconfortable, et presque toujours plus élevé que ne le pense le propriétaire.",
        "Une fois qu'il existe, la conversation change du tout au tout. Il ne s'agit plus de budgets marketing ni d'ambitions vagues de « développer le direct », mais de revenu récupérable — une somme précise, attachée à un comportement de réservation précis, que l'on peut ramener avec des corrections précises. La parité tarifaire rétablie. Le parcours de réservation direct rendu plus rapide que celui de la plateforme. Une raison, et un canal, pour que le client revienne vers vous en direct la prochaine fois.",
        "C'est tout l'objet de la première porte que nous proposons : un chiffre, mesuré sur les propres données de l'hôtel, qui dit quelle part du canal direct est actuellement payée à une plateforme pour vous être rendue. Le connaître ne coûte rien. Ce que le propriétaire en fait ensuite est une autre affaire — mais personne ne devrait payer un péage qu'il ne voit pas.",
      ],
    },
  },
  {
    slug: "true-cost-of-a-reply-six-hours-late",
    date: "2026-08-01",
    readMinutes: 5,
    title: {
      en: "The True Cost of a Reply Sent Six Hours Late",
      fr: "Le vrai coût d'une réponse envoyée six heures trop tard",
    },
    dek: {
      en: "In hospitality, a delayed answer is not merely poor service. It is a booking, quietly withdrawn.",
      fr: "En hôtellerie, une réponse tardive n'est pas qu'un mauvais service. C'est une réservation, discrètement retirée.",
    },
    body: {
      en: [
        "A guest writes at four in the afternoon, warm with intent. By the time a considered reply arrives the following morning, the mood has cooled, a competitor has answered, and the room is sold elsewhere. Nothing dramatic has happened. A single enquiry has simply evaporated — and it will not appear in any report as a loss, because it never became a line to lose.",
        "This is the quietest leak in a hotel, and the hardest to see, precisely because it leaves no trace. A cancelled booking is recorded. An unanswered one is not. The revenue that never arrived is invisible in exactly the way an empty chair is invisible: you cannot miss what was never counted.",
        "Speed, in hospitality, is not a matter of efficiency for its own sake. It is the difference between demand captured and demand mislaid. The window in which a guest is ready to book is narrow, and it closes without a sound. A reply within minutes meets the guest while the intention is still alive. A reply the next morning meets a decision already made — usually somewhere else.",
        "The same logic governs the booking path itself. A website that takes a beat too long to load, a booking engine that asks for one detail too many, a rate that appears higher on your own page than on the platform beside it — each introduces a pause, and each pause is an invitation to leave. The guest rarely complains. They simply drift, and the drift is not recorded.",
        "Reviews follow the same clock. A thoughtful reply, promptly given, is read by the next dozen prospective guests as evidence of care. Left for a week, the same reply reads as indifference — and indifference does not convert. The reply was written either way; only its timing changed, and timing was the whole of its value.",
        "None of this is solved by working harder or by asking a small team to watch an inbox through the night. It is solved by design: by making the first response immediate, the booking path shorter than the platform's, and the acknowledgement of a guest — before, during, and after the stay — a matter of course rather than of goodwill and available hours.",
        "What makes the delayed reply worth measuring is that it is entirely recoverable, and recoverable without spending a further pound on advertising. The demand already existed; it was simply allowed to cool. Closing the gap between an enquiry and an answer, between a guest's decision and your response to it, returns bookings that were already within reach.",
        "We measure these things because they are measurable, and because they are the least glamorous and most reliable revenue a hotel can win back. A response time cut from hours to minutes. A booking path made quicker than the alternative. A review answered while it still matters. None of it is dramatic to watch. It rarely is, when the loss was never dramatic either — only constant.",
      ],
      fr: [
        "Un client écrit à seize heures, porté par l'envie. Le temps qu'une réponse soignée arrive le lendemain matin, l'élan est retombé, un concurrent a répondu, et la chambre est vendue ailleurs. Rien de spectaculaire. Une simple demande s'est évaporée — et elle n'apparaîtra dans aucun rapport comme une perte, car elle n'est jamais devenue une ligne à perdre.",
        "C'est la fuite la plus silencieuse d'un hôtel, et la plus difficile à voir, précisément parce qu'elle ne laisse aucune trace. Une réservation annulée est enregistrée. Une demande sans réponse ne l'est pas. Le revenu qui n'est jamais arrivé est invisible exactement comme une chaise vide : on ne peut regretter ce qui n'a jamais été compté.",
        "La vitesse, en hôtellerie, n'est pas une affaire d'efficacité pour elle‑même. C'est la différence entre une demande captée et une demande égarée. La fenêtre où un client est prêt à réserver est étroite, et elle se referme sans bruit. Une réponse en quelques minutes rejoint le client tant que l'intention est vivante. Une réponse le lendemain rejoint une décision déjà prise — ailleurs, le plus souvent.",
        "La même logique gouverne le parcours de réservation lui‑même. Un site qui met un instant de trop à charger, un moteur qui demande un détail de trop, un tarif qui paraît plus élevé sur votre propre page que sur la plateforme d'à côté — chacun introduit une pause, et chaque pause est une invitation à partir. Le client se plaint rarement. Il s'éloigne, simplement, et cet éloignement n'est pas consigné.",
        "Les avis suivent la même horloge. Une réponse réfléchie, donnée promptement, est lue par la douzaine de clients suivants comme une preuve de soin. Laissée une semaine, la même réponse se lit comme de l'indifférence — et l'indifférence ne convertit pas. La réponse était écrite dans les deux cas ; seul son moment a changé, et le moment faisait toute sa valeur.",
        "Rien de cela ne se règle en travaillant davantage, ni en demandant à une petite équipe de surveiller une boîte de réception toute la nuit. Cela se règle par la conception : rendre la première réponse immédiate, le parcours de réservation plus court que celui de la plateforme, et la reconnaissance d'un client — avant, pendant et après le séjour — un principe plutôt qu'une question de bonne volonté et d'heures disponibles.",
        "Ce qui rend la réponse tardive digne d'être mesurée, c'est qu'elle est entièrement récupérable, et récupérable sans dépenser une livre de plus en publicité. La demande existait déjà ; on l'a seulement laissée refroidir. Réduire l'écart entre une demande et une réponse, entre la décision d'un client et la vôtre, ramène des réservations qui étaient déjà à portée.",
        "Nous mesurons ces choses parce qu'elles sont mesurables, et parce qu'elles sont le revenu le moins spectaculaire et le plus fiable qu'un hôtel puisse regagner. Un temps de réponse ramené d'heures à minutes. Un parcours de réservation rendu plus rapide que l'alternative. Un avis traité tant qu'il compte encore. Rien de spectaculaire à regarder. Ça l'est rarement, quand la perte elle‑même n'était pas spectaculaire — seulement constante.",
      ],
    },
  },
  {
    slug: "what-an-underwriter-can-teach-a-hotelier",
    date: "2026-08-01",
    readMinutes: 6,
    title: {
      en: "What an Underwriter Can Teach a Hotelier",
      fr: "Ce qu'un souscripteur peut apprendre à un hôtelier",
    },
    dek: {
      en: "The discipline is old and unglamorous: measure the risk, price it, and stand behind the figure.",
      fr: "La discipline est ancienne et sans éclat : mesurer le risque, le chiffrer, et répondre du chiffre.",
    },
    body: {
      en: [
        "Underwriting is not a fashionable word. It belongs to the quiet end of finance — to the people who, before anyone is promised anything, put a number on what could go wrong and what could be recovered. It is a discipline of measurement before persuasion, and it translates unexpectedly well to a hotel.",
        "An insurer faced with a risk does not begin with enthusiasm. They begin with data: the history, the exposure, the realistic range of outcomes. Only once the risk is priced do they decide whether to take it on at all — and if they do, they stand behind that price. Their credibility rests on the figure being honest, not flattering.",
        "A hotel's lost revenue can be read the same way. Before anyone speaks of campaigns or content, there is a prior question: where is the money leaking, in pounds, and how much of it can honestly be recovered? Not how much might be won in the best of all seasons, but how much a sober reading of the hotel's own data supports.",
        "This inversion — figure first, action second — changes the entire relationship between a hotel and the people it pays. A marketing agency begins with activity: campaigns launched, posts published, impressions bought. Activity is what it sells, and activity is billed whether or not it works. An underwriter begins with a number, and treats the activity as merely the means of delivering it.",
        "It also changes what honesty costs. If your fee depends on activity, there is never a reason to tell a client they don't need you. If your fee depends on a measured result, there is every reason — because taking on a hotel with little to recover means being paid little, and being seen to fail at it. The discipline makes candour the profitable choice, which is the only kind of candour a business can be relied upon to keep.",
        "There is a second habit worth borrowing: the baseline. An insurer measures a claim against what would have happened anyway. A hotel should measure a recovery the same way — against what its own direct channel would have done, left alone, in that same season. A simple before-and-after flatters everyone; a good year for the whole market can be mistaken for a job well done. Measured against a proper baseline, only the part you actually caused is counted as yours.",
        "None of this requires a hotelier to become a financier. It requires only that the people they pay adopt the underwriter's posture: measure before promising, price the recoverable loss soberly, tie the reward to the result, and check that result against what would have happened regardless. Four habits, none of them dramatic, all of them rare in the businesses that usually sell to hotels.",
        "It is, admittedly, a slower way to begin. It refuses more work than it takes. But for an owner weary of being sold hours and impressions, there is a certain relief in being handed a figure instead of a pitch — and in dealing with a firm that has agreed, in advance, to be judged on whether the figure was true.",
      ],
      fr: [
        "« Souscription » n'est pas un mot à la mode. Il appartient au versant discret de la finance — à ceux qui, avant qu'on ne promette quoi que ce soit, chiffrent ce qui pourrait mal tourner et ce qui pourrait être récupéré. C'est une discipline de la mesure avant la persuasion, et elle se transpose étonnamment bien à un hôtel.",
        "Un assureur face à un risque ne commence pas par l'enthousiasme. Il commence par les données : l'historique, l'exposition, l'éventail réaliste des issues. Ce n'est qu'une fois le risque chiffré qu'il décide de le prendre en charge — et s'il le prend, il répond de ce prix. Sa crédibilité tient à ce que le chiffre soit honnête, pas flatteur.",
        "Le revenu perdu d'un hôtel se lit de la même façon. Avant de parler de campagnes ou de contenu, il y a une question préalable : où l'argent fuit‑il, en livres, et quelle part peut honnêtement être récupérée ? Non pas ce que l'on pourrait gagner dans la meilleure des saisons, mais ce qu'une lecture sobre des propres données de l'hôtel permet d'affirmer.",
        "Cette inversion — le chiffre d'abord, l'action ensuite — change toute la relation entre un hôtel et ceux qu'il paie. Une agence marketing part de l'activité : campagnes lancées, publications, impressions achetées. L'activité, c'est ce qu'elle vend, et l'activité est facturée qu'elle marche ou non. Un souscripteur part d'un chiffre, et ne voit dans l'activité que le moyen de le livrer.",
        "Cela change aussi ce que coûte l'honnêteté. Si vos honoraires dépendent de l'activité, il n'y a jamais de raison de dire à un client qu'il n'a pas besoin de vous. S'ils dépendent d'un résultat mesuré, il y a toutes les raisons — car prendre un hôtel où il y a peu à récupérer, c'est être peu payé, et échouer au vu de tous. La discipline fait de la franchise le choix rentable, la seule franchise sur laquelle une entreprise puisse tenir.",
        "Une seconde habitude mérite d'être empruntée : la ligne de base. Un assureur mesure un sinistre par rapport à ce qui serait arrivé de toute façon. Un hôtel devrait mesurer une récupération de la même manière — par rapport à ce que son propre canal direct aurait fait, laissé seul, à la même saison. Un simple avant‑après flatte tout le monde ; une bonne année pour tout le marché peut passer pour un travail bien fait. Mesurée contre une vraie ligne de base, seule la part que vous avez réellement causée compte comme la vôtre.",
        "Rien de cela n'exige qu'un hôtelier devienne financier. Cela exige seulement que ceux qu'il paie adoptent la posture du souscripteur : mesurer avant de promettre, chiffrer sobrement la perte récupérable, lier la rémunération au résultat, et vérifier ce résultat contre ce qui serait arrivé de toute façon. Quatre habitudes, aucune spectaculaire, toutes rares chez ceux qui vendent d'ordinaire aux hôtels.",
        "C'est, il est vrai, une manière plus lente de commencer. Elle refuse plus de mandats qu'elle n'en prend. Mais pour un propriétaire lassé qu'on lui vende des heures et des impressions, il y a un certain soulagement à recevoir un chiffre plutôt qu'un argumentaire — et à traiter avec une firme qui a accepté, d'avance, d'être jugée sur la véracité de ce chiffre.",
      ],
    },
  },
  {
    slug: "why-we-turn-away-more-than-we-take",
    date: "2026-08-01",
    readMinutes: 5,
    title: {
      en: "Why We Turn Away More Hotels Than We Take",
      fr: "Pourquoi nous refusons plus d'hôtels que nous n'en prenons",
    },
    dek: {
      en: "A mandate we accept is one we are prepared to be held financially responsible for. Most are not.",
      fr: "Un mandat que nous acceptons est un mandat dont nous acceptons d'être financièrement responsables. La plupart ne le sont pas.",
    },
    body: {
      en: [
        "It is an unusual thing to advertise, but we decline the majority of the hotels we assess. This is not exclusivity for its own sake, nor a marketing posture dressed up as principle. It is a direct consequence of how the firm is built, and it would be dishonest to pretend otherwise.",
        "Because our reward is tied to the revenue we actually recover, a mandate only makes sense where there is genuine, measurable loss to recover — and enough of it to justify the work for both parties. Where the assessment finds a hotel already running its direct channel well, there is little left to bring back. Taking the engagement anyway would mean charging for a result we could not honestly deliver.",
        "So we say so, in the same conversation, and we stop there. There is no second call, no softened version of the same pitch a fortnight later. A hotel that does not need us is told plainly that it does not need us — and, more often than the owner expects, that is the most valuable thing we can offer them, because it is the one thing no one selling marketing will ever say.",
        "This has a cost to us, and it is meant to. A firm paid on activity can afford to take every client and let the weakest engagements quietly underperform. A firm paid on results cannot. Each mandate we accept ties a part of our income to whether we actually move the number, which means every mandate we should not have taken is a loss we carry ourselves. The discipline of refusal is simply that logic, applied honestly at the door rather than regretted later.",
        "It also keeps the firm small on purpose. We would rather hold a handful of mandates we believe in than a full book we cannot stand behind. A smaller book means each hotel is genuinely known — its season, its channel mix, its particular leak — rather than processed. It means the person who reads your first enquiry is the person accountable for your result.",
        "There is a discipline in the refusal that a hotelier can feel, and it changes how the eventual yes is heard. When a firm has visibly declined others, its agreement is not flattery; it is a judgement it has staked its own income on. A hotelier who has been told, plainly, that they qualify — and told just as plainly what would happen if the recovery failed — is being offered something rarer than enthusiasm. They are being offered accountability.",
        "So the free assessment is not a funnel dressed up as generosity. It is a genuine filter, applied in both directions: it tells the hotel whether there is enough to recover, and it tells us whether we can honestly take the work. Most often, on one side or the other, the answer is no — and saying it quickly, before anyone has spent anything, is the whole point.",
        "The hotels we do take on are, by design, the ones where the number is real and the recovery is ours to be judged on. That is a narrower business than most. It is also the only kind of business a firm can build if it intends to be paid on the truth.",
      ],
      fr: [
        "C'est une chose inhabituelle à afficher, mais nous refusons la majorité des hôtels que nous évaluons. Ce n'est pas de l'exclusivité pour elle‑même, ni une posture marketing déguisée en principe. C'est une conséquence directe de la façon dont la firme est construite, et il serait malhonnête de prétendre le contraire.",
        "Parce que notre rémunération est liée au revenu que nous récupérons réellement, un mandat n'a de sens que là où il existe une perte réelle et mesurable à récupérer — et assez pour justifier le travail des deux côtés. Lorsque l'évaluation trouve un hôtel qui gère déjà bien son canal direct, il reste peu à ramener. Prendre le mandat malgré tout, ce serait facturer un résultat que nous ne pourrions honnêtement livrer.",
        "Alors nous le disons, dans la même conversation, et nous nous arrêtons là. Pas de deuxième appel, pas de version adoucie du même argumentaire quinze jours plus tard. À un hôtel qui n'a pas besoin de nous, on dit franchement qu'il n'a pas besoin de nous — et, plus souvent que le propriétaire ne l'imagine, c'est ce que nous pouvons lui offrir de plus précieux, car c'est la seule chose que personne, vendant du marketing, ne dira jamais.",
        "Cela a un coût pour nous, et c'est voulu. Une firme payée à l'activité peut se permettre de prendre tous les clients et de laisser les mandats les plus faibles sous‑performer en silence. Une firme payée au résultat ne le peut pas. Chaque mandat accepté lie une part de notre revenu au fait de bouger réellement le chiffre, ce qui signifie que chaque mandat qu'il ne fallait pas prendre est une perte que nous portons nous‑mêmes. La discipline du refus n'est que cette logique, appliquée honnêtement à la porte plutôt que regrettée ensuite.",
        "Cela garde aussi la firme petite, volontairement. Nous préférons tenir une poignée de mandats auxquels nous croyons plutôt qu'un carnet plein dont nous ne pourrions répondre. Un carnet plus restreint, c'est chaque hôtel réellement connu — sa saison, son mix de canaux, sa fuite particulière — plutôt que traité en série. C'est la personne qui lit votre première demande qui est responsable de votre résultat.",
        "Il y a dans le refus une discipline qu'un hôtelier ressent, et elle change la façon dont le oui finit par être entendu. Quand une firme a visiblement décliné d'autres dossiers, son accord n'est pas une flatterie ; c'est un jugement sur lequel elle a engagé son propre revenu. Un hôtelier à qui l'on a dit, franchement, qu'il est éligible — et dit tout aussi franchement ce qui se passerait si la récupération échouait — se voit offrir quelque chose de plus rare que l'enthousiasme. On lui offre une responsabilité.",
        "L'évaluation gratuite n'est donc pas un entonnoir déguisé en générosité. C'est un filtre véritable, appliqué dans les deux sens : il dit à l'hôtel s'il y a assez à récupérer, et il nous dit si nous pouvons honnêtement prendre le travail. Le plus souvent, d'un côté ou de l'autre, la réponse est non — et le dire vite, avant que quiconque n'ait dépensé quoi que ce soit, est tout l'intérêt.",
        "Les hôtels que nous prenons sont, par conception, ceux où le chiffre est réel et où la récupération est nôtre à défendre. C'est une activité plus étroite que la plupart. C'est aussi la seule qu'une firme puisse bâtir si elle entend être payée sur la vérité.",
      ],
    },
  },
];

export const resolveArticle = (a: Article, lang: Lang): ResolvedArticle => ({
  slug: a.slug,
  date: a.date,
  readMinutes: a.readMinutes,
  lead: a.lead,
  title: a.title[lang],
  dek: a.dek[lang],
  body: a.body[lang],
});

export const bySlug = (slug: string): Article | undefined => ARTICLES.find((a) => a.slug === slug);
