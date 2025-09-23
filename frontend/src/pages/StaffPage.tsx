import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  FileText, 
  Calendar,
  User,
  CreditCard,
  Eye,
  X
} from "lucide-react";
import { apiService, StaffCommissionData } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

export function StaffPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [commissionData, setCommissionData] = useState<StaffCommissionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAttendant, setSelectedAttendant] = useState<string | null>(null);
  const [attendantRecords, setAttendantRecords] = useState<any[]>([]);
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const { toast } = useToast();

  const loadCommissionData = async () => {
    setLoading(true);
    try {
      const response = await apiService.getStaffCommission(selectedDate);
      if (response.success && response.data) {
        setCommissionData(response.data);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to load commission data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading commission data:', error);
      toast({
        title: "Error",
        description: "Failed to load commission data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommissionData();
  }, [selectedDate]);

  const formatCurrency = (amount: number) => {
    return `KSh ${amount.toLocaleString()}`;
  };

  const formatCurrencyMobile = (amount: number) => {
    if (amount >= 1000) {
      return `KSh ${(amount / 1000).toFixed(1)}K`;
    }
    return `KSh ${amount}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleViewRecords = async (attendant: string) => {
    setSelectedAttendant(attendant);
    setShowRecordsModal(true);
    setLoadingRecords(true);
    setAttendantRecords([]);
    
    try {
      // Create start and end of day for the selected date
      const selectedDateObj = new Date(selectedDate);
      const startOfDay = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate());
      const endOfDay = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate(), 23, 59, 59, 999);
      
      console.log('Fetching records for:', {
        attendant,
        selectedDate,
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString()
      });
      
      // Load records for the specific attendant and date
      const response = await apiService.getRecords({ 
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
        attendant: attendant 
      });
      
      console.log('API Response:', response);
      
      if (response.success && response.data) {
        setAttendantRecords(response.data);
        console.log('Records loaded:', response.data);
      } else {
        console.error('API Error:', response.message);
        toast({
          title: "Error",
          description: response.message || "Failed to load attendant records",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading attendant records:', error);
      toast({
        title: "Error",
        description: "Failed to load attendant records",
        variant: "destructive",
      });
    } finally {
      setLoadingRecords(false);
    }
  };

  // Test function to fetch all records for debugging
  const testFetchAllRecords = async () => {
    try {
      console.log('Testing backend connection...');
      
      // Test the backend test endpoint first
      const testResponse = await fetch('http://localhost:4000/records/test');
      const testData = await testResponse.json();
      console.log('Backend test response:', testData);
      
      if (testData.success) {
        toast({
          title: "Backend Test Complete",
          description: `Backend is working! Found ${testData.data?.length || 0} records`,
        });
      } else {
        throw new Error(testData.message);
      }
    } catch (error) {
      console.error('Test error:', error);
      toast({
        title: "Backend Test Failed",
        description: "Backend is not responding properly",
        variant: "destructive",
      });
    }
  };

  // Create stats array like Dashboard
  const stats = [
    {
      title: "Total Staff",
      value: loading ? "" : (commissionData?.totalStaff || 0).toString(),
      subtitle: "Active staff members",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Total Commission",
      value: loading ? "" : formatCurrency(commissionData?.totalCommission || 0),
      subtitle: `${commissionData?.commissionRate || 30}% of total revenue`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Total Services",
      value: loading ? "" : (commissionData?.totalServices || 0).toString(),
      subtitle: "Services completed",
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Commission Rate",
      value: loading ? "" : `${commissionData?.commissionRate || 30}%`,
      subtitle: "Per service commission",
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid - Exact Dashboard Structure */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 md:px-6 md:pt-6">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-1.5 md:p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-3 w-3 md:h-4 md:w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
              <div className="text-lg md:text-2xl font-bold">
                {loading ? (
                  <div className="h-6 md:h-8 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  stat.value
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {loading ? (
                  <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  stat.subtitle
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Commission Activity - Dashboard Style */}
      {commissionData && commissionData.staffBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Commission Activity
            </CardTitle>
            <CardDescription>
              Staff performance for {formatDate(selectedDate)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {commissionData.staffBreakdown.slice(0, 5).map((staff) => (
                <div key={staff.attendant} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{staff.attendant}</p>
                      <p className="text-sm text-muted-foreground">{staff.services} services • {formatCurrency(staff.revenue)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{formatCurrency(staff.commission)}</p>
                    <p className="text-sm text-muted-foreground">{commissionData?.commissionRate || 30}% commission</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analytics - Dashboard Style */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commission Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Commission Analysis</CardTitle>
            <CardDescription>
              Revenue breakdown for {formatDate(selectedDate)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {commissionData && (
                <>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-green-800">Total Revenue</p>
                      <p className="text-sm text-green-600">All services completed</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-800">{formatCurrency(commissionData.totalRevenue)}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-blue-800">Total Commission</p>
                      <p className="text-sm text-blue-600">{commissionData.commissionRate}% of revenue</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-800">{formatCurrency(commissionData.totalCommission)}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-orange-800">Net Revenue</p>
                      <p className="text-sm text-orange-600">After commission</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-800">{formatCurrency(commissionData.totalRevenue - commissionData.totalCommission)}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Staff Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Staff Performance</CardTitle>
            <CardDescription>
              Individual staff commission for {formatDate(selectedDate)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {commissionData && commissionData.staffBreakdown.length > 0 ? (
                commissionData.staffBreakdown.map(staff => (
                  <div key={staff.attendant} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{staff.attendant}</p>
                      <p className="text-sm text-muted-foreground">{staff.services} services</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{formatCurrency(staff.commission)}</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(staff.revenue)} revenue</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No staff data available</h3>
                  <p className="text-sm">No vehicles were washed on this date.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date Selection
          </CardTitle>
          <CardDescription>
            Select a date to view commission data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            >
              Today
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attendant Records Modal */}
      <Dialog open={showRecordsModal} onOpenChange={setShowRecordsModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Records for {selectedAttendant}
            </DialogTitle>
            <DialogDescription>
              Vehicle wash records for {formatDate(selectedDate)}
            </DialogDescription>
          </DialogHeader>
          
          {loadingRecords ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading records...</p>
                        </div>
          ) : attendantRecords.length > 0 ? (
            <div className="space-y-4">
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Registration</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Car Model</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Service</th>
                      <th className="border border-gray-300 px-4 py-3 text-right font-semibold">Amount</th>
                      <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Payment</th>
                      <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendantRecords.map((record, index) => (
                      <tr key={record.id || index} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-3 font-medium">{record.registrationNumber}</td>
                        <td className="border border-gray-300 px-4 py-3">{record.carModel}</td>
                        <td className="border border-gray-300 px-4 py-3">{record.services}</td>
                        <td className="border border-gray-300 px-4 py-3 text-right">{formatCurrency(record.amountPaid)}</td>
                        <td className="border border-gray-300 px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            record.paymentMethod === 'Mpesa' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {record.paymentMethod}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-600">
                          {record.time || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                      </div>
                      
              {/* Summary */}
              <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 text-center">
                  <div>
                    <p className="text-xs md:text-sm text-gray-600">Total Vehicles</p>
                    <p className="text-base md:text-lg font-semibold">{attendantRecords.length}</p>
                        </div>
                  <div>
                    <p className="text-xs md:text-sm text-gray-600">Total Revenue</p>
                    <p className="text-base md:text-lg font-semibold text-green-600">
                      {formatCurrency(attendantRecords.reduce((sum, r) => sum + r.amountPaid, 0))}
                        </p>
                      </div>
                  <div className="col-span-2 md:col-span-1">
                    <p className="text-xs md:text-sm text-gray-600">Commission</p>
                    <p className="text-base md:text-lg font-semibold text-blue-600">
                      {formatCurrency(attendantRecords.reduce((sum, r) => sum + r.amountPaid, 0) * (attendantRecords.reduce((sum, r) => sum + r.amountPaid, 0) < 5000 ? 0.20 : 0.30))}
                        </p>
                      </div>
                    </div>
                      </div>
                    </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No records found for this attendant on this date.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
