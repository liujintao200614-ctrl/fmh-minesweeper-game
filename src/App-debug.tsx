import React from 'react';
import styled from 'styled-components';

const AppContainer = styled.div`
  min-height: 100vh;
  background: #c0c0c0;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
`;

const WelcomeMessage = styled.div`
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
`;

export default function App() {
  return (
    <AppContainer>
      <WelcomeMessage>
        <h1>🎯 FMH Minesweeper</h1>
        <p>Loading components...</p>
        <p>If you see this message, basic React rendering works!</p>
      </WelcomeMessage>
    </AppContainer>
  );
}