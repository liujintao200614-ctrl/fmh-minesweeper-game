import type { AppProps } from 'next/app';
import { createGlobalStyle } from 'styled-components';
import ErrorBoundary from '../src/components/ErrorBoundary';

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
  // 暂时完全禁用错误处理，让钱包连接正常工作
  return (
    <>
      <GlobalStyle />
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </>
  );
}