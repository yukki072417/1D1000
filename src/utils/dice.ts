export const getTodayDate = (): string => {
  return new Date().toLocaleDateString('ja-JP');
};

export const rollDice = (): string[] => {
  return Math.round(Math.random() * 9999).toString().padStart(4, '0').split('');
};

export const copyToClipboard = (text: string): void => {
  const content = `出たダイスは${text}だよ！\nbyゆっきー製ダイス`;
  navigator.clipboard.writeText(content);
};

// クライアントのグローバル IP アドレスを取得する
export const getClientIp = async (): Promise<string | null> => {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    if (!res.ok) return null;
    const data = await res.json();
    return data.ip ?? null;
  } catch (error) {
    console.error('IP取得エラー:', error);
    return null;
  }
};

// IP アドレスを Firestore のドキュメント ID として安全な文字列に変換する
export const sanitizeIp = (ip: string): string => ip.replace(/[.:]/g, '_');

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
