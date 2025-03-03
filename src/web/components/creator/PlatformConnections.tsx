import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ExternalLink, Check, X } from 'lucide-react';

import usePlatforms from '../../hooks/usePlatforms';
import useAuth from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import Badge from '../ui/Badge';
import { Alert, AlertTitle, AlertDescription } from '../ui/Alert';
import { PlatformType, AuthStatus, type Platform } from '../../types/platform';

/**
 * Props for the PlatformConnections component
 */
interface PlatformConnectionsProps {
  className?: string;
  showTitle?: boolean;
}

/**
 * Helper function to render appropriate badge for platform connection status
 */
const getStatusBadge = (status: AuthStatus) => {
  switch (status) {
    case AuthStatus.CONNECTED:
      return <Badge variant="success">Connected</Badge>;
    case AuthStatus.DISCONNECTED:
      return <Badge variant="outline">Disconnected</Badge>;
    case AuthStatus.EXPIRED:
      return <Badge variant="warning">Token Expired</Badge>;
    case AuthStatus.ERROR:
      return <Badge variant="destructive">Connection Error</Badge>;
    case AuthStatus.PENDING:
      return <Badge variant="secondary">Connecting...</Badge>;
    default:
      return <Badge variant="secondary">Unknown Status</Badge>;
  }
};

/**
 * Helper function to render appropriate platform icon
 */
const getPlatformIcon = (platformType: PlatformType, props: { size?: number; className?: string } = {}) => {
  const { size = 24, className = '' } = props;
  const iconPath = `/icons/platforms/${platformType}.svg`;
  
  return (
    <img 
      src={iconPath} 
      alt={`${platformType} icon`} 
      width={size} 
      height={size} 
      className={className}
    />
  );
};

/**
 * A React component for managing social media platform connections within the creator dashboard.
 * Allows creators to connect, disconnect, and view status of their various social media platform integrations.
 */
