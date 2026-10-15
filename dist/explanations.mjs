// Presentation only: these explanations never change a detector decision.
import { displayedLinkMismatches } from './link-checks.mjs?v=3.0.0';
const explain = (why, next, limit) => ({ why, next, limit });
export const EXPLANATIONS = {
  credentials: explain('A password or sign-in code can give someone access to your account. A request to share one deserves a pause.', 'Do not send the password or code in a reply. If you need to sign in, open the official app yourself.', 'Entering a password in a real sign-in screen can be normal. This checker cannot verify who is asking.'),
  'financial-info': explain('The request involves details that could be used to access your money or misuse your identity.', 'Verify the request using the organization’s official app or a contact you already know before providing details.', 'A legitimate form can ask for sensitive information too. The sender and destination have not been verified.'),
  'unusual-payment': explain('Gift cards, cryptocurrency, and some money transfers can make it difficult to recover money after a scam.', 'Confirm the person and reason for the payment through a separate, trusted channel before paying.', 'The payment method alone does not prove a scam. The surrounding request matters.'),
  'gift-card-codes': explain('Someone with the gift card number or code may be able to spend its balance without holding the card.', 'Do not send the codes or photos. Check the request with the person using a contact you already know.', 'Buying a gift card is ordinary. This warning is about a request to share its codes or photos.'),
  'safe-account': explain('Someone may be pretending to help protect your money while directing you to an account they control.', 'Pause the transfer and contact your bank using the number on your statement or its official app.', 'The checker does not know who owns the destination account or who actually sent the message.'),
  'fake-check': explain('A deposited check can appear in your balance before it is found to be fake. Money you send back could still be lost.', 'Do not return or forward money based on this message. Ask your bank about the check through a trusted contact.', 'Only the message wording was checked. No check or bank transaction was examined.'),
  'advance-fee': explain('A promise of earnings or a reward may be used to persuade you to pay money first.', 'Do not make the requested deposit or fee payment until you have independently verified the offer.', 'The checker cannot verify the employer, prize, or supposed earnings.'),
  'task-job': explain('Simple paid tasks can be used to build trust before asking you to deposit money to access supposed earnings.', 'Research the employer independently, and pause if you are asked to pay to withdraw your wages.', 'This resembles a known recruiting pattern. It does not verify whether a particular job is real.'),
  'remote-access': explain('Remote access software can let someone see or control your device.', 'Verify the support request through your existing IT contact before installing software or granting access.', 'Remote support can be legitimate when you requested it. This checker does not know that context.'),
  investment: explain('Promises of certain profits can make a risky or invented investment seem dependable.', 'Investigate the investment and the person offering it using independent sources before sending money.', 'The message wording does not establish the investment’s actual risk or legitimacy.'),
  attachment: explain('The named file type can run code on a device instead of simply displaying a document.', 'Verify why you received the file and who sent it before opening it.', 'No file was uploaded or scanned. A filename alone cannot establish whether the file is harmful.'),
  secrecy: explain('Keeping the request secret can stop you from asking someone who might notice a problem.', 'Check the request with someone you trust before acting, using a contact outside this message.', 'Confidentiality can be legitimate. Consider what you are being asked to do and why.'),
  prize: explain('An unexpected reward can draw you into sharing personal details or paying a fee.', 'Verify the offer independently. Pause if claiming the reward requires a payment or sensitive details.', 'Real promotions and awards can use similar wording. This signal alone does not establish fraud.'),
  'account-threat': explain('A claim that an account will be locked can make you act before checking the details.', 'Open the official app yourself to check the account’s status.', 'A genuine account warning can look similar. Your account was not checked here.'),
  urgency: explain('A short deadline can reduce the time you spend checking a request.', 'Take a moment to verify the request through a trusted source before acting.', 'This is a weak clue. Ordinary deadlines, reminders, and sign-in codes can also be urgent.'),
  payment: explain('An unexpected fee or bill can be used to lead you into paying the wrong person.', 'Check the bill in your existing account or contact the organization using details you already trust.', 'Normal bills can match this pattern. A payment request by itself carries little weight.'),
  'generic-greeting': explain('A broad greeting may be part of a message sent to many people.', 'Look at the request and destination rather than deciding based on the greeting alone.', 'Many legitimate messages use generic greetings. This is a very weak clue.'),
  'short-link': explain('A shortened link does not show you where it will eventually take you.', 'Open the organization’s app or a website address you already know instead of relying on this link.', 'Short links are used legitimately too. This checker did not expand or visit the link.'),
  'http-link': explain('This link uses a connection that does not encrypt information sent to the page.', 'Avoid entering sensitive details there. Navigate independently to the service you intended to use.', 'An encrypted HTTPS connection would still not prove that a website is trustworthy.'),
  'ip-link': explain('The destination is shown as a numeric address rather than a familiar website name.', 'Check the request using a known website or app before following the link.', 'Numeric addresses can be legitimate. No live reputation lookup was performed.'),
  'userinfo-link': explain('Text before an @ in a web address can distract you from the site the link actually points to.', 'Check the actual destination shown below. Visit the service through an address you already know.', 'The link structure was examined locally. The destination was not visited or verified.'),
  'unicode-link': explain('Some international website names contain characters that can resemble familiar letters.', 'Compare the address with an independently known website before using it.', 'International names are often legitimate. This warning does not prove impersonation.'),
  'lookalike-link': explain('A familiar organization’s name, or a close spelling, appears inside a different website address.', 'Open the organization’s official app or use an address you already know.', 'Similar names can belong to unrelated legitimate sites. The checker’s organization list is limited.'),
  'brand-link': explain('The message appears to claim an organization’s identity, while its link points to a different address.', 'Verify the request through the organization’s app or a trusted contact.', 'Organizations sometimes use third-party services. A mismatch is a reason to check, not proof of fraud.'),
  'displayed-link': explain('The address written on the link differs from the address it would actually open.', 'Use a known website or app instead of following the pasted link.', 'Legitimate tracking links can differ too. No redirect was followed here.'),
  'brand-sender': explain('The domain—the part of an email address after @—does not match the organization the message appears to claim.', 'Check the request using contact information you already trust.', 'Outsourced senders can be legitimate, and displayed email addresses can be spoofed. No sender authentication was performed.'),
  'login-link': explain('A link that asks you to sign in could lead to a page designed to collect your account details.', 'Open the official app or type a known address yourself to check the request.', 'Real sign-in messages exist. This checker does not establish whether this login page is genuine.'),
  'toll-payment': explain('Unexpected texts about unpaid tolls can lead to a fake payment page.', 'Check your toll balance through the agency’s known website rather than this text’s link.', 'The checker does not know whether you actually owe a toll or whether the agency sent the text.'),
  'sms-pattern': explain('The overall wording resembles older examples of unsolicited text messages that the model learned from.', 'Check whether you expected the message. Verify any unusual request through a trusted source.', 'Spam can be advertising rather than a scam. The model does not know who sent the message or whether you wanted it.'),
};

