"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Activity, CrawlResults } from "../api/crawl/route";
import { useTheme } from "../theme";

const CATEGORY_COLORS: Record<string, string> = {
  창업: "#F59E0B",
  장학: "#60A5FA",
  대외활동: "#34D399",
  공모전: "#A78BFA",
  기타: "#6B7280",
};

const CATEGORIES = ["전체", "창업", "장학", "대외활동", "공모전"];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

export default function CrawlPage() {
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const [results, setResults] = useState<CrawlResults>({ crawledAt: null, activities: [] });
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("전체");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const fetchResults = useCallback(async () => {
    const res = await fetch("/api/crawl");
    if (res.ok) setResults(await res.json());
  }, []);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const startCrawl = async () => {
    setLoading(true);
    setError("");
    setSelected(new Set());
    try {
      const categories = ["창업", "장학", "대외활동", "공모전"];
      const settled = await Promise.allSettled(
        categories.map((cat) =>
          fetch("/api/crawl", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category: cat }),
          }).then((r) => r.json() as Promise<{ activities?: Activity[] }>)
        )
      );
      const allActivities = settled
        .filter((r): r is PromiseFulfilledResult<{ activities: Activity[] }> =>
          r.status === "fulfilled" && Array.isArray(r.value.activities)
        )
        .flatMap((r) => r.value.activities);
      if (allActivities.length === 0) throw new Error();
      setResults({ crawledAt: new Date().toISOString(), activities: allActivities });
    } catch {
      setError("수집 중 오류가 발생했어요. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = results.activities.filter(
    (a) => category === "전체" || a.category === category
  );

  const toggleSelect = (globalIdx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(globalIdx)) {
        next.delete(globalIdx);
      } else if (next.size < 5) {
        next.add(globalIdx);
      }
      return next;
    });
  };

  const goGenerate = () => {
    const selectedActivities = results.activities.filter((_, i) => selected.has(i));
    sessionStorage.setItem("selectedActivities", JSON.stringify(selectedActivities));
    router.push("/?from=crawl");
  };

  return (
    <div className="crawl-wrapper" style={{
      minHeight: "100vh",
      background: theme.bg,
      fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .crawl-wrapper { padding: 28px 18px 110px; }
        .crawl-inner { max-width: 480px; margin: 0 auto; }
        .cards-grid { display: flex; flex-direction: column; gap: 10px; }

        @media (min-width: 768px) {
          .crawl-wrapper { padding: 40px 60px 110px; }
          .crawl-inner { max-width: 1280px; }
          .cards-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
          .floating-btn-wrap {
            max-width: 1160px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: calc(100% - 120px) !important;
          }
        }

        @media (min-width: 768px) and (max-width: 1100px) {
          .cards-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      <div className="crawl-inner">
        {/* 헤더 */}
        <div style={{ marginBottom: "22px" }}>
          {/* 로고 행 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
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

          {/* EN.SPIRE + 수집 버튼 행 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <a href="/" style={{ textDecoration: "none" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "7px",
                background: "linear-gradient(135deg, #E8A800, #FFD100)",
                borderRadius: "50px", padding: "7px 18px",
                boxShadow: "0 4px 14px rgba(232,168,0,0.45)",
              }}>
                <span style={{ fontSize: "14px" }}>✨</span>
                <span style={{ color: "#0F1923", fontWeight: 900, fontSize: "13px", letterSpacing: "3px" }}>EN.SPIRE</span>
              </div>
            </a>

            <button
              onClick={startCrawl}
              disabled={loading}
              style={{
                padding: "10px 18px",
                background: loading ? theme.loadingBg : theme.btnBg,
                border: "none", borderRadius: "50px",
                color: loading ? theme.loadingColor : theme.btnColor,
                fontSize: "13px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: "6px",
                boxShadow: loading ? "none" : "0 4px 14px rgba(245,200,66,0.35)",
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: "12px", height: "12px",
                    border: `2px solid ${theme.loadingBg}`, borderTop: `2px solid ${theme.loadingColor}`,
                    borderRadius: "50%", animation: "spin 0.8s linear infinite",
                    display: "inline-block",
                  }} />
                  수집 중...
                </>
              ) : "🔄 지금 수집"}
            </button>
          </div>

          {/* 수집 상태 */}
          <div style={{
            background: theme.surface, borderRadius: "14px", padding: "12px 16px",
            boxShadow: `0 2px 14px ${theme.cardShadow}`,
            border: `1px solid ${theme.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: theme.textPrimary }}>
                {results.crawledAt ? `마지막 수집: ${timeAgo(results.crawledAt)}` : "아직 수집 안 됨"}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: theme.textSecondary }}>
                총 {results.activities.length}개 공고
              </p>
            </div>
            {selected.size > 0 && (
              <span style={{
                fontSize: "12px", fontWeight: 700, color: theme.gold,
                background: "rgba(245,200,66,0.15)", padding: "4px 12px",
                borderRadius: "50px",
              }}>
                {selected.size}/5 선택
              </span>
            )}
          </div>

          {error && (
            <div style={{
              background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.3)",
              borderRadius: "10px", padding: "10px 14px", marginTop: "10px", textAlign: "center",
            }}>
              <p style={{ color: "#FF4757", fontSize: "12px", margin: 0, fontWeight: 600 }}>⚠️ {error}</p>
            </div>
          )}
        </div>

        {/* 선택 안내 */}
        {results.activities.length > 0 && selected.size === 0 && (
          <p style={{ fontSize: "12px", color: theme.dividerText, textAlign: "center", margin: "0 0 14px", fontWeight: 500 }}>
            공고를 선택하면 바로 공지문을 만들 수 있어요 (최대 5개)
          </p>
        )}

        {/* 카테고리 탭 */}
        {results.activities.length > 0 && (
          <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setCategory(cat)} style={{
                padding: "6px 14px", border: "none", borderRadius: "50px",
                fontSize: "12px", fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                background: category === cat ? theme.goldGradient : theme.surface,
                color: category === cat ? "#1A1200" : theme.textSecondary,
                boxShadow: category === cat ? "0 3px 10px rgba(245,200,66,0.3)" : `0 2px 8px ${theme.cardShadow}`,
              }}>
                {cat}
                {cat !== "전체" && (
                  <span style={{ marginLeft: "5px", opacity: 0.85 }}>
                    {results.activities.filter((a) => a.category === cat).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* 공고 없음 */}
        {filtered.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "48px 0", color: theme.textMuted }}>
            <p style={{ fontSize: "32px", margin: "0 0 10px" }}>🗂</p>
            <p style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 4px", color: theme.textSecondary }}>
              {results.activities.length === 0 ? "공고를 수집해보세요" : "해당 카테고리 공고가 없어요"}
            </p>
            <p style={{ fontSize: "12px", margin: 0 }}>
              {results.activities.length === 0 ? "위의 \"지금 수집\" 버튼을 눌러주세요 🚀" : "다른 카테고리를 확인해보세요"}
            </p>
          </div>
        )}

        {/* 공고 목록 */}
        <div className="cards-grid">
          {filtered.map((a: Activity) => {
            const globalIdx = results.activities.indexOf(a);
            const isSelected = selected.has(globalIdx);
            const isDisabled = !isSelected && selected.size >= 5;
            return (
              <div
                key={globalIdx}
                onClick={() => !isDisabled && toggleSelect(globalIdx)}
                style={{
                  background: theme.surface, borderRadius: "16px", padding: "15px 16px",
                  boxShadow: isSelected
                    ? `0 0 0 2px ${theme.gold}, 0 4px 20px rgba(245,200,66,0.15)`
                    : `0 2px 14px ${theme.cardShadow}`,
                  borderLeft: `4px solid ${isSelected ? theme.gold : (CATEGORY_COLORS[a.category] ?? "#6B7280")}`,
                  cursor: isDisabled ? "default" : "pointer",
                  opacity: isDisabled ? 0.35 : 1,
                  transition: "all 0.15s",
                  position: "relative",
                  border: isSelected ? `1px solid rgba(245,200,66,0.3)` : `1px solid ${theme.border}`,
                  borderLeftWidth: "4px",
                }}
              >
                {/* 체크 */}
                <div style={{
                  position: "absolute", top: "14px", right: "14px",
                  width: "22px", height: "22px", borderRadius: "50%",
                  border: isSelected ? "none" : `2px solid ${theme.checkBorder}`,
                  background: isSelected ? "linear-gradient(135deg, #F5C842, #E8A800)" : theme.checkBg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", color: "#0F1923", fontWeight: 800,
                  transition: "all 0.15s",
                  flexShrink: 0,
                }}>
                  {isSelected && "✓"}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", paddingRight: "32px" }}>
                  <span style={{
                    fontSize: "10px", fontWeight: 800, padding: "2px 9px",
                    borderRadius: "50px", color: "white",
                    background: CATEGORY_COLORS[a.category] ?? "#6B7280",
                    letterSpacing: "0.3px",
                  }}>
                    {a.category}
                  </span>
                  <span style={{ fontSize: "10px", color: theme.textMuted, fontWeight: 500 }}>{a.source}</span>
                </div>

                <p style={{ margin: "0 0 3px", fontSize: "14px", fontWeight: 800, color: theme.textPrimary, lineHeight: 1.35, paddingRight: "8px" }}>
                  {a.name}
                </p>
                <p style={{ margin: "0 0 10px", fontSize: "12px", color: theme.textSecondary, fontWeight: 500 }}>{a.host}</p>

                <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "12px" }}>
                  {a.deadline && a.deadline !== "미확인" && (
                    <p style={{ margin: 0, fontSize: "12px", color: theme.regenColor, fontWeight: 500 }}>
                      📅 마감 <strong style={{ color: "#FF4757" }}>{a.deadline}</strong>
                    </p>
                  )}
                  {a.benefit && (
                    <p style={{ margin: 0, fontSize: "12px", color: theme.regenColor }}>💰 {a.benefit}</p>
                  )}
                  {a.target && (
                    <p style={{ margin: 0, fontSize: "12px", color: theme.regenColor }}>👤 {a.target}</p>
                  )}
                </div>

                <div onClick={(e) => e.stopPropagation()}>
                  {a.link && (
                    <a href={a.link} target="_blank" rel="noopener noreferrer" style={{
                      display: "block", padding: "9px", textAlign: "center",
                      border: `1.5px solid ${theme.linkBorder}`, borderRadius: "10px",
                      fontSize: "12px", fontWeight: 700, color: theme.linkColor,
                      textDecoration: "none", transition: "all 0.15s",
                    }}>
                      🔗 공고 보기
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p style={{ textAlign: "center", color: theme.footer, fontSize: "11px", marginTop: "32px", letterSpacing: "0.5px" }}>
          ENSPIRE · 매주 월·수·금 발행
        </p>
      </div>

      {/* 플로팅 생성 버튼 */}
      {selected.size > 0 && (
        <div className="floating-btn-wrap" style={{
          position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
          zIndex: 100, width: "calc(100% - 36px)", maxWidth: "444px",
        }}>
          <button onClick={goGenerate} style={{
            width: "100%", padding: "17px",
            background: theme.btnBg,
            border: "none", borderRadius: "16px",
            color: theme.btnColor, fontSize: "15px", fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 8px 28px rgba(245,200,66,0.4)",
            letterSpacing: "0.3px",
          }}>
            ✍️ {selected.size}개 공고로 공지문 만들기
          </button>
        </div>
      )}
    </div>
  );
}
