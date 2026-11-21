import { cx } from '../lib/cards';
import { setLang, useLang } from '../lib/i18n/lang';

/** Profile: app language for this phone */
export function LangRow() {
  const lang = useLang();
  return (
    <section className="panel notify-row">
      <div className="setting-row">
        <div className="grow">
          <b>🌐 Language</b>
          <span>Saved on this phone</span>
        </div>
        <div className="mini-seg" role="group" aria-label="Language" data-no-translate>
          <button className={cx(lang === 'en' && 'on')} aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
            English
          </button>
          <button className={cx(lang === 'hi' && 'on')} aria-pressed={lang === 'hi'} lang="hi" onClick={() => setLang('hi')}>
            हिन्दी
          </button>
        </div>
      </div>
    </section>
  );
}
