export type ContactArea =
  | 'company'
  | 'product'
  | 'research'
  | 'innovation'
  | 'partnerships';

export type ContactKind = 'leadership' | 'inbox' | 'alias' | 'private' | 'automated';

export type ContactEntry = {
  email: string;
  label: string;
  area: ContactArea;
  purpose: string;
  /** Create these first as shared inboxes or aliases. */
  priority: boolean;
  /** Appears on public /contact and marketing surfaces. */
  publish: boolean;
  kind: ContactKind;
  /** Role-based access note for operators — never shown as a public mailbox rule for admin@. */
  access?: string;
};

export const CONTACT_DOMAIN = 'rivicq.com';

export const ECOSYSTEM_AREAS: { id: ContactArea; title: string; blurb: string }[] = [
  {
    id: 'company',
    title: 'Company',
    blurb: 'Formal enquiries, contracts, finance, fundraising, and founder accountability. RivicQ GmbH, Berlin.',
  },
  {
    id: 'product',
    title: 'Product platform',
    blurb: 'Five-BOM SaaS, customer support, security disclosures, sales, and automated notifications.',
  },
  {
    id: 'research',
    title: 'Research & funding',
    blurb: 'University MoUs, R&D proposals, and grant programmes. Addresses are not certifications.',
  },
  {
    id: 'innovation',
    title: 'Innovation Hub',
    blurb: 'Community programmes, workshops, mentors, and open-source engagement.',
  },
  {
    id: 'partnerships',
    title: 'Partnerships & expansion',
    blurb: 'Strategic partners, government, media, hiring, and regional aliases — not separate mailboxes.',
  },
];