export const FAMILY_NAMES = { sensitive: 'Sensitive details', money: 'Money requests', pressure: 'Pressure tactics', identity: 'Identity and domain clues', technical: 'Link and file clues', offer: 'Offers and SMS patterns', access: 'Remote access', greeting: 'Greeting' };

const languageLabel = code => code === 'es' ? 'Spanish' : code?.startsWith('zh') ? 'Chinese' : 'message';

export function getFindingExplanation(finding, result) {
  const copy = EXPLANATIONS[finding.id] ?? explain(finding.explanation, 'Verify the request through a source you already trust.', 'A matching pattern is a reason to check, not proof of a scam.');
  const relatedLinks = result.links.filter(link => finding.evidence.some(evidence => evidence.source === 'message' && evidence.start <= link.start && evidence.end >= link.end));
  const destinations = [...new Set(relatedLinks.map(link => link.host))];
  const mismatch = finding.id === 'displayed-link' ? displayedLinkMismatches(result.message).find(item => finding.evidence.some(e => e.start === item.evidence.start)) : null;
  const found = mismatch ? `The visible address names ${mismatch.displayedHost}, but the pasted link points to ${mismatch.actualHost}.`
    : finding.evidence.some(item => item.source === 'translation') && !finding.evidence.some(item => item.source === 'message') ? 'The English translation contains the wording below. Compare it with the original message.'
    : finding.id === 'sms-pattern' ? 'An on-device pattern check flagged the overall wording.'
    : finding.id === 'brand-sender' ? `Sender domain: ${result.senderDomain || 'not available'}.`
      : destinations.length ? `Actual link ${destinations.length === 1 ? 'destination' : 'destinations'}: ${destinations.join(', ')}.`
        : 'The message contains the wording below.';
  const counted = finding.weight === 0 ? '0 additional points: related clues have already used this category’s limit.'
    : finding.weight < finding.baseWeight ? `${finding.weight} points counted from a ${finding.baseWeight}-point signal because related clues share a limit.`
      : `${finding.weight} points counted toward the total.`;
  const translatedOnly = finding.evidence.length && finding.evidence.every(item => item.source === 'translation');
  const limit = translatedOnly ? `${copy.limit} This evidence comes from a translation, which can alter the original meaning.` : copy.limit;
  return { ...copy, limit, found, counted, family: FAMILY_NAMES[finding.group] || finding.group, method: finding.basis === 'local SMS model' ? 'A learned SMS wording pattern' : finding.basis === 'English translation rule' ? 'An English rule applied to the translation' : /request rule/.test(finding.basis) ? `A configured ${languageLabel(result.language)} request check` : 'A configured message or link check', technical: finding.explanation };
}

export function getScoreExplanation(result) {
  const total = result.findings.reduce((sum, finding) => sum + finding.weight, 0);
  return {
    meaning: `The displayed total is ${result.score} signal points. More points mean more or stronger patterns matched the checker.`,
    probability: `It does not mean there is a ${result.score}% chance of a scam. Even a zero-point message can contain a scam the checker misses.`,
    total, capped: total > 100,
    rows: result.findings.map(finding => ({ title: finding.title, points: finding.weight, related: finding.weight < finding.baseWeight })),
  };
}
