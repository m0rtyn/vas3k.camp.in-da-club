import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { useMeetingsStore } from '../store/meetings';
import { api } from '../lib/api';
import { APPROVALS_HINT, type Meeting } from '@vklube/shared';
import styles from './WitnessPage.module.css';
import { Hint } from '@/components/Hint';

export function WitnessPage() {
  const { user } = useAuthStore();
  const { confirmAsWitness } = useMeetingsStore();
  const [digits, setDigits] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedMeeting, setConfirmedMeeting] = useState<Meeting | null>(null);
  const [witnessedList, setWitnessedList] = useState<Meeting[]>([]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const approvals = user?.approvals_available ?? 0;

  const loadWitnessed = async () => {
    try {
      const list = await api.get<Meeting[]>('/meetings/witnessed');
      setWitnessedList(list);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadWitnessed();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    setError(null);

    // Auto-advance to next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      setDigits(pasted.split(''));
      inputRefs.current[3]?.focus();
    }
  };

  const handleSubmit = async () => {
    const code = digits.join('');
    if (code.length !== 4) {
      setError('Введите 4-значный код');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const meeting = await confirmAsWitness(code);
      setConfirmedMeeting(meeting);
      loadWitnessed();
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || 'Ошибка подтверждения';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (confirmedMeeting) {
    return (
      <div className={styles.page}>
        <div className={styles.success}>
          <div className={styles.successIcon}>✓</div>
          <div className={styles.successText}>Встреча подтверждена!</div>
          <div className={styles.description}>
            @{confirmedMeeting.initiator_username} и @{confirmedMeeting.target_username}
          </div>
          <button
            className={styles.submitButton}
            onClick={() => {
              setConfirmedMeeting(null);
              setDigits(['', '', '', '']);
            }}
          >
            Подтвердить ещё
          </button>
        </div>
      </div>
    );
  }

  // No approvals
  if (approvals === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.icon}>👁️</div>
        <div className={styles.title}>Свидетель</div>
        <div className={styles.noApprovals}>
          У вас нет доступных апрувов. Знакомьтесь с людьми, чтобы получить новые!
        </div>
        <WitnessedList list={witnessedList} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.icon}>👁️</div>
      <div className={styles.title}>Свидетель</div>
      <div className={styles.description}>
        Введите код, который показывают участники встречи
      </div>

      <div className={styles.balance}>
        Доступно апрувов {' '}
        <Hint label="">
          {APPROVALS_HINT}
        </Hint>: <span className={styles.balanceCount}>{approvals}</span>
      </div>

      <div className={styles.codeInputs} onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={styles.digitInput}
            autoFocus={i === 0}
          />
        ))}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <button
        className={styles.submitButton}
        onClick={handleSubmit}
        disabled={isLoading || digits.join('').length !== 4}
      >
        {isLoading ? 'Подтверждаю...' : 'Подтвердить встречу'}
      </button>

      <WitnessedList list={witnessedList} />
    </div>
  );
}

function WitnessedList({ list }: { list: Meeting[] }) {
  if (list.length === 0) return null;

  return (
    <div className={styles.witnessedSection}>
      <div className={styles.witnessedTitle}>
        Вы подтвердили ({list.length})
      </div>
      <div className={styles.witnessedList}>
        {list.map((m) => {
          const date = new Date(m.confirmed_at || m.created_at).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });
          return (
            <div key={m.id} className={styles.witnessedItem}>
              <div className={styles.witnessedPair}>
                @{m.initiator_username} ↔ @{m.target_username}
              </div>
              <div className={styles.witnessedDate}>{date}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
