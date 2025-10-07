import type { Survey } from '../types';

export const mockAnsweredSurvey: Survey = {
  id: '1',
  name: 'Digital Payment Usage Survey',
  reward: '$2.50',
  status: 'aggregating',
  type: 'per-survey',
  country: 'Global',
  tags: ['fintech', 'payments', 'digital']
};

export const mockAnswers = {
  frequency: 'Daily',
  methods: ['Credit Cards', 'Mobile Wallets'],
  preferred: 'Mobile Wallets',
  factors: 'I prefer mobile wallets for their convenience and instant transaction capabilities. The ability to track spending in real-time and receive immediate notifications is very helpful for managing my finances.',
  security: 4,
  improvements: 'Would like to see better integration between different payment platforms and more standardized QR code payment systems across merchants.'
};