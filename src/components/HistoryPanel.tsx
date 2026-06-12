import { copyToClipboard } from '../utils/dice';
import type { HistoryItem } from '../types';

interface HistoryPanelProps {
  history: HistoryItem[];
  showHistory: boolean;
  onToggle: () => void;
  onClear: () => void;
}

function HistoryPanel({ history, showHistory, onToggle, onClear }: HistoryPanelProps) {
  if (!showHistory) {
    return (
      <button
        onClick={onToggle}
        className='fixed bottom-4 right-4 md:bottom-auto md:top-4 w-[100px] h-[45px] bg-blue-500 text-white rounded-lg text-sm'
      >
        履歴を表示
      </button>
    );
  }

  return (
    <div className='w-full md:w-[300px] bg-gray-100 border-t md:border-t-0 md:border-l border-gray-300 p-4 flex flex-col max-h-96 md:max-h-screen'>
      <div className='flex gap-2 mb-4'>
        <button onClick={onToggle} className='flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm'>
          非表示
        </button>
        <button onClick={onClear} className='flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm'>
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
                  <button
                    onClick={() => copyToClipboard(item.result)}
                    className='px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500'
                  >
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
  );
}

export default HistoryPanel;
