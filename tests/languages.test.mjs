import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMessage, highlightRanges } from '../dist/analyzer.mjs';
import { SAMPLES } from '../dist/samples.mjs';
import { getFindingExplanation } from '../dist/explanations.mjs';
import { hasTranslator, translateToEnglish } from '../dist/translator.mjs';
const check = (message, language, extra = {}) => analyzeMessage({ message, language, type: 'text', ...extra });
const has = (result, id) => result.findings.some(f => f.id === id);

const scenarios = [
  ['es', 'Envíame tu código de verificación.', 'credentials'],
  ['es', 'Proporcione sus datos bancarios.', 'financial-info'],
  ['es', 'Paga con tarjetas de regalo.', 'unusual-payment'],
  ['es', 'Envía fotos de las tarjetas de regalo.', 'gift-card-codes'],
  ['es', 'Deposita el cheque y devuelve la diferencia.', 'fake-check'],
  ['es', 'Deposita 80 euros para desbloquear tus ganancias.', 'advance-fee'],
  ['es', 'Gana dinero por tareas de optimización.', 'task-job'],
  ['es', 'Instala AnyDesk para el soporte técnico.', 'remote-access'],
  ['es', 'Inversión sin riesgo y ganancias garantizadas.', 'investment'],
  ['es', 'Tu cuenta será suspendida. Actúa ahora.', 'account-threat'],
  ['es', 'Has ganado. Reclama tu premio.', 'prize'],
  ['es', 'Peajes pendientes: paga aquí https://toll.example/pago', 'toll-payment'],
  ['es', 'Inicia sesión aquí https://account.example/login', 'login-link'],
  ['zh', '请把验证码发给我。', 'credentials'],
  ['zh', '请提供你的银行卡号。', 'financial-info'],
  ['zh', '请用比特币付款。', 'unusual-payment'],
  ['zh', '请付款购买礼品卡。', 'unusual-payment'],
  ['zh', '请发送礼品卡的照片。', 'gift-card-codes'],
  ['zh', '请将您的资金转入安全账户。', 'safe-account'],
  ['zh', '存入支票后，请退还剩余款项。', 'fake-check'],
  ['zh', '请充值80元以解锁佣金。', 'advance-fee'],
  ['zh', '赚佣金，只需点赞视频。', 'task-job'],
  ['zh', '请安装远程控制软件AnyDesk。', 'remote-access'],
  ['zh', '投资稳赚不赔。', 'investment'],
  ['zh', '账户将被冻结，请立即操作。', 'account-threat'],
  ['zh', '你已中奖，请领取你的奖品。', 'prize'],
  ['zh', '未缴过路费，支付 https://toll.example/pay。', 'toll-payment'],
  ['zh', '登录 https://account.example/login。', 'login-link'],
  ['zh-Hant', '請將你的驗證碼發給我。', 'credentials'],
  ['zh-Hant', '請轉移你的資金到安全帳戶。請保密。', 'safe-account'],
  ['zh-Hant', '請充值以解鎖佣金。', 'advance-fee'],
];
for (const [language, message, id] of scenarios) test(`${language}: ${id}: ${message}`, () => {
  const result = check(message, language);
  assert.ok(has(result, id), result.findings.map(f => f.id).join(', '));
  assert.equal(result.smsModel, null);
  for (const finding of result.findings) for (const evidence of finding.evidence) if (evidence.source === 'message') assert.equal(result.message.slice(evidence.start, evidence.end), evidence.text);
});

test('Chinese punctuation does not become part of a link destination', () => {
  for (const ending of ['。', '，请登录', '；立即登录']) {
    const result = check('请阅读 https://account.example' + ending, 'zh');
    assert.equal(result.links[0].host, 'account.example');
    assert.equal(result.links[0].raw, 'https://account.example');
  }
});

