import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FAQSection } from '../../src/components/FAQSection';

describe('FAQSection', () => {
  it('expands and collapses answers with accessible aria wiring', async () => {
    const user = userEvent.setup();
    render(
      <FAQSection
        faqs={[
          { q: 'What is SpinPick?', a: 'A decision studio for fast choices.' },
        ]}
      />
    );

    const button = screen.getByRole('button', { name: /what is spinpick/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);

    const answer = screen.getByRole('region', { name: /what is spinpick/i });
    expect(answer).toHaveTextContent('A decision studio for fast choices.');
    expect(button).toHaveAttribute('aria-expanded', 'true');

    await user.click(button);
    expect(screen.queryByRole('region', { name: /what is spinpick/i })).not.toBeInTheDocument();
  });
});
