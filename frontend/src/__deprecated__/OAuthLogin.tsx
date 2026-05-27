import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { invoke } from '@tauri-apps/api/core';

interface DeviceAuthResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string | null;
  expires_in: number;
  interval: number;
}

export const OAuthLogin: React.FC = () => {
  const [authData, setAuthData] = useState<DeviceAuthResponse | null>(null);
  const [status, setStatus] = useState<string>("Initializing...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function startFlow() {
      try {
        setStatus("Requesting authentication...");
        const data: DeviceAuthResponse = await invoke('start_oauth_flow');
        setAuthData(data);
        setStatus("Waiting for mobile approval...");
        
        // Start polling loop
        await invoke('poll_oauth_token', { 
            deviceCode: data.device_code, 
            interval: data.interval 
        });
        
        setStatus("Authentication successful!");
        setTimeout(() => {
            // Ideally trigger a global state update here
            console.log("Logged in!");
        }, 1500);

      } catch (err) {
        console.error(err);
        setError(String(err));
        setStatus("Authentication failed");
      }
    }
    
    startFlow();
  }, []);

  return (
    <div className="oauth-login" style={{ textAlign: 'center', color: '#00ff41', padding: '20px' }}>
      <h2>Connect to AI Provider</h2>
      {error ? (
        <div className="error" style={{ color: 'red' }}>{error}</div>
      ) : authData ? (
        <>
          <p>Scan the QR code below or visit:</p>
          <a href={authData.verification_uri} target="_blank" rel="noreferrer" style={{ color: '#00ff41' }}>
            {authData.verification_uri}
          </a>
          
          <div style={{ margin: '20px auto', background: 'white', padding: '20px', display: 'inline-block', borderRadius: '8px' }}>
            <QRCodeSVG value={authData.verification_uri_complete || authData.verification_uri} size={200} />
          </div>
          
          <p>Enter the following code:</p>
          <h1 style={{ letterSpacing: '4px', background: 'rgba(0,255,65,0.1)', display: 'inline-block', padding: '10px' }}>
            {authData.user_code}
          </h1>
        </>
      ) : null}
      
      <p className="status-text">{status}</p>
    </div>
  );
};
