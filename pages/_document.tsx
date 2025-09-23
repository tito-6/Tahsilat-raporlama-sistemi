import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <style jsx global>{`
          @font-face {
            font-family: 'Century Gothic';
            src: local('Century Gothic'), local('CenturyGothic'),
                 local('Century Gothic Regular'), local('CenturyGothic-Regular');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Century Gothic';
            src: local('Century Gothic Bold'), local('CenturyGothic-Bold');
            font-weight: bold;
            font-style: normal;
            font-display: swap;
          }
          * {
            font-family: 'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif !important;
          }
        `}</style>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}