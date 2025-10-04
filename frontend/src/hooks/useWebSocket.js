import { useEffect, useRef, useState, useCallback } from 'react';
import websocketService from '../services/websocket';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastHeartbeat, setLastHeartbeat] = useState(null);

  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };

    const handleStatusChange = (status) => {
      setConnectionStatus(status);
    };

    const handleError = () => {
      setConnectionStatus('error');
    };

    const unsubscribers = [
      websocketService.on('connected', handleConnected),
      websocketService.on('disconnected', handleDisconnected),
      websocketService.on('statusChange', handleStatusChange),
      websocketService.on('error', handleError)
    ];

    websocketService.connect();

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  const getStatus = useCallback(() => {
    return websocketService.getConnectionStatus();
  }, []);

  return {
    isConnected,
    connectionStatus,
    lastHeartbeat,
    getStatus,
    subscribe: websocketService.subscribe.bind(websocketService),
    unsubscribe: websocketService.unsubscribe.bind(websocketService),
    on: websocketService.on.bind(websocketService),
    off: websocketService.off.bind(websocketService),
    channels: websocketService.channels
  };
}

export function useMevOpportunities(filters = {}) {
  const [opportunities, setOpportunities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { subscribe, unsubscribe, on, off, channels } = useWebSocket();

  useEffect(() => {
    const handleOpportunity = (data) => {
      setOpportunities(prev => {
        const updated = [data, ...prev.slice(0, 99)];
        setIsLoading(false);
        return updated;
      });
    };

    const unsubscriber = on('mev_opportunity', handleOpportunity);
    subscribe(channels.MEV_OPPORTUNITIES, filters);

    // Set loading to false after initial connection
    const timeout = setTimeout(() => setIsLoading(false), 3000);

    return () => {
      unsubscriber();
      unsubscribe(channels.MEV_OPPORTUNITIES);
      clearTimeout(timeout);
    };
  }, [subscribe, unsubscribe, on, off, channels, JSON.stringify(filters)]);

  return { opportunities, isLoading };
}

export function useValidatorUpdates(filters = {}) {
  const [validators, setValidators] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { subscribe, unsubscribe, on, channels } = useWebSocket();

  useEffect(() => {
    const handleValidatorUpdate = (data) => {
      setValidators(prev => {
        const existing = prev.find(v => v.address === data.address);
        if (existing) {
          return prev.map(v => v.address === data.address ? { ...v, ...data } : v);
        }
        return [data, ...prev.slice(0, 49)];
      });
      setIsLoading(false);
    };

    const unsubscriber = on('validator_update', handleValidatorUpdate);
    subscribe(channels.VALIDATOR_PERFORMANCE, filters);

    const timeout = setTimeout(() => setIsLoading(false), 3000);

    return () => {
      unsubscriber();
      unsubscribe(channels.VALIDATOR_PERFORMANCE);
      clearTimeout(timeout);
    };
  }, [subscribe, unsubscribe, on, channels, JSON.stringify(filters)]);

  return { validators, isLoading };
}

export function useMarketData() {
  const [marketData, setMarketData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { subscribe, unsubscribe, on, channels } = useWebSocket();

  useEffect(() => {
    const handleMarketUpdate = (data) => {
      setMarketData(data);
      setIsLoading(false);
    };

    const unsubscriber = on('market_update', handleMarketUpdate);
    subscribe(channels.MARKET_DATA);

    const timeout = setTimeout(() => setIsLoading(false), 3000);

    return () => {
      unsubscriber();
      unsubscribe(channels.MARKET_DATA);
      clearTimeout(timeout);
    };
  }, [subscribe, unsubscribe, on, channels]);

  return { marketData, isLoading };
}

export function useUserNotifications() {
  const [notifications, setNotifications] = useState([]);
  const { subscribe, unsubscribe, on, channels } = useWebSocket();

  useEffect(() => {
    const handleNotification = (data) => {
      setNotifications(prev => [data, ...prev.slice(0, 19)]); // Keep last 20
    };

    const unsubscriber = on('user_notification', handleNotification);
    subscribe(channels.USER_NOTIFICATIONS);

    return () => {
      unsubscriber();
      unsubscribe(channels.USER_NOTIFICATIONS);
    };
  }, [subscribe, unsubscribe, on, channels]);

  return notifications;
}