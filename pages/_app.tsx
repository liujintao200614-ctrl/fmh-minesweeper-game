import type { AppProps } from 'next/app';
import { createGlobalStyle } from 'styled-components';
import ErrorBoundary from '../src/components/ErrorBoundary';
import Head from 'next/head';

const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: #c0c0c0;
  }

  button {
    font-family: inherit;
  }
`;

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        {/* 移动端优化 */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        
        {/* 预加载关键资源 */}
        <link rel="preconnect" href="https://testnet-rpc.monad.xyz" />
        <link rel="dns-prefetch" href="https://testnet-rpc.monad.xyz" />
        
        {/* 性能优化 */}
        <meta name="theme-color" content="#c0c0c0" />
      </Head>
      <GlobalStyle />
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </>
  );
}