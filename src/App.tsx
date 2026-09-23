import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowLeft, ArrowUpRight } from "lucide-react";
import Header from "./components/Header";
import ExhibitCard from "./components/ExhibitCard";
import { assetUrl, exhibits, exhibitHref, number, parseRoute } from "./lib";
import type { Exhibit } from "./types";

const ExhibitViewer = lazy(() => import("./components/ExhibitViewer"));

function Home() {
  const first = exhibits[0];
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h1>
            讓目光，
            <br />
            慢一點。
          </h1>
          <p className="hero-english">
            A SLOWER LOOK.
            <br />A DIFFERENT PERSPECTIVE.
          </p>
          <p className="curator-copy">
            在光影與形狀之間，重新發現物件。
            <br />
            轉一個角度，靠近一點，
            <br />
            把時間留給那些值得凝視的細節。
          </p>
          <a
            className="button primary"
            href={first ? exhibitHref(first.id) : "#/collection"}
          >
            開始參觀 <ArrowRight size={21} />
          </a>
        </div>
        {first ? (
          <a
            className="hero-art"
            href={exhibitHref(first.id)}
            aria-label={`欣賞 ${first.title}`}
          >
            <img
              src={assetUrl(first.poster)}
              alt={first.alt}
              fetchPriority="high"
              width="1000"
              height="1000"
            />
            <div className="hero-art-label">
              <span>01 — {first.title}</span>
              <span>
                探索作品 <ArrowUpRight size={16} />
              </span>
            </div>
          </a>
        ) : null}
      </section>
      <section className="selected-works" aria-labelledby="selected-title">
        <div className="section-heading">
          <h2 id="selected-title">
            本期展品 <span>THE COLLECTION</span>
          </h2>
          <a href="#/collection">
            完整目錄 <ArrowRight size={17} />
          </a>
        </div>
        <div className="exhibit-grid">
          {exhibits.slice(0, 3).map((exhibit, index) => (
            <ExhibitCard key={exhibit.id} exhibit={exhibit} index={index} />
          ))}
        </div>
      </section>
      <div className="curatorial-note">
        <span>關於這座展館</span>
        <p>
          一座沒有距離的小型美術館。
          <br />
          以三維的方式收藏視角，讓每一次觀看，都有新的發現。
        </p>
        <span className="english-label">TAKE YOUR TIME. LOOK CLOSER.</span>
      </div>
    </>
  );
}
function Collection() {
  return (
    <section className="collection-page">
      <div className="collection-heading">
        <div>
          <p className="english-label">THE COLLECTION</p>
          <h1>每一件，都值得停留。</h1>
        </div>
        <p>
          {number(exhibits.length)} 件展品
          <br />
          <span>依序欣賞，或跟隨你的目光。</span>
        </p>
      </div>
      <div className="exhibit-grid">
        {exhibits.map((exhibit, index) => (
          <ExhibitCard key={exhibit.id} exhibit={exhibit} index={index} />
        ))}
      </div>
      {!exhibits.length ? <p>新展覽正在準備中，敬請期待。</p> : null}
    </section>
  );
}
function ExhibitPage({ exhibit }: { exhibit: Exhibit }) {
  const index = exhibits.findIndex((item) => item.id === exhibit.id);
  const previous = exhibits[index - 1],
    next = exhibits[index + 1];
  return (
    <article className="exhibit-page">
      <nav className="breadcrumb" aria-label="目前位置">
        <a href="#/collection">展品目錄</a>
        <span>/</span>
        <span>{number(index + 1)}</span>
        <span>/</span>
        <span>{exhibit.title}</span>
      </nav>
      <div className="exhibit-layout">
        <Suspense
          fallback={
            <div className="model-stage">
              <img
                className="fallback-poster"
                src={assetUrl(exhibit.poster)}
                alt={exhibit.alt}
              />
              <p role="status">正在準備展品…</p>
            </div>
          }
        >
          <ExhibitViewer key={exhibit.id} exhibit={exhibit} />
        </Suspense>
        <div className="exhibit-details">
          <div className="exhibit-number">
            {number(index + 1)}
            <span>OBJECT / {number(exhibits.length)}</span>
          </div>
          <h1>{exhibit.title}</h1>
          <p className="exhibit-subtitle">{exhibit.subtitle}</p>
          <div className="exhibit-prose">
            {exhibit.description.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <dl className="credits">
            <div>
              <dt>創作者</dt>
              <dd>{exhibit.creator}</dd>
            </div>
            <div>
              <dt>檔案格式</dt>
              <dd>glTF 2.0 / GLB</dd>
            </div>
            <div>
              <dt>授權條款</dt>
              <dd>
                <a href={exhibit.licenseUrl} target="_blank" rel="noreferrer">
                  {exhibit.license} <ArrowUpRight size={13} />
                </a>
              </dd>
            </div>
          </dl>
          <a
            className="source-link"
            href={exhibit.source}
            target="_blank"
            rel="noreferrer"
          >
            查看模型來源 <ArrowUpRight size={15} />
          </a>
          {exhibit.sample ? (
            <p className="sample-note">
              示範展品 · 來自 Khronos glTF 範例收藏，
              <br />非 LM 原創作品。展品名稱及文字為展示用策展文案。
            </p>
          ) : null}
        </div>
      </div>
      <nav className="exhibit-pagination" aria-label="展品順序">
        {previous ? (
          <a className="button outline" href={exhibitHref(previous.id)}>
            <ArrowLeft size={18} />
            上一件
          </a>
        ) : (
          <a className="button outline" href="#/collection">
            <ArrowLeft size={18} />
            展品目錄
          </a>
        )}
        <span>
          <b>{number(index + 1)}</b> / {number(exhibits.length)}
        </span>
        {next ? (
          <a className="button outline" href={exhibitHref(next.id)}>
            下一件
            <ArrowRight size={18} />
          </a>
        ) : (
          <a className="button outline" href="#/collection">
            回到目錄
            <ArrowRight size={18} />
          </a>
        )}
      </nav>
    </article>
  );
}
export default function App() {
  const [hash, setHash] = useState(location.hash);
  const main = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    const changed = () => setHash(location.hash);
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  const route = parseRoute(hash);
  const exhibit =
    route.page === "exhibit"
      ? exhibits.find((item) => item.id === route.id)
      : undefined;
  useEffect(() => {
    document.title = `${exhibit?.title || (route.page === "collection" ? "展品目錄" : "讓目光，慢一點。")}｜LM 3D Museum`;
    window.scrollTo({ top: 0, behavior: "instant" });
    if (!firstRender.current) main.current?.focus({ preventScroll: true });
    firstRender.current = false;
  }, [hash, exhibit, route.page]);
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
        }}
      >
        跳到主要內容
      </a>
      <div className="site-shell">
        <Header page={route.page} />
        <main id="main-content" ref={main} tabIndex={-1}>
          {route.page === "home" ? (
            <Home />
          ) : route.page === "collection" ? (
            <Collection />
          ) : exhibit ? (
            <ExhibitPage exhibit={exhibit} />
          ) : (
            <section className="not-found">
              <p className="english-label">A DIFFERENT DIRECTION</p>
              <h1>這件展品不在這裡。</h1>
              <p>連結可能已更動，回到目錄繼續參觀吧。</p>
              <a className="button primary" href="#/collection">
                返回展品目錄 <ArrowRight size={18} />
              </a>
            </section>
          )}
        </main>
        <footer className="site-footer">
          <a href="#/">LM 3D MUSEUM</a>
          <span className="footer-rule" />
          <span>LESS SCROLLING. MORE SEEING.</span>
        </footer>
      </div>
    </>
  );
}
