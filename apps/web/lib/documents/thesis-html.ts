/**
 * Générateur B6 — rend une Thèse d'Acquisition (ThesisDocument, données réelles) en document HTML
 * premium, autonome, servi par l'app. Vrai logo (/logo.png) + Pinyon (/fonts/pinyon.woff2), zéro
 * contrainte CSP. Imprimable en PDF (window.print). Fonction PURE : ne recalcule aucun chiffre.
 */
import type { Money } from "@anesis/core";
import type { ThesisDocument } from "@anesis/planning";

const PILLAR_LABEL: Record<string, string> = {
  speed: "Speed &amp; conversion",
  reviews: "Reviews &amp; reputation",
  ota: "OTA commission &amp; parity",
  retargeting: "Retargeting",
  social: "Social presence",
};

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pounds = (m: Money): string => `£${Math.round(m.pence / 100).toLocaleString("en-GB")}`;
const pillarLabel = (p: string): string => PILLAR_LABEL[p] ?? esc(p);
const FORMULA_LABEL: Record<string, string> = { growth: "Growth", domination: "Domination" };

export interface ThesisRenderOptions {
  /** Marque le document comme spécimen illustratif (données fictives). */
  readonly illustrative?: boolean;
  /** Date d'édition affichée (défaut : aujourd'hui, en-GB). */
  readonly dateLabel?: string;
}

