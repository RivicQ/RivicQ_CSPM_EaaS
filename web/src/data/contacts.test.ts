import {
  CONTACTS,
  CONTACT_DOMAIN,
  publishedContacts,
  publishedPriorityContacts,
  priorityContacts,
} from './contacts';

describe('rivicq.com public desks', () => {
  const PUBLIC = [
    'hello@rivicq.com',
    'sales@rivicq.com',
    'support@rivicq.com',
    'security@rivicq.com',
    'privacy@rivicq.com',
  ];

  it('publishes only the five public desks', () => {
    const published = publishedContacts().map((c) => c.email);
    expect(published.sort()).toEqual([...PUBLIC].sort());
    expect(publishedPriorityContacts()).toHaveLength(5);
    expect(published).not.toContain('admin@rivicq.com');
    expect(published).not.toContain('revansai.ande@rivicq.com');
    expect(published).not.toContain('finance@rivicq.com');
    expect(published).not.toContain('investors@rivicq.com');
    expect(published).not.toContain('grants@rivicq.com');
    expect(published).not.toContain('innovationhub@rivicq.com');
    expect(priorityContacts().some((c) => c.email === 'admin@rivicq.com' && !c.publish)).toBe(true);
  });

  it('uses only the rivicq.com domain and never publishes private or automated addresses', () => {
    CONTACTS.forEach((c) => {
      expect(c.email.endsWith(`@${CONTACT_DOMAIN}`)).toBe(true);
      if (c.kind === 'private' || c.kind === 'automated') {
        expect(c.publish).toBe(false);
      }
    });
  });
});
