// ============================================================
// TradeFlow — Supabase Chart Screenshot Storage API
// Replaces: base64 chartScreenshot string in trades
// ============================================================
import { supabase } from '../supabase';

export const storageApi = {
  /**
   * Upload a chart screenshot (base64 data URL or File object)
   * Returns the public URL to store in trades.chart_url
   */
  async uploadScreenshot(
    userId: string,
    tradeId: string,
    imageData: string // base64 data URL: "data:image/png;base64,..."
  ): Promise<string> {
    // Convert base64 to Blob
    const base64 = imageData.split(',')[1];
    const mimeType = imageData.split(';')[0].split(':')[1] || 'image/png';
    const byteString = atob(base64);
    const byteArray = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      byteArray[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([byteArray], { type: mimeType });
    const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';

    // Upload to: chart-screenshots/{userId}/{tradeId}.png
    const path = `${userId}/${tradeId}.${ext}`;
    const { error } = await supabase.storage
      .from('chart-screenshots')
      .upload(path, blob, {
        upsert: true,
        contentType: mimeType,
      });

    if (error) throw error;

    // Get signed URL (valid 10 years = 315360000 seconds)
    const { data: signedData, error: signedError } = await supabase.storage
      .from('chart-screenshots')
      .createSignedUrl(path, 315360000);

    if (signedError) throw signedError;
    return signedData.signedUrl;
  },

  /** Delete screenshot when trade is deleted */
  async deleteScreenshot(userId: string, tradeId: string): Promise<void> {
    const extensions = ['png', 'jpg', 'webp'];
    for (const ext of extensions) {
      await supabase.storage
        .from('chart-screenshots')
        .remove([`${userId}/${tradeId}.${ext}`]);
    }
  },
};
