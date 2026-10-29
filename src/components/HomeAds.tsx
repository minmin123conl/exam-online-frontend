import { useEffect } from "react";

const NATIVE_CONTAINER_ID = "container-b19890781ea9075405268ed26a520eda";

export default function HomeAds() {
  useEffect(() => {
    function addScript(id: string, src: string, parent: HTMLElement, before: HTMLElement | null = null, async = false) {
      // StrictMode runs effects twice in development. Initialise each unit once
      // per document, especially the popunder and its global event listeners.
      if (document.getElementById(id)) return;
      const script = document.createElement("script");
      script.id = id;
      script.dataset.cfasync = "false";
      script.async = async;
      script.src = src;
      parent.insertBefore(script, before);
    }

    // These units are installed only while the Home route is mounted, rather
    // than in index.html, which is shared by the exam and admin routes.
    addScript("home-popunder", "https://abscloud.org/1/5f508d91168cb7aa88776ed5c6089e7b", document.head);
    addScript("home-body-ad", "https://bauval.org/14/4a7f6600adbcad74ec415a041c3f54ec", document.body);

    const container = document.getElementById(NATIVE_CONTAINER_ID);
    if (container?.parentElement) {
      addScript("home-native-banner", "https://bauval.org/21/b19890781ea9075405268ed26a520eda", container.parentElement, container, true);
    }

    return () => {
      // Removing script tags cannot stop a third-party script that has already
      // run. A fresh document also clears popunder/overlay listeners on Back.
      // Skip StrictMode's simulated unmount while still on the homepage.
      if (window.location.pathname !== "/") window.location.reload();
    };
  }, []);

  return (
    <aside className="card" aria-label="Quảng cáo">
      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Quảng cáo</div>
      <div id={NATIVE_CONTAINER_ID} />
    </aside>
  );
}
