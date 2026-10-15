// These are hand-authored request patterns, not a translation dictionary or a
// multilingual trained model. Both Chinese writing systems are checked.
export const LANGUAGES = [
  { code: 'en', name: 'English' }, { code: 'es', name: 'Spanish · Español' },
  { code: 'zh', name: 'Chinese · 简体中文' }, { code: 'zh-Hant', name: 'Chinese · 繁體中文' },
];
export const languageName = code => LANGUAGES.find(item => item.code === code)?.name ?? code;
const rule = (id, pattern) => ({ id, pattern });
export const LANGUAGE_RULES = {
  es: [
    rule('credentials', /\b(?:env[ií]a(?:nos|me)?|enviar|env[ií]e(?:nos|me)?|manda(?:nos|me)?|comparte|comparta|proporciona|proporcione|dime|d[ií]ganos|responde\s+con)\b[^.!?\n]{0,65}?\b(?:contrase[nñ]a|clave\s+de\s+acceso|pin|otp|c[oó]digo\s+(?:de\s+(?:verificaci[oó]n|seguridad|autenticaci[oó]n)|de\s+un\s+solo\s+uso))\b/giu),
    rule('credentials-entry', /\b(?:introduce|introduzca|ingresa|ingrese|verifica|verifique|confirma|confirme)\b[^.!?\n]{0,65}?\b(?:contrase[nñ]a|pin|c[oó]digo\s+de\s+(?:verificaci[oó]n|seguridad))\b/giu),
    rule('financial-info', /\b(?:env[ií]a|env[ií]e|comparte|comparta|proporciona|proporcione|introduce|introduzca|actualiza|actualice)\b[^.!?\n]{0,65}?\b(?:n[uú]mero\s+de\s+(?:seguro\s+social|tarjeta)|datos\s+(?:bancarios|de\s+(?:tu\s+)?tarjeta)|cuenta\s+bancaria)\b/giu),
    rule('unusual-payment', /\b(?:paga|pague|pagar|pago|env[ií]a|env[ií]e|transfiere|transferir)\b[^.!?\n]{0,60}?\b(?:tarjetas?\s+de\s+regalo|bitcoin|criptomonedas?|western\s+union|moneygram)\b/giu),
    rule('gift-card-codes', /\b(?:env[ií]a|env[ií]e|comparte|comparta|manda)\b[^.!?\n]{0,50}?\b(?:c[oó]digos?|n[uú]meros?|fotos?)\b[^.!?\n]{0,35}?\btarjetas?\s+de\s+regalo\b/giu),
    rule('safe-account', /\b(?:transfiere|transfiera|transferir|mueve|mueva|env[ií]a|env[ií]e)\b[^.!?\n]{0,50}?\b(?:dinero|fondos|ahorros|saldo)\b[^.!?\n]{0,65}?\b(?:cuenta\s+(?:segura|protegida)|proteger(?:los|lo|\s+tu\s+dinero)?)\b/giu),
    rule('fake-check', /\b(?:deposita|deposite|cobra|cobre)\b[^.!?\n]{0,40}?\bcheque\b[\s\S]{0,140}?\b(?:devuelve|devuelva|env[ií]a|env[ií]e|transfiere)\b[^.!?\n]{0,45}?\b(?:diferencia|resto|sobrante|de\s+vuelta)\b/giu),
    rule('advance-fee', /\b(?:paga|pague|deposita|deposite|env[ií]a|env[ií]e)\b[^.!?\n]{0,65}?\b(?:desbloquear|retirar|recibir|reclamar|liberar)\b[^.!?\n]{0,45}?\b(?:ganancias|salario|comisi[oó]n|premio|recompensa)\b/giu),
    rule('task-job', /\b(?:gana|ganar|pagamos|comisi[oó]n|trabajo)\b[^.!?\n]{0,65}?\b(?:dar\s+me\s+gusta\s+a\s+videos|calificar\s+productos|tareas\s+de\s+optimizaci[oó]n)\b/giu),
    rule('remote-access', /\b(?:instala|instale|descarga|descargue|permite|permita|habilita|habilite)\b[^.!?\n]{0,45}?\b(?:anydesk|teamviewer|acceso\s+remoto|escritorio\s+remoto)\b/giu),
    rule('investment', /\b(?:ganancias?\s+garantizadas?|rendimientos?\s+garantizados?|inversi[oó]n\s+sin\s+riesgo|duplica\s+tu\s+dinero)\b/giu),
    rule('secrecy', /\b(?:mant[eé]n(?:ga)?\s+(?:esto|lo)\s+(?:en\s+secreto|confidencial)|no\s+(?:se\s+lo\s+digas\s+a\s+nadie|digas\s+nada\s+a\s+nadie|contactes\s+(?:a\s+)?(?:tu|el)\s+banco|hables\s+con\s+tu\s+familia))\b/giu),
    rule('prize', /\b(?:has\s+ganado|ganaste|reclama\s+tu\s+(?:premio|recompensa)|ganador\s+de\s+la\s+loter[ií]a)\b/giu),
    rule('account-threat', /\b(?:cuenta\b[^.!?\n]{0,35}?\b(?:suspendida|bloqueada|cerrada)|(?:suspenderemos|bloquearemos|cerraremos)\s+tu\s+cuenta)\b/giu),
    rule('urgency', /\b(?:urgente|inmediatamente|act[uú]a\s+ahora|[uú]ltimo\s+aviso|en\s+(?:\d+|dos|una)\s+(?:horas?|minutos?))\b/giu),
    rule('payment', /\b(?:pago\s+(?:pendiente|requerido|vencido)|paga\s+(?:la|el|tu)|tarifa\s+de\s+(?:entrega|reenv[ií]o))\b/giu),
    rule('login-link', /\b(?:inicia|inicie)\s+sesi[oó]n\b|\b(?:verifica|verifique|confirma|confirme)\s+(?:tu|su)\s+(?:cuenta|identidad)\b/giu),
    rule('toll-payment', /\bpeajes?\s+(?:pendientes?|impagados?|vencidos?)\b/giu),
  ],
  zh: [
    rule('credentials', /(?:发[送給给]|傳送|发送|發送|提供|分享|告[诉訴]|转发|轉發|回复|回覆)[^。！？.!?\n]{0,40}?(?:密[码碼]|口令|驗證碼|验证码|安全[码碼]|动态码|動態碼|一次性密[码碼]|otp|pin)/giu),
    rule('credentials', /(?:密[码碼]|口令|驗證碼|验证码|安全[码碼]|动态码|動態碼|otp|pin)[^。！？.!?\n]{0,25}?(?:发给|發給|发送给|發送給|提供给|提供給|告[诉訴]|分享给|分享給|转发给|轉發給|回复给|回覆給)/giu),
    rule('credentials-entry', /(?:[输輸]入|[验驗][证證]|[确確][认認])[^。！？.!?\n]{0,30}?(?:密[码碼]|驗證碼|验证码|安全[码碼]|pin)/giu),
    rule('financial-info', /(?:提供|发[送給给]|發送|分享|[输輸]入|更新)[^。！？.!?\n]{0,35}?(?:[银銀]行卡[号號]|信用卡[号號]|[银銀]行[账帳]戶|银行[账帳]户|身份[证證][号號]|支付[资資]料)/giu),
    rule('unusual-payment', /(?:支付|付款|[转轉][账帳]|[汇匯]款)[^。！？.!?\n]{0,35}?(?:礼品卡|禮品卡|比特[币幣]|加密[货貨][币幣]|西[联聯][汇匯]款)|(?:礼品卡|禮品卡|比特[币幣]|加密[货貨][币幣])[^。！？.!?\n]{0,20}?(?:支付|付款|[转轉][账帳])/giu),
    rule('gift-card-codes', /(?:发[送給给]|發送|提供|分享)[^。！？.!?\n]{0,30}?(?:礼品卡|禮品卡)[^。！？.!?\n]{0,20}?(?:代[码碼]|[卡密碼号號]|照片)/giu),
    rule('safe-account', /(?:[转轉][账帳]|[转轉]移|[汇匯]入|[转轉]入)[^。！？.!?\n]{0,40}?(?:[资資]金|存款|[储儲]蓄|[钱錢]|[余餘][额額])[^。！？.!?\n]{0,40}?(?:安全[账帳][户戶]|保[护護][账帳][户戶]|保[护護](?:你的)?[资資]金)/giu),
    rule('safe-account', /(?:[资資]金|存款|[储儲]蓄|[钱錢]|[余餘][额額])[^。！？.!?\n]{0,20}?(?:[转轉]入|[转轉]移|[汇匯]入)[^。！？.!?\n]{0,25}?(?:安全[账帳][户戶]|保[护護][账帳][户戶])/giu),
    rule('fake-check', /(?:存入|存[进進]|兌現|兑现)[^。！？.!?\n]{0,30}?支票[\s\S]{0,100}?(?:退[还還]|[转轉][账帳]|[汇匯]回)[^。！？.!?\n]{0,30}?(?:差[额額]|剩[余餘]|[余餘]款)/giu),
    rule('advance-fee', /(?:支付|付款|充值|交[纳納]|存入)[^。！？.!?\n]{0,40}?(?:解[锁鎖]|提[现現]|[领領]取|[释釋]放)[^。！？.!?\n]{0,30}?(?:佣金|工[资資]|薪水|[奖獎]金|[奖獎]品|收益)/giu),
    rule('task-job', /(?:[赚賺]|佣金|收入|有[偿償])[^。！？.!?\n]{0,40}?(?:刷[单單]|[点點][赞讚]|[优優]化任[务務]|[产產]品[评評]分)/giu),
    rule('remote-access', /(?:安装|安裝|下[载載]|允[许許]|[启啟]用)[^。！？.!?\n]{0,30}?(?:anydesk|teamviewer|[远遠]程(?:控制|[访訪][问問]|桌面)|[远遠]端(?:控制|存取))/giu),
    rule('investment', /(?:保[证證](?:[获獲]利|盈利|收益)|(?:稳赚|穩賺)不[赔賠]|[无無][风風][险險]投[资資]|投[资資]翻倍|[资資]金翻倍)/giu),
    rule('secrecy', /(?:不要|[请請]勿|别|別)[^。！？.!?\n]{0,12}?(?:告[诉訴]任何人|[联聯][系繫][银銀]行|[联聯]絡[银銀]行|和家人[说說])|(?:[请請])?(?:保密|保守秘密)/giu),
    rule('prize', /(?:你(?:已[经經])?(?:中[奖獎]|[获獲]得[奖獎]品)|[领領]取(?:你的)?[奖獎]品|彩票中[奖獎])/giu),
    rule('account-threat', /(?:[账帳][户戶]|[账帳][号號])[^。！？.!?\n]{0,25}?(?:[冻凍][结結]|封[锁鎖]|停用|[关關][闭閉]|[锁鎖]定)/giu),
    rule('urgency', /(?:[紧緊]急|立即|马上|馬上|最[后後](?:警告|通知)|(?:\d+|一|两|兩|二|三|十)[分小][钟時时]?[^。！？.!?\n]{0,3}?(?:[内內]|到期)|\d+\s*(?:小[时時]|分[钟鐘])[内內])/giu),
    rule('payment', /(?:支付[费費]用|支付[运運][费費]|付款失[败敗]|[费費]用逾期|[补補]交[费費]用|[补補]交[运運][费費])/giu),
    rule('login-link', /(?:登[录錄入]|[验驗][证證](?:你的)?(?:身份|[账帳][户戶])|[确確][认認](?:你的)?[账帳][户戶])/giu),
    rule('toll-payment', /(?:未[缴繳](?:纳|納)?[过過]路[费費]|[过過]路[费費](?:欠[费費]|未付)|[通道]行[费費]欠[费費])/giu),
  ],
};

