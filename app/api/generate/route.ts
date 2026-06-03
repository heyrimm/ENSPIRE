import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Client } from "@notionhq/client";

export const maxDuration = 60;

const SYSTEM_PROMPT = `너는 대학생 대외활동 정보 채널 "ENSPIRE"의 카카오톡 공지문 작성 전문가야.

입력받은 내용(여러 공고일 수 있음)을 아래 형식에 맞게 카카오톡 공지문으로 변환해줘.

[출력 형식 - 반드시 이 형식 그대로]

ENSPIRE 정기 발행물 | MM월 DD일
──────────────
① [카테고리] 활동명
- 마감 : YYYY.MM.DD
- 혜택 : 핵심 혜택 2~3가지만 간결하게
- 대상 : 대상자 정보
- 링크 : URL
──────────────
② [카테고리] 활동명
...
──────────────

마무리 멘트 (친근하고 짧게, 이모지 포함)

[규칙]
1. 헤더는 반드시 "ENSPIRE 정기 발행물 | MM월 DD일" 형식
2. 항목 번호는 반드시 원문자 ① ② ③ ④ ⑤ 사용
3. 구분선은 "──────────────" 사용
4. 혜택은 핵심만 간결하게
5. 마무리 멘트는 친근하고 캐주얼하게 1~2줄
6. 불필요한 설명 없이 공지문 본문만 출력
7. 여러 공고가 입력되면 각각 번호를 매겨서 모두 포함
8. 링크는 입력된 URL을 절대 변경하지 말고 그대로 출력. 링크가 없을 때만 "미확인" 사용`;

const CIRCLE_NUMS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

interface Program {
  name: string;
  link: string | null;
  deadline: string | null;
  status: "시작 전" | "진행 중" | "완료";
}

function parsePrograms(notice: string): Program[] {
  const programs: Program[] = [];
  const today = new Date().toISOString().slice(0, 10);

  const sections = notice.split(/(?=[①②③④⑤⑥⑦⑧⑨⑩])/);

  for (const section of sections) {
    if (!CIRCLE_NUMS.some((c) => section.startsWith(c))) continue;

    const nameMatch = section.match(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*(?:\[.*?\]\s*)?(.+)/);
    const name = nameMatch?.[1]?.trim() || "프로그램";

    const linkMatch = section.match(/- 링크\s*:\s*(https?:\/\/[^\s]+)/);
    const link = linkMatch?.[1]?.trim() ?? null;

    const deadlineMatch = section.match(/- 마감\s*:\s*(\d{4})\.(\d{2})\.(\d{2})/);
    const deadline = deadlineMatch
      ? `${deadlineMatch[1]}-${deadlineMatch[2]}-${deadlineMatch[3]}`
      : null;

    let status: Program["status"] = "진행 중";
    if (deadline) {
      if (deadline < today) status = "완료";
    }

    programs.push({ name, link, deadline, status });
  }

  return programs;
}

async function saveToNotion(notice: string) {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!token || !databaseId) return;

  const notion = new Client({ auth: token });
  const programs = parsePrograms(notice);

  const noticeChunks: { text: { content: string } }[] = [];
  for (let i = 0; i < notice.length; i += 2000) {
    noticeChunks.push({ text: { content: notice.slice(i, i + 2000) } });
  }

  const today = new Date().toISOString().slice(0, 10);

  await Promise.all(
    programs.map((p) =>
      notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          "프로그램 명": { title: [{ text: { content: p.name } }] },
          "공지글": { rich_text: noticeChunks },
          "프로그램 링크": { url: p.link },
          "모집기한": p.deadline ? { date: { start: p.deadline } } : { date: null },
          "게시일": { date: { start: today } },
        },
      })
    )
  );
}

async function crawlUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`${res.status}`);

  const html = await res.text();

  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 6000);
}

export async function POST(req: NextRequest) {
  try {
    const { urls, url, text } = await req.json();

    const urlList: string[] = urls ?? (url ? [url] : []);

    if (urlList.length === 0 && !text) {
      return NextResponse.json({ error: "URL 또는 텍스트를 입력해주세요." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API 키가 설정되지 않았어요." }, { status: 500 });
    }

    let content = text ?? "";

    if (urlList.length > 0) {
      const crawlResults = await Promise.all(
        urlList.map(async (u, i) => {
          try {
            const crawled = await crawlUrl(u);
            return `[공고 ${i + 1}]\n원본 URL: ${u}\n${crawled}`;
          } catch (e: unknown) {
            return `[공고 ${i + 1}]\n원본 URL: ${u}\n크롤링 실패: ${e instanceof Error ? e.message : ""}`;
          }
        })
      );
      content = crawlResults.join("\n\n");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `${SYSTEM_PROMPT}\n\n다음 내용을 공지문으로 변환해줘:\n\n${content}`;
    let result;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        const isRetryable = msg.includes("429") || msg.includes("quota") || msg.includes("503") || msg.includes("overloaded");
        if (attempt === 3 || !isRetryable) throw e;
        await new Promise((r) => setTimeout(r, attempt * 3000));
      }
    }

    if (!result) throw new Error("생성 결과를 받지 못했어요.");

    const now = new Date();
    const todayLabel = `${now.getMonth() + 1}월 ${now.getDate()}일`;
    const notice = result.response
      .text()
      .replace(/ENSPIRE 정기 발행물 \|[^\n]*/, `ENSPIRE 정기 발행물 | ${todayLabel}`);

    saveToNotion(notice).catch((e) => console.error("노션 저장 실패:", e));

    return NextResponse.json({ notice });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate error]", msg);
    const userMsg = msg.includes("429") || msg.includes("quota")
      ? "API 요청이 너무 많아요. 수집 직후에는 잠시(1분) 기다렸다가 생성해주세요."
      : msg.includes("503") || msg.includes("overloaded")
      ? "AI 서버가 일시적으로 과부하 상태예요. 잠시 후 다시 시도해주세요."
      : "공지문 생성 중 오류가 발생했어요. 다시 시도해주세요.";
    return NextResponse.json({ error: userMsg }, { status: 500 });
  }
}
