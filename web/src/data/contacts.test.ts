import {
  CONTACTS,
  CONTACT_DOMAIN,
  publishedContacts,
  publishedPriorityContacts,
  priorityContacts,
} from './contacts';

describe('rivicq.com contact directory', () => {
  const PRIORITY_PUBLISHED = [
    'revansai.ande@rivicq.com',
    'hello@rivicq.com',
    'sales@rivicq.com',
    'partnerships@rivicq.com',
    'research@rivicq.com',
    'grants@rivicq.com',
    'support@rivicq.com',
    'security@rivicq.com',
    'finance@rivicq.com',
    'investors@rivicq.com',
    'innovationhub@rivicq.com',
  ];

  it('publishes the twelve-priority set except admin@', () => {
    const published = publishedContacts().map((c) => c.email);
    PRIORITY_PUBLISHED.forEach((email) => expect(published).toContain(email));
    expect(published).toContain('privacy@rivicq.com');
    expect(published).not.toContain('admin@rivicq.com');
    expect(published).not.toContain('noreply@rivicq.com');
    expect(publishedPriorityContacts()).toHaveLength(11);
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
