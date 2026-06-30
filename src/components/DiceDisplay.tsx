import { useEffect } from 'react';

interface DiceDisplayProps {
  number: string[];
  isEnd: boolean;
  hasRolledToday: boolean;
  isLoading: boolean;
  onRoll: () => void;
}

function DiceDisplay({ number, isEnd, hasRolledToday, isLoading, onRoll }: DiceDisplayProps) {
  useEffect(() => {
    if (isEnd) {
      new Audio('/sounds/daigakuka.mp3').play().catch(() => {});
    }
  }, [isEnd]);

  return (
    <div className='flex-1 flex justify-center items-center p-4 md:p-0'>
      <div className='flex flex-col items-center gap-4'>
        <h2 className='text-xl sm:text-2xl md:text-3xl text-center'>ゆっきー製1D10000</h2>
        <div className='flex flex-col sm:flex-row items-center gap-4'>
          <div className='grid grid-cols-5 gap-2 sm:gap-4'>
            {number.map((digit, index) => (
              <div
                key={index}
                className='flex justify-center items-center w-16 h-16 sm:w-[75px] sm:h-[75px] border text-2xl sm:text-4xl rounded-xl'
              >
                <p>{digit}</p>
              </div>
            ))}
          </div>
        </div>
        {isEnd ? null : hasRolledToday ? (
          <div className='text-center'>
            <p className='text-gray-600 font-semibold'>本日のダイスは振り済みです</p>
            <p className='text-sm text-gray-500'>明日またチャレンジ！</p>
          </div>
        ) : (
          <button
            onClick={onRoll}
            disabled={isLoading}
            className='px-6 py-2 sm:px-8 sm:py-3 bg-blue-500 rounded-xl text-white text-sm sm:text-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed'
          >
            {isLoading ? 'ロード中...' : 'ダイスを振る！'}
          </button>
        )}
        {!isEnd ? null : (
          <div>
            <h1 className='text-red-500 text-2xl text-bold'>The END!!</h1>
          </div>
        )}
      </div>
    </div>
  );
}

export default DiceDisplay;
