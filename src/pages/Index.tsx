
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, Shield, Battery, Truck, AlertTriangle, Users, Lock, Unlock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PBRContract {
  contractId: string;
  deviceCount: number;
  batteriesShipped: number;
  threshold: number;
  isLocked: boolean;
  lastUpdated: Date;
  notificationsSent: Array<{
    email: string;
    timestamp: Date;
    message: string;
  }>;
}

interface ShipmentLog {
  shipmentId: string;
  contractId: string;
  batteriesShipped: number;
  timestamp: Date;
  status: 'APPROVED' | 'BLOCKED' | 'PENDING';
  initiatedBy: string;
}

const Index = () => {
  const [contracts, setContracts] = useState<PBRContract[]>([]);
  const [shipments, setShipments] = useState<ShipmentLog[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  // Simulate real-time data updates
  useEffect(() => {
    // Initialize sample data
    const sampleContracts: PBRContract[] = [
      {
        contractId: 'PBR-2024-001',
        deviceCount: 100,
        batteriesShipped: 85,
        threshold: 120,
        isLocked: false,
        lastUpdated: new Date(),
        notificationsSent: []
      },
      {
        contractId: 'PBR-2024-002',
        deviceCount: 50,
        batteriesShipped: 62,
        threshold: 60,
        isLocked: true,
        lastUpdated: new Date(),
        notificationsSent: [
          {
            email: 'admin@company.com',
            timestamp: new Date(),
            message: 'Threshold exceeded - shipments blocked'
          }
        ]
      },
      {
        contractId: 'PBR-2024-003',
        deviceCount: 200,
        batteriesShipped: 150,
        threshold: 240,
        isLocked: false,
        lastUpdated: new Date(),
        notificationsSent: []
      }
    ];

    const sampleShipments: ShipmentLog[] = [
      {
        shipmentId: 'SHP-001',
        contractId: 'PBR-2024-001',
        batteriesShipped: 10,
        timestamp: new Date(Date.now() - 3600000),
        status: 'APPROVED',
        initiatedBy: 'system.auto'
      },
      {
        shipmentId: 'SHP-002',
        contractId: 'PBR-2024-002',
        batteriesShipped: 5,
        timestamp: new Date(Date.now() - 1800000),
        status: 'BLOCKED',
        initiatedBy: 'user.manager'
      },
      {
        shipmentId: 'SHP-003',
        contractId: 'PBR-2024-003',
        batteriesShipped: 25,
        timestamp: new Date(Date.now() - 900000),
        status: 'APPROVED',
        initiatedBy: 'system.auto'
      }
    ];

    setContracts(sampleContracts);
    setShipments(sampleShipments);

    // Simulate real-time updates
    if (realTimeUpdates) {
      const interval = setInterval(() => {
        // Simulate random shipment updates
        if (Math.random() > 0.7) {
          const randomContract = sampleContracts[Math.floor(Math.random() * sampleContracts.length)];
          const newShipment: ShipmentLog = {
            shipmentId: `SHP-${Math.random().toString(36).substr(2, 9)}`,
            contractId: randomContract.contractId,
            batteriesShipped: Math.floor(Math.random() * 20) + 1,
            timestamp: new Date(),
            status: randomContract.isLocked ? 'BLOCKED' : 'APPROVED',
            initiatedBy: 'system.auto'
          };
          
          setShipments(prev => [newShipment, ...prev.slice(0, 9)]);
          
          if (newShipment.status === 'BLOCKED') {
            toast({
              title: "⚠️ Shipment Blocked",
              description: `Contract ${randomContract.contractId} has reached its limit`,
              variant: "destructive"
            });
          }
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [realTimeUpdates]);

  const getProgressPercentage = (shipped: number, threshold: number) => {
    return Math.min((shipped / threshold) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const toggleContractLock = (contractId: string) => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Admin privileges required",
        variant: "destructive"
      });
      return;
    }

    setContracts(prev => prev.map(contract => 
      contract.contractId === contractId 
        ? { ...contract, isLocked: !contract.isLocked }
        : contract
    ));

    toast({
      title: "Contract Updated",
      description: `Contract ${contractId} has been ${contracts.find(c => c.contractId === contractId)?.isLocked ? 'unlocked' : 'locked'}`,
    });
  };

  const totalContracts = contracts.length;
  const lockedContracts = contracts.filter(c => c.isLocked).length;
  const totalShipments = shipments.length;
  const blockedShipments = shipments.filter(s => s.status === 'BLOCKED').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              PBR Battery Shipment Control
            </h1>
            <p className="text-slate-300">Real-time monitoring & automated blocking system</p>
          </div>
          <div className="flex gap-4">
            <Button
              variant={realTimeUpdates ? "default" : "outline"}
              onClick={() => setRealTimeUpdates(!realTimeUpdates)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Bell className="w-4 h-4 mr-2" />
              {realTimeUpdates ? 'Live Updates On' : 'Live Updates Off'}
            </Button>
            <Button
              variant={isAdmin ? "default" : "outline"}
              onClick={() => setIsAdmin(!isAdmin)}
              className={isAdmin ? "bg-red-600 hover:bg-red-700" : ""}
            >
              <Shield className="w-4 h-4 mr-2" />
              {isAdmin ? 'Admin Mode' : 'User Mode'}
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center">
                <Battery className="w-4 h-4 mr-2 text-blue-400" />
                Total Contracts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalContracts}</div>
              <p className="text-xs text-slate-400">Active PBR contracts</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center">
                <Lock className="w-4 h-4 mr-2 text-red-400" />
                Locked Contracts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{lockedContracts}</div>
              <p className="text-xs text-slate-400">Shipments blocked</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center">
                <Truck className="w-4 h-4 mr-2 text-green-400" />
                Total Shipments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalShipments}</div>
              <p className="text-xs text-slate-400">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-yellow-400" />
                Blocked Shipments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{blockedShipments}</div>
              <p className="text-xs text-slate-400">Threshold exceeded</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="contracts" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="contracts" className="data-[state=active]:bg-purple-600">
              Contract Monitoring
            </TabsTrigger>
            <TabsTrigger value="shipments" className="data-[state=active]:bg-purple-600">
              Live Shipments
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-purple-600">
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contracts">
            <div className="grid gap-6">
              {contracts.map((contract) => {
                const percentage = getProgressPercentage(contract.batteriesShipped, contract.threshold);
                const progressColor = getProgressColor(percentage);
                
                return (
                  <Card key={contract.contractId} className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-white flex items-center gap-2">
                            {contract.contractId}
                            {contract.isLocked && <Lock className="w-4 h-4 text-red-400" />}
                          </CardTitle>
                          <p className="text-slate-400 text-sm">
                            Last updated: {contract.lastUpdated.toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={contract.isLocked ? "destructive" : "default"}>
                            {contract.isLocked ? "LOCKED" : "ACTIVE"}
                          </Badge>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleContractLock(contract.contractId)}
                              className="border-slate-600"
                            >
                              {contract.isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-slate-400">Devices</p>
                          <p className="text-white font-semibold">{contract.deviceCount}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Shipped</p>
                          <p className="text-white font-semibold">{contract.batteriesShipped}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Threshold</p>
                          <p className="text-white font-semibold">{contract.threshold}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Shipment Progress</span>
                          <span className="text-white">{percentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={percentage} className="h-3" />
                        {percentage >= 80 && (
                          <Alert className="border-yellow-500 bg-yellow-500/10">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            <AlertDescription className="text-yellow-300">
                              {percentage >= 100 ? 'Threshold exceeded - shipments blocked' : 'Approaching threshold limit'}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="shipments">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Real-time Shipment Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shipments.map((shipment) => (
                    <div
                      key={shipment.shipmentId}
                      className={`p-4 rounded-lg border ${
                        shipment.status === 'APPROVED' 
                          ? 'bg-green-500/10 border-green-500/20' 
                          : shipment.status === 'BLOCKED'
                          ? 'bg-red-500/10 border-red-500/20'
                          : 'bg-yellow-500/10 border-yellow-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-semibold">{shipment.shipmentId}</p>
                          <p className="text-slate-400 text-sm">
                            Contract: {shipment.contractId} • {shipment.batteriesShipped} batteries
                          </p>
                          <p className="text-slate-500 text-xs">
                            {shipment.timestamp.toLocaleString()} • by {shipment.initiatedBy}
                          </p>
                        </div>
                        <Badge
                          variant={
                            shipment.status === 'APPROVED' 
                              ? "default" 
                              : shipment.status === 'BLOCKED'
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {shipment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid gap-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">System Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-700/50 rounded-lg">
                      <p className="text-slate-400 text-sm">WebSocket Status</p>
                      <p className="text-green-400 font-semibold">Connected</p>
                    </div>
                    <div className="p-4 bg-slate-700/50 rounded-lg">
                      <p className="text-slate-400 text-sm">Database Status</p>
                      <p className="text-green-400 font-semibold">Online</p>
                    </div>
                  </div>
                  <Alert className="border-blue-500 bg-blue-500/10">
                    <Users className="h-4 w-4 text-blue-400" />
                    <AlertDescription className="text-blue-300">
                      System is operating normally. All automated monitoring and blocking features are active.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
