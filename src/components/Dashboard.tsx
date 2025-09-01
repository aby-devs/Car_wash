import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, DollarSign, Users, Calendar, TrendingUp } from "lucide-react";
import { CarWashRecord } from "./CarWashRecord";
import heroImage from "@/assets/car-wash-hero.jpg";

interface DashboardProps {
  records: CarWashRecord[];
}

export function Dashboard({ records }: DashboardProps) {
  const totalRevenue = records.reduce((sum, record) => sum + record.amountPaid, 0);
  const todayRecords = records.filter(record => record.date === new Date().toLocaleDateString());
  const uniqueAttendants = [...new Set(records.map(record => record.attendant))];
  const averageService = records.length > 0 ? totalRevenue / records.length : 0;

  // Calculate additional metrics
  const mpesaRecords = records.filter(r => r.paymentMethod === 'Mpesa');
  const cashRecords = records.filter(r => r.paymentMethod === 'Cash');
  const mpesaRevenue = mpesaRecords.reduce((sum, record) => sum + record.amountPaid, 0);
  const cashRevenue = cashRecords.reduce((sum, record) => sum + record.amountPaid, 0);
  
  // Get current week records
  const currentWeek = new Date();
  const startOfWeek = new Date(currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay()));
  const weekRecords = records.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate >= startOfWeek;
  });
  
  // Get current month records
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthRecords = records.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
  });

  const stats = [
    {
      title: "Total Services",
      value: records.length.toString(),
      subtitle: `This Month: ${monthRecords.length}`,
      icon: Car,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Total Revenue",
      value: `KSh ${totalRevenue.toLocaleString()}`,
      subtitle: `This Month: KSh ${monthRecords.reduce((sum, r) => sum + r.amountPaid, 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Today's Services",
      value: todayRecords.length.toString(),
      subtitle: `This Week: ${weekRecords.length}`,
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Active Staff",
      value: uniqueAttendants.length.toString(),
      subtitle: `Avg Service: KSh ${averageService.toFixed(0)}`,
      icon: Users,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ];

  const recentRecords = records.slice(-5).reverse();

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary to-primary-hover text-primary-foreground">
        <div className="absolute inset-0 opacity-20">
          <img 
            src={heroImage} 
            alt="Car wash facility" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Car Wash Management System
          </h1>
          <p className="text-lg opacity-90 max-w-2xl">
            Professional car wash service management. Track services, manage payments, 
            and monitor your business performance with ease.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                {stat.subtitle}
                </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      {records.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Car className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{record.registrationNumber}</p>
                      <p className="text-sm text-muted-foreground">{record.carModel} • {record.attendant}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-success">KSh {record.amountPaid.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{record.paymentMethod}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-semibold text-green-800">M-Pesa Payments</p>
                  <p className="text-sm text-green-600">{mpesaRecords.length} transactions</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-800">KSh {mpesaRevenue.toLocaleString()}</p>
                  <p className="text-xs text-green-600">
                    {records.length > 0 ? ((mpesaRevenue / totalRevenue) * 100).toFixed(1) : 0}% of total
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-semibold text-blue-800">Cash Payments</p>
                  <p className="text-sm text-blue-600">{cashRecords.length} transactions</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-800">KSh {cashRevenue.toLocaleString()}</p>
                  <p className="text-xs text-blue-600">
                    {records.length > 0 ? ((cashRevenue / totalRevenue) * 100).toFixed(1) : 0}% of total
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uniqueAttendants.length > 0 ? (
                uniqueAttendants.map(attendant => {
                  const attendantRecords = records.filter(r => r.attendant === attendant);
                  const attendantRevenue = attendantRecords.reduce((sum, r) => sum + r.amountPaid, 0);
                  return (
                    <div key={attendant} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{attendant}</p>
                        <p className="text-sm text-muted-foreground">{attendantRecords.length} services</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">KSh {attendantRevenue.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          Avg: KSh {(attendantRevenue / attendantRecords.length).toFixed(0)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-muted-foreground py-4">No staff data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Business Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold mb-2 text-blue-800">Today</h4>
              <div className="space-y-1 text-sm">
                <p className="font-bold text-blue-900">{todayRecords.length} services</p>
                <p className="text-blue-600">KSh {todayRecords.reduce((sum, r) => sum + r.amountPaid, 0).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold mb-2 text-purple-800">This Week</h4>
              <div className="space-y-1 text-sm">
                <p className="font-bold text-purple-900">{weekRecords.length} services</p>
                <p className="text-purple-600">KSh {weekRecords.reduce((sum, r) => sum + r.amountPaid, 0).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold mb-2 text-green-800">This Month</h4>
              <div className="space-y-1 text-sm">
                <p className="font-bold text-green-900">{monthRecords.length} services</p>
                <p className="text-green-600">KSh {monthRecords.reduce((sum, r) => sum + r.amountPaid, 0).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg">
              <h4 className="font-semibold mb-2 text-orange-800">Average</h4>
              <div className="space-y-1 text-sm">
                <p className="font-bold text-orange-900">KSh {averageService.toFixed(0)}</p>
                <p className="text-orange-600">per service</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}