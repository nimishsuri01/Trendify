// @ts-nocheck
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
    return (
        <html lang="en" style={{ height: "100%" }}>
            <head>
                <meta charSet="utf-8" />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, shrink-to-fit=no, maximum-scale=1, user-scalable=no"
                />
                <title>TRENDIFY · Mobile Fashion App</title>
                <ScrollViewStyleReset />
                <style
                    dangerouslySetInnerHTML={{
                        __html: `
              /* Default full-screen layout on mobile phones */
              body > div:first-child {
                position: fixed !important;
                top: 0; left: 0; right: 0; bottom: 0;
              }
              [role="tablist"] [role="tab"] * { overflow: visible !important; }
              [role="heading"], [role="heading"] * { overflow: visible !important; }

              /* On desktop browsers (widescreen), render as a sleek centered smartphone frame */
              @media (min-width: 600px) {
                body {
                  background-color: #121418 !important;
                  display: flex !important;
                  align-items: center !important;
                  justify-content: center !important;
                  margin: 0 !important;
                }
                body > div:first-child {
                  position: relative !important;
                  max-width: 430px !important;
                  height: 92vh !important;
                  max-height: 890px !important;
                  margin: auto !important;
                  border-radius: 46px !important;
                  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6), 0 0 0 12px #222630 !important;
                  overflow: hidden !important;
                  background-color: #FBFAF7 !important;
                }
              }
            `,
                    }}
                />
            </head>
            <body
                style={{
                    margin: 0,
                    height: "100%",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {children}
            </body>
        </html>
    );
}
