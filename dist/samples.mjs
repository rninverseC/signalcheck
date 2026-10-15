// Fictional examples for exploration, not an accuracy benchmark.
export const SAMPLES = {
  spanish: { language: 'es', type: 'text', sender: 'Remitente desconocido', message: 'Departamento de fraude: transfiere tus ahorros a una cuenta segura para protegerlos. Mantén esto en secreto y no contactes tu banco.' },
  chinese: { language: 'zh', type: 'text', sender: '未知发件人', message: '反欺诈部门：请转移你的资金到安全账户。请保密，不要联系银行。立即操作。' },
  bank: { type: 'text', sender: 'Unknown sender', message: 'Fraud department: Transfer your savings to a safe account to protect it. Keep this confidential and do not contact your bank.' },
  task: { type: 'text', sender: 'Unknown recruiter', message: 'Earn a commission for product boosting and liking videos. Please deposit $80 to unlock your earnings and withdraw your commission.' },
  delivery: { type: 'text', sender: '+1 (202) 555-0146', message: 'USPS: Your package could not be delivered. Please pay the redelivery fee of $1.99 within 2 hours to avoid return to sender. Update your payment details here: https://usps-redelivery.example/confirm' },
  account: { type: 'email', sender: 'PayPal Security <security@paypal-account.example>', message: 'Dear customer,\n\nYour PayPal account will be suspended. Urgent: verify your password and security code immediately to restore access.\n\nhttps://paypal.com.verify-account.example/login\n\nPayPal Security Team' },
  normal: { type: 'text', sender: 'Alex', message: 'Hey! Are we still meeting for coffee at the campus café tomorrow at 3? I’ll bring the notes from our study group. See you there!' },
  otp: { type: 'text', sender: 'Fictional sign-in service', message: 'Your verification code is 123456. Do not share this code. It expires in 10 minutes.' },
  deadline: { type: 'email', sender: 'teacher@campus.example', message: 'Urgent: please bring your essay to class within 2 hours. We need it for our discussion.' },
};
