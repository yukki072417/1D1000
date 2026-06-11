import { useState, useEffect } from 'react'
import { IoMdClipboard } from 'react-icons/io';
import Cookies from 'js-cookie'
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase'
import './App.css'

interface HistoryItem {
  result: string;
  date: string;
  isFirstToday: boolean;
}


function App() {
  const [number, setNumber] = useState<string[]>(["0", "0", "0"]);
  const [isEnd, setEnd] = useState<Boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<Boolean>(true);
  const [hasRolledToday, setHasRolledToday] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true);
        // Firebase 匿名認証
        const userCredential = await signInAnonymously(auth);
        const user = userCredential.user;

        // ユーザードキュメントの取得または作成
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        const today = new Date().toLocaleDateString('ja-JP');

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

  const getTodayDate = () => {
    return new Date().toLocaleDateString('ja-JP');
  };

  const randomNumber = async () => {
    const user = auth.currentUser;
    if (!user) {
      console.error('ユーザーが認証されていません');
      return;
    }

    const num = Math.round(Math.random() * 999).toString().padStart(3, '0').split("");

    if(
      num[2] === "1"
      && num[1] === "0"
      && num[0] === "0"
    ){
      setEnd(true);
    }

    const resultString = num.join('');
    const today = getTodayDate();

    try {
      // Firestore からユーザー情報を取得して初回判定
      const userDocRef = doc(db, 'users', user.uid);
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

  const copyToClipboard = (text: string) => {
    let content = `出たダイスは${text}だよ！\nbyゆっきー製ダイス`
    navigator.clipboard.writeText(content);
  };

  return (
    <div className='flex flex-col md:flex-row w-full min-h-screen'>
      <div className='flex-1 flex justify-center items-center p-4 md:p-0'>
        <div className='flex flex-col items-center gap-4'>
          <h2 className='text-xl sm:text-2xl md:text-3xl text-center'>ゆっきー製1D1000</h2>
          <div className='flex flex-col sm:flex-row items-center gap-4'>
            <div className='grid grid-cols-3 gap-2 sm:gap-4'>
              <div className='flex justify-center items-center w-16 h-16 sm:w-[75px] sm:h-[75px] border text-2xl sm:text-4xl rounded-xl'>
                <p>{number[0]}</p>
              </div>
              <div className='flex justify-center items-center w-16 h-16 sm:w-[75px] sm:h-[75px] border text-2xl sm:text-4xl rounded-xl'>
                <p>{number[1]}</p>
              </div>
              <div className='flex justify-center items-center w-16 h-16 sm:w-[75px] sm:h-[75px] border text-2xl sm:text-4xl rounded-xl'>
                <p>{number[2]}</p>
              </div>
            </div>
            <button onClick={() => copyToClipboard(number.join(''))} className='px-3 py-2 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600'>
              <IoMdClipboard />
            </button>
          </div>
          {
            isEnd == true ? null :
            hasRolledToday ? (
              <div className='text-center'>
                <p className='text-gray-600 font-semibold'>本日のダイスは振り済みです</p>
                <p className='text-sm text-gray-500'>明日またチャレンジ！</p>
              </div>
            ) : (
              <button onClick={randomNumber} disabled={isLoading} className='px-6 py-2 sm:px-8 sm:py-3 bg-blue-500 rounded-xl text-white text-sm sm:text-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed'>
                {isLoading ? 'ロード中...' : 'ダイスを振る！'}
              </button>
            )
          }
          {isEnd == false ? null :
            <div>
              <h1 className='text-red-500 text-2xl text-bold'>The END!!</h1>
            </div>
          }
        </div>
      </div>

      {showHistory && (
        <div className='w-full md:w-[300px] bg-gray-100 border-t md:border-t-0 md:border-l border-gray-300 p-4 flex flex-col max-h-96 md:max-h-screen'>
          <div className='flex gap-2 mb-4'>
            <button onClick={toggleHistory} className='flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm'>
              非表示
            </button>
            <button onClick={clearHistory} className='flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm'>
              クリア
            </button>
          </div>
          <div className='overflow-y-auto flex-1'>
            <h3 className='font-bold mb-2'>履歴</h3>
            {history.length === 0 ? (
              <p className='text-gray-500'>履歴なし</p>
            ) : (
              <ul className='space-y-2'>
                {history.map((item, index) => (
                  <li key={index} className='text-sm border-b pb-2'>
                    <div className='flex items-center justify-between'>
                      <div className='font-bold'>{item.result}</div>
                      <button onClick={() => copyToClipboard(item.result)} className='px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500'>
                        コピー
                      </button>
                    </div>
                    <div className='text-xs text-gray-600'>{item.date}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {!showHistory && (
        <button onClick={toggleHistory} className='fixed bottom-4 right-4 md:right-4 md:top-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm'>
          履歴を表示
        </button>
      )}
    </div>
  )
}

export default App
