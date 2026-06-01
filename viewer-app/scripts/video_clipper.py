import os
import sys
import json
import base64
import argparse
import subprocess
import urllib.request
import urllib.error

# Add static-ffmpeg to PATH if available
try:
    import static_ffmpeg
    static_ffmpeg.add_paths()
    print("[INFO] static-ffmpeg paths added to environment.", file=sys.stderr)
except ImportError:
    print("[WARN] static-ffmpeg not installed. Falling back to system FFmpeg.", file=sys.stderr)

def check_dependencies():
    # Check if yt-dlp is installed
    try:
        subprocess.run(["yt-dlp", "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    except Exception:
        print("[ERROR] yt-dlp is not installed or not in PATH.", file=sys.stderr)
        sys.exit(1)

    # Check if ffmpeg is in PATH
    try:
        subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    except Exception:
        print("[ERROR] ffmpeg is not installed or not in PATH. Video clipping will fail.", file=sys.stderr)
        sys.exit(1)

def download_audio(url, temp_audio_path):
    print(f"[INFO] Downloading audio track from: {url}", file=sys.stderr)
    # Download as low quality MP3 to keep payload small for Gemini API (64k is perfect)
    cmd = [
        "yt-dlp",
        "--extract-audio",
        "--audio-format", "mp3",
        "--audio-quality", "64K",
        "-o", temp_audio_path,
        url
    ]
    subprocess.run(cmd, check=True)
    print(f"[INFO] Audio downloaded successfully to {temp_audio_path}", file=sys.stderr)

def get_shorts_timestamps_from_gemini(api_key, project_number, audio_path, count):
    print("[INFO] Reading and encoding audio to Base64...", file=sys.stderr)
    with open(audio_path, "rb") as f:
        audio_data = base64.b64encode(f.read()).decode("utf-8")

    system_prompt = f"""당신은 롱폼 영상의 대본과 음성을 분석하여 유튜브 쇼츠 및 인스타그램 릴스에 최적화된 몰입감 넘치는 핵심 숏폼 자르기 구간을 선별해 주는 전문 숏폼 크리에이터입니다.
입력된 오디오 음성을 직접 듣고 분석하여, 조회수와 바이럴 가능성이 가장 높은 30초~60초 길이의 숏폼 구간 {count}개를 선별해 주세요.

지침:
1. 각 숏폼의 시작 시간(start)과 끝 시간(end)을 정확히 찾아주세요. 포맷은 반드시 "HH:MM:SS" (예: 00:01:25) 이어야 합니다.
2. 각 숏폼 구간에 어울리는 매력적인 제목(title), 3초 오프닝 훅(hook), 촬영 대본(script), 연출 지시사항(visualCues)을 한글로 작성해 주세요.
3. 영상의 주요 내용이 시작되는 핵심적인 구간을 골라야 합니다.

반드시 아래와 같은 JSON 형식으로만 응답해 주세요. JSON 형식을 엄격히 지켜야 하며, 다른 설명 없이 JSON 코드만 출력하세요.
{{
  "shorts": [
    {{
      "id": 1,
      "start": "00:00:15",
      "end": "00:00:45",
      "title": "숏폼 제목",
      "hook": "오프닝 훅 (처음 3초 멘트)",
      "script": "구체적 대본 스크립트",
      "visualCues": "비주얼 연출 및 자막 추천",
      "estimatedDuration": "30s"
    }}
  ]
}}"""

    print("[INFO] Calling Gemini API to analyze audio track...", file=sys.stderr)
    headers = { "Content-Type": "application/json" }
    
    if api_key.startswith("AQ"):
      # GCP Vertex AI Access Token
      region = "us-central1"
      url = f"https://{region}-aiplatform.googleapis.com/v1/projects/{project_number}/locations/{region}/publishers/google/models/gemini-1.5-flash:generateContent"
      headers["Authorization"] = f"Bearer {api_key}"
      request_body = {
        "contents": [
          {
            "role": "user",
            "parts": [
              {
                "inlineData": {
                  "mimeType": "audio/mp3",
                  "data": audio_data
                }
              },
              {
                "text": system_prompt
              }
            ]
          }
        ],
        "generationConfig": {
          "temperature": 0.4,
          "maxOutputTokens": 2048
        }
      }
    else:
      # Google AI Studio API Key
      url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
      request_body = {
        "contents": [
          {
            "parts": [
              {
                "inlineData": {
                  "mimeType": "audio/mp3",
                  "data": audio_data
                }
              },
              {
                "text": system_prompt
              }
            ]
          }
        ],
        "generationConfig": {
          "temperature": 0.4,
          "topP: ": 0.95
        }
      }

    req = urllib.request.Request(url, data=json.dumps(request_body).encode("utf-8"), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            text = res_data["candidates"][0]["content"]["parts"][0]["text"]
            text = text.replace("```json", "").replace("```", "").trim() if hasattr(text, "trim") else text.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(text)
            return parsed.get("shorts", [])
    except urllib.error.HTTPError as e:
        print(f"[ERROR] Gemini API HTTP Error: {e.code} - {e.read().decode('utf-8')}", file=sys.stderr)
        raise e
    except Exception as e:
        print(f"[ERROR] Failed to parse Gemini response: {str(e)}", file=sys.stderr)
        raise e

def clip_and_crop_video(url, start_time, end_time, output_path):
    print(f"[INFO] Clipping video segment: {start_time} to {end_time}", file=sys.stderr)
    temp_clip_path = "temp_raw_clip.mp4"
    if os.path.exists(temp_clip_path):
        os.remove(temp_clip_path)

    # 1. Download only the specific section of the video directly from YouTube
    # Limit format to max 720p height to optimize download and rendering speed
    section_arg = f"*{start_time}-{end_time}"
    download_cmd = [
        "yt-dlp",
        "--download-sections", section_arg,
        "--force-keyframes-at-cuts",
        "-f", "bestvideo[height<=720]+bestaudio/best[height<=720]",
        "--merge-output-format", "mp4",
        "-o", temp_clip_path,
        url
    ]
    subprocess.run(download_cmd, check=True)

    if not os.path.exists(temp_clip_path):
        raise FileNotFoundError("[ERROR] yt-dlp section download failed to produce output file.")

    # 2. Crop horizontal 16:9 video to vertical 9:16 aspect ratio (center crop)
    # crop = ih * 9/16 : ih
    crop_cmd = [
        "ffmpeg",
        "-y",
        "-i", temp_clip_path,
        "-vf", "crop=ih*9/16:ih",
        "-c:a", "copy",
        output_path
    ]
    print(f"[INFO] Running FFmpeg crop command for {output_path}", file=sys.stderr)
    subprocess.run(crop_cmd, check=True)

    # Clean up temp raw clip
    if os.path.exists(temp_clip_path):
        os.remove(temp_clip_path)
    print(f"[INFO] Successfully cropped and saved: {output_path}", file=sys.stderr)

def main():
    parser = argparse.ArgumentParser(description="Download YouTube video, detect shorts timestamps using Gemini, and crop to 9:16.")
    parser.add_argument("--url", required=True, help="YouTube video link")
    parser.add_argument("--count", type=int, default=3, help="Number of shorts to generate")
    parser.add_argument("--output_dir", required=True, help="Directory to save final shorts mp4 files")
    parser.add_argument("--api_key", required=True, help="Gemini API Key")
    parser.add_argument("--project_number", default="773040580705", help="Vertex AI Project Number")
    
    args = parser.parse_args()

    check_dependencies()

    if not os.path.exists(args.output_dir):
        os.makedirs(args.output_dir, exist_ok=True)

    temp_audio_path = "temp_audio_track.mp3"
    if os.path.exists(temp_audio_path):
        os.remove(temp_audio_path)

    try:
        # Step 1: Download audio
        download_audio(args.url, temp_audio_path)

        # Step 2: Call Gemini to find timestamps
        shorts_data = get_shorts_timestamps_from_gemini(
            args.api_key, 
            args.project_number, 
            temp_audio_path, 
            args.count
        )

        # Step 3: Clip and crop each segment
        processed_shorts = []
        for index, item in enumerate(shorts_data):
            try:
                shorts_id = item.get("id", index + 1)
                start = item.get("start")
                end = item.get("end")
                title = item.get("title", f"Shorts #{shorts_id}")
                
                # Sanitize filenames
                safe_title = "".join([c for c in title if c.isalpha() or c.isdigit() or c in " _-"]).rstrip()
                filename = f"shorts_{shorts_id}_{safe_title.replace(' ', '_')}.mp4"
                output_path = os.path.join(args.output_dir, filename)

                clip_and_crop_video(args.url, start, end, output_path)

                item["videoUrl"] = f"/shorts/{filename}"
                processed_shorts.append(item)

            except Exception as clip_err:
                print(f"[WARN] Failed to process clip {index + 1}: {str(clip_err)}", file=sys.stderr)
                # Keep metadata even if video rendering fails, just exclude videoUrl
                processed_shorts.append(item)

        # Output final JSON result to stdout
        output_json = {
            "success": True,
            "shorts": processed_shorts
        }
        print(json.dumps(output_json, ensure_ascii=False))

    finally:
        # Final cleanups
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

if __name__ == "__main__":
    main()