const PlatformConnections: React.FC<PlatformConnectionsProps> = ({ 
  className = '', 
  showTitle = true 
}) => {
  const { user } = useAuth();
  const creatorId = user?.userType === 'creator' ? user.id : null;
  
  const { 
    platforms, 
    isLoading, 
    error, 
    getOAuthUrl, 
    connectPlatform, 
    disconnectPlatform,
    syncPlatformContent,
    isConnecting,
    isDisconnecting,
    isSyncing
  } = usePlatforms();
  
  // Track which platform is currently being connected
  const [connecting, setConnecting] = useState<PlatformType | null>(null);
  const [callbackInProgress, setCallbackInProgress] = useState(false);
  
  /**
   * Initiates the connection process for a platform
   */
  const handleConnect = useCallback(async (platformType: PlatformType) => {
    if (!creatorId || isConnecting) return;
    
    try {
      setConnecting(platformType);
      // Generate the redirect URL including the current location for callback
      const redirectUrl = `${window.location.origin}${window.location.pathname}?platform=${platformType}&callback=true`;
      const authUrl = await getOAuthUrl(platformType, redirectUrl);
      
      // Redirect to the platform's OAuth URL
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to generate OAuth URL:', error);
      setConnecting(null);
    }
  }, [creatorId, isConnecting, getOAuthUrl]);
  
  /**
   * Disconnects a connected platform
   */
  const handleDisconnect = useCallback(async (platformId: string) => {
    if (!creatorId || isDisconnecting) return;
    
    try {
      await disconnectPlatform({ platformId, creatorId });
    } catch (error) {
      console.error('Failed to disconnect platform:', error);
    }
  }, [creatorId, isDisconnecting, disconnectPlatform]);

  /**
   * Triggers content synchronization for a platform
   */
  const handleSyncPlatform = useCallback(async (platformId: string) => {
    if (isSyncing) return;
    
    try {
      await syncPlatformContent(platformId);
    } catch (error) {
      console.error('Failed to sync platform content:', error);
    }
  }, [isSyncing, syncPlatformContent]);
  
  // Handle OAuth callback on component mount
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const callback = params.get('callback');
      const platform = params.get('platform');
      const code = params.get('code');
      
      if (callback === 'true' && platform && code && creatorId) {
        setCallbackInProgress(true);
        
        try {
          // Process the OAuth callback
          await connectPlatform({
            platformType: platform as PlatformType,
            creatorId,
            redirectUrl: window.location.href
          });
          
          // Clean up the URL
          const url = new URL(window.location.href);
          url.searchParams.delete('callback');
          url.searchParams.delete('platform');
          url.searchParams.delete('code');
          window.history.replaceState({}, document.title, url.toString());
        } catch (error) {
          console.error('Failed to complete OAuth connection:', error);
        } finally {
          setCallbackInProgress(false);
          setConnecting(null);
        }
      }
    };
    
    handleOAuthCallback();
  }, [creatorId, connectPlatform]);
  
  // Supported platforms configuration
  const supportedPlatforms = [
    { type: PlatformType.YOUTUBE, name: 'YouTube' },
    { type: PlatformType.INSTAGRAM, name: 'Instagram' },
    { type: PlatformType.TIKTOK, name: 'TikTok' },
    { type: PlatformType.TWITTER, name: 'Twitter' },
    { type: PlatformType.LINKEDIN, name: 'LinkedIn' }
  ];
  
  // Loading state
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {showTitle && <h2 className="text-xl font-semibold">Platform Connections</h2>}
        <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg border">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            <p className="text-sm text-gray-500">Loading connected platforms...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        {showTitle && <h2 className="text-xl font-semibold">Platform Connections</h2>}
        <Alert variant="error">
          <AlertTitle>Failed to load platforms</AlertTitle>
          <AlertDescription>
            {error.message || 'An error occurred while loading your connected platforms. Please try again later.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      {showTitle && <h2 className="text-xl font-semibold">Platform Connections</h2>}
      
      {!creatorId && (
        <Alert variant="warning">
          <AlertTitle>Creator account required</AlertTitle>
          <AlertDescription>
            You need a creator account to connect social media platforms.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {supportedPlatforms.map((platform) => {
          // Find if this platform is already connected
          const connectedPlatform = platforms.find(p => p.platformType === platform.type);
          const isConnected = connectedPlatform && connectedPlatform.authStatus === AuthStatus.CONNECTED;
          const isPending = connecting === platform.type || callbackInProgress;
          const isConnectionError = connectedPlatform && connectedPlatform.authStatus === AuthStatus.ERROR;
          const isTokenExpired = connectedPlatform && connectedPlatform.authStatus === AuthStatus.EXPIRED;
          
          return (
            <Card key={platform.type} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getPlatformIcon(platform.type, { size: 24, className: 'mr-2' })}
                    <CardTitle className="text-lg">{platform.name}</CardTitle>
                  </div>
                  {connectedPlatform && getStatusBadge(connectedPlatform.authStatus)}
                </div>
              </CardHeader>
              
              <CardContent className="pb-2">
                {isConnected && (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Account:</span>
                      <span className="font-medium">{connectedPlatform.handle}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Last synced:</span>
                      <span className="font-medium">
                        {connectedPlatform.lastSyncAt 
                          ? new Date(connectedPlatform.lastSyncAt).toLocaleDateString() 
                          : 'Never'}
                      </span>
                    </div>
                  </div>
                )}
                
                {isConnectionError && (
                  <Alert variant="error" className="text-xs mt-2">
                    <AlertDescription>
                      There was an error connecting to {platform.name}. Please try again.
                    </AlertDescription>
                  </Alert>
                )}
                
                {isTokenExpired && (
                  <Alert variant="warning" className="text-xs mt-2">
                    <AlertDescription>
                      Your {platform.name} connection has expired. Please reconnect.
                    </AlertDescription>
                  </Alert>
                )}
                
                {!isConnected && !isPending && !isConnectionError && !isTokenExpired && (
                  <p className="text-sm text-gray-500">
                    Connect your {platform.name} account to track content and analytics.
                  </p>
                )}
              </CardContent>
              
              <CardFooter className="flex justify-between">
                {isConnected ? (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleSyncPlatform(connectedPlatform.id)}
                      isLoading={isSyncing}
                      disabled={isSyncing}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Sync
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDisconnect(connectedPlatform.id)}
                      isLoading={isDisconnecting}
                      disabled={isDisconnecting}
                    >
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="primary" 
                    onClick={() => handleConnect(platform.type)}
                    isLoading={isPending}
                    disabled={isPending || !creatorId}
                  >
                    {isPending ? 'Connecting...' : 'Connect'}
                  </Button>
                )}
                
                {isConnected && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={connectedPlatform.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
      
      <Alert className="mt-4">
        <AlertTitle>About platform connections</AlertTitle>
        <AlertDescription>
          Connecting your social platforms allows Engagerr to analyze your content across platforms, 
          track relationships between content, and provide unified analytics. We only request the 
          permissions needed to read your content and metrics.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default PlatformConnections;