import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, db, collections } from '../firebase';
import type { HistoryItem } from '../types';
import { getTodayDate, rollDice, getClientIp, sanitizeIp, getDeviceFingerprint } from '../utils/dice';

export const useDice = () => {
  const [number, setNumber] = useState<string[]>(['0', '0', '0', '0']);
  const [isEnd, setEnd] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(true);
  const [hasRolledToday, setHasRolledToday] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [clientIp, setClientIp] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true);
        // Firebase 匿名認証
        const userCredential = await signInAnonymously(auth);
        const user = userCredential.user;

        // ユーザードキュメントの取得または作成
        const userDocRef = doc(db, collections.users, user.uid);
        const userDocSnap = await getDoc(userDocRef);
        const today = getTodayDate();

        if (!userDocSnap.exists()) {
          // 初回ユーザーの場合、ドキュメント作成
          await setDoc(userDocRef, {
            createdAt: Timestamp.now(),
            lastRollDate: null
          });
        } else {
          // 既存ユーザーの場合、今日振ったか確認
          const userData = userDocSnap.data();
          if (userData?.lastRollDate === today) {
            setHasRolledToday(true);
          }
        }

        // IP アドレス単位での制限チェック
        const ip = await getClientIp();
        if (ip) {
          setClientIp(ip);
          const ipDocRef = doc(db, collections.ips, sanitizeIp(ip));
          const ipDocSnap = await getDoc(ipDocRef);
          if (ipDocSnap.exists() && ipDocSnap.data()?.lastRollDate === today) {
            setHasRolledToday(true);
          }
        }

        // デバイスフィンガープリント単位での制限チェック
        const fp = await getDeviceFingerprint();
        if (fp) {
          setFingerprint(fp);
          const fpDocRef = doc(db, collections.fingerprints, fp);
          const fpDocSnap = await getDoc(fpDocRef);
          if (fpDocSnap.exists() && fpDocSnap.data()?.lastRollDate === today) {
            setHasRolledToday(true);
          }
        }

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
      // IP アドレス単位で本日のロール済みを厳密にチェック
      const ip = clientIp ?? (await getClientIp());
      let ipDocRef = null;
      if (ip) {
        if (!clientIp) setClientIp(ip);
        ipDocRef = doc(db, collections.ips, sanitizeIp(ip));
        const ipDocSnap = await getDoc(ipDocRef);
        if (ipDocSnap.exists() && ipDocSnap.data()?.lastRollDate === today) {
          // 同一 IP から本日すでにロール済み
          setHasRolledToday(true);
          return;
        }
      }

      // デバイスフィンガープリント単位で本日のロール済みをチェック
      const fp = fingerprint ?? (await getDeviceFingerprint());
      let fpDocRef = null;
      if (fp) {
        if (!fingerprint) setFingerprint(fp);
        fpDocRef = doc(db, collections.fingerprints, fp);
        const fpDocSnap = await getDoc(fpDocRef);
        if (fpDocSnap.exists() && fpDocSnap.data()?.lastRollDate === today) {
          // 同一デバイスから本日すでにロール済み
          setHasRolledToday(true);
          return;
        }
      }

      const num = rollDice();

      if (num[2] === '1' && num[1] === '0' && num[0] === '0') {
        setEnd(true);
      }

      const resultString = num.join('');

      // Firestore からユーザー情報を取得して初回判定
      const userDocRef = doc(db, collections.users, user.uid);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.data();
      const lastRollDate = userData?.lastRollDate;

      const isFirstToday = !lastRollDate || lastRollDate !== today;

      // Firestore にロール情報を保存
      await setDoc(userDocRef, {
        lastRollDate: today,
        lastRollResult: resultString,
        updatedAt: Timestamp.now()
      }, { merge: true });

      // IP アドレス単位のロール情報を保存
      if (ipDocRef) {
        await setDoc(ipDocRef, {
          lastRollDate: today,
          lastRollResult: resultString,
          lastUid: user.uid,
          updatedAt: Timestamp.now()
        }, { merge: true });
      }

      // デバイスフィンガープリント単位のロール情報を保存
      if (fpDocRef) {
        await setDoc(fpDocRef, {
          lastRollDate: today,
          lastRollResult: resultString,
          lastUid: user.uid,
          updatedAt: Timestamp.now()
        }, { merge: true });
      }

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