export function isLanguageNegated(text, start, code) {
  // Approximate clause-local safeguards, not general language understanding.
  const prefix = text.slice(Math.max(0, start - 100), start).split(/[.!?。！？\n;；]|\b(?:pero|sin embargo)\b|但是|但|不过|不過/iu).at(-1);
  if (code === 'es') return /\b(?:no|nunca|jam[aá]s|evita|evite|no\s+debes)\b[^.!?]{0,65}$|\b(?:estafadores|ejemplo\s+de\s+estafa)\b[^.!?]{0,65}$/iu.test(prefix);
  return /(?:不要|[请請]勿|不[应應]|不能|切勿|永[远遠]不|[绝絕]不|[骗騙]子(?:会|會)|[诈骗詐騙]示例)[^。！？]{0,50}$/u.test(prefix);
}

export function sourceScriptMismatch(text, code) {
  // Avoid a reassuring zero when a clearly different writing system was selected.
  // Strip URLs, which may legitimately have internationalized hostnames.
  const prose = text.replace(/(?:https?:\/\/|hxxps?:\/\/|www\.)\S+/giu, '');
  if (code === 'en' || code === 'es') return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Devanagari}\p{Script=Hangul}]{3}/u.test(prose);
  return /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Devanagari}\p{Script=Hangul}]{3}/u.test(prose);
}
