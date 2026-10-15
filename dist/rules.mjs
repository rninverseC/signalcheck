// Match requests and scenarios, rather than suspicious words in isolation.
// Distinct evidence is grouped later to avoid repeatedly scoring one tactic.
export const RULES = [
  {
    id: 'credentials', title: 'Request to share a password or security code', group: 'sensitive', weight: 40,
    pattern: /\b(?:send|share|provide|reply\s+with|give|tell\s+(?:us|me)|submit|disclose|forward|email|text)\b[^.!?\n]{0,65}?\b(?:password|passcode|pin|otp|one[- ]time\s+(?:password|code)|(?:verification|security|authentication|2fa)\s+code)\b/gi,
    explanation: 'Sharing a password or one-time code can give someone access to an account. Verify who is asking through a separate, trusted channel.',
  },
  {
    id: 'credentials', title: 'Request to enter or verify credentials', group: 'sensitive', weight: 22,
    pattern: /\b(?:enter|confirm|verify)\b[^.!?\n]{0,65}?\b(?:password|passcode|pin|otp|one[- ]time\s+(?:password|code)|(?:verification|security|authentication|2fa)\s+code)\b/gi,
    explanation: 'The message asks you to enter or verify account credentials. This can be a normal sign-in step or a phishing attempt; check the destination independently.',
  },
  {
    id: 'financial-info', title: 'Request for sensitive personal information', group: 'sensitive', weight: 30,
    pattern: /\b(?:send|share|provide|enter|confirm|verify|reply\s+with|submit|update|email|text)\b[^.!?\n]{0,65}?\b(?:social\s+security(?:\s+number)?|ssn|credit\s+card(?:\s+(?:number|details))?|bank\s+(?:account|details)|debit\s+card|card\s+details|payment\s+(?:information|details))\b/gi,
    explanation: 'The message requests financial or identity details. Verify both the sender and the destination before supplying them.',
  },
  {
    id: 'unusual-payment', title: 'Unusual payment instructions', group: 'money', weight: 32,
    pattern: /\b(?:pay|payment|send|transfer|deposit)\b[^.!?\n]{0,70}?\b(?:gift\s*cards?|bitcoin|crypto(?:currency)?|wire\s+transfer|western\s+union|moneygram)\b|\b(?:gift\s*cards?|bitcoin|crypto(?:currency)?)\b[^.!?\n]{0,40}?\b(?:payment|pay|transfer)\b/gi,
    explanation: 'Payment by gift card, cryptocurrency, or a wire transfer deserves extra scrutiny, especially in an unexpected request.',
  },
  {
    id: 'gift-card-codes', title: 'Request for gift card codes or photos', group: 'money', weight: 40,
    pattern: /\b(?:send|share|text|email|forward|provide)\b[^.!?\n]{0,80}?\b(?:gift\s*card\s+(?:codes?|numbers?|pins?|photos?)|(?:codes?|numbers?|photos?)\s+(?:of|from|on|for)\s+(?:the\s+)?gift\s*cards?)\b/gi,
    explanation: 'Gift card numbers or photos can let someone spend the card balance. Ordinary shopping for a gift card is not treated as this signal.',
  },
  {
    id: 'safe-account', title: 'Request to move money to “protect” it', group: 'money', weight: 40,
    pattern: /\b(?:move|transfer|send)\b[^.!?\n]{0,60}?\b(?:money|funds|savings|balance)\b[^.!?\n]{0,80}?\b(?:(?:safe|secure|protected|holding)\s+account|protect\s+(?:it|your\s+(?:money|funds|savings)))\b/gi,
    explanation: 'Moving money into a so-called safe account is a known bank impersonation tactic. Contact your bank using a number from your statement or official app.',
  },
  {
    id: 'fake-check', title: 'Deposit a check, then send money back', group: 'money', weight: 40,
    pattern: /\b(?:deposit|cash)\b[^.!?\n]{0,45}?\b(?:check|cheque)\b[\s\S]{0,170}?\b(?:send|return|wire|transfer)\b[^.!?\n]{0,55}?\b(?:back|difference|remaining|remainder|rest)\b/gi,
    explanation: 'A request to deposit a check and send back part of the money matches a fake-check scenario. A visible balance does not establish that a check is genuine.',
  },
  {
    id: 'advance-fee', title: 'Pay first to receive earnings or a reward', group: 'money', weight: 40,
    pattern: /\b(?:pay|deposit|send)\b[^.!?\n]{0,75}?\b(?:unlock|release|withdraw|receive|access|claim)\b[^.!?\n]{0,60}?\b(?:earnings|wages|salary|commission|prize|reward|winnings)\b|\b(?:pay|send)\b[^.!?\n]{0,50}?\b(?:registration|training|equipment)\s+fee\b[^.!?\n]{0,50}?\b(?:job|work|hired|employment)\b/gi,
    explanation: 'Paying a fee or deposit to unlock supposed wages, commissions, or prizes matches an advance-fee scenario. Verify an employer or offer independently.',
  },
  {
    id: 'task-job', title: 'Unsolicited offer of paid online tasks', group: 'offer', weight: 22,
    pattern: /\b(?:earn|paid|commission|job|work)\b[^.!?\n]{0,90}?\b(?:liking\s+videos|rating\s+(?:products?|images?)|product\s+boosting|optimization\s+tasks)\b|\b(?:product\s+boosting|optimization\s+tasks|liking\s+videos)\b[^.!?\n]{0,65}?\b(?:earn|paid|commission|income)\b/gi,
    explanation: 'Offers of paid product boosting or optimization tasks resemble task-scam recruiting. Be especially cautious if you later have to deposit money to withdraw earnings.',
  },
  {
    id: 'remote-access', title: 'Request to grant remote access', group: 'access', weight: 40,
    pattern: /\b(?:install|download|open|run|enable)\b[^.!?\n]{0,45}?\b(?:anydesk|teamviewer|remote\s+(?:access|desktop)|screen[- ]sharing)\b|\b(?:give|grant|allow)\b[^.!?\n]{0,35}?\bremote\s+access\b/gi,
    explanation: 'Remote access may let another person control your device. Confirm the support request through a contact you already trust before granting access.',
  },
  {
    id: 'investment', title: 'Promise of guaranteed investment returns', group: 'offer', weight: 28,
    pattern: /\b(?:guaranteed\s+(?:returns?|profits?|income)|risk[- ]free\s+(?:investment|returns?|profits?)|double\s+your\s+(?:money|investment))\b/gi,
    explanation: 'Claims of guaranteed or risk-free investment returns deserve scrutiny. Neither the investment nor its promoter has been verified.',
  },
  {
    id: 'attachment', title: 'Potentially risky file extension', group: 'technical', weight: 28,
    pattern: /\b[\w.-]+\.(?:exe|scr|bat|cmd|msi|vbs|ps1|js|jar|hta)\b/gi,
    explanation: 'The message names a file type that can execute code. This is a text pattern, not an attachment scan.',
  },
  {
    id: 'secrecy', title: 'Pressure to keep the request secret', group: 'pressure', weight: 20,
    pattern: /\b(?:keep\s+(?:this|it)\s+(?:a\s+secret|confidential|between\s+us)|(?:do\s+not|don't)\s+(?:tell|discuss\s+this\s+with)\s+(?:anyone|your\s+(?:family|bank|colleagues))|do\s+not\s+contact\s+(?:your\s+)?bank)\b/gi,
    explanation: 'Secrecy can keep you from checking a request with someone you trust. Verify it independently before acting.',
  },
  {
    id: 'prize', title: 'Prize or unexpected reward', group: 'offer', weight: 18,
    pattern: /\b(?:you(?:'ve|\s+have)?\s+won|you(?:'ve|\s+have)?\s+been\s+selected[^.!?\n]{0,40}?\b(?:prize|reward|winner|lottery)|claim\s+your\s+(?:prize|reward|free\s+gift)|(?:free|unclaimed)\s+(?:prize|gift\s*card)|lottery\s+winner|congratulations[^.!?\n]{0,25}?winner)\b/gi,
    explanation: 'Unexpected prizes can be bait for personal information or fees. Legitimate awards and promotions may also match; the surrounding request matters.',
  },
  {
    id: 'account-threat', title: 'Threat of an account restriction', group: 'pressure', weight: 16,
    pattern: /\b(?:account\b[^.!?\n]{0,35}?\b(?:suspended|locked|blocked|terminated|on\s+hold|disabled|closed)|(?:suspend|close|disable|terminate|lock)\s+(?:your\s+)?account|(?:avoid|prevent)\s+(?:account\s+)?(?:suspension|termination))\b/gi,
    explanation: 'Account restriction threats can pressure you to act. Open the official app yourself to check the account status.',
  },
  {
    id: 'urgency', title: 'Pressure to act quickly', group: 'pressure', weight: 14,
    pattern: /\b(?:urgent(?:ly)?|immediately|act\s+now|last\s+(?:chance|warning)|final\s+(?:warning|notice)|within\s+(?:\d+|one|two|three|four|twenty[- ]four)\s+(?:minutes?|hours?)|expires?\s+(?:today|in\s+\d+\s+(?:minutes?|hours?)))\b/gi,
    explanation: 'A deadline can discourage verification. This is a weak contextual signal: legitimate reminders can also be urgent.',
  },
  {
    id: 'payment', title: 'Request for a payment or payment update', group: 'money', weight: 10,
    pattern: /\b(?:pay\s+(?:a|the|your|\$|£|€)|payment\s+(?:required|overdue|failed|needed)|(?:unpaid|overdue|outstanding)\s+(?:invoice|toll|fee)|update\s+(?:your\s+)?(?:billing|payment)|(?:redelivery|delivery|processing)\s+fee)\b/gi,
    explanation: 'Unexpected bills or billing updates merit verification. Ordinary bills match too, so this signal carries little weight on its own.',
  },
  {
    id: 'generic-greeting', title: 'Generic greeting', group: 'greeting', weight: 4,
    pattern: /\b(?:dear\s+(?:customer|user|account\s+holder|valued\s+customer)|hello\s+(?:customer|user))\b/gi,
    explanation: 'A generic greeting is a weak signal because many legitimate messages use one. Consider it alongside stronger requests or link clues.',
  },
];
