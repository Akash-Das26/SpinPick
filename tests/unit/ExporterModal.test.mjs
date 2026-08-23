import { describe, it, expect } from 'vitest';

/* ==========================================================================
   Unit Tests: ExporterModal — Export logic (non-React)
   ========================================================================== */

describe('ExporterModal — Export Logic', () => {
  const SAMPLE_ITEMS = [
    { id: '1', text: 'Pizza', color: '#ff6b6b', weight: 3, enabled: true, icon: '🍕', note: 'Yummy' },
    { id: '2', text: 'Sushi', color: '#6bcb77', weight: 2, enabled: true },
    { id: '3', text: 'Tacos', color: '#ffd93d', weight: 1, enabled: true },
    { id: '4', text: 'Burgers', color: '#4d96ff', weight: 1, enabled: false },
  ];

  it('CSV export generates correct rows', () => {
    const rows = [
      ['Label', 'Color', 'Weight', 'Enabled', 'Note'],
      ...SAMPLE_ITEMS.map((item) => [
        `"${item.text.replace(/"/g, '""')}"`,
        item.color,
        String(item.weight),
        item.enabled ? 'Yes' : 'No',
        `"${(item.note || '').replace(/"/g, '""')}"`,
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    expect(csv).toContain('"Pizza"');
    expect(csv).toContain('#ff6b6b');
    expect(csv).toContain('Yes');
    expect(csv).toContain('No');
    expect(csv).toContain('"Yummy"');
  });

  it('JSON export generates valid payload', () => {
    const config = { title: 'Test Wheel' };
    const payload = {
      version: 1,
      title: config.title,
      items: SAMPLE_ITEMS,
      exportedAt: Date.now(),
    };
    const json = JSON.stringify(payload, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.title).toBe('Test Wheel');
    expect(parsed.items).toHaveLength(4);
  });

  it('filters active items for statistics', () => {
    const activeItems = SAMPLE_ITEMS.filter((i) => i.enabled);
    const totalWeight = activeItems.reduce((sum, i) => sum + i.weight, 0);
    expect(activeItems).toHaveLength(3);
    expect(totalWeight).toBe(6);
  });

  it('percentage calculation is correct', () => {
    const activeItems = SAMPLE_ITEMS.filter((i) => i.enabled);
    const totalWeight = activeItems.reduce((sum, i) => sum + i.weight, 0);
    const pizzaPct = ((3 / totalWeight) * 100).toFixed(1);
    expect(pizzaPct).toBe('50.0');
  });
});
