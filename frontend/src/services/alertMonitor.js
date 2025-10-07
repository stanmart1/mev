export class AlertMonitor {
  static checkAlerts(opportunity) {
    const alerts = JSON.parse(localStorage.getItem('mev_alerts') || '[]');
    const activeAlerts = alerts.filter(a => a.enabled);
    
    activeAlerts.forEach(alert => {
      if (this.matchesAlert(opportunity, alert)) {
        this.triggerNotification(alert, opportunity);
      }
    });
  }
  
  static matchesAlert(opportunity, alert) {
    switch (alert.type) {
      case 'profit':
        return this.checkProfitAlert(opportunity, alert.conditions);
      case 'liquidation':
        return this.checkLiquidationAlert(opportunity, alert.conditions);
      default:
        return false;
    }
  }
  
  static checkProfitAlert(opportunity, conditions) {
    const profit = opportunity.estimated_profit_sol || opportunity.estimatedProfitSol || 0;
    const meetsProfit = !conditions.minProfit || profit >= conditions.minProfit;
    const meetsType = !conditions.opportunityType || conditions.opportunityType === 'all' || 
                      opportunity.opportunity_type === conditions.opportunityType;
    return meetsProfit && meetsType;
  }
  
  static checkLiquidationAlert(opportunity, conditions) {
    if (opportunity.opportunity_type !== 'liquidation') return false;
    const collateral = opportunity.collateral_value || 0;
    return !conditions.minCollateral || collateral >= conditions.minCollateral;
  }
  
  static triggerNotification(alert, opportunity) {
    const notifications = JSON.parse(localStorage.getItem('mev_notifications') || '[]');
    const notification = {
      id: Date.now() + Math.random(),
      timestamp: Date.now(),
      read: false,
      category: alert.type,
      title: alert.name || `${alert.type} Alert`,
      message: this.formatMessage(alert, opportunity),
      action: 'View Opportunity'
    };
    
    notifications.unshift(notification);
    localStorage.setItem('mev_notifications', JSON.stringify(notifications.slice(0, 100)));
    
    this.playSound();
    this.showBrowserNotification(notification.title, notification.message);
    
    window.dispatchEvent(new Event('storage'));
  }
  
  static formatMessage(alert, opportunity) {
    const profit = opportunity.estimated_profit_sol || opportunity.estimatedProfitSol || 0;
    switch (alert.type) {
      case 'profit':
        return `New ${opportunity.opportunity_type} opportunity with ${profit.toFixed(4)} SOL profit`;
      case 'liquidation':
        return `Liquidation opportunity detected with ${opportunity.collateral_value} USD collateral`;
      default:
        return 'Alert condition met';
    }
  }
  
  static playSound() {
    const settings = JSON.parse(localStorage.getItem('mev_notification_settings') || '{"sound":true}');
    if (settings.sound) {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8bllHAU2jdXvzn0pBSh+zPDajzsKElyx6OyrWBQLSKDf8sFuIwUugc3y2Ik2CBhku+zooVARC0yl4fG5ZRwFNo3V7859KQUofsz');
      audio.play().catch(() => {});
    }
  }
  
  static showBrowserNotification(title, message) {
    const settings = JSON.parse(localStorage.getItem('mev_notification_settings') || '{"browser":true}');
    if (settings.browser && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      });
    }
  }
}
