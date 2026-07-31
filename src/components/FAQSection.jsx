import { useState } from 'react';
import { ChevronDown } from '../lib/icons';
import styles from './FAQSection.module.css';

export function FAQSection({ faqs }) {
  const [openIdx, setOpenIdx] = useState(null);

  if (!faqs || faqs.length === 0) return null;

  // Build JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };

  return (
    <section
      aria-label="Frequently asked questions"
      className={styles.faqSection__root}
    >
      {/* Inject JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <h2 className={`${styles.faqSection__heading} font-display font-extrabold text-primary mb-32`}>
        Frequently Asked Questions
      </h2>

      <div className="flex flex-col gap-12">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className={`${styles.faqSection__item} ${isOpen ? styles['faqSection__item--open'] : ''}`}
            >
              <button
                id={`faq-question-${idx}`}
                aria-controls={`faq-answer-${idx}`}
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                aria-expanded={isOpen}
                className={styles.faqSection__question}
              >
                <span>{faq.q}</span>
                <ChevronDown
                  size={18}
                  aria-hidden="true"
                  className={`${styles.faqSection__icon} text-accent-lime ${isOpen ? styles['faqSection__icon--open'] : ''}`}
                />
              </button>

              {isOpen && (
                <div id={`faq-answer-${idx}`} role="region" aria-labelledby={`faq-question-${idx}`} className={styles.faqSection__answer}>
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
