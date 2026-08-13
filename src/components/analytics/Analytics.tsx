import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

import { googleAnalyticsId, microsoftClarityId } from "@/lib/analytics-config";

export function AnalyticsHeadScripts() {
  return (
    <>
      {googleAnalyticsId ? (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${googleAnalyticsId}',{send_page_view:false,anonymize_ip:true});`,
            }}
          />
        </>
      ) : null}
      {microsoftClarityId ? (
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${microsoftClarityId}");`,
          }}
        />
      ) : null}
    </>
  );
}

export function AnalyticsPageView() {
  const location = useRouterState({ select: (state) => state.location });

  useEffect(() => {
    if (!googleAnalyticsId) return;
    const analyticsWindow = window as Window & {
      gtag?: (...args: unknown[]) => void;
    };
    analyticsWindow.gtag?.("event", "page_view", {
      page_title: document.title,
      page_location: window.location.href,
      page_path: `${location.pathname}${location.searchStr}`,
    });
  }, [location.pathname, location.searchStr]);

  return null;
}
