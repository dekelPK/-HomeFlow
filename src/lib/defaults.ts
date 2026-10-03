import type { AppData, Category, IncomeTemplate, ItemKind, TemplateItem } from './types';

type ItemSeed = [name: string, kind?: ItemKind, amount?: number];

const seed: [id: string, emoji: string, name: string, items: ItemSeed[]][] = [
  ['home', '🏠', 'בית', [
    ['שכירות', 'fixed', 6200],
    ['ארנונה', 'fixed', 600],
    ['חשמל'],
    ['מים'],
    ['גז'],
    ['ועד בית', 'fixed', 250],
    ['אינטרנט'],
  ]],
  ['transport', '🚗', 'תחבורה', [['דלק'], ['ביטוח רכב'], ['טיפולים'], ['טסט'], ['חניה']]],
  ['food', '🛒', 'אוכל', [['קניות אוכל / סופר'], ['אוכל בחוץ'], ['משלוחים'], ['קפה']]],
  ['dog', '🐶', 'כלב', [['אוכל'], ['וטרינר'], ['תרופות'], ['טיפוח'], ['ציוד']]],
  ['household', '🧴', 'שוטף', [['פארם'], ['חומרי ניקוי'], ['מוצרי בית'], ['ניקיון']]],
  ['fun', '🎬', 'בילויים', [['מסעדות'], ['בילויים'], ['חופשות'], ['הופעות'], ['אטרקציות']]],
  ['misc', '💳', 'שונות', [['קניות'], ['מתנות'], ['הוצאות בלתי צפויות'], ['אחר']]],
];

export function defaultCategories(): Category[] {
  return seed.map(([id, emoji, name, items], slot) => ({
    id,
    emoji,
    name,
    colorSlot: slot,
    items: items.map(([itemName, kind = 'variable', amount], i): TemplateItem => ({
      id: `${id}-${i + 1}`,
      name: itemName,
      kind,
      defaultAmount: amount ?? null,
    })),
  }));
}

export function defaultIncomes(): IncomeTemplate[] {
  return [
    { id: 'inc-dekla', name: 'משכורת דקלה', recurring: true, defaultAmount: null },
    { id: 'inc-avi', name: 'משכורת אבי', recurring: true, defaultAmount: null },
    { id: 'inc-extra', name: 'הכנסה נוספת', recurring: false, defaultAmount: null },
  ];
}

export function defaultData(): AppData {
  return {
    version: 1,
    settings: {
      monthlyBudget: 15000,
      categories: defaultCategories(),
      incomes: defaultIncomes(),
    },
    months: {},
  };
}
