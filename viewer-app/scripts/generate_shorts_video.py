#!/usr/bin/env python3
import os
import sys
import json
import urllib.request
import subprocess

# Reconfigure stdout/stderr to UTF-8 to prevent cp949 encoding errors on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Self-installing packages
def ensure_packages():
    required_packages = ["gTTS", "moviepy", "pillow"]
    for pkg in required_packages:
        try:
            if pkg == "gTTS":
                import gtts
            elif pkg == "moviepy":
                import moviepy
            elif pkg == "pillow":
                import PIL
        except ImportError:
            print(f"📦 Installing required package: {pkg}...")
            try:
                subprocess.run([sys.executable, "-m", "pip", "install", pkg], check=True)
            except Exception as e:
                print(f"❌ Failed to install {pkg}: {e}")
                sys.exit(1)

ensure_packages()

from gtts import gTTS
from PIL import Image, ImageOps
try:
    from moviepy import ImageClip, AudioFileClip, CompositeVideoClip
except ImportError:
    from moviepy.editor import ImageClip, AudioFileClip, CompositeVideoClip

def download_image(url, dest_path):
    print(f"📥 Downloading image from {url}...")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response, open(dest_path, 'wb') as out_file:
            out_file.write(response.read())
        print("✅ Image downloaded successfully.")
        return True
    except Exception as e:
        print(f"❌ Failed to download image: {e}")
        return False

def make_portrait_image(src_path, dest_path, target_width=1080, target_height=1920):
    """
    Open the product image, pad/resize it to fit a 9:16 portrait video format,
    and save it with a dark blurred background or solid color.
    """
    try:
        img = Image.open(src_path)
        
        # Create a solid dark background (e.g., dark charcoal color)
        bg = Image.new("RGB", (target_width, target_height), (18, 18, 18))
        
        # Calculate aspect ratio to fit the image inside target_width and target_height
        img.thumbnail((target_width - 80, target_height - 400), Image.Resampling.LANCZOS)
        
        # Center the product image on the portrait background
        offset = ((target_width - img.width) // 2, (target_height - img.height) // 2)
        bg.paste(img, offset)
        
        bg.save(dest_path)
        print("✅ Portrait background image processed.")
        return True
    except Exception as e:
        print(f"❌ Image processing error: {e}")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_shorts_video.py <data_json_path>")
        sys.exit(1)
        
    json_path = sys.argv[1]
    if not os.path.exists(json_path):
        print(f"❌ JSON file not found: {json_path}")
        sys.exit(1)
        
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"❌ JSON parse error: {e}")
        sys.exit(1)
        
    script_text = data.get("script", "")
    image_url = data.get("image", "")
    output_path = data.get("output_path", "")
    
    if not script_text or not image_url or not output_path:
        print("❌ Missing required fields in input JSON (script, image, output_path).")
        sys.exit(1)
        
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    temp_dir = os.path.join(os.path.dirname(output_path), "temp_assets")
    os.makedirs(temp_dir, exist_ok=True)
    
    raw_img_path = os.path.join(temp_dir, "raw_product.jpg")
    portrait_img_path = os.path.join(temp_dir, "portrait_product.jpg")
    audio_path = os.path.join(temp_dir, "tts_narration.mp3")
    
    # 1. Download image
    if not download_image(image_url, raw_img_path):
        # use fallback dummy image if download fails
        print("⚠️ Image download failed. Using a placeholder image.")
        try:
            placeholder = Image.new("RGB", (300, 300), (0, 210, 255))
            placeholder.save(raw_img_path)
        except Exception:
            pass
            
    # 2. Resize and pad image to 1080x1920 portrait format
    make_portrait_image(raw_img_path, portrait_img_path)
    
    # 3. Generate TTS Audio using gTTS
    print("🗣️ Generating TTS narration with gTTS...")
    try:
        tts = gTTS(text=script_text, lang='ko')
        tts.save(audio_path)
        print("✅ TTS Audio created.")
    except Exception as e:
        print(f"❌ TTS Audio generation failed: {e}")
        sys.exit(1)
        
    # 4. Synthesize video and audio using moviepy
    print("🎬 Rendering video slideshow...")
    try:
        audio_clip = AudioFileClip(audio_path)
        image_clip = ImageClip(portrait_img_path)
        
        # Set duration (fluent API in moviepy v2 is with_duration)
        if hasattr(image_clip, "with_duration"):
            image_clip = image_clip.with_duration(audio_clip.duration)
        else:
            image_clip = image_clip.set_duration(audio_clip.duration)
        
        # Set audio (fluent API in moviepy v2 is with_audio)
        if hasattr(image_clip, "with_audio"):
            video = image_clip.with_audio(audio_clip)
        else:
            video = image_clip.set_audio(audio_clip)
        
        # Write output file
        video.write_videofile(
            output_path, 
            fps=24, 
            codec="libx264", 
            audio_codec="aac", 
            temp_audiofile=os.path.join(temp_dir, "temp-audio.m4a"),
            remove_temp=True
        )
        
        # Close clips
        video.close()
        audio_clip.close()
        image_clip.close()
        print(f"🎉 Video successfully generated at: {output_path}")
        
        # Cleanup temporary files
        try:
            os.remove(raw_img_path)
            os.remove(portrait_img_path)
            os.remove(audio_path)
            os.rmdir(temp_dir)
        except Exception:
            pass
            
    except Exception as e:
        print(f"❌ Video rendering failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
