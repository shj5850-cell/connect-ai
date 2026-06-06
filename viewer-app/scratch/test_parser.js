const rawText = `
제목:
절대 저 문을 열지 마세요

영상 스타일:
공포 / 미스터리 / 백룸 / 시네마틱

길이:
30초

음악:
저음 드론 사운드 + 불안한 앰비언트 + 형광등 노이즈

후킹 문구:
"실제로 존재한다는 소문이 있습니다."

CUT 1

설명:
평범한 사무실 복도처럼 보이지만 이상할 정도로 사람이 없다.

AI 이미지 프롬프트:
endless yellow office corridor, old stained wallpaper, fluorescent lights, empty office maze, eerie atmosphere, liminal space, backrooms style, ultra realistic, cinematic lighting, high detail, 9:16

자막:
그곳은 평범한 사무실처럼 보였다.

카메라:
천천히 전진

길이:
7초

CUT 2

설명:
복도가 끝없이 이어지고 같은 장소가 반복되는 것처럼 보인다.

AI 이미지 프롬프트:
infinite maze of yellow rooms, repeating hallways, fluorescent ceiling lights, abandoned office maze, surrealism, creepy atmosphere, backrooms style, photorealistic, 9:16

자막:
하지만 아무리 걸어도 출구는 없었다.

카메라:
패닝하며 회전

길이:
8초

CUT 3

설명:
어디선가 웅웅거리는 형광등 소리와 함께 낯선 그림자가 벽에 나타난다.

AI 이미지 프롬프트:
shadowy figure standing at the end of the yellow hallway, dim lighting, flickering fluorescent lights, eerie shadow on the wall, liminal space, horror, backrooms aesthetic, 9:16

자막:
그리고 무언가 느껴지기 시작했다.

카메라:
줌인

길이:
7초

CUT 4

설명:
'열지 마시오'라고 빨갛게 쓰인 굳게 닫힌 문 앞에 멈춘다.

AI 이미지 프롬프트:
an old rusty metal door at the end of a yellow corridor, warning sign written in red "DO NOT ENTER", eerie atmosphere, dim fluorescent lights, backrooms style, cinematic, 9:16

자막:
절대 저 문을 열지 마세요.

카메라:
고정

길이:
8초
`;

async function run() {
  console.log("🚀 Testing cinematic script parser API using native fetch...");
  try {
    const res = await fetch('http://localhost:3000/api/cinema-shorts/generate-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText })
    });
    
    if (!res.ok) {
      throw new Error(`Response status error: ${res.status} ${await res.text()}`);
    }
    
    const data = await res.json();
    console.log("✅ Parser Response:");
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Test failed:", err);
  }
}

run();
