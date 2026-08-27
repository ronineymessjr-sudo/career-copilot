"use client";

export default function PlaygroundError({ reset }: { reset: () => void }) {
  return <main className="portfolio-page playground-route-state" role="alert">
    <section className="playground-route-card">
      <div>
        <strong>公开 Demo 暂时无法打开</strong>
        <p>页面加载遇到问题。请重试；如果仍然失败，请稍后重新打开公开地址。</p>
        <button className="primary-button" type="button" onClick={() => reset()}>重试加载</button>
      </div>
    </section>
  </main>;
}
