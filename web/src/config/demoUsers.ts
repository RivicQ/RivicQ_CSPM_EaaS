export type DemoEdition = 'oss' | 'enterprise';

export type DemoUser = {
  name: string;
  email: string;
  edition: DemoEdition;
  role: string;
};

export const DEMO_USERS: DemoUser[] = [
  { name: 'Revansai Ande', email: 'revansai.ande@rivicq.de', edition: 'enterprise', role: 'admin' },
  { name: 'Dhanush', email: 'dhanush@rivicq.de', edition: 'enterprise', role: 'operator' },
  { name: 'Pratik', email: 'pratik@rivicq.de', edition: 'enterprise', role: 'analyst' },
  { name: 'OSS Admin', email: 'oss@rivicq.de', edition: 'oss', role: 'admin' },
  { name: 'Enterprise Admin', email: 'enterprise@rivicq.de', edition: 'enterprise', role: 'admin' },
];

export const getDemoUser = (email: string) => {
  const normalized = email.trim().toLowerCase();
  return DEMO_USERS.find((user) => user.email.toLowerCase() === normalized) || null;
};
