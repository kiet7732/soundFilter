import subprocess
import os

def render_karaoke_video_from_image(bg_image, audio_file, ass_file, output_file):
    print("="*60)
    print(" BẮT ĐẦU RENDER KARAOKE BẰNG FFMPEG (NỀN ẢNH TĨNH) ".center(60, "="))
    
    # Xử lý đường dẫn cho FFmpeg trên Windows
    safe_ass_path = ass_file.replace('\\', '/').replace(':', '\\:')

    # Tạo file tạm để tránh frontend load nhầm khi video chưa render xong
    temp_output = output_file + ".tmp.mp4"

    # Câu lệnh FFmpeg tối ưu cho Ảnh tĩnh + Tự động Crop 16:9 + Render GPU
    command = [
        'ffmpeg',
        '-y',                           
        '-loop', '1',                   
        '-framerate', '30',             
        '-i', bg_image,                 
        '-i', audio_file,               
        # BỘ LỌC HÌNH ẢNH (Video Filter) :
        # 1. scale=...: Phóng to ảnh sao cho chiều nhỏ nhất vừa khít 1280x720
        # 2. crop=...: Lấy phần trung tâm của ảnh cắt đúng tỷ lệ 16:9 (1280x720)
        # 3. ass=...: In phụ đề lên trên cùng
        '-vf', f"scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,ass='{safe_ass_path}'",
        '-c:v', 'libx264',           
        '-preset', 'fast',              
        '-pix_fmt', 'yuv420p',          
        '-c:a', 'aac',                  
        '-b:a', '192k',                 
        '-shortest',                    
        temp_output
    ]

    print(f"\n[HỆ THỐNG] Đang xuất video từ ảnh nền: {os.path.basename(bg_image)}")
    print("[HỆ THỐNG] Tốc độ render sẽ rất nhanh. Vui lòng chờ...")
    
    try:
        subprocess.run(command, check=True)
        
        # Đổi tên file tạm thành file chính thức sau khi xong hoàn toàn
        if os.path.exists(temp_output):
            os.replace(temp_output, output_file)
            
        print(f"\n[THÀNH CÔNG] 🎉 Video Karaoke đã sẵn sàng tại: {output_file}")
    except subprocess.CalledProcessError as e:
        print(f"\n[LỖI] FFmpeg gặp sự cố trong quá trình render: {e}")
    except FileNotFoundError:
        print("\n[LỖI CỐT LÕI] Không tìm thấy lệnh FFmpeg! đã cài đặt chưa?")

# ================= KÍCH HOẠT =================
if __name__ == "__main__":
    # CHÚ Ý: Đổi tên biến và đường dẫn trỏ tới một file ảnh (JPG, PNG)
    HINH_NEN = r"" # Chuẩn bị 1 tấm ảnh làm nền
    FILE_NHAC = r""      # File nhạc
    FILE_ASS = r""
    VIDEO_XUAT = r""

    # Kiểm tra nguyên liệu
    if not os.path.exists(HINH_NEN):
        print(f"[LỖI] Không tìm thấy ảnh nền tại: {HINH_NEN}")
        print("Vui lòng tải một tấm ảnh JPG/PNG đẹp làm nền!")
    elif not os.path.exists(FILE_ASS):
        print("[LỖI] Chưa có file .ass! Hãy chạy code Python tạo ASS trước.")
    else:
        render_karaoke_video_from_image(HINH_NEN, FILE_NHAC, FILE_ASS, VIDEO_XUAT)