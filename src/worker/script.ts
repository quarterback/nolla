// Scripted answers for dev, when no model is set up. Four calls from the
// design canvas, matched by keyword, and a routed fallback for anything else.
//
// PLACEHOLDER: every answer here came from the design canvas, where an
// assistant wrote it as placeholder text. It stays placeholder until the owner
// approves it (EDITORIAL.md). The Worker marks it so the page can say so.

import type { Answer, ManagerChecks, SortResult } from '../shared/desk-schemas';

interface Scripted {
  placeholder: true;
  match: RegExp;
  sort: SortResult;
  answer: Answer;
}

const deposit: Scripted = {
  placeholder: true,
  match: /deposit|landlord|carpet/i,
  sort: { sort: 'both', category: 'Housing', place: 'Oregon', code: 'HSG 4.21', path: ['Housing', 'Renting', 'Deposits', 'Deductions for wear'] },
  answer: {
    short: 'Usually no. Oregon law bars deductions for ordinary wear and tear. A landlord who keeps a deposit wrongly can owe twice the amount.',
    known: [
      { text: 'A landlord can deduct for damage beyond normal use, such as stains, burns, tears or pet damage. Carpet worn thin from walking counts as normal use.', source: 1 },
      { text: 'Carpet cleaning can be charged when two things are true: the landlord machine cleaned the carpet before you moved in, and your written lease says cleaning is charged in every case.', source: 1 },
      { text: 'The landlord has 31 days after you move out to send a written list of deductions and return the rest.', source: 1 },
    ],
    changes_if: ['Your lease charges for carpet cleaning in every case.', 'The carpet has stains, burns or tears.', '31 days have passed with no written list.'],
    desks: [
      { name: 'Community Alliance of Tenants', what: 'Statewide renters\' rights hotline', ask: 'Does carpet wear count as normal use?', cost: 'Free', bring: 'Lease, move out photos', url: 'https://www.oregoncat.org' },
      { name: 'Small claims court', what: 'Where deposit disputes usually end up if a letter does not work.', ask: 'How to file for a kept deposit', cost: 'A filing fee, listed on your county court website', bring: 'The lease, photos and any letters', url: '' },
    ],
    ask_someone: 'Do you know anyone who has disputed a deposit? Ask them what they sent and what happened.',
    question_back: {
      text: 'Did you get a written list of deductions?',
      choices: [
        { label: 'Yes', next: 'Compare each deduction to the rules above. For any that look like normal wear, send the landlord a short letter asking for that amount back within 10 days. Keep a copy.' },
        { label: 'No', next: 'Write to the landlord asking for the full deposit, and say no written list arrived within 31 days. The tenants hotline can check your letter.' },
        { label: 'Not sure', next: 'Check your mail and email from the landlord since move out. The list has to be in writing.' },
      ],
    },
    sources: [
      { title: 'ORS 90.300, Security deposits', site: 'oregon.public.law', url: 'https://oregon.public.law/statutes/ors_90.300' },
      { title: 'Community Alliance of Tenants', site: 'oregonlawhelp.org', url: 'https://oregonlawhelp.org/referrals/community-alliance-tenants' },
    ],
  },
};

const toilet: Scripted = {
  placeholder: true,
  match: /toilet|flush/i,
  sort: { sort: 'desk', category: 'Home repair', place: '', code: 'HOM 2.3', path: ['Home repair', 'Plumbing', 'Toilets'] },
  answer: {
    short: 'A running toilet comes from the water level, the flapper, its chain or the fill valve. The first three take about fifteen minutes and no tools.',
    known: [
      { text: 'Take the lid off the tank and flush once so you can watch.', source: 0 },
      { text: '1. Water spills into the tall tube: the water level is set too high. Turn the screw on the fill valve, or slide the float down, until the water stops about an inch below the top of the tube.', source: 0 },
      { text: '2. The flapper never quite closes: check the chain from the handle. It should hang with a little slack. If it is tight, move the clip one link looser.', source: 0 },
      { text: '3. The running stops when you press the flapper down: the flapper is worn. Turn off the water at the wall, flush to empty the tank, and swap in a new flapper. Most cost under $10.', source: 0 },
      { text: '4. You hear a hiss with no water moving: the fill valve itself is failing. Replacing it is a longer job, about an hour.', source: 0 },
      { text: 'When none of these work, staff in the plumbing aisle of a hardware store can match parts to your toilet. Bring the old part in a plastic bag.', source: 0 },
    ],
    changes_if: [],
    desks: [],
    ask_someone: '',
    question_back: null,
    sources: [],
  },
};