export const CONTACTS: ContactEntry[] = [
  { email: 'revansai.ande@rivicq.com', label: 'Founder & CEO', area: 'company', purpose: 'Revan Sai Ande — trusted partner and leadership communication', priority: true, publish: true, kind: 'leadership' },
  { email: 'hello@rivicq.com', label: 'General enquiries', area: 'company', purpose: 'Main public contact on the website and decks', priority: true, publish: true, kind: 'inbox' },
  { email: 'info@rivicq.com', label: 'Company information', area: 'company', purpose: 'Formal introductions', priority: false, publish: true, kind: 'alias', access: 'Alias of hello@' },
  { email: 'contact@rivicq.com', label: 'Website forms', area: 'company', purpose: 'Generic prospect entry point', priority: false, publish: true, kind: 'alias', access: 'Alias of sales@ or hello@' },
  { email: 'investors@rivicq.com', label: 'Fundraising', area: 'company', purpose: 'Investor outreach and data-room requests', priority: true, publish: true, kind: 'inbox', access: 'Founder' },
  { email: 'finance@rivicq.com', label: 'Finance', area: 'company', purpose: 'Invoices, expenses, tax advisor, Zoho Books', priority: true, publish: true, kind: 'inbox', access: 'Founder and accountant only' },
  { email: 'billing@rivicq.com', label: 'Customer invoicing', area: 'company', purpose: 'Payments, subscriptions, purchase orders', priority: false, publish: true, kind: 'alias', access: 'Alias of finance@' },
  { email: 'legal@rivicq.com', label: 'Legal & conduct', area: 'company', purpose: 'NDAs, terms, IP, and Code of Conduct reports', priority: false, publish: true, kind: 'alias', access: 'Founder; conduct@ aliases here' },
  { email: 'operations@rivicq.com', label: 'Operations', area: 'company', purpose: 'Vendors, procurement, administration', priority: false, publish: true, kind: 'alias' },
  { email: 'sales@rivicq.com', label: 'Sales', area: 'product', purpose: 'Demos, paid assessments, enterprise pipeline', priority: true, publish: true, kind: 'inbox' },
  { email: 'support@rivicq.com', label: 'Customer support', area: 'product', purpose: 'Community and Enterprise technical support', priority: true, publish: true, kind: 'inbox' },
  { email: 'security@rivicq.com', label: 'Security reporting', area: 'product', purpose: 'Vulnerability disclosures and incidents', priority: true, publish: true, kind: 'inbox', access: 'Security leadership only' },
  { email: 'privacy@rivicq.com', label: 'Privacy / GDPR', area: 'product', purpose: 'Data-subject requests', priority: false, publish: true, kind: 'alias', access: 'Alias of legal@ / security@ as needed' },
  { email: 'product@rivicq.com', label: 'Product', area: 'product', purpose: 'CryptoBOM / QBOM platform product questions', priority: false, publish: false, kind: 'alias', access: 'Alias of support@' },
  { email: 'success@rivicq.com', label: 'Customer success', area: 'product', purpose: 'Onboarding and account follow-up', priority: false, publish: false, kind: 'alias', access: 'Alias of support@' },
  { email: 'demo@rivicq.com', label: 'Product demos', area: 'product', purpose: 'Demo requests', priority: false, publish: false, kind: 'alias', access: 'Alias of sales@' },
  { email: 'enterprise@rivicq.com', label: 'Enterprise', area: 'product', purpose: 'Enterprise pipeline and paid assessments', priority: false, publish: false, kind: 'alias', access: 'Alias of sales@' },
  { email: 'solutions@rivicq.com', label: 'Solutions', area: 'product', purpose: 'Migration projects and solution design', priority: false, publish: false, kind: 'alias', access: 'Alias of sales@' },
  { email: 'pqc@rivicq.com', label: 'Post-quantum', area: 'product', purpose: 'PQC, CBOM, and cryptographic migration questions', priority: false, publish: false, kind: 'alias', access: 'Alias of security@ or research@' },
  { email: 'cryptography@rivicq.com', label: 'Cryptography', area: 'product', purpose: 'Cryptographic inventory and migration questions', priority: false, publish: false, kind: 'alias', access: 'Alias of security@' },
  { email: 'compliance@rivicq.com', label: 'Compliance mappings', area: 'product', purpose: 'DORA / NIS2 / CRA / BSI mapping questions — not a certification desk', priority: false, publish: false, kind: 'alias', access: 'Alias of security@' },
  { email: 'trust@rivicq.com', label: 'Trust', area: 'product', purpose: 'Security trust and disclosure coordination', priority: false, publish: false, kind: 'alias', access: 'Alias of security@' },
  { email: 'engineering@rivicq.com', label: 'Engineering', area: 'product', purpose: 'Development coordination — not a public support desk', priority: false, publish: false, kind: 'alias' },
  { email: 'research@rivicq.com', label: 'Research', area: 'research', purpose: 'R&D proposals and academic partners', priority: true, publish: true, kind: 'inbox' },
  { email: 'grants@rivicq.com', label: 'Grants', area: 'research', purpose: 'BSS, EXIST, ZIM, EU, startup programmes', priority: true, publish: true, kind: 'inbox', access: 'Founder and operations' },
  { email: 'rnd@rivicq.com', label: 'R&D', area: 'research', purpose: 'Research and development coordination', priority: false, publish: false, kind: 'alias', access: 'Alias of research@' },
  { email: 'academia@rivicq.com', label: 'Academia', area: 'research', purpose: 'University MoUs and academic introductions', priority: false, publish: false, kind: 'alias', access: 'Alias of research@' },
  { email: 'innovationhub@rivicq.com', label: 'Innovation Hub', area: 'innovation', purpose: 'Deep-tech programmes and founder ecosystem', priority: true, publish: true, kind: 'inbox' },
  { email: 'community@rivicq.com', label: 'Community', area: 'innovation', purpose: 'Open-source and student engagement', priority: false, publish: true, kind: 'alias', access: 'Alias of innovationhub@' },
  { email: 'events@rivicq.com', label: 'Events', area: 'innovation', purpose: 'Conferences, workshops, registrations', priority: false, publish: true, kind: 'alias', access: 'Alias of innovationhub@' },
  { email: 'programs@rivicq.com', label: 'Programmes', area: 'innovation', purpose: 'Hub programmes and workshops', priority: false, publish: false, kind: 'alias', access: 'Alias of innovationhub@' },
  { email: 'mentors@rivicq.com', label: 'Mentors', area: 'innovation', purpose: 'Mentor network coordination', priority: false, publish: false, kind: 'alias', access: 'Alias of innovationhub@' },
  { email: 'opensource@rivicq.com', label: 'Open source', area: 'innovation', purpose: 'CryptoBOM open source and GitHub contributors', priority: false, publish: false, kind: 'alias', access: 'Alias of community@' },
  { email: 'developers@rivicq.com', label: 'Developers', area: 'innovation', purpose: 'Technical community', priority: false, publish: false, kind: 'alias', access: 'Alias of community@' },
  { email: 'maintainers@rivicq.com', label: 'Maintainers', area: 'innovation', purpose: 'Maintainer coordination', priority: false, publish: false, kind: 'alias' },
  { email: 'contributors@rivicq.com', label: 'Contributors', area: 'innovation', purpose: 'Contributor coordination', priority: false, publish: false, kind: 'alias' },
  { email: 'partnerships@rivicq.com', label: 'Partnerships', area: 'partnerships', purpose: 'Cloud, quantum, university, and public-sector partners', priority: true, publish: true, kind: 'inbox' },
  { email: 'alliances@rivicq.com', label: 'Alliances', area: 'partnerships', purpose: 'Alliance and channel coordination', priority: false, publish: false, kind: 'alias', access: 'Alias of partnerships@' },
  { email: 'government@rivicq.com', label: 'Government', area: 'partnerships', purpose: 'Public-sector introductions — not a hotline', priority: false, publish: false, kind: 'alias', access: 'Alias of partnerships@' },
  { email: 'publicsector@rivicq.com', label: 'Public sector', area: 'partnerships', purpose: 'Critical-infrastructure partner introductions', priority: false, publish: false, kind: 'alias', access: 'Alias of partnerships@' },
  { email: 'europe@rivicq.com', label: 'Europe', area: 'partnerships', purpose: 'Regional coordination alias', priority: false, publish: false, kind: 'alias', access: 'Alias of partnerships@' },
  { email: 'india@rivicq.com', label: 'India', area: 'partnerships', purpose: 'Regional coordination alias', priority: false, publish: false, kind: 'alias', access: 'Alias of partnerships@' },
  { email: 'usa@rivicq.com', label: 'United States', area: 'partnerships', purpose: 'Regional coordination alias', priority: false, publish: false, kind: 'alias', access: 'Alias of partnerships@' },
  { email: 'asia@rivicq.com', label: 'Asia', area: 'partnerships', purpose: 'Regional coordination alias', priority: false, publish: false, kind: 'alias', access: 'Alias of partnerships@' },
  { email: 'estonia@rivicq.com', label: 'Estonia', area: 'partnerships', purpose: 'Regional coordination alias', priority: false, publish: false, kind: 'alias', access: 'Alias of partnerships@' },
  { email: 'press@rivicq.com', label: 'Press', area: 'partnerships', purpose: 'PR, podcasts, speaking invitations', priority: false, publish: true, kind: 'alias' },
  { email: 'marketing@rivicq.com', label: 'Marketing', area: 'partnerships', purpose: 'Marketing collaborations', priority: false, publish: false, kind: 'alias', access: 'Alias of press@' },
  { email: 'brand@rivicq.com', label: 'Brand', area: 'partnerships', purpose: 'Brand assets and trademark questions', priority: false, publish: false, kind: 'alias', access: 'Alias of legal@ or press@' },
  { email: 'social@rivicq.com', label: 'Social', area: 'partnerships', purpose: 'Social and community collaborations', priority: false, publish: false, kind: 'alias', access: 'Alias of press@ or community@' },
  { email: 'careers@rivicq.com', label: 'Careers', area: 'partnerships', purpose: 'Candidates, internships, advisors', priority: false, publish: true, kind: 'alias' },
  { email: 'talent@rivicq.com', label: 'Talent', area: 'partnerships', purpose: 'Hiring coordination', priority: false, publish: false, kind: 'alias', access: 'Alias of careers@' },
  { email: 'advisors@rivicq.com', label: 'Advisors', area: 'partnerships', purpose: 'Advisor introductions', priority: false, publish: false, kind: 'alias', access: 'Alias of careers@ or hello@' },
  { email: 'team@rivicq.com', label: 'Team', area: 'partnerships', purpose: 'Internal team coordination — not a public desk', priority: false, publish: false, kind: 'alias' },
  { email: 'admin@rivicq.com', label: 'Domain administration', area: 'company', purpose: 'Critical tool and account ownership only', priority: true, publish: false, kind: 'private', access: 'RivicQ-controlled MFA and recovery — never a personal account alone' },
  { email: 'noreply@rivicq.com', label: 'Automated mail', area: 'product', purpose: 'Product notifications, alerts, and verification', priority: false, publish: false, kind: 'automated' },
  { email: 'alerts@rivicq.com', label: 'Platform alerts', area: 'product', purpose: 'Security and product alerts', priority: false, publish: false, kind: 'automated' },
  { email: 'status@rivicq.com', label: 'Status updates', area: 'product', purpose: 'Service status notifications', priority: false, publish: false, kind: 'automated' },
];

export const publishedContacts = (): ContactEntry[] => CONTACTS.filter((c) => c.publish);

export const priorityContacts = (): ContactEntry[] =>
  CONTACTS.filter((c) => c.priority && (c.publish || c.kind === 'private'));

export const publishedPriorityContacts = (): ContactEntry[] =>
  publishedContacts().filter((c) => c.priority);

export const contactsByArea = (area: ContactArea): ContactEntry[] =>
  publishedContacts().filter((c) => c.area === area);

export const mailto = (email: string) => `mailto:${email}`;
