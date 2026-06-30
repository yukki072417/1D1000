export const getTodayDate = (): string => {
  return new Date().toLocaleDateString('ja-JP');
};

export const rollDice = (): string[] => {
  const min: number = 0;
  const max: number = 9999;

  return (Math.floor(Math.random() * (max - min + 1)) + min).toString().padStart(5, '0').split('');
};

export const copyToClipboard = (text: string): void => {
  const content = `出たダイスは${text}だよ！\nbyゆっきー製ダイス`;
  navigator.clipboard.writeText(content);
};

// デバイスフィンガープリント（擬似的なデバイス識別 ID）を取得する
export const getDeviceFingerprint = async (): Promise<string | null> => {
  try {
    const FingerprintJS = (await import('@fingerprintjs/fingerprintjs')).default;
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
  } catch (error) {
    console.error('フィンガープリント取得エラー:', error);
    return null;
  }
};
