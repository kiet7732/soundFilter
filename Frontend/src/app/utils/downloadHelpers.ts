/**
 * Download Helpers
 * Các hàm hỗ trợ download file
 */
import JSZip from "jszip";
import { saveAs } from "file-saver";

/**
 * Download một file đơn lẻ
 */
export async function handleDownload(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download: ${filename}`);
    const blob = await response.blob();
    saveAs(blob, filename);
  } catch (error) {
    console.error("Download error:", error);
    alert(`Không thể tải file: ${filename}`);
  }
}

/**
 * Download tất cả files thành ZIP
 */
export async function downloadAllAsZip(
  files: Array<{ url: string; filename: string }>,
  zipName: string
): Promise<void> {
  try {
    const zip = new JSZip();
    
    const addFileToZip = async (url: string, filename: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Lỗi tải file: ${filename}`);
      zip.file(filename, await res.blob());
    };

    await Promise.all(files.map(f => addFileToZip(f.url, f.filename)));
    
    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, zipName);
  } catch (error) {
    console.error("Lỗi khi nén file ZIP:", error);
    alert("Đã xảy ra lỗi khi đóng gói file tải về!");
  }
}