const business: Scripted = {
  placeholder: true,
  match: /shop|business|open a|cafe|tea/i,
  sort: { sort: 'both', category: 'Small business', place: 'Portland', code: 'BUS 1.1', path: ['Small business', 'Starting', 'Will it pay'] },
  answer: {
    short: 'It depends on three numbers you can find this month: the rent, what each drink earns after costs, and how many drinks you can sell in a day.',
    known: [
      { text: 'The block has to buy enough drinks every day to cover the rent, the staff and you.', source: 0 },
      { text: 'Divide the monthly rent by what one drink earns after ingredients, cups and wages, then by 30. The result is the drinks a day that pay the rent.', source: 0 },
    ],
    changes_if: ['There is already a tea or coffee shop within a few blocks.', 'The lease runs five years or more and you sign it personally.', 'Foot traffic drops after 6 p.m. or on weekends.'],
    desks: [{ name: 'PCC Small Business Development Center', what: 'Free, confidential one on one advising. Their four week Business Design Series tests whether an idea holds up.', ask: 'Does this idea hold up at my rent?', cost: 'Free', bring: 'Your rent figure and a drink price', url: 'https://www.pcc.edu/business/small-business-development/' }],
    ask_someone: 'Do you know anyone who runs a small food shop? Ask what their first year cost and which month was hardest.',
    question_back: null,
    sources: [{ title: 'Small Business Development Center', site: 'pcc.edu', url: 'https://www.pcc.edu/business/small-business-development/' }],
  },
};

const pharmacy: Scripted = {
  placeholder: true,
  match: /ibuprofen|medicine|blood pressure|pill|drug/i,
  sort: { sort: 'route', category: 'Medicine', place: '', code: 'MED 3.4', path: ['Medicine', 'Pain relief', 'Drug interactions'] },
  answer: {
    short: 'Ask the pharmacist before you take it. Ibuprofen can raise blood pressure a few points and can work against some blood pressure medicines.',
    known: [
      { text: 'In studies, regular ibuprofen raised the top blood pressure number by about 3 to 4 points. For a single dose that change is usually small. Some experts still advise people with high blood pressure to avoid this group of pain relievers, called NSAIDs, which also includes naproxen.', source: 1 },
      { text: 'A pharmacist can check your exact medicine and suggest a pain reliever that fits it.', source: 0 },
    ],
    changes_if: ['You need it for more than a few days.', 'You also have kidney or heart problems.', 'Your blood pressure is already above the goal your doctor set.'],
    desks: [
      { name: 'The pharmacist at any drugstore counter', what: 'Checks your exact medicine against the pain reliever.', ask: 'Does ibuprofen fit my blood pressure medicine?', cost: 'Free, no appointment', bring: 'The name and dose of your blood pressure medicine. A photo of the bottle works.', url: '' },
      { name: "Your clinic's nurse line", what: 'If your clinic has one, the number is often on your last visit summary.', ask: 'Which pain reliever fits my medicine?', cost: 'Free', bring: 'Your medicine list', url: '' },
    ],
    ask_someone: '',
    question_back: {
      text: 'Is this for one headache or for several days?',
      choices: [
        { label: 'One headache', next: 'A quick question at the pharmacy counter covers it. Ask whether acetaminophen or another pain reliever suits your medicine.' },
        { label: 'Several days', next: 'Several days of headaches is worth a call to your clinic as well as the pharmacist. Ongoing headaches can be connected to blood pressure.' },
      ],
    },
    sources: [{ title: 'Does ibuprofen raise blood pressure?', site: 'goodrx.com', url: 'https://www.goodrx.com/ibuprofen/ibuprofen-advil-raise-blood-pressure' }],
  },
};

const fallback: Scripted = {
  placeholder: true,
  match: /./,
  sort: { sort: 'route', category: 'General', place: '', code: 'GEN 0.0', path: ['General', 'Unsorted'] },
  answer: {
    short: 'This desk has no scripted answer for that call. A reference librarian handles questions like it every day.',
    known: [],
    changes_if: [],
    desks: [{ name: 'Your public library reference desk', what: 'Finds the source, the office or the rule that covers a question.', ask: 'The call, word for word', cost: 'Free', bring: 'The question, written down', url: '' }],
    ask_someone: 'Do you know anyone who has dealt with this before? Ask what they did first.',
    question_back: null,
    sources: [],
  },
};

const SCRIPT = [deposit, toilet, business, pharmacy, fallback];

export function scriptedSort(text: string): SortResult {
  return SCRIPT.find((s) => s.match.test(text))!.sort;
}

export function scriptedAnswer(text: string, parts: { slips: number; sources: number; words: number; check: boolean }): Answer {
  const a = structuredClone(SCRIPT.find((s) => s.match.test(text))!.answer);
  if (!parts.slips) a.desks = [];
  if (parts.words === 0) return { ...a, short: '', known: [], changes_if: [], question_back: null, sources: [] };
  if (parts.sources === 0) return { ...a, known: a.known.slice(0, 2).map((k) => ({ ...k, source: 0 })), sources: [], changes_if: a.changes_if.slice(0, 2) };
  return { ...a, sources: a.sources.slice(0, parts.sources), known: a.known.map((k) => (k.source > parts.sources ? { ...k, source: 0 } : k)) };
}

/** The scripted manager finds one specific failure per claim, so every
 * outcome in the mockup can be reached. */
export function scriptedManager(claim: string): ManagerChecks {
  const pass = { covered: true, sourcesAgree: true, desksExist: true, sectionsPresent: true };
  switch (claim) {
    case 'facts':
      return { ...pass, sourcesAgree: false, note: 'The deadline in the answer did not match the cited statute.' };
    case 'asked':
      return { ...pass, sectionsPresent: false, note: 'The reply left out the section on what would change the answer.' };
    case 'desk':
      return { ...pass, desksExist: false, note: 'The named desk does not handle this kind of call.' };
    default:
      return { ...pass, note: 'Every check passed.' };
  }
}
