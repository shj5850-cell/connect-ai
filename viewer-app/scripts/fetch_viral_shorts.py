import subprocess
import json
import sys
from concurrent.futures import ThreadPoolExecutor

# Force UTF-8 encoding for standard output to prevent Windows console encoding crashes
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# We target global trending hashtags and popular Korean shorts creators
targets = [
    # Global/Trending Hashtags
    {"url": "https://www.youtube.com/hashtag/shorts", "type": "hashtag", "limit": 25},
    {"url": "https://www.youtube.com/hashtag/trendingshorts", "type": "hashtag", "limit": 25},
    # Korean Popular Shorts Creators
    {"url": "https://www.youtube.com/@shortbox/shorts", "type": "channel", "limit": 15},       # 숏박스
    {"url": "https://www.youtube.com/@nerdult/shorts", "type": "channel", "limit": 15},        # 너덜트
    {"url": "https://www.youtube.com/@kickservice/shorts", "type": "channel", "limit": 15},     # 킥서비스
    {"url": "https://www.youtube.com/@workisbeauty/shorts", "type": "channel", "limit": 15}    # 사내뷰공업
]

def fetch_source(target):
    url = target["url"]
    limit = target["limit"]
    is_channel = (target["type"] == "channel")
    
    # Run yt-dlp to get playlist/channel video entries in JSON format
    args = ["python", "-m", "yt_dlp", url, "--playlist-end", str(limit), "--flat-playlist", "--dump-json"]
    
    proc = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8')
    
    shorts = []
    for line in proc.stdout:
        if not line.strip():
            continue
        try:
            item = json.loads(line)
            video_id = item.get("id")
            if not video_id:
                continue
                
            duration = item.get("duration")
            
            # Filters:
            # For channels' shorts tab, all entries are vertical shorts.
            # For hashtag streams, we strictly filter for videos under 65 seconds.
            if is_channel or (duration and duration <= 65):
                shorts.append({
                    "id": video_id,
                    "title": item.get("title") or "YouTube Short",
                    "url": f"https://www.youtube.com/shorts/{video_id}",
                    "viewCount": item.get("view_count") or 0,
                    "channel": item.get("channel") or item.get("uploader") or "YouTube Creator",
                    "duration": duration or 45, # default 45s if not present (channel flat entries)
                    "thumbnail": item.get("thumbnails", [{}])[0].get("url") or f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
                })
        except Exception:
            pass
            
    proc.wait()
    return shorts

def main():
    all_shorts = {}
    
    # Fetch all targets concurrently to minimize latency
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = [executor.submit(fetch_source, t) for t in targets]
        for fut in futures:
            try:
                source_shorts = fut.result()
                for s in source_shorts:
                    video_id = s["id"]
                    # If duplicate, keep the one with the higher view count
                    if video_id in all_shorts:
                        if s["viewCount"] > all_shorts[video_id]["viewCount"]:
                            all_shorts[video_id] = s
                    else:
                        all_shorts[video_id] = s
            except Exception as e:
                # Print errors to stderr, keeping stdout clean for json data
                print(f"[Error fetching source] {e}", file=sys.stderr)
                
    # Sort by view count in descending order
    sorted_shorts = sorted(all_shorts.values(), key=lambda x: x["viewCount"], reverse=True)
    
    # Print the resulting JSON list to stdout
    print(json.dumps(sorted_shorts, ensure_ascii=False))

if __name__ == "__main__":
    main()
