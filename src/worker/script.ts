// Scripted answers for dev, when no model is set up. Four calls from the
// mockup, matched by keyword, and a routed fallback for anything else.

import type { Answer, ManagerChecks, SortResult } from '../shared/desk-schemas';

interface Scripted {
  match: RegExp;
  sort: SortResult;
  answer: Answer;
}

const deposit: Scripted = {
  match: /deposit|landlord|carpet/i,
  sort: { sort: 'both', category: 'Housing', place: 'Oregon' },
  answer: {
    short: 'Usually no. Oregon law bars deductions for ordinary wear and tear, and a landlord who keeps a deposit wrongly can owe you twice the amount.',
    known: [
      { text: 'Your landlord can deduct only for damage you caused beyond normal use. Carpet worn thin from walking is normal use. Stains, burns and pet damage are not.', source: 1 },
      { text: 'Carpet cleaning has its own rule. The landlord can charge for it only if they cleaned the carpet with a carpet machine before you moved in, and your written lease says cleaning will be charged either way.', source: 1 },
      { text: 'The landlord has 31 days after you move out to send a written list of deductions and return the rest.', source: 1 },
    ],
    changes_if: ['Your lease lets the landlord charge for carpet cleaning in every case.', 'The carpet has damage beyond wear, like stains or tears.', 'More than 31 days have passed with no written list. Then the case for double the deposit gets stronger.'],
    desks: [
      { name: 'Community Alliance of Tenants', what: 'Statewide renters\' rights hotline. Leave a message and they call back.', cost: 'Free', bring: 'Your lease and move out photos', url: 'https://www.oregoncat.org' },
      { name: 'Small claims court', what: 'Where deposit disputes usually end up if a letter does not work.', cost: 'A filing fee, listed on your county court website', bring: 'The lease, photos and any letters', url: '' },
    ],
    ask_someone: 'Do you know anyone who has disputed a deposit? Ask them what they sent and what happened.',
    question_back: {
      text: 'Did you get a written list of deductions?',
      choices: [
        { label: 'Yes', next: 'Compare each deduction to the rules above. For any that look like normal wear, send the landlord a short letter asking for that amount back within 10 days. Keep a copy.' },
        { label: 'No', next: 'If 31 days have passed since you moved out, write to the landlord asking for the full deposit and noting that no written accounting arrived. The tenants hotline can check your letter.' },
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
  match: /toilet|flush/i,
  sort: { sort: 'desk', category: 'Home repair', place: '' },
  answer: {
    short: 'Usually the flapper, the chain or the water level. Each is a fifteen minute fix with no tools.',
    known: [
      { text: 'Take the lid off the tank and flush once so you can watch.', source: 0 },
      { text: '1. Water spills into the tall tube: the water level is set too high. Turn the screw on the fill valve, or slide the float down, until the water stops about an inch below the top of the tube.', source: 0 },
      { text: '2. The flapper never quite closes: check the chain from the handle. It should hang with a little slack. If it is tight, move the clip one link looser.', source: 0 },
      { text: '3. The running stops when you press the flapper down: the flapper is worn. Turn off the water at the wall, flush to empty the tank, and swap in a new flapper. Most cost under $10.', source: 0 },
      { text: '4. You hear a hiss with no water moving: the fill valve itself is failing. Replacing it is a longer job, about an hour.', source: 0 },
      { text: 'If none of these work, staff in the plumbing aisle of a hardware store can match parts to your toilet. Bring the old part in a plastic bag.', source: 0 },
    ],
    changes_if: [],
    desks: [],
    ask_someone: '',
    question_back: null,
    sources: [],
  },
};

const business: Scripted = {
  match: /shop|business|open a|cafe|tea/i,
  sort: { sort: 'both', category: 'Small business', place: 'Portland' },
  answer: {
    short: 'It depends on three numbers you can find this month: the rent, what each drink earns after costs, and how many drinks you can sell in a day.',
    known: [
      { text: 'Liking the drink is the easy part. The block has to buy enough of it every day to cover the rent, the staff and you.', source: 0 },
      { text: 'Start with rent. Divide it by what one drink earns after ingredients, cups and wages, then by 30. That is how many drinks a day it takes just to pay the landlord.', source: 0 },
    ],
    changes_if: ['There is already a tea or coffee shop within a few blocks.', 'The lease runs five years or more and you sign it personally.', 'Foot traffic drops after 6 p.m. or on weekends.'],
    desks: [{ name: 'PCC Small Business Development Center', what: 'Free, confidential one on one advising. Their four week Business Design Series tests whether an idea holds up.', cost: 'Free', bring: 'Your rent figure and a drink price', url: 'https://www.pcc.edu/business/small-business-development/' }],
    ask_someone: 'Do you know anyone who runs a small food shop? Ask what their first year cost and which month was hardest.',
    question_back: null,
    sources: [{ title: 'Small Business Development Center', site: 'pcc.edu', url: 'https://www.pcc.edu/business/small-business-development/' }],
  },
};

const pharmacy: Scripted = {
  match: /ibuprofen|medicine|blood pressure|pill|drug/i,
  sort: { sort: 'route', category: 'Medicine', place: '' },
  answer: {
    short: 'Ask the pharmacist before you take it. Ibuprofen can raise blood pressure a few points and can work against some blood pressure medicines.',
    known: [
      { text: 'In studies, regular ibuprofen raised the top blood pressure number by about 3 to 4 points. For a single dose that change is usually small. Some experts still advise people with high blood pressure to avoid this group of pain relievers, called NSAIDs, which also includes naproxen.', source: 1 },
      { text: 'A pharmacist can check your exact medicine and suggest a pain reliever that fits it.', source: 0 },
    ],
    changes_if: ['You need it for more than a few days.', 'You also have kidney or heart problems.', 'Your blood pressure is already above the goal your doctor set.'],
    desks: [
      { name: 'The pharmacist at any drugstore counter', what: 'Checks your exact medicine against the pain reliever.', cost: 'Free, no appointment', bring: 'The name and dose of your blood pressure medicine. A photo of the bottle works.', url: '' },
      { name: "Your clinic's nurse line", what: 'If your clinic has one, the number is often on your last visit summary.', cost: 'Free', bring: 'Your medicine list', url: '' },
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
  match: /./,
  sort: { sort: 'route', category: 'General', place: '' },
  answer: {
    short: 'This desk has no scripted answer for that call. A reference librarian handles questions like it every day.',
    known: [],
    changes_if: [],
    desks: [{ name: 'Your public library reference desk', what: 'Finds the source, the office or the rule that covers a question.', cost: 'Free', bring: 'The question, written down', url: '' }],
    ask_someone: 'Do you know anyone who has dealt with this before? Ask what they did first.',
    question_back: null,
    sources: [],
  },
};

const SCRIPT = [deposit, toilet, business, pharmacy, fallback];

export function scriptedSort(text: string): SortResult {
  return SCRIPT.find((s) => s.match.test(text))!.sort;
}

export function scriptedAnswer(text: string, option: string): Answer {
  const a = structuredClone(SCRIPT.find((s) => s.match.test(text))!.answer);
  if (option === 'route') return { ...a, short: '', known: [], changes_if: [], question_back: null, sources: [] };
  if (option === 'quick') return { ...a, known: a.known.slice(0, 2).map((k) => ({ ...k, source: 0 })), sources: [], changes_if: a.changes_if.slice(0, 2) };
  return a;
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