export function renderThesisHtml(doc: ThesisDocument, opts: ThesisRenderOptions = {}): string {
  const dateLabel =
    opts.dateLabel ?? new Date(doc.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const region = doc.region ? `${esc(doc.region)} · United Kingdom` : "United Kingdom";

  const lines = doc.lines
    .map(
      (l) => `
      <tr>
        <td><span class="lname">${pillarLabel(l.pillar)}</span><span class="lcause">${esc(l.rootCause)}</span></td>
        <td class="n leak">${pounds(l.pricedAnnual)}</td>
        <td class="n good">${l.recoverableAnnual ? pounds(l.recoverableAnnual) : "—"}</td>
      </tr>
      <tr class="detail"><td colspan="3"><span class="dk">How we measure</span> ${esc(l.measurement)} &nbsp;·&nbsp; <span class="dk">What we do</span> ${esc(l.action)}</td></tr>`,
    )
    .join("");

  const plan = doc.ninetyDayPlan
    .map(
      (p) => `
      <div class="phase"><div class="pw">${esc(p.weeks)}<small>${esc(p.phase)}</small></div><p>${esc(p.focus)}</p></div>`,
    )
    .join("");

  const terms = doc.terms
    ? `
      <div class="terms">
        <h3>Proposed engagement · ${FORMULA_LABEL[doc.terms.formula] ?? esc(doc.terms.formula)}</h3>
        <div class="tgrid">
          <div class="ti"><div class="k">Formula</div><div class="v">${FORMULA_LABEL[doc.terms.formula] ?? esc(doc.terms.formula)}</div></div>
          <div class="ti"><div class="k">Term</div><div class="v">${doc.terms.termMonths} months</div></div>
          <div class="ti"><div class="k">Monthly</div><div class="v">${pounds(doc.terms.monthlySubscription)}</div></div>
          <div class="ti"><div class="k">Incentive at term end</div><div class="v">${Math.round(doc.terms.incentiveRate * 100)}%</div></div>
        </div>
        <p class="fine">The incentive follows the term (15% on 6 months, 10% on 12), not the formula, and applies to the direct revenue actually recovered. These terms are a proposal and conditional; nothing here is a signed mandate or a request for payment.</p>
      </div>`
    : `<p class="fine">Terms to be proposed once the recovery scope is agreed.</p>`;

  const illus = opts.illustrative
    ? `<p class="illus"><span class="badge">Illustrative specimen</span> Fictional property &amp; figures, for demonstration only.</p>`
    : "";

  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Acquisition Thesis — ${esc(doc.propertyName)}</title>
<style>
  :root{--forest-950:#122019;--forest-900:#1b3225;--forest-800:#2a4a37;--gold:#b1934f;--gold-light:#d9bd82;--gold-deep:#8a6c34;--paper:#fff;--beige:#f3efe4;--ink:#25311f;--ink-soft:#59634f;--muted:#95998a;--line:#ece8dc;--line-2:#e0dccd;--leak:#a35a44;--good:#4f7d5f;--serif:'Cormorant Garamond',Georgia,serif;--sans:'Inter',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
  @font-face{font-family:'Pinyon Script';font-style:normal;font-weight:400;src:url('/fonts/pinyon.woff2') format('woff2')}
  *{box-sizing:border-box}
  body{margin:0;background:#e9e7dd;font-family:var(--sans);color:var(--ink);-webkit-font-smoothing:antialiased;padding:44px 16px}
  .doc{max-width:860px;margin:0 auto}
  .sheet{background:var(--paper);border:1px solid var(--line);box-shadow:0 24px 60px -30px rgba(20,32,22,.38);border-radius:2px;margin:0 auto 34px;overflow:hidden}
  .pad{padding:60px 68px 68px}
  @media(max-width:640px){.pad{padding:34px 24px 40px}}
  .cover{background:radial-gradient(130% 100% at 50% -20%,rgba(177,147,79,.18),transparent 55%),linear-gradient(165deg,#1e3729,var(--forest-950) 72%);color:#e9e2d2;padding:76px 60px 60px;text-align:center}
  .cover img{width:96px;height:96px;object-fit:contain;filter:brightness(0) invert(1);opacity:.96;margin:0 auto 22px;display:block}
  .cover .wm{font-family:'Pinyon Script',cursive;font-size:52px;color:#fff;line-height:1}
  .cover .firm{font-size:8.5px;letter-spacing:.44em;text-transform:uppercase;color:var(--gold-light);margin-top:14px}
  .cover .divider{width:52px;height:1px;background:var(--gold);margin:34px auto;opacity:.65}
  .cover .doctype{font-size:10px;letter-spacing:.48em;text-transform:uppercase;color:#b9c2ae}
  .cover .subject{font-family:var(--serif);font-size:42px;color:#fff;margin-top:16px;font-weight:500;line-height:1.06}
  .cover .meta{font-size:11.5px;color:#aeb8a4;margin-top:12px}
  .cover .score{display:inline-flex;flex-direction:column;align-items:center;gap:6px;margin-top:38px}
  .cover .score .big{font-family:var(--serif);font-size:72px;color:#fff;line-height:1;font-weight:400}
  .cover .score .lab{font-size:8.5px;letter-spacing:.34em;text-transform:uppercase;color:var(--gold-light);border-top:1px solid rgba(217,189,130,.4);padding-top:10px}
  .cover .prepared{margin-top:34px;font-size:10.5px;color:#9aa593}
  h2{font-family:var(--serif);font-weight:500;color:var(--forest-900);margin:0;font-size:30px;letter-spacing:-.01em}
  h3{font-family:var(--serif);font-weight:500;margin:0}
  .eyebrow{font-family:var(--sans);font-size:9px;letter-spacing:.32em;text-transform:uppercase;color:var(--gold-deep);font-weight:600}
  .lede{font-family:var(--serif);font-size:21px;line-height:1.5;color:var(--ink-soft);margin:12px 0 0}
  p{line-height:1.7;color:var(--ink-soft);font-size:13.5px;margin:0 0 13px}
  strong{color:var(--forest-900);font-weight:600}
  .stats{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line-2);margin:28px 0}
  .stat{padding:20px 22px 20px 0;border-right:1px solid var(--line)}
  .stat:last-child{border-right:0}
  @media(max-width:640px){.stats{grid-template-columns:1fr}.stat{border-right:0;border-bottom:1px solid var(--line)}}
  .stat .k{font-size:8.5px;letter-spacing:.24em;text-transform:uppercase;color:var(--muted);font-weight:600}
  .stat .v{font-family:var(--serif);font-size:36px;font-weight:500;line-height:1;margin-top:9px;color:var(--forest-900)}
  .stat .v.leak{color:var(--leak)}.stat .v.good{color:var(--good)}
  .sec-h{margin:36px 0 18px}.sec-h .eyebrow{display:block;margin-bottom:9px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{font-family:var(--sans);font-size:8.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);text-align:left;padding:0 12px 12px;border-bottom:1px solid var(--forest-900);font-weight:600}
  th.n,td.n{text-align:right;font-variant-numeric:tabular-nums}
  td{padding:14px 12px;color:var(--ink-soft);vertical-align:top}
  td.leak{color:var(--leak);font-weight:600}td.good{color:var(--good);font-weight:600}
  .lname{font-family:var(--serif);font-size:17px;color:var(--forest-900);font-weight:500;display:block}
  .lcause{font-size:11.5px;color:var(--muted);margin-top:3px;display:block;line-height:1.5;max-width:46ch}
  tr.detail td{padding-top:0;padding-bottom:16px;border-bottom:1px solid var(--line);font-size:11.5px;color:var(--ink-soft);line-height:1.6}
  .dk{font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold-deep);font-weight:700}
  .tot{display:flex;justify-content:space-between;border-top:2px solid var(--line-2);padding-top:16px;margin-top:6px}
  .tot .a{font-family:var(--serif);font-size:16px;color:var(--forest-900)}
  .phase{display:grid;grid-template-columns:130px 1fr;gap:18px;padding:16px 0;border-top:1px solid var(--line)}
  .phase .pw{font-family:var(--serif);font-size:16px;color:var(--gold-deep);font-weight:600}
  .phase .pw small{display:block;font-family:var(--sans);font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-top:3px}
  .terms{background:linear-gradient(165deg,#1e3729,var(--forest-950) 78%);color:#e9e3d4;border-radius:7px;padding:32px 34px;margin-top:10px}
  .terms h3{color:#fff;font-size:24px}
  .tgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px 30px;margin:22px 0 0}
  @media(max-width:640px){.tgrid{grid-template-columns:1fr}}
  .ti{border-top:1px solid rgba(217,189,130,.3);padding-top:11px}
  .ti .k{font-size:8.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--gold-light);font-weight:600}
  .ti .v{font-family:var(--serif);font-size:24px;color:#fff;margin-top:4px;font-weight:500;font-variant-numeric:tabular-nums}
  .fine{font-size:10px;color:#a7b19c;margin-top:20px;line-height:1.6}
  .sign{display:flex;align-items:center;gap:16px;margin-top:30px}
  .sign img{width:44px;height:44px;object-fit:contain}
  .sign b{font-family:var(--serif);font-size:19px;color:var(--forest-900);font-weight:500}
  .illus{margin-top:26px;font-size:10.5px;color:var(--muted)}
  .badge{display:inline-block;border:1px solid #e2d3ad;color:#8a6c34;font-size:8px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;padding:4px 10px;border-radius:4px;margin-right:8px}
  .foot{border-top:1px solid var(--line);padding:16px 68px;font-size:8.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);display:flex;justify-content:space-between}
  @media(max-width:640px){.foot{padding:14px 24px}}
  .pdfbtn{position:fixed;right:24px;bottom:24px;z-index:99;background:var(--forest-900);color:#f3efe4;border:1px solid rgba(177,147,79,.7);border-radius:30px;padding:13px 24px;font-family:var(--sans);font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;cursor:pointer;box-shadow:0 12px 30px -10px rgba(20,32,22,.5)}
  @media print{body{background:#fff;padding:0}.sheet{box-shadow:none;border:0;margin:0}.noprint{display:none!important}}
</style></head><body>
<button id="pdf" class="pdfbtn noprint">↓ Download PDF</button>
<div class="doc">
  <section class="sheet">
    <div class="cover">
      <img src="/logo.png" alt="Anesis Acquisition">
      <div class="wm">Anesis Acquisition</div>
      <div class="firm">Hospitality Underwriting Firm · United Kingdom</div>
      <div class="divider"></div>
      <div class="doctype">The Acquisition Thesis</div>
      <div class="subject">${esc(doc.propertyName)}</div>
      <div class="meta">${region}</div>
      <div class="score"><span class="big">${doc.leakIndex}<span style="font-size:24px;color:var(--gold-light)">/100</span></span><span class="lab">Anesis Revenue Leak Index</span></div>
      <div class="prepared">Prepared for the owners of ${esc(doc.propertyName)} · ${esc(dateLabel)}</div>
    </div>
  </section>

  <section class="sheet"><div class="pad">
    <div class="sec-h" style="margin-top:0"><span class="eyebrow">Executive summary</span><h2>What you are losing — and what we can recover.</h2></div>
    <p class="lede">We have priced <strong>${pounds(doc.pricedAnnualTotal)}</strong> of annual direct-revenue leak, of which we conservatively judge <strong>${pounds(doc.recoverableAnnualTotal)}</strong> to be recoverable. Every figure below is measured from your own data, not assumed.</p>
    <div class="stats">
      <div class="stat"><div class="k">Priced annual leak</div><div class="v leak">${pounds(doc.pricedAnnualTotal)}</div></div>
      <div class="stat"><div class="k">Recoverable / year</div><div class="v good">${pounds(doc.recoverableAnnualTotal)}</div></div>
      <div class="stat"><div class="k">Leak Index</div><div class="v">${doc.leakIndex}<span style="font-size:17px;color:var(--muted)">/100</span></div></div>
    </div>

    <div class="sec-h"><span class="eyebrow">Where the money leaks · line by line</span></div>
    <table><thead><tr><th>Pillar &amp; root cause</th><th class="n">Priced / yr</th><th class="n">Recoverable / yr</th></tr></thead>
      <tbody>${lines}</tbody></table>
    <div class="tot"><span class="a">Total</span><span><span class="a" style="color:var(--leak)">${pounds(doc.pricedAnnualTotal)}</span> &nbsp; <span class="a" style="color:var(--good)">${pounds(doc.recoverableAnnualTotal)}</span></span></div>

    <div class="sec-h"><span class="eyebrow">The 90-day plan</span></div>
    ${plan}

    <div class="sec-h"><span class="eyebrow">Proposed terms</span></div>
    ${terms}

    <div class="sign"><img src="/logo.png" alt=""><div><b>Cecilia Angoran</b><br><span style="font-size:11px;color:var(--muted)">Founder · Anesis Acquisition · cecilia@anesisacquisition.com</span></div></div>
    ${illus}
  </div>
  <div class="foot"><span>Anesis Acquisition · United Kingdom</span><span>Private &amp; Confidential</span></div>
  </section>
</div>
<script>document.getElementById('pdf').addEventListener('click',function(){window.print();});</script>
</body></html>`;
}
