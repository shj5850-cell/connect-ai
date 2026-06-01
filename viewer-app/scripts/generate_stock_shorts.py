#!/usr/bin/env python3
import os
import sys
import json
import asyncio
import urllib.request
import urllib.parse
import re
import subprocess
from PIL import Image

# Reconfigure stdout/stderr to UTF-8 to prevent encoding errors on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Ensure required packages are present
def ensure_packages():
    required = ["edge-tts", "moviepy", "pillow"]
    for pkg in required:
        try:
            if pkg == "edge-tts":
                import edge_tts
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

import edge_tts
try:
    from moviepy import ImageClip, AudioFileClip, concatenate_videoclips
except ImportError:
    try:
        from moviepy.editor import ImageClip, AudioFileClip, concatenate_videoclips
    except ImportError:
        from moviepy.video.VideoClip import ImageClip
        from moviepy.audio.io.AudioFileClip import AudioFileClip
        from moviepy.video.compositing.concatenate import concatenate_videoclips

# Scrape stock images from Unsplash search results
def scrape_unsplash_images(keywords, max_images=4):
    print(f"🔍 Searching Unsplash for keywords: {keywords}")
    image_urls = []
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    for kw in keywords:
        if not kw.strip():
            continue
        try:
            query = urllib.parse.quote(kw.strip())
            url = f"https://unsplash.com/s/photos/{query}"
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=8) as response:
                html = response.read().decode('utf-8', errors='ignore')
                # Grab photo cdn links (e.g., https://images.unsplash.com/photo-...)
                matches = re.findall(r'https://images\.unsplash\.com/photo-[a-zA-Z0-9\-_]+', html)
                seen = set()
                kw_count = 0
                for m in matches:
                    if m not in seen and 'profile' not in m and 'placeholder' not in m:
                        seen.add(m)
                        image_urls.append(m)
                        kw_count += 1
                        if kw_count >= 2:  # get up to 2 images per keyword
                            break
                        if len(image_urls) >= max_images:
                            break
        except Exception as e:
            print(f"⚠️ Unsplash scrape failed for '{kw}': {e}")
        if len(image_urls) >= max_images:
            break
            
    # Deduplicate total
    image_urls = list(dict.fromkeys(image_urls))
    return image_urls[:max_images]

# Scrape images from Naver Image Search
def scrape_naver_images(query, max_images=4):
    print(f"🔍 Searching Naver Image Search for: {query}")
    image_urls = []
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    try:
        url = f"https://search.naver.com/search.naver?where=image&query={urllib.parse.quote(query.strip())}"
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8', errors='ignore')
            # Extract pstatic urls
            matches = re.findall(r'https://search\.pstatic\.net/[^\s"\'><]+', html)
            seen = set()
            for m in matches:
                # Clean up backslashes and entity escaped ampersands
                m_clean = m.replace('\\', '').replace('u0026', '&').strip()
                # Exclude icons, profile images, small previews
                if m_clean not in seen and 'profileImage' not in m_clean and 'f80_80' not in m_clean and 'type=f' not in m_clean:
                    seen.add(m_clean)
                    image_urls.append(m_clean)
                    if len(image_urls) >= max_images:
                        break
    except Exception as e:
        print(f"⚠️ Naver Image scrape failed for '{query}': {e}")
        
    return image_urls[:max_images]

