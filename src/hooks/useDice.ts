import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, db, collections } from '../firebase';
import type { HistoryItem } from '../types';
import { getTodayDate, rollDice, getDeviceFingerprint } from '../utils/dice';

// 端末ローカルの最終ロール日を保存する localStorage キー
const LOCAL_LAST_ROLL_KEY = 'lastRollDate';

// 本日すでにロール済みかを判定する。
// 制限の本体はデバイスフィンガープリント（端末ごとに 1 日 1 回）。
// localStorage はフィンガープリント取得に失敗する端末向けの保険。
// users コレクションは判定に使わず、履歴・結果の保存専用とする。
const checkRolledToday = async (
  today: string,
  cachedFp: string | null = null
): Promise<{ rolledToday: boolean; fingerprint: string | null }> => {

  // 制限の本体：デバイスフィンガープリント
  const fp = cachedFp ?? (await getDeviceFingerprint());
  if (fp) {
    const fpDocSnap = await getDoc(doc(db, collections.fingerprints, fp));
    if (fpDocSnap.exists() && fpDocSnap.data()?.lastRollDate === today) {
      return { rolledToday: true, fingerprint: fp };
    }
  }

  // 保険：端末ローカル（localStorage）
  if (localStorage.getItem(LOCAL_LAST_ROLL_KEY) === today) {
    return { rolledToday: true, fingerprint: cachedFp };
  }

  return { rolledToday: false, fingerprint: fp };
};

// ロール結果を保存する。
// localStorage（保険）・Firestore の users（履歴・結果の保存専用）・
// fingerprint（制限の本体）の 3 か所へまとめて書き込む。
const saveRollResult = async (
  uid: string,
  fp: string | null,
  today: string,
  resultString: string
): Promise<void> => {
  // 端末ローカル（localStorage）にロール日を保存（保険）
  localStorage.setItem(LOCAL_LAST_ROLL_KEY, today);

  // Firestore（users）に履歴・結果を保存
  await setDoc(doc(db, collections.users, uid), {
    lastRollDate: today,
    lastRollResult: resultString,
    updatedAt: Timestamp.now()
  }, { merge: true });

  // Firestore（fingerprint）に端末単位のロール情報を保存
  if (fp) {
    await setDoc(doc(db, collections.fingerprints, fp), {
      lastRollDate: today,
      lastRollResult: resultString,
      lastUid: uid,
      updatedAt: Timestamp.now()
    }, { merge: true });
  }
};

export const useDice = () => {
  const [number, setNumber] = useState<string[]>(['0', '0', '0', '0', '0']);
  const [isEnd, setEnd] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(true);
  const [hasRolledToday, setHasRolledToday] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true);
        // Firebase 匿名認証
        const userCredential = await signInAnonymously(auth);
        const user = userCredential.user;

        // ユーザードキュメントの取得または作成（users は履歴・結果の保存専用）
        const userDocRef = doc(db, collections.users, user.uid);
        const userDocSnap = await getDoc(userDocRef);
        const today = getTodayDate();

        if (!userDocSnap.exists()) {
          // 初回ユーザーの場合、ドキュメント作成
          await setDoc(userDocRef, {
            createdAt: Timestamp.now(),
            lastRollDate: null
          });
        }

        // 本日ロール済みかを判定（fingerprint が本体、localStorage は保険）
        const { rolledToday, fingerprint: fp } = await checkRolledToday(today);
        if (fp) setFingerprint(fp);
        if (rolledToday) setHasRolledToday(true);

        // クッキーからキャッシュを読み込み
        const savedShowHistory = Cookies.get('showHistory');
        const savedCookieHistory = Cookies.get('history');

        if (savedShowHistory !== undefined) {
          setShowHistory(savedShowHistory === 'true');
        }

        if (savedCookieHistory !== undefined) {
          const cookieHistory = JSON.parse(savedCookieHistory);
          setHistory(cookieHistory);

          if (cookieHistory.length > 0) {
            const latestRoll = cookieHistory[0];
            setNumber(latestRoll.result.split(''));
          }
        }
      } catch (error) {
        console.error('認証エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  const randomNumber = async () => {
    const user = auth.currentUser;
    if (!user) {
      console.error('ユーザーが認証されていません');
      return;
    }

    const today = getTodayDate();

    try {
      // 本日ロール済みかを判定（fingerprint が本体、localStorage は保険）
      const { rolledToday, fingerprint: fp } = await checkRolledToday(today, fingerprint);
      if (fp && !fingerprint) setFingerprint(fp);
      if (rolledToday) {
        setHasRolledToday(true);
        return;
      }

      const num = rollDice();

      if (num[4] === '1' && num[3] === '0' && num[2] === '0' && num[1] === '0' && num[0] === '0') {
        setEnd(true);
      }

      const resultString = num.join('');

      // Firestore からユーザー情報を取得して初回判定
      const userDocRef = doc(db, collections.users, user.uid);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.data();
      const lastRollDate = userData?.lastRollDate;

      const isFirstToday = !lastRollDate || lastRollDate !== today;

      // ロール結果を localStorage と Firestore（users / fingerprint）に保存
      await saveRollResult(user.uid, fp, today, resultString);

      // クッキーにキャッシュ保存
      const newCookieHistoryItem = {
        result: resultString,
        date: today,
        isFirstToday: isFirstToday
      };
      const cookieHistoryData = history.map(item => ({
        result: item.result,
        date: item.date,
        isFirstToday: item.isFirstToday
      }));
      const newCookieHistory = [newCookieHistoryItem, ...cookieHistoryData];
      Cookies.set('history', JSON.stringify(newCookieHistory), { expires: 7 });

      // 画面表示用のデータ
      const newHistoryItem: HistoryItem = {
        result: resultString,
        date: today,
        isFirstToday: isFirstToday
      };

      const newHistory = [newHistoryItem, ...history];

      setNumber(num);
      setHistory(newHistory);
      setHasRolledToday(true);
    } catch (error) {
      console.error('ダイス振りエラー:', error);
    }
  };

  const toggleHistory = () => {
    const newShowHistory = !showHistory;
    setShowHistory(newShowHistory);
    Cookies.set('showHistory', newShowHistory.toString(), { expires: 7 });
  };

  const clearHistory = () => {
    setHistory([]);
    Cookies.remove('history');
  };

  return {
    number,
    isEnd,
    history,
    showHistory,
    hasRolledToday,
    isLoading,
    randomNumber,
    toggleHistory,
    clearHistory,
  };
};
