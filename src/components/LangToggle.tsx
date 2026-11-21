import { cx } from '../lib/cards';
import { setLang, useLang } from '../lib/i18n/lang';

/** Home: tiny EN | हिन्दी switch, for guests too */
export function LangToggle() {
  const lang = useLang();
  return (
    <div className="lang-toggle" role="group" aria-label="Language" data-no-translate>
      <button className={cx(lang === 'en' && 'on')} aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
        EN
      </button>
      <span aria-hidden>|</span>
      <button className={cx(lang === 'hi' && 'on')} aria-pressed={lang === 'hi'} lang="hi" onClick={() => setLang('hi')}>
        हिन्दी
      </button>
    </div>
  );
}
