import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs/promises";
import path from "path";

export const maxDuration = 60;

export interface Activity {
  name: string;
  host: string;
  deadline: string;
  benefit: string;
  target: string;
  link: string;
  category: string;
  source: string;
}

export interface CrawlResults {
  crawledAt: string | null;
  activities: Activity[];
}

const DATA_FILE = path.join("/tmp", "crawl-results.json");

function hasEnoughTimeLeft(deadline: string): boolean {
  if (!deadline || deadline === "미확인") return true;
  const match = deadline.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
  if (!match) return true;
  const deadlineDate = new Date(
    parseInt(match[1]),
    parseInt(match[2]) - 1,
    parseInt(match[3])
  );
  const threeDaysLater = new Date();
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  threeDaysLater.setHours(0, 0, 0, 0);
  return deadlineDate >= threeDaysLater;
}

const fmt = (d: Date) =>
  `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;

async function searchCategory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any,
  category: string,
  todayStr: string,
  minDateStr: string
): Promise<Activity[]> {
  const categoryGuide: Record<string, string> = {
    창업: "대구경북 창업 경진대회, 대구 창업 지원금, 경북 액셀러레이터, 전국 스타트업 공모전, 청년창업사관학교, TIPS 프로그램",
    장학: "대구경북 대학생 장학금, 경북 장학재단, 전국 기업 장학생 모집, 재단 장학 프로그램",
    대외활동: "대구경북 대학생 서포터즈, 전국 홍보대사, 봉사단, 기자단, 체험단 모집 2026",
    공모전: "대구경북 공모전, 전국 대학생 아이디어 공모전, 창업 아이디어 경진대회, 디자인 공모전 2026",
  };

  const prompt = `오늘 날짜: ${todayStr}

"${category}" 관련 공고를 구글에서 검색해서 3개 이상 찾아줘.
대구·경북 창업 관심 대학생 카카오톡 채널용이야.

우선순위:
1순위: 대구·경북 지역 대학생 대상 공고
2순위: 전국 대학생 누구나 지원 가능한 공고

검색 키워드 힌트: ${categoryGuide[category]}

[조건]
- 마감일이 ${minDateStr} 이후인 것만 (3일 이상 남은 현재 모집중)
- 일반 기업 채용·취업 인턴 제외
- 대학원생 전용 제외
- 실제 존재하는 공고만

[출력: JSON 배열만, 마크다운·설명 없이]
[
  {
    "name": "프로그램명",
    "host": "주최기관",
    "deadline": "YYYY.MM.DD 또는 미확인",
    "benefit": "혜택 요약",
    "target": "지원 대상",
    "link": "공고 URL",
    "category": "${category}"
  }
]`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text: string = result.response.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.log(`[크롤] ${category}: JSON 없음`);
        return [];
      }
      const parsed = JSON.parse(jsonMatch[0]) as Activity[];
      return parsed
        .filter((a) => hasEnoughTimeLeft(a.deadline))
        .map((a) => ({ ...a, category, source: "Google 검색" }));
    } catch (e: unknown) {
      const status = (e as { status?: number })?.status;
      if (status === 503 && attempt < 2) {
        console.log(`[크롤] ${category} 503 재시도 (${attempt + 1})`);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      console.error(`[크롤] ${category} 실패:`, e);
      return [];
    }
  }
  return [];
}

async function runCrawl(): Promise<CrawlResults> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY 없음");

  const genAI = new GoogleGenerativeAI(apiKey);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = (genAI as any).getGenerativeModel({
    model: "gemini-2.5-flash",
    tools: [{ googleSearch: {} }],
  });

  const today = new Date();
  const todayStr = fmt(today);
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + 3);
  const minDateStr = fmt(minDate);

  const categories = ["창업", "장학", "대외활동", "공모전"];

  const results2D = await Promise.all(
    categories.map((cat) => searchCategory(model, cat, todayStr, minDateStr))
  );
  const allActivities = results2D.flat();
  categories.forEach((cat, i) => console.log(`[크롤] ${cat}: ${results2D[i].length}개`));

  const results: CrawlResults = {
    crawledAt: new Date().toISOString(),
    activities: allActivities,
  };

  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(results, null, 2), "utf-8");

  return results;
}

export async function POST(request: Request) {
  try {
    let body: { category?: string } = {};
    try { body = await request.json(); } catch {}

    if (body.category) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY 없음");
      const genAI = new GoogleGenerativeAI(apiKey);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = (genAI as any).getGenerativeModel({
        model: "gemini-2.5-flash",
        tools: [{ googleSearch: {} }],
      });
      const today = new Date();
      const todayStr = fmt(today);
      const minDate = new Date(today);
      minDate.setDate(minDate.getDate() + 3);
      const minDateStr = fmt(minDate);
      const activities = await searchCategory(model, body.category, todayStr, minDateStr);
      console.log(`[크롤] ${body.category}: ${activities.length}개`);
      return NextResponse.json({ activities });
    }

    const results = await runCrawl();
    return NextResponse.json(results);
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ error: "크롤링 중 오류가 발생했어요." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json({ crawledAt: null, activities: [] });
  }
}