test('native bank examples detect money and secrecy without running the English model', () => {
  for (const sample of [SAMPLES.spanish, SAMPLES.chinese]) {
    const result = analyzeMessage(sample); assert.equal(result.level, 'high');
    assert.ok(has(result, 'safe-account')); assert.ok(has(result, 'secrecy')); assert.equal(result.smsModel, null);
  }
});
test('ordinary conversations, gift-card shopping, code notices and safety advice are not theft requests', () => {
  for (const [language, message] of [
    ['es', 'Hola, ¿tomamos café mañana a las tres?'], ['es', 'Compré una tarjeta de regalo para tu cumpleaños.'],
    ['es', 'Tu código de verificación es 123456. No compartas este código.'], ['es', 'Nunca proporcione su contraseña.'],
    ['es', 'No paga con tarjetas de regalo.'], ['es', 'No transfiere sus ahorros a una cuenta segura.'],
    ['zh', '明天三点一起喝咖啡吗？'], ['zh', '我买了礼品卡作为生日礼物。'],
    ['zh', '你的验证码是123456，请勿分享。'], ['zh', '不要把验证码发给陌生人。'],
    ['zh', '请把密码记住。'], ['zh', '不要转移资金到安全账户。'],
    ['zh-Hant', '請勿提供你的密碼。'], ['zh-Hant', '你的驗證碼是123456，請勿分享。'],
  ]) {
    const result = check(message, language);
    for (const id of ['credentials','unusual-payment','safe-account']) assert.equal(has(result, id), false, `${language}: ${message}: ${id}`);
    assert.ok(result.score < 15, `${message}: ${result.score}`);
  }
});
test('native clause negation does not hide a new positive request', () => {
  assert.ok(has(check('Nunca proporcione su contraseña. Pero envía tu código de verificación.', 'es'), 'credentials'));
  assert.ok(has(check('不要分享验证码。但是请把验证码发给我。', 'zh'), 'credentials'));
});
test('translated evidence retains separate offsets and cannot rewrite original destinations', () => {
  const result = check('請閱讀通知： https://paypal.com@evil.example/login。', 'zh-Hant', {translation:'Send your password now. Visit https://www.paypal.com/login.'});
  assert.equal(result.coverage, 'translation-assisted'); assert.equal(result.smsModel, null);
  assert.equal(result.links.length, 1); assert.equal(result.links[0].host, 'evil.example');
  assert.ok(has(result, 'userinfo-link'));
  const credential = result.findings.find(f => f.id === 'credentials');
  assert.equal(credential.evidence[0].source, 'translation');
  assert.equal(result.translation.slice(credential.evidence[0].start, credential.evidence[0].end), credential.evidence[0].text);
  assert.match(getFindingExplanation(credential, result).found, /English translation/);
  assert.ok(highlightRanges(result).every(range => result.message.slice(range.start, range.end).includes('evil.example')));
});
test('duplicate native and translated signals count once, with both evidence sources labeled', () => {
  const original = check('Envíame tu código de verificación.', 'es');
  const combined = check(original.message, 'es', {translation:'Send me your verification code.'});
  assert.equal(combined.score, original.score);
  const credential = combined.findings.find(f => f.id === 'credentials');
  assert.equal(combined.findings.filter(f => f.id === 'credentials').length, 1);
  assert.deepEqual(new Set(credential.evidence.map(e => e.source)), new Set(['message','translation']));
});
test('a translated sign-in signal requires a link in the original, not an invented translation link', () => {
  assert.equal(has(check('请阅读通知。', 'zh', {translation:'Sign in at https://evil.example/login.'}), 'login-link'), false);
});
test('script mismatch yields a limited check rather than a reassuring low label', () => {
  const result = check('Ваш код проверки 123456. Никому не сообщайте.', 'en');
  assert.equal(result.coverage, 'limited'); assert.equal(result.label, 'Limited check'); assert.equal(result.smsModel, null);
  assert.equal(check('请提供验证码。', 'en').coverage, 'limited');
  assert.throws(() => check('Hello.', 'fr'), /Choose English/);
  assert.throws(() => check('你好。', 'zh', {translation:'x'.repeat(20001)}), /translation under/);
});
test('browser translation is optional and unsupported browsers get a useful fallback', async () => {
  assert.equal(hasTranslator(null), false);
  await assert.rejects(translateToEnglish('Hola', 'es', {api:null}), /Direct|direct language checks/);
  await assert.rejects(translateToEnglish('Hola', 'es', {api:{availability:async()=> 'unavailable',create(){throw Error('must not run');}}}), /cannot translate/);
});
test('on-device wrapper passes the source pair, reports progress, and frees the translator', async () => {
  let destroyed = 0, progress;
  const api = { availability:async options => {assert.deepEqual(options,{sourceLanguage:'zh-Hant',targetLanguage:'en'}); return 'downloadable';}, create:async options => {
    options.monitor({addEventListener(event,listener){assert.equal(event,'downloadprogress');listener({loaded:0.75});}});
    return {translate:async text => {assert.equal(text,'你好');return 'Hello';},destroy(){destroyed++;}};
  }};
  assert.equal(await translateToEnglish('你好','zh-Hant',{api,onProgress:value=>progress=value}), 'Hello');
  assert.equal(progress,75); assert.equal(destroyed,1);
});
test('cancelled and failed translation releases resources and never returns stale output', async () => {
  const controller = new AbortController(); let destroyed = 0;
  const api = {availability:async()=> 'available',create:async()=>({translate:async()=>{controller.abort();return 'Stale';},destroy(){destroyed++;}})};
  await assert.rejects(translateToEnglish('Hola','es',{api,signal:controller.signal}), {name:'AbortError'});
  assert.equal(destroyed,1);
  const failed = {availability:async()=> 'available',create:async()=>({translate:async()=>{throw Error('model error');},destroy(){destroyed++;}})};
  await assert.rejects(translateToEnglish('Hola','es',{api:failed}), /model error/); assert.equal(destroyed,2);
});
