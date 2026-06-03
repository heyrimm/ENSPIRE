"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTheme, type Theme } from "./theme";

interface Activity {
  name: string;
  host: string;
  deadline: string;
  benefit: string;
  target: string;
  link: string;
  category: string;
  source: string;
}

const CIRCLE_NUMS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];
const MAX_URLS = 5;

const CATEGORY_COLORS: Record<string, string> = {
  창업: "#F59E0B",
  장학: "#60A5FA",
  대외활동: "#34D399",
  공모전: "#A78BFA",
  기타: "#6B7280",
};

export default function Home() {
  const { theme, toggle } = useTheme();
  const searchParams = useSearchParams();
  const [crawlActivities, setCrawlActivities] = useState<Activity[]>([]);
  const [inputMode, setInputMode] = useState<"url" | "text">("url");
  const [urls, setUrls] = useState<string[]>(["", "", "", "", ""]);
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (searchParams.get("from") === "crawl") {
      try {
        const stored = sessionStorage.getItem("selectedActivities");
        if (stored) {
          setCrawlActivities(JSON.parse(stored));
          sessionStorage.removeItem("selectedActivities");
        }
      } catch {}
      return;
    }
    const urlList = searchParams.getAll("url");
    if (urlList.length > 0) {
      const filled = [...urlList.slice(0, 5), "", "", "", "", ""].slice(0, 5);
      setUrls(filled);
    }
  }, [searchParams]);

  const generate = async () => {
    setError("");
    setLoading(true);
    setNotice("");

    let body: Record<string, unknown>;

    if (crawlActivities.length > 0) {
      const textContent = crawlActivities
        .map((a, i) =>
          `[공고 ${i + 1}]\n프로그램명: ${a.name}\n주최: ${a.host}\n마감: ${a.deadline}\n혜택: ${a.benefit}\n대상: ${a.target}\n카테고리: ${a.category}\n링크: ${a.link || "미확인"}`
        )
        .join("\n\n");
      body = { text: textContent };
    } else if (inputMode === "url") {
      const validUrls = urls.map((u) => u.trim()).filter(Boolean);
      if (validUrls.length === 0) {
        setError("링크를 최소 1개 이상 입력해주세요");
        setLoading(false);
        return;
      }
      body = { urls: validUrls };
    } else {
      const input = text.trim();
      if (!input) {
        setError("내용을 붙여넣어주세요");
        setLoading(false);
        return;
      }
      body = { text: input };
    }

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "오류가 발생했어요");
      setNotice(data.notice);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "오류가 발생했어요. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(notice);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderPreview = (t: string) =>
    t.split("\n").map((line, i) => (
      <div key={i} style={{
        color: line.startsWith("ENSPIRE") ? theme.gold : line.startsWith("──") ? theme.previewSep : theme.previewText,
        fontWeight: line.startsWith("ENSPIRE") || CIRCLE_NUMS.some((c) => line.startsWith(c)) ? 700 : 400,
        fontSize: line.startsWith("ENSPIRE") ? "14px" : "13px",
        lineHeight: 1.9,
      }}>
        {line || " "}
      </div>
    ));

  const validUrlCount = urls.filter((u) => u.trim()).length;
  const isCrawlMode = crawlActivities.length > 0;

  return (
    <div className="page-wrapper" style={{
      minHeight: "100vh",
      background: theme.bg,
      fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        input::placeholder { color: ${theme.textMuted}; }
        textarea::placeholder { color: ${theme.textMuted}; }

        .page-wrapper { padding: 28px 18px 48px; }
        .page-inner { max-width: 480px; margin: 0 auto; }
        .desktop-only { display: none; }

        @media (min-width: 768px) {
          .page-wrapper { padding: 40px 60px 60px; }
          .page-inner { max-width: 1280px; }
          .desktop-grid {
            display: grid;
            grid-template-columns: 480px 420px;
            gap: 40px;
            align-items: start;
            justify-content: center;
          }
          .desktop-sticky { position: sticky; top: 40px; }
          .desktop-only { display: block; }
        }
      `}</style>

      <div className="page-inner">
        {/* 헤더 */}
        <div style={{ marginBottom: "28px" }}>
          {/* 로고 행 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            {/* 다크/라이트 토글 */}
            <button
              onClick={toggle}
              title={theme.mode === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
              style={{
                background: theme.surface,
                border: `1px solid ${theme.borderMuted}`,
                borderRadius: "50%",
                width: "38px", height: "38px",
                cursor: "pointer",
                fontSize: "18px",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                boxShadow: `0 2px 8px ${theme.cardShadow}`,
                transition: "all 0.2s",
              }}
            >
              {theme.mode === "dark" ? "☀️" : "🌙"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <img src="/enactus.png" alt="enactus" style={{ height: "40px", objectFit: "contain" }} />
              <img src="/knu.png" alt="경북대학교" style={{ height: "40px", objectFit: "contain" }} />
            </div>
          </div>

          {/* EN.SPIRE + 타이틀 */}
          <div style={{ textAlign: "center" }}>
            <a href="/" style={{ textDecoration: "none", display: "inline-block", marginBottom: "12px" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "7px",
                background: "linear-gradient(135deg, #E8A800, #FFD100)",
                borderRadius: "50px", padding: "7px 20px",
                boxShadow: "0 4px 16px rgba(232,168,0,0.45)",
              }}>
                <span style={{ fontSize: "15px" }}>✨</span>
                <span style={{ color: "#0F1923", fontWeight: 900, fontSize: "14px", letterSpacing: "3px" }}>EN.SPIRE</span>
              </div>
            </a>
            <h1 style={{ fontSize: "17px", fontWeight: 800, color: theme.textPrimary, margin: "0 0 4px" }}>
              공지문 생성기
            </h1>
            <p style={{ color: theme.textSecondary, fontSize: "12px", margin: 0, letterSpacing: "0.3px" }}>
              대구·경북 대학생 창업·행사 정보 채널
            </p>
          </div>
        </div>

        {/* 메인 콘텐츠: 모바일 1열 / 데스크톱 2열 */}
        <div className="desktop-grid">
          {/* 왼쪽: 입력 영역 */}
          <div>
            {isCrawlMode ? (
              /* ── 크롤 선택 모드 ── */
              <div style={{ animation: "fadeUp 0.25s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <Link href="/crawl" style={{
                    fontSize: "13px", color: theme.gold, textDecoration: "none",
                    fontWeight: 700, display: "flex", alignItems: "center", gap: "1px",
                  }}>
                    ← 다시 선택
                  </Link>
                  <span style={{
                    fontSize: "12px", fontWeight: 700, color: theme.gold,
                    background: "rgba(245,200,66,0.15)", padding: "4px 12px",
                    borderRadius: "50px",
                  }}>
                    {crawlActivities.length}개 선택됨
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "18px" }}>
                  {crawlActivities.map((a, i) => (
                    <div key={i} style={{
                      background: theme.surface, borderRadius: "14px", padding: "13px 15px",
                      boxShadow: `0 2px 14px ${theme.cardShadow}`,
                      borderLeft: `3px solid ${CATEGORY_COLORS[a.category] ?? "#6B7280"}`,
                      display: "flex", alignItems: "center", gap: "12px",
                    }}>
                      <span style={{
                        minWidth: "24px", height: "24px", borderRadius: "50%",
                        background: "linear-gradient(135deg, #F5C842, #E8A800)",
                        color: "#0F1923", fontSize: "11px", fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                          <span style={{
                            fontSize: "10px", fontWeight: 700, padding: "1px 7px",
                            borderRadius: "50px", color: "white",
                            background: CATEGORY_COLORS[a.category] ?? "#6B7280",
                          }}>{a.category}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: theme.textPrimary, lineHeight: 1.3 }}>{a.name}</p>
                        <p style={{ margin: "2px 0 0", fontSize: "11px", color: theme.textSecondary }}>
                          {a.host}{a.deadline && a.deadline !== "미확인" ? ` · 마감 ${a.deadline}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* ── 기본 입력 모드 ── */
              <>
                {/* 공고 수집 CTA */}
                <Link href="/crawl" style={{ textDecoration: "none", display: "block", marginBottom: "18px" }}>
                  <div style={{
                    background: theme.ctaBg,
                    borderRadius: "20px", padding: "18px 20px",
                    boxShadow: "0 6px 24px rgba(245,200,66,0.15)",
                    border: `1px solid ${theme.ctaBorder}`,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: "12px",
                  }}>
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 800, color: theme.mode === "dark" ? "white" : theme.textPrimary }}>
                        🔍 공고 자동 수집
                      </p>
                      <p style={{ margin: 0, fontSize: "12px", color: theme.mode === "dark" ? "rgba(255,255,255,0.65)" : theme.textSecondary, lineHeight: 1.5 }}>
                        창업·장학·대외활동·공모전 공고를<br />자동으로 모아 바로 공지문 생성
                      </p>
                    </div>
                    <div style={{
                      background: theme.mode === "dark" ? "rgba(255,255,255,0.15)" : theme.goldGradient,
                      borderRadius: "50px", padding: "8px 14px", flexShrink: 0,
                      fontSize: "12px", fontWeight: 700,
                      color: theme.mode === "dark" ? "white" : "#1A1200",
                      border: theme.mode === "dark" ? "1.5px solid rgba(255,255,255,0.35)" : "none",
                      boxShadow: theme.mode === "light" ? "0 2px 10px rgba(245,184,0,0.35)" : "none",
                    }}>
                      수집하기 →
                    </div>
                  </div>
                </Link>

                {/* 구분선 */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                  <div style={{ flex: 1, height: "1px", background: theme.divider }} />
                  <span style={{ fontSize: "11px", color: theme.dividerText, fontWeight: 600, letterSpacing: "0.5px" }}>또는 직접 입력</span>
                  <div style={{ flex: 1, height: "1px", background: theme.divider }} />
                </div>

                {/* 탭 */}
                <div style={{
                  display: "flex", background: theme.tabBg, borderRadius: "14px",
                  padding: "4px", marginBottom: "14px",
                }}>
                  {(["url", "text"] as const).map((mode) => (
                    <button key={mode} onClick={() => { setInputMode(mode); setError(""); }} style={{
                      flex: 1, padding: "10px", border: "none", borderRadius: "10px",
                      fontSize: "13px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
                      background: inputMode === mode ? theme.goldGradient : "transparent",
                      color: inputMode === mode ? "#0F1923" : theme.textSecondary,
                      boxShadow: inputMode === mode ? "0 1px 6px rgba(245,200,66,0.3)" : "none",
                    }}>
                      {mode === "url" ? "🔗 링크 입력" : "📋 텍스트 붙여넣기"}
                    </button>
                  ))}
                </div>

                {/* 입력 영역 */}
                <div style={{
                  background: theme.surface, borderRadius: "18px", padding: "16px",
                  marginBottom: "14px",
                  boxShadow: `0 2px 16px ${theme.cardShadow}`,
                  border: error ? "1.5px solid #F5C842" : `1px solid ${theme.border}`,
                }}>
                  {inputMode === "url" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {Array.from({ length: MAX_URLS }).map((_, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{
                            minWidth: "22px", height: "22px", borderRadius: "50%",
                            background: urls[i]?.trim() ? "linear-gradient(135deg, #F5C842, #E8A800)" : theme.loadingBg,
                            color: urls[i]?.trim() ? "#0F1923" : theme.loadingColor,
                            fontSize: "11px", fontWeight: 800,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0, transition: "all 0.2s",
                          }}>{i + 1}</span>
                          <input
                            value={urls[i]}
                            onChange={(e) => { const n = [...urls]; n[i] = e.target.value; setUrls(n); setError(""); }}
                            placeholder={`링크 ${i + 1} (선택)`}
                            style={{
                              flex: 1, border: "none", borderBottom: `1.5px solid ${theme.inputBorder}`,
                              outline: "none", fontSize: "13px", color: theme.inputColor,
                              background: "transparent", padding: "6px 0",
                              fontFamily: "inherit",
                            }}
                          />
                        </div>
                      ))}
                      {validUrlCount > 0 && (
                        <p style={{ margin: "4px 0 0", fontSize: "11px", color: theme.gold, textAlign: "right", fontWeight: 600 }}>
                          {validUrlCount}개 링크 입력됨
                        </p>
                      )}
                    </div>
                  ) : (
                    <textarea
                      value={text}
                      onChange={(e) => { setText(e.target.value); setError(""); }}
                      placeholder={`ENSPIRE 정기 발행물 | 05월 15일\n──────────────\n① [대외활동] 활동명\n- 마감 : 2026.05.31\n- 링크 : https://...`}
                      style={{
                        width: "100%", minHeight: "200px", border: "none",
                        outline: "none", resize: "vertical", fontSize: "13px",
                        color: theme.inputColor, background: "transparent", lineHeight: 1.85,
                        fontFamily: "inherit",
                      }}
                    />
                  )}
                </div>
              </>
            )}

            {error && (
              <div style={{
                background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.3)",
                borderRadius: "10px", padding: "10px 14px",
                marginBottom: "12px", textAlign: "center",
              }}>
                <p style={{ color: "#FF4757", fontSize: "12px", margin: 0, fontWeight: 600 }}>⚠️ {error}</p>
              </div>
            )}

            {/* 생성 버튼 */}
            <button onClick={generate} disabled={loading} style={{
              width: "100%", padding: "17px",
              background: loading ? theme.loadingBg : theme.goldGradient,
              border: "none", borderRadius: "16px",
              color: loading ? theme.loadingColor : "#1A1200",
              fontSize: "15px", fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
              marginBottom: "20px",
              boxShadow: loading ? "none" : "0 6px 20px rgba(245,200,66,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              letterSpacing: "0.3px", transition: "opacity 0.2s",
            }}>
              {loading ? (
                <>
                  <span style={{
                    width: "15px", height: "15px",
                    border: `2px solid ${theme.loadingBg}`, borderTop: `2px solid ${theme.loadingColor}`,
                    borderRadius: "50%", animation: "spin 0.8s linear infinite",
                    display: "inline-block",
                  }} />
                  공지문 생성 중...
                </>
              ) : "🔥 공지문 생성하기"}
            </button>

            {/* 모바일 결과 (데스크톱에서는 오른쪽 열에 표시) */}
            {notice && (
              <div className="desktop-only" style={{ display: "none" }} />
            )}
            {notice && (
              <div className="mobile-result" style={{ animation: "fadeUp 0.3s ease" }}>
                <ResultCard
                  notice={notice}
                  copied={copied}
                  handleCopy={handleCopy}
                  generate={generate}
                  theme={theme}
                  renderPreview={renderPreview}
                />
              </div>
            )}
          </div>

          {/* 오른쪽: 결과 (데스크톱 전용) */}
          <div className="desktop-sticky desktop-only">
            {notice ? (
              <ResultCard
                notice={notice}
                copied={copied}
                handleCopy={handleCopy}
                generate={generate}
                theme={theme}
                renderPreview={renderPreview}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* 사용 방법 */}
                <div style={{
                  background: theme.surface, borderRadius: "20px", padding: "24px",
                  boxShadow: `0 4px 24px ${theme.cardShadow}`,
                  border: `1px solid ${theme.border}`,
                }}>
                  <p style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 800, color: theme.textPrimary, letterSpacing: "0.3px" }}>
                    💡 사용 방법
                  </p>
                  {[
                    { step: "1", icon: "🔍", text: "공고 자동 수집으로 최신 공고를 불러오거나" },
                    { step: "2", icon: "🔗", text: "공고 링크나 텍스트를 직접 입력하고" },
                    { step: "3", icon: "🔥", text: "생성하기를 누르면 카톡 공지문 완성!" },
                  ].map(({ step, icon, text }) => (
                    <div key={step} style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                      <span style={{
                        minWidth: "24px", height: "24px", borderRadius: "50%",
                        background: "linear-gradient(135deg, #F5C842, #E8A800)",
                        color: "#0F1923", fontSize: "11px", fontWeight: 900,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>{step}</span>
                      <p style={{ margin: 0, fontSize: "13px", color: theme.textSecondary, lineHeight: 1.6 }}>
                        <span style={{ marginRight: "6px" }}>{icon}</span>{text}
                      </p>
                    </div>
                  ))}
                </div>

                {/* 샘플 미리보기 */}
                <div style={{
                  background: theme.surface, borderRadius: "20px", padding: "24px",
                  boxShadow: `0 4px 24px ${theme.cardShadow}`,
                  border: `1px solid ${theme.border}`,
                }}>
                  <p style={{ margin: "0 0 14px", fontSize: "13px", fontWeight: 800, color: theme.textPrimary, letterSpacing: "0.3px" }}>
                    📋 생성 예시
                  </p>
                  <div style={{
                    background: theme.previewBg, borderRadius: "12px", padding: "14px 16px",
                    borderLeft: `4px solid ${theme.gold}`, opacity: 0.75,
                  }}>
                    {[
                      { text: "ENSPIRE 정기 발행물 | 05월 26일", gold: true, bold: true },
                      { text: "──────────────", sep: true },
                      { text: "① [창업] 2026 청년창업사관학교 모집", bold: true },
                      { text: "- 마감 : 2026.06.30" },
                      { text: "- 혜택 : 사업화 자금 최대 1억원" },
                      { text: "- 대상 : 만 39세 이하 예비창업자" },
                      { text: "──────────────", sep: true },
                      { text: "② [대외활동] ○○기업 서포터즈 5기", bold: true },
                      { text: "- 마감 : 2026.06.15" },
                      { text: "- 혜택 : 활동비 월 20만원" },
                    ].map((line, i) => (
                      <div key={i} style={{
                        fontSize: "12px", lineHeight: 1.85,
                        color: line.gold ? theme.gold : line.sep ? theme.previewSep : theme.previewText,
                        fontWeight: line.bold ? 700 : 400,
                      }}>
                        {line.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <p style={{ textAlign: "center", color: theme.footer, fontSize: "11px", marginTop: "32px", letterSpacing: "0.5px" }}>
          ENSPIRE · 매주 월·수·금 발행
        </p>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .mobile-result { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function ResultCard({
  notice, copied, handleCopy, generate, theme, renderPreview,
}: {
  notice: string;
  copied: boolean;
  handleCopy: () => void;
  generate: () => void;
  theme: Theme;
  renderPreview: (t: string) => React.ReactNode[];
}) {
  return (
    <div style={{
      background: theme.surface, borderRadius: "20px", padding: "20px",
      boxShadow: `0 4px 24px ${theme.cardShadow}`,
      border: `1px solid ${theme.border}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <span style={{ fontSize: "18px" }}>💬</span>
          <span style={{ fontWeight: 800, fontSize: "14px", color: theme.textPrimary }}>완성된 공지문</span>
        </div>
        <button onClick={handleCopy} style={{
          padding: "7px 16px",
          background: copied ? "linear-gradient(135deg, #27AE60, #2ecc71)" : "linear-gradient(135deg, #F5C842, #E8A800)",
          border: "none", borderRadius: "50px",
          color: copied ? "white" : "#0F1923", fontSize: "12px", fontWeight: 700,
          cursor: "pointer", boxShadow: "0 2px 10px rgba(245,200,66,0.25)",
          transition: "all 0.2s",
        }}>
          {copied ? "✅ 복사됨!" : "📋 복사하기"}
        </button>
      </div>

      <div style={{
        background: theme.previewBg, borderRadius: "14px",
        padding: "16px 18px",
        borderLeft: `4px solid ${theme.gold}`,
      }}>
        {renderPreview(notice)}
      </div>

      <button onClick={generate} style={{
        width: "100%", padding: "13px",
        background: "transparent", border: `1.5px solid ${theme.regenBorder}`,
        borderRadius: "12px", color: theme.regenColor,
        fontSize: "13px", fontWeight: 700,
        cursor: "pointer", marginTop: "14px",
        transition: "all 0.2s",
      }}>
        🔄 다시 생성하기
      </button>
    </div>
  );
}