# Download and format images to 9:16 portrait aspect ratio
def download_and_format_images(urls, temp_dir, target_width=1080, target_height=1920):
    local_paths = []
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    # Fallback to general unsplash images if no URLs were found
    if not urls:
        print("⚠️ No images found. Using high-quality category placeholders...")
        urls = [
            "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
            "https://images.unsplash.com/photo-1512917774080-9991f1c4c750",
            "https://images.unsplash.com/photo-1526738549149-8e07eca6c147"
        ]

    for idx, url in enumerate(urls):
        dest_path = os.path.join(temp_dir, f"img_{idx}.jpg")
        
        # If url is a local file path that already exists (uploaded image)
        if os.path.exists(url):
            try:
                # Open local image and format it to 9:16 layout
                img = Image.open(url)
                bg = Image.new("RGB", (target_width, target_height), (18, 18, 18))
                img.thumbnail((target_width - 80, target_height - 300), Image.Resampling.LANCZOS)
                offset = ((target_width - img.width) // 2, (target_height - img.height) // 2)
                bg.paste(img, offset)
                bg.save(dest_path)
                local_paths.append(dest_path)
                print(f"📥 Formatted local direct image from {url}")
                continue
            except Exception as e:
                print(f"⚠️ Failed to format local image {url}: {e}")
                continue

        # If it is a web URL
        if url.startswith("http"):
            # Request high quality 1080p fit-cropped photo if Unsplash
            if "unsplash.com" in url:
                full_url = url + "?w=1080&h=1920&q=85&auto=format&fit=crop"
            else:
                full_url = url
            
            req = urllib.request.Request(full_url, headers=headers)
            try:
                with urllib.request.urlopen(req, timeout=10) as response, open(dest_path, 'wb') as f:
                    f.write(response.read())
                
                # Pad/Resize to exact portrait fit
                img = Image.open(dest_path)
                bg = Image.new("RGB", (target_width, target_height), (18, 18, 18))
                img.thumbnail((target_width - 80, target_height - 300), Image.Resampling.LANCZOS)
                offset = ((target_width - img.width) // 2, (target_height - img.height) // 2)
                bg.paste(img, offset)
                bg.save(dest_path)
                local_paths.append(dest_path)
                print(f"📥 Formatted and saved image {idx} from {url}")
            except Exception as e:
                print(f"⚠️ Failed to download/format image {idx} from {url}: {e}")
            
    return local_paths

# Generate human-like neural TTS using edge-tts
async def generate_neural_tts(text, voice_gender, dest_path):
    # Map friendly gender to Edge-TTS voice name
    # ko-KR-SunHiNeural is standard natural female voice
    # ko-KR-InJoonNeural is standard natural male voice
    voice = "ko-KR-SunHiNeural"
    if voice_gender.lower() == "male":
        voice = "ko-KR-InJoonNeural"
        
    print(f"🗣️ Generating neural TTS voiceover ({voice}) for script...")
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(dest_path)
    print("✅ Neural TTS Audio saved.")

def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_stock_shorts.py <config_json_path>")
        sys.exit(1)
        
    config_path = sys.argv[1]
    if not os.path.exists(config_path):
        print(f"❌ Config file not found: {config_path}")
        sys.exit(1)
        
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
    except Exception as e:
        print(f"❌ JSON parsing error: {e}")
        sys.exit(1)
        
    script = config.get("script", "")
    voice = config.get("voice", "female")
    search_keywords = config.get("search_keywords", [])
    output_path = config.get("output_path", "")
    
    # New options
    image_source_mode = config.get("image_source_mode", "stock_only")
    direct_image_url = config.get("direct_image_url", "")
    direct_image_path = config.get("direct_image_path", "")
    keyword = config.get("keyword", "")
    
    if not script or not output_path:
        print("❌ Missing required configuration fields (script, output_path).")
        sys.exit(1)
        
    # Setup directories
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    temp_dir = os.path.join(os.path.dirname(output_path), f"temp_{int(os.path.basename(output_path).split('_')[-1].split('.')[0])}" if '_' in os.path.basename(output_path) else "temp_stock")
    os.makedirs(temp_dir, exist_ok=True)
    
    audio_path = os.path.join(temp_dir, "tts_voice.mp3")
    
    # 1. Resolve image URLs based on matching mode
    scraped_urls = []
    
    print(f"🖼️ Image matching mode: {image_source_mode}")
    if image_source_mode == "direct":
        if direct_image_path and os.path.exists(direct_image_path):
            scraped_urls.append(direct_image_path)
            print(f"Using direct local upload path: {direct_image_path}")
        elif direct_image_url:
            scraped_urls.append(direct_image_url)
            print(f"Using direct image URL: {direct_image_url}")
        
        # Fill the remaining 3 slots with stock B-roll
        if search_keywords:
            scraped_urls.extend(scrape_unsplash_images(search_keywords, max_images=3))
            
    elif image_source_mode == "naver_only":
        naver_query = keyword if keyword else (search_keywords[0] if search_keywords else "상품")
        scraped_urls.extend(scrape_naver_images(naver_query, max_images=4))
        
    elif image_source_mode == "stock_naver":
        naver_query = keyword if keyword else (search_keywords[0] if search_keywords else "상품")
        naver_urls = scrape_naver_images(naver_query, max_images=2)
        scraped_urls.extend(naver_urls)
        
        needed = 4 - len(scraped_urls)
        if needed > 0 and search_keywords:
            stock_urls = scrape_unsplash_images(search_keywords, max_images=needed)
            scraped_urls.extend(stock_urls)
            
    else: # stock_only
        if search_keywords:
            scraped_urls.extend(scrape_unsplash_images(search_keywords, max_images=4))
            
    # Download and format
    img_paths = download_and_format_images(scraped_urls, temp_dir)
    
    if not img_paths:
        print("❌ Failed to secure any usable images.")
        sys.exit(1)
        
    # 2. Run Edge-TTS Async
    try:
        asyncio.run(generate_neural_tts(script, voice, audio_path))
    except Exception as e:
        print(f"❌ TTS synthesis failed: {e}")
        sys.exit(1)
        
    # 3. Assemble Video with MoviePy
    print("🎬 Rendering portrait slideshow video...")
    try:
        audio_clip = AudioFileClip(audio_path)
        total_duration = audio_clip.duration
        num_images = len(img_paths)
        duration_per_image = total_duration / num_images
        
        clips = []
        for idx, path in enumerate(img_paths):
            clip = ImageClip(path)
            
            # Handle duration
            if hasattr(clip, "with_duration"):
                clip = clip.with_duration(duration_per_image)
            else:
                clip = clip.set_duration(duration_per_image)
                
            # Dynamic zoom-in Ken Burns style animation
            try:
                clip = clip.resize(lambda t: 1.0 + 0.04 * t)
            except Exception as e:
                print(f"⚠️ Zoom resize error for image {idx}, using static: {e}")
                
            clips.append(clip)
            
        # Join image clips together
        slideshow = concatenate_videoclips(clips, method="compose")
        
        # Merge voiceover audio
        if hasattr(slideshow, "with_audio"):
            video = slideshow.with_audio(audio_clip)
        else:
            video = slideshow.set_audio(audio_clip)
            
        # Render the file
        video.write_videofile(
            output_path,
            fps=24,
            codec="libx264",
            audio_codec="aac",
            temp_audiofile=os.path.join(temp_dir, "temp-audio.m4a"),
            remove_temp=True
        )
        
        video.close()
        audio_clip.close()
        for c in clips:
            c.close()
            
        print(f"🎉 Final stock Shorts video successfully created at: {output_path}")
        
        # Cleanup temporary files
        for path in img_paths:
            try:
                os.remove(path)
            except Exception:
                pass
        try:
            os.remove(audio_path)
            os.rmdir(temp_dir)
        except Exception:
            pass
            
    except Exception as e:
        print(f"❌ Video rendering failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
