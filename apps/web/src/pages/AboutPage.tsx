import { Link } from 'react-router-dom';
import { INITIAL_APPROVALS, CONTACTS_PER_APPROVAL } from '@vklube/shared';
import { Hint } from '../components/Hint';
import styles from './AboutPage.module.css';

export function AboutPage() {
  return (
    <article className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroEmoji} aria-hidden="true">
          🤝
        </span>
        <h1 className={styles.heroTitle}>Как работает Вастрик.ВКлубе</h1>
        {/* <p className={styles.heroSubtitle}>
          Приложение для знакомств на кэмпе.
        </p> */}
      </header>

      <aside className={styles.tldr} aria-label="Коротко о приложении">
        <span className={styles.tldrEmoji} aria-hidden="true">
          ⚡
        </span>
        <p className={styles.tldrText}>
          <strong>Коротко:</strong> найди человека, отметь встречу, подтверди у
          свидетеля. Работает <strong>офлайн</strong> ☝️
        </p>
      </aside>

      <section className={styles.section} aria-labelledby="about-howto">
        <h2 id="about-howto" className={styles.sectionTitle}>
          Как познакомиться
        </h2>
        <ol className={styles.steps}>
          <li className={styles.step}>
            <span className={styles.stepBadge} aria-hidden="true">
              1
            </span>
            <div className={styles.stepBody}>
              <h3 className={styles.stepTitle}>Найди человека</h3>
              <div className={styles.stepDesc}>
                Открой его профиль, приложив телефон к NFC-метке, или введи{' '}
                <Hint label={<>username</>}>
                  Это не ник из клуба 🤓 — точный юзернейм придётся спросить.
                  Свой ты найдёшь в профиле, он легко запоминается.
                </Hint>{' '}
                в адресной строке.
                <br />
                Например: <code>vk.vas3k.cloud/smart_dura4ok</code>
              </div>
            </div>
          </li>
          <li className={styles.step}>
            <span className={styles.stepBadge} aria-hidden="true">
              2
            </span>
            <div className={styles.stepBody}>
              <h3 className={styles.stepTitle}>Нажми «Я познакомился»</h3>
              <p className={styles.stepDesc}>
                Теперь ваш контакт создан. А если хочешь чтобы встреча была 
                  <Hint label={<>засчитана</>}>
                    Подтверждённые встречи участвуют в {' '}
                    <Hint label={'Либерборде'}>
                      В <Link to="/leaderboard">«Либерборде»</Link> список топ-10 самых общительных кэмперов, но без количеств их знакомств. Чем больше контактов, тем ты выше в рейтинге.
                    </Hint>
                      и за них ты получишь дополнительные{' '}
                    <Hint label="ачивки">Ну {' '}
                      <Hint label="достижения"> Как в играх или в клубе — за определённые результаты вы выдадим забавные титулы. Титулов много, победить можно по-разному.
                      </Hint>
                    </Hint>
                  </Hint> после окончания игры.
                  ...
              </p>
            </div>
          </li>
          <li className={styles.step}>
            <span className={styles.stepBadge} aria-hidden="true">
              3
            </span>
            <div className={styles.stepBody}>
              <h3 className={styles.stepTitle}>Найди <Hint label="свидетеля">
                  Свидетель — любой участник кэмпа, который рядом. Если рядом
                  никого нет — не страшно, можно подтвердить позже.
                </Hint></h3>
              <div className={styles.stepDesc}>
                Нажми кнопку «Есть свидетель» и назови{' '}
                <Hint label={<>код</>}>
                  4-значный номер, который появится после нажатия.
                  Сообщи его свидетелю, чтобы он мог подтвердить новый контакт.
                </Hint>.<br/>
                <Hint label={<>Любой</>}>
                  Ну почти: у всех есть{' '}
                  <Hint label={<>«апрувы»</>}>
                  Апрувы тратит свидетель, а не ты. Всем на старте выдаётся по {INITIAL_APPROVALS} апрувов, а затем по одному за каждые {CONTACTS_PER_APPROVAL} новых знакомства — обоим участникам встречи.
                  </Hint> и они ограничены, особенно если не заводить новых контактов.
                </Hint>{' '}
                третий кэмпер открывает вкладку{' '}
                <Link to="/witness">«Свидетель»</Link> и вводит ваш код. Это
                защита от злых духов.
              </div>
            </div>
          </li>
          <li className={styles.step}>
            <span className={styles.stepBadge} aria-hidden="true">
              4
            </span>
            <div className={styles.stepBody}>
              <h3 className={styles.stepTitle}>Готово</h3>
              <p className={styles.stepDesc}>
                Встреча подтверждена, контакт сохранён. Найди его в разделе{' '}
                <Link to="/contacts">«Контакты»</Link>.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="about-sections">
        <h2 id="about-sections" className={styles.sectionTitle}>
          Разделы приложения
        </h2>
        <ul className={styles.cards}>
          <li>
            <article className={styles.card}>
              <span className={styles.cardIcon} aria-hidden="true">
                🏠
              </span>
              <h3 className={styles.cardTitle}>Главная</h3>
              <p className={styles.cardText}>
                Твоя статистика, последние встречи и быстрый доступ к профилю.
              </p>
            </article>
          </li>
          <li>
            <article className={styles.card}>
              <span className={styles.cardIcon} aria-hidden="true">
                👥
              </span>
              <h3 className={styles.cardTitle}>Контакты</h3>
              <p className={styles.cardText}>
                Все, с кем ты познакомился. С историей и заметками.
              </p>
            </article>
          </li>
          <li>
            <article className={styles.card}>
              <span className={styles.cardIcon} aria-hidden="true">
                🏆
              </span>
              <h3 className={styles.cardTitle}>Либерборд</h3>
              <p className={styles.cardText}>
                Список топ-10 самых активных нетворкеров на кэмпе по версии этого приложения.
              </p>
            </article>
          </li>
          <li>
            <article className={styles.card}>
              <span className={styles.cardIcon} aria-hidden="true">
                👁️
              </span>
              <h3 className={styles.cardTitle}>Свидетель</h3>
              <p className={styles.cardText}>
                Найди знакомящихся клубней — если они заводят новый контакт, помоги им подтвердить его.
              </p>
            </article>
          </li>
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="about-faq">
        <h2 id="about-faq" className={styles.sectionTitle}>
          Вопросы
        </h2>
        <div className={styles.faq}>
          <details className={styles.faqItem}>
            <summary>А если на кэмпе нет интернета?</summary>
            <p className={styles.faqAnswer}>
              Всё работает офлайн. Встречи и подтверждения сохраняются на устройстве
              и автоматически синхронизируются, как только появится связь.
            </p>
          </details>
          <details className={styles.faqItem}>
            <summary>Зачем нужен свидетель?</summary>
            <p className={styles.faqAnswer}>
              Чтобы нельзя было «накрутить» знакомства в одиночку и чтобы было веселее. Встреча и без него засчитается, но не пойдёт в общий зачёт.
            </p>
          </details>
          <details className={styles.faqItem}>
            <summary>Можно установить как приложение?</summary>
            <p className={styles.faqAnswer}>
              Да. Это PWA: на Android появится баннер «Установить», на iOS — открой
              в Safari, нажми «Поделиться» → «На экран Домой».
            </p>
          </details>
          <details className={styles.faqItem}>
            <summary>Что такое username?</summary>
            <p className={styles.faqAnswer}>
              Твой позывной для приложения — то, что после слэша в твоей ссылке. Его удобно использовать на NFC-метке. Он содежит твой юзернейм из клуба и ещё одно слово.
            </p>
          </details>
        </div>
      </section>

      <footer className={styles.cta}>
        <Link to="/" className={styles.ctaButton}>
          Поехали 🚀
        </Link>
        <p className={styles.ctaHint}>Знакомься, Вася ждёт.</p>
      </footer>
    </article>
  );
}
